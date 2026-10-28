/**
 * The texts of the book are written once for both languages of a text track, but a Lua volume must never talk about
 * Python, nor a Python volume about Lua. A passage that differs is wrapped in a tag, and the book keeps only the one of
 * its own volume: `Один общий текст. <lua>Это про Lua.</lua><py>Это про Python.</py> Снова общий.`
 */
export type TextLanguage = 'lua' | 'python';

const LUA = /<lua>([\s\S]*?)<\/lua>/g;
const PY = /<py>([\s\S]*?)<\/py>/g;
const CUT = '\u0001';

/**
 * Only the places where a passage was cut are tidied: the space before a cut that ends at a punctuation mark goes, and
 * the spaces around any other cut become one. Text that was not touched keeps its spacing (code such as `f(1, ...)`).
 */
export function localize(text: string, language: TextLanguage): string {
    if (!text.includes('<lua>') && !text.includes('<py>')) return text;
    return text
        .replace(LUA, language === 'lua' ? '$1' : CUT)
        .replace(PY, language === 'python' ? '$1' : CUT)
        .replace(new RegExp(`\\s*${CUT}(?=[.,;:!?)])`, 'g'), '')
        .replace(new RegExp(`\\s*${CUT}\\s*`, 'g'), ' ')
        .trim();
}
