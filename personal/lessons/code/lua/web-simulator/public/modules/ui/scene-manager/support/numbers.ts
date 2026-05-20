export function formatSceneNumber(value: number) {
    return Number.isFinite(value) ? value.toFixed(2) : 'NaN';
}

export function formatSceneAngleRadians(value: number) {
    return `${formatSceneNumber((value * 180) / Math.PI)}°`;
}

export function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function clampNumber(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export function clampFloors(value: string | undefined, fallback = 9) {
    return clampInt(value, fallback, 5, 20);
}

export function clampWindowFloor(value: string | undefined, maxFloor: number) {
    return clampInt(value, 1, 1, maxFloor);
}
