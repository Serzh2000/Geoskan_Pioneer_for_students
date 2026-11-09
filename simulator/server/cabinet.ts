/**
 * Вспомогательные вычисления для кабинетов: календарь активности, серии дней, логины и пароли для списка учеников.
 * Только чистые функции без обращения к диску, чтобы их можно было проверять обычными тестами.
 */
import crypto from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Сдвиг часового пояса в минутах, как его отдаёт `Date.getTimezoneOffset()` в браузере (для Москвы −180). */
export function parseTz(raw: unknown): number {
    const value = Number(raw);
    return Number.isFinite(value) && Math.abs(value) <= 14 * 60 ? Math.round(value) : 0;
}

/** Календарный день «ГГГГ-ММ-ДД» по местному времени ученика. */
export function dayKey(at: number, tz: number): string {
    return new Date(at - tz * 60_000).toISOString().slice(0, 10);
}

const keyToDay = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

/** Сколько событий в каждый день; дни без событий в результат не попадают. */
export function activityByDay(times: Iterable<number>, tz: number): Record<string, number> {
    const days: Record<string, number> = {};
    for (const at of times) {
        if (!Number.isFinite(at)) continue;
        const key = dayKey(at, tz);
        days[key] = (days[key] ?? 0) + 1;
    }
    return days;
}

/**
 * Серия дней подряд. Текущая серия не рвётся, пока не закончился сегодняшний день: если сегодня ещё не занимались,
 * но вчера занимались, серия жива.
 */
export function streaks(days: Iterable<string>, todayKey: string): { current: number; best: number } {
    const set = new Set([...days].map(keyToDay));
    const sorted = [...set].sort((a, b) => a - b);
    let best = 0;
    let run = 0;
    sorted.forEach((day, index) => {
        run = index > 0 && sorted[index - 1] === day - 1 ? run + 1 : 1;
        best = Math.max(best, run);
    });
    const today = keyToDay(todayKey);
    let cursor = set.has(today) ? today : set.has(today - 1) ? today - 1 : null;
    let current = 0;
    while (cursor !== null && set.has(cursor)) { current++; cursor--; }
    return { current, best };
}

const TRANSLIT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

/** «Иванов Иван Петрович» → «ivanov.ivan». Логин свободен или получает номер: ivanov.ivan2. */
export function suggestLogin(fullName: string, isTaken: (login: string) => boolean): string {
    const words = fullName.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 2);
    const latin = words.map((word) => [...word].map((char) => TRANSLIT[char] ?? (/[a-z0-9]/.test(char) ? char : '')).join('')).filter(Boolean);
    let base = (latin.join('.') || 'user').slice(0, 28);
    if (base.length < 3) base = `${base}user`.slice(0, 28);
    if (!isTaken(base)) return base;
    for (let n = 2; n < 1000; n++) {
        const candidate = `${base}${n}`;
        if (!isTaken(candidate)) return candidate;
    }
    return `${base}${crypto.randomInt(1000, 99999)}`;
}

/** Пароль из читаемых символов: без нуля и буквы О, единицы и буквы l, чтобы его можно было продиктовать или прочитать с листа. */
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generatePassword(length = 8): string {
    let out = '';
    for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
    return out;
}
