/**
 * Личный кабинет ученика: «Дальше» (продолжить с места остановки), прогресс по трём языкам, миссии с историей проверок и
 * комментариями учителя, достижения и профиль. Данные приходят одним запросом (/api/me/cabinet); код попыток — по требованию.
 */
import {
    ACCOUNT_TRACKS, ApiError, cabinetApi, changePassword, getUser, logout, replaceUser, trackEvent,
    type AccountTrack, type AttemptRecord, type CabinetData
} from './account.js';
import { renderMedal, renderRankBadge, rankFor } from './achievement-art.js';
import { ago, completedChapters, computeAchievements, esc, fmtDate, fmtDateTime, groupTheme, ICON, initials, plural, renderCalendar, TRACK_LABELS, trapFocus } from './cabinet-kit.js';
import { firstOpenQuest, questGroups, questStatus, type Quest } from './quests.js';
import { createQuestCache, trackTotals } from './tracks.js';

type Tab = 'overview' | 'missions' | 'awards' | 'profile';
type Hooks = { openQuest: (track: AccountTrack, questId: string) => void };

const TRACK_STORAGE_KEY = 'pioneer:learning:track:v1';
const SEEN_AWARDS_KEY = 'pioneer:learning:awards-seen:v1:';

function seenAwards(userId: string): Set<string> {
    try { return new Set(JSON.parse(window.localStorage.getItem(SEEN_AWARDS_KEY + userId) || '[]') as string[]); } catch { return new Set(); }
}
function rememberAwards(userId: string, ids: string[]): void {
    try { window.localStorage.setItem(SEEN_AWARDS_KEY + userId, JSON.stringify(ids)); } catch { /* без хранилища награда просто засияет снова */ }
}
const medalList = (cab: CabinetData) => computeAchievements(cab, totals(), completedChapters(cab, questsFor));
const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'overview', label: 'Обзор', icon: ICON.grid },
    { id: 'missions', label: 'Миссии', icon: ICON.list },
    { id: 'awards', label: 'Достижения', icon: ICON.trophy },
    { id: 'profile', label: 'Профиль', icon: ICON.user }
];

let root: HTMLElement | null = null;
let release: (() => void) | null = null;
let hooks: Hooks = { openQuest: () => undefined };
let data: CabinetData | null = null;
let failure = '';
let tab: Tab = 'overview';
let missionTrack: AccountTrack = 'blocks';
let openedMission: string | null = null;
let openedGroup: string | null = null;
let history: { key: string; list: AttemptRecord[] | null; error?: string } | null = null;
let message: { kind: 'ok' | 'error'; text: string; form: 'name' | 'password' } | null = null;

const questsFor = createQuestCache();
const totals = (): Record<AccountTrack, number> => trackTotals(questsFor);
const doneList = (track: AccountTrack): string[] => (data ? Object.keys(data.progress[track]) : []);
const nextQuest = (track: AccountTrack): Quest | null => firstOpenQuest(questsFor(track), { completed: doneList(track), currentId: '' });

function savedTrack(): AccountTrack {
    try {
        const value = window.localStorage.getItem(TRACK_STORAGE_KEY);
        if ((ACCOUNT_TRACKS as readonly string[]).includes(value ?? '')) return value as AccountTrack;
    } catch { /* без хранилища начинаем с Blockly */ }
    return 'blocks';
}

/** Язык, с которого продолжить: последний выбранный, а если там всё пройдено, то первый, где есть что делать. */
function continueTrack(): AccountTrack {
    // Сначала язык последней проверки: ученик с 30 миссиями на Python не должен видеть карточку «Blockly, миссия 1».
    const lastWorked = data?.recent.find((item) => nextQuest(item.track))?.track;
    if (lastWorked) return lastWorked;
    const preferred = savedTrack();
    if (nextQuest(preferred)) return preferred;
    return ACCOUNT_TRACKS.find((track) => nextQuest(track)) ?? preferred;
}

