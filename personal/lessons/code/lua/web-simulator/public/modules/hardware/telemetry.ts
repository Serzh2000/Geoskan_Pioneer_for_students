/*
 * What the drone reports and how to read it. A Plazlink field reply is `component, field, type code, value bytes`;
 * the physical value is `raw * 10^scale`, the scale being part of the field's description. The type table is the
 * one Pioneer Station uses (gcs-libinter ValueType).
 */

export interface ValueType {
    size: number;
    read: (view: DataView, offset: number) => number;
}

/** Wire type code -> size and reader. 64-bit values lose precision above 2^53, far beyond anything the drone reports. */
export const VALUE_TYPES: Record<number, ValueType> = {
    0: { size: 1, read: (v, o) => v.getUint8(o) }, // boolean
    1: { size: 1, read: (v, o) => v.getUint8(o) }, // char
    2: { size: 1, read: (v, o) => v.getInt8(o) },
    3: { size: 2, read: (v, o) => v.getInt16(o, true) },
    4: { size: 4, read: (v, o) => v.getInt32(o, true) },
    5: { size: 8, read: (v, o) => Number(v.getBigInt64(o, true)) },
    6: { size: 1, read: (v, o) => v.getUint8(o) },
    7: { size: 2, read: (v, o) => v.getUint16(o, true) },
    8: { size: 4, read: (v, o) => v.getUint32(o, true) },
    9: { size: 8, read: (v, o) => Number(v.getBigUint64(o, true)) },
    10: { size: 4, read: (v, o) => v.getFloat32(o, true) },
    11: { size: 8, read: (v, o) => v.getFloat64(o, true) }
};

/** Decodes the payload of a field reply (`component, field, type, value...`). Returns null for an unknown type or a short payload. */
export function decodeFieldValue(payload: Uint8Array, scale: number): number | null {
    const type = VALUE_TYPES[payload[2]];
    if (!type || payload.length < 3 + type.size) return null;
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const raw = type.read(view, 3);
    // 182 * 10^-3 is 0.18200000000000002 in floating point; round to what the scale can express.
    if (scale >= 0) return raw * 10 ** scale;
    return Number((raw * 10 ** scale).toFixed(-scale));
}

/** How often a reading is refreshed: `fast` ones every round, `slow` ones every few rounds. */
export type Tier = 'fast' | 'slow';

export interface TelemetryField {
    key: string;
    component: string;
    field: string;
    tier: Tier;
}

/** The fields the "Дрон" panel shows. Names are those the drone itself reports. */
export const TELEMETRY_FIELDS: TelemetryField[] = [
    { key: 'roll', component: 'UavMonitor', field: 'roll', tier: 'fast' },
    { key: 'pitch', component: 'UavMonitor', field: 'pitch', tier: 'fast' },
    { key: 'yaw', component: 'UavMonitor', field: 'yaw', tier: 'fast' },
    { key: 'altitude', component: 'UavMonitor', field: 'altitude', tier: 'fast' },
    { key: 'range', component: 'SensorMonitor', field: 'range', tier: 'slow' },
    { key: 'accelZ', component: 'SensorMonitor', field: 'accelZ', tier: 'slow' },
    { key: 'pressure', component: 'SensorMonitor', field: 'pressure', tier: 'slow' },
    { key: 'voltage', component: 'SensorMonitor', field: 'voltage', tier: 'slow' },
    { key: 'current', component: 'SensorMonitor', field: 'current', tier: 'slow' },
    { key: 'rpm0', component: 'Actuators', field: 'rpmMotor0', tier: 'slow' },
    { key: 'rpm1', component: 'Actuators', field: 'rpmMotor1', tier: 'slow' },
    { key: 'rpm2', component: 'Actuators', field: 'rpmMotor2', tier: 'slow' },
    { key: 'rpm3', component: 'Actuators', field: 'rpmMotor3', tier: 'slow' },
    { key: 'mode', component: 'UavMonitor', field: 'mode', tier: 'slow' },
    { key: 'uptime', component: 'UavMonitor', field: 'uptime', tier: 'slow' },
    { key: 'bootCount', component: 'UavMonitor', field: 'bootCount', tier: 'slow' },
    { key: 'freeMemory', component: 'UavMonitor', field: 'freeMemory', tier: 'slow' },
    { key: 'allocatedMemory', component: 'UavMonitor', field: 'allocatedMemory', tier: 'slow' },
    { key: 'flashSize', component: 'UavMonitor', field: 'flashSize', tier: 'slow' },
    { key: 'cpuFrequency', component: 'UavMonitor', field: 'cpuFrequency', tier: 'slow' },
    { key: 'luaRun', component: 'LuaScript', field: 'run', tier: 'slow' },
    { key: 'luaStatus', component: 'LuaScript', field: 'status', tier: 'slow' },
    { key: 'luaMemory', component: 'LuaScript', field: 'memoryUsage', tier: 'slow' }
];

export type Telemetry = Partial<Record<string, number>>;
