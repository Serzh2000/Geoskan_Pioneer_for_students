import { droneLink, type DroneLink } from '../../../hardware/drone-link.js';
import { dronePropertiesText, planParamWrite, type ParamChange, type WritePlan } from '../../../hardware/drone-params.js';
import { log } from '../../../shared/logging/logger.js';
import { getAutopilotSettingsState, importAutopilotProperties } from '../autopilot-params-model.js';
import { downloadTextFile, escapeHtml, formatNumber } from './helpers.js';
import type { FlashMessage } from './types.js';

/*
 * "С дрона" and "На дрон" in the autopilot parameters window. Reading imports the drone's values like a file would.
 * Writing never starts from a click alone: it reads the drone, shows what would change, saves the drone's current
 * profile as a file, and only then writes what the person left ticked.
 */

export type DroneSyncHost = {
    getAuthor: () => string;
    /** Element the confirmation dialog is drawn into (the modal, so it shares its look). */
    getDialogHost: () => HTMLElement | null;
    setFlash: (flash: FlashMessage | null) => void;
    /** Redraws the window. Heavy: not called for progress ticks. */
    render: () => void;
    /** Called after values changed in the model, to drop stale drafts and mark the source as modified. */
    onModelChanged: () => void;
};

export type DroneSync = {
    readFromDrone: () => Promise<void>;
    writeToDrone: () => Promise<void>;
    isBusy: () => boolean;
};

const PROGRESS_ID = 'autopilot-drone-progress';

function setProgress(text: string) {
    const element = document.getElementById(PROGRESS_ID);
    if (element) {
        element.textContent = text;
        element.hidden = !text;
    }
}

function describeError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function boardLabel(link: DroneLink) {
    const info = link.getSnapshot().info;
    return info ? `№${info.boardNumber}` : 'неизвестного борта';
}

/** Asks the person which of the planned changes to write. Resolves to the chosen changes, or null on cancel. */
function confirmWrite(host: HTMLElement, plan: WritePlan, board: string): Promise<ParamChange[] | null> {
    return new Promise((resolve) => {
        const layer = document.createElement('div');
        layer.className = 'autopilot-drone-dialog';
        const rows = plan.changes.map((change, index) => `
            <label class="autopilot-drone-dialog__row${change.linkNote ? ' is-critical' : ''}">
                <input type="checkbox" data-change="${index}"${change.protectedByDefault ? '' : ' checked'}>
                <span class="autopilot-drone-dialog__name">${escapeHtml(change.name)}</span>
                <span class="autopilot-drone-dialog__values">${escapeHtml(formatNumber(change.from))} → <strong>${escapeHtml(formatNumber(change.to))}</strong></span>
                ${change.protectedByDefault ? '<span class="autopilot-drone-dialog__tag">калибровка или идентификатор борта, по умолчанию не пишется</span>' : ''}
                ${change.linkNote ? `<span class="autopilot-drone-dialog__note">${escapeHtml(change.linkNote)}</span>` : ''}
            </label>`).join('');
        const facts = [
            `Без изменений: ${plan.unchanged}.`,
            plan.missingOnDrone.length ? `Нет в прошивке дрона, не будут записаны: ${plan.missingOnDrone.length}.` : '',
            plan.notInProfile.length ? `Есть на дроне, но не в профиле, останутся как есть: ${plan.notInProfile.length}.` : ''
        ].filter(Boolean).join(' ');
        layer.innerHTML = `
            <div class="autopilot-drone-dialog__card" role="dialog" aria-modal="true" aria-label="Запись параметров на дрон">
                <div class="autopilot-drone-dialog__title">Записать параметры на дрон ${escapeHtml(board)}</div>
                <div class="autopilot-drone-dialog__hint">Перед записью профиль дрона будет скачан файлом, чтобы можно было вернуть всё обратно. ${escapeHtml(facts)}</div>
                <div class="autopilot-drone-dialog__list">${rows}</div>
                <div class="autopilot-drone-dialog__actions">
                    <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-dialog="cancel">Отмена</button>
                    <button type="button" class="autopilot-action-btn" data-dialog="write">Записать</button>
                </div>
            </div>`;
        const finish = (value: ParamChange[] | null) => {
            document.removeEventListener('keydown', onKey, true);
            layer.remove();
            resolve(value);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            finish(null);
        };
        document.addEventListener('keydown', onKey, true);
        const writeButton = layer.querySelector('[data-dialog="write"]') as HTMLButtonElement;
        const refreshButton = () => {
            const picked = layer.querySelectorAll('input[data-change]:checked').length;
            writeButton.disabled = picked === 0;
            writeButton.textContent = picked ? `Записать (${picked})` : 'Записать';
        };
        layer.addEventListener('change', refreshButton);
        layer.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => finish(null));
        writeButton.addEventListener('click', () => {
            const picked = Array.from(layer.querySelectorAll('input[data-change]:checked'))
                .map((input) => plan.changes[Number((input as HTMLInputElement).dataset.change)]);
            finish(picked);
        });
        host.appendChild(layer);
        refreshButton();
        writeButton.focus();
    });
}

