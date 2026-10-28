/**
 * The turn of a page. The guide redraws the whole spread on every step, so the turn is staged on top of the new spread
 * from copies of the pages that were just replaced (the live scene, editor and workspace are left out of the copies).
 * The new spread is already in place underneath and shows through where the leaf has been lifted away.
 *
 * The leaf is a page curl: a straight fold sweeps from the pressed corner over the page to the spine, and the part of the
 * paper beyond the fold is laid back over the rest (the back of the leaf shows the next left page, the right way round).
 * Where the paper turns over the fold it is rolled round a cylinder: a narrow band of the back, squeezed, lit and shaded
 * as a curve, and the leaf throws a soft shadow on the page it uncovers. The fold starts diagonal, as the peeled corner
 * of `curls.ts` does, and straightens as it reaches the spine; the roll is small at the start, grows while the leaf
 * is in the air and shrinks to nothing as it lies down. Only clip paths and transforms of a few copies are written, once
 * per frame.
 *
 * Geometry is kept in one local frame, whichever way the leaf turns: `u` is the distance from the spine along the page
 * that is turned away (outwards), `y` the distance from the top of the page. `dir` maps it to the screen (+1 forward).
 */

const TURN_MS = 880;
const TWO_PAGES = 2;
const SAME_ROW_PX = 2;
/** The fold starts as the peeled corner does: a diagonal at 45 degrees with legs of this length. */
const START_LEG_PX = 66;
const START_ANGLE = Math.PI / 4;
/** How fast the fold straightens: the angle is START_ANGLE * (1 - e) ^ this. */
const STRAIGHTEN = 2.1;
/** Radius of the roll the paper turns round: at the start, and at its largest while the leaf is lifted. */
const ROLL_MIN_PX = 7;
const ROLL_MAX_PX = 58;
/** The roll is seen from above: half a turn of the paper (pi * r) is squeezed into the width of the roll. */
const ROLL_SQUEEZE = 2 / Math.PI;
const BAND_UNIT_PX = 100;
const LINE_REACH_PX = 1600;

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

type V = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const dot = (p: V, n: V): number => p.x * n.x + p.y * n.y;
const px = (value: number): string => value.toFixed(2);

/** A soft start, a quick middle, a soft landing. */
function ease(t: number): number {
    const cubic = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const sine = -(Math.cos(Math.PI * t) - 1) / 2;
    return (cubic + sine) / 2;
}

/** The mirror image of a point across the line n . p = d. */
function reflect(p: V, n: V, d: number): V {
    const k = 2 * (dot(p, n) - d);
    return { x: p.x - k * n.x, y: p.y - k * n.y };
}

/** Sutherland-Hodgman: the part of a polygon on one side of the line n . p = d (keep > 0: n . p >= d; keep < 0: n . p <= d). */
function clipPolygon(poly: V[], n: V, d: number, keep: 1 | -1): V[] {
    const out: V[] = [];
    const side = (p: V): number => keep * (dot(p, n) - d);
    poly.forEach((a, i) => {
        const b = poly[(i + 1) % poly.length];
        const sa = side(a);
        const sb = side(b);
        if (sa >= 0) out.push(a);
        if ((sa >= 0) !== (sb >= 0)) {
            const k = sa / (sa - sb);
            out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        }
    });
    return out;
}

function div(className: string, ...children: HTMLElement[]): HTMLElement {
    const node = document.createElement('div');
    node.className = className;
    node.append(...children);
    return node;
}

/** A copy of a page as a sheet of paper of its own, at the size and place the real one has. */
function paperOf(className: string, page: HTMLElement, box: Box): HTMLElement {
    const paper = div(className, printCopy(page));
    paper.style.width = `${px(box.width)}px`;
    paper.style.height = `${px(box.height)}px`;
    return paper;
}

type Frame = {
    layer: HTMLElement;
    forward: boolean;
    spine: number;
    top: number;
    width: number;
    height: number;
    /** Where the page that lands (the back of the leaf) sits on the sheet. */
    landing: Box;
    rest: HTMLElement;
    flat: HTMLElement;
    band: HTMLElement;
    flatPaper: HTMLElement;
    bandPaper: HTMLElement;
    bandShade: HTMLElement;
    cast: HTMLElement;
};

