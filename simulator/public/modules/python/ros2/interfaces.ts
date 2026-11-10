/*
 * Описания интерфейсов ROS 2 для эмуляции gs_core: сообщения и сервисы.
 * Это единственный источник: из него строятся классы Python (prelude.ts),
 * текст `ros2 interface show` (interfaceShow) и справочник редактора.
 *
 * Поля std_msgs / geometry_msgs / sensor_msgs / std_srvs - как в ROS 2 Jazzy.
 * Поля gs_interfaces справочник Геоскана (docs/ros2/gs_core.md) называет не
 * полностью: названные в нём поля взяты как есть, остальное - допущение,
 * см. docs/ros2/emulation-notes.md.
 */

/** [тип, имя, значение по умолчанию?]. Тип: примитив, `pkg/Name` или массив `T[]` / `T[N]`. */
export type Ros2Field = [type: string, name: string, defaultValue?: number | string | boolean];
export type Ros2Constant = [type: string, name: string, value: number | string];

export interface Ros2MsgDef {
    fields: Ros2Field[];
    constants?: Ros2Constant[];
}

export interface Ros2SrvDef {
    request: Ros2Field[];
    response: Ros2Field[];
    constants?: Ros2Constant[];
}

const HEADER: Ros2Field = ['std_msgs/Header', 'header'];

export const ROS2_MSGS: Record<string, Ros2MsgDef> = {
    'builtin_interfaces/msg/Time': { fields: [['int32', 'sec'], ['uint32', 'nanosec']] },
    'builtin_interfaces/msg/Duration': { fields: [['int32', 'sec'], ['uint32', 'nanosec']] },

    'std_msgs/msg/Header': { fields: [['builtin_interfaces/Time', 'stamp'], ['string', 'frame_id']] },
    'std_msgs/msg/Empty': { fields: [] },
    'std_msgs/msg/Bool': { fields: [['bool', 'data']] },
    'std_msgs/msg/Int8': { fields: [['int8', 'data']] },
    'std_msgs/msg/Int16': { fields: [['int16', 'data']] },
    'std_msgs/msg/Int32': { fields: [['int32', 'data']] },
    'std_msgs/msg/Int64': { fields: [['int64', 'data']] },
    'std_msgs/msg/UInt8': { fields: [['uint8', 'data']] },
    'std_msgs/msg/UInt16': { fields: [['uint16', 'data']] },
    'std_msgs/msg/UInt32': { fields: [['uint32', 'data']] },
    'std_msgs/msg/UInt64': { fields: [['uint64', 'data']] },
    'std_msgs/msg/Float32': { fields: [['float32', 'data']] },
    'std_msgs/msg/Float64': { fields: [['float64', 'data']] },
    'std_msgs/msg/String': { fields: [['string', 'data']] },
    'std_msgs/msg/ColorRGBA': { fields: [['float32', 'r'], ['float32', 'g'], ['float32', 'b'], ['float32', 'a']] },

    'geometry_msgs/msg/Point': { fields: [['float64', 'x'], ['float64', 'y'], ['float64', 'z']] },
    'geometry_msgs/msg/Vector3': { fields: [['float64', 'x'], ['float64', 'y'], ['float64', 'z']] },
    'geometry_msgs/msg/Quaternion': { fields: [['float64', 'x'], ['float64', 'y'], ['float64', 'z'], ['float64', 'w', 1.0]] },
    'geometry_msgs/msg/Pose': { fields: [['geometry_msgs/Point', 'position'], ['geometry_msgs/Quaternion', 'orientation']] },
    'geometry_msgs/msg/PoseStamped': { fields: [HEADER, ['geometry_msgs/Pose', 'pose']] },
    'geometry_msgs/msg/PointStamped': { fields: [HEADER, ['geometry_msgs/Point', 'point']] },
    'geometry_msgs/msg/Vector3Stamped': { fields: [HEADER, ['geometry_msgs/Vector3', 'vector']] },
    'geometry_msgs/msg/Twist': { fields: [['geometry_msgs/Vector3', 'linear'], ['geometry_msgs/Vector3', 'angular']] },
    'geometry_msgs/msg/TwistStamped': { fields: [HEADER, ['geometry_msgs/Twist', 'twist']] },

    'sensor_msgs/msg/BatteryState': {
        fields: [
            HEADER, ['float32', 'voltage'], ['float32', 'temperature'], ['float32', 'current'], ['float32', 'charge'],
            ['float32', 'capacity'], ['float32', 'design_capacity'], ['float32', 'percentage'],
            ['uint8', 'power_supply_status'], ['uint8', 'power_supply_health'], ['uint8', 'power_supply_technology'],
            ['bool', 'present'], ['float32[]', 'cell_voltage'], ['float32[]', 'cell_temperature'],
            ['string', 'location'], ['string', 'serial_number']
        ],
        constants: [
            ['uint8', 'POWER_SUPPLY_STATUS_UNKNOWN', 0], ['uint8', 'POWER_SUPPLY_STATUS_CHARGING', 1],
            ['uint8', 'POWER_SUPPLY_STATUS_DISCHARGING', 2], ['uint8', 'POWER_SUPPLY_STATUS_NOT_CHARGING', 3],
            ['uint8', 'POWER_SUPPLY_STATUS_FULL', 4], ['uint8', 'POWER_SUPPLY_HEALTH_UNKNOWN', 0],
            ['uint8', 'POWER_SUPPLY_HEALTH_GOOD', 1], ['uint8', 'POWER_SUPPLY_TECHNOLOGY_UNKNOWN', 0],
            ['uint8', 'POWER_SUPPLY_TECHNOLOGY_LIPO', 3]
        ]
    },
    'sensor_msgs/msg/Imu': {
        fields: [
            HEADER, ['geometry_msgs/Quaternion', 'orientation'], ['float64[9]', 'orientation_covariance'],
            ['geometry_msgs/Vector3', 'angular_velocity'], ['float64[9]', 'angular_velocity_covariance'],
            ['geometry_msgs/Vector3', 'linear_acceleration'], ['float64[9]', 'linear_acceleration_covariance']
        ]
    },
    'sensor_msgs/msg/Range': {
        fields: [HEADER, ['uint8', 'radiation_type'], ['float32', 'field_of_view'], ['float32', 'min_range'], ['float32', 'max_range'], ['float32', 'range']],
        constants: [['uint8', 'ULTRASOUND', 0], ['uint8', 'INFRARED', 1]]
    },

    'rcl_interfaces/msg/SetParametersResult': { fields: [['bool', 'successful'], ['string', 'reason']] },

    'gs_interfaces/msg/Parameter': { fields: [['string', 'name'], ['float32', 'value']] },
    'gs_interfaces/msg/NavStatus': {
        fields: [['uint8', 'status']],
        constants: [['uint8', 'NO_DATA', 0], ['uint8', 'CANNOT', 1], ['uint8', 'LOW', 2], ['uint8', 'OK', 3]]
    },
    'gs_interfaces/msg/MotorsRpm': { fields: [HEADER, ['float32[4]', 'rpm']] },
    'gs_interfaces/msg/PointGPS': { fields: [HEADER, ['float64', 'latitude'], ['float64', 'longitude'], ['float64', 'altitude']] },
    'gs_interfaces/msg/SatellitesGPS': { fields: [HEADER, ['uint8', 'satellites']] },
    'gs_interfaces/msg/OptVelocity': { fields: [HEADER, ['float32', 'x'], ['float32', 'y']] },
    'gs_interfaces/msg/RangerData': {
        fields: [HEADER, ['float32', 'right'], ['float32', 'left'], ['float32', 'front'], ['float32', 'back'], ['float32', 'above_below']]
    },
    'gs_interfaces/msg/RcChannels': {
        fields: [1, 2, 3, 4, 5, 6, 7, 8].map((n): Ros2Field => ['int32', `channel_${n}`])
    }
};

