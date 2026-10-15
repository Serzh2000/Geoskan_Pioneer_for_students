import type { WebGLRenderer } from 'three';

// Opt-in diagnostics, read through the existing FPS badge. No UI or polling on normal runs.
const enabled = typeof window !== 'undefined' && typeof window.location?.search === 'string' && new URLSearchParams(window.location.search).has('render-metrics');
type Sample = { frameMs: number; submissionMs: number; calls: number; triangles: number };
const samples: Sample[] = [];
let lastStart = 0;
let publishedAt = 0;

export function startRenderSample(): number | null {
    return enabled ? performance.now() : null;
}

export function finishRenderSample(renderer: WebGLRenderer, startedAt: number | null): void {
    if (startedAt === null) return;
    const now = performance.now();
    if (lastStart) {
        samples.push({ frameMs: startedAt - lastStart, submissionMs: now - startedAt,
            calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
        if (samples.length > 240) samples.shift();
    }
    lastStart = startedAt;
    if (now - publishedAt < 1000 || !samples.length) return;
    publishedAt = now;
    const badge = document.getElementById('scene-fps');
    if (!badge) return;
    const stats = (key: keyof Sample) => {
        const values = samples.map(sample => sample[key]).sort((a, b) => a - b);
        return { median: values[Math.floor(values.length / 2)], p95: values[Math.min(values.length - 1, Math.ceil(values.length * .95) - 1)] };
    };
    badge.dataset.renderMetrics = JSON.stringify({ samples: samples.length, capturedAt: now,
        frameMs: stats('frameMs'), submissionMs: stats('submissionMs'), calls: stats('calls'), triangles: stats('triangles'),
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        width: renderer.domElement.width, height: renderer.domElement.height });
}