const titleOf = (track: AccountTrack, id: string) => {
    const quest = questsFor(track).find((item) => item.id === id);
    return quest ? `${quest.number}. ${quest.title}` : id;
};

/* ---------- Разделы ---------- */

function renderNotice(form: 'name' | 'password'): string {
    return message && message.form === form ? `<div class="cab-notice cab-notice--${message.kind}" role="${message.kind === 'error' ? 'alert' : 'status'}">${esc(message.text)}</div>` : '';
}

function renderOverview(cab: CabinetData): string {
    const track = continueTrack();
    const next = nextQuest(track);
    const done = ACCOUNT_TRACKS.reduce((sum, key) => sum + Object.keys(cab.progress[key]).length, 0);
    const allDone = !next;
    const streakNow = cab.activity.current;
    const earnedCount = medalList(cab).filter((item) => item.earned).length;
    const droneArt = '<svg class="cab-next__art" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true"><circle cx="60" cy="60" r="9"/><circle cx="60" cy="60" r="3.5"/><path d="M52 52L28 28M68 52l24-24M52 68L28 92M68 68l24 24"/><circle cx="22" cy="22" r="16"/><circle cx="98" cy="22" r="16"/><circle cx="22" cy="98" r="16"/><circle cx="98" cy="98" r="16"/><path d="M10 22h24M86 22h24M10 98h24M86 98h24" stroke-dasharray="2 3"/></svg>';
    const heroStats = `<ul class="cab-next__stats" aria-label="Коротко">
            <li><b>${done}</b><span>${plural(done, 'миссия', 'миссии', 'миссий')} пройдено</span></li>
            <li><b>${streakNow}</b><span>${plural(streakNow, 'день', 'дня', 'дней')} подряд</span></li>
            <li><b>${earnedCount}</b><span>${plural(earnedCount, 'награда', 'награды', 'наград')}</span></li>
        </ul>`;
    const hero = allDone
        ? `<section class="cab-next" aria-labelledby="cab-next-h">${droneArt}<div class="cab-next__text"><span class="cab-next__kicker">Всё пройдено</span><h2 id="cab-next-h" class="cab-next__title">Все миссии пройдены</h2><p class="cab-muted">Вы прошли ${done} ${plural(done, 'миссию', 'миссии', 'миссий')}. Повторите любую или попробуйте свой полёт в свободном режиме.</p>${heroStats}</div></section>`
        : `<section class="cab-next" aria-labelledby="cab-next-h">
            ${droneArt}
            <div class="cab-next__text">
                <span class="cab-next__kicker">${done ? 'Продолжить с места остановки' : 'Начните здесь'} · ${TRACK_LABELS[track]}</span>
                <h2 id="cab-next-h" class="cab-next__title">Миссия ${next!.number}. ${esc(next!.title)}</h2>
                <p class="cab-next__goal">${esc(shortGoal(next!.goal))}</p>
                ${heroStats}
            </div>
            <button type="button" class="cab-btn cab-btn--primary cab-btn--lg" data-cab-open="${track}:${esc(next!.id)}">${ICON.play}<span>Продолжить</span></button>
        </section>`;

    const tracks = ACCOUNT_TRACKS.map((key) => {
        const total = totals()[key];
        const count = Object.keys(cab.progress[key]).length;
        const upcoming = nextQuest(key);
        const percent = Math.round((count / Math.max(1, total)) * 100);
        return `<li class="cab-track" data-track="${key}">
            <div class="cab-track__ring" role="progressbar" aria-label="${TRACK_LABELS[key]}: пройдено ${count} из ${total}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${count}" style="--p:${percent}"><span>${percent}%</span></div>
            <div class="cab-track__body">
                <div class="cab-track__head"><strong>${TRACK_LABELS[key]}</strong><span class="cab-num">${count} из ${total}</span></div>
                <div class="cab-track__foot">${upcoming
                    ? `<span class="cab-muted">Дальше: ${upcoming.number}. ${esc(upcoming.title)}</span><button type="button" class="cab-link" data-cab-open="${key}:${esc(upcoming.id)}">Открыть</button>`
                    : '<span class="cab-muted">Всё пройдено</span>'}</div>
            </div>
        </li>`;
    }).join('');

    const streak = cab.activity.current;
    const streakLine = streak > 0
        ? `<span class="cab-streak is-on">${ICON.flame}<b>${streak}</b> ${plural(streak, 'день', 'дня', 'дней')} подряд</span>`
        : `<span class="cab-streak">${ICON.flame}Серия начнётся с первой проверки</span>`;

    const comments = TRACK_ORDER.flatMap((key) => Object.entries(cab.progress[key]).filter(([, completion]) => completion.note).map(([id, completion]) => ({ key, id, completion })))
        .sort((a, b) => b.completion.at - a.completion.at).slice(0, 4);
    const commentBlock = comments.length ? `<section class="cab-block" aria-labelledby="cab-comments-h">
            <h3 id="cab-comments-h">Комментарии учителя</h3>
            <ul class="cab-feed">${comments.map(({ key, id, completion }) => `<li><div class="cab-feed__what">${esc(TRACK_LABELS[key])} · ${esc(titleOf(key, id))}</div><p class="cab-quote">${esc(completion.note)}</p><span class="cab-muted">${fmtDate(completion.at)}</span></li>`).join('')}</ul>
        </section>` : '';

    const recent = cab.recent.slice(0, 6);
    const recentBlock = `<section class="cab-block" aria-labelledby="cab-recent-h">
            <h3 id="cab-recent-h">Последние проверки</h3>
            ${recent.length ? `<ul class="cab-feed">${recent.map((item) => `<li>
                <div class="cab-feed__what">${esc(TRACK_LABELS[item.track])} · ${esc(titleOf(item.track, item.questId))}</div>
                <span class="cab-chip ${item.solved ? 'cab-chip--ok' : 'cab-chip--warn'}">${item.solved ? 'Прошла' : 'Нужно доработать'}</span>
                <span class="cab-muted">${esc(ago(item.at))}${!item.solved && item.titles[0] ? ` · ${esc(item.titles[0])}` : ''}</span></li>`).join('')}</ul>`
                : '<p class="cab-empty">Проверок пока не было. Запустите программу в миссии, и здесь появится результат.</p>'}
        </section>`;

    const list = medalList(cab);
    const earned = list.filter((item) => item.earned);
    const rank = rankFor(done);
    const rankLine = `<section class="cab-rank" aria-label="Звание">${renderRankBadge(rank.index, 52)}<div class="cab-rank__main"><strong>${esc(rank.title)}</strong><span class="cab-muted">${rank.next ? `До звания «${esc(rank.next.title)}» ещё ${rank.next.need} ${plural(rank.next.need, 'миссия', 'миссии', 'миссий')}` : 'Высшее звание'}</span>${rank.next ? `<div class="cab-meter cab-rank__meter" role="progressbar" aria-label="До следующего звания" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((done / (done + rank.next.need)) * 100)}"><i style="width:${Math.round((done / (done + rank.next.need)) * 100)}%"></i></div>` : ''}</div>
        <div class="cab-rank__medals">${earned.length ? earned.slice(-5).map((item) => `<span class="cab-rank__medal" title="${esc(item.title)}">${renderMedal({ tier: item.tier, glyph: item.glyph, earned: true, label: item.title, size: 44 })}</span>`).join('') : '<span class="cab-muted">Первая награда ждёт после первой миссии</span>'}
            <button type="button" class="cab-link" data-cab-tab="awards">Все достижения: ${earned.length} из ${list.length}</button></div></section>`;
    return `${hero}
        ${rankLine}
        <div class="cab-cols cab-cols--3">
            <section class="cab-block cab-block--tracks" aria-labelledby="cab-tracks-h"><h3 id="cab-tracks-h">Прогресс по языкам</h3><ul class="cab-tracks">${tracks}</ul></section>
            <section class="cab-block" aria-labelledby="cab-act-h"><h3 id="cab-act-h">Активность</h3>${streakLine}${renderCalendar(cab.activity.days, cab.activity.today)}
                ${cab.activity.best > 1 ? `<p class="cab-hint">Лучшая серия: ${cab.activity.best} ${plural(cab.activity.best, 'день', 'дня', 'дней')}.</p>` : ''}</section>
            ${recentBlock}
        </div>
        ${commentBlock}`;
}

const TRACK_ORDER: readonly AccountTrack[] = ACCOUNT_TRACKS;

/** Цель миссии для карточки «Продолжить»: без разметки и не длиннее двух предложений. */
function shortGoal(text: string): string {
    const clean = text.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
    const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
    const joined = sentences.slice(0, 2).join(' ').trim();
    return joined.length > 220 ? `${joined.slice(0, 217).replace(/\s+\S*$/, '')}…` : joined;
}

function renderAttempts(): string {
    if (!history) return '';
    if (history.error) return `<p class="cab-notice cab-notice--error" role="alert">${esc(history.error)}</p>`;
    if (!history.list) return '<p class="cab-muted">Загружаем историю…</p>';
    if (!history.list.length) return '<p class="cab-empty">По этой миссии проверок ещё не было.</p>';
    return `<ol class="cab-attempts">${history.list.map((attempt, index) => `<li>
        <div class="cab-attempts__row"><span class="cab-chip ${attempt.solved ? 'cab-chip--ok' : 'cab-chip--warn'}">${attempt.solved ? 'Прошла' : 'Не прошла'}</span>
        <span class="cab-muted">${esc(fmtDateTime(attempt.at))}</span>${attempt.titles.length ? `<span class="cab-attempts__why">${esc(attempt.titles.slice(0, 2).join('; '))}</span>` : ''}</div>
        ${attempt.code ? `<details><summary>Показать мой код</summary><div class="cab-code"><button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-cab-copy="${index}">${ICON.copy}<span>Скопировать</span></button><pre>${esc(attempt.code)}</pre></div></details>` : ''}
    </li>`).join('')}</ol>`;
}

function renderMissions(cab: CabinetData): string {
    const quests = questsFor(missionTrack);
    const completed = doneList(missionTrack);
    const progress = { completed, currentId: '' };
    const tabs = ACCOUNT_TRACKS.map((key) => `<button type="button" class="cab-seg__btn${key === missionTrack ? ' is-active' : ''}" role="tab" aria-selected="${key === missionTrack}" data-cab-track="${key}">${TRACK_LABELS[key]} <span class="cab-num">${Object.keys(cab.progress[key]).length}/${totals()[key]}</span></button>`).join('');
    const allGroups = questGroups(quests);
    const meterOf = (group: (typeof allGroups)[number], done: number) => `<div class="cab-meter cab-group__meter" role="progressbar" aria-label="${esc(group.label)}: пройдено ${done} из ${group.quests.length}" aria-valuemin="0" aria-valuemax="${group.quests.length}" aria-valuenow="${done}"><i style="width:${Math.round((done / group.quests.length) * 100)}%"></i></div>`;
    const artOf = (theme: { art: string }, stroke: number, cls: string) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${theme.art}</svg>`;
    const opened = allGroups.findIndex((group) => group.id === openedGroup);

    if (opened < 0) {
        const cards = allGroups.map((group, groupIndex) => {
            const groupDone = group.quests.filter((quest) => completed.includes(quest.id)).length;
            const theme = groupTheme(group.label, groupIndex);
            const next = group.quests.find((quest) => !completed.includes(quest.id) && questStatus(quests, progress, quest.id) !== 'locked');
            const hint = groupDone === group.quests.length ? 'Всё пройдено' : next ? `Дальше: ${next.number}. ${next.title}` : 'Откроется позже';
            return `<li><button type="button" class="cab-gcard${groupDone === group.quests.length ? ' is-complete' : ''}" data-cab-group="${esc(group.id)}" data-theme="${theme.id}" style="--g-hue:${theme.hue}">
                ${artOf(theme, 1, 'cab-group__art')}
                <span class="cab-group__badge">${artOf(theme, 1.8, '')}</span>
                <span class="cab-gcard__title">${esc(group.label)}</span>
                <span class="cab-gcard__hint">${esc(hint)}</span>
                <span class="cab-gcard__foot"><span class="cab-num">${groupDone} из ${group.quests.length}</span>${meterOf(group, groupDone)}</span>
            </button></li>`;
        }).join('');
        return `<div class="cab-seg" role="tablist" aria-label="Язык">${tabs}</div><ul class="cab-gcards">${cards}</ul>`;
    }

    const group = allGroups[opened];
    const groupDone = group.quests.filter((quest) => completed.includes(quest.id)).length;
    const rows = group.quests.map((quest) => {
        const status = questStatus(quests, progress, quest.id);
        const completion = cab.progress[missionTrack][quest.id];
        const open = openedMission === quest.id;
        const state = completion ? (completion.by === 'teacher' ? 'Засчитал учитель' : `Пройдена ${fmtDate(completion.at)}`) : status === 'locked' ? 'Откроется после предыдущей' : 'Можно проходить';
        return `<li class="cab-mission cab-mission--${completion ? 'done' : status}${open ? ' is-open' : ''}">
            <button type="button" class="cab-mission__row" aria-expanded="${open}" data-cab-mission="${esc(quest.id)}">
                <span class="cab-mission__mark">${completion ? ICON.check : status === 'locked' ? '' : quest.number}</span>
                <span class="cab-mission__title">${quest.number}. ${esc(quest.title)}</span>
                <span class="cab-mission__state">${esc(state)}</span>
            </button>
            ${open ? `<div class="cab-mission__more">
                ${completion?.note ? `<p class="cab-quote"><b>Учитель:</b> ${esc(completion.note)}</p>` : ''}
                ${status !== 'locked' ? `<button type="button" class="cab-btn cab-btn--primary cab-btn--sm" data-cab-open="${missionTrack}:${esc(quest.id)}">${ICON.play}<span>${completion ? 'Открыть ещё раз' : 'Открыть миссию'}</span></button>` : '<p class="cab-muted">Пройдите предыдущую миссию, и эта откроется.</p>'}
                <h4>История проверок</h4>${renderAttempts()}</div>` : ''}
        </li>`;
    }).join('');
    const theme = groupTheme(group.label, opened);
    return `<div class="cab-seg" role="tablist" aria-label="Язык">${tabs}</div>
        <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm cab-back" data-cab-group-back>← Все блоки</button>
        <section class="cab-group${groupDone === group.quests.length ? ' is-complete' : ''}" data-theme="${theme.id}" style="--g-hue:${theme.hue}">
            ${artOf(theme, 1, 'cab-group__art')}
            <header class="cab-group__head">
                <span class="cab-group__badge" aria-hidden="true">${artOf(theme, 1.8, '')}</span>
                <div class="cab-group__titles"><h3>${esc(group.label)}</h3><span class="cab-num">${groupDone} из ${group.quests.length}</span></div>
                ${meterOf(group, groupDone)}
            </header>
            <ol class="cab-missions">${rows}</ol></section>`;
}

