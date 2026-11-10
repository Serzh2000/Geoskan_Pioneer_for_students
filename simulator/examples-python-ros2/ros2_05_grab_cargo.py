# Захват груза. У Пионера Мини 2 механический захват (payload/grab), у Пионера Базового - магнитный (payload/cargo_set).
# Выключенный модуль не падает с ошибкой: сервис отвечает success: false, причина - в журнале.
import rclpy
from rclpy.node import Node
from std_srvs.srv import SetBool
from gs_interfaces.srv import Grab

CLOSE, OPEN = 1, 0


class Gripper(Node):
    def __init__(self):
        super().__init__('gripper')
        self.grab_client = self.create_client(Grab, '/geoscan/payload/grab')
        self.cargo_client = self.create_client(SetBool, '/geoscan/payload/cargo_set')

    def call_service(self, client, request):
        future = client.call_async(request)
        rclpy.spin_until_future_complete(self, future)
        return future.result()

    def hold(self, close):
        # movement_time больше 0: вызов ждёт столько секунд, и захват останавливается сам.
        request = Grab.Request(movement_time=1.0, velocity=100, action=CLOSE if close else OPEN)
        if self.call_service(self.grab_client, request).success:
            return 'механический захват'
        if self.call_service(self.cargo_client, SetBool.Request(data=close)).success:
            return 'магнитный захват'
        return None


def main():
    rclpy.init()
    node = Gripper()
    print('Захватываем:', node.hold(True))
    print('Отпускаем:', node.hold(False))
    node.destroy_node()
    rclpy.shutdown()


main()