export const ROS2_SRVS: Record<string, Ros2SrvDef> = {
    'std_srvs/srv/Empty': { request: [], response: [] },
    'std_srvs/srv/Trigger': { request: [], response: [['bool', 'success'], ['string', 'message']] },
    'std_srvs/srv/SetBool': { request: [['bool', 'data']], response: [['bool', 'success'], ['string', 'message']] },

    'gs_interfaces/srv/Arm': { request: [['float32', 'timeout'], ['int32', 'retries']], response: [['bool', 'success']] },
    'gs_interfaces/srv/GoToLocalPoint': {
        request: [['float32', 'x'], ['float32', 'y'], ['float32', 'z'], ['float32', 'yaw'], ['float32', 'time'], ['string', 'frame_id']],
        response: [['bool', 'success']]
    },
    'gs_interfaces/srv/GoToGlobalPoint': {
        request: [['float64', 'latitude'], ['float64', 'longitude'], ['float64', 'altitude'], ['float32', 'yaw'], ['string', 'frame_id']],
        response: [['bool', 'success']]
    },
    'gs_interfaces/srv/Yaw': { request: [['float32', 'angle']], response: [['bool', 'success']] },
    'gs_interfaces/srv/Live': { request: [], response: [['bool', 'status']] },
    'gs_interfaces/srv/GetParam': { request: [['string', 'name'], ['bool', 'update']], response: [['float32', 'value'], ['bool', 'status']] },
    'gs_interfaces/srv/SetParam': { request: [['string', 'name'], ['float32', 'value']], response: [['bool', 'status']] },
    'gs_interfaces/srv/ParametersList': { request: [], response: [['gs_interfaces/Parameter[]', 'params'], ['bool', 'status']] },
    'gs_interfaces/srv/SetParametersList': { request: [['gs_interfaces/Parameter[]', 'params']], response: [['bool', 'status']] },
    'gs_interfaces/srv/NavigationSystem': { request: [], response: [['string', 'navigation'], ['bool', 'status']] },
    'gs_interfaces/srv/SetNavigationSystem': { request: [['string', 'navigation']], response: [['bool', 'status']] },
    'gs_interfaces/srv/Grab': {
        request: [['float32', 'movement_time'], ['int32', 'velocity'], ['uint8', 'action']],
        response: [['bool', 'success']]
    },
    'gs_interfaces/srv/Led': {
        request: [['uint8', 'mode'], ['std_msgs/ColorRGBA[]', 'leds'], ['float32', 'period']],
        response: [['bool', 'success']],
        constants: [['uint8', 'PIXEL', 0], ['uint8', 'FILL', 1], ['uint8', 'BLINK', 2], ['uint8', 'CHASE', 3]]
    }
};

