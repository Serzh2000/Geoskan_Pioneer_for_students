/**
 * Программы ученика с rclpy, как их выполняет раннер браузера (__SimAsyncify из browser-runtime.ts):
 * классы-узлы, обратные вызовы, spin, загрузка эмуляции по требованию, уборка за программой.
 */
import { runRos2, withRos2Python } from './helpers/ros2-runtime.js';

describe('программы с rclpy через раннер', () => {
    withRos2Python('узел-класс: таймер, подписка и клиент в методах, spin до завершения', () => {
        const run = runRos2(`
import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Int8
from std_srvs.srv import Trigger

class Talker(Node):
    def __init__(self):
        super().__init__('talker')
        self.pub = self.create_publisher(String, 'chatter', 10)
        self.count = 0
        self.timer = self.create_timer(0.5, self.on_timer)

    def on_timer(self):
        self.pub.publish(String(data='hello ' + str(self.count)))
        self.count += 1

class Listener(Node):
    def __init__(self):
        super().__init__('listener')
        self.heard = []
        self.create_subscription(String, 'chatter', self.on_msg, 10)

    def on_msg(self, msg):
        self.heard.append(msg.data)
        self.get_logger().info('I heard: "%s"' % msg.data)

def main():
    rclpy.init()
    talker, listener = Talker(), Listener()
    from rclpy.executors import SingleThreadedExecutor
    ex = SingleThreadedExecutor()
    ex.add_node(talker)
    ex.add_node(listener)
    while rclpy.ok() and len(listener.heard) < 4:
        ex.spin_once(timeout_sec=0.2)
    print(listener.heard)
    talker.destroy_node()
    listener.destroy_node()
    rclpy.shutdown()

main()
`, { mode: 'program', speed: 8 });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(["['hello 0', 'hello 1', 'hello 2', 'hello 3']"]);
        expect(run.result.log.some((entry) => entry[1].includes('I heard: "hello 0"'))).toBe(true);
    });

    withRos2Python('rclpy.spin(node) завершается при rclpy.shutdown() из обратного вызова', () => {
        const run = runRos2(`
import rclpy
from rclpy.node import Node

class Stopper(Node):
    def __init__(self):
        super().__init__('stopper')
        self.n = 0
        self.timer = self.create_timer(0.2, self.on_timer)

    def on_timer(self):
        self.n += 1
        if self.n == 3:
            print('stopping')
            rclpy.shutdown()

rclpy.init()
node = Stopper()
rclpy.spin(node)
print('done', node.n)
`, { mode: 'program', speed: 8 });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(['stopping', 'done 3']);
    });

    withRos2Python('обратные вызовы с await/while внутри (async после преобразования) выполняются', () => {
        const run = runRos2(`
import time
import rclpy
from std_msgs.msg import Int8

def slow_callback(msg):
    n = 0
    while n < 3:
        n += 1
        time.sleep(0.01)
    print('callback', msg.data, n)

rclpy.init()
node = rclpy.create_node('slow')
pub = node.create_publisher(Int8, 'numbers', 10)
node.create_subscription(Int8, 'numbers', slow_callback, 10)
pub.publish(Int8(data=7))
rclpy.spin_once(node, timeout_sec=1.0)
node.destroy_node()
rclpy.shutdown()
`, { mode: 'program' });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(['callback 7 3']);
    });

    withRos2Python('future.add_done_callback и await future в async-обратном вызове', () => {
        const run = runRos2(`
import rclpy
from std_srvs.srv import Trigger

class Waiter:
    def __init__(self, node):
        self.node = node
        self.client = node.create_client(Trigger, '/geoscan/flight/takeoff')

    def on_done(self, future):
        print('takeoff answered', future.result().success)

rclpy.init()
node = rclpy.create_node('waiter')
w = Waiter(node)
future = w.client.call_async(Trigger.Request())
future.add_done_callback(w.on_done)
rclpy.spin_until_future_complete(node, future)
rclpy.spin_once(node, timeout_sec=0.2)
node.destroy_node()
rclpy.shutdown()
`, { mode: 'program' });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(['takeoff answered False']);
    });

    withRos2Python('синхронный client.call(request) и Rate.sleep внутри программы', () => {
        const run = runRos2(`
import rclpy
from std_srvs.srv import Trigger
from gs_interfaces.srv import Arm

rclpy.init()
node = rclpy.create_node('sync')
client = node.create_client(Arm, '/geoscan/flight/arm')
client.wait_for_service(timeout_sec=5.0)
response = client.call(Arm.Request(timeout=1.0, retries=0))
print('arm', response.success)
rate = node.create_rate(5.0)
for i in range(3):
    rate.sleep()
print('rate ok')
node.destroy_node()
rclpy.shutdown()
`, { mode: 'program', speed: 8 });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(['arm True', 'rate ok']);
    });

    withRos2Python('после программы узлы ученика исчезают, ros_pioneer_node остаётся', () => {
        const first = runRos2(`
import rclpy
rclpy.init()
node = rclpy.create_node('forgotten')
node.create_publisher(__import__('std_msgs.msg', fromlist=['Int8']).Int8, 'x', 10)
print('exit without shutdown')
`, { mode: 'program' });
        expect(first.result.error).toBeNull();
        const second = runRos2(`
import rclpy, sys
rclpy.init()
node = rclpy.create_node('forgotten')
print(sorted(n for n in node.get_node_names()))
node.destroy_node()
rclpy.shutdown()
`, { mode: 'program' });
        expect(second.out).toEqual(["['forgotten', 'ros_pioneer_node']"]);
    });

    withRos2Python('исключение из обратного вызова выходит из spin, как в rclpy', () => {
        const run = runRos2(`
import rclpy
from rclpy.node import Node

class Broken(Node):
    def __init__(self):
        super().__init__('broken')
        self.create_timer(0.1, self.boom)

    def boom(self):
        raise ValueError('oops')

rclpy.init()
rclpy.spin(Broken())
`, { mode: 'program', speed: 8 });
        expect(run.result.error).toBe('ValueError: oops');
    });
});

