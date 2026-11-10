# RC-каналы: топик rc/set_channels (RcChannels) нужно публиковать постоянно, пока нужна связь.
# rc/trigger сообщает значение канала RC, когда оно меняется.
import rclpy
from rclpy.node import Node
from rclpy.duration import Duration
from std_msgs.msg import Int32
from gs_interfaces.msg import RcChannels


class RcDemo(Node):
    def __init__(self):
        super().__init__('rc_demo')
        self.pub = self.create_publisher(RcChannels, '/geoscan/rc/set_channels', 10)
        self.create_subscription(Int32, '/geoscan/rc/trigger', self.on_trigger, 10)
        self.create_timer(0.1, self.send)

    def on_trigger(self, msg):
        self.get_logger().info(f'rc/trigger: {msg.data}')

    def send(self):
        msg = RcChannels()
        # Ручки по центру, восьмой канал - тумблер: 2000 - включён.
        msg.channel_1 = msg.channel_2 = msg.channel_3 = msg.channel_4 = 1500
        msg.channel_5 = msg.channel_6 = msg.channel_7 = 1500
        msg.channel_8 = 2000
        self.pub.publish(msg)


def main():
    rclpy.init()
    node = RcDemo()
    finish = node.get_clock().now() + Duration(seconds=3)
    while rclpy.ok() and node.get_clock().now() < finish:
        rclpy.spin_once(node, timeout_sec=0.1)
    node.destroy_node()
    rclpy.shutdown()


main()
