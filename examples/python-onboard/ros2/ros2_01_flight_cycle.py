# Полётный цикл через сервисы gs_core: arm -> takeoff -> go_to_local_point -> land -> disarm.
# Пионер Мини 2 и Пионер Базовый с Radxa. Эквивалент команд ros2 service call из документации.
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm, GoToLocalPoint

ON_LAND, ARMED, IN_SKY = 0, 1, 2   # значения топика flight/fly_state


class FlightCycle(Node):
    def __init__(self):
        super().__init__('flight_cycle')
        self.fly_state = ON_LAND
        self.create_subscription(Int8, '/geoscan/flight/fly_state', self.on_fly_state, 10)
        self.arm_client = self.create_client(Arm, '/geoscan/flight/arm')
        self.takeoff_client = self.create_client(Trigger, '/geoscan/flight/takeoff')
        self.go_client = self.create_client(GoToLocalPoint, '/geoscan/flight/go_to_local_point')
        self.land_client = self.create_client(Trigger, '/geoscan/flight/land')
        self.disarm_client = self.create_client(Trigger, '/geoscan/flight/disarm')

    def on_fly_state(self, msg):
        self.fly_state = msg.data

    def call_service(self, client, request):
        # Вызов сервиса: отправить запрос и крутить обработку, пока не придёт ответ.
        future = client.call_async(request)
        rclpy.spin_until_future_complete(self, future)
        return future.result()

    def wait_for_state(self, wanted):
        while rclpy.ok() and self.fly_state != wanted:
            rclpy.spin_once(self, timeout_sec=0.1)


def main():
    rclpy.init()
    node = FlightCycle()
    try:
        if not node.call_service(node.arm_client, Arm.Request(timeout=5.0, retries=0)).success:
            raise SystemExit('Моторы не запустились')
        node.call_service(node.takeoff_client, Trigger.Request())
        node.wait_for_state(IN_SKY)
        node.get_logger().info('Взлетели')

        go = GoToLocalPoint.Request(x=1.0, y=1.0, z=1.0, yaw=0.0, time=0.0, frame_id='map')
        node.call_service(node.go_client, go)
        # Подождать, пока дрон долетит: пауза по времени симуляции.
        for _ in range(60):
            rclpy.spin_once(node, timeout_sec=0.1)

        node.call_service(node.land_client, Trigger.Request())
        node.wait_for_state(ON_LAND)
        node.get_logger().info('Сели')
    finally:
        node.call_service(node.disarm_client, Trigger.Request())
        node.destroy_node()
        rclpy.shutdown()


main()