describe('загрузка по требованию', () => {
    withRos2Python('без import rclpy эмуляция не грузится; первый import поднимает все пакеты', () => {
        const run = runRos2(`
import sys
print('before', 'rclpy' in sys.modules, 'std_msgs' in sys.modules)
from std_msgs.msg import Int8
print('after', 'rclpy' in sys.modules, repr(Int8(data=3)))
import gs_interfaces.srv
import rclpy
print(rclpy.ok())
`, { mode: 'lazy' });
        expect(run.result.error).toBeNull();
        expect(run.out).toEqual(['before False False', 'after True std_msgs.msg.Int8(data=3)', 'False']);
    });

    withRos2Python('rclpy.init() запускает ros_pioneer_node в режиме lazy', () => {
        const run = runRos2(`
import rclpy
rclpy.init()
node = rclpy.create_node('lazy_student')
print(node.get_node_names())
print(sorted(name for name, _ in node.get_service_names_and_types())[:2])
rclpy.shutdown()
`, { mode: 'lazy' });
        expect(run.result.error).toBeNull();
        expect(run.out[0]).toBe("['ros_pioneer_node', 'lazy_student']");
        expect(run.out[1]).toBe("['/geoscan/alive', '/geoscan/board/get_param']");
    });

    withRos2Python('gs_core.launch.restart_pioneer_node: перезапуск с topics.gnss:=true', () => {
        const run = runRos2(`
import rclpy
from gs_core.launch import restart_pioneer_node
rclpy.init()
node = rclpy.create_node('relauncher')
before = [name for name, _ in node.get_topic_names_and_types() if 'global' in name]
print('before', before)
print(restart_pioneer_node(parameters={'topics.gnss': True}))
after = sorted(name for name, _ in node.get_topic_names_and_types() if 'global' in name or 'satellites' in name)
print('after', after)
print(restart_pioneer_node(config='razero'))
rclpy.shutdown()
`, { mode: 'lazy' });
        expect(run.result.error).toBeNull();
        expect(run.out[0]).toBe('before []');
        expect(run.out[1]).toBe('mini2');
        expect(run.out[2]).toContain('/geoscan/navigation/global/position');
        expect(run.out[3]).toBe('razero');
    });
});
