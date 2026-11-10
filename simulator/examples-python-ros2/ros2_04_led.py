# Светодиоды: сервис payload/led/set. Цвет компонент - 0.0..1.0.
# PIXEL - цвет каждого диода отдельно, FILL - один цвет на все.
import rclpy
from rclpy.node import Node
from std_msgs.msg import ColorRGBA
from gs_interfaces.srv import Led


def color(r, g, b):
    return ColorRGBA(r=r, g=g, b=b, a=1.0)


class LedDemo(Node):
    def __init__(self):
        super().__init__('led_demo')
        self.client = self.create_client(Led, '/geoscan/payload/led/set')
        self.step = 0
        self.timer = self.create_timer(1.0, self.on_timer)

    def on_timer(self):
        if self.step == 0:
            request = Led.Request(mode=Led.Request.PIXEL, leds=[color(1.0, 0.0, 0.0), color(0.0, 1.0, 0.0)])
        elif self.step == 1:
            request = Led.Request(mode=Led.Request.PIXEL, leds=[color(0.0, 1.0, 0.0), color(1.0, 0.0, 0.0)])
        elif self.step == 2:
            request = Led.Request(mode=Led.Request.FILL, leds=[color(0.0, 0.0, 1.0)])
        else:
            request = Led.Request(mode=Led.Request.FILL, leds=[color(0.0, 0.0, 0.0)])   # погасить
            self.timer.cancel()
        self.client.call_async(request)
        self.get_logger().info(f'шаг {self.step}')
        self.step += 1


def main():
    rclpy.init()
    node = LedDemo()
    while rclpy.ok() and not node.timer.is_canceled():
        rclpy.spin_once(node, timeout_sec=0.2)
    node.destroy_node()
    rclpy.shutdown()


main()
