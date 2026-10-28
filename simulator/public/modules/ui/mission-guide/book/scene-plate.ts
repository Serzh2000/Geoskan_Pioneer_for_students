import { escapeHtml } from '../render/shared.js';
import { droneMeshes, onWindowResize } from '../../../scene/core/scene-init.js';
import { currentDroneId } from '../../../core/state.js';
import { printOfScene, sceneSignature, type ScenePrint } from './scene-print.js';

/**
 * The plate of the demonstration: one figure, the viewport of the simulator. Before the example runs it is an ink print of
 * that viewport; when it runs the pen takes the print off sweep by sweep (lines first, the hatching a moment behind) and
 * the live scene, with its volume, colour and motion, comes out of the paper under it; stopping lays it back into a print
 * of the scene as it is again. The live scene stays mounted in the host the whole time (`support/scene-preview.ts`) and is
 * never masked or filtered (a WebGL canvas under a mask can paint black): in the print state a sheet of paper with the
 * lines lies over it, and the sweep tears that sheet away; the hatching is a layer of its own that goes a moment later.
 * The sweeps are CSS masks (`panels/book-scene.css`); this file feeds them the print and the ragged paper edge.
 */
type PlateState = 'print' | 'reveal' | 'live' | 'settle';

const SWEEP_MS = 1100;
const SETTLE_AFTER_RESET_MS = 380;
/** How long, and how often, a printed plate looks for a late model (about 30 s). */
const WATCH_EVERY_MS = 600;
const WATCH_LOOKS = 50;
/** How many looks (100 ms apart) a plate waits for the scene to sit in its host before it gives up (about 30 s). */
const WAIT_LOOKS = 300;
const HOST_ID = 'mission-guide-scene-preview-host';

export function renderScenePlate(number: number): string {
    return `<figure class="book-figure book-plate-figure">
        <div class="book-plate" data-scene-plate data-scene="print">
            <div id="${HOST_ID}" class="guide-scene-preview-host book-scene book-plate__live is-active"></div>
            <div class="book-plate__paper" aria-hidden="true"><canvas data-print="lines"></canvas></div>
            <canvas class="book-plate__hatch" data-print="hatch" aria-hidden="true"></canvas>
        </div>
        <figcaption class="book-caption"><b>Рис. ${escapeHtml(String(number))}.</b> Сцена симулятора</figcaption>
    </figure>`;
}

// ---- the ragged paper edge: one mask image, three frames wide, the torn band in the middle ----

let edge: string | null = null;

function hash(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
    const [ix, iy] = [Math.floor(x), Math.floor(y)];
    const [fx, fy] = [x - ix, y - iy];
    const [u, v] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
    const top = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
    const bottom = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
    return top * (1 - v) + bottom * v;
}

/** Alpha 0 on the left third, 1 on the right, the torn band between: the paper that is still there. */
function paperEdge(): string {
    if (edge !== null) return edge;
    const [frame, height] = [480, 300];
    const canvas = document.createElement('canvas');
    canvas.width = frame * 3;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return (edge = 'none');
    const image = context.createImageData(frame * 3, height);
    const band = frame * 0.26;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < frame * 3; x += 1) {
            const tear = (valueNoise(x / 46, y / 11) - 0.5) * 0.95 + (valueNoise(x / 15, y / 4) - 0.5) * 0.5 + (valueNoise(x / 5, y / 1.6) - 0.5) * 0.28;
            const t = (x - frame * 1.15 - 0.25 * frame * (y / height) + tear * frame * 0.14) / band;
            image.data[(y * frame * 3 + x) * 4 + 3] = Math.round(255 * (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)));
        }
    }
    context.putImageData(image, 0, 0);
    return (edge = `url(${canvas.toDataURL('image/png')})`);
}

// ---- the plate ----

const plateOf = (container: ParentNode): HTMLElement | null => container.querySelector<HTMLElement>('[data-scene-plate]');
const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let ticket = 0;
let settleTimer = 0;

function setState(plate: HTMLElement, state: PlateState): void {
    // Dropping the attribute first restarts the sweeps when the state comes round again.
    delete plate.dataset.scene;
    void plate.getBoundingClientRect();
    plate.dataset.scene = state;
}

