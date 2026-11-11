# Параметры автопилота: сервисы board/get_param, board/set_param и board/get_parameters.
import rclpy
from rclpy.node import Node
from gs_interfaces.srv import GetParam, SetParam, ParametersList


class Params(Node):
    def __init__(self):
        super().__init__('params')
        self.get_client = self.create_client(GetParam, '/geoscan/board/get_param')
        self.set_client = self.create_client(SetParam, '/geoscan/board/set_param')
        self.list_client = self.create_client(ParametersList, '/geoscan/board/get_parameters')

    def call_service(self, client, request):
        future = client.call_async(request)
        rclpy.spin_until_future_complete(self, future)
        return future.result()

    def read(self, name):
        response = self.call_service(self.get_client, GetParam.Request(name=name, update=False))
        return response.value if response.status else None


def main():
    rclpy.init()
    node = Params()

    print('Высота взлёта:', node.read('Flight_com_takeoffAlt'))
    result = node.call_service(node.set_client, SetParam.Request(name='Flight_com_takeoffAlt', value=0.8))
    print('Записали 0.8:', result.status)
    print('Теперь:', node.read('Flight_com_takeoffAlt'))
    print('Несуществующий параметр:', node.read('No_such_param'))

    everything = node.call_service(node.list_client, ParametersList.Request())
    if everything.status:
        print('Всего параметров:', len(everything.params))
        for p in everything.params[:5]:
            print(f'  {p.name} = {p.value}')

    node.destroy_node()
    rclpy.shutdown()


main()
