/*
 * Жилые дома города как чистые данные (без three.js): раскладка читает размеры отсюда, чтобы отступы и радиусы
 * совпадали с настоящей геометрией, а city-blocks.ts строит по ним сетку. Метры, этаж 3.0-3.4 м.
 */
export type BlockStyle = 'panel' | 'brick' | 'modern' | 'stalin' | 'tower';
export type HouseStyle = 'gable' | 'hip' | 'two-storey' | 'flat';

export interface BlockSpec {
    style: BlockStyle; label: string;
    width: number; depth: number; minFloors: number; maxFloors: number; floorHeight: number;
    /** Окружность, в которую вписан дом вместе с цоколем и карнизом: радиус для раскладки. */
    radius: number;
    palette: number[];
}
export interface HouseSpec { style: HouseStyle; label: string; width: number; depth: number; floors: number; radius: number; palette: number[] }

const ring = (w: number, d: number, extra = .5) => Math.hypot(w / 2 + extra, d / 2 + extra);

export const BLOCK_SPECS: BlockSpec[] = [
    { style: 'panel', label: 'Панельный дом', width: 8, depth: 7, minFloors: 5, maxFloors: 9, floorHeight: 3, radius: ring(8, 7, .4), palette: [0xc9c5bb, 0xbfc4c7, 0xd2cfc4, 0xb7bfc4] },
    { style: 'brick', label: 'Кирпичный дом', width: 8, depth: 7, minFloors: 3, maxFloors: 6, floorHeight: 3, radius: ring(8, 7, .6), palette: [0xa5583f, 0x9b5a45, 0xb36b4e, 0xb07a5a] },
    { style: 'modern', label: 'Современный дом', width: 9, depth: 7.5, minFloors: 6, maxFloors: 12, floorHeight: 3.1, radius: ring(9, 7.5, .5), palette: [0xe6e8ea, 0xd9dde0, 0xe3ddd0, 0xcfd6db] },
    { style: 'stalin', label: 'Сталинский дом', width: 10.5, depth: 8, minFloors: 4, maxFloors: 8, floorHeight: 3.4, radius: ring(10.5, 8, .9), palette: [0xd9c79d, 0xc9b78a, 0xd8c6ae, 0xcfbf9b] },
    { style: 'tower', label: 'Жилая башня', width: 8, depth: 8, minFloors: 12, maxFloors: 18, floorHeight: 3, radius: ring(8, 8, .5), palette: [0xb8c0c6, 0xc7c0b2, 0xaeb9c2, 0xd0cfc8] }
];

export const HOUSE_SPECS: HouseSpec[] = [
    { style: 'gable', label: 'Дом с двускатной крышей', width: 5.8, depth: 5.2, floors: 1, radius: ring(5.8, 5.2, .35), palette: [0xd9c8a5, 0xcfd9b9, 0xe3dccb, 0xd7b9a0] },
    { style: 'hip', label: 'Дом с вальмовой крышей', width: 5.8, depth: 5.4, floors: 1, radius: ring(5.8, 5.4, .35), palette: [0xb9c9a8, 0xe0d6c0, 0xc9d6dc, 0xdcc3ad] },
    { style: 'two-storey', label: 'Двухэтажный дом', width: 5.4, depth: 5.2, floors: 2, radius: ring(5.4, 5.2, .35), palette: [0xcfc9bd, 0x9fb6c9, 0xd6c29b, 0xc6b3a0] },
    { style: 'flat', label: 'Дом с плоской крышей', width: 6, depth: 5.4, floors: 1, radius: ring(6, 5.4, .35), palette: [0xe0cfae, 0xc7d4c0, 0xd2d6dc, 0xd9b8a8] }
];
export const ROOF_COLORS = [0x6b4a3a, 0x4d5a63, 0x7a3f33, 0x3f5a45, 0x5b4a58];

/** Радиус самого маленького дома каждого вида: нижняя граница MODEL_FOOTPRINTS. */
export const MIN_BLOCK_RADIUS = Math.min(...BLOCK_SPECS.map(s => s.radius));
