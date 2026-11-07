import * as THREE from 'three';
import { grassTexture, TILE_GRASS } from '../ground/surface-textures.js';
import { GROUND_LAYER_Z } from '../ground/layers.js';
import { trainingHeightAt } from './world-plan.js';
import type { TrainingLayout } from './layout.js';
import { WaterProbe, type Point2 } from './geography.js';

/*
 * Рельеф и окружение карты.
 *  - Сетка рельефа: шаг 4 м там, где есть холмы (раньше 6.25 м: дорожка шириной 1.6 м + 4 м ровной обочины оказывалась уже
 *    ячейки, и треугольник рельефа, натянутый между узлами по обе стороны, поднимал склон над дорогой), 12 м на плоской карте.
 *  - Цвет вершин: три октавы шума с масштабами 90 / 28 / 9 м вместо двух синусоид (повтор был виден как решётка), плавная
 *    кромка у воды (smoothstep на 3.5 м, а не скачок на 2 м) и плавный переход к цвету окружения у края карты.
 *  - Текстура зерна травы (периодическая, 6 м, mipmap + анизотропия) умножается на цвет вершин.
 *  - «Подол»: за краем карты земля продолжается до горизонта того же цвета, река уходит за край, туман скрывает дальний край.
 */
export const GRASS = new THREE.Color(0x7a8962), DRY = new THREE.Color(0x939073), LUSH = new THREE.Color(0x6a7c54), BANK = new THREE.Color(0xb5a487);
export const SKIRT_SIZE = 4000, EDGE_BLEND = 40;

function hash2(ix: number, iy: number, seed: number): number {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
/** Value noise 0..1, гладкий (smoothstep), без осевых артефактов. */
export function valueNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function terrainNoise(x: number, y: number, seed: number): number {
    return valueNoise(x / 90, y / 90, seed) * .55 + valueNoise(x / 28, y / 28, seed + 1) * .3 + valueNoise(x / 9, y / 9, seed + 2) * .15;
}
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Цвет земли в точке (мир): трава, сухая трава, свежая зелень, берег. Один источник и для рельефа, и для «подола». */
export function groundColor(layout: TrainingLayout, x: number, y: number, height: number, water: number, out = new THREE.Color()): THREE.Color {
    const n = terrainNoise(x, y, layout.seed % 9973), half = layout.size / 2;
    out.copy(GRASS);
    if (n > .5) out.lerp(DRY, Math.min(.55, (n - .5) * 1.5)); else out.lerp(LUSH, Math.min(.6, (.5 - n) * 1.4));
    if (height > 0) out.lerp(DRY, Math.min(.4, height / 15));
    if (water < 3.5) out.lerp(BANK, .8 * (1 - smooth(0, 3.5, water)));
    // К краю карты рисунок затухает и цвет сходится с цветом «подола».
    const edge = smooth(0, EDGE_BLEND, half - Math.max(Math.abs(x), Math.abs(y)));
    return out.lerp(GRASS, 1 - edge);
}

let terrainMaterial: THREE.MeshStandardMaterial | null = null;
let skirtMaterial: THREE.MeshStandardMaterial | null = null;
const materials = () => {
    if (!terrainMaterial) {
        const map = grassTexture();
        // Ранг 0: без смещения. Базовая плита арены (ground.ts, z = 0) сама отодвинута назад polygonOffset +1, поэтому рельеф
        // всегда над ней на любой дальности, а все слои выше (ранги 1..7) тянутся к камере сильнее рельефа.
        terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, map });
        skirtMaterial = new THREE.MeshStandardMaterial({ color: GRASS, roughness: 1, map });
    }
    return { terrain: terrainMaterial, skirt: skirtMaterial! };
};

export function buildTerrain(layout: TrainingLayout): THREE.Mesh {
    const resolution = Math.ceil(layout.size / (layout.landforms.length ? 4 : 12)), probe = new WaterProbe(layout.water, layout.size);
    const geometry = new THREE.PlaneGeometry(layout.size, layout.size, resolution, resolution);
    const position = geometry.attributes.position, uv = geometry.attributes.uv, colors = new Float32Array(position.count * 3), c = new THREE.Color();
    const repeat = layout.size / TILE_GRASS;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), height = trainingHeightAt(layout, x, y);
        position.setZ(i, height + GROUND_LAYER_Z.terrain);
        groundColor(layout, x, y, height, probe.distance({ x, y }, 3.5), c); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        uv.setXY(i, uv.getX(i) * repeat, uv.getY(i) * repeat);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, materials().terrain);
    mesh.name = 'Рельеф местности'; mesh.receiveShadow = true;
    mesh.userData.trainingGround = layout;
    return mesh;
}

/** Земля за краем карты и продолжение реки за край; ничего не сталкивается (collidable = false), лежит под рельефом. */
export function buildSurroundings(layout: TrainingLayout, riverOutlineOf: (points: Point2[], width: number) => Point2[], flat: (points: Point2[], color: number, z: number, layer: 'water' | 'shore') => THREE.Mesh): THREE.Group {
    const group = new THREE.Group(); group.name = 'Окружение карты'; group.userData.collidable = false;
    const geometry = new THREE.PlaneGeometry(SKIRT_SIZE, SKIRT_SIZE);
    const uv = geometry.attributes.uv, repeat = SKIRT_SIZE / TILE_GRASS;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repeat, uv.getY(i) * repeat);
    const skirt = new THREE.Mesh(geometry, materials().skirt);
    skirt.position.z = -.06; skirt.userData.collidable = false; skirt.name = 'Земля за краем';
    group.add(skirt);
    const reach = 400;
    for (const water of layout.water) {
        if (water.kind !== 'river') continue;
        const p = water.points, head = p[0], tail = p[p.length - 1];
        const dirOf = (a: Point2, b: Point2) => { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }; };
        const d0 = dirOf(p[1], p[0]), d1 = dirOf(p[p.length - 2], tail);
        for (const [from, dir] of [[head, d0], [tail, d1]] as const) {
            const far = { x: from.x + dir.x * reach, y: from.y + dir.y * reach };
            const line = [from, { x: from.x + dir.x * reach / 2, y: from.y + dir.y * reach / 2 }, far];
            const shore = flat(riverOutlineOf(line, water.width + 2), 0xaf9e79, -.054, 'shore'); shore.name = 'Берег за краем';
            const surface = flat(riverOutlineOf(line, water.width), 0x527c80, -.046, 'water'); surface.name = 'Река за краем';
            group.add(shore, surface);
        }
    }
    return group;
}
