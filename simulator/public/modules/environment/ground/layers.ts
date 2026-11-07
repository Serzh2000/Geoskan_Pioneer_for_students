import * as THREE from 'three';

/**
 * Порядок плоских слоёв земли. Раньше слои различались только высотой по Z (от 4 мм до 2 см), а глубина буфера на
 * расстоянии 100 м при near = 0.025 (режим «Дрон»/FPV) грубее сантиметра: слои мерцали бы друг сквозь друга (проверено:
 * при 16-битной глубине дороги промышленной зоны пропадали под заливкой). Теперь у каждого слоя есть ранг: он задаёт
 * polygonOffset, а смещение polygonOffset измеряется в шагах буфера глубины и потому работает одинаково на 1 м и на 300 м.
 * Выше ранг - ближе к камере. Ранги СЖАТЫ намеренно: шаг глубины на 300 м при near = 0.025 около 20 см, и каждый ранг
 * сверх нужного тянул бы плоскую заплатку на столько же перед стеной дома. Одинаковый ранг у слоёв, которые не перекрываются.
 *
 * Цепочки слоёв, которые перекрываются на карте (Z и ранг растут вдоль цепочки, это проверяет tests/map-generation-audit):
 *   дорога: рельеф 0 < обочина 3 < асфальт 4 < пятно перекрёстка 5 < разметка 6 < пешеходная дорожка 7
 *   вода: рельеф 0 < берег 1 < вода 2;   район: рельеф < заливка 1 < полоса/парковка 2 < площадка двора 3;   двор: заливка 1 < двор 2
 *
 * Физика (ножки дрона, колёса машин) считает от тех же Z: менять их нельзя без правки vehicles/engine.ts.
 */
export const GROUND_LAYER = {
    terrain: 0, shore: 1, fill: 1, field: 1, yard: 2, water: 2, strip: 2, parking: 2, court: 3,
    shoulder: 3, patchShoulder: 3, asphalt: 4, patchAsphalt: 5, marking: 6, path: 7
} as const;
export type GroundLayer = keyof typeof GROUND_LAYER;

/** Цепочки перекрывающихся слоёв снизу вверх. */
export const GROUND_CHAINS: GroundLayer[][] = [
    ['terrain', 'shoulder', 'asphalt', 'patchAsphalt', 'marking', 'path'],
    ['terrain', 'shore', 'water'],
    ['terrain', 'fill', 'strip', 'court'],
    ['terrain', 'fill', 'yard'],
    ['terrain', 'field', 'yard'],
    ['terrain', 'shoulder', 'patchShoulder']
];

/** Высота слоя над рельефом, м. Монотонна по рангу; дорожные значения совпадают с obstacles/linear.ts. */
export const GROUND_LAYER_Z: Record<GroundLayer, number> = {
    terrain: .006, shore: .012, fill: .014, field: .016, yard: .018, water: .020, strip: .0215, parking: .0225, court: .0235,
    shoulder: .025, asphalt: .035, marking: .039, path: .045, patchShoulder: .0305, patchAsphalt: .0375
};

/** polygonOffset слоя: factor учитывает наклон поверхности, units - шаги буфера глубины; растут с рангом. */
export function layerOffset(rank: number): { polygonOffset: boolean; polygonOffsetFactor: number; polygonOffsetUnits: number } {
    return { polygonOffset: rank > 0, polygonOffsetFactor: -rank * .25, polygonOffsetUnits: -rank };
}

export function applyGroundLayer<T extends THREE.Material>(material: T, layer: GroundLayer): T {
    Object.assign(material, layerOffset(GROUND_LAYER[layer]));
    material.userData.groundLayer = layer;
    return material;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();
/**
 * Общий материал плоского слоя: одинаковый цвет и слой - один материал на всю карту. Раньше каждая заплатка создавала свой
 * материал (сотни материалов, ни один не освобождался при перегенерации карты).
 */
export function layerMaterial(color: number, layer: GroundLayer, roughness = .9, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    const key = `${color}|${layer}|${roughness}|${Object.keys(extra).join(',')}`;
    let material = cache.get(key);
    if (!material) {
        material = applyGroundLayer(new THREE.MeshStandardMaterial({ color, roughness, ...extra }), layer);
        cache.set(key, material);
    }
    return material;
}
