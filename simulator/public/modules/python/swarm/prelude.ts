/* eslint-disable max-lines -- текст Python одним куском: он выполняется как модуль целиком */
/*
 * Эмуляция Swarm Kit (Python-библиотека pioneer_swarm, эталон - docs/swarm/swarm-kit.md) внутри «Python · SDK2».
 * Одна сеть роя на страницу: реестр юнитов (по одному на дрон с pioneer_sdk2 - это swarm-server на борту), Heartbeat,
 * почтовые ящики и потоки телеметрии по подписке. Объект PioneerSwarmUnit - клиент этой сети в программе ученика.
 *
 * Время сети - симулируемое: общие часы симуляции (swarm_clock моста, секунды физики), поэтому Heartbeat, таймауты
 * и ожидание телеметрии ускоряются вместе с симуляцией, а остальные дроны продолжают работать, пока одна программа ждёт.
 * Допущения там, где справочник молчит, собраны в docs/swarm/emulation-notes.md и помечены словом «допущение».
 * В тексте нет обратных кавычек, `${` и обратных слэшей: он лежит в шаблонной строке.
 */
export const SWARM_PRELUDE = `
import asyncio as _asyncio, builtins as _builtins, copy as _copy, enum as _enum, importlib as _importlib
import json as _json, math as _math, re as _re, sys as _sys, types as _types
from collections import deque as _deque
import js as _js

# ---- параметры сети (допущение: справочник Геоскана чисел не называет)
HEARTBEAT_PERIOD = 1.0    # с: swarm-server шлёт Heartbeat раз в секунду
HEARTBEAT_TTL = 3.0       # юнит пропал из списка, если его Heartbeat не слышно столько секунд (три периода)
FIRST_BEAT_DELAY = 0.5    # с: собственный тип юнита известен после первого собственного Heartbeat (в среднем полпериода)
SUBSCRIBE_DELAY = 0.1     # с: подписка доходит до соседа, раньше этого первого сэмпла нет
WATCH_GAP = 0.25          # с: сеть «под наблюдением», если её опрашивали не раньше этого назад (см. _Net.sync)
MAILBOX_LIMIT = 100       # сообщений в ящике; при переполнении вытесняются самые старые
_MACHINE_ID = _re.compile('^[A-Za-z_][A-Za-z0-9_]*$')
_FLYING = ('FLYING_HOVER', 'FLYING_MOVING')
_EVENT = {'DISARM': 1, 'COPTER_LANDED': 2, 'LOW_VOLTAGE1': 3, 'LOW_VOLTAGE2': 4, 'TAKEOFF_COMPLETE': 7, 'ENGINES_STARTED': 8, 'SHOCK': 9}

class SwarmUnitType(_enum.Enum):
    AERO = 'aero'
    ROVER = 'rover'
    MARINE = 'marine'
    ROBOT = 'robot'
    OTHER = 'other'

# Каталог потоков воздушного юнита (то, что он объявляет в Heartbeat): (имя без идентификатора юнита, тип сообщения,
# период в секундах, вид). Имена и типы - те же, что у топиков ros_pioneer_node без префикса /geoscan/ (допущение).
_STREAMS = [
    ('navigation/local/position', 'geometry_msgs/msg/Point', 0.05, 'pos'),
    ('navigation/local/velocity', 'geometry_msgs/msg/Vector3', 0.05, 'vel'),
    ('navigation/local/yaw', 'std_msgs/msg/Float32', 0.05, 'yaw'),
    ('navigation/local/status', 'gs_interfaces/msg/NavStatus', 0.05, 'nav_status'),
    ('sensors/imu', 'sensor_msgs/msg/Imu', 1.0 / 30.0, 'imu'),
    ('sensors/altitude', 'std_msgs/msg/Float32', 0.1, 'altitude'),
    ('sensors/battery_state', 'sensor_msgs/msg/BatteryState', 0.5, 'battery'),
    ('flight/fly_state', 'std_msgs/msg/Int8', 0.1, 'fly_state'),
    ('flight/callback_event', 'std_msgs/msg/Int8', None, 'event'),
]

class _Cancelled(Exception):
    pass

def _topy(value):
    return value.to_py() if hasattr(value, 'to_py') else value

def _msg(key):
    pkg, _, name = key.split('/')
    return getattr(_importlib.import_module(pkg + '.msg'), name)

def _natural(text):
    return [(0, int(part), '') if part.isdigit() else (1, 0, part) for part in _re.split('([0-9]+)', text)]

def _bound_drone():
    # Дрон программы: раннер кладёт его в глобальные переменные программы (__sim_drone_id), так что юнит
    # привязывается верно, даже если после запуска этой программы стартовала программа другого дрона.
    frame = _sys._getframe(1)
    while frame is not None:
        value = frame.f_globals.get('__sim_drone_id')
        if value:
            return str(value)
        frame = frame.f_back
    return str(_js.SIM_DRONE_ID)

async def _tick(drone):
    # Один оборот цикла событий; «Стоп» прерывает ожидание, как у pioneer_sdk2 и rclpy.
    if _js.py_is_cancelled(drone):
        raise _Cancelled('PYTHON_CANCELLED')
    await _asyncio.sleep(0.01)

def _state_of(drone):
    raw = _js.swarm_state(drone)
    if not raw:
        return None
    return _json.loads(str(raw))

def _fly_state(fsm):
    if fsm == 'IDLE':
        return 0
    if fsm in ('PREFLIGHT', 'TAKEOFF_PROCESS'):
        return 1
    return 2

def _build(kind, s):
    f = float
    if kind == 'pos':
        p = s['pos']
        return _msg('geometry_msgs/msg/Point')(x=f(p[0]), y=f(p[1]), z=f(p[2]))
    if kind == 'vel':
        v = s['vel']
        return _msg('geometry_msgs/msg/Vector3')(x=f(v[0]), y=f(v[1]), z=f(v[2]))
    if kind == 'yaw':
        return _msg('std_msgs/msg/Float32')(data=f(s['rpy'][2]))
    if kind == 'nav_status':
        return _msg('gs_interfaces/msg/NavStatus')(status=3)
    if kind == 'altitude':
        return _msg('std_msgs/msg/Float32')(data=f(s['pos'][2]))
    if kind == 'fly_state':
        return _msg('std_msgs/msg/Int8')(data=_fly_state(str(s['fsm'])))
    if kind == 'battery':
        m = _msg('sensor_msgs/msg/BatteryState')()
        m.voltage = f(s['battery'])
        m.temperature = 30.0
        for name in ('current', 'charge', 'capacity', 'design_capacity', 'percentage'):
            setattr(m, name, float('nan'))
        m.present = True
        return m
    if kind == 'imu':
        m = _msg('sensor_msgs/msg/Imu')()
        roll, pitch, yaw = [f(v) for v in s['rpy']]
        cr, sr = _math.cos(roll / 2), _math.sin(roll / 2)
        cp, sp = _math.cos(pitch / 2), _math.sin(pitch / 2)
        cy, sy = _math.cos(yaw / 2), _math.sin(yaw / 2)
        m.orientation = _msg('geometry_msgs/msg/Quaternion')(x=sr * cp * cy - cr * sp * sy, y=cr * sp * cy + sr * cp * sy,
                                                             z=cr * cp * sy - sr * sp * cy, w=cr * cp * cy + sr * sp * sy)
        g, a = s['gyro'], s['accel']
        m.angular_velocity = _msg('geometry_msgs/msg/Vector3')(x=f(g[0]), y=f(g[1]), z=f(g[2]))
        m.linear_acceleration = _msg('geometry_msgs/msg/Vector3')(x=f(a[0]), y=f(a[1]), z=f(a[2]))
        return m
    return None

# ---------------------------------------------------------------- сеть
class _Unit:
    """Юнит сети: swarm-server одного дрона. Живёт, пока дрон есть в симуляторе, независимо от программы."""
    def __init__(self, drone, born):
        self.drone = drone
        self.default_id = drone
        self.name = drone
        self.model = ''
        self.type = SwarmUnitType.AERO
        self.configured_domain = 0
        self.domain_stack = []
        self.online = True
        self.present = True
        self.last_seen = born
        self.visible_from = born
        self.mailbox = _deque()
        self.instances = []
        self.subscribers = {}
        self.state = None
        self.prev_fsm = None
        self.event_seq = 0
        self.last_event = 0
        self.shocked = self.low1 = self.low2 = False

    @property
    def machine_id(self):
        return _net.explicit.get(self.drone) or self.default_id

    @property
    def domain(self):
        return self.domain_stack[-1][1] if self.domain_stack else self.configured_domain

    def visible(self, clock):
        return clock >= self.visible_from and clock - self.last_seen <= HEARTBEAT_TTL

    def subscribed(self):
        return any(self.subscribers.values())

class _Net:
    def __init__(self):
        self.reset()

    def reset(self):
        self.clock = 0.0
        self.units = {}
        self.explicit = {}
        self.booted = False
        self.last_sync = 0.0

    # ---- общие часы и состав сети
    def sync(self):
        raw = _js.swarm_units()
        rows = _json.loads(str(raw)) if raw else []
        present = {row['drone']: row for row in rows}
        # Часы сети - общие часы симуляции (секунды физики): они идут и у дронов без программ, и не откатываются
        # назад кнопкой «Сначала», в отличие от drone.current_time.
        self.clock = max(self.clock, float(_js.swarm_clock()))
        for drone, row in present.items():
            unit = self.units.get(drone)
            if unit is None:
                unit = self.units[drone] = _Unit(drone, self.clock)
                # Допущение: юниты, которые были уже при первом обращении, считаются давно работающими;
                # дрон, добавленный на глазах (сеть опрашивали меньше WATCH_GAP назад), появляется после своего
                # первого Heartbeat. Если опрашивали давно, когда он появился, неизвестно: он уже виден.
                if self.booted and self.clock - self.last_sync < WATCH_GAP:
                    unit.visible_from = self.clock + FIRST_BEAT_DELAY
            unit.default_id = row['machine_id']
            unit.name = row.get('name', drone)
            unit.model = row.get('model', '')
            unit.present = True
            if unit.online:
                unit.last_seen = self.clock
        self.booted = True
        self.last_sync = self.clock
        for drone, unit in list(self.units.items()):
            if drone not in present:
                unit.present = False
                if self.clock - unit.last_seen > HEARTBEAT_TTL:
                    self.purge(unit)
        for unit in self.units.values():
            if unit.present and unit.subscribed():
                self.observe(unit)

    def purge(self, unit):
        # Юнит пропал: подписки на него снимаются (справочник), ящик пропадает вместе с ним.
        for instance in list(unit.instances):
            instance._detach_unit(unit)
        self.units.pop(unit.drone, None)
        self.explicit.pop(unit.drone, None)

    def observe(self, unit):
        s = _state_of(unit.drone)
        unit.state = s
        if s is None:
            return
        fsm = str(s['fsm'])
        prev = unit.prev_fsm
        event = 0
        if prev is not None and fsm != prev:
            if prev == 'IDLE':
                event = _EVENT['ENGINES_STARTED']
            if fsm in _FLYING and prev in ('IDLE', 'PREFLIGHT', 'TAKEOFF_PROCESS'):
                event = _EVENT['TAKEOFF_COMPLETE']
            if fsm == 'IDLE' and prev == 'LANDING_PROCESS':
                event = _EVENT['COPTER_LANDED']
            elif fsm == 'IDLE' and prev != 'IDLE':
                event = _EVENT['DISARM']
        unit.prev_fsm = fsm
        if str(s['status']) == 'CRASHED' and not unit.shocked:
            unit.shocked = True
            event = _EVENT['SHOCK']
        if s['low1'] and not unit.low1:
            unit.low1 = True
            event = _EVENT['LOW_VOLTAGE1']
        if s['low2'] and not unit.low2:
            unit.low2 = True
            event = _EVENT['LOW_VOLTAGE2']
        if event:
            unit.last_event = event
            unit.event_seq += 1

    # ---- запросы
    def visible_units(self, domain=None):
        return [u for u in self.units.values() if u.visible(self.clock) and (domain is None or u.domain == domain)]

    def find(self, machine_id, domain=None):
        for unit in self.visible_units(domain):
            if unit.machine_id == machine_id:
                return unit
        return None

    def unit_of(self, drone):
        return self.units.get(drone)

_net = _Net()

class _Subscription:
    """Подписка клиента на потоки одного соседа: пока она есть, сосед публикует, у клиента копятся последние сэмплы."""
    def __init__(self, token, unit):
        self.token = token
        self.unit = unit
        now = _net.clock
        self.streams = {}
        for name, _type, period, kind in _STREAMS:
            self.streams[name] = {'kind': kind, 'period': period, 'due': now + max(SUBSCRIBE_DELAY, period or 0.0), 'got': False}
            unit.subscribers.setdefault(name, set()).add(token)
        _net.observe(unit)
        self.event_seq = unit.event_seq
        self.latest = {}

    def pump(self):
        unit = self.unit
        now = _net.clock
        s = unit.state
        for name, st in self.streams.items():
            if st['kind'] == 'event':
                if unit.event_seq > self.event_seq:
                    self.event_seq = unit.event_seq
                    self.latest[name] = _msg('std_msgs/msg/Int8')(data=unit.last_event)
                    st['got'] = True
                continue
            if now >= st['due'] and s is not None:
                self.latest[name] = _build(st['kind'], s)
                st['got'] = True
                st['due'] = now + st['period']

    def complete(self):
        return all(st['got'] for st in self.streams.values() if st['kind'] != 'event')

    def result(self):
        # Словарь в порядке каталога; сообщения - копии: программа может менять их, не портя накопленное.
        return dict((name, _copy.deepcopy(self.latest[name])) for name, _t, _p, _k in _STREAMS if name in self.latest)

    def cancel(self):
        for name in self.streams:
            tokens = self.unit.subscribers.get(name)
            if tokens is not None:
                tokens.discard(self.token)
                if not tokens:
                    del self.unit.subscribers[name]

async def _wait_telemetry(drone, sub, timeout_sec):
    # Ждёт, пока придёт по сэмплу каждого потока (или кончится таймаут), в симулируемом времени.
    deadline = None if timeout_sec is None else _net.clock + float(timeout_sec)
    while True:
        _net.sync()
        sub.pump()
        if sub.complete():
            break
        if deadline is not None and _net.clock >= deadline:
            break
        if not sub.unit.visible(_net.clock):
            break
        await _tick(drone)
    return sub

# ---------------------------------------------------------------- PioneerSwarmUnit
class PioneerSwarmUnit:
    def __init__(self, domain_id=0, machine_id=None, sync_wait_timeout_sec=None):
        drone = _bound_drone()
        if isinstance(domain_id, bool) or not isinstance(domain_id, int):
            raise TypeError('domain_id должен быть целым числом, получено ' + type(domain_id).__name__)
        if domain_id < 0 or domain_id > 232:
            raise ValueError('domain_id: допустимы значения от 0 до 232, получено ' + str(domain_id))
        if sync_wait_timeout_sec is not None and (isinstance(sync_wait_timeout_sec, bool) or not isinstance(sync_wait_timeout_sec, (int, float))):
            raise TypeError('sync_wait_timeout_sec должен быть числом или None')
        explicit = None
        if machine_id is not None:
            if not isinstance(machine_id, str):
                raise TypeError('machine_id должен быть строкой, получено ' + type(machine_id).__name__)
            if not machine_id.strip():
                raise RuntimeError('PioneerSwarmUnit: machine_id не определён (пустая строка), юнит не создан')
            if not _MACHINE_ID.match(machine_id):
                raise ValueError("machine_id '" + machine_id + "': допустимы латинские буквы, цифры и _, первым символом - не цифра")
            explicit = machine_id
        _net.sync()
        unit = _net.unit_of(drone)
        if unit is None or not unit.present:
            exists = getattr(_js, 'swarm_exists', None)
            if exists is None or bool(exists(drone)):
                raise RuntimeError('Для этого дрона выбран не pioneer_sdk2: Swarm Kit работает на Пионере Мини 2 и на Базовом с Radxa Zero 3W '
                                   '(язык «Python · SDK2» в панели «Рой»).')
            raise RuntimeError('PioneerSwarmUnit: не удалось определить machine_id (дрон ' + drone + ' не найден в симуляторе), юнит не создан')
        if explicit is not None:
            for other in _net.units.values():
                if other is not unit and other.machine_id == explicit and other.present:
                    raise RuntimeError("PioneerSwarmUnit: machine_id '" + explicit + "' уже занят юнитом другого дрона (" + other.name + ')')
            _net.explicit[drone] = explicit
        self._drone = drone
        self._unit = unit
        self._domain = domain_id
        self._explicit = explicit
        self._closed = False
        self._born = _net.clock
        self._type = None
        self._subs = {}
        self._id = unit.machine_id
        unit.domain_stack.append((self, domain_id))
        unit.instances.append(self)

    # ---- свойства
    @property
    def id(self):
        if not self._closed:
            self._id = self._unit.machine_id
        return self._id

    @property
    def unit_type(self):
        # Допущение: тип появляется после первого собственного Heartbeat (FIRST_BEAT_DELAY после создания объекта).
        if self._type is None and not self._closed:
            _net.sync()
            if _net.clock - self._born >= FIRST_BEAT_DELAY and self._unit.visible(_net.clock):
                self._type = self._unit.type
        return self._type

    def _check_open(self):
        if self._closed:
            raise RuntimeError('PioneerSwarmUnit закрыт: close() уже вызван, создайте объект заново')

    # ---- список соседей
    def get_unit_list(self):
        self._check_open()
        _net.sync()
        ids = [u.machine_id for u in _net.visible_units(self._unit.domain) if u is not self._unit]
        return sorted(ids, key=_natural)

    # ---- сообщения
    def send_message_to_unit(self, unit_id, message):
        self._check_open()
        if not isinstance(unit_id, str):
            raise TypeError('unit_id должен быть строкой, получено ' + type(unit_id).__name__)
        if not isinstance(message, str):
            raise TypeError('message должен быть строкой, получено ' + type(message).__name__)
        _net.sync()
        target = _net.find(unit_id, self._unit.domain)
        if target is None or target is self._unit:
            return False
        _post(target, self._unit.machine_id, message)
        return True

    def get_next_message(self):
        self._check_open()
        _net.sync()
        box = self._unit.mailbox
        return box.popleft() if box else None

    # ---- телеметрия
    async def get_telemetry_from_unit(self, unit_id, timeout_sec=60.0):
        self._check_open()
        if not isinstance(unit_id, str):
            raise TypeError('unit_id должен быть строкой, получено ' + type(unit_id).__name__)
        if timeout_sec is not None and (isinstance(timeout_sec, bool) or not isinstance(timeout_sec, (int, float))):
            raise TypeError('timeout_sec должен быть числом или None')
        if timeout_sec is not None and timeout_sec < 0:
            raise ValueError('timeout_sec не может быть отрицательным')
        _net.sync()
        unit = _net.find(unit_id, self._unit.domain)
        if unit is None or unit is self._unit:
            return None
        sub = self._subs.get(unit.drone)
        if sub is None:
            sub = self._subs[unit.drone] = _Subscription(self, unit)
        await _wait_telemetry(self._drone, sub, timeout_sec)
        if self._closed or not unit.visible(_net.clock):
            return None
        return (unit.type, sub.result())

    # ---- закрытие
    def _detach_unit(self, unit):
        sub = self._subs.pop(unit.drone, None)
        if sub is not None:
            sub.cancel()

    def close(self):
        if self._closed:
            return None
        self._closed = True
        self._id = self._unit.machine_id
        for sub in list(self._subs.values()):
            sub.cancel()
        self._subs = {}
        unit = self._unit
        unit.domain_stack = [item for item in unit.domain_stack if item[0] is not self]
        if self in unit.instances:
            unit.instances.remove(self)
        if self._explicit is not None and _net.explicit.get(unit.drone) == self._explicit:
            others = [i._explicit for i in unit.instances if i._explicit is not None]
            if others:
                _net.explicit[unit.drone] = others[-1]
            else:
                _net.explicit.pop(unit.drone, None)
        if not unit.instances:
            unit.mailbox.clear()
        return None

def _post(target, sender, text):
    target.mailbox.append((sender, text))
    while len(target.mailbox) > MAILBOX_LIMIT:
        target.mailbox.popleft()

def _sim_cleanup(drone=None):
    # Вызывает раннер, когда программа закончилась: её объекты закрываются, swarm-server дрона остаётся в сети.
    for unit in list(_net.units.values()):
        for instance in list(unit.instances):
            if drone is None or instance._drone == drone:
                instance.close()

# ---------------------------------------------------------------- реестр для консоли и тестов (_swarm_registry)
def _row(unit):
    return {
        'machine_id': unit.machine_id, 'drone': unit.drone, 'name': unit.name, 'model': unit.model, 'type': unit.type.value,
        'domain': unit.domain, 'visible': unit.visible(_net.clock), 'online': unit.online, 'present': unit.present,
        'age': round(_net.clock - unit.last_seen, 3), 'mailbox': len(unit.mailbox), 'instances': len(unit.instances),
        'subscribers': dict((name, len(tokens)) for name, tokens in unit.subscribers.items()),
    }

def _unit_by_id(machine_id, visible=True):
    for unit in _net.units.values():
        if unit.machine_id == machine_id and (not visible or unit.visible(_net.clock)):
            return unit
    raise LookupError("Юнит '" + str(machine_id) + "' не найден в сети роя")

def _h_units(args):
    return sorted((_row(u) for u in _net.units.values()), key=lambda r: _natural(r['machine_id']))

def _h_unit_info(args):
    unit = _unit_by_id(args['machine_id'], False)
    row = _row(unit)
    row['catalog'] = [{'name': n, 'type': t, 'period': p, 'subscribers': row['subscribers'].get(n, 0)} for n, t, p, _k in _STREAMS]
    row['heartbeat'] = {'type': unit.type.value, 'period': HEARTBEAT_PERIOD, 'streams': [n for n, _t, _p, _k in _STREAMS]}
    return row

def _h_mailbox(args):
    return [list(item) for item in _unit_by_id(args['machine_id']).mailbox]

def _h_send(args):
    sender = str(args.get('sender') or 'console')
    target = _unit_by_id(args['to'])
    _post(target, sender, str(args['text']))
    return True

async def _h_telemetry(args):
    unit = _unit_by_id(args['machine_id'])
    drone = args['drone']
    sub = _Subscription(object(), unit)
    try:
        await _wait_telemetry(drone, sub, args.get('timeout_sec', 5))
        return {'type': unit.type.value, 'streams': dict((k, repr(v)) for k, v in sub.result().items())}
    finally:
        sub.cancel()

def _h_set_online(args):
    unit = _unit_by_id(args['machine_id'], False)
    unit.online = bool(args['online'])
    if unit.online:
        unit.last_seen = _net.clock
    return _row(unit)

def _h_set_domain(args):
    unit = _unit_by_id(args['machine_id'], False)
    unit.configured_domain = int(args['domain'])
    return _row(unit)

def _h_reset(args):
    _sim_cleanup()
    _net.reset()
    return True

def _h_clock(args):
    return _net.clock

_HANDLERS = {'units': _h_units, 'unit_info': _h_unit_info, 'mailbox': _h_mailbox, 'send': _h_send, 'telemetry': _h_telemetry,
             'set_online': _h_set_online, 'set_domain': _h_set_domain, 'reset': _h_reset, 'clock': _h_clock}

async def _dispatch(fn, args_json=None):
    try:
        handler = _HANDLERS.get(fn)
        if handler is None:
            raise LookupError('Неизвестная функция реестра роя: ' + str(fn))
        args = _json.loads(args_json) if args_json else {}
        if fn != 'reset':
            _net.sync()
        result = handler(args)
        if hasattr(result, '__await__'):
            result = await result
        return _json.dumps({'ok': True, 'result': result}, ensure_ascii=False)
    except _Cancelled:
        raise
    except Exception as exc:
        return _json.dumps({'ok': False, 'error': str(exc.args[0]) if isinstance(exc, LookupError) and exc.args else str(exc)}, ensure_ascii=False)

# ---------------------------------------------------------------- модули для import
_mod = _types.ModuleType('pioneer_swarm')
for _name, _value in {'PioneerSwarmUnit': PioneerSwarmUnit, 'SwarmUnitType': SwarmUnitType, '_sim_cleanup': _sim_cleanup}.items():
    setattr(_mod, _name, _value)
_sys.modules['pioneer_swarm'] = _mod
_registry = _types.ModuleType('_swarm_registry')
_registry.dispatch = _dispatch
_sys.modules['_swarm_registry'] = _registry
`;

