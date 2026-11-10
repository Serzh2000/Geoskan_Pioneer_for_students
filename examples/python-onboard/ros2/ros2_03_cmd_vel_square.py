# Квадрат скоростью: топик flight/cmd_vel (TwistStamped) и таймер на 10 Гц.
# frame_id 'map' - мировые оси, 'base_link' - оси коптера. Скорость нужно подтверждать постоянно.
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from geometry_msgs.msg import TwistStamped
from gs_interfaces.srv import Arm

SPEED = 0.4
LEG_TICKS = 25   # 25 тиков по 0.1 с: сторона 1 м
LEGS = [(SPEED, 0.0), (0.0, SPEED), (-SPEED, 0.0), (0.0, -SPEED)]


class SquareByVelocity(Node):
    def __init__(self):
        super().__init__('square_by_velocity')
        self.fly_state = 0
        self.tick = 0
        self.finished = False
        self.create_subscription(Int8, '/geoscan/flight/fly_state', self.on_fly_state, 10)
        self.pub = self.create_publisher(TwistStamped, '/geoscan/flight/cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.on_timer)
        self.timer.cancel()
        self.arm_client = self.create_client(Arm, '/geoscan/flight/arm')
        self.takeoff_client = self.create_client(Trigger, '/geoscan/flight/takeoff')
        self.land_client = self.create_client(Trigger, '/geoscan/flight/land')

    def on_fly_state(self, msg):
        self.fly_state = msg.data

    def on_timer(self):
        leg = self.tick // LEG_TICKS
        msg = TwistStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'map'
        if leg < len(LEGS):
            msg.twist.linear.x, msg.twist.linear.y = LEGS[leg]
        else:
            self.finished = True
        self.pub.publish(msg)
        self.tick += 1

    def call_service(self, client, request):
        future = client.call_async(request)
        rclpy.spin_until_future_complete(self, future)
        return future.result()


def main():
    rclpy.init()
    node = SquareByVelocity()
    node.call_service(node.arm_client, Arm.Request(timeout=5.0, retries=0))
    node.call_service(node.takeoff_client, Trigger.Request())
    while rclpy.ok() and node.fly_state != 2:
        rclpy.spin_once(node, timeout_sec=0.1)

    node.timer.reset()                       # пошёл квадрат
    while rclpy.ok() and not node.finished:
        rclpy.spin_once(node, timeout_sec=0.1)
    node.timer.cancel()

    node.call_service(node.land_client, Trigger.Request())
    while rclpy.ok() and node.fly_state != 0:     # ждём посадки
        rclpy.spin_once(node, timeout_sec=0.1)
    node.destroy_node()
    rclpy.shutdown()


main()
