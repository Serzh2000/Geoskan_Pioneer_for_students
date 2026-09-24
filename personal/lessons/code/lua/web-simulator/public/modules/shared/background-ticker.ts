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
