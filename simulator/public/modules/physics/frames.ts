export interface WorldPlanarVector {
    x: number;
    y: number;
}

export interface BodyPlanarVector {
    right: number;
    forward: number;
}

/**
 * Преобразует вектор из плоскости дрона в мировую плоскость.
 * `forward` направлен вдоль носа, `right` - вправо от корпуса.
 * При yaw=0 нос дрона смотрит вдоль отрицательной оси Y мира.
 */
export function bodyPlanarToWorld(right: number, forward: number, yaw: number): WorldPlanarVector {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    return {
        x: right * cosYaw + forward * sinYaw,
        y: right * sinYaw - forward * cosYaw
    };
}

/**
 * Обратное преобразование: переводит мировой вектор в локальные оси корпуса.
 */
export function worldPlanarToBody(x: number, y: number, yaw: number): BodyPlanarVector {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    return {
        right: x * cosYaw + y * sinYaw,
        forward: x * sinYaw - y * cosYaw
    };
}