function renderAwards(cab: CabinetData): string {
    const list = medalList(cab);
    const seen = seenAwards(cab.user.id);
    const earned = list.filter((item) => item.earned);
    const fresh = new Set(earned.filter((item) => !seen.has(item.id)).map((item) => item.id));
    // Награды показаны: в следующий раз они уже не «новые».
    window.setTimeout(() => rememberAwards(cab.user.id, earned.map((item) => item.id)), 1500);
    const card = (item: (typeof list)[number]) => `<li class="cab-medal${item.earned ? ' is-earned' : ''}${fresh.has(item.id) ? ' is-new' : ''}">
        <div class="cab-medal__art">${renderMedal({ tier: item.tier, glyph: item.glyph, earned: item.earned, fraction: item.fraction, label: `${item.title}${item.earned ? ': получено' : `: ${item.progress}`}`, size: 144 })}</div>
        <strong>${esc(item.title)}</strong><p class="cab-muted">${esc(item.text)}</p>
        <span class="cab-medal__state ${item.earned ? 'is-got' : ''}">${fresh.has(item.id) ? 'Новая награда!' : item.earned ? 'Получено' : item.progress}</span></li>`;
    return `<p class="cab-lead">Получено ${earned.length} из ${list.length}. Достижения считаются сами, из ваших проверок и зачётов.</p>
        <ul class="cab-medals">${[...list.filter((item) => item.earned), ...list.filter((item) => !item.earned)].map(card).join('')}</ul>`;
}

