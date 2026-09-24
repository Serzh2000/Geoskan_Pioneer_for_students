/*
 * A steady tick that keeps its rate when the simulator tab is in the
 * background. Working with external Python the browser usually is: behind
 * IDLE and the cv2 window. Chrome then throttles page timers to about one run
 * per second (and marks a fully covered window hidden too), which would cut an
 * external camera stream to 1 frame/s. Timers inside a dedicated worker are not
 * throttled that way, so the worker only keeps time and posts a message; the
 * work itself still runs on the page.
 */

export type BackgroundTicker = { stop: () => void };

const WORKER_SOURCE = `
let timer = null;
onmessage = (event) => {
    clearInterval(timer);
    if (event.data > 0) timer = setInterval(() => postMessage(0), event.data);
};
`;

export function startBackgroundTicker(intervalMs: number, onTick: () => void): BackgroundTicker {
    try {
        const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
        const worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.onmessage = () => onTick();
        worker.postMessage(intervalMs);
        return {
            stop: () => {
                worker.postMessage(0);
                worker.terminate();
            }
        };
    } catch {
        // No workers (old browser, strict CSP): a plain timer, throttled in the background.
        const timer = window.setInterval(onTick, intervalMs);
        return { stop: () => window.clearInterval(timer) };
    }
}

/*
 * One-shot timeouts with the same property, for loops that reschedule
 * themselves (the external bridge's command poll). One shared worker keeps
 * all of them; ids are ours, not window.setTimeout's.
 */
const TIMEOUT_WORKER_SOURCE = `
const timers = new Map();
onmessage = (event) => {
    const { id, ms, cancel } = event.data;
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (!cancel) timers.set(id, setTimeout(() => { timers.delete(id); postMessage(id); }, ms));
};
`;

let timeoutWorker: Worker | null | undefined;
const pendingTimeouts = new Map<number, () => void>();
let nextTimeoutId = 1;

function getTimeoutWorker(): Worker | null {
    if (timeoutWorker !== undefined) return timeoutWorker;
    try {
        const url = URL.createObjectURL(new Blob([TIMEOUT_WORKER_SOURCE], { type: 'text/javascript' }));
        timeoutWorker = new Worker(url);
        URL.revokeObjectURL(url);
        timeoutWorker.onmessage = (event: MessageEvent<number>) => {
            const callback = pendingTimeouts.get(event.data);
            pendingTimeouts.delete(event.data);
            callback?.();
        };
    } catch {
        timeoutWorker = null;
    }
    return timeoutWorker;
}

export function backgroundTimeout(callback: () => void, ms: number): number {
    const worker = getTimeoutWorker();
    if (!worker) return -window.setTimeout(callback, ms);
    const id = nextTimeoutId++;
    pendingTimeouts.set(id, callback);
    worker.postMessage({ id, ms });
    return id;
}

export function clearBackgroundTimeout(id: number): void {
    // Negative ids are plain window timeouts (no worker available).
    if (id < 0) {
        window.clearTimeout(-id);
        return;
    }
    pendingTimeouts.delete(id);
    timeoutWorker?.postMessage({ id, cancel: true });
}
