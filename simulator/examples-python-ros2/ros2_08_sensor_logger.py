# Журнал датчиков: IMU (наклон из кватерниона), дальномер вниз и Ranger (только у Пионера Мини 2).
import math
import rclpy
from rclpy.node import Node
from rclpy.duration import Duration
from sensor_msgs.msg import Imu, Range
from gs_interfaces.msg import RangerData


def tilt_degrees(q):
    # Крен и тангаж из кватерниона ориентации.
    roll = math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y))
    pitch = math.asin(max(-1.0, min(1.0, 2 * (q.w * q.y - q.z * q.x))))
    return math.degrees(roll), math.degrees(pitch)


class SensorLogger(Node):
    def __init__(self):
        super().__init__('sensor_logger')
        self.roll = self.pitch = 0.0
        self.below = 0.0
        self.sides = None
        self.create_subscription(Imu, '/geoscan/sensors/imu', self.on_imu, 10)
        self.create_subscription(Range, '/geoscan/sensors/range', self.on_range, 10)
        # Топика payload/ranger может не быть (Пионер Базовый): подписка просто останется без данных.
        self.create_subscription(RangerData, '/geoscan/payload/ranger', self.on_ranger, 10)
        self.create_timer(1.0, self.report)

    def on_imu(self, msg):
        self.roll, self.pitch = tilt_degrees(msg.orientation)

    def on_range(self, msg):
        self.below = msg.range

    def on_ranger(self, msg):
        self.sides = (msg.front, msg.back, msg.left, msg.right)

    def report(self):
        text = f'крен {self.roll:.1f}°, тангаж {self.pitch:.1f}°, до земли {self.below} м'
        if self.sides is not None:
            text += ', Ranger (перед, зад, лево, право): ' + ', '.join(f'{v:.2f}' for v in self.sides)
        self.get_logger().info(text)


def main():
    rclpy.init()
    node = SensorLogger()
    finish = node.get_clock().now() + Duration(seconds=6)
    while rclpy.ok() and node.get_clock().now() < finish:
        rclpy.spin_once(node, timeout_sec=0.1)
    node.destroy_node()
    rclpy.shutdown()


main()
