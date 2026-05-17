export type SettingsDomRefs = {
    showTracerEl: HTMLInputElement | null;
    tracerColorEl: HTMLInputElement | null;
    tracerWidthEl: HTMLInputElement | null;
    tracerShapeEl: HTMLSelectElement | null;
    showGizmoEl: HTMLInputElement | null;
    simSpeedEl: HTMLInputElement | null;
    simSpeedVal: HTMLElement | null;
    rcSetupRoot: HTMLElement | null;
};

export function collectSettingsDomRefs(): SettingsDomRefs {
    return {
        showTracerEl: document.getElementById('setting-show-tracer') as HTMLInputElement | null,
        tracerColorEl: document.getElementById('setting-tracer-color') as HTMLInputElement | null,
        tracerWidthEl: document.getElementById('setting-tracer-width') as HTMLInputElement | null,
        tracerShapeEl: document.getElementById('setting-tracer-shape') as HTMLSelectElement | null,
        showGizmoEl: document.getElementById('setting-show-gizmo') as HTMLInputElement | null,
        simSpeedEl: document.getElementById('setting-sim-speed') as HTMLInputElement | null,
        simSpeedVal: document.getElementById('sim-speed-val'),
        rcSetupRoot: document.getElementById('rc-setup-root')
    };
}
