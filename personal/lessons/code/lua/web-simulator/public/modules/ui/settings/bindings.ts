import { simSettings } from '../../core/state.js';
import type { SettingsDomRefs } from './dom.js';

export function bindGeneralSettingsControls(dom: SettingsDomRefs): void {
    if (dom.showTracerEl) {
        dom.showTracerEl.checked = simSettings.showTracer;
        dom.showTracerEl.addEventListener('change', () => {
            simSettings.showTracer = dom.showTracerEl?.checked ?? false;
        });
    }

    if (dom.tracerColorEl) {
        dom.tracerColorEl.value = simSettings.tracerColor;
        dom.tracerColorEl.addEventListener('input', () => {
            simSettings.tracerColor = dom.tracerColorEl?.value ?? simSettings.tracerColor;
        });
    }

    if (dom.tracerWidthEl) {
        dom.tracerWidthEl.value = simSettings.tracerWidth.toString();
        dom.tracerWidthEl.addEventListener('input', () => {
            simSettings.tracerWidth = parseFloat(dom.tracerWidthEl?.value ?? String(simSettings.tracerWidth));
        });
    }

    if (dom.tracerShapeEl) {
        dom.tracerShapeEl.value = simSettings.tracerShape;
        dom.tracerShapeEl.addEventListener('change', () => {
            simSettings.tracerShape = dom.tracerShapeEl?.value ?? simSettings.tracerShape;
        });
    }

    if (dom.showGizmoEl) {
        dom.showGizmoEl.checked = simSettings.showGizmo;
        dom.showGizmoEl.addEventListener('change', () => {
            simSettings.showGizmo = dom.showGizmoEl?.checked ?? false;
        });
    }

    if (dom.simSpeedEl && dom.simSpeedVal) {
        dom.simSpeedEl.value = simSettings.simSpeed.toString();
        dom.simSpeedVal.textContent = `${simSettings.simSpeed.toFixed(1)}x`;
        dom.simSpeedEl.addEventListener('input', () => {
            simSettings.simSpeed = parseFloat(dom.simSpeedEl?.value ?? String(simSettings.simSpeed));
            if (dom.simSpeedVal) {
                dom.simSpeedVal.textContent = `${simSettings.simSpeed.toFixed(1)}x`;
            }
        });
    }
}
