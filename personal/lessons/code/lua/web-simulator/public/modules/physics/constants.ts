export const TRACE_SAMPLE_INTERVAL = 0.05;
// Физика интегрируется фиксированным шагом независимо от частоты кадров и
// simSpeed — иначе один большой Euler-шаг (при просадке FPS или ускорении)
// даёт другое поведение полёта на разных машинах и может дать PD-регуляторам
// автопилота (updateAutoFlight/updateManualFlight) шаг, близкий к границе
// устойчивости. simSpeed управляет ЧИСЛОМ подшагов за кадр (см. animation-loop.ts),
// а не их размером.
export const PHYSICS_FIXED_DT = 1 / 120;
export const DRONE_COLLISION_RADIUS = 0.18;
export const COLLISION_SAMPLE_STEP = 0.08;
export const MANUAL_TAKEOFF_THROTTLE = 1200;
export const MANUAL_TAKEOFF_ALTITUDE = 0.8;

export const NON_COLLIDABLE_TYPES = new Set([
    'Ground',
    'ground',
    'Ворота',
    'Дорога',
    'Железнодорожные пути',
    'Площадка H',
    'Площадка ⚡',
    'Стартовая позиция',
    'Хелипорт',
    'Станция заряда',
    'Груз',
    'Грузик'
]);
