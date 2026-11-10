/* eslint-disable max-lines -- текст Python одним куском: он выполняется как модуль целиком */
/*
 * Python-часть эмуляции ROS 2, вторая половина: ros_pioneer_node из пакета gs_core (публикации, сервисы,
 * подписки по справочнику docs/ros2/gs_core.md), gs_core.launch и реестр для консоли `ros2` (модуль
 * _ros2_registry, вызывается из TS через registry.ts).
 *
 * Допущения там, где справочник молчит, собраны в docs/ros2/emulation-notes.md и помечены здесь словом «допущение».
 * В тексте нет обратных кавычек, `${` и обратных слэшей: он лежит в шаблонной строке.
 */
export const ROS2_PRELUDE_NODE = `
# ---------------------------------------------------------------- ros_pioneer_node
_FLYING = ('FLYING_HOVER', 'FLYING_MOVING')
# События автопилота и состояние полёта: допущение - те же коды, что у pioneer_sdk2 (Event, FlyState).
_EV = {'DISARM': 1, 'COPTER_LANDED': 2, 'LOW_VOLTAGE1': 3, 'LOW_VOLTAGE2': 4, 'POINT_REACHED': 5, 'POINT_DECELERATION': 6,
       'TAKEOFF_COMPLETE': 7, 'ENGINES_STARTED': 8, 'SHOCK': 9, 'LOW_CHARGE': 10}
# Параметры автопилота для board/get_param и set_param: те же, что знает pioneer_sdk2 в симуляторе.
_BOARD_PARAMS = {
    'Flight_com_navSystem': 1.0, 'Copter_com_takeoffAlt': 0.4, 'Copter_man_rcMode0': 0.0, 'Copter_man_rcMode1': 0.0,
    'Copter_man_rcMode2': 0.0, 'Copter_flyWithoutRc': 0.0, 'SensorMux_rc': 0.0,
}
_NAV_NAMES = {0: 'GPS', 1: 'LPS', 2: 'OPT'}
_SN = '/geoscan/'
# (параметр-флаг, топик, тип, частота в симулируемых Гц): частоты - допущение (справочник их не называет).
_PERIODIC = [
    ('topics.imu', 'sensors/imu', 'sensor_msgs/msg/Imu', 30.0, 'imu'),
    ('topics.altitude', 'sensors/altitude', 'std_msgs/msg/Float32', 10.0, 'altitude'),
    ('topics.range', 'sensors/range', 'sensor_msgs/msg/Range', 10.0, 'range'),
    ('topics.motors_rpm', 'sensors/motors_rpm', 'gs_interfaces/msg/MotorsRpm', 10.0, 'motors'),
    ('topics.battery', 'sensors/battery_state', 'sensor_msgs/msg/BatteryState', 2.0, 'battery'),
    ('topics.fly_state', 'flight/fly_state', 'std_msgs/msg/Int8', 10.0, 'fly_state'),
    ('topics.optical_flow', 'navigation/opt/velocity', 'gs_interfaces/msg/OptVelocity', 10.0, 'opt'),
    ('topics.ranger', 'payload/ranger', 'gs_interfaces/msg/RangerData', 10.0, 'ranger'),
    ('topics.lps', 'navigation/local/position', 'geometry_msgs/msg/Point', 20.0, 'lps_pos'),
    ('topics.lps', 'navigation/local/velocity', 'geometry_msgs/msg/Vector3', 20.0, 'lps_vel'),
    ('topics.lps', 'navigation/local/yaw', 'std_msgs/msg/Float32', 20.0, 'lps_yaw'),
    ('topics.lps', 'navigation/local/status', 'gs_interfaces/msg/NavStatus', 20.0, 'lps_status'),
    ('topics.gnss', 'navigation/global/position', 'gs_interfaces/msg/PointGPS', 5.0, 'gnss'),
    ('topics.gnss', 'navigation/global/velocity', 'geometry_msgs/msg/Vector3', 5.0, 'gnss'),
    ('topics.gnss', 'navigation/global/status', 'gs_interfaces/msg/NavStatus', 5.0, 'gnss'),
    ('topics.gnss', 'navigation/satellites', 'gs_interfaces/msg/SatellitesGPS', 1.0, 'gnss'),
]

def _f(v):
    return float(v)

def _stamp(t):
    ns = int(round((_EPOCH + t) * 1e9))
    return _Time_msg(sec=ns // 1000000000, nanosec=ns % 1000000000)

def _coerce_param(default, value, name):
    if isinstance(default, bool):
        if isinstance(value, str) and value.lower() in ('true', 'false'):
            return value.lower() == 'true'
        if isinstance(value, bool):
            return value
        raise ValueError("Параметр %s: ожидается true или false" % name)
    if isinstance(default, int):
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            raise ValueError("Параметр %s: ожидается целое число" % name)
        return int(value)
    if isinstance(default, float):
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            raise ValueError("Параметр %s: ожидается число" % name)
        return float(value)
    return str(value)

class _PioneerNode(Node):
    def __init__(self, drone, config, overrides=None):
        Node.__init__(self, 'ros_pioneer_node', _drone=drone, _internal=True)
        self.config_name = config
        table = dict(_SPEC['configs'][config])
        for key, value in (overrides or {}).items():
            if key not in table:
                raise ValueError("Неизвестный параметр ros_pioneer_node: %s" % key)
            default = table[key]
            if key.startswith('range_sensor.') and key != 'range_sensor.radiation_type':
                default = float(default)
            table[key] = _coerce_param(default, value, key)
        self.declare_parameter('use_sim_time', False)
        for key, value in table.items():
            # JSON не различает 4 и 4.0: вещественные параметры датчика приводятся к float.
            if key.startswith('range_sensor.') and key != 'range_sensor.radiation_type':
                value = float(value)
            self.declare_parameter(key, value, ignore_override=True)
        self.board = dict(_BOARD_PARAMS)
        self._dead = False
        self._task = None
        self._fly_state = 0
        self._prev_fsm = None
        self._last_yaw = 0.0
        self._target_active = False
        self._decel_sent = False
        self._low1 = self._low2 = self._shocked = False
        self._rc_last = None
        self._periodic = []
        self._event_pub = None
        self._rc_sub = self._vel_sub = None
        self._create_interfaces()

    def _p(self, name):
        return self._params[name].value

    # ---- интерфейсы
    def _create_interfaces(self):
        now = _sim_time(self._drone)
        for flag, topic, tkey, hz, kind in _PERIODIC:
            if self._p(flag):
                pub = self.create_publisher(_MSG_CLASSES[tkey], _SN + topic, 10)
                self._periodic.append([kind, pub, 1.0 / hz, now, topic])
        if self._p('topics.callback_event'):
            self._event_pub = self.create_publisher(_MSG_CLASSES['std_msgs/msg/Int8'], _SN + 'flight/callback_event', 10)
        if self._p('topics.rc'):
            self._rc_pub = self.create_publisher(_MSG_CLASSES['std_msgs/msg/Int32'], _SN + 'rc/trigger', 10)
            self._rc_sub = self.create_subscription(_MSG_CLASSES['gs_interfaces/msg/RcChannels'], _SN + 'rc/set_channels', self._on_rc, 10)
        if self._p('topics.cmd_vel'):
            self._vel_sub = self.create_subscription(_MSG_CLASSES['geometry_msgs/msg/TwistStamped'], _SN + 'flight/cmd_vel', self._on_cmd_vel, 10)
        services = [
            ('flight/arm', 'gs_interfaces/srv/Arm', self._h_arm), ('flight/takeoff', 'std_srvs/srv/Trigger', self._h_takeoff),
            ('flight/land', 'std_srvs/srv/Trigger', self._h_land), ('flight/disarm', 'std_srvs/srv/Trigger', self._h_disarm),
            ('flight/rtl', 'std_srvs/srv/Trigger', self._h_rtl), ('flight/go_to_local_point', 'gs_interfaces/srv/GoToLocalPoint', self._h_go_local),
            ('flight/go_to_global_point', 'gs_interfaces/srv/GoToGlobalPoint', self._h_go_global), ('flight/set_yaw', 'gs_interfaces/srv/Yaw', self._h_yaw),
            ('alive', 'gs_interfaces/srv/Live', self._h_alive), ('board/restart', 'std_srvs/srv/Empty', self._h_restart),
            ('board/get_param', 'gs_interfaces/srv/GetParam', self._h_get_param), ('board/set_param', 'gs_interfaces/srv/SetParam', self._h_set_param),
            ('board/get_parameters', 'gs_interfaces/srv/ParametersList', self._h_get_parameters),
            ('board/set_parameters', 'gs_interfaces/srv/SetParametersList', self._h_set_parameters),
            ('navigation/get_system', 'gs_interfaces/srv/NavigationSystem', self._h_get_system),
            ('navigation/set_system', 'gs_interfaces/srv/SetNavigationSystem', self._h_set_system),
            ('payload/grab', 'gs_interfaces/srv/Grab', self._h_grab), ('payload/cargo_set', 'std_srvs/srv/SetBool', self._h_cargo),
            ('payload/led/set', 'gs_interfaces/srv/Led', self._h_led),
        ]
        for name, key, handler in services:
            self.create_service(_SRV_CLASSES[key], _SN + name, None, _handler=handler)

    def set_node_parameter_rule(self, name):
        return name.startswith('topics.') or name in ('shortname', 'board_reboot', 'board_name', 'gtlp_version')

    def _set_one(self, param):
        # topics.* и параметры борта читаются при запуске узла; остальные (grab, cargo, range_sensor.*,
        # nav_system_change_in_flight) действуют сразу. Допущение: справочник про смену в работе молчит.
        if self.set_node_parameter_rule(param.name):
            return _SetParametersResult(successful=False, reason="Параметр %s читается при запуске ros_pioneer_node: перезапустите узел (ros2 run gs_core ros_pioneer_node --ros-args -p %s:=...)" % (param.name, param.name))
        return Node._set_one(self, param)

    def stop(self):
        self._dead = True
        self.destroy_node()
        if self._graph.launch is self:
            self._graph.launch = None

    # ---- цикл узла
    async def run(self):
        drone = self._drone
        try:
            while not self._dead:
                s = _state(drone)
                if s is None or not bool(getattr(_js, 'pioneer2_sdk_enabled', lambda d: True)(drone)):
                    break
                self._events(s)
                self._inputs()
                self._publish(s)
                await _asyncio.sleep(0.01)
        finally:
            self._dead = True
            self.destroy_node()
            if self._graph.launch is self:
                self._graph.launch = None

    def _fire(self, name):
        code = _EV[name]
        if name == 'ENGINES_STARTED':
            self._fly_state = 1
        elif name == 'TAKEOFF_COMPLETE':
            self._fly_state = 2
        elif name in ('DISARM', 'COPTER_LANDED', 'SHOCK'):
            self._fly_state = 0
        if self._event_pub is not None:
            self._event_pub.publish(_MSG_CLASSES['std_msgs/msg/Int8'](data=code))

    def _events(self, s):
        fsm = str(s['fsm'])
        prev = self._prev_fsm
        if prev is not None:
            if prev == 'IDLE' and fsm == 'PREFLIGHT':
                self._fire('ENGINES_STARTED')
            if prev == 'TAKEOFF_PROCESS' and fsm in _FLYING:
                self._fire('TAKEOFF_COMPLETE')
            if prev == 'LANDING_PROCESS' and fsm == 'IDLE':
                self._fire('COPTER_LANDED')
            elif prev not in ('IDLE', 'LANDING_PROCESS') and fsm == 'IDLE' and self._fly_state != 0:
                self._fire('DISARM')
        elif fsm in _FLYING:
            self._fly_state = 2
        elif fsm == 'PREFLIGHT':
            self._fly_state = 1
        self._prev_fsm = fsm
        if str(s['status']) == 'CRASHED' and not self._shocked:
            self._shocked = True
            self._fire('SHOCK')
        if self._target_active and not self._decel_sent and float(s['distance']) < 0.5:
            self._decel_sent = True
            self._fire('POINT_DECELERATION')
        if _js.ros2_reached(self._drone):
            self._target_active = False
            self._fire('POINT_REACHED')
        if s['low1'] and not self._low1:
            self._low1 = True
            self._fire('LOW_VOLTAGE1')
        if s['low2'] and not self._low2:
            self._low2 = True
            self._fire('LOW_VOLTAGE2')

    def _inputs(self):
        for sub in list(self._subs):
            while sub._queue:
                sub.callback(sub._queue.popleft())

    def _header(self, t):
        h = _Header_msg()
        h.stamp = _stamp(t)
        h.frame_id = 'base_link'
        return h

    def _publish(self, s):
        t = float(s['time'])
        for entry in self._periodic:
            kind, pub, period, due, topic = entry
            if due - t > period * 2:
                due = t  # время симуляции пошло назад (кнопка «Сначала»): график публикаций начинается заново
            if t < due:
                entry[3] = due
                continue
            while due <= t:
                due += period
            entry[3] = due
            if pub.get_subscription_count() == 0:
                continue
            msg = self._build(kind, topic, s, t)
            if msg is not None:
                pub.publish(msg)
        if self._p('topics.rc'):
            rc = int(s['rc8'])
            if rc != self._rc_last:
                self._rc_last = rc
                self._rc_pub.publish(_MSG_CLASSES['std_msgs/msg/Int32'](data=rc))

    def _build(self, kind, topic, s, t):
        M = _MSG_CLASSES
        if kind == 'imu':
            m = M['sensor_msgs/msg/Imu']()
            roll, pitch, yaw = [_f(v) for v in s['rpy']]
            cr, sr = _math.cos(roll / 2), _math.sin(roll / 2)
            cp, sp = _math.cos(pitch / 2), _math.sin(pitch / 2)
            cy, sy = _math.cos(yaw / 2), _math.sin(yaw / 2)
            m.orientation = M['geometry_msgs/msg/Quaternion'](x=sr * cp * cy - cr * sp * sy, y=cr * sp * cy + sr * cp * sy,
                                                              z=cr * cp * sy - sr * sp * cy, w=cr * cp * cy + sr * sp * sy)
            g, a = s['gyro'], s['accel']
            m.angular_velocity = M['geometry_msgs/msg/Vector3'](x=_f(g[0]), y=_f(g[1]), z=_f(g[2]))
            m.linear_acceleration = M['geometry_msgs/msg/Vector3'](x=_f(a[0]), y=_f(a[1]), z=_f(a[2]))
            return m
        if kind == 'altitude':
            return M['std_msgs/msg/Float32'](data=_f(s['pos'][2]))
        if kind == 'range':
            m = M['sensor_msgs/msg/Range']()
            m.radiation_type = 0 if str(self._p('range_sensor.radiation_type')).upper() == 'ULTRASOUND' else 1
            lo, hi = _f(self._p('range_sensor.min_range')), _f(self._p('range_sensor.max_range'))
            m.field_of_view = _f(self._p('range_sensor.field_of_view'))
            m.min_range, m.max_range = lo, hi
            d = _f(s['dist'])
            # Допущение: вне диапазона - -inf / +inf (REP 117).
            m.range = float('-inf') if d < lo else (float('inf') if d > hi else d)
            return m
        if kind == 'motors':
            m = M['gs_interfaces/msg/MotorsRpm']()
            m.header = self._header(t)
            fsm = str(s['fsm'])
            rpm = 0.0 if fsm == 'IDLE' else (9000.0 if fsm == 'PREFLIGHT' else 21000.0)
            m.rpm = [rpm, rpm, rpm, rpm]
            return m
        if kind == 'battery':
            m = M['sensor_msgs/msg/BatteryState']()
            m.voltage = _f(s['battery'])
            m.temperature = 30.0
            for name in ('current', 'charge', 'capacity', 'design_capacity', 'percentage'):
                setattr(m, name, float('nan'))
            m.present = True
            return m
        if kind == 'fly_state':
            return M['std_msgs/msg/Int8'](data=self._fly_state)
        if kind == 'opt':
            m = M['gs_interfaces/msg/OptVelocity']()
            m.header = self._header(t)
            m.x, m.y = _f(s['flow'][0]), _f(s['flow'][1])
            return m
        if kind == 'ranger':
            if not s['ranger_hw']:
                return None
            m = M['gs_interfaces/msg/RangerData']()
            m.header = self._header(t)
            r = s['ranger']
            m.right, m.left, m.front, m.back, m.above_below = [_f(v) for v in r[:5]]
            return m
        if kind == 'lps_pos':
            p = s['pos']
            return M['geometry_msgs/msg/Point'](x=_f(p[0]), y=_f(p[1]), z=_f(p[2]))
        if kind == 'lps_vel':
            v = s['vel']
            return M['geometry_msgs/msg/Vector3'](x=_f(v[0]), y=_f(v[1]), z=_f(v[2]))
        if kind == 'lps_yaw':
            return M['std_msgs/msg/Float32'](data=_f(s['rpy'][2]))
        if kind == 'lps_status':
            return M['gs_interfaces/msg/NavStatus'](status=3)
        return None  # gnss: модуля в симуляторе нет - топики созданы, данных нет

    # ---- подписки
    def _on_rc(self, msg):
        _js.ros2_rc(self._drone, msg.channel_1, msg.channel_2, msg.channel_3, msg.channel_4,
                    msg.channel_5, msg.channel_6, msg.channel_7, msg.channel_8)

    def _on_cmd_vel(self, msg):
        log = self.get_logger()
        frame = msg.header.frame_id
        if frame not in ('base_link', 'map'):
            log.warn("cmd_vel: header.frame_id должен быть base_link или map, получено '%s': команда проигнорирована" % frame, throttle_duration_sec=5.0)
            return
        lin, wz = msg.twist.linear, _f(msg.twist.angular.z)
        if abs(wz) > 1.82:
            log.warn('cmd_vel: angular.z ограничен до +-1.82 рад/с', throttle_duration_sec=5.0)
            wz = 1.82 if wz > 0 else -1.82
        if frame == 'map':
            ok = _js.ros2_speed(self._drone, lin.x, lin.y, lin.z, wz, 0.5, False)
        else:
            # Допущение: base_link как в REP 103 - x вперёд, y влево, z вверх.
            ok = _js.ros2_speed(self._drone, -lin.y, lin.x, lin.z, wz, 0.5, True)
        if not ok:
            log.warn('cmd_vel: команда проигнорирована, коптер не в воздухе', throttle_duration_sec=5.0)

    # ---- сервисы: полёт
    def _deny(self, res, text, field='success'):
        self.get_logger().error(text)
        setattr(res, field, False)
        if hasattr(res, 'message'):
            res.message = text
        return res

    def _flying(self):
        s = _state(self._drone)
        return s is not None and str(s['fsm']) in _FLYING, s

    async def _h_arm(self, req, res):
        timeout, retries = max(0.0, _f(req.timeout)), max(0, int(req.retries))
        for attempt in range(retries + 1):
            if bool(_js.ros2_arm(self._drone)):
                res.success = True
                return res
            self.get_logger().warn('ARM не подтверждён (попытка %d)' % (attempt + 1))
            await _sim_sleep(self._drone, timeout)
        return self._deny(res, 'ARM не удался. Проверьте, что моторы ещё не запущены и навигация готова; увеличьте timeout или retries')

    async def _h_takeoff(self, req, res):
        if bool(_js.ros2_takeoff(self._drone)):
            res.success = True
            return res
        return self._deny(res, 'Взлёт отклонён: сначала запустите моторы (flight/arm)')

    async def _h_land(self, req, res):
        if bool(_js.ros2_land(self._drone)):
            res.success = True
            return res
        return self._deny(res, 'Посадка отклонена: коптер не в воздухе')

    async def _h_disarm(self, req, res):
        _js.ros2_disarm(self._drone)
        res.success = True
        return res

    async def _h_rtl(self, req, res):
        if bool(_js.ros2_rtl(self._drone)):
            res.success = True
            return res
        return self._deny(res, 'Возврат домой отклонён: коптер не в воздухе')

    def _yaw_rule(self, yaw):
        # Угол, равный прошлому заданному (go_to_* или set_yaw), рыскание не меняет. Допущение: до первой
        # команды прошлым заданным считается 0.
        yaw = _f(yaw)
        if yaw == self._last_yaw:
            return None, yaw
        return _math.radians(yaw), yaw

    async def _h_go_local(self, req, res):
        frame = req.frame_id
        if frame not in ('base_link', 'map'):
            return self._deny(res, "go_to_local_point: frame_id должен быть 'base_link' или 'map', получено '%s'" % frame)
        flying, s = self._flying()
        if not flying:
            return self._deny(res, 'go_to_local_point отклонён: коптер ещё не в воздухе (arm и takeoff)')
        x, y, z = _f(req.x), _f(req.y), _f(req.z)
        if frame == 'base_link':
            # Допущение: оси коптера по REP 103 (x вперёд, y влево, z вверх).
            yaw = _f(s['rpy'][2])
            right, forward = -y, x
            wx = right * _math.cos(yaw) - forward * _math.sin(yaw)
            wy = right * _math.sin(yaw) + forward * _math.cos(yaw)
            x, y, z = _f(s['pos'][0]) + wx, _f(s['pos'][1]) + wy, _f(s['pos'][2]) + z
        yaw_rad, yaw_deg = self._yaw_rule(req.yaw)
        if bool(_js.ros2_go_to(self._drone, x, y, z, yaw_rad, _f(req.time))):
            self._last_yaw = yaw_deg
            self._target_active = True
            self._decel_sent = False
            res.success = True
            return res
        return self._deny(res, 'go_to_local_point отклонён автопилотом')

    async def _h_go_global(self, req, res):
        if req.frame_id not in ('base_link', 'map'):
            return self._deny(res, "go_to_global_point: frame_id должен быть 'base_link' или 'map'")
        if int(self.board['Flight_com_navSystem']) != 0:
            return self._deny(res, 'Команда может быть выполнена только когда установлена система навигации GPS')
        return self._deny(res, 'Модуль навигации GNSS в симуляторе отсутствует: полёт по глобальным координатам невозможен')

    async def _h_yaw(self, req, res):
        flying, s = self._flying()
        if not flying:
            return self._deny(res, 'set_yaw отклонён: коптер ещё не в воздухе')
        p = s['pos']
        if bool(_js.ros2_go_to(self._drone, _f(p[0]), _f(p[1]), _f(p[2]), _math.radians(_f(req.angle)), 0.0)):
            self._last_yaw = _f(req.angle)
            res.success = True
            return res
        return self._deny(res, 'set_yaw отклонён автопилотом')

    # ---- сервисы: борт и параметры
    async def _h_alive(self, req, res):
        res.status = _state(self._drone) is not None
        return res

    async def _h_restart(self, req, res):
        s = _state(self._drone)
        if s is not None and str(s['fsm']) not in ('IDLE', 'PREFLIGHT'):
            # Допущение: перезагрузка автопилота в воздухе в симуляторе запрещена.
            self.get_logger().error('board/restart: перезагрузка автопилота в полёте запрещена')
            return res
        self.board = dict(_BOARD_PARAMS)
        self.get_logger().info('Автопилот перезагружен: параметры возвращены к значениям по умолчанию')
        return res

    async def _h_get_param(self, req, res):
        if req.update:
            self.get_logger().info('Словарь параметров автопилота перечитан')
        if req.name in self.board:
            res.value = _f(self.board[req.name])
            res.status = True
            return res
        return self._deny(res, 'Параметр автопилота не найден: %s' % req.name, 'status')

    def _board_set(self, name, value):
        if name == 'Flight_com_navSystem':
            self.get_logger().error('Систему навигации меняйте сервисом navigation/set_system, а не set_param')
            return False
        if name not in self.board:
            self.get_logger().error('Параметр автопилота не найден: %s' % name)
            return False
        self.board[name] = _f(value)
        return True

    async def _h_set_param(self, req, res):
        res.status = self._board_set(req.name, req.value)
        return res

    async def _h_get_parameters(self, req, res):
        P = _MSG_CLASSES['gs_interfaces/msg/Parameter']
        res.params = [P(name=n, value=_f(v)) for n, v in self.board.items()]
        res.status = True
        return res

    async def _h_set_parameters(self, req, res):
        for item in req.params:
            if item.name == 'Flight_com_navSystem' or item.name not in self.board:
                self.get_logger().error('set_parameters: параметр %s нельзя записать, ни один параметр не изменён' % item.name)
                res.status = False
                return res
        for item in req.params:
            self._board_set(item.name, item.value)
        res.status = True
        return res

    async def _h_get_system(self, req, res):
        res.navigation = _NAV_NAMES[int(self.board['Flight_com_navSystem'])]
        res.status = True
        return res

    async def _h_set_system(self, req, res):
        s = _state(self._drone)
        if s is not None and str(s['fsm']) not in ('IDLE', 'PREFLIGHT') and not self._p('nav_system_change_in_flight'):
            return self._deny(res, 'navigation/set_system: смена системы навигации в полёте отклонена (nav_system_change_in_flight: false)', 'status')
        names = {v: k for k, v in _NAV_NAMES.items()}
        if req.navigation not in names:
            return self._deny(res, "navigation/set_system: допустимы GPS, LPS, OPT, получено '%s'" % req.navigation, 'status')
        # В симуляторе навигация физически всегда LPS: меняется значение параметра, полёт - нет.
        self.board['Flight_com_navSystem'] = float(names[req.navigation])
        res.status = True
        return res

    # ---- полезная нагрузка
    async def _h_grab(self, req, res):
        if not self._p('grab'):
            return self._deny(res, 'Модуль механического захвата не поддерживается (параметр grab: false)')
        action = int(req.action)
        if action == 2:
            res.success = True
            return res
        if action not in (0, 1):
            return self._deny(res, 'payload/grab: action - 0 открыть, 1 закрыть, 2 остановить')
        if int(req.velocity) < 0 or int(req.velocity) > 100:
            return self._deny(res, 'payload/grab: velocity должна быть в диапазоне 0..100')
        ok = bool(_js.ros2_grab(self._drone, action == 1))
        if ok and _f(req.movement_time) > 0:
            await _sim_sleep(self._drone, _f(req.movement_time))
        if not ok:
            return self._deny(res, 'Захват на этом борту отсутствует')
        res.success = True
        return res

    async def _h_cargo(self, req, res):
        if not self._p('cargo'):
            return self._deny(res, 'Модуль магнитного захвата груза не поддерживается (параметр cargo: false)')
        if not bool(_js.ros2_cargo(self._drone, bool(req.data))):
            return self._deny(res, 'Магнитного захвата груза на этом борту нет')
        res.success = True
        return res

    async def _h_led(self, req, res):
        def level(c):
            return max(0.0, min(1.0, c)) * 255.0
        mode = int(req.mode)
        if mode == 0:
            if not req.leds:
                return self._deny(res, 'payload/led/set: для режима PIXEL нужен непустой leds')
            ok = True
            for index, c in enumerate(req.leds):
                if not _js.ros2_led(self._drone, index, level(c.r), level(c.g), level(c.b)):
                    self.get_logger().warn('payload/led/set: светодиода с номером %d нет' % index)
                    ok = False
            res.success = ok
            return res
        if mode == 1:
            if not req.leds:
                return self._deny(res, 'payload/led/set: для режима FILL нужен цвет в leds[0]')
            c = req.leds[0]
            res.success = bool(_js.ros2_led(self._drone, 255, level(c.r), level(c.g), level(c.b)))
            return res
        return self._deny(res, 'payload/led/set: режимы BLINK и CHASE не реализованы')

def _ensure_launch(drone, config=None, parameters=None, restart=False):
    g = _graph(drone)
    if g.launch is not None and not g.launch._dead and not restart:
        return g.launch
    if g.launch is not None:
        g.launch.stop()
    s = _state(drone)
    if s is None:
        raise RuntimeError('Дрона нет в симуляторе')
    name = config or ('mini2' if str(s['model']) == 'pioneer-mini2' else 'razero')
    if name not in _SPEC['configs']:
        raise ValueError("Неизвестный конфиг '%s': mini2 или razero" % name)
    node = _PioneerNode(drone, name, parameters)
    g.launch = node
    node._task = _asyncio.ensure_future(node.run())
    return node

# ---------------------------------------------------------------- gs_core.launch
def restart_pioneer_node(parameters=None, config=None):
    # Как перезапуск ros_pioneer_node с другим YAML или -p topics.gnss:=true. Узлы ученика остаются.
    node = _ensure_launch(_drone_id(), config, parameters, True)
    return node.config_name

def pioneer_node_config():
    node = _graph(_drone_id()).launch
    return None if node is None else node.config_name

_gs_core = _module('gs_core')
_gs_launch = _module('gs_core.launch', False)
_gs_launch.restart_pioneer_node = restart_pioneer_node
_gs_launch.pioneer_node_config = pioneer_node_config
_gs_core.launch = _gs_launch

# ---------------------------------------------------------------- реестр для консоли ros2
def _jsonable(v):
    if isinstance(v, float):
        if _math.isnan(v):
            return 'nan'
        if _math.isinf(v):
            return 'inf' if v > 0 else '-inf'
        return v
    if isinstance(v, dict):
        return {k: _jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_jsonable(x) for x in v]
    if isinstance(v, _enum.Enum):
        return v.name
    return v

def _visible_nodes(g):
    return [n for n in g.nodes if not n._name.startswith('_')]

def _topic_types(g, topic):
    types = []
    for table in (g.pubs, g.subs):
        for item in table.get(topic, ()):
            key = _type_key(item.msg_type)
            if key not in types:
                types.append(key)
    return types

def _need_launch(g):
    if g.launch is None or g.launch._dead:
        raise RuntimeError('ros_pioneer_node не запущен: запустите его (ros2 launch gs_core ...)')

def _r_launch(drone, config=None, parameters=None, restart=True):
    node = _ensure_launch(drone, config, parameters, restart)
    return {'config': node.config_name, 'parameters': {k: v.value for k, v in node._params.items()}}

def _r_launch_status(drone):
    g = _graph(drone)
    node = g.launch
    return {'running': node is not None and not node._dead, 'config': None if node is None else node.config_name}

def _r_stop(drone):
    g = _graph(drone)
    if g.launch is not None:
        g.launch.stop()
    return True

def _r_node_list(drone):
    return sorted(n.get_fully_qualified_name() for n in _visible_nodes(_graph(drone)))

def _r_node_info(drone, node):
    g = _graph(drone)
    for n in _visible_nodes(g):
        if n.get_fully_qualified_name() == node:
            return {
                'name': node,
                'publishers': [{'topic': p.topic, 'type': _type_key(p.msg_type)} for p in n._pubs],
                'subscribers': [{'topic': s.topic, 'type': _type_key(s.msg_type)} for s in n._subs],
                'service_servers': [{'name': s.srv_name, 'type': _type_key(s.srv_type)} for s in n._servers],
                'service_clients': [{'name': c.srv_name, 'type': _type_key(c.srv_type)} for c in n._clients],
            }
    raise ValueError('Узел не найден: %s' % node)

def _r_topic_list(drone):
    g = _graph(drone)
    names = sorted(set(k for k, v in g.pubs.items() if v) | set(k for k, v in g.subs.items() if v))
    return [{'name': n, 'types': _topic_types(g, n), 'publishers': len(g.pubs.get(n, ())), 'subscribers': len(g.subs.get(n, ()))} for n in names]

def _r_topic_info(drone, name):
    g = _graph(drone)
    types = _topic_types(g, name)
    if not types:
        raise ValueError('Топик не найден: %s' % name)
    return {
        'name': name, 'type': types[0], 'types': types,
        'publishers': [{'node': p.node.get_fully_qualified_name(), 'type': _type_key(p.msg_type)} for p in g.pubs.get(name, ())],
        'subscribers': [{'node': s.node.get_fully_qualified_name(), 'type': _type_key(s.msg_type)} for s in g.subs.get(name, ())],
    }

def _topic_class(g, name, type_name):
    if type_name:
        cls = _type_class(type_name)
        if cls is None or _type_key(cls) not in _MSG_CLASSES:
            raise ValueError('Неизвестный тип сообщения: %s' % type_name)
        return cls
    types = _topic_types(g, name)
    if not types:
        raise ValueError('Топик %s не найден: укажите тип сообщения' % name)
    return _MSG_CLASSES[types[0]]

async def _r_topic_echo(drone, name, count=1, timeout_sec=5.0, type=None):
    g = _graph(drone)
    cls = _topic_class(g, name, type)
    tmp = Node('_ros2cli_echo', _drone=drone, _internal=True)
    sub = tmp.create_subscription(cls, name, None, 100)
    out = []
    try:
        end = _sim_time(drone) + float(timeout_sec)
        while len(out) < int(count) and _sim_time(drone) < end:
            while sub._queue and len(out) < int(count):
                msg = sub._queue.popleft()
                out.append({'msg': message_to_dict(msg), 'yaml': message_to_yaml(msg)})
            if len(out) < int(count):
                await _asyncio.sleep(0.01)
    finally:
        tmp.destroy_node()
    return out

async def _r_topic_pub(drone, name, msg=None, type=None, once=True, times=1, rate=1.0):
    g = _graph(drone)
    cls = _topic_class(g, name, type)
    message = dict_to_message(cls, msg or {})
    tmp = Node('_ros2cli_pub', _drone=drone, _internal=True)
    pub = tmp.create_publisher(cls, name, 10)
    n = 1 if once else max(1, int(times))
    try:
        for i in range(n):
            pub.publish(message)
            if i + 1 < n:
                await _sim_sleep(drone, 1.0 / max(0.001, float(rate)))
        # Подписчик ros_pioneer_node разбирает очередь на следующем обороте цикла: даём ему этот оборот.
        await _asyncio.sleep(0.03)
    finally:
        tmp.destroy_node()
    return {'published': n, 'type': _type_key(cls), 'repr': repr(message)}

def _r_service_list(drone):
    g = _graph(drone)
    return [{'name': n, 'types': [_type_key(s.srv_type)]} for n, s in sorted(g.servers.items())]

def _r_service_type(drone, name):
    server = _graph(drone).servers.get(name)
    if server is None:
        raise ValueError('Сервис не найден: %s' % name)
    return _type_key(server.srv_type)

async def _r_service_call(drone, name, request=None, type=None, timeout_sec=10.0):
    g = _graph(drone)
    server = g.servers.get(name)
    if server is None:
        raise ValueError('Сервис %s недоступен' % name)
    if type and _type_key(_type_class(type)) != _type_key(server.srv_type):
        raise ValueError('Тип сервиса %s: %s, а указан %s' % (name, _type_key(server.srv_type), type))
    req = dict_to_message(server.srv_type.Request, request or {})
    future = server.submit(req)
    end = _sim_time(drone) + float(timeout_sec)
    while not future.done():
        if _sim_time(drone) >= end:
            raise TimeoutError('Нет ответа от %s за %s с' % (name, timeout_sec))
        await _asyncio.sleep(0.01)
    res = future.result()
    return {'type': _type_key(server.srv_type), 'request': repr(req), 'response': message_to_dict(res), 'response_repr': repr(res), 'yaml': message_to_yaml(res)}

def _find_node(g, name):
    for n in g.nodes:
        if n.get_fully_qualified_name() == name:
            return n
    raise ValueError('Узел не найден: %s' % name)

def _r_param_list(drone, node=None):
    g = _graph(drone)
    nodes = [_find_node(g, node)] if node else _visible_nodes(g)
    return {n.get_fully_qualified_name(): sorted(n._params) for n in nodes}

def _r_param_get(drone, node, name):
    n = _find_node(_graph(drone), node)
    if name not in n._params:
        raise ValueError('Параметр не объявлен: %s' % name)
    p = n._params[name]
    return {'type': p.type_.name.lower(), 'value': p.value}

def _r_param_set(drone, node, name, value):
    n = _find_node(_graph(drone), node)
    result = n.set_parameters([Parameter(name, None, value)])[0]
    return {'successful': result.successful, 'reason': result.reason}

def _r_log_tail(drone, count=50):
    return [list(item) for item in list(_LOG)[-int(count):]]

_REGISTRY = {
    'launch': _r_launch, 'launch_status': _r_launch_status, 'stop': _r_stop, 'node_list': _r_node_list, 'node_info': _r_node_info,
    'topic_list': _r_topic_list, 'topic_info': _r_topic_info, 'topic_echo': _r_topic_echo, 'topic_pub': _r_topic_pub,
    'service_list': _r_service_list, 'service_type': _r_service_type, 'service_call': _r_service_call,
    'param_list': _r_param_list, 'param_get': _r_param_get, 'param_set': _r_param_set, 'log_tail': _r_log_tail,
}

async def _dispatch(fn, args_json=None):
    # Единственная точка входа для TS (registry.ts): имя функции и JSON-аргументы, ответ - JSON {ok, result | error}.
    try:
        func = _REGISTRY.get(fn)
        if func is None:
            raise ValueError('Неизвестная функция реестра: %s' % fn)
        args = _json.loads(args_json) if args_json else {}
        result = func(**args)
        if _inspect.isawaitable(result):
            result = await result
        return _json.dumps({'ok': True, 'result': _jsonable(result)})
    except Exception as e:
        return _json.dumps({'ok': False, 'error': str(e)})

_registry_module = _module('_ros2_registry', False)
_registry_module.dispatch = _dispatch
`;
