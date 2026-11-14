import type { AutopilotPreset } from './presets.js';
import { escapeHtml } from './helpers.js';

export type PresetChoice = 'drone' | 'load';

/**
 * Окно выбора готового набора параметров. Возвращает, что сделать с набором: применить к дрону (дальше обычная запись на дрон
 * с показом изменений) или только загрузить в окно, либо null при отмене.
 */
export function askPreset(host: HTMLElement, preset: AutopilotPreset): Promise<PresetChoice | null> {
    return new Promise((resolve) => {
        const layer = document.createElement('div');
        layer.className = 'autopilot-drone-dialog';
        layer.innerHTML = `
            <div class="autopilot-drone-dialog__card" role="dialog" aria-modal="true" aria-label="Готовый набор параметров">
                <div class="autopilot-drone-dialog__title">${escapeHtml(preset.title)}</div>
                <div class="autopilot-drone-dialog__hint">${escapeHtml(preset.summary)}</div>
                <ul class="autopilot-preset-facts">${preset.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                <div class="autopilot-drone-dialog__hint">
                    «Применить к дрону» прочитает ваш дрон и покажет, что именно изменится. Калибровки датчиков, номер борта и счётчики
                    по умолчанию не пишутся, а перед записью профиль дрона сохраняется файлом. «Загрузить в окно» ничего не отправляет на дрон.
                </div>
                <div class="autopilot-drone-dialog__actions">
                    <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-dialog="cancel">Отмена</button>
                    <button type="button" class="autopilot-action-btn autopilot-action-btn--ghost" data-dialog="load">Загрузить в окно</button>
                    <button type="button" class="autopilot-action-btn" data-dialog="drone">Применить к дрону</button>
                </div>
            </div>`;
        const finish = (value: PresetChoice | null) => {
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
        layer.querySelector('[data-dialog="cancel"]')?.addEventListener('click', () => finish(null));
        layer.querySelector('[data-dialog="load"]')?.addEventListener('click', () => finish('load'));
        layer.querySelector('[data-dialog="drone"]')?.addEventListener('click', () => finish('drone'));
        host.appendChild(layer);
        (layer.querySelector('[data-dialog="drone"]') as HTMLButtonElement | null)?.focus();
    });
}
