import { ConsoleError } from './errors.js';

/*
 * Разбор строки терминала как в bash (то, что нужно ros2): слова через пробел, '...' без escape-последовательностей,
 * "..." с \" \ \$ \`, \ вне кавычек экранирует символ, обратная косая + перевод строки - продолжение строки,
 * # в начале слова - комментарий до конца строки. Переводы строк внутри кавычек остаются в слове (многострочный YAML).
 */
export type Incomplete = 'quote' | 'backslash' | null;

export interface Scanned {
    tokens: string[];
    /** Строка оборвана: открыта кавычка или стоит завершающая \ - нужна следующая строка (приглашение `> `). */
    incomplete: Incomplete;
}

export function scan(text: string): Scanned {
    const tokens: string[] = [];
    let word = '';
    let inWord = false;
    let quote: '"' | "'" | null = null;
    const push = () => {
        if (inWord) tokens.push(word);
        word = '';
        inWord = false;
    };
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quote === "'") {
            if (ch === "'") quote = null; else word += ch;
            continue;
        }
        if (quote === '"') {
            if (ch === '"') { quote = null; continue; }
            if (ch === '\\') {
                const next = text[i + 1];
                if (next === undefined) return { tokens, incomplete: 'backslash' };
                if (next === '\n') { i += 1; continue; }
                if (next === '"' || next === '\\' || next === '$' || next === '`') { word += next; i += 1; continue; }
                word += ch;
                continue;
            }
            word += ch;
            continue;
        }
        if (ch === '\\') {
            const next = text[i + 1];
            if (next === undefined) return { tokens, incomplete: 'backslash' };
            i += 1;
            if (next === '\n') continue;
            word += next;
            inWord = true;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; inWord = true; continue; }
        if (ch === '#' && !inWord) {
            while (i < text.length && text[i] !== '\n') i += 1;
            continue;
        }
        if (/\s/u.test(ch)) { push(); continue; }
        word += ch;
        inWord = true;
    }
    if (quote) return { tokens, incomplete: 'quote' };
    push();
    return { tokens, incomplete: null };
}

export function needsContinuation(text: string): boolean {
    return scan(text).incomplete !== null;
}

export function tokenize(text: string): string[] {
    const result = scan(text);
    if (result.incomplete === 'quote') throw new ConsoleError('Не закрыта кавычка в команде', 'Закройте кавычку или нажмите Ctrl+C');
    if (result.incomplete === 'backslash') throw new ConsoleError('Строка обрывается на обратной косой черте', 'Допишите команду');
    return result.tokens;
}

/** Склеивает строки продолжения: в кавычках перевод строки сохраняется, после \ - исчезает (при разборе). */
export function joinContinuation(lines: readonly string[]): string {
    return lines.join('\n');
}
