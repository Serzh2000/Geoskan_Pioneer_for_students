/* eslint-disable max-lines -- текст Python одним куском: он выполняется как модуль целиком */
import { ROS2_SPEC } from './interfaces.js';

/*
 * Python-часть эмуляции ROS 2, первая половина: типы сообщений и сервисов (из interfaces.ts) и клиентская
 * библиотека rclpy (Node, паблишеры, подписки, клиенты и серверы сервисов, таймеры, параметры, экзекьюторы).
 * Вторая половина - ros_pioneer_node и реестр для консоли (prelude-node.ts).
 *
 * В тексте нет обратных кавычек, `${` и обратных слэшей: он лежит в шаблонной строке. Время - симулятора
 * (ros2_time моста), а не настенное: таймеры, Rate и таймауты идут по часам симуляции.
 */
export const ROS2_PRELUDE_CORE = `
import asyncio as _asyncio, builtins as _builtins, collections as _collections, copy as _copy, enum as _enum
import inspect as _inspect, json as _json, math as _math, sys as _sys, types as _types
import js as _js

_SPEC = _json.loads(r'''${JSON.stringify(ROS2_SPEC)}''')
_EPOCH = 315964800.0

class _Cancelled(Exception):
    pass

def _drone_id():
    return str(_js.SIM_DRONE_ID)

def _topy(value):
    return value.to_py() if hasattr(value, 'to_py') else value

def _state(drone):
    s = _js.ros2_state(drone)
    return None if s is None else _topy(s)

def _sim_time(drone):
    t = _js.ros2_time(drone)
    return 0.0 if t is None else float(t)

def _bg_task(coro):
    task = _asyncio.ensure_future(coro)
    tasks = getattr(_builtins, "__sim_bg_tasks", None)
    if tasks is None:
        tasks = []
        setattr(_builtins, "__sim_bg_tasks", tasks)
    tasks.append(task)
    return task

async def _tick(drone, user=True):
    # Один оборот цикла событий. Программа ученика при Stop получает PYTHON_CANCELLED, как у pioneer_sdk2.
    if user and _js.py_is_cancelled(drone):
        raise _Cancelled('PYTHON_CANCELLED')
    await _asyncio.sleep(0.01)

async def _sim_sleep(drone, seconds, user=False):
    end = _sim_time(drone) + float(seconds)
    while _sim_time(drone) < end:
        await _tick(drone, user)

def _module(name, package=True):
    mod = _sys.modules.get(name)
    if mod is None:
        mod = _types.ModuleType(name)
        if package:
            mod.__path__ = []
        _sys.modules[name] = mod
        if '.' in name:
            parent, _, child = name.rpartition('.')
            setattr(_module(parent), child, mod)
    return mod

# ---------------------------------------------------------------- сообщения
_INT_RANGES = {'int8': (-128, 127), 'uint8': (0, 255), 'int16': (-32768, 32767), 'uint16': (0, 65535),
               'int32': (-2 ** 31, 2 ** 31 - 1), 'uint32': (0, 2 ** 32 - 1), 'int64': (-2 ** 63, 2 ** 63 - 1), 'uint64': (0, 2 ** 64 - 1)}
_MSG_CLASSES = {}
_SRV_CLASSES = {}

def _split_type(t):
    if t.endswith(']'):
        base, _, rest = t.partition('[')
        n = rest[:-1]
        return base, (int(n) if n else 0)
    return t, None

def _msg_key(base):
    if base.count('/') == 1:
        pkg, name = base.split('/')
        return pkg + '/msg/' + name
    return base

def _default_scalar(base, given):
    if base == 'bool':
        return bool(given) if given is not None else False
    if base in _INT_RANGES:
        return int(given) if given is not None else 0
    if base in ('float32', 'float64'):
        return float(given) if given is not None else 0.0
    if base == 'string':
        return str(given) if given is not None else ''
    return _MSG_CLASSES[_msg_key(base)]()

def _default(base, arr, given):
    if arr is None:
        return _default_scalar(base, given)
    return [_default_scalar(base, None) for _ in range(arr)] if arr else []

def _check_scalar(owner, fname, base, value):
    if base == 'bool':
        if not isinstance(value, bool):
            raise AssertionError("The '%s' field must be of type 'bool'" % fname)
    elif base in _INT_RANGES:
        if not isinstance(value, int) or isinstance(value, bool):
            raise AssertionError("The '%s' field must be of type 'int'" % fname)
        lo, hi = _INT_RANGES[base]
        if value < lo or value > hi:
            raise AssertionError("The '%s' field must be an integer in [%d, %d]" % (fname, lo, hi))
    elif base in ('float32', 'float64'):
        if not isinstance(value, float):
            raise AssertionError("The '%s' field must be of type 'float'" % fname)
        if base == 'float32' and _math.isfinite(value) and abs(value) > 3.402823466e38:
            raise AssertionError("The '%s' field must be a float in [-3.402823466e+38, 3.402823466e+38]" % fname)
    elif base == 'string':
        if not isinstance(value, str):
            raise AssertionError("The '%s' field must be of type 'str'" % fname)
    else:
        cls = _MSG_CLASSES[_msg_key(base)]
        if not isinstance(value, cls):
            raise AssertionError("The '%s' field must be a sub message of type '%s'" % (fname, cls.__name__))

def _check(owner, fname, base, arr, value):
    if arr is None:
        _check_scalar(owner, fname, base, value)
        return value
    if not isinstance(value, (list, tuple)):
        raise AssertionError("The '%s' field must be a set or sequence and each value of type '%s'" % (fname, base))
    if arr and len(value) != arr:
        raise AssertionError("The '%s' field must be a sequence with length %d" % (fname, arr))
    for item in value:
        _check_scalar(owner, fname, base, item)
    return list(value)

class _Msg:
    _ros_type = ''
    _fields = ()
    _by_name = {}

    def __init__(self, **kwargs):
        unknown = sorted(k for k in kwargs if k not in self._by_name)
        if unknown:
            raise AssertionError("Invalid arguments passed to constructor: " + ", ".join(unknown))
        for fname, base, arr, given, _ftype in self._fields:
            if fname in kwargs:
                setattr(self, fname, kwargs[fname])
            else:
                object.__setattr__(self, fname, _default(base, arr, given))

    def __setattr__(self, name, value):
        spec = self._by_name.get(name)
        if spec is not None:
            value = _check(self, name, spec[0], spec[1], value)
        object.__setattr__(self, name, value)

    def __repr__(self):
        body = ", ".join("%s=%r" % (f[0], getattr(self, f[0])) for f in self._fields)
        return "%s.%s(%s)" % (type(self).__module__, type(self).__name__, body)

    def __eq__(self, other):
        return type(other) is type(self) and all(getattr(self, f[0]) == getattr(other, f[0]) for f in self._fields)

    __hash__ = None

    @classmethod
    def get_fields_and_field_types(cls):
        return {f[0]: f[4] for f in cls._fields}

def _build_fields(raw):
    fields = []
    for item in raw:
        ftype, fname = item[0], item[1]
        given = item[2] if len(item) > 2 else None
        base, arr = _split_type(ftype)
        fields.append((fname, base, arr, given, ftype))
    return fields

def _make_class(key, cls_name, module, raw_fields, constants):
    fields = _build_fields(raw_fields)
    attrs = {'_ros_type': key, '_fields': tuple(fields), '__module__': module}
    attrs['_by_name'] = {f[0]: (f[1], f[2]) for f in fields}
    for ctype, cname, cvalue in constants:
        attrs[cname] = cvalue
    return type(cls_name, (_Msg,), attrs)

def _define_msgs():
    pending = dict(_SPEC['msgs'])
    # Вложенные типы определяются раньше тех, кто на них ссылается.
    while pending:
        progressed = False
        for key, d in list(pending.items()):
            deps = [_msg_key(_split_type(f[0])[0]) for f in d['fields'] if '/' in f[0]]
            if all(dep in _MSG_CLASSES for dep in deps):
                pkg, _, name = key.split('/')
                cls = _make_class(key, name, pkg + '.msg', d['fields'], d.get('constants', []))
                _MSG_CLASSES[key] = cls
                setattr(_module(pkg + '.msg', False), name, cls)
                _module(pkg)
                del pending[key]
                progressed = True
        if not progressed:
            raise RuntimeError('Циклическая зависимость сообщений: ' + ', '.join(pending))

def _define_srvs():
    for key, d in _SPEC['srvs'].items():
        pkg, _, name = key.split('/')
        req = _make_class(key + '_Request', name + '_Request', pkg + '.srv', d['request'], d.get('constants', []))
        res = _make_class(key + '_Response', name + '_Response', pkg + '.srv', d['response'], [])
        srv = type(name, (), {'Request': req, 'Response': res, '_ros_type': key, '__module__': pkg + '.srv'})
        _SRV_CLASSES[key] = srv
        setattr(_module(pkg + '.srv', False), name, srv)
        _module(pkg)

_define_msgs()
_define_srvs()
_Time_msg = _MSG_CLASSES['builtin_interfaces/msg/Time']
_Header_msg = _MSG_CLASSES['std_msgs/msg/Header']

def _type_key(cls):
    return getattr(cls, '_ros_type', None)

def _type_class(name):
    # std_msgs/msg/Int8, std_msgs/Int8, gs_interfaces/srv/Arm -> класс
    parts = str(name).strip('/').split('/')
    if len(parts) == 2:
        for kind, table in (('msg', _MSG_CLASSES), ('srv', _SRV_CLASSES)):
            key = parts[0] + '/' + kind + '/' + parts[1]
            if key in table:
                return table[key]
        return None
    return _MSG_CLASSES.get('/'.join(parts)) or _SRV_CLASSES.get('/'.join(parts))

def _coerce(base, value, path):
    if base == 'bool':
        if isinstance(value, str):
            if value.lower() in ('true', '1'):
                return True
            if value.lower() in ('false', '0'):
                return False
        return bool(value)
    if base in _INT_RANGES:
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            raise ValueError("Поле %s: ожидается целое число" % path)
        return int(value)
    if base in ('float32', 'float64'):
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            raise ValueError("Поле %s: ожидается число" % path)
        return float(value)
    if base == 'string':
        return str(value)
    return None

def dict_to_message(cls, data, path=''):
    # Как set_message_fields в ros2cli: числа приводятся к типу поля, лишние поля - ошибка.
    msg = cls()
    if data is None:
        return msg
    if not isinstance(data, dict):
        raise ValueError("Ожидается словарь для %s%s" % (cls._ros_type, (' (' + path + ')') if path else ''))
    for key, value in data.items():
        spec = cls._by_name.get(key)
        if spec is None:
            raise ValueError("Неизвестное поле '%s' у %s" % (key, cls._ros_type))
        base, arr = spec
        where = (path + '.' if path else '') + key
        if arr is not None:
            if not isinstance(value, (list, tuple)):
                raise ValueError("Поле %s: ожидается список" % where)
            if '/' in base:
                items = [dict_to_message(_MSG_CLASSES[_msg_key(base)], v, where) for v in value]
            else:
                items = [_coerce(base, v, where) for v in value]
            setattr(msg, key, items)
        elif '/' in base:
            setattr(msg, key, dict_to_message(_MSG_CLASSES[_msg_key(base)], value, where))
        else:
            setattr(msg, key, _coerce(base, value, where))
    return msg

def message_to_dict(msg):
    out = {}
    for f in msg._fields:
        value = getattr(msg, f[0])
        if isinstance(value, _Msg):
            value = message_to_dict(value)
        elif isinstance(value, list):
            value = [message_to_dict(v) if isinstance(v, _Msg) else v for v in value]
        out[f[0]] = value
    return out

def _yaml_scalar(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    if isinstance(v, float):
        if _math.isnan(v):
            return '.nan'
        if _math.isinf(v):
            return '.inf' if v > 0 else '-.inf'
    return repr(v)

def message_to_yaml(msg, indent=0):
    if not msg._fields:
        return ' ' * indent + '{}'
    pad = ' ' * indent
    lines = []
    for f in msg._fields:
        name, value = f[0], getattr(msg, f[0])
        if isinstance(value, _Msg):
            lines.append(pad + name + ':')
            lines.append(message_to_yaml(value, indent + 2))
        elif isinstance(value, list):
            if not value:
                lines.append(pad + name + ': []')
                continue
            lines.append(pad + name + ':')
            for item in value:
                if isinstance(item, _Msg):
                    sub = message_to_yaml(item, indent + 2).split(chr(10))
                    lines.append(pad + '- ' + sub[0].lstrip())
                    lines.extend(sub[1:])
                else:
                    lines.append(pad + '- ' + _yaml_scalar(item))
        else:
            lines.append(pad + name + ': ' + _yaml_scalar(value))
    return chr(10).join(lines)

# ---------------------------------------------------------------- время
class Duration:
    def __init__(self, *, seconds=0, nanoseconds=0):
        self._ns = int(round(seconds * 1e9)) + int(nanoseconds)

    @property
    def nanoseconds(self):
        return self._ns

    def to_msg(self):
        return _MSG_CLASSES['builtin_interfaces/msg/Duration'](sec=self._ns // 1000000000, nanosec=self._ns % 1000000000)

    def __add__(self, other):
        return Duration(nanoseconds=self._ns + other._ns)

    def __sub__(self, other):
        return Duration(nanoseconds=self._ns - other._ns)

    def __eq__(self, other):
        return isinstance(other, Duration) and self._ns == other._ns

    def __lt__(self, other):
        return self._ns < other._ns

    def __le__(self, other):
        return self._ns <= other._ns

    def __gt__(self, other):
        return self._ns > other._ns

    def __ge__(self, other):
        return self._ns >= other._ns

    def __hash__(self):
        return hash(self._ns)

    def __repr__(self):
        return 'Duration(nanoseconds=%d)' % self._ns

class Time:
    def __init__(self, *, seconds=0, nanoseconds=0, clock_type=None):
        self._ns = int(round(seconds * 1e9)) + int(nanoseconds)

    @property
    def nanoseconds(self):
        return self._ns

    def seconds_nanoseconds(self):
        return (self._ns // 1000000000, self._ns % 1000000000)

    def to_msg(self):
        return _Time_msg(sec=self._ns // 1000000000, nanosec=self._ns % 1000000000)

    @staticmethod
    def from_msg(msg):
        return Time(seconds=msg.sec, nanoseconds=msg.nanosec)

    def __add__(self, other):
        return Time(nanoseconds=self._ns + other._ns)

    def __sub__(self, other):
        if isinstance(other, Time):
            return Duration(nanoseconds=self._ns - other._ns)
        return Time(nanoseconds=self._ns - other._ns)

    def __eq__(self, other):
        return isinstance(other, Time) and self._ns == other._ns

    def __lt__(self, other):
        return self._ns < other._ns

    def __le__(self, other):
        return self._ns <= other._ns

    def __gt__(self, other):
        return self._ns > other._ns

    def __ge__(self, other):
        return self._ns >= other._ns

    def __hash__(self):
        return hash(self._ns)

    def __repr__(self):
        return 'Time(nanoseconds=%d, clock_type=ROS_TIME)' % self._ns

class ClockType(_enum.Enum):
    SYSTEM_TIME = 1
    ROS_TIME = 2
    STEADY_TIME = 3

class Clock:
    def __init__(self, *, clock_type=ClockType.ROS_TIME, drone=None):
        self.clock_type = clock_type
        self._drone = drone

    def now(self):
        drone = self._drone or _drone_id()
        return Time(nanoseconds=int(round((_EPOCH + _sim_time(drone)) * 1e9)))

    async def sleep_for(self, duration):
        await _sim_sleep(self._drone or _drone_id(), duration.nanoseconds / 1e9, True)

# ---------------------------------------------------------------- логирование
_LOG = _collections.deque(maxlen=500)
_LEVELS = {'DEBUG': 10, 'INFO': 20, 'WARN': 30, 'ERROR': 40, 'FATAL': 50}

class LoggingSeverity(_enum.IntEnum):
    UNSET = 0
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40
    FATAL = 50

class _Logger:
    def __init__(self, name, drone=None):
        self.name = name
        self._drone = drone
        self._level = 20
        self._seen = set()
        self._last = {}

    def get_name(self):
        return self.name

    def get_child(self, suffix):
        return _Logger(self.name + '.' + suffix, self._drone)

    def set_level(self, level):
        self._level = int(level)

    def get_effective_level(self):
        return LoggingSeverity(self._level)

    def is_enabled_for(self, level):
        return int(level) >= self._level

    def _emit(self, level, message, **kwargs):
        if _LEVELS[level] < self._level:
            return None
        text = str(message)
        drone = self._drone or _drone_id()
        now = _sim_time(drone)
        if kwargs.get('once'):
            if text in self._seen:
                return None
            self._seen.add(text)
        throttle = kwargs.get('throttle_duration_sec')
        if throttle:
            if text in self._last and now - self._last[text] < throttle:
                return None
            self._last[text] = now
        if kwargs.get('skip_first') and text not in self._seen:
            self._seen.add(text)
            return None
        line = "[%s] [%.9f] [%s]: %s" % (level, _EPOCH + now, self.name, text)
        _LOG.append((level, self.name, text))
        _js.ros2_log(level, line)
        return None

    def debug(self, message, **kwargs):
        return self._emit('DEBUG', message, **kwargs)

    def info(self, message, **kwargs):
        return self._emit('INFO', message, **kwargs)

    def warn(self, message, **kwargs):
        return self._emit('WARN', message, **kwargs)

    warning = warn

    def error(self, message, **kwargs):
        return self._emit('ERROR', message, **kwargs)

    def fatal(self, message, **kwargs):
        return self._emit('FATAL', message, **kwargs)

# ---------------------------------------------------------------- QoS
class ReliabilityPolicy(_enum.Enum):
    SYSTEM_DEFAULT = 0
    RELIABLE = 1
    BEST_EFFORT = 2

class DurabilityPolicy(_enum.Enum):
    SYSTEM_DEFAULT = 0
    TRANSIENT_LOCAL = 1
    VOLATILE = 2

class HistoryPolicy(_enum.Enum):
    SYSTEM_DEFAULT = 0
    KEEP_LAST = 1
    KEEP_ALL = 2

class QoSProfile:
    def __init__(self, depth=10, history=HistoryPolicy.KEEP_LAST, reliability=ReliabilityPolicy.RELIABLE,
                 durability=DurabilityPolicy.VOLATILE, **kwargs):
        self.depth = depth
        self.history = history
        self.reliability = reliability
        self.durability = durability

qos_profile_sensor_data = QoSProfile(depth=5, reliability=ReliabilityPolicy.BEST_EFFORT)
qos_profile_system_default = QoSProfile(depth=10)
qos_profile_services_default = QoSProfile(depth=10)

def _qos(profile):
    if isinstance(profile, QoSProfile):
        return profile
    return QoSProfile(depth=int(profile))

# ---------------------------------------------------------------- параметры
class ParameterNotDeclaredException(Exception):
    pass

class ParameterAlreadyDeclaredException(Exception):
    pass

class ParameterUninitializedException(Exception):
    pass

class NotInitializedException(RuntimeError):
    pass

class _ParamType(_enum.Enum):
    NOT_SET = 0
    BOOL = 1
    INTEGER = 2
    DOUBLE = 3
    STRING = 4
    BYTE_ARRAY = 5
    BOOL_ARRAY = 6
    INTEGER_ARRAY = 7
    DOUBLE_ARRAY = 8
    STRING_ARRAY = 9

class _ParameterValue:
    def __init__(self, ptype, value):
        self.type = ptype.value
        self.bool_value = value if ptype == _ParamType.BOOL else False
        self.integer_value = value if ptype == _ParamType.INTEGER else 0
        self.double_value = value if ptype == _ParamType.DOUBLE else 0.0
        self.string_value = value if ptype == _ParamType.STRING else ''
        self.bool_array_value = list(value) if ptype == _ParamType.BOOL_ARRAY else []
        self.integer_array_value = list(value) if ptype == _ParamType.INTEGER_ARRAY else []
        self.double_array_value = list(value) if ptype == _ParamType.DOUBLE_ARRAY else []
        self.string_array_value = list(value) if ptype == _ParamType.STRING_ARRAY else []

def _param_type_of(value):
    if value is None:
        return _ParamType.NOT_SET
    if isinstance(value, bool):
        return _ParamType.BOOL
    if isinstance(value, int):
        return _ParamType.INTEGER
    if isinstance(value, float):
        return _ParamType.DOUBLE
    if isinstance(value, str):
        return _ParamType.STRING
    if isinstance(value, (bytes, bytearray)):
        return _ParamType.BYTE_ARRAY
    if isinstance(value, (list, tuple)) and value:
        first = _param_type_of(value[0])
        return {_ParamType.BOOL: _ParamType.BOOL_ARRAY, _ParamType.INTEGER: _ParamType.INTEGER_ARRAY,
                _ParamType.DOUBLE: _ParamType.DOUBLE_ARRAY, _ParamType.STRING: _ParamType.STRING_ARRAY}.get(first, _ParamType.NOT_SET)
    return _ParamType.NOT_SET

class Parameter:
    Type = _ParamType

    def __init__(self, name, type_=None, value=None):
        self.name = name
        self.type_ = type_ if type_ is not None else _param_type_of(value)
        self.value = value

    def get_parameter_value(self):
        return _ParameterValue(self.type_, self.value)

    def __repr__(self):
        return "rclpy.Parameter(name='%s', type_=%s, value=%r)" % (self.name, self.type_, self.value)

_SetParametersResult = _MSG_CLASSES['rcl_interfaces/msg/SetParametersResult']

def _scalar_from_text(text):
    low = text.lower()
    if low in ('true', 'false'):
        return low == 'true'
    try:
        return int(text)
    except ValueError:
        pass
    try:
        return float(text)
    except ValueError:
        return text.strip("'" + chr(34))

def _parse_ros_args(args):
    overrides = {}
    items = list(args or [])
    i = 0
    while i < len(items):
        if items[i] in ('-p', '--param') and i + 1 < len(items) and ':=' in items[i + 1]:
            key, _, text = items[i + 1].partition(':=')
            overrides[key] = _scalar_from_text(text)
            i += 1
        i += 1
    return overrides

# ---------------------------------------------------------------- граф и контекст
class _Graph:
    def __init__(self, drone):
        self.drone = drone
        self.nodes = []
        self.pubs = {}
        self.subs = {}
        self.servers = {}
        self.launch = None

_graphs = {}
_ctx = {'ok': False, 'drone': None, 'overrides': {}}

def _graph(drone):
    g = _graphs.get(drone)
    if g is None:
        g = _graphs[drone] = _Graph(drone)
    return g

def _require_enabled(drone):
    enabled = getattr(_js, 'pioneer2_sdk_enabled', None)
    if enabled is not None and not bool(enabled(drone)):
        raise RuntimeError("Для этого дрона выбран не pioneer_sdk2: ROS 2 работает на Пионере Мини 2 и на Базовом с Radxa Zero 3W (язык «Python · SDK2» в панели «Рой»).")

def _resolve(node, name, kind='topic'):
    name = str(name)
    if name.startswith('~'):
        return node.get_fully_qualified_name() + ('/' + name[2:] if name.startswith('~/') else '')
    if name.startswith('/'):
        return name
    ns = node._namespace
    return (ns.rstrip('/') + '/' + name) if ns != '/' else '/' + name

class Future:
    def __init__(self):
        self._done = False
        self._cancelled = False
        self._result = None
        self._exception = None
        self._callbacks = []

    def done(self):
        return self._done

    def cancelled(self):
        return self._cancelled

    def result(self):
        if self._exception is not None:
            raise self._exception
        return self._result

    def exception(self):
        return self._exception

    def cancel(self):
        if not self._done:
            self._cancelled = True
            self._finish()

    def set_result(self, result):
        self._result = result
        self._finish()

    def set_exception(self, exception):
        self._exception = exception
        self._finish()

    def _finish(self):
        self._done = True
        callbacks, self._callbacks = self._callbacks, []
        for callback in callbacks:
            self._run_callback(callback)

    def _run_callback(self, callback):
        result = callback(self)
        if _inspect.isawaitable(result):
            _bg_task(result)

    def add_done_callback(self, callback):
        if self._done:
            self._run_callback(callback)
        else:
            self._callbacks.append(callback)

    def __await__(self):
        return self._wait().__await__()

    async def _wait(self):
        drone = _ctx['drone'] or _drone_id()
        while not self._done:
            await _tick(drone, True)
        return self.result()

class Publisher:
    def __init__(self, node, msg_type, topic, qos):
        self.msg_type = msg_type
        self.topic = topic
        self.node = node
        self.qos_profile = qos
        self._transient = qos.durability == DurabilityPolicy.TRANSIENT_LOCAL
        self._last = None
        self._destroyed = False

    def publish(self, msg):
        if self._destroyed:
            raise RuntimeError('Publisher уже уничтожен')
        if not isinstance(msg, self.msg_type):
            raise TypeError("Expected message type '%s' but received '%s'" % (self.msg_type.__module__ + '.' + self.msg_type.__name__, type(msg).__module__ + '.' + type(msg).__name__))
        if self._transient:
            self._last = _copy.deepcopy(msg)
        for sub in list(self.node._graph.subs.get(self.topic, ())):
            if sub.msg_type is self.msg_type and not sub._destroyed:
                sub._push(msg)

    def get_subscription_count(self):
        return sum(1 for s in self.node._graph.subs.get(self.topic, ()) if s.msg_type is self.msg_type)

    @property
    def topic_name(self):
        return self.topic

    def destroy(self):
        self.node.destroy_publisher(self)

class Subscription:
    def __init__(self, node, msg_type, topic, callback, qos, group):
        self.node = node
        self.msg_type = msg_type
        self.topic = topic
        self.callback = callback
        self.qos_profile = qos
        self.callback_group = group
        self._queue = _collections.deque(maxlen=max(1, qos.depth) if qos.history == HistoryPolicy.KEEP_LAST else None)
        self._destroyed = False

    def _push(self, msg):
        self._queue.append(_copy.deepcopy(msg))

    @property
    def topic_name(self):
        return self.topic

    def destroy(self):
        self.node.destroy_subscription(self)

class _Server:
    def __init__(self, node, srv_type, name, callback, group, handler=None):
        self.node = node
        self.srv_type = srv_type
        self.srv_name = name
        self.callback = callback
        self.callback_group = group
        self.handler = handler
        self._queue = _collections.deque()
        self._destroyed = False

    def submit(self, request):
        # Возвращает Future с ответом. Серверы ros_pioneer_node отвечают сами (задачей), серверы ученика - в spin.
        future = Future()
        if self.handler is not None:
            async def run():
                try:
                    future.set_result(await self.handler(request, self.srv_type.Response()))
                except Exception as e:
                    future.set_exception(e)
            _asyncio.ensure_future(run())
        else:
            self._queue.append((request, future))
        return future

    @property
    def srv_name_(self):
        return self.srv_name

    def destroy(self):
        self.node.destroy_service(self)

class Client:
    def __init__(self, node, srv_type, name, group):
        self.node = node
        self.srv_type = srv_type
        self.srv_name = name
        self.callback_group = group
        self._destroyed = False

    def _server(self):
        server = self.node._graph.servers.get(self.srv_name)
        if server is not None and server.srv_type is self.srv_type and not server._destroyed:
            return server
        return None

    def service_is_ready(self):
        return self._server() is not None

    async def wait_for_service(self, timeout_sec=None):
        drone = self.node._drone
        end = None if timeout_sec is None else _sim_time(drone) + float(timeout_sec)
        while not self.service_is_ready():
            if end is not None and _sim_time(drone) >= end:
                return False
            await _tick(drone, not self.node._internal)
        return True

    def call_async(self, request):
        if not isinstance(request, self.srv_type.Request):
            raise TypeError("Expected request type '%s' but received '%s'" % (self.srv_type.__name__ + '.Request', type(request).__name__))
        server = self._server()
        if server is None:
            return Future()
        return server.submit(_copy.deepcopy(request))

    async def call(self, request, timeout_sec=None):
        future = self.call_async(request)
        drone = self.node._drone
        end = None if timeout_sec is None else _sim_time(drone) + float(timeout_sec)
        while not future.done():
            if end is not None and _sim_time(drone) >= end:
                future.cancel()
                raise TimeoutError('Service call timed out')
            await _tick(drone, not self.node._internal)
        return future.result()

    def destroy(self):
        self.node.destroy_client(self)

class Timer:
    def __init__(self, node, period, callback, group):
        self.node = node
        self.callback = callback
        self.callback_group = group
        self._period = float(period)
        self._canceled = False
        self._destroyed = False
        self._next = _sim_time(node._drone) + self._period

    @property
    def timer_period_ns(self):
        return int(round(self._period * 1e9))

    def cancel(self):
        self._canceled = True

    def reset(self):
        self._canceled = False
        self._next = _sim_time(self.node._drone) + self._period

    def is_canceled(self):
        return self._canceled

    def time_until_next_call(self):
        if self._canceled:
            return None
        return int(round((self._next - _sim_time(self.node._drone)) * 1e9))

    def _take(self, now):
        if self._canceled or self._destroyed or now < self._next:
            return False
        while self._next <= now:
            self._next += self._period
        return True

    def destroy(self):
        self.node.destroy_timer(self)

class Rate:
    def __init__(self, node, frequency):
        self._node = node
        self._period = 1.0 / float(frequency)
        self._next = _sim_time(node._drone) + self._period

    async def sleep(self):
        drone = self._node._drone
        while _sim_time(drone) < self._next:
            await _tick(drone, not self._node._internal)
        self._next += self._period
        now = _sim_time(drone)
        if now > self._next:
            self._next = now + self._period

    def destroy(self):
        return None

class CallbackGroup:
    pass

class MutuallyExclusiveCallbackGroup(CallbackGroup):
    pass

class ReentrantCallbackGroup(CallbackGroup):
    pass

class Node:
    def __init__(self, node_name, *, context=None, cli_args=None, namespace=None, use_global_arguments=True,
                 enable_rosout=True, start_parameter_services=True, parameter_overrides=None,
                 allow_undeclared_parameters=False, automatically_declare_parameters_from_overrides=False,
                 _drone=None, _internal=False):
        self._internal = _internal
        if not _internal:
            if not _ctx['ok']:
                raise NotInitializedException('rclpy.init() не вызван: сначала rclpy.init(), потом создание узла')
            _require_enabled(_ctx['drone'])
        self._drone = _drone or _ctx['drone'] or _drone_id()
        self._graph = _graph(self._drone)
        ns = '/' + str(namespace).strip('/') if namespace and str(namespace).strip('/') else '/'
        self._namespace = ns
        self._name = str(node_name)
        self._logger = _Logger(self._name, self._drone)
        self._clock = Clock(drone=self._drone)
        self._pubs = []
        self._subs = []
        self._servers = []
        self._clients = []
        self._timers = []
        self._params = {}
        self._overrides = dict(_ctx['overrides']) if use_global_arguments and not _internal else {}
        for p in (parameter_overrides or []):
            self._overrides[p.name] = p.value
        self._allow_undeclared = allow_undeclared_parameters
        self._on_set = []
        self._destroyed = False
        self._graph.nodes.append(self)
        if automatically_declare_parameters_from_overrides:
            for key, value in list(self._overrides.items()):
                self.declare_parameter(key, value)

    # ---- имя и служебное
    def get_name(self):
        return self._name

    def get_namespace(self):
        return self._namespace

    def get_fully_qualified_name(self):
        return (self._namespace.rstrip('/') + '/' + self._name)

    def get_logger(self):
        return self._logger

    def get_clock(self):
        return self._clock

    def get_node_names(self):
        return [n._name for n in self._graph.nodes]

    def get_topic_names_and_types(self):
        out = {}
        for table in (self._graph.pubs, self._graph.subs):
            for topic, items in table.items():
                for item in items:
                    out.setdefault(topic, [])
                    t = _type_key(item.msg_type)
                    if t not in out[topic]:
                        out[topic].append(t)
        return sorted(out.items())

    def get_service_names_and_types(self):
        return sorted((name, [_type_key(s.srv_type)]) for name, s in self._graph.servers.items())

    def count_publishers(self, topic):
        return len(self._graph.pubs.get(_resolve(self, topic), ()))

    def count_subscribers(self, topic):
        return len(self._graph.subs.get(_resolve(self, topic), ()))

    # ---- создание сущностей
    def create_publisher(self, msg_type, topic, qos_profile=10, **kwargs):
        pub = Publisher(self, msg_type, _resolve(self, topic), _qos(qos_profile))
        self._pubs.append(pub)
        self._graph.pubs.setdefault(pub.topic, []).append(pub)
        return pub

    def create_subscription(self, msg_type, topic, callback, qos_profile=10, *, callback_group=None, **kwargs):
        sub = Subscription(self, msg_type, _resolve(self, topic), callback, _qos(qos_profile), callback_group)
        self._subs.append(sub)
        self._graph.subs.setdefault(sub.topic, []).append(sub)
        # TRANSIENT_LOCAL: поздний подписчик получает последнее сообщение.
        if sub.qos_profile.durability == DurabilityPolicy.TRANSIENT_LOCAL:
            for pub in self._graph.pubs.get(sub.topic, ()):
                if pub._last is not None and pub.msg_type is msg_type:
                    sub._push(pub._last)
        return sub

    def create_service(self, srv_type, srv_name, callback, *, qos_profile=None, callback_group=None, _handler=None):
        name = _resolve(self, srv_name)
        server = _Server(self, srv_type, name, callback, callback_group, _handler)
        self._servers.append(server)
        self._graph.servers[name] = server
        return server

    def create_client(self, srv_type, srv_name, *, qos_profile=None, callback_group=None):
        client = Client(self, srv_type, _resolve(self, srv_name), callback_group)
        self._clients.append(client)
        return client

    def create_timer(self, timer_period_sec, callback, callback_group=None, clock=None):
        timer = Timer(self, timer_period_sec, callback, callback_group)
        self._timers.append(timer)
        return timer

    def create_rate(self, frequency, clock=None):
        return Rate(self, frequency)

    def destroy_publisher(self, pub):
        pub._destroyed = True
        if pub in self._pubs:
            self._pubs.remove(pub)
        lst = self._graph.pubs.get(pub.topic, [])
        if pub in lst:
            lst.remove(pub)
        return True

    def destroy_subscription(self, sub):
        sub._destroyed = True
        if sub in self._subs:
            self._subs.remove(sub)
        lst = self._graph.subs.get(sub.topic, [])
        if sub in lst:
            lst.remove(sub)
        return True

    def destroy_service(self, server):
        server._destroyed = True
        if server in self._servers:
            self._servers.remove(server)
        if self._graph.servers.get(server.srv_name) is server:
            del self._graph.servers[server.srv_name]
        return True

    def destroy_client(self, client):
        client._destroyed = True
        if client in self._clients:
            self._clients.remove(client)
        return True

    def destroy_timer(self, timer):
        timer._destroyed = True
        if timer in self._timers:
            self._timers.remove(timer)
        return True

    def destroy_rate(self, rate):
        return True

    def destroy_node(self):
        if self._destroyed:
            return
        for pub in list(self._pubs):
            self.destroy_publisher(pub)
        for sub in list(self._subs):
            self.destroy_subscription(sub)
        for server in list(self._servers):
            self.destroy_service(server)
        for client in list(self._clients):
            self.destroy_client(client)
        for timer in list(self._timers):
            self.destroy_timer(timer)
        if self in self._graph.nodes:
            self._graph.nodes.remove(self)
        self._destroyed = True

    # ---- параметры
    def declare_parameter(self, name, value=None, descriptor=None, ignore_override=False):
        if name in self._params:
            raise ParameterAlreadyDeclaredException("Parameter(s) already declared: ['%s']" % name)
        if not ignore_override and name in self._overrides:
            value = self._overrides[name]
        param = Parameter(name, None, value)
        self._params[name] = param
        return param

    def declare_parameters(self, namespace, parameters):
        out = []
        for item in parameters:
            key = (namespace + '.' if namespace else '') + item[0]
            out.append(self.declare_parameter(key, item[1] if len(item) > 1 else None))
        return out

    def has_parameter(self, name):
        return name in self._params

    def get_parameter(self, name):
        if name not in self._params:
            if self._allow_undeclared:
                return Parameter(name)
            raise ParameterNotDeclaredException("Parameter(s) not declared: ['%s']" % name)
        return self._params[name]

    def get_parameter_or(self, name, alternative_value=None):
        if name in self._params:
            return self._params[name]
        return alternative_value if alternative_value is not None else Parameter(name)

    def get_parameters(self, names):
        return [self.get_parameter(n) for n in names]

    def get_parameters_by_prefix(self, prefix):
        key = prefix + '.'
        return {n[len(key):]: p for n, p in self._params.items() if n.startswith(key)}

    def set_parameters(self, parameter_list):
        return [self._set_one(p) for p in parameter_list]

    def _set_one(self, param):
        old = self._params.get(param.name)
        if old is None and not self._allow_undeclared:
            raise ParameterNotDeclaredException("Parameter(s) not declared: ['%s']" % param.name)
        new = Parameter(param.name, None, param.value) if param.type_ is None else param
        if old is not None and old.type_ != _ParamType.NOT_SET and new.type_ != old.type_:
            return _SetParametersResult(successful=False, reason="Wrong parameter type, parameter %s is of type %s, setting it to type %s is not allowed." % (param.name, old.type_.name.lower(), new.type_.name.lower()))
        for callback in self._on_set:
            result = callback([new])
            if not result.successful:
                return result
        self._params[param.name] = new
        return _SetParametersResult(successful=True)

    def add_on_set_parameters_callback(self, callback):
        self._on_set.append(callback)
        return callback

    def remove_on_set_parameters_callback(self, callback):
        if callback in self._on_set:
            self._on_set.remove(callback)

    def undeclare_parameter(self, name):
        if name not in self._params:
            raise ParameterNotDeclaredException("Parameter(s) not declared: ['%s']" % name)
        del self._params[name]

    def list_parameters(self, prefixes=None, depth=0):
        return sorted(self._params)

# ---------------------------------------------------------------- экзекьюторы
class _Executor:
    concurrent = False

    def __init__(self, *, context=None, num_threads=None):
        self._nodes = []
        self._stopped = False

    def add_node(self, node):
        if node not in self._nodes:
            self._nodes.append(node)
        return True

    def remove_node(self, node):
        if node in self._nodes:
            self._nodes.remove(node)

    def get_nodes(self):
        return list(self._nodes)

    def shutdown(self, timeout_sec=None):
        self._stopped = True
        return True

    def create_task(self, callback, *args, **kwargs):
        future = Future()
        try:
            future.set_result(callback(*args, **kwargs))
        except Exception as e:
            future.set_exception(e)
        return future

    def _drone(self):
        return self._nodes[0]._drone if self._nodes else (_ctx['drone'] or _drone_id())

    def _alive(self):
        return _ctx['ok'] and not self._stopped

    def _take_ready(self):
        now = _sim_time(self._drone())
        items = []
        for node in list(self._nodes):
            for timer in list(node._timers):
                if timer._take(now):
                    items.append(('timer', timer, None))
            for sub in list(node._subs):
                while sub._queue:
                    items.append(('sub', sub, sub._queue.popleft()))
            for server in list(node._servers):
                while server._queue:
                    items.append(('srv', server, server._queue.popleft()))
        return items

    async def _call(self, result):
        if _inspect.isawaitable(result):
            if self.concurrent:
                _bg_task(result)
            else:
                await result

    async def _run(self, items):
        for kind, obj, payload in items:
            if kind == 'timer':
                await self._call(obj.callback())
            elif kind == 'sub':
                await self._call(obj.callback(payload))
            else:
                request, future = payload
                response = obj.callback(request, obj.srv_type.Response())
                if _inspect.isawaitable(response):
                    response = await response
                future.set_result(response)

    async def spin_once(self, timeout_sec=None):
        drone = self._drone()
        end = None if timeout_sec is None or timeout_sec < 0 else _sim_time(drone) + float(timeout_sec)
        while True:
            if not self._alive():
                return
            items = self._take_ready()
            if items:
                await self._run(items)
                return
            if end is not None and _sim_time(drone) >= end:
                return
            await _tick(drone)

    async def spin_some(self, timeout_sec=0):
        await self.spin_once(timeout_sec)

    async def spin_once_until_future_complete(self, future, timeout_sec=None):
        await self.spin_until_future_complete(future, timeout_sec)

    async def spin_until_future_complete(self, future, timeout_sec=None):
        drone = self._drone()
        end = None if timeout_sec is None or timeout_sec < 0 else _sim_time(drone) + float(timeout_sec)
        while not future.done() and self._alive():
            items = self._take_ready()
            if items:
                await self._run(items)
                await _asyncio.sleep(0)
                continue
            if end is not None and _sim_time(drone) >= end:
                return
            await _tick(drone)

    async def spin(self):
        drone = self._drone()
        while self._alive():
            items = self._take_ready()
            if items:
                await self._run(items)
                await _asyncio.sleep(0)
            else:
                await _tick(drone)

class SingleThreadedExecutor(_Executor):
    pass

class MultiThreadedExecutor(_Executor):
    # Потоков в браузере нет: обратные вызовы, которые ждут (async), идут параллельно задачами цикла событий.
    concurrent = True

    def __init__(self, num_threads=None, *, context=None):
        super().__init__(context=context)
        self.num_threads = num_threads

_global_executor = [None]

def _executor_for(node, executor):
    if executor is not None:
        return executor, False
    ex = SingleThreadedExecutor()
    ex.add_node(node)
    return ex, True

# ---------------------------------------------------------------- rclpy
def init(*, args=None, context=None, domain_id=None):
    drone = _drone_id()
    _require_enabled(drone)
    if _ctx['ok']:
        raise RuntimeError('Context.init() must only be called once')
    _ctx['ok'] = True
    _ctx['drone'] = drone
    _ctx['overrides'] = _parse_ros_args(args)
    _ensure_launch(drone)

def ok(*, context=None):
    if not _ctx['ok']:
        return False
    if _js.py_is_cancelled(_ctx['drone']):
        return False
    return True

def shutdown(*, context=None):
    if not _ctx['ok']:
        raise RuntimeError('rcl_shutdown already called on the given context')
    _cleanup_user()

def try_shutdown(*, context=None):
    if _ctx['ok']:
        _cleanup_user()

def _cleanup_user():
    drone = _ctx['drone']
    _ctx['ok'] = False
    _ctx['overrides'] = {}
    g = _graphs.get(drone)
    if g is not None:
        for node in list(g.nodes):
            if not node._internal:
                node.destroy_node()

def _sim_cleanup():
    # Вызывает раннер, когда программа закончилась: узлы ученика исчезают, ros_pioneer_node остаётся.
    if _ctx['ok']:
        _cleanup_user()

def create_node(node_name, *, context=None, cli_args=None, namespace=None, use_global_arguments=True,
                enable_rosout=True, start_parameter_services=True, parameter_overrides=None,
                allow_undeclared_parameters=False, automatically_declare_parameters_from_overrides=False):
    return Node(node_name, namespace=namespace, parameter_overrides=parameter_overrides,
                use_global_arguments=use_global_arguments, allow_undeclared_parameters=allow_undeclared_parameters,
                automatically_declare_parameters_from_overrides=automatically_declare_parameters_from_overrides)

async def spin(node, executor=None):
    ex, own = _executor_for(node, executor)
    if not own:
        ex.add_node(node)
    try:
        await ex.spin()
    finally:
        if not own:
            ex.remove_node(node)

async def spin_once(node, *, executor=None, timeout_sec=None):
    ex, own = _executor_for(node, executor)
    if not own:
        ex.add_node(node)
    try:
        await ex.spin_once(timeout_sec)
    finally:
        if not own:
            ex.remove_node(node)

async def spin_some(node, executor=None, timeout_sec=0):
    await spin_once(node, executor=executor, timeout_sec=timeout_sec)

async def spin_until_future_complete(node, future, executor=None, timeout_sec=None):
    ex, own = _executor_for(node, executor)
    if not own:
        ex.add_node(node)
    try:
        await ex.spin_until_future_complete(future, timeout_sec)
    finally:
        if not own:
            ex.remove_node(node)

def get_logger(name):
    return _Logger(name)

# ---------------------------------------------------------------- модули для import
_rclpy = _module('rclpy')
for _name, _value in {
    'init': init, 'ok': ok, 'shutdown': shutdown, 'try_shutdown': try_shutdown, 'create_node': create_node,
    'spin': spin, 'spin_once': spin_once, 'spin_some': spin_some, 'spin_until_future_complete': spin_until_future_complete,
    'Node': Node, 'get_logger': get_logger, 'Future': Future, '_sim_cleanup': _sim_cleanup
}.items():
    setattr(_rclpy, _name, _value)
for _sub, _items in {
    'node': {'Node': Node},
    'qos': {'QoSProfile': QoSProfile, 'ReliabilityPolicy': ReliabilityPolicy, 'DurabilityPolicy': DurabilityPolicy,
            'HistoryPolicy': HistoryPolicy, 'qos_profile_sensor_data': qos_profile_sensor_data,
            'qos_profile_system_default': qos_profile_system_default, 'qos_profile_services_default': qos_profile_services_default},
    'executors': {'SingleThreadedExecutor': SingleThreadedExecutor, 'MultiThreadedExecutor': MultiThreadedExecutor},
    'callback_groups': {'CallbackGroup': CallbackGroup, 'MutuallyExclusiveCallbackGroup': MutuallyExclusiveCallbackGroup,
                        'ReentrantCallbackGroup': ReentrantCallbackGroup},
    'duration': {'Duration': Duration},
    'time': {'Time': Time},
    'clock': {'Clock': Clock, 'ClockType': ClockType},
    'parameter': {'Parameter': Parameter},
    'logging': {'get_logger': get_logger, 'LoggingSeverity': LoggingSeverity},
    'task': {'Future': Future},
    'exceptions': {'ParameterNotDeclaredException': ParameterNotDeclaredException,
                   'ParameterAlreadyDeclaredException': ParameterAlreadyDeclaredException,
                   'ParameterUninitializedException': ParameterUninitializedException,
                   'NotInitializedException': NotInitializedException},
    'publisher': {'Publisher': Publisher},
    'subscription': {'Subscription': Subscription},
    'client': {'Client': Client},
    'timer': {'Timer': Timer, 'Rate': Rate},
}.items():
    _m = _module('rclpy.' + _sub, False)
    for _name, _value in _items.items():
        setattr(_m, _name, _value)
`;
