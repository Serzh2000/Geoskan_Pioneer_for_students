import type { BookVolume } from './source.js';

/**
 * Each volume of the course has its own small drawn mark, so it is known without its colour: a prompt for Python, a
 * crescent for Lua, a building brick for Blockly. A few pen strokes on a 24 x 24 sheet, wobbled by the page-wide filter.
 */
const MARK_STROKES: Record<BookVolume, string> = {
    python: '<path d="M4.6 6.4c2.4 1.9 4.6 3.7 6.2 5.7-1.8 2-3.9 3.8-6.3 5.7"/><path d="M12.8 18.1c2.3-.2 4.6-.2 6.8 0"/>',
    lua: '<path d="M16.8 4.6c-5.3.4-9.2 4.1-9.2 8.9 0 4.1 3 7.3 7.3 7.3 1.9 0 3.7-.7 5-1.8-4.7.1-8-3.3-8-7.6 0-2.7 1.1-5.2 4.9-6.8z"/>',
    blockly: '<path d="M4.6 10.6h4.2c-.7-3.1 3.7-3.5 3.5 0h5.2c.3 2.5.3 5.3 0 8H4.6c-.3-2.7-.3-5.4 0-8z"/><path d="M8.2 14.6h6.4"/>'
};

export const VOLUME_TITLES: Record<BookVolume, string> = { python: 'Python', lua: 'Lua', blockly: 'Blockly' };

/** The mark as an inline drawing in the colour of the text around it. */
export function renderVolumeMark(volume: BookVolume): string {
    return `<svg class="vol-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${MARK_STROKES[volume]}</svg>`;
}

/** The ribbon of the volume: hangs from the top edge of the sheet beside the gutter and carries the mark and the name. */
export function renderRibbon(volume: BookVolume): string {
    return `<div class="book-ribbon" aria-hidden="true">${renderVolumeMark(volume)}<span class="book-ribbon__name">${VOLUME_TITLES[volume]}</span></div>`;
}
