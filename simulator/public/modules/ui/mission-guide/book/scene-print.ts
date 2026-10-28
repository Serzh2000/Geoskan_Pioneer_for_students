import { camera, droneMeshes, renderer, scene } from '../../../scene/core/scene-init.js';
import { currentDroneId } from '../../../core/state.js';

/**
 * The print of the viewport: the live WebGL frame turned into an ink engraving on two transparent canvases, one with the
 * contour lines and one with the hatching, so the paper shows through and the pen can take them off one after the other.
 *
 * The frame is read the one way that needs no `preserveDrawingBuffer`: render once and `drawImage` the canvas in the same
 * task, before the browser composites (the drawing buffer is still intact then). The 2D canvas is processed at roughly the
 * size it is shown at: luminance, a contrast stretch, a Sobel edge map thinned along the gradient, and two hatch directions
 * chosen by luminance band, all with a slight wobble so the lines are not machine-straight.
 */
export type ScenePrint = { lines: HTMLCanvasElement; hatch: HTMLCanvasElement; width: number; height: number };

const INK = [27, 35, 51] as const;
const MIN_WIDTH = 420;
const MAX_WIDTH = 1100;

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);
const smooth = (a: number, b: number, x: number): number => {
    const t = clamp01((x - a) / (b - a || 1));
    return t * t * (3 - 2 * t);
};

/** What the viewport looks like right now; two equal signatures mean the same print. */
export function sceneSignature(): string {
    const drone = droneMeshes[currentDroneId];
    const info = renderer?.info.memory;
    let parts = 0;
    drone?.traverse(() => { parts += 1; });
    const place = (v: { x: number; y: number; z: number } | undefined): string => (v ? `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)}` : '-');
    return [info?.geometries, info?.textures, place(camera?.position), place(drone?.position), parts, renderer?.domElement.width].join('|');
}

/** The frame as it is on the screen, composited over the dark floor. Null when the renderer has nothing to give yet. */
function readFrame(targetWidth: number): ImageData | null {
    if (!renderer || !scene || !camera) return null;
    const source = renderer.domElement;
    if (source.width < 16 || source.height < 16) return null;
    const scale = Math.min(1, Math.max(MIN_WIDTH, targetWidth) / source.width);
    const width = Math.max(16, Math.round(source.width * scale));
    const height = Math.max(16, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    // Render and read in the same task: the drawing buffer is not preserved between frames.
    renderer.render(scene, camera);
    context.fillStyle = '#2c3841';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
}

/** Separable box blur, `passes` times: a cheap Gaussian. */
function blur(input: Float32Array, width: number, height: number, radius: number, passes: number): Float32Array {
    let data = input;
    const span = radius * 2 + 1;
    for (let pass = 0; pass < passes; pass += 1) {
        const across = new Float32Array(data.length);
        for (let y = 0; y < height; y += 1) {
            const row = y * width;
            let sum = 0;
            for (let x = -radius; x <= radius; x += 1) sum += data[row + Math.min(width - 1, Math.max(0, x))];
            for (let x = 0; x < width; x += 1) {
                across[row + x] = sum / span;
                sum += data[row + Math.min(width - 1, x + radius + 1)] - data[row + Math.max(0, x - radius)];
            }
        }
        const down = new Float32Array(data.length);
        for (let x = 0; x < width; x += 1) {
            let sum = 0;
            for (let y = -radius; y <= radius; y += 1) sum += across[Math.min(height - 1, Math.max(0, y)) * width + x];
            for (let y = 0; y < height; y += 1) {
                down[y * width + x] = sum / span;
                sum += across[Math.min(height - 1, y + radius + 1) * width + x] - across[Math.max(0, y - radius) * width + x];
            }
        }
        data = down;
    }
    return data;
}

function percentile(values: Float32Array, share: number, buckets = 512): number {
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < values.length; i += 1) { if (values[i] < low) low = values[i]; if (values[i] > high) high = values[i]; }
    if (!(high > low)) return low;
    const histogram = new Uint32Array(buckets);
    for (let i = 0; i < values.length; i += 1) histogram[Math.min(buckets - 1, Math.floor(((values[i] - low) / (high - low)) * buckets))] += 1;
    let seen = 0;
    const goal = share * values.length;
    for (let b = 0; b < buckets; b += 1) { seen += histogram[b]; if (seen >= goal) return low + ((b + 1) / buckets) * (high - low); }
    return high;
}

