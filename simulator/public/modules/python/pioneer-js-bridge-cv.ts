import { latestMarkerDetections, markersInFrame } from './marker-detection.js';
import { recordLearningEvent } from '../core/learning-journal.js';
import { getDroneOrDefault } from './runtime-shared.js';
import { destroyAllCvWindows, drawCvFrame, isCvWindowShowing, openCvWindow, setCvWindowCloseHandler, showCvText, type CvTextOverlay } from './cv-window.js';

let cvKeyboardInstalled = false;
let lastCvKeyCode = -1;

function installCvKeyboardBridge() {
    if (cvKeyboardInstalled || typeof window === 'undefined') return;
    cvKeyboardInstalled = true;
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            lastCvKeyCode = 27;
            return;
        }
        if (event.key && event.key.length === 1) {
            lastCvKeyCode = event.key.charCodeAt(0);
        }
    });
}

function renderCvFrameSummary(frame: unknown) {
    if (!frame) {
        return 'Кадр не получен.\nПроверьте, находится ли дрон в зоне видеомачты.';
    }

    if (typeof frame === 'object') {
        const payload = frame as Record<string, unknown>;
        if (payload.connected === false) {
            const details = typeof payload.message === 'string'
                ? payload.message
                : 'Камера не подключена.';
            return `Камера не подключена.\n${details}\n\nЧто сделать:\n1. Добавьте в сцену видеомачту.\n2. Подлетите дроном ближе к ней.\n3. Запустите пример снова или дождитесь следующего кадра.`;
        }
        if (payload.source === 'video-tower') {
            const lines = [
                'Источник: видеомачта',
                `Tower: ${String(payload.towerName || payload.towerId || 'unknown')}`,
                `Connected: ${String(payload.connected ?? true)}`,
                `Distance: ${String(payload.distance ?? '?')} m`,
                `Drone: ${JSON.stringify(payload.drone_position ?? payload.dronePosition ?? [])}`,
                `Tower: ${JSON.stringify(payload.tower_position ?? [])}`,
                `Delta: ${JSON.stringify(payload.delta ?? [])}`
            ];
            return lines.join('\n');
        }
        if (payload.source === 'fpv-direct') {
            const lines = [
                'Источник: FPV-камера дрона',
                `Connected: ${String(payload.connected ?? true)}`,
                `Distance: ${String(payload.distance ?? 'n/a')}`,
                `Drone: ${JSON.stringify(payload.drone_position ?? payload.dronePosition ?? [])}`
            ];
            return lines.join('\n');
        }
        return JSON.stringify(payload, null, 2);
    }

    return String(frame);
}

export function installCvRuntimeAPI(w: any) {
    installCvKeyboardBridge();
    // Кнопка «Закрыть» окна - как Esc: cv2.waitKey вернёт 27.
    setCvWindowCloseHandler(() => { lastCvKeyCode = 27; });
    // [[id, [[x, y] x4]], ...] for the last captured frame, one dictionary.
    w.pioneer_cv_detect_markers = (dictionary: string, frameId = 0) => {
        const id = String(w.SIM_DRONE_ID || '');
        const drone = getDroneOrDefault(id);
        const markers = frameId ? markersInFrame(Number(frameId), String(dictionary), id) : latestMarkerDetections(String(dictionary || ''));
        recordLearningEvent(id, { kind: 'detect', time: drone.current_time, dictionary: String(dictionary), frameId: Number(frameId), markers, pos: { ...drone.pos }, yaw: drone.orientation.yaw });
        return markers.map(marker => [marker.id, marker.corners]);
    };
    w.pioneer_cv_annotation = (x: number, y: number) => {
        const id = String(w.SIM_DRONE_ID || '');
        recordLearningEvent(id, { kind: 'annotation', time: getDroneOrDefault(id).current_time, point: { x: Number(x), y: Number(y) } });
    };
    // Кадр приходит буфером (numpy-массив или bytes) - без списка из сотен тысяч чисел,
    // на который уходило по 40 мс на кадр.
    w.pioneer_cv_imshow_pixels = (windowName: string, width: number, height: number, raw: any, rawTexts?: any, format: string = 'bgr') => {
        const wFrame = Math.trunc(Number(width)), hFrame = Math.trunc(Number(height));
        if (wFrame < 1 || hFrame < 1 || wFrame * hFrame > 1920 * 1080) return null;
        const cvWindow = openCvWindow(String(windowName || 'Камера'));
        const id = String(w.SIM_DRONE_ID || '');
        recordLearningEvent(id, { kind: 'display', time: getDroneOrDefault(id).current_time, width: wFrame, height: hFrame });
        if (!cvWindow || !isCvWindowShowing(cvWindow)) return null;
        let buffer: { data: Uint8Array; release: () => void } | null = null;
        try {
            let data: ArrayLike<number> | null;
            if (typeof raw?.getBuffer === 'function') {
                buffer = raw.getBuffer('u8');
                data = buffer!.data;
            } else {
                data = typeof raw?.toJs === 'function' ? raw.toJs() : raw;
            }
            const rgba = format === 'rgba';
            if (!data || data.length !== wFrame * hFrame * (rgba ? 4 : 3)) return null;
            const texts = (typeof rawTexts?.toJs === 'function' ? rawTexts.toJs() : rawTexts) as CvTextOverlay[] | null | undefined;
            drawCvFrame(cvWindow, wFrame, hFrame, data, texts, rgba ? 'rgba' : 'bgr');
        } finally {
            buffer?.release();
        }
        return null;
    };
    w.pioneer_cv_imshow = (windowName: string, frame: unknown) => {
        const cvWindow = openCvWindow(String(windowName || 'OpenCV Preview'));
        if (!cvWindow) return null;
        showCvText(cvWindow, renderCvFrameSummary(frame));
        return null;
    };
    w.pioneer_cv_wait_key = (_delayMs: number) => {
        const keyCode = lastCvKeyCode;
        lastCvKeyCode = -1;
        return keyCode;
    };
    w.pioneer_cv_destroy_all_windows = () => {
        destroyAllCvWindows();
        return null;
    };
}
