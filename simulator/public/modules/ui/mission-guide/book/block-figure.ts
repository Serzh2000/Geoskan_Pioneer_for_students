import { Blockly, type BlocklyNS } from '../../../editor/blockly-mode/loader.js';
import { compilePioneerWorkspace, ensureEditorBlocklyDefinitions } from '../../../editor/blockly-mode/index.js';
import { escapeHtml } from '../render/shared.js';
import type { WorkspaceJson } from '../lessons/pioneer/dsl.js';
import { renderListing } from './listing.js';

/**
 * Блоки на странице книги: настоящая картинка из Blockly, выложенная на лист, как рисунок в учебнике.
 * Страница книги перерисовывается целиком, поэтому разметка кладёт только место под рисунок, а сами блоки
 * появляются после (mountBookBlocks): в место загружается рабочая область «только для чтения».
 */
const figures = new Map<string, WorkspaceJson>();
const mounted = new Map<HTMLElement, BlocklyNS.WorkspaceSvg>();

/** Поля вокруг блоков, пиксели. */
const PAD = 10;
/** Крупнее блоки не рисуем: рисунок на странице — иллюстрация, а не рабочая область. */
const MAX_SCALE = 1;

export function renderBlockFigure(key: string, workspace: WorkspaceJson, caption: string): string {
    figures.set(key, workspace);
    return `<figure class="book-figure book-blocks">
        <div class="book-blocks__sheet" data-book-blocks="${escapeHtml(key)}" role="img" aria-label="Блоки программы: ${escapeHtml(caption.replace(/<[^>]+>/g, ''))}">
            <span class="book-blocks__tag">Блоки</span>
            <div class="book-blocks__canvas"><p class="book-blocks__loading">Рисую блоки…</p></div>
        </div>
        <figcaption class="book-caption">${caption}</figcaption>
    </figure>`;
}

/** Место под код, в который собираются блоки рисунка: заполняется при показе. */
export function renderBlockListingSlot(key: string): string {
    return `<div class="book-blocks__code" data-book-listing="${escapeHtml(key)}"></div>`;
}

function disposeDetached(): void {
    for (const [host, workspace] of mounted) {
        if (host.isConnected) continue;
        workspace.dispose();
        mounted.delete(host);
    }
}

/** Код блоков рисунка собирается из отдельной невидимой копии: компилятор расставляет на блоках предупреждения, а на рисунке им не место. */
function compileFigure(json: WorkspaceJson, language: 'lua' | 'python'): string {
    const headless = new Blockly.Workspace();
    try {
        Blockly.serialization.workspaces.load(json, headless);
        return compilePioneerWorkspace(headless, language).trim();
    } finally {
        headless.dispose();
    }
}

function drawFigure(host: HTMLElement, json: WorkspaceJson): BlocklyNS.WorkspaceSvg {
    const canvas = host.querySelector<HTMLElement>('.book-blocks__canvas')!;
    canvas.innerHTML = '';
    canvas.style.height = '120px';
    const workspace = Blockly.inject(canvas, {
        readOnly: true,
        scrollbars: false,
        trashcan: false,
        sounds: false,
        zoom: { controls: false, wheel: false, pinch: false, startScale: MAX_SCALE },
        move: { scrollbars: false, drag: false, wheel: false }
    });
    Blockly.serialization.workspaces.load(json, workspace);
    // Отдельные блоки (функции, таймеры) встают под основной цепочкой, а не где-то далеко справа.
    workspace.cleanUp();

    const box = workspace.getBlocksBoundingBox();
    const width = Math.max(box.right - box.left, 1);
    const height = Math.max(box.bottom - box.top, 1);
    const available = Math.max(canvas.clientWidth - PAD * 2, 80);
    const scale = Math.min(MAX_SCALE, available / width);
    workspace.setScale(scale);
    canvas.style.height = `${Math.ceil(height * scale) + PAD * 2}px`;
    Blockly.svgResize(workspace);
    workspace.scroll(PAD - box.left * scale, PAD - box.top * scale);
    return workspace;
}

/** Рисует блоки во всех местах под рисунки на странице и подставляет в слоты код блоков на выбранном языке. */
export async function mountBookBlocks(container: HTMLElement, language: 'lua' | 'python'): Promise<void> {
    const hosts = [...container.querySelectorAll<HTMLElement>('[data-book-blocks]')];
    disposeDetached();
    if (!hosts.length) return;
    await ensureEditorBlocklyDefinitions();
    disposeDetached();
    for (const host of hosts) {
        const key = host.dataset.bookBlocks ?? '';
        const json = figures.get(key);
        // Страница могла перерисоваться, пока грузился Blockly: этого места уже нет.
        if (!json || !host.isConnected || mounted.has(host)) continue;
        try {
            const workspace = drawFigure(host, json);
            mounted.set(host, workspace);
            const slot = container.querySelector<HTMLElement>(`[data-book-listing="${CSS.escape(key)}"]`);
            if (slot) slot.innerHTML = renderListing(compileFigure(json, language));
        } catch (error) {
            console.warn('[BOOK-BLOCKS] could not draw the figure', error);
            host.querySelector('.book-blocks__canvas')!.textContent = 'Не удалось нарисовать блоки.';
        }
    }
}
