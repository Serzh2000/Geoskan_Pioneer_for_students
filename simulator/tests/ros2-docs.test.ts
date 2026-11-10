/**
 * Справочник ROS 2 в редакторе (python-ros2-api-docs.ts) полон относительно эмуляции: каждый сервис и топик
 * ros_pioneer_node описан, у каждой записи есть описание, синтаксис и пример; типы совпадают с `ros2 interface show`.
 */
import { pythonRos2ApiDocs } from '../public/modules/docs/python-ros2-api-docs.js';
import { pythonSdk2ApiDocs } from '../public/modules/docs/python-sdk2-api-docs.js';
import { interfaceShow, ROS2_MSGS, ROS2_SRVS } from '../public/modules/python/ros2/interfaces.js';
import { ROS2_PRELUDE_NODE } from '../public/modules/python/ros2/prelude-node.js';
import { ROS2_PRELUDE_CORE } from '../public/modules/python/ros2/prelude-core.js';
import { ROS2_PRELUDE } from '../public/modules/python/ros2/prelude.js';

const serviceNames = [...ROS2_PRELUDE_NODE.matchAll(/\('([a-z_/]+)', '(?:gs_interfaces|std_srvs)\/srv\/\w+', self\._h_/g)].map((m) => `/geoscan/${m[1]}`);
const periodicTopics = [...ROS2_PRELUDE_NODE.matchAll(/^\s+\('topics\.\w+', '([a-z_/]+)', '/gm)].map((m) => `/geoscan/${m[1]}`);

describe('справочник ROS 2', () => {
    test('в прелюдии найдено 19 сервисов и все топики', () => {
        expect(serviceNames).toHaveLength(19);
        expect(periodicTopics.length).toBeGreaterThanOrEqual(15);
    });

    test.each(serviceNames)('сервис %s описан как Service с типом, примером и вставкой', (name) => {
        const doc = pythonRos2ApiDocs[name];
        expect(doc).toBeDefined();
        expect(doc.kind).toBe('Service');
        expect(doc.desc).toContain('Тип: ');
        expect(doc.example).toContain('call_async');
    });

    test('топики описаны: каждый, который публикует узел, и подписки cmd_vel и rc/set_channels', () => {
        // Топики local/velocity, local/yaw, local/status, global/* и satellites описаны одной записью с группой.
        const grouped = new Set(['local/velocity', 'local/yaw', 'local/status', 'global/velocity', 'global/status', 'satellites']);
        for (const topic of periodicTopics) {
            if ([...grouped].some((suffix) => topic.endsWith(suffix))) continue;
            expect({ topic, documented: pythonRos2ApiDocs[topic] !== undefined }).toEqual({ topic, documented: true });
        }
        for (const topic of ['/geoscan/flight/callback_event', '/geoscan/flight/cmd_vel', '/geoscan/rc/set_channels', '/geoscan/rc/trigger']) {
            expect(pythonRos2ApiDocs[topic]).toBeDefined();
        }
    });

    test('у каждой записи есть описание, сигнатура и пример', () => {
        for (const [key, doc] of Object.entries(pythonRos2ApiDocs)) {
            expect({ key, ok: Boolean(doc.desc && doc.syntax && doc.example && doc.insertText) }).toEqual({ key, ok: true });
        }
    });

    test('типы gs_interfaces описаны, текст совпадает с ros2 interface show', () => {
        for (const key of Object.keys(ROS2_SRVS).filter((k) => k.startsWith('gs_interfaces/')).concat(Object.keys(ROS2_MSGS).filter((k) => k.startsWith('gs_interfaces/')))) {
            expect(pythonRos2ApiDocs[key]?.syntax).toBe(interfaceShow(key) || '(нет полей)');
        }
    });

    test('записи rclpy и ключи не пересекаются со справочником pioneer_sdk2', () => {
        const overlap = Object.keys(pythonRos2ApiDocs).filter((key) => key in pythonSdk2ApiDocs);
        expect(overlap).toEqual([]);
    });

    test('в справочнике описаны основные вызовы rclpy', () => {
        for (const key of ['rclpy.init', 'rclpy.ok', 'rclpy.shutdown', 'rclpy.spin', 'rclpy.spin_once', 'rclpy.spin_until_future_complete', 'Node',
            'Node.create_publisher', 'Node.create_subscription', 'Node.create_client', 'Node.create_service', 'Node.create_timer', 'Client.call_async']) {
            expect(pythonRos2ApiDocs[key]).toBeDefined();
        }
    });
});

describe('текст прелюдии', () => {
    test('нет обратных кавычек, шаблонных вставок и обратных слэшей (текст лежит в шаблонной строке)', () => {
        for (const text of [ROS2_PRELUDE_CORE.replace(/_SPEC = _json\.loads\(r'''.*?'''\)/s, ''), ROS2_PRELUDE_NODE]) {
            expect(text).not.toMatch(/`|\$\{|\\/);
        }
        expect(ROS2_PRELUDE).not.toContain("''''");
    });
});
