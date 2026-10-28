import { escapeHtml } from '../render/shared.js';

/**
 * The actions of the book are pictograms drawn in ink with a caption under them, the way a printed page marks what to
 * do. A stamp is a button: a rough circle with the pictogram in it, the caption in the margin's handwriting.
 */
export type GlyphName = 'run' | 'check' | 'starter' | 'undo' | 'reset' | 'restart' | 'stop' | 'hint';

/** Each pictogram is a few pen strokes on a 24 x 24 sheet; the page-wide wobble filter (frame.ts) makes them hand-drawn. */
const STROKES: Record<GlyphName, string> = {
    run: '<path d="M8.5 5.5c3.4 2 7.2 4.2 10.4 6.3-3.2 2.1-7 4.4-10.4 6.4-.3-4.2-.3-8.5 0-12.7z"/>',
    check: '<path d="M4.6 12.6c1.6 1.4 3.1 3 4.3 4.7 3-4.9 6.1-8.6 10.7-11.8"/>',
    starter: '<path d="M6 4.8h8.6l3.4 3.4v11H6z"/><path d="M14.4 4.8v3.6H18"/><path d="M9 12.4h6M9 15.6h4"/>',
    undo: '<path d="M9.2 6.2 4.8 10.6l4.4 4.4"/><path d="M5.2 10.6h8.6c3.3 0 5.4 1.9 5.4 4.6 0 2.4-1.6 4-4.2 4.2"/>',
    reset: '<path d="M19.2 11.4A7.3 7.3 0 1 0 17 16.8"/><path d="M19.6 5.6v5.8h-5.8"/>',
    restart: '<path d="M18.6 9.8A7 7 0 1 0 17 17.2"/><path d="M18.9 4.8v5h-5"/><path d="M10.4 9.2c2 1.2 3.4 2 4.6 2.8-1.2.8-2.6 1.6-4.6 2.8z"/>',
    stop: '<path d="M6.6 6.4c3.6-.3 7.2-.3 10.8 0 .3 3.6.3 7.2 0 10.8-3.6.3-7.2.3-10.8 0-.3-3.6-.3-7.2 0-10.8z"/>',
    hint: '<path d="M12 4.2c-3.1 0-5.4 2.2-5.4 5 0 1.9 1 3 2 4.1.6.7 1 1.3 1 2.3h4.8c0-1 .4-1.6 1-2.3 1-1.1 2-2.2 2-4.1 0-2.8-2.3-5-5.4-5z"/><path d="M9.8 18.4h4.4M10.6 20.6h2.8"/>'
};

const RING = '<path class="stamp-ring" d="M26 3.6c12.6-.3 22.5 9.4 22.4 22.2C48.3 38.6 38.6 48.5 26 48.4 13.2 48.3 3.4 38.7 3.6 26 3.7 13.3 13.5 3.8 26 3.6z"/>';

export function renderGlyph(name: GlyphName): string {
    return `<svg class="stamp-glyph" viewBox="0 0 52 52" aria-hidden="true" focusable="false">${RING}<g transform="translate(14 14)">${STROKES[name]}</g></svg>`;
}

/** The markup of one action: attributes carry the handlers (`data-*`), `primary` marks the next action of the page. */
export function renderStamp(name: GlyphName, label: string, attrs: string, primary = false): string {
    return `<button type="button" class="book-stamp-btn${primary ? ' book-stamp-btn--primary' : ''}" ${attrs}>${renderGlyph(name)}<span class="book-stamp-btn__label">${escapeHtml(label)}</span></button>`;
}

/** A filter shared by every drawn thing on the page: lines that waver a little, as if drawn by hand. Placed once in the book. */
export const WOBBLE_FILTER = '<svg class="book-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="book-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></svg>';
