/**
 * ROS 2 (rclpy, std_msgs, gs_interfaces ...) - часть SDK2: импорт разрешён в режиме pioneer_sdk2
 * и отклоняется в режиме pioneer_sdk (SDK1) с подсказкой выбрать «Python · SDK2».
 */
let drones: Record<string, unknown>;
let checkPythonSdkForDrone: (droneId: string, code: string) => void;

beforeAll(async () => {
    // Модули редактора и журнала обращаются к window при загрузке: в node-окружении даём заглушку.
    const g = globalThis as Record<string, unknown>;
    if (!g.window) g.window = globalThis;
    drones = (await import('../public/modules/core/state.js')).drones as never;
    checkPythonSdkForDrone = (await import('../public/modules/python/browser-runtime.js')).checkPythonSdkForDrone;
    drones['mini'] = { id: 'mini', name: 'mini', model: 'pioneer-mini2' };
    drones['basic-sdk2'] = { id: 'basic-sdk2', name: 'basic-sdk2', model: 'pioneer-basic', pythonSdk: 'pioneer_sdk2' };
    drones['basic-sdk1'] = { id: 'basic-sdk1', name: 'basic-sdk1', model: 'pioneer-basic' };
});

const PACKAGES = ['rclpy', 'std_msgs.msg', 'std_srvs.srv', 'geometry_msgs.msg', 'sensor_msgs.msg', 'builtin_interfaces.msg', 'gs_interfaces.srv', 'gs_core.launch'];

describe('ROS 2 внутри SDK2', () => {
    test.each(PACKAGES)('SDK2: импорт %s разрешён', (pkg) => {
        for (const id of ['mini', 'basic-sdk2']) {
            expect(() => checkPythonSdkForDrone(id, `import ${pkg}`)).not.toThrow();
            expect(() => checkPythonSdkForDrone(id, `from ${pkg} import X`)).not.toThrow();
        }
    });

    test.each(PACKAGES)('SDK1: импорт %s отклоняется и подсказывает «Python · SDK2»', (pkg) => {
        expect(() => checkPythonSdkForDrone('basic-sdk1', `import time\nimport ${pkg}`)).toThrow(/Python · SDK2/);
    });

    test('номер строки указывает на импорт, остальные сообщения не изменились', () => {
        try {
            checkPythonSdkForDrone('basic-sdk1', 'import time\n\nimport rclpy');
            throw new Error('не бросило');
        } catch (error) {
            expect(JSON.stringify(error)).toContain('3');
        }
        expect(() => checkPythonSdkForDrone('basic-sdk1', 'from pioneer_sdk2 import Pioneer')).toThrow(/Python · SDK1/);
        expect(() => checkPythonSdkForDrone('mini', 'from pioneer_sdk2 import Pioneer')).not.toThrow();
        expect(() => checkPythonSdkForDrone('basic-sdk1', 'from pioneer_sdk import Pioneer')).not.toThrow();
    });
});