const PROFILE_ICON = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/></svg>',
};

function renderProfile(cab: CabinetData): string {
    const user = cab.user;
    const done = ACCOUNT_TRACKS.reduce((sum, key) => sum + Object.keys(cab.progress[key]).length, 0);
    const earned = medalList(cab).filter((item) => item.earned).length;
    const rank = rankFor(done);
    return `<section class="cab-pcard" aria-label="Профиль">
        <span class="cab-pcard__avatar" aria-hidden="true">${esc(initials(user.fullName))}</span>
        <div class="cab-pcard__who">
            <h2>${esc(user.fullName)}</h2>
            <div class="cab-pcard__chips"><span class="cab-pchip">${PROFILE_ICON.user}${esc(user.login)}</span><span class="cab-pchip cab-pchip--accent">${esc(rank.title)}</span></div>
        </div>
        <ul class="cab-next__stats cab-pcard__stats" aria-label="Коротко">
            <li><b>${done}</b><span>${plural(done, 'миссия', 'миссии', 'миссий')}</span></li>
            <li><b>${earned}</b><span>${plural(earned, 'награда', 'награды', 'наград')}</span></li>
        </ul>
    </section>
    <div class="cab-cols cab-cols--even">
        <section class="cab-block cab-fcard" aria-labelledby="cab-name-h">
            <header class="cab-fcard__head"><span class="cab-fcard__icon">${PROFILE_ICON.user}</span><div><h3 id="cab-name-h">Имя в журнале учителя</h3><p class="cab-muted">Так вас видит учитель в списке класса.</p></div></header>
            <form class="cab-form" data-cab-name novalidate>
                <label class="cab-field"><span>Фамилия и имя</span><input class="cab-input" name="fullName" value="${esc(user.fullName)}" required autocomplete="name"></label>
                <p class="cab-hint">Логин <b>${esc(user.login)}</b> изменить может только учитель.</p>
                ${renderNotice('name')}
                <button type="submit" class="cab-btn cab-btn--primary cab-btn--sm">Сохранить имя</button>
            </form>
        </section>
        <section class="cab-block cab-fcard" aria-labelledby="cab-pass-h">
            <header class="cab-fcard__head"><span class="cab-fcard__icon">${PROFILE_ICON.key}</span><div><h3 id="cab-pass-h">Смена пароля</h3><p class="cab-muted">На других устройствах придётся войти заново.</p></div></header>
            <form class="cab-form" data-cab-password novalidate>
                <label class="cab-field"><span>Текущий пароль</span><input class="cab-input" type="password" name="current" autocomplete="current-password" required></label>
                <div class="cab-form__pair">
                    <label class="cab-field"><span>Новый пароль</span><input class="cab-input" type="password" name="password" autocomplete="new-password" required><small>Не короче 6 символов</small></label>
                    <label class="cab-field"><span>Ещё раз</span><input class="cab-input" type="password" name="passwordRepeat" autocomplete="new-password" required></label>
                </div>
                ${renderNotice('password')}
                <button type="submit" class="cab-btn cab-btn--primary cab-btn--sm">Сменить пароль</button>
            </form>
        </section>
    </div>
    <section class="cab-privacy" aria-labelledby="cab-priv-h">
        <h3 id="cab-priv-h">Что сохраняется</h3>
        <ul class="cab-privacy__grid">
            <li><span class="cab-privacy__icon">${ICON.shield}</span><strong>Код видит только учитель</strong><p>Код и результаты проверок записываются, пока вы вошли в аккаунт. Без входа ничего не отправляется.</p></li>
            <li><span class="cab-privacy__icon">${PROFILE_ICON.chart}</span><strong>Анонимная статистика</strong><p>Какие миссии открывали и сколько времени они заняли. Имён и кода в ней нет, она нужна, чтобы улучшать уроки.</p></li>
            <li><span class="cab-privacy__icon">${PROFILE_ICON.clock}</span><strong>Вход на два часа</strong><p>Вход действует два часа после последнего действия. Если он закончится, всё пройденное уже сохранено на сервере.</p></li>
        </ul>
    </section>
    <div class="cab-actions"><button type="button" class="cab-btn cab-btn--ghost cab-btn--logout" data-cab-logout>${PROFILE_ICON.exit}<span>Выйти из аккаунта</span></button></div>`;
}

