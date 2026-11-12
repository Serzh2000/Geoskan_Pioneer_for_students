import { cleanFloat32, sameFloat32, type DroneParam } from './plazlink/params.js';

/*
 * Planning a write of a profile onto a real drone. Nothing here talks to the port: it only decides what would change,
 * what must not change by accident and what can cut the link, so the screen can show it before anything is written.
 */

/**
 * Values that belong to this particular board and are not part of a flight profile: identity, run counters and the
 * sensor calibration measured on the bench. A profile file usually carries somebody else's, so they stay off by default.
 */
export const PROTECTED_PREFIXES = ['Board_', 'State_', 'Offsets_'] as const;

/** Parameters whose new value changes how the computer talks to the drone. The text says what to expect. */
export const LINK_CRITICAL: Readonly<Record<string, string>> = {
    BoardPioneer_baudrate: 'Скорость порта изменится после перезагрузки дрона (выключите и включите питание). Pioneer Station подключается на 57600.',
    BoardPioneer_auxUMux: 'Переключает дополнительный последовательный порт (режим с Raspberry Pi или радиомодуль). Вступает в силу после перезагрузки.'
};

/** Written last: after it the link may drop at once. */
const WRITE_LAST = 'BoardPioneer_baudrate';

export interface ParamChange {
    index: number;
    name: string;
    from: number;
    to: number;
    /** Part of the board's identity or calibration; selected only on request. */
    protectedByDefault: boolean;
    /** What happens to the link, or null for an ordinary parameter. */
    linkNote: string | null;
}

export interface WritePlan {
    changes: ParamChange[];
    /** In the profile but unknown to this firmware: cannot be written. */
    missingOnDrone: string[];
    /** On the drone but absent from the profile: left as they are. */
    notInProfile: string[];
    unchanged: number;
}

export function isProtectedParam(name: string): boolean {
    return PROTECTED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function planParamWrite(drone: readonly DroneParam[], wanted: Readonly<Record<string, number>>): WritePlan {
    const changes: ParamChange[] = [];
    const known = new Set<string>();
    let unchanged = 0;
    for (const param of drone) {
        known.add(param.name);
        const target = wanted[param.name];
        if (typeof target !== 'number' || !Number.isFinite(target)) continue;
        if (sameFloat32(param.value, target)) {
            unchanged += 1;
            continue;
        }
        changes.push({
            index: param.index,
            name: param.name,
            from: cleanFloat32(param.value),
            to: target,
            protectedByDefault: isProtectedParam(param.name),
            linkNote: LINK_CRITICAL[param.name] ?? null
        });
    }
    changes.sort((a, b) => Number(a.name === WRITE_LAST) - Number(b.name === WRITE_LAST) || a.index - b.index);
    return {
        changes,
        missingOnDrone: Object.keys(wanted).filter((name) => !known.has(name)).sort(),
        notInProfile: drone.filter((param) => !(param.name in wanted)).map((param) => param.name).sort(),
        unchanged
    };
}

/** Drone values as a .properties text, the form the profile importer and Pioneer Station understand. */
export function dronePropertiesText(drone: readonly DroneParam[], header: string): string {
    const lines = [...drone].sort((a, b) => a.name.localeCompare(b.name)).map((param) => `${param.name}=${cleanFloat32(param.value)}`);
    return [`# ${header}`, ...lines, ''].join('\n');
}
