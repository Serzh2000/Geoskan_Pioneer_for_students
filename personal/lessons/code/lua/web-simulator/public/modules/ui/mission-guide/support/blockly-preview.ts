import { Blockly } from '../../../editor/blockly-mode/loader.js';
import { getMainBlocklyWorkspace } from '../../../editor/index.js';

// Зеркалит support/scene-preview.ts: та же идея переноса живого DOM-узла в
// хост внутри гайда, но для Blockly-воркспейса вместо 3D-сцены. Воркспейс
// инжектится Blockly.inject() один раз в #blockly-editor-canvas (см.
// public/modules/editor/blockly/workspace-controller.ts) и остаётся тем же
// самым DOM-объектом на всё время жизни страницы — мы просто переставляем его
// родителя, а не создаём/уничтожаем воркспейс заново.
//
// Важное отличие от scene-preview: рендер гайда (renderMissionGuidePanel в
// panel.ts) на каждый rerender() делает container.innerHTML = renderGuide(...),
// что физически уничтожает наш старый host-див вместе со всем, что было внутри
// него в момент рендера — но переставленный сюда #blockly-editor-canvas-host
// переживает это как отсоединённый (detached) узел, потому что на него все
// ещё ссылается cachedCanvasHost. panel.ts вызывает mountMissionGuideScenePreview()
// после такой замены (её файл нам трогать нельзя — см. границы задачи), поэтому
// мы вместо аналогичного точечного вызова наблюдаем за #mission-guide-modal-body
// через MutationObserver и сами перевешиваем узел обратно в свежий host при
// каждом перерендере, а если в новом рендере host-дива для Blockly вообще нет
// (ушли со шага "Собрать" на другой таб) — сами восстанавливаем воркспейс на
// его обычное место в редакторе.

let previewActive = false;
let originalParent: ParentNode | null = null;
let originalNextSibling: ChildNode | null = null;
let cachedCanvasHost: HTMLElement | null = null;
let modalBodyObserver: MutationObserver | null = null;

function getBlocklyCanvasHost(): HTMLElement | null {
    if (cachedCanvasHost && document.documentElement.contains(cachedCanvasHost)) {
        return cachedCanvasHost;
    }
    cachedCanvasHost = document.getElementById('blockly-editor-canvas-host');
    return cachedCanvasHost;
}

function getPreviewHost(): HTMLDivElement | null {
    return document.getElementById('mission-guide-blockly-preview-host') as HTMLDivElement | null;
}

function resizeBlocklySoon(): void {
    const triggerResize = () => {
        const workspace = getMainBlocklyWorkspace();
        try {
            if (workspace && Blockly) {
                Blockly.svgResize(workspace);
            }
        } catch (error) {
            console.warn('[GUIDE-BLOCKLY-PREVIEW] svgResize failed', error);
        }
        window.dispatchEvent(new Event('resize'));
    };

    window.requestAnimationFrame(triggerResize);
    // Первый инжект Blockly (динамическая подгрузка пакета) может завершиться
    // чуть позже, чем наш rAF — добиваем ещё парой отложенных попыток, реальный
    // ResizeObserver внутри blockly/support.ts подхватит размер сам, это просто
    // подстраховка на случай, если он ещё не был подписан на момент переноса.
    window.setTimeout(triggerResize, 150);
    window.setTimeout(triggerResize, 500);
}

function reattachIfNeeded(): void {
    if (!previewActive) return;

    const canvasHost = cachedCanvasHost;
    if (!canvasHost) return;

    const previewHost = getPreviewHost();
    if (previewHost) {
        if (canvasHost.parentElement !== previewHost) {
            previewHost.appendChild(canvasHost);
            previewHost.classList.add('is-active');
            resizeBlocklySoon();
        }
        return;
    }

    // Рендер сменил активный шаг гайда (ушли со "Собрать") — хост-дива для
    // Blockly в новой разметке нет, возвращаем воркспейс домой сами, раз
    // interactions/navigation.ts нам трогать нельзя.
    restoreMissionGuideBlocklyPreview();
}

function ensureModalBodyObserver(): void {
    if (modalBodyObserver) return;
    const modalBody = document.getElementById('mission-guide-modal-body');
    if (!modalBody) return;

    modalBodyObserver = new MutationObserver(() => reattachIfNeeded());
    modalBodyObserver.observe(modalBody, { childList: true });
}

export function isMissionGuideBlocklyPreviewActive(): boolean {
    return previewActive;
}

export function mountMissionGuideBlocklyPreview(): void {
    const canvasHost = getBlocklyCanvasHost();
    const previewHost = getPreviewHost();
    if (!canvasHost || !previewHost) return;

    if (!originalParent) {
        originalParent = canvasHost.parentNode;
        originalNextSibling = canvasHost.nextSibling;
    }

    if (canvasHost.parentElement !== previewHost) {
        previewHost.appendChild(canvasHost);
    }

    previewHost.classList.add('is-active');
    previewActive = true;
    ensureModalBodyObserver();
    resizeBlocklySoon();
}

export function restoreMissionGuideBlocklyPreview(): void {
    const canvasHost = cachedCanvasHost || document.getElementById('blockly-editor-canvas-host');

    if (canvasHost && originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
            originalParent.insertBefore(canvasHost, originalNextSibling);
        } else {
            originalParent.appendChild(canvasHost);
        }
    }

    getPreviewHost()?.classList.remove('is-active');

    originalParent = null;
    originalNextSibling = null;
    previewActive = false;
    cachedCanvasHost = canvasHost;
    resizeBlocklySoon();
}
