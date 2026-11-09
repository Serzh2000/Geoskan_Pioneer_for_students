/**
 * Общие части личных кабинетов ученика и учителя: экранирование, значки, даты, календарь активности, достижения
 * и перехват фокуса в окне. DOM здесь только в двух функциях (focus trap и календарь возвращает строку).
 */
import { TRACK_NAMES, type AccountTrack, type CabinetData } from './account.js';
import { questGroups, type Quest } from './quests.js';
import type { Glyph, Tier } from './achievement-art.js';

export const esc = (text: unknown): string => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const TRACK_LABELS: Record<AccountTrack, string> = TRACK_NAMES;

const svg = (body: string, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Значки одного набора: контур 1.8, скруглённые концы. */
export const ICON = {
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 14),
    close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
    play: svg('<path d="M8 5.5v13l11-6.5z"/>'),
    flame: svg('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2-.5-3 .5-5.5 1-8z"/>'),
    user: svg('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6"/>'),
    users: svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.5-3.2 2.9-5 6-5s5.500 1.800 6 5"/><path d="M16 5.600a3.200 3.200 0 0 1 0 5.800M18 14.800c1.800.6 2.800 2.100 3 4.700"/>'),
    list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="18" r="1"/>'),
    trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1.500A3 3 0 0 0 8 10.500M16 6h3v1.500a3 3 0 0 1-3 3"/><path d="M12 13v4M8.500 20h7M10 17h4"/>'),
    grid: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
    alert: svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4.500M12 17.500v.1"/>'),
    download: svg('<path d="M12 4v11M7.500 10.500L12 15l4.500-4.500M5 19.500h14"/>'),
    print: svg('<path d="M7 9V4h10v5M7 17H4.500v-6.500h15V17H17"/><path d="M7 14h10v6H7z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.500 6.500l4 4"/>'),
    key: svg('<circle cx="8" cy="15" r="3.500"/><path d="M10.500 12.500L19 4M16 7l2.500 2.500M14 9l2 2"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    back: svg('<path d="M14 6l-6 6 6 6"/>'),
    copy: svg('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),
    shield: svg('<path d="M12 3l7 3v5.500c0 4.200-2.800 7.300-7 9.500-4.200-2.200-7-5.300-7-9.500V6z"/><path d="M9 12l2.200 2.200L15.500 10"/>'),
    sortUp: svg('<path d="M8 14l4-4 4 4"/>', 14),
    sortDown: svg('<path d="M8 10l4 4 4-4"/>', 14)
};

/* ---------- Даты ---------- */

const DAY = 24 * 60 * 60 * 1000;

export function fmtDate(at: number): string {
    return new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function fmtDateTime(at: number): string {
    return new Date(at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** «только что», «5 мин назад», «3 ч назад», «вчера», «5 дн. назад»; дольше месяца — дата. */
export function ago(at: number | null | undefined, now = Date.now()): string {
    if (!at) return 'не заходил';
    const diff = Math.max(0, now - at);
    if (diff < 60_000) return 'только что';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
    if (diff < DAY) return `${Math.floor(diff / 3_600_000)} ч назад`;
    const days = Math.floor(diff / DAY);
    if (days === 1) return 'вчера';
    if (days < 30) return `${days} дн. назад`;
    return fmtDate(at);
}

export function fmtDuration(seconds: number | null): string {
    if (seconds === null) return '—';
    if (seconds < 90) return `${seconds} с`;
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

export function plural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

export function initials(fullName: string, fallback = '?'): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? fallback) + (parts[1]?.[0] ?? '')).toUpperCase();
}

/* ---------- Календарь активности ---------- */

const shiftDay = (key: string, delta: number) => new Date(Date.parse(`${key}T00:00:00Z`) + delta * DAY).toISOString().slice(0, 10);

/**
 * Календарь последних недель: столбец — неделя (с понедельника), строка — день. Яркость ячейки — сколько проверок и зачётов
 * было в тот день. Для чтения с экрана — подпись с итогом, а у каждой ячейки есть title.
 */
export function renderCalendar(days: Record<string, number>, today: string, weeks = 12): string {
    const todayDow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;   // понедельник = 0
    const start = shiftDay(today, -(todayDow + (weeks - 1) * 7));
    const max = Math.max(1, ...Object.values(days));
    let total = 0;
    let active = 0;
    const columns: string[] = [];
    for (let week = 0; week < weeks; week++) {
        const cells: string[] = [];
        for (let dow = 0; dow < 7; dow++) {
            const key = shiftDay(start, week * 7 + dow);
            if (key > today) { cells.push('<i class="cab-cal__cell is-future"></i>'); continue; }
            const count = days[key] ?? 0;
            if (count) { total += count; active++; }
            const level = count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / max) * 3.99));
            const label = `${new Date(`${key}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })}: ${count ? `${count} ${plural(count, 'действие', 'действия', 'действий')}` : 'без занятий'}`;
            cells.push(`<i class="cab-cal__cell" data-level="${level}" title="${esc(label)}"></i>`);
        }
        columns.push(`<div class="cab-cal__week">${cells.join('')}</div>`);
    }
    const summary = `За ${weeks} недель: ${active} ${plural(active, 'день', 'дня', 'дней')} с занятиями`;
    return `<div class="cab-cal" role="img" aria-label="${esc(summary)}">${columns.join('')}</div><p class="cab-hint">${esc(summary)}${total ? `, всего ${total} ${plural(total, 'действие', 'действия', 'действий')}` : ''}.</p>`;
}

/* ---------- Достижения ---------- */

export type Achievement = {
    id: string; title: string; text: string; earned: boolean; progress: string;
    tier: Tier; glyph: Glyph; fraction: number;
};

/** Сколько глав целиком пройдено на всех языках: учебные главы берутся из тех же списков, что и в режиме обучения. */
export function completedChapters(data: CabinetData, questsFor: (track: AccountTrack) => Quest[]): number {
    let count = 0;
    (Object.keys(data.progress) as AccountTrack[]).forEach((track) => {
        const done = new Set(Object.keys(data.progress[track]));
        questGroups(questsFor(track)).forEach((group) => { if (group.quests.length && group.quests.every((quest) => done.has(quest.id))) count += 1; });
    });
    return count;
}

/** Достижения считаются из того, что уже есть в кабинете; новых данных они не требуют. */
export function computeAchievements(data: CabinetData, totals: Record<AccountTrack, number>, chapters = 0): Achievement[] {
    const keys = Object.keys(totals) as AccountTrack[];
    const counts = keys.reduce((acc, key) => ({ ...acc, [key]: Object.keys(data.progress[key]).length }), {} as Record<AccountTrack, number>);
    const all = keys.reduce((sum, key) => sum + counts[key], 0);
    const languages = keys.filter((key) => counts[key] > 0).length;
    const busiest = Math.max(0, ...Object.values(data.activity.days));
    const item = (id: string, tier: Tier, glyph: Glyph, title: string, text: string, value: number, goal: number): Achievement => ({
        id, tier, glyph, title, text, earned: value >= goal, progress: `${Math.min(value, goal)} из ${goal}`, fraction: Math.min(1, value / Math.max(1, goal))
    });
    const trackGlyph: Record<AccountTrack, Glyph> = { blocks: 'blocks', lua: 'moon', python: 'code', sdk2: 'bolt', bricks: 'drone' };
    return [
        item('first', 'bronze', 'drone', 'Первый полёт', 'Пройдите первую миссию.', all, 1),
        item('ten', 'bronze', 'num10', 'Десять миссий', 'Пройдите десять миссий на любом языке.', all, 10),
        item('twenty-five', 'silver', 'num25', 'Двадцать пять', 'Пройдите двадцать пять миссий.', all, 25),
        item('fifty', 'silver', 'num50', 'Пятьдесят миссий', 'Пройдите пятьдесят миссий.', all, 50),
        item('hundred', 'gold', 'num100', 'Сотня', 'Пройдите сто миссий: это уже настоящий опыт.', all, 100),
        item('streak3', 'bronze', 'flame', 'Три дня подряд', 'Занимайтесь три дня подряд.', data.activity.best, 3),
        item('streak7', 'silver', 'flame', 'Неделя без пропусков', 'Занимайтесь семь дней подряд.', data.activity.best, 7),
        item('streak14', 'gold', 'flame', 'Две недели подряд', 'Занимайтесь четырнадцать дней подряд.', data.activity.best, 14),
        item('clean', 'silver', 'target', 'Сразу с первого раза', 'Пройдите пять миссий с первой проверки.', data.stats.firstTrySolved, 5),
        item('clean-25', 'gold', 'target', 'Меткий глаз', 'Пройдите двадцать пять миссий с первой проверки.', data.stats.firstTrySolved, 25),
        item('chapter-1', 'bronze', 'book', 'Глава закрыта', 'Пройдите все миссии одной главы.', chapters, 1),
        item('chapter-5', 'silver', 'book', 'Пять глав', 'Закройте пять глав целиком.', chapters, 5),
        item('polyglot', 'silver', 'globe', 'Полиглот', 'Пройдите хотя бы одну миссию в трёх разных треках (Blockly, Lua, Python, Мини 2).', languages, 3),
        item('busy', 'bronze', 'bolt', 'Рабочий день', 'Сделайте десять действий (проверок и зачётов) за один день.', busiest, 10),
        ...keys.map((key) => item(`track-${key}`, 'brand', trackGlyph[key], `${TRACK_LABELS[key]} пройден`, `Пройдите все миссии ${TRACK_LABELS[key]}.`, counts[key], Math.max(1, totals[key])))
    ];
}

/* ---------- Окно: фокус и закрытие ---------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Держит Tab внутри окна, закрывает по Escape и возвращает фокус туда, откуда окно открыли.
 * Возвращает функцию снятия перехвата.
 */
export function trapFocus(root: HTMLElement, onEscape: () => void): () => void {
    const opener = document.activeElement as HTMLElement | null;
    const handler = (event: KeyboardEvent) => {
        if (!root.isConnected) return;
        if (event.key === 'Escape') {
            // Открытый внутри диалог закрывается первым.
            const inner = root.querySelector<HTMLElement>('[data-cab-modal-close]');
            if (inner) { inner.click(); event.stopPropagation(); return; }
            onEscape();
            return;
        }
        if (event.key !== 'Tab') return;
        const scope = root.querySelector<HTMLElement>('.cab-modal') ?? root;
        const nodes = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.getClientRects().length);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!scope.contains(active)) { first.focus(); event.preventDefault(); }
        else if (event.shiftKey && active === first) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && active === last) { first.focus(); event.preventDefault(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => {
        document.removeEventListener('keydown', handler, true);
        if (opener && document.contains(opener)) opener.focus();
    };
}

/** Скачивание текста файлом (CSV открывается в Excel по-русски: BOM и «;»). */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
    const blob = new Blob(['﻿', text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Тема карточки блока миссий: оттенок и рисунок по смыслу названия (иконка 24×24, штрихом). */
const GROUP_THEMES: Array<{ id: string; match: RegExp; hue: number; art: string }> = [
    { id: 'first', match: /первая команда|полёт/i, hue: 24, art: '<circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="5" r="2.6"/><circle cx="19" cy="5" r="2.6"/><circle cx="5" cy="19" r="2.6"/><circle cx="19" cy="19" r="2.6"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>' },
    { id: 'led', match: /сигнал|подсветк/i, hue: 320, art: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>' },
    { id: 'code', match: /маленькие программы|логик/i, hue: 268, art: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>' },
    { id: 'time', match: /время|таймер/i, hue: 42, art: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>' },
    { id: 'altitude', match: /высот|координат/i, hue: 200, art: '<path d="M12 21V4M7 9l5-5 5 5M4 21h16M6 16h3M15 12h3"/>' },
    { id: 'route', match: /маршрут/i, hue: 140, art: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6" stroke-dasharray="2 2.4"/>' },
    { id: 'terrain', match: /полигон|местност/i, hue: 168, art: '<path d="M3 19l6-11 4 6 3-4 5 9z"/><path d="M9 8l-1.5 2.5"/>' },
    { id: 'sensor', match: /измерен|датчик|устойчив/i, hue: 188, art: '<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>' },
    { id: 'camera', match: /камер|оптическ|цвет/i, hue: 345, art: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>' },
    { id: 'marker', match: /aruco|метк/i, hue: 222, art: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M8 8h3v3H8zM13 8h3M8 13h3M13 13h3v3M13 16h-2"/>' },
    { id: 'solo', match: /самостоятельн|проект/i, hue: 48, art: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>' },
    { id: 'heading', match: /курс|смещени|груз/i, hue: 8, art: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>' },
    { id: 'link', match: /пульт|связь|wi-?fi|периферия/i, hue: 236, art: '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0"/><circle cx="12" cy="19" r="1"/><path d="M2.5 9.5a14 14 0 0 1 19 0"/>' },
];
const GROUP_FALLBACK_ART = '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';

export function groupTheme(label: string, index: number): { id: string; hue: number; art: string } {
    return GROUP_THEMES.find((theme) => theme.match.test(label)) ?? { id: 'other', hue: (index * 47 + 20) % 360, art: GROUP_FALLBACK_ART };
}
