# Телеметрия: подписка на топики gs_core и вывод раз в секунду.
import rclpy
from rclpy.node import Node
from rclpy.duration import Duration
from std_msgs.msg import Float32
from geometry_msgs.msg import Point
from sensor_msgs.msg import BatteryState


class Telemetry(Node):
    def __init__(self):
        super().__init__('telemetry')
        self.altitude = 0.0
        self.position = Point()
        self.voltage = 0.0
        self.create_subscription(Float32, '/geoscan/sensors/altitude', self.on_altitude, 10)
        self.create_subscription(Point, '/geoscan/navigation/local/position', self.on_position, 10)
        self.create_subscription(BatteryState, '/geoscan/sensors/battery_state', self.on_battery, 10)
        self.create_timer(1.0, self.report)

    def on_altitude(self, msg):
        self.altitude = msg.data

    def on_position(self, msg):
        self.position = msg

    def on_battery(self, msg):
        self.voltage = msg.voltage

    def report(self):
        p = self.position
        self.get_logger().info(
            f'высота {self.altitude:.2f} м, позиция ({p.x:.2f}, {p.y:.2f}, {p.z:.2f}), АКБ {self.voltage:.1f} В')


def main():
    rclpy.init()
    node = Telemetry()
    finish = node.get_clock().now() + Duration(seconds=8)
    while rclpy.ok() and node.get_clock().now() < finish:
        rclpy.spin_once(node, timeout_sec=0.1)
    node.destroy_node()
    rclpy.shutdown()


main()
