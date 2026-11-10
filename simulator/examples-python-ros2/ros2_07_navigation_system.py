# Система навигации: navigation/get_system и navigation/set_system.
# Менять её нужно именно этим сервисом, а не через board/set_parameters.
# В полёте смена отклоняется, если nav_system_change_in_flight: false (так у Пионера Мини 2).
import rclpy
from rclpy.node import Node
from gs_interfaces.srv import NavigationSystem, SetNavigationSystem


class Navigation(Node):
    def __init__(self):
        super().__init__('navigation_system')
        self.get_client = self.create_client(NavigationSystem, '/geoscan/navigation/get_system')
        self.set_client = self.create_client(SetNavigationSystem, '/geoscan/navigation/set_system')

    def call_service(self, client, request):
        future = client.call_async(request)
        rclpy.spin_until_future_complete(self, future)
        return future.result()

    def current(self):
        response = self.call_service(self.get_client, NavigationSystem.Request())
        return response.navigation if response.status else None


def main():
    rclpy.init()
    node = Navigation()
    print('Сейчас:', node.current())
    for name in ['OPT', 'LPS']:
        ok = node.call_service(node.set_client, SetNavigationSystem.Request(navigation=name)).status
        print(f'Переключаем на {name}:', 'готово' if ok else 'отказ', '->', node.current())
    node.destroy_node()
    rclpy.shutdown()


main()
