import { ROS2_PRELUDE_CORE } from './prelude-core.js';
import { ROS2_PRELUDE_NODE } from './prelude-node.js';

/** Корневые пакеты, при первом импорте которых подгружается эмуляция ROS 2 (в остальных программах она ничего не стоит). */
export const ROS2_ROOT_MODULES = [
    'rclpy', 'std_msgs', 'std_srvs', 'geometry_msgs', 'sensor_msgs', 'builtin_interfaces', 'gs_interfaces',
    'rcl_interfaces', 'gs_core', '_ros2_registry'
] as const;

/** Весь Python-текст эмуляции ROS 2. */
export const ROS2_PRELUDE = ROS2_PRELUDE_CORE + ROS2_PRELUDE_NODE;

/**
 * Загрузчик по требованию: в sys.meta_path ставится поиск, который при первом `import rclpy` (и остальных корней)
 * выполняет текст из переменной __ros2_src и отдаёт готовые модули. Программы без ROS 2 ничего не платят.
 */
export const ROS2_BOOTSTRAP = `
import importlib.abc as _iabc, importlib.util as _iutil, sys as _sys

class _Ros2Loader(_iabc.Loader):
    def create_module(self, spec):
        return _sys.modules[spec.name]

    def exec_module(self, module):
        return None

class _Ros2Finder(_iabc.MetaPathFinder):
    roots = ${JSON.stringify(ROS2_ROOT_MODULES)}
    loading = False

    def find_spec(self, name, path=None, target=None):
        if name.split('.')[0] not in self.roots or self.loading:
            return None
        if name not in _sys.modules:
            self.loading = True
            try:
                exec(compile(globals()['__ros2_src'], 'ros2_prelude', 'exec'), {'__name__': '_ros2_prelude'})
            finally:
                self.loading = False
        if name in _sys.modules:
            return _iutil.spec_from_loader(name, _Ros2Loader())
        return None

if not any(type(finder).__name__ == '_Ros2Finder' for finder in _sys.meta_path):
    _sys.meta_path.insert(0, _Ros2Finder())
`;

/** Ставит загрузчик в Pyodide. */
export function installRos2Module(pyodide: { globals: { set(name: string, value: unknown): void }; runPython(code: string): unknown }): void {
    pyodide.globals.set('__ros2_src', ROS2_PRELUDE);
    pyodide.runPython(ROS2_BOOTSTRAP);
}