/* ---------- Каркас ---------- */

function render(): void {
    if (!root) return;
    const user = getUser();
    const cab = data;
    let body: string;
    if (failure) {
        body = `<div class="cab-state" role="alert"><p>${esc(failure)}</p><button type="button" class="cab-btn cab-btn--primary" data-cab-retry>Попробовать ещё раз</button></div>`;
    } else if (!cab) {
        body = '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем ваш кабинет…</p></div>';
    } else if (tab === 'overview') body = renderOverview(cab);
    else if (tab === 'missions') body = renderMissions(cab);
    else if (tab === 'awards') body = renderAwards(cab);
    else body = renderProfile(cab);

    const done = cab ? ACCOUNT_TRACKS.reduce((sum, key) => sum + Object.keys(cab.progress[key]).length, 0) : 0;
    const name = cab?.user.fullName ?? user?.fullName ?? '';
    root.innerHTML = `
        <div class="cab-shell" role="dialog" aria-modal="true" aria-labelledby="cab-title">
            <header class="cab-top">
                <h2 id="cab-title">Мой кабинет</h2>
                <button type="button" class="cab-btn cab-btn--ghost cab-btn--icon" data-cab-close aria-label="Закрыть кабинет">${ICON.close}</button>
            </header>
            <div class="cab-layout">
                <aside class="cab-side">
                    <div class="cab-who">
                        <span class="cab-avatar" aria-hidden="true">${esc(initials(name))}</span>
                        <div class="cab-who__text"><strong>${esc(name)}</strong>
                            <span class="cab-muted">${cab?.classGroup ? `Класс ${esc(cab.classGroup.name)} · ` : ''}${done} ${plural(done, 'миссия', 'миссии', 'миссий')} пройдено</span></div>
                    </div>
                    <nav class="cab-nav" role="tablist" aria-label="Разделы кабинета" aria-orientation="vertical">${TABS.map((item) => `<button type="button" role="tab" class="cab-nav__btn${tab === item.id ? ' is-active' : ''}" aria-selected="${tab === item.id}" data-cab-tab="${item.id}">${item.icon}<span>${item.label}</span></button>`).join('')}</nav>
                </aside>
                <main class="cab-main" id="cab-main" tabindex="-1">
                    ${cab?.user.mustChangePassword ? `<div class="cab-notice cab-notice--warn" role="status">${ICON.key}<span>Учитель выдал вам временный пароль. Придумайте свой в разделе «Профиль».</span><button type="button" class="cab-link" data-cab-tab="profile">Сменить</button></div>` : ''}
                    ${body}
                </main>
            </div>
        </div>`;
    wire();
}

