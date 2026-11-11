# Миссия узлом-автоматом: arm -> takeoff -> две точки -> land -> disarm.
# Никаких ожиданий внутри обработчиков: таймер раз в 0.2 с смотрит на состояние, сервисы вызываются через call_async,
# а события автопилота приходят из топика flight/callback_event.
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int8
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm, GoToLocalPoint

EVENT_COPTER_LANDED = 3
EVENT_POINT_REACHED = 6
EVENT_TAKEOFF_COMPLETE = 8

POINTS = [(1.0, 0.0, 1.0), (1.0, 1.0, 1.0)]


class Mission(Node):
    def __init__(self):
        super().__init__('mission')
        self.state = 'ARM'
        self.future = None
        self.event = None
        self.point = 0
        self.create_subscription(Int8, '/geoscan/flight/callback_event', self.on_event, 10)
        self.arm_client = self.create_client(Arm, '/geoscan/flight/arm')
        self.takeoff_client = self.create_client(Trigger, '/geoscan/flight/takeoff')
        self.go_client = self.create_client(GoToLocalPoint, '/geoscan/flight/go_to_local_point')
        self.land_client = self.create_client(Trigger, '/geoscan/flight/land')
        self.disarm_client = self.create_client(Trigger, '/geoscan/flight/disarm')
        self.create_timer(0.2, self.step)

    def on_event(self, msg):
        self.event = msg.data

    def request(self, state, client, request):
        self.event = None
        self.future = client.call_async(request)
        self.state = state
        self.get_logger().info('состояние: ' + state)

    def fly_next(self):
        x, y, z = POINTS[self.point]
        self.point += 1
        go = GoToLocalPoint.Request(x=x, y=y, z=z, yaw=0.0, time=0.0, frame_id='map')
        self.request('FLY', self.go_client, go)

    def step(self):
        if self.future is not None and not self.future.done():
            return                                           # ждём ответ сервиса
        if self.future is not None:
            ok = self.future.result().success
            self.future = None
            if not ok:
                self.get_logger().error('сервис отказал в состоянии ' + self.state)
                self.request('DONE', self.disarm_client, Trigger.Request())
                return
        if self.state == 'ARM':
            self.request('TAKEOFF', self.arm_client, Arm.Request(timeout=5.0, retries=0))
        elif self.state == 'TAKEOFF':
            self.request('WAIT_TAKEOFF', self.takeoff_client, Trigger.Request())
        elif self.state == 'WAIT_TAKEOFF' and self.event == EVENT_TAKEOFF_COMPLETE:
            self.fly_next()
        elif self.state == 'FLY' and self.event == EVENT_POINT_REACHED:
            if self.point < len(POINTS):
                self.fly_next()
            else:
                self.request('WAIT_LAND', self.land_client, Trigger.Request())
        elif self.state == 'WAIT_LAND' and self.event == EVENT_COPTER_LANDED:
            self.request('DONE', self.disarm_client, Trigger.Request())


def main():
    rclpy.init()
    node = Mission()
    while rclpy.ok() and node.state != 'DONE':
        rclpy.spin_once(node, timeout_sec=0.2)
    node.get_logger().info('миссия закончена')
    node.destroy_node()
    rclpy.shutdown()


main()
