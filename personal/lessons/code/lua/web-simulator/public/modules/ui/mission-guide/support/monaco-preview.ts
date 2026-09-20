import { setBlocklyEditorEnabled, setEditorLanguage, setEditorValue } from '../../../editor/index.js';

// Зеркалит support/blockly-preview.ts: та же идея переноса живого DOM-узла в
// хост внутри гайда, но для текстового (Monaco) редактора вместо Blockly-
// воркспейса — для нового трека "написать код руками" рядом с Blockly-треком.
//
// #monaco-editor-root создаётся один раз в public/modules/editor/dom.ts
// (createEditorShell()) как пустой контейнер:
//   <div id="monaco-editor-root" class="editor-mode-root"></div>
// Сам Monaco инстанс монтируется внутрь него через monaco.editor.create({...})
// в public/modules/editor/text-editor.ts (createTextEditorInstance({ root })),
// который вызывается из editor/index/shell.ts::createEditor(). Monaco кладёт
// свой DOM целиком ВНУТРЬ переданного root-элемента и держится за этот
// элемент как за контейнер на всё время жизни инстанса — сам root никогда не
// пересоздаётся отдельно от инстанса (в отличие от blockly-canvas-host, где
// ровно то же соображение применимо к #blockly-editor-canvas-host, а не к
// заинжекченному Blockly SVG). Значит переставлять безопасно именно
// #monaco-editor-root целиком, тем же способом, каким blockly-preview.ts
// переставляет #blockly-editor-canvas-host: мы не трогаем то, что Monaco
// положил внутрь, мы просто меняем родителя самого контейнера.
//
// Как и в blockly-preview.ts, рендер гайда (renderMissionGuidePanel в
// panel.ts) на каждый rerender() делает container.innerHTML = renderGuide(...),
// что уничтожает наш старый host-див вместе со всем, что было внутри него в
// момент рендера — но переставленный сюда #monaco-editor-root переживает это
// как отсоединённый (detached) узел, потому что на него всё ещё ссылается
// cachedMonacoRoot. Мы наблюдаем за #mission-guide-modal-body через
// MutationObserver и сами перевешиваем узел обратно в свежий host при каждом
// перерендере, а если в новом рендере host-дива для Monaco вообще нет (ушли
// со шага "Собрать" на другой таб/трек) — сами восстанавливаем редактор на
// его обычное место в шелле.

let previewActive = false;
let originalParent: ParentNode | null = null;
let originalNextSibling: ChildNode | null = null;
let cachedMonacoRoot: HTMLElement | null = null;
let modalBodyObserver: MutationObserver | null = null;

// Черновик последнего стартового кода, который мы сами загрузили в редактор —
// используется, чтобы не затирать код, который студент уже начал печатать на
// повторном рендере ТОГО ЖЕ шага той же лекции (renderMissionGuidePanel
// пересоздаёт DOM, но не должен сбрасывать прогресс). Если starterCode
// отличается от этого значения — значит студент перешёл на другую лекцию, и
// подставить новый стартовый код безопасно и нужно.
let lastLoadedStarterCode: string | null = null;

function getMonacoRoot(): HTMLElement | null {
    if (cachedMonacoRoot && document.documentElement.contains(cachedMonacoRoot)) {
        return cachedMonacoRoot;
    }
    cachedMonacoRoot = document.getElementById('monaco-editor-root');
    return cachedMonacoRoot;
}

function getPreviewHost(): HTMLDivElement | null {
    return document.getElementById('mission-guide-monaco-preview-host') as HTMLDivElement | null;
}

function layoutMonacoSoon(): void {
    window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
    });
    // Как и в blockly-preview.ts — подстраховка на случай, если ResizeObserver
    // редактора ещё не подписан в момент переноса (модалка только открылась).
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
}

function reattachIfNeeded(): void {
    if (!previewActive) return;

    const monacoRoot = cachedMonacoRoot;
    if (!monacoRoot) return;

    const previewHost = getPreviewHost();
    if (previewHost) {
        if (monacoRoot.parentElement !== previewHost) {
            previewHost.appendChild(monacoRoot);
            previewHost.querySelector('.guide-monaco-preview__placeholder')?.remove();
            previewHost.classList.add('is-active');
            layoutMonacoSoon();
        }
        return;
    }

    // Рендер сменил активный шаг/трек гайда — host-дива для Monaco в новой
    // разметке нет, возвращаем редактор домой сами, раз render.ts нам трогать
    // нельзя.
    restoreMissionGuideMonacoPreview();
}

function ensureModalBodyObserver(): void {
    if (modalBodyObserver) return;
    const modalBody = document.getElementById('mission-guide-modal-body');
    if (!modalBody) return;

    modalBodyObserver = new MutationObserver(() => reattachIfNeeded());
    modalBodyObserver.observe(modalBody, { childList: true });
}

export function isMissionGuideMonacoPreviewActive(): boolean {
    return previewActive;
}

export async function mountMissionGuideMonacoPreview(language: 'lua' | 'python', starterCode: string): Promise<void> {
    // Трек с текстом — не Blockly, редактор должен показывать код, а не блоки.
    // setBlocklyEditorEnabled синхронно проставляет флаг состояния (см.
    // toggle-controller.ts), поэтому дальнейший setEditorValue() ниже уже
    // попадёт в текстовую ветку, а не в ветку Blockly-воркспейса.
    setBlocklyEditorEnabled(false);
    await setEditorLanguage(language);

    const monacoRoot = getMonacoRoot();
    const previewHost = getPreviewHost();
    if (!monacoRoot || !previewHost) return;

    if (!originalParent) {
        originalParent = monacoRoot.parentNode;
        originalNextSibling = monacoRoot.nextSibling;
    }

    if (monacoRoot.parentElement !== previewHost) {
        previewHost.appendChild(monacoRoot);
    }
    // The host's static markup renders a placeholder for the moment before
    // mount completes; once the real editor is appended it must go, or the
    // two stack visibly (host is plain block flow, not an overlay).
    previewHost.querySelector('.guide-monaco-preview__placeholder')?.remove();

    previewHost.classList.add('is-active');
    previewActive = true;
    ensureModalBodyObserver();

    // Не затираем код, который студент уже печатает на этой же лекции —
    // подставляем стартовый код только когда лекция реально сменилась.
    if (starterCode !== lastLoadedStarterCode) {
        await setEditorValue(starterCode);
        lastLoadedStarterCode = starterCode;
    }

    layoutMonacoSoon();
}

export function restoreMissionGuideMonacoPreview(): void {
    const monacoRoot = cachedMonacoRoot || document.getElementById('monaco-editor-root');

    if (monacoRoot && originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
            originalParent.insertBefore(monacoRoot, originalNextSibling);
        } else {
            originalParent.appendChild(monacoRoot);
        }
    }

    getPreviewHost()?.classList.remove('is-active');

    originalParent = null;
    originalNextSibling = null;
    previewActive = false;
    cachedMonacoRoot = monacoRoot;
    layoutMonacoSoon();
}