function wire(): void {
    if (!root) return;
    const on = (selector: string, handler: (node: HTMLElement, event: Event) => void) => root!.querySelectorAll<HTMLElement>(selector).forEach((node) => node.addEventListener('click', (event) => handler(node, event)));
    on('[data-cab-close]', closeStudentCabinet);
    on('[data-cab-retry]', () => { void load(); });
    on('[data-cab-tab]', (node) => { tab = node.dataset.cabTab as Tab; message = null; render(); root?.querySelector<HTMLElement>('.cab-nav__btn.is-active')?.focus(); });
    on('[data-cab-open]', (node) => {
        const [track, ...rest] = node.dataset.cabOpen!.split(':');
        closeStudentCabinet();
        hooks.openQuest(track as AccountTrack, rest.join(':'));
    });
    on('[data-cab-track]', (node) => { missionTrack = node.dataset.cabTrack as AccountTrack; openedGroup = null; openedMission = null; history = null; render(); });
    on('[data-cab-group]', (node) => { openedGroup = node.dataset.cabGroup!; openedMission = null; history = null; render(); root?.querySelector<HTMLElement>('#cab-main')?.scrollTo({ top: 0 }); });
    on('[data-cab-group-back]', () => { openedGroup = null; openedMission = null; history = null; render(); });
    on('[data-cab-mission]', (node) => {
        const id = node.dataset.cabMission!;
        if (openedMission === id) { openedMission = null; history = null; render(); return; }
        openedMission = id;
        const key = `${missionTrack}:${id}`;
        history = { key, list: null };
        render();
        void cabinetApi.attempts(missionTrack, id).then((list) => {
            if (history?.key === key) { history = { key, list }; render(); root?.querySelector<HTMLElement>(`[data-cab-mission="${CSS.escape(id)}"]`)?.focus(); }
        }).catch((error: Error) => {
            if (history?.key === key) { history = { key, list: null, error: error.message }; render(); }
        });
    });
    on('[data-cab-copy]', (node) => {
        const code = history?.list?.[Number(node.dataset.cabCopy)]?.code ?? '';
        void navigator.clipboard?.writeText(code).then(() => { const label = node.querySelector('span'); if (label) label.textContent = 'Скопировано'; }).catch(() => undefined);
    });
    on('[data-cab-logout]', () => { closeStudentCabinet(); void logout(); });

    root.querySelector<HTMLFormElement>('[data-cab-name]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const fullName = String(new FormData(event.target as HTMLFormElement).get('fullName') ?? '');
        void cabinetApi.rename(fullName).then((user) => {
            replaceUser(user);
            if (data) data.user = user;
            message = { kind: 'ok', text: 'Имя сохранено.', form: 'name' };
        }).catch((error: Error) => { message = { kind: 'error', text: error.message, form: 'name' }; }).finally(render);
    });
    root.querySelector<HTMLFormElement>('[data-cab-password]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.target as HTMLFormElement).entries()) as Record<string, string>;
        void changePassword(values.current, values.password, values.passwordRepeat).then(() => {
            if (data) data.user = { ...data.user, mustChangePassword: false };
            const current = getUser();
            if (current) replaceUser({ ...current, mustChangePassword: false });
            message = { kind: 'ok', text: 'Пароль изменён. На других устройствах придётся войти заново.', form: 'password' };
        }).catch((error: Error) => { message = { kind: 'error', text: error.message, form: 'password' }; }).finally(render);
    });
}

async function load(): Promise<void> {
    failure = '';
    render();
    try {
        data = await cabinetApi.get();
        if (!root) return;
        missionTrack = continueTrack();
    } catch (error) {
        failure = error instanceof ApiError && error.status === 401 ? 'Вход закончился. Войдите в аккаунт заново и откройте кабинет ещё раз.' : (error as Error).message;
    }
    render();
}

export function closeStudentCabinet(): void {
    release?.();
    release = null;
    root?.remove();
    root = null;
}

export async function openStudentCabinet(next: Hooks): Promise<void> {
    closeStudentCabinet();
    hooks = next;
    tab = 'overview';
    openedGroup = null;
    openedMission = null;
    history = null;
    message = null;
    data = null;
    trackEvent('cabinet_open');
    root = document.createElement('div');
    root.className = 'cab-overlay';
    document.body.appendChild(root);
    release = trapFocus(root, closeStudentCabinet);
    await load();
    root?.querySelector<HTMLElement>('.cab-nav__btn.is-active')?.focus();
}
