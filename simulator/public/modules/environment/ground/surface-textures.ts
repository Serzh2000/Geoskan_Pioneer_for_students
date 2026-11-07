/**
 * Бесшовные текстуры поверхностей карты (канвас, без внешних файлов): трава, асфальт, плитка. Все ПЕРИОДИЧЕСКИЕ (шум
 * замкнут по обеим осям), с mipmap и анизотропной фильтрацией. Масштаб в метрах задаётся константами TILE_*:
 *   асфальт - кадр 2.4 м при 128 px: зерно ~2 см;  плитка - кадр 1.2 м = 2x2 плиты по 0.6 м;  трава - кадр 6 м при 256 px (только мелкое зерно).
 * Текстуры серые и светлые: цвет даёт материал (color) и цвета вершин, текстура только добавляет зерно и разбивает однородность.
 * В среде без DOM (тесты в node) возвращают null, и материалы остаются однотонными.
 */
import * as THREE from 'three';

export const TILE_ASPHALT = 2.4;
export const TILE_PAVING = 1.2;
export const TILE_GRASS = 6;

const cache = new Map<string, THREE.CanvasTexture | null>();

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s ^ s >>> 15, 0x2c1b3c6d) + 0x297a2d39) >>> 0; return s / 4294967296; };
}

/** Периодический value-noise: решётка period x period, значения повторяются по кругу, сглаживание smoothstep. */
function periodicNoise(size: number, period: number, seed: number): Float32Array {
    const r = rng(seed), lattice = Float32Array.from({ length: period * period }, () => r());
    const out = new Float32Array(size * size), step = period / size;
    const smooth = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const fx = x * step, fy = y * step, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
        const a = lattice[(y0 % period) * period + x0 % period], b = lattice[(y0 % period) * period + (x0 + 1) % period];
        const c = lattice[((y0 + 1) % period) * period + x0 % period], d = lattice[((y0 + 1) % period) * period + (x0 + 1) % period];
        out[y * size + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
    return out;
}

function make(key: string, size: number, paint: (data: Uint8ClampedArray, size: number) => void): THREE.CanvasTexture | null {
    if (cache.has(key)) return cache.get(key)!;
    if (typeof document === 'undefined') { cache.set(key, null); return null; }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) { cache.set(key, null); return null; }
    const image = ctx.createImageData(size, size); paint(image.data, size); ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    texture.userData.shared = true;
    cache.set(key, texture);
    return texture;
}

const put = (data: Uint8ClampedArray, i: number, v: number) => { const g = Math.max(0, Math.min(255, Math.round(v))); data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = g; data[i * 4 + 3] = 255; };

/**
 * Трава: ТОЛЬКО мелкий рисунок (периоды 16 и 48 ячеек = 37 и 12 см, плюс зерно), амплитуда +-5%. Крупных пятен в текстуре нет
 * намеренно: любое пятно, повторяющееся каждые 6 м, на вид сверху даёт решётку. Крупную неоднородность (от 9 до 90 м)
 * даёт цвет вершин рельефа (terrain-mesh.ts), он не повторяется.
 */
export function grassTexture(): THREE.CanvasTexture | null {
    return make('grass', 256, (data, size) => {
        const b = periodicNoise(size, 16, 23), c = periodicNoise(size, 48, 37), grain = rng(5);
        for (let i = 0; i < size * size; i++) put(data, i, 240 + (b[i] - .5) * 12 + (c[i] - .5) * 14 + (grain() - .5) * 8);
    });
}

/** Асфальт: мелкое зерно (~2 см) с редкими тёмными вкраплениями; без видимого рисунка на расстоянии. */
export function asphaltTexture(): THREE.CanvasTexture | null {
    return make('asphalt', 128, (data, size) => {
        const a = periodicNoise(size, 4, 71), b = periodicNoise(size, 32, 73), grain = rng(9);
        for (let i = 0; i < size * size; i++) {
            const speck = grain() < .035 ? -26 : 0;
            put(data, i, 226 + (a[i] - .5) * 14 + (b[i] - .5) * 18 + (grain() - .5) * 22 + speck);
        }
    });
}

/** Плитка: 2x2 плиты по 0.6 м (кадр 1.2 м), шов 1.2 см, у каждой плиты свой оттенок. */
export function pavingTexture(): THREE.CanvasTexture | null {
    return make('paving', 128, (data, size) => {
        const r = rng(31), tint = [0, 1, 2, 3].map(() => (r() - .5) * 18), grain = rng(41), half = size / 2, joint = 1;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const slab = (y >= half ? 2 : 0) + (x >= half ? 1 : 0), lx = x % half, ly = y % half;
            const seam = lx < joint || ly < joint;
            put(data, y * size + x, seam ? 168 : 232 + tint[slab] + (grain() - .5) * 10);
        }
    });
}
