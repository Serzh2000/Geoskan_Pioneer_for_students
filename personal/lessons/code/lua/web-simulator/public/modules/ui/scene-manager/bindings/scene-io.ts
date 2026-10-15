import { log } from '../../../shared/logging/logger.js';
import { sceneFileName } from '../../../shared/funny-names.js';
import { sceneEmptyNotice, sceneLoadFailedNotice, sceneLoadedNotice, sceneSavedNotice } from '../../../shared/notice-messages/catalog.js';
import type { NoticeText } from '../../../shared/notice-messages/types.js';
import { applySceneImport, buildSceneExport, parseSceneImport } from '../scene-io.js';
import type { BindingOptions } from './shared.js';

function notify(notice: NoticeText) {
    (window as unknown as { showSimulationNotice?: (payload: NoticeText) => void }).showSimulationNotice?.(notice);
}

export function registerSceneIoBindings({ callbacks, render }: BindingOptions) {
    const exportBtn = document.getElementById('scene-export-btn') as HTMLButtonElement | null;
    const importBtn = document.getElementById('scene-import-btn') as HTMLButtonElement | null;
    const importInput = document.getElementById('scene-import-input') as HTMLInputElement | null;

    exportBtn?.addEventListener('click', () => {
        const data = buildSceneExport(callbacks);
        if (data.objects.length === 0) {
            log('На сцене нет объектов для сохранения - добавьте что-нибудь сначала', 'warn');
            notify(sceneEmptyNotice());
            return;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = sceneFileName();
        link.click();
        URL.revokeObjectURL(url);
        log(`Сцена сохранена: ${data.objects.length} объект(ов)`, 'success');
        notify(sceneSavedNotice(data.objects.length));
    });

    importBtn?.addEventListener('click', () => importInput?.click());

    importInput?.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            try {
                const data = parseSceneImport(String(loadEvent.target?.result || ''));
                const { added, failed } = applySceneImport(callbacks, data);
                render();
                if (added > 0) {
                    log(`Сцена загружена: добавлено ${added} объект(ов)${failed ? `, ${failed} пропущено` : ''}`, 'success');
                    notify(sceneLoadedNotice(added, failed));
                } else {
                    log('Не удалось добавить ни одного объекта из файла сцены', 'warn');
                    notify(sceneLoadFailedNotice());
                }
            } catch (error) {
                log(`Не удалось прочитать файл сцены: ${(error as Error).message}`, 'error');
                notify(sceneLoadFailedNotice((error as Error).message));
            }
        };
        reader.readAsText(file);
        importInput.value = '';
    });
}
