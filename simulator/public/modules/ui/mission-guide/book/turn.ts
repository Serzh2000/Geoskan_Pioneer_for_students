/**
 * The turn of a page. The guide redraws the whole spread on every step, so the turn is staged on top of the
 * new spread: a leaf made of copies of the pages that were just replaced, swung over the spine. The new
 * spread is already in place underneath and shows as the leaf lifts.
 */

const TURN_MS = 760;
const TWO_PAGES = 2;
const SAME_ROW_PX = 2;

export type SheetSnapshot = { page: number; volume: string; left: HTMLElement; right: HTMLElement };

const LIVE_HOSTS = '#mission-guide-monaco-preview-host, #mission-guide-scene-preview-host, #mission-guide-blockly-preview-host';

/** A copy of a page that cannot be mistaken for the real one: no ids, and the live editor, scene and workspace left out. */
function printCopy(page: HTMLElement): HTMLElement {
    const copy = page.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(LIVE_HOSTS).forEach(host => host.replaceChildren());
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    return copy;
}

function pagesOf(sheet: HTMLElement): HTMLElement[] {
    return [...sheet.querySelectorAll<HTMLElement>(':scope > .book-page')];
}

/**
 * Takes the spread on screen before it is replaced; null when there is no book open. The pages are kept as they are:
 * a replaced node keeps its subtree, so they are copied only if a turn is really played.
 */
export function captureSheet(container: HTMLElement): SheetSnapshot | null {
    container.querySelectorAll('.book-turn-layer').forEach(layer => layer.remove());
    const sheet = container.querySelector<HTMLElement>('.book__sheet');
    const pages = sheet ? pagesOf(sheet) : [];
    if (!sheet || pages.length !== TWO_PAGES) return null;
    return {
        page: Number(sheet.dataset.bookPage),
        volume: container.querySelector<HTMLElement>('.book')?.dataset.bookVolume ?? '',
        left: pages[0],
        right: pages[1]
    };
}

function div(className: string, ...children: HTMLElement[]): HTMLElement {
    const node = document.createElement('div');
    node.className = className;
    node.append(...children);
    return node;
}

/** Turns forward when the new spread lies further in the volume, back when it lies before. */
export function playPageTurn(container: HTMLElement, before: SheetSnapshot | null): void {
    if (!before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sheet = container.querySelector<HTMLElement>('.book__sheet');
    const pages = sheet ? pagesOf(sheet) : [];
    if (!sheet || pages.length !== TWO_PAGES) return;
    const page = Number(sheet.dataset.bookPage);
    const sameVolume = container.querySelector<HTMLElement>('.book')?.dataset.bookVolume === before.volume;
    // A single column has no spine to turn about.
    const twoColumns = Math.abs(pages[0].getBoundingClientRect().top - pages[1].getBoundingClientRect().top) <= SAME_ROW_PX;
    if (!sameVolume || !twoColumns || !Number.isFinite(page) || page === before.page) return;

    const forward = page > before.page;
    const [oldStays, oldLeaf, newBack] = forward
        ? [printCopy(before.left), printCopy(before.right), printCopy(pages[0])]
        : [printCopy(before.right), printCopy(before.left), printCopy(pages[1])];
    const layer = div('book-turn-layer',
        div(`book-turn-under book-turn-under--${forward ? 'left' : 'right'}`, oldStays),
        div(`book-leaf book-leaf--${forward ? 'forward' : 'back'}`, div('book-face book-face--front', oldLeaf), div('book-face book-face--back', newBack)));
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    sheet.dataset.turning = forward ? 'forward' : 'back';
    sheet.append(layer);
    const finish = (): void => { layer.remove(); delete sheet.dataset.turning; };
    // Out of its own accord when the leaf has landed; the timer only guards against an animation that never runs.
    void Promise.allSettled(layer.getAnimations({ subtree: true }).map(animation => animation.finished)).then(finish);
    window.setTimeout(finish, TURN_MS + 300);
}
