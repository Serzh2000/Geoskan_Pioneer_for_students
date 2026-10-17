import { currentScriptLanguage } from '../../core/state.js';
import { getEditorValue } from '../../editor/index.js';
import { droneLink, type UploadProgress } from '../../hardware/drone-link.js';
import { isWebSerialSupported } from '../../hardware/web-serial-transport.js';
import { log } from '../../shared/logging/logger.js';
import { droneUploadedNotice, explainDroneError } from '../../shared/notice-messages/catalog.js';
import type { NoticeText } from '../../shared/notice-messages/types.js';

/*
 * The "На дрон" button in the editor toolbar: writes the Lua program to a real Pioneer over USB (Web Serial).
 * It only uploads: the script stays stopped until the student starts it in the "Дрон" panel. Progress is announced
 * in a status line under the toolbar; the outcome - uploaded or not - arrives as a notification and in the journal.
 */

const RESULT_VISIBLE_MS = 6000;

function notify(notice: NoticeText): void {
    (window as unknown as { showSimulationNotice?: (payload: NoticeText) => void }).showSimulationNotice?.(notice);
}

/** A thrown value in the shape explainDroneError reads (name/message/code), whatever class it is. */
function toErrorLike(error: unknown): { name?: string; message?: string; code?: string } {
    if (error instanceof DOMException) return { name: error.name, message: error.message };
    if (error instanceof Error) return { name: error.name, message: error.message, code: (error as { code?: string }).code };
    return { message: String(error ?? '') };
}

export function initEditorDroneUpload(): void {
    const button = document.getElementById('drone-upload-btn') as HTMLButtonElement | null;
    const status = document.getElementById('drone-upload-status');
    const languageSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (!button || !status) return;
    let busy = false;
    let clearTimer: number | undefined;

    const setStatus = (text: string, tone: 'info' | 'ok' | 'error' = 'info') => {
        window.clearTimeout(clearTimer);
        status.textContent = text;
        status.dataset.tone = tone;
        if (tone !== 'info' && text) clearTimer = window.setTimeout(() => { status.textContent = ''; }, RESULT_VISIBLE_MS);
    };

    const syncAvailability = () => {
        button.hidden = currentScriptLanguage !== 'lua';
        if (button.hidden) status.textContent = '';
    };
    syncAvailability();
    // The language handler runs first; read the state once it has settled.
    languageSelect?.addEventListener('change', () => window.requestAnimationFrame(syncAvailability));
    // Выбор Пионера Мини 2 сам переключает язык на Python - кнопка Lua-загрузки прячется и тогда.
    window.addEventListener('drone-selection-changed', () => window.setTimeout(syncAvailability, 0));

    button.addEventListener('click', async () => {
        if (busy) return;
        if (!isWebSerialSupported()) {
            const unsupported = explainDroneError({ name: 'SerialUnavailableError', message: 'Chrome или Edge' });
            setStatus(unsupported.title, 'error');
            notify(unsupported);
            return;
        }
        busy = true;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        const onProgress = (progress: UploadProgress) => {
            const percent = progress.fraction === undefined ? '' : ` ${Math.round(progress.fraction * 100)}%`;
            setStatus(`${progress.message}${percent}`);
        };
        try {
            const result = await droneLink.upload(getEditorValue(), onProgress);
            const info = droneLink.getSnapshot().info;
            const where = info ? `борт №${info.boardNumber}` : 'дрон';
            const done = droneUploadedNotice(result.bytes, where);
            setStatus('Загружено. Запустить программу можно в панели «Дрон».', 'ok');
            notify(done);
            log(`[DRONE] Программа загружена: ${result.bytes} байт, ${where}. Скрипт не запущен.`, 'info');
        } catch (error) {
            const failure = explainDroneError(toErrorLike(error), 'upload');
            setStatus(failure.title, 'error');
            notify(failure);
            log(`[DRONE] ${failure.title}: ${failure.message.replace(/`/g, '')}`, failure.level === 'error' ? 'error' : 'info');
        } finally {
            busy = false;
            button.disabled = false;
            button.removeAttribute('aria-busy');
        }
    });
}