const hide = (node: HTMLElement, poly: V[], toScreen: (p: V) => V): void => {
    node.style.clipPath = poly.length >= 3 ? `polygon(${poly.map(toScreen).map(p => `${px(p.x)}px ${px(p.y)}px`).join(',')})` : 'polygon(0 0)';
};

/** The leaf at one moment of the turn, t in 0..1. */
function render(frame: Frame, t: number): void {
    const { spine, top, width: W, height: H } = frame;
    const dir = frame.forward ? 1 : -1;
    const e = ease(t);
    const angle = START_ANGLE * Math.pow(1 - e, STRAIGHTEN);
    const n: V = { x: Math.cos(angle), y: Math.sin(angle) };
    const along: V = { x: -n.y, y: n.x };
    const reach = W * n.x + H * n.y;
    const startShare = START_LEG_PX / (W + H);
    // The crease of the paper; the roll lies between it and the line where the paper first leaves the page.
    const crease = reach * (1 - (startShare + (1 - startShare) * e));
    const roll = ROLL_MIN_PX * (1 - e) + (ROLL_MAX_PX - ROLL_MIN_PX) * Math.pow(Math.sin(Math.PI * e), 0.7);
    const foot = crease - (Math.PI * roll) / 2;

    const toScreen = (p: V): V => ({ x: spine + dir * p.x, y: top + p.y });
    const page: V[] = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
    const turned = page.map(p => reflect(p, n, crease));

    hide(frame.rest, clipPolygon(page, n, foot, -1), toScreen);
    hide(frame.flat, clipPolygon(turned, n, foot, -1), toScreen);
    const bandPoly = clipPolygon(clipPolygon(turned, n, foot, 1), n, crease, -1)
        .map(p => ({ x: p.x - (1 - ROLL_SQUEEZE) * (dot(p, n) - foot) * n.x, y: p.y - (1 - ROLL_SQUEEZE) * (dot(p, n) - foot) * n.y }));
    hide(frame.band, bandPoly, toScreen);

    // The back of the leaf: the page that lands, carried to wherever its paper is now. `squeeze` rolls it round the fold.
    const carry = (cx: number, cy: number, squeeze: boolean): V => {
        const screenX = frame.landing.x + cx;
        const screenY = frame.landing.y + cy;
        const local: V = { x: dir * (screenX - spine), y: screenY - top };
        let p = reflect({ x: -local.x, y: local.y }, n, crease);
        if (squeeze) {
            const k = (1 - ROLL_SQUEEZE) * (dot(p, n) - foot);
            p = { x: p.x - k * n.x, y: p.y - k * n.y };
        }
        return toScreen(p);
    };
    const matrixOf = (squeeze: boolean): string => {
        const o = carry(0, 0, squeeze);
        const x = carry(1, 0, squeeze);
        const y = carry(0, 1, squeeze);
        return `matrix(${(x.x - o.x).toFixed(5)},${(x.y - o.y).toFixed(5)},${(y.x - o.x).toFixed(5)},${(y.y - o.y).toFixed(5)},${px(o.x)},${px(o.y)})`;
    };
    frame.flatPaper.style.transform = matrixOf(false);
    frame.bandPaper.style.transform = matrixOf(true);

    // A strip that runs along the fold: x leaves the line toward `outward`, y follows the line; `span` px wide.
    const alongFold = (distance: number, outward: 1 | -1, span: number): string => {
        const start: V = { x: n.x * distance - along.x * (LINE_REACH_PX / 2), y: n.y * distance - along.y * (LINE_REACH_PX / 2) };
        const o = toScreen(start);
        const ex = toScreen({ x: start.x + n.x * outward * (span / BAND_UNIT_PX), y: start.y + n.y * outward * (span / BAND_UNIT_PX) });
        const ey = toScreen({ x: start.x + along.x, y: start.y + along.y });
        return `matrix(${(ex.x - o.x).toFixed(5)},${(ex.y - o.y).toFixed(5)},${(ey.x - o.x).toFixed(5)},${(ey.y - o.y).toFixed(5)},${px(o.x)},${px(o.y)})`;
    };
    frame.bandShade.style.transform = alongFold(foot, 1, roll);
    const height = clamp(roll / ROLL_MAX_PX, 0, 1);
    frame.cast.style.transform = alongFold(foot + roll, 1, 26 + 3.4 * roll);
    frame.cast.style.opacity = (0.15 + 0.85 * height).toFixed(3);
}