/** Turns a rendered frame into the engraving. Pure: no DOM besides the two output canvases. */
export function engrave(frame: ImageData): ScenePrint {
    const { width, height } = frame;
    const size = width * height;
    const rgba = frame.data;
    const luma = new Float32Array(size);
    for (let i = 0; i < size; i += 1) luma[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;

    // Stretch the tones: the viewport is a dark scene, the engraving needs the full range of the paper.
    const lo = percentile(luma, 0.03);
    const hi = Math.max(lo + 0.05, percentile(luma, 0.995));
    const tone = new Float32Array(size);
    for (let i = 0; i < size; i += 1) tone[i] = clamp01((luma[i] - lo) / (hi - lo));

    const fine = blur(tone, width, height, 1, 2);
    const mid = blur(tone, width, height, Math.max(2, Math.round(width / 300)), 2);
    const broad = blur(tone, width, height, Math.max(3, Math.round(width / 200)), 3);

    // Lines: the difference of two blurs. A light ridge (the grid, a rim) is inked once along its middle, a step is inked
    // on its light side, and the dark side only faintly, so a thin line never comes out as a pair of rails.
    const response = new Float32Array(size);
    for (let i = 0; i < size; i += 1) response[i] = fine[i] - mid[i];
    const positive = new Float32Array(size);
    for (let i = 0; i < size; i += 1) positive[i] = Math.abs(response[i]);
    const low = percentile(positive, 0.86);
    const high = Math.max(low * 2.4, percentile(positive, 0.985));
    // A bright dot (a grid node) or line has a dark halo in a difference of blurs, and inked it comes out as a ring round a
    // dot: an empty bubble. The dark side is therefore left out wherever a light ridge lies within a few pixels.
    const lit = new Float32Array(size);
    for (let i = 0; i < size; i += 1) lit[i] = response[i] > low ? 1 : 0;
    const near = blur(lit, width, height, Math.max(3, Math.round(width / 130)), 2);
    const edge = new Float32Array(size);
    for (let i = 0; i < size; i += 1) {
        const r = response[i];
        // Heavier where the contrast is stronger: the weight of the line follows the edge.
        edge[i] = r > low ? 0.35 + 0.65 * smooth(low, high, r) : r < 0 && near[i] < 0.02 ? 0.45 * smooth(low * 1.4, high * 1.2, -r) : 0;
    }
    // The tone the hatching answers to is measured against the middle of the frame, so a mid-grey floor is lightly hatched.
    const sorted = Float32Array.from(broad).sort();
    const median = sorted[Math.floor(size / 2)];

    const wobble = (x: number, y: number): [number, number] => [
        1.1 * Math.sin(y * 0.034 + 1.7) + 0.7 * Math.sin(x * 0.051 + y * 0.02),
        1.1 * Math.sin(x * 0.029 + 0.4) + 0.7 * Math.sin(y * 0.047 - x * 0.018)
    ];
    const lines = new ImageData(width, height);
    const hatch = new ImageData(width, height);
    const unit = width / 640;
    const period = Math.max(4.6, 6.2 * unit);
    const angle = (38 * Math.PI) / 180;
    const [ca, sa] = [Math.cos(angle), Math.sin(angle)];
    const [cb, sb] = [Math.cos(-angle * 1.15), Math.sin(-angle * 1.15)];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const i = y * width + x;
            const [wx, wy] = wobble(x, y);
            const sx = Math.min(width - 1, Math.max(0, Math.round(x + wx)));
            const sy = Math.min(height - 1, Math.max(0, Math.round(y + wy)));
            const stroke = edge[sy * width + sx];
            lines.data[i * 4] = INK[0]; lines.data[i * 4 + 1] = INK[1]; lines.data[i * 4 + 2] = INK[2];
            lines.data[i * 4 + 3] = Math.round(255 * Math.min(0.95, stroke));

            // Hatching: tone from the broad blur, so it follows the masses and not the noise.
            const dark = clamp01(0.4 + (median - broad[i]) * 2.6);
            const margin = Math.min(x, y, width - 1 - x, height - 1 - y) / (Math.min(width, height) * 0.22);
            const fade = 0.55 + 0.45 * smooth(0, 1, margin + 0.18 * Math.sin(x * 0.05 + y * 0.04));
            let ink = 0;
            if (dark > 0.42) {
                const d = Math.abs(((x * ca + y * sa + wx * 1.6) / period) % 1 - 0.5) * period;
                const half = 0.2 + 0.85 * smooth(0.42, 0.95, dark);
                ink = Math.max(ink, clamp01(half + 0.45 - d));
            }
            if (dark > 0.7) {
                const d = Math.abs(((x * cb + y * sb + wy * 1.6) / period) % 1 - 0.5) * period;
                const half = 0.2 + 0.7 * smooth(0.7, 1, dark);
                ink = Math.max(ink, clamp01(half + 0.45 - d));
            }
            hatch.data[i * 4] = INK[0]; hatch.data[i * 4 + 1] = INK[1]; hatch.data[i * 4 + 2] = INK[2];
            hatch.data[i * 4 + 3] = Math.round(255 * 0.78 * ink * fade);
        }
    }
    return { lines: toCanvas(lines), hatch: toCanvas(hatch), width, height };
}

function toCanvas(data: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    canvas.getContext('2d')?.putImageData(data, 0, 0);
    return canvas;
}

const cache = new Map<string, ScenePrint>();

/**
 * The print of the viewport as it is now, or null when it cannot be read yet. Cached by the size and what the
 * viewport shows (camera, drone, what is loaded), so redrawing the same page costs nothing.
 */
export function printOfScene(targetWidth: number, fresh = false): ScenePrint | null {
    const key = `${Math.round(targetWidth)}|${sceneSignature()}`;
    const known = cache.get(key);
    if (known && !fresh) return known;
    const frame = readFrame(Math.min(MAX_WIDTH, targetWidth));
    if (!frame) return null;
    const print = engrave(frame);
    cache.clear();
    cache.set(key, print);
    return print;
}
