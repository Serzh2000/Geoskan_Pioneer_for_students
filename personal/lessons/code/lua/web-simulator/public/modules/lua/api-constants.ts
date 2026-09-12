export const LUA_EVENT_CONSTANTS = Object.freeze({
    MCE_PREFLIGHT: 1,
    MCE_TAKEOFF: 2,
    MCE_LANDING: 3,
    ENGINES_ARM: 4,
    ENGINES_DISARM: 5,
    TAKEOFF_COMPLETE: 6,
    COPTER_LANDED: 7,
    LOW_VOLTAGE: 8,
    STATE_CHANGED: 9,
    POINT_REACHED: 10,
    ENGINES_STARTED: 11,
    POINT_DECELERATION: 12,
    LOW_VOLTAGE1: 13,
    LOW_VOLTAGE2: 14,
    SYNC_START: 15,
    SHOCK: 16,
    CONTROL_FAIL: 17,
    ENGINE_FAIL: 18
});

const LUA_API_CONSTANT_PREFIXES = [
    'MCE_',
    'ENGINES_',
    'LOW_VOLTAGE',
    'TAKEOFF_',
    'COPTER_',
    'POINT_',
    'SYNC_',
    'STATE_',
    'CONTROL_',
    'ENGINE_',
    'BUTTON_',
    'RADIO_',
    'WIFI_',
    'AHRS_',
    'MAG_',
    'SHOCK'
];

export function buildLuaEventTableLiteral() {
    return Object.entries(LUA_EVENT_CONSTANTS)
        .map(([name, value]) => `${name}=${value}`)
        .join(', ');
}

export function looksLikeLuaApiConstant(name: string) {
    const normalized = String(name || '').trim().toUpperCase();
    if (!normalized || !/^[A-Z][A-Z0-9_]*$/.test(normalized)) return false;
    return LUA_API_CONSTANT_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

export function getLuaMissingGlobalConstantError(name: string) {
    const normalized = String(name || '').trim().toUpperCase();
    if (!looksLikeLuaApiConstant(normalized)) return null;

    if (Object.prototype.hasOwnProperty.call(LUA_EVENT_CONSTANTS, normalized)) {
        return `Константа \`${normalized}\` должна использоваться с префиксом \`Ev.\`: \`Ev.${normalized}\`.`;
    }

    return `Событие или команда \`${normalized}\` отсутствует в справочнике Lua API. Проверьте название и используйте константы вида \`Ev.NAME\`.`;
}
