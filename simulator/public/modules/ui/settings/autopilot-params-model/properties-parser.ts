export type PropertiesEntry = {
    key: string;
    /** Числовое значение или null, если значение не удалось разобрать. */
    value: number | null;
    raw: string;
    /** Номер первой физической строки записи (с 1). */
    line: number;
    error: string | null;
};

export type PropertiesParseResult = {
    entries: PropertiesEntry[];
    /** Строки, которые не удалось разобрать как запись (нет ключа). */
    malformedLines: { line: number; text: string }[];
};

/** Нечётное число завершающих обратных слэшей означает перенос строки (формат java.util.Properties). */
function hasLineContinuation(line: string) {
    let count = 0;
    for (let i = line.length - 1; i >= 0 && line[i] === '\\'; i--) count++;
    return count % 2 === 1;
}

function unescapeProperty(text: string) {
    return text.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_match, group: string) => {
        if (group.length === 5 && group[0] === 'u') return String.fromCharCode(parseInt(group.slice(1), 16));
        if (group === 't') return '\t';
        if (group === 'n') return '\n';
        if (group === 'r') return '\r';
        if (group === 'f') return '\f';
        return group;
    });
}

/** Делит логическую строку на ключ и значение: разделителем служит первый неэкранированный `=`, `:` или пробел. */
function splitKeyValue(logical: string): { key: string; raw: string } | null {
    let i = 0;
    let key = '';
    while (i < logical.length) {
        const ch = logical[i];
        if (ch === '\\') {
            key += logical.slice(i, i + 2);
            i += 2;
            continue;
        }
        if (ch === '=' || ch === ':' || ch === ' ' || ch === '\t' || ch === '\f') break;
        key += ch;
        i++;
    }
    if (!key) return null;
    while (i < logical.length && /[ \t\f]/.test(logical[i])) i++;
    if (i < logical.length && (logical[i] === '=' || logical[i] === ':')) i++;
    while (i < logical.length && /[ \t\f]/.test(logical[i])) i++;
    return { key: unescapeProperty(key), raw: logical.slice(i).trim() };
}

export function parsePropertyNumber(raw: string): number | null {
    const text = raw.trim();
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower === 'true') return 1;
    if (lower === 'false') return 0;
    // Java выводит double как «3.0E-5»; допускаем и суффиксы d/f.
    const normalized = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[dDfF]$/.test(text) ? text.slice(0, -1) : text;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

export function parsePropertiesText(text: string): PropertiesParseResult {
    const entries: PropertiesEntry[] = [];
    const malformedLines: { line: number; text: string }[] = [];
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);

    for (let index = 0; index < lines.length; index++) {
        const startLine = index + 1;
        let logical = lines[index].replace(/^[ \t\f]+/, '');
        if (!logical || logical[0] === '#' || logical[0] === '!') continue;

        while (hasLineContinuation(logical) && index + 1 < lines.length) {
            logical = logical.slice(0, -1) + lines[++index].replace(/^[ \t\f]+/, '');
        }
        if (hasLineContinuation(logical)) logical = logical.slice(0, -1);

        const pair = splitKeyValue(logical);
        if (!pair) {
            malformedLines.push({ line: startLine, text: logical.trim() });
            continue;
        }
        const value = parsePropertyNumber(pair.raw);
        entries.push({
            key: pair.key,
            value,
            raw: pair.raw,
            line: startLine,
            error: value === null
                ? (pair.raw ? `значение «${pair.raw}» не является числом` : 'значение не задано')
                : null
        });
    }

    return { entries, malformedLines };
}
