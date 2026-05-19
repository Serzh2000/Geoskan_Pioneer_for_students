import type { ActionAuxChannelKey, ChannelKey, PrimaryChannelKey } from './types.js';

export type AuxRangeControlRefs = {
    card: HTMLElement | null;
    presetSelect: HTMLSelectElement | null;
    minSlider: HTMLInputElement | null;
    maxSlider: HTMLInputElement | null;
    minValueEl: HTMLElement | null;
    maxValueEl: HTMLElement | null;
    liveValueEl: HTMLElement | null;
    metaEl: HTMLElement | null;
    fillEl: HTMLElement | null;
    markerEl: HTMLElement | null;
};

export type SettingsDomRefs = {
    showTracerEl: HTMLInputElement | null;
    tracerColorEl: HTMLInputElement | null;
    tracerColorVal: HTMLElement | null;
    tracerWidthEl: HTMLInputElement | null;
    tracerWidthVal: HTMLElement | null;
    tracerShapeEl: HTMLSelectElement | null;
    showGizmoEl: HTMLInputElement | null;
    simSpeedEl: HTMLInputElement | null;
    simSpeedVal: HTMLElement | null;
    gamepadStatusEl: HTMLElement | null;
    gamepadInfoEl: HTMLElement | null;
    autoStatusEl: HTMLElement | null;
    channelDataStatusEl: HTMLElement | null;
    modeMetaEl: HTMLElement | null;
    gpStickModeSelect: HTMLSelectElement | null;
    gpBtnCalibrate: HTMLButtonElement | null;
    gpBtnResetCal: HTMLButtonElement | null;
    mappingSelects: Record<ChannelKey, HTMLSelectElement | null>;
    valueEls: Record<ChannelKey, HTMLElement | null>;
    invCheckboxes: Record<PrimaryChannelKey, HTMLInputElement | null>;
    bars: Record<PrimaryChannelKey, HTMLElement | null>;
    autoButtons: Record<ChannelKey, HTMLButtonElement | null>;
    auxRangeControls: Record<ActionAuxChannelKey, AuxRangeControlRefs>;
};

export function collectSettingsDomRefs(): SettingsDomRefs {
    return {
        showTracerEl: document.getElementById('setting-show-tracer') as HTMLInputElement | null,
        tracerColorEl: document.getElementById('setting-tracer-color') as HTMLInputElement | null,
        tracerColorVal: document.getElementById('setting-tracer-color-val'),
        tracerWidthEl: document.getElementById('setting-tracer-width') as HTMLInputElement | null,
        tracerWidthVal: document.getElementById('tracer-width-val'),
        tracerShapeEl: document.getElementById('setting-tracer-shape') as HTMLSelectElement | null,
        showGizmoEl: document.getElementById('setting-show-gizmo') as HTMLInputElement | null,
        simSpeedEl: document.getElementById('setting-sim-speed') as HTMLInputElement | null,
        simSpeedVal: document.getElementById('sim-speed-val'),
        gamepadStatusEl: document.getElementById('gamepad-status'),
        gamepadInfoEl: document.getElementById('gamepad-info'),
        autoStatusEl: document.getElementById('gp-auto-status'),
        channelDataStatusEl: document.getElementById('gp-channel-data-status'),
        modeMetaEl: document.getElementById('gp-mode-meta'),
        gpStickModeSelect: document.getElementById('gp-stick-mode') as HTMLSelectElement | null,
        gpBtnCalibrate: document.getElementById('gp-btn-calibrate') as HTMLButtonElement | null,
        gpBtnResetCal: document.getElementById('gp-btn-reset-cal') as HTMLButtonElement | null,
        mappingSelects: {
            roll: document.getElementById('gp-map-roll') as HTMLSelectElement | null,
            pitch: document.getElementById('gp-map-pitch') as HTMLSelectElement | null,
            throttle: document.getElementById('gp-map-throttle') as HTMLSelectElement | null,
            yaw: document.getElementById('gp-map-yaw') as HTMLSelectElement | null,
            mode: document.getElementById('gp-map-mode') as HTMLSelectElement | null,
            arm: document.getElementById('gp-map-arm') as HTMLSelectElement | null,
            magnet: document.getElementById('gp-map-magnet') as HTMLSelectElement | null
        },
        valueEls: {
            roll: document.getElementById('gp-val-roll'),
            pitch: document.getElementById('gp-val-pitch'),
            throttle: document.getElementById('gp-val-throttle'),
            yaw: document.getElementById('gp-val-yaw'),
            mode: document.getElementById('gp-val-mode'),
            arm: document.getElementById('gp-val-arm'),
            magnet: document.getElementById('gp-val-magnet')
        },
        invCheckboxes: {
            roll: document.getElementById('gp-inv-roll') as HTMLInputElement | null,
            pitch: document.getElementById('gp-inv-pitch') as HTMLInputElement | null,
            throttle: document.getElementById('gp-inv-throttle') as HTMLInputElement | null,
            yaw: document.getElementById('gp-inv-yaw') as HTMLInputElement | null
        },
        bars: {
            roll: document.getElementById('gp-bar-roll'),
            pitch: document.getElementById('gp-bar-pitch'),
            throttle: document.getElementById('gp-bar-throttle'),
            yaw: document.getElementById('gp-bar-yaw')
        },
        autoButtons: {
            roll: document.getElementById('gp-auto-roll') as HTMLButtonElement | null,
            pitch: document.getElementById('gp-auto-pitch') as HTMLButtonElement | null,
            throttle: document.getElementById('gp-auto-throttle') as HTMLButtonElement | null,
            yaw: document.getElementById('gp-auto-yaw') as HTMLButtonElement | null,
            mode: document.getElementById('gp-auto-mode') as HTMLButtonElement | null,
            arm: document.getElementById('gp-auto-arm') as HTMLButtonElement | null,
            magnet: document.getElementById('gp-auto-magnet') as HTMLButtonElement | null
        },
        auxRangeControls: {
            arm: {
                card: document.getElementById('gp-range-arm-card'),
                presetSelect: document.getElementById('gp-range-arm-preset') as HTMLSelectElement | null,
                minSlider: document.getElementById('gp-range-arm-min') as HTMLInputElement | null,
                maxSlider: document.getElementById('gp-range-arm-max') as HTMLInputElement | null,
                minValueEl: document.getElementById('gp-range-arm-min-val'),
                maxValueEl: document.getElementById('gp-range-arm-max-val'),
                liveValueEl: document.getElementById('gp-range-arm-live'),
                metaEl: document.getElementById('gp-range-arm-meta'),
                fillEl: document.getElementById('gp-range-fill-arm'),
                markerEl: document.getElementById('gp-range-marker-arm')
            },
            magnet: {
                card: document.getElementById('gp-range-magnet-card'),
                presetSelect: document.getElementById('gp-range-magnet-preset') as HTMLSelectElement | null,
                minSlider: document.getElementById('gp-range-magnet-min') as HTMLInputElement | null,
                maxSlider: document.getElementById('gp-range-magnet-max') as HTMLInputElement | null,
                minValueEl: document.getElementById('gp-range-magnet-min-val'),
                maxValueEl: document.getElementById('gp-range-magnet-max-val'),
                liveValueEl: document.getElementById('gp-range-magnet-live'),
                metaEl: document.getElementById('gp-range-magnet-meta'),
                fillEl: document.getElementById('gp-range-fill-magnet'),
                markerEl: document.getElementById('gp-range-marker-magnet')
            }
        }
    };
}