/** Корневые модули, при первом импорте которых подгружается эмуляция Swarm Kit. */
export const SWARM_ROOT_MODULES = ['pioneer_swarm', '_swarm_registry'] as const;

/**
 * Загрузчик по требованию (как у ROS 2, ros2/prelude.ts): текст выполняется при первом `import pioneer_swarm`,
 * программы без Swarm Kit ничего не платят.
 */
export const SWARM_BOOTSTRAP = `
import importlib.abc as _iabc, importlib.util as _iutil, sys as _sys

class _SwarmLoader(_iabc.Loader):
    def create_module(self, spec):
        return _sys.modules[spec.name]

    def exec_module(self, module):
        return None

class _SwarmFinder(_iabc.MetaPathFinder):
    roots = ${JSON.stringify(SWARM_ROOT_MODULES)}
    loading = False

    def find_spec(self, name, path=None, target=None):
        if name.split('.')[0] not in self.roots or self.loading:
            return None
        if name not in _sys.modules:
            self.loading = True
            try:
                exec(compile(globals()['__swarm_src'], 'swarm_prelude', 'exec'), {'__name__': '_swarm_prelude'})
            finally:
                self.loading = False
        if name in _sys.modules:
            return _iutil.spec_from_loader(name, _SwarmLoader())
        return None

if not any(type(finder).__name__ == '_SwarmFinder' for finder in _sys.meta_path):
    _sys.meta_path.insert(0, _SwarmFinder())
`;

/** Ставит загрузчик в Pyodide. */
export function installSwarmModule(pyodide: { globals: { set(name: string, value: unknown): void }; runPython(code: string): unknown }): void {
    pyodide.globals.set('__swarm_src', SWARM_PRELUDE);
    pyodide.runPython(SWARM_BOOTSTRAP);
}