function paint(plate: HTMLElement, print: ScenePrint): void {
    plate.style.setProperty('--bp-erase', paperEdge());
    (['lines', 'hatch'] as const).forEach((layer) => {
        const canvas = plate.querySelector<HTMLCanvasElement>(`[data-print="${layer}"]`);
        if (!canvas) return;
        canvas.width = print.width;
        canvas.height = print.height;
        canvas.getContext('2d')?.drawImage(print[layer], 0, 0);
    });
    plate.dataset.printed = 'true';
}

/** Whether the scene sits in the host at the host's size, with the drone in it, so that a frame of it is worth printing. */
function sceneReady(plate: HTMLElement): boolean {
    const host = plate.querySelector<HTMLElement>(`#${HOST_ID}`);
    const canvas = host?.querySelector('canvas');
    if (!host || !canvas || host.clientWidth < 40 || host.clientHeight < 40) return false;
    return Math.abs(canvas.clientWidth - host.clientWidth) < 3 && Math.abs(canvas.clientHeight - host.clientHeight) < 3 && Boolean(droneMeshes[currentDroneId]);
}

function targetWidth(plate: HTMLElement): number {
    return plate.clientWidth * Math.min(2, Math.max(1.4, window.devicePixelRatio || 1));
}

/**
 * Prints the viewport onto the plate once the scene is in the host and has rendered; tries again shortly when it has not.
 * `fresh` takes a new frame instead of the cached one. Calls `done` once the plate shows the print.
 */
export function printScene(container: ParentNode, fresh = false, done?: () => void): void {
    const plate = plateOf(container);
    if (!plate) return;
    const mine = ++ticket;
    let tries = 0;
    let waiting = 0;
    let lastSignature = '';
    let printedSignature = '';
    const attempt = (): void => {
        if (mine !== ticket || !plate.isConnected) return;
        if (!sceneReady(plate)) {
            // The scene's own observer does not always notice that it now sits in a host of another size: tell it.
            if (waiting++ % 4 === 0) onWindowResize();
            if (waiting < WAIT_LOOKS) window.setTimeout(attempt, 100);
            return;
        }
        // The scene is still loading models and textures: wait until two looks in a row agree.
        const signature = sceneSignature();
        if (signature !== lastSignature && tries++ < (fresh ? 3 : 20)) {
            lastSignature = signature;
            window.setTimeout(attempt, 140);
            return;
        }
        const print = printOfScene(targetWidth(plate), fresh);
        printedSignature = signature;
        if (!print) {
            if (tries++ < 80) window.setTimeout(attempt, 100);
            return;
        }
        paint(plate, print);
        done?.();
        // The drone model is a file that may take seconds to arrive, and a print taken before it has no drone in the ring.
        // Keep watching while the plate is a print: when the viewport has changed and then held still for one look, print again.
        let previous = printedSignature;
        const watch = (looks: number): void => {
            window.setTimeout(() => {
                if (mine !== ticket || !plate.isConnected || plate.dataset.scene !== 'print') return;
                const now = sceneSignature();
                if (now !== printedSignature && now === previous) {
                    const again = printOfScene(targetWidth(plate), true);
                    if (again) { printedSignature = now; paint(plate, again); }
                }
                previous = now;
                if (looks > 0) watch(looks - 1);
            }, WATCH_EVERY_MS);
        };
        watch(WATCH_LOOKS);
    };
    window.requestAnimationFrame(attempt);
}

/** The example runs: the print comes off and the live scene comes out of it. */
export function liveScene(container: ParentNode): void {
    const plate = plateOf(container);
    if (!plate) return;
    ticket += 1;
    window.clearTimeout(settleTimer);
    if (reducedMotion()) { plate.dataset.scene = 'live'; return; }
    setState(plate, 'reveal');
    settleTimer = window.setTimeout(() => { if (plate.dataset.scene === 'reveal') plate.dataset.scene = 'live'; }, SWEEP_MS + 450);
}

/** The example stopped or was reset: the scene is printed again as it is now and settles back into the print. */
export function settleScene(container: ParentNode): void {
    const plate = plateOf(container);
    if (!plate) return;
    window.clearTimeout(settleTimer);
    const settle = (): void => {
        if (!plate.isConnected) return;
        if (reducedMotion()) { plate.dataset.scene = 'print'; return; }
        setState(plate, 'settle');
        settleTimer = window.setTimeout(() => { if (plate.dataset.scene === 'settle') plate.dataset.scene = 'print'; }, SWEEP_MS + 150);
    };
    // The reset has to reach the scene before it is looked at.
    settleTimer = window.setTimeout(() => printScene(container, true, settle), SETTLE_AFTER_RESET_MS);
}