export type Ros2ConfigName = 'mini2' | 'razero';
export type Ros2ParamValue = boolean | number | string;

/** Параметры ros_pioneer_node (таблицы из справочника): config/mini2.yaml и config/razero.yaml. */
export const ROS2_CONFIGS: Record<Ros2ConfigName, Record<string, Ros2ParamValue>> = {
    mini2: {
        shortname: 'mini2', board_reboot: false, board_name: 'Pioneer Mini 2', gtlp_version: 2,
        grab: true, cargo: false, nav_system_change_in_flight: false,
        'range_sensor.radiation_type': 'INFRARED', 'range_sensor.min_range': 0.05, 'range_sensor.max_range': 4.0, 'range_sensor.field_of_view': 0.26,
        'topics.imu': true, 'topics.altitude': true, 'topics.range': true, 'topics.motors_rpm': true, 'topics.battery': true,
        'topics.callback_event': true, 'topics.fly_state': true, 'topics.optical_flow': true, 'topics.ranger': true,
        'topics.rc': true, 'topics.cmd_vel': true, 'topics.gnss': false, 'topics.lps': true
    },
    razero: {
        shortname: 'razero', board_reboot: true, board_name: 'Razero', gtlp_version: 1,
        grab: false, cargo: true, nav_system_change_in_flight: true,
        'range_sensor.radiation_type': 'INFRARED', 'range_sensor.min_range': 0.05, 'range_sensor.max_range': 4.0, 'range_sensor.field_of_view': 0.26,
        'topics.imu': true, 'topics.altitude': true, 'topics.range': true, 'topics.motors_rpm': false, 'topics.battery': true,
        'topics.callback_event': true, 'topics.fly_state': true, 'topics.optical_flow': true, 'topics.ranger': false,
        'topics.rc': true, 'topics.cmd_vel': true, 'topics.gnss': false, 'topics.lps': true
    }
};

/** Какой конфиг запускается на модели дрона (launch pioneer_mini2_full_launch.py / pioneer_razero_full_launch.py). */
export function ros2ConfigForModel(model: string | undefined | null): Ros2ConfigName {
    return model === 'pioneer-mini2' ? 'mini2' : 'razero';
}

export const ROS2_LAUNCH_FILES: Record<Ros2ConfigName, string> = {
    mini2: 'pioneer_mini2_full_launch.py',
    razero: 'pioneer_razero_full_launch.py'
};

/** Всё, что передаётся в Python одним JSON. */
export const ROS2_SPEC = { msgs: ROS2_MSGS, srvs: ROS2_SRVS, configs: ROS2_CONFIGS };

/** Приводит `ros2 interface show` к виду из ROS 2: `gs_interfaces/srv/Arm`, `std_msgs/msg/Int8`, также `std_msgs/Int8`. */
export function normalizeInterfaceName(name: string): string {
    const trimmed = name.trim().replace(/^\/+/, '');
    const parts = trimmed.split('/');
    if (parts.length === 2) {
        if (`${parts[0]}/msg/${parts[1]}` in ROS2_MSGS) return `${parts[0]}/msg/${parts[1]}`;
        if (`${parts[0]}/srv/${parts[1]}` in ROS2_SRVS) return `${parts[0]}/srv/${parts[1]}`;
    }
    return trimmed;
}

export function interfaceKind(name: string): 'msg' | 'srv' | null {
    const normalized = normalizeInterfaceName(name);
    if (normalized in ROS2_MSGS) return 'msg';
    if (normalized in ROS2_SRVS) return 'srv';
    return null;
}

function formatFields(fields: Ros2Field[], constants: Ros2Constant[] = []): string[] {
    return [
        ...constants.map(([type, name, value]) => `${type} ${name}=${value}`),
        ...fields.map(([type, name, def]) => {
            return `${type} ${name}${def !== undefined && typeof def !== 'string' ? ` ${def}` : ''}`;
        })
    ];
}

/** Текст `ros2 interface show <тип>`; null, если такого интерфейса нет. */
export function interfaceShow(name: string): string | null {
    const normalized = normalizeInterfaceName(name);
    const msg = ROS2_MSGS[normalized];
    if (msg) return formatFields(msg.fields, msg.constants).join('\n');
    const srv = ROS2_SRVS[normalized];
    if (srv) {
        return [
            ...formatFields(srv.request, srv.constants),
            '---',
            ...formatFields(srv.response)
        ].join('\n');
    }
    return null;
}

/** Список интерфейсов для `ros2 interface list`, по пакетам. */
export function interfaceList(): { msgs: string[]; srvs: string[] } {
    return { msgs: Object.keys(ROS2_MSGS).sort(), srvs: Object.keys(ROS2_SRVS).sort() };
}
