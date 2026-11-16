import { isProtectedParam } from '../../../hardware/drone-params.js';
import { parsePropertiesText } from '../autopilot-params-model/properties-parser.js';
import { buildDefinition } from '../autopilot-params-model/template.js';

export type PreviewRow = {
    key: string;
    group: string;
    /** Значение сейчас; null - в текущем профиле такого параметра нет. */
    current: number | null;
    next: number;
    /** Первая фраза описания, чтобы было понятно, что это за параметр. */
    description: string;
    /** Калибровка, номер борта или счётчик: на дрон по умолчанию не пишется. */
    protectedParam: boolean;
};

export type PreviewSummary = {
    total: number;
    /** Значение отличается от текущего. */
    changed: number;
    /** Параметра нет в текущем профиле (профиль новее шаблона). */
    added: number;
    unchanged: number;
    /** Строки файла, которые не удалось разобрать. */
    skipped: number;
};

export type Preview = { rows: PreviewRow[]; summary: PreviewSummary };

const firstSentence = (text: string) => (text.split(/(?<=[.!?])\s/)[0] || text).trim();

/**
 * Сравнивает текст профиля .properties с тем, что открыто сейчас, ничего не применяя.
 * Нужно, чтобы посмотреть набор или файл ещё до записи на дрон (подключённый дрон для этого не нужен).
 */
export function buildPreview(text: string, currentValues: Record<string, number>): Preview {
    const parsed = parsePropertiesText(text);
    const rows: PreviewRow[] = [];
    let unchanged = 0;
    let skipped = parsed.malformedLines.length;
    const seen = new Set<string>();
    for (const entry of parsed.entries) {
        if (entry.value === null) { skipped += 1; continue; }
        if (seen.has(entry.key)) continue;
        seen.add(entry.key);
        const current = Object.prototype.hasOwnProperty.call(currentValues, entry.key) ? currentValues[entry.key] : null;
        if (current !== null && current === entry.value) { unchanged += 1; continue; }
        const definition = buildDefinition(entry.key, entry.value);
        rows.push({
            key: entry.key,
            group: definition.group,
            current,
            next: entry.value,
            description: firstSentence(definition.description),
            protectedParam: isProtectedParam(entry.key)
        });
    }
    return {
        rows,
        summary: {
            total: seen.size,
            changed: rows.filter((row) => row.current !== null).length,
            added: rows.filter((row) => row.current === null).length,
            unchanged,
            skipped
        }
    };
}