export function createDroneSync(host: DroneSyncHost, link: DroneLink = droneLink): DroneSync {
    let busy = false;

    /** The first await in the click handler must be the connect: the browser's port picker needs the fresh click. */
    const ensureConnected = async () => {
        if (link.getSnapshot().status === 'connected') return;
        setProgress('Подключаюсь к дрону…');
        await link.connect();
    };

    const readParams = async () => {
        await ensureConnected();
        return link.readParameters((done, total) => setProgress(`Читаю параметры с дрона: ${done} из ${total}`));
    };

    const run = async (task: () => Promise<void>, failure: string) => {
        if (busy) return;
        busy = true;
        host.setFlash(null);
        host.render();
        try {
            await task();
        } catch (error) {
            host.setFlash({ kind: 'error', text: `${failure}: ${describeError(error)}` });
            log(`[AUTOPILOT] ${failure}: ${describeError(error)}`, 'error');
        } finally {
            busy = false;
            setProgress('');
            host.render();
        }
    };

    return {
        isBusy: () => busy,

        readFromDrone: () => run(async () => {
            const params = await readParams();
            const board = boardLabel(link);
            const text = dronePropertiesText(params, `Дрон ${board}, ${new Date().toISOString()}`);
            const result = importAutopilotProperties(text, `Дрон ${board}`, host.getAuthor());
            if (!result.ok) throw new Error(result.errors.slice(0, 2).join(' '));
            host.onModelChanged();
            host.setFlash({
                kind: 'success',
                text: `Прочитано параметров с дрона ${board}: ${params.length}. Отличается от прежних значений: ${result.changedKeys.length}.`
            });
            log(`[AUTOPILOT] Прочитаны параметры с дрона ${board}: ${params.length}.`, 'success');
        }, 'Не удалось прочитать параметры с дрона'),

        writeToDrone: () => run(async () => {
            const params = await readParams();
            const board = boardLabel(link);
            const plan = planParamWrite(params, getAutopilotSettingsState().values);
            if (plan.changes.length === 0) {
                host.setFlash({ kind: 'info', text: `Дрон ${board} уже соответствует текущему профилю: различий нет.` });
                return;
            }
            const dialogHost = host.getDialogHost();
            if (!dialogHost) throw new Error('не найдено окно для подтверждения');
            setProgress('');
            const chosen = await confirmWrite(dialogHost, plan, board);
            if (!chosen || chosen.length === 0) {
                host.setFlash({ kind: 'info', text: 'Запись на дрон отменена, ничего не изменено.' });
                return;
            }
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            downloadTextFile(`drone-backup-${board.replace('№', '')}-${stamp}.properties`, dronePropertiesText(params, `Дрон ${board} до записи, ${stamp}`));
            const result = await link.writeParameters(chosen, (done, total, name) =>
                setProgress(name ? `Записываю ${name} (${done + 1} из ${total})` : `Записано ${done} из ${total}`)
            );
            const notes = chosen.filter((change) => change.linkNote && result.written.includes(change.name));
            if (result.failed) {
                host.setFlash({
                    kind: 'error',
                    text: `Записано ${result.written.length} из ${chosen.length}. Остановился на ${result.failed.name}: ${result.failed.error} Резервный файл профиля дрона уже скачан.`
                });
                log(`[AUTOPILOT] Запись на дрон остановилась на ${result.failed.name}.`, 'error');
                return;
            }
            host.setFlash({
                kind: 'success',
                text: `На дрон ${board} записано параметров: ${result.written.length}, каждый проверен чтением.`
                    + (notes.length ? ` ${notes.map((change) => change.linkNote).join(' ')}` : '')
            });
            log(`[AUTOPILOT] На дрон ${board} записано параметров: ${result.written.length}.`, 'success');
        }, 'Не удалось записать параметры на дрон')
    };
}

export { PROGRESS_ID as DRONE_PROGRESS_ID };