/** Turns forward when the new spread lies further in the volume, back when it lies before. */
export function playPageTurn(container: HTMLElement, before: SheetSnapshot | null): void {
    if (!before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sheet = container.querySelector<HTMLElement>('.book__sheet');
    const pages = sheet ? pagesOf(sheet) : [];
    if (!sheet || pages.length !== TWO_PAGES) return;
    const page = Number(sheet.dataset.bookPage);
    const sameVolume = container.querySelector<HTMLElement>('.book')?.dataset.bookVolume === before.volume;
    const sheetBox = sheet.getBoundingClientRect();
    const boxes = pages.map(node => {
        const rect = node.getBoundingClientRect();
        return { x: rect.left - sheetBox.left - sheet.clientLeft, y: rect.top - sheetBox.top - sheet.clientTop, width: rect.width, height: rect.height };
    });
    // A single column has no spine to turn about.
    const twoColumns = Math.abs(boxes[0].y - boxes[1].y) <= SAME_ROW_PX;
    if (!sameVolume || !twoColumns || !Number.isFinite(page) || page === before.page) return;

    const forward = page > before.page;
    const [oldStays, oldLeaf, newBack] = forward ? [before.left, before.right, pages[0]] : [before.right, before.left, pages[1]];
    const [stayBox, leafBox] = forward ? [boxes[0], boxes[1]] : [boxes[1], boxes[0]];
    const spine = forward ? leafBox.x : leafBox.x + leafBox.width;
    const place = (node: HTMLElement, box: Box): HTMLElement => {
        node.style.left = `${px(box.x)}px`;
        node.style.top = `${px(box.y)}px`;
        return node;
    };
    const rest = div('book-turn-clip', place(paperOf('book-turn-paper', oldLeaf, leafBox), leafBox));
    const flatPaper = paperOf('book-turn-paper book-turn-paper--moving', newBack, boxes[forward ? 0 : 1]);
    const bandPaper = paperOf('book-turn-paper book-turn-paper--moving', newBack, boxes[forward ? 0 : 1]);
    const bandShade = div('book-turn-roll');
    const flat = div('book-turn-clip', flatPaper);
    const band = div('book-turn-clip', bandPaper, bandShade);
    const cast = div('book-turn-cast');
    const castClip = div('book-turn-clip book-turn-clip--page', cast);
    castClip.style.clipPath = `polygon(${px(leafBox.x)}px ${px(leafBox.y)}px,${px(leafBox.x + leafBox.width)}px ${px(leafBox.y)}px,${px(leafBox.x + leafBox.width)}px ${px(leafBox.y + leafBox.height)}px,${px(leafBox.x)}px ${px(leafBox.y + leafBox.height)}px)`;
    const gutter = div('book-turn-gutter');
    gutter.style.left = `${px(spine)}px`;
    const layer = div(`book-turn-layer book-turn-layer--${forward ? 'forward' : 'back'}`,
        place(paperOf('book-turn-paper', oldStays, stayBox), stayBox), castClip, rest, gutter, div('book-turn-leaf', flat, band));
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;

    const frame: Frame = {
        layer, forward, spine, top: leafBox.y, width: leafBox.width, height: leafBox.height, landing: boxes[forward ? 0 : 1],
        rest, flat, band, flatPaper, bandPaper, bandShade, cast
    };
    sheet.dataset.turning = forward ? 'forward' : 'back';
    sheet.append(layer);
    render(frame, 0);

    let done = false;
    const finish = (): void => {
        if (done) return;
        done = true;
        layer.remove();
        delete sheet.dataset.turning;
    };
    const started = performance.now();
    const step = (now: number): void => {
        if (done || !layer.isConnected) { finish(); return; }
        const t = clamp((now - started) / TURN_MS, 0, 1);
        render(frame, t);
        if (t < 1) requestAnimationFrame(step);
        else finish();
    };
    requestAnimationFrame(step);
    // Only guards against a frame loop that never runs (a hidden tab).
    window.setTimeout(finish, TURN_MS + 400);
}
