/**
 * Кабинет учителя. Разделы:
 *  «Класс» — таблица учеников с фильтрами, сортировкой, массовыми действиями;
 *  «Таблица» — журнал ученик × миссия; «Ученик» — аккаунт, зачёты с комментарием, история попыток;
 *  «Где застревают» — сводка по проверкам с именами; «Что улучшить» — обезличенная метрика по урокам.
 * Названия миссий берутся из тех же списков, что и в режиме обучения.
 */
import {
    ACCOUNT_TRACKS, adminApi, getAdminOrg, getUser, orgApi, setAdminOrg, teacherApi, viewAsStudent,
    type AdminOrg, type OrgData, type OrgInvite,
    type AccountTrack, type AttemptRecord, type BulkCredentials, type CabinetData, type MetricsSummary, type Overview, type OverviewStudent,
    type QuestStats, type StuckStudent, type FailedAttempt, type StudentDetail
} from './account.js';
import { renderMedal, renderRankBadge, rankFor } from './achievement-art.js';
import { ago, downloadText, esc, fmtDate, fmtDateTime, fmtDuration, groupTheme, ICON, initials, plural, renderCalendar, TRACK_LABELS, trapFocus, completedChapters, computeAchievements } from './cabinet-kit.js';
import { openOwnCabinet } from './account-ui.js';
import { questGroups } from './quests.js';
import { createQuestCache, trackTotals } from './tracks.js';
import {
    countByStatus, credentialsReport, filterStudents, matrixReport, sortStudents, STATUS_LABELS, studentStatus, summaryReport, troubleScore,
    type SortKey, type StatusFilter, type StudentFilter, type StudentStatus
} from './teacher-report.js';

type View = 'class' | 'matrix' | 'student' | 'stuck' | 'improve' | 'org' | 'admin';
type Modal =
    | { kind: 'add'; mode: 'list' | 'one' }
    | { kind: 'credentials'; title: string; rows: BulkCredentials[]; skipped: { line: string; reason: string }[] }
    | { kind: 'classes' }
    | { kind: 'report' }
    | { kind: 'rename'; id: string; fullName: string };

const questsFor = createQuestCache();
const totals = (): Record<AccountTrack, number> => trackTotals(questsFor);
const titleOf = (track: AccountTrack, id: string) => {
    const quest = questsFor(track).find((item) => item.id === id);
    return quest ? `${quest.number}. ${quest.title}` : id;
};

let root: HTMLElement | null = null;
let release: (() => void) | null = null;
let overview: Overview | null = null;
let view: View = 'class';
let loading = true;
let notice: { kind: 'ok' | 'error'; text: string } | null = null;
let modal: Modal | null = null;

let filter: StudentFilter = { search: '', classId: '', status: 'all' };
let sort: { key: SortKey; desc: boolean } = { key: 'name', desc: false };
let selected = new Set<string>();

let matrixTrack: AccountTrack = 'lua';
/** Ручные раскрытия блоков в карточке ученика: ключ `${трек}:${блок}`. */
const groupOpen = new Map<string, boolean>();

let stuckTrack: AccountTrack = 'lua';
let stuckStats: QuestStats[] | null = null;
let stuckDetail: { questId: string; failures: FailedAttempt[]; stuck: StuckStudent[] } | null = null;

let student: StudentDetail | null = null;
let studentCab: CabinetData | null = null;
let studentTrack: AccountTrack = 'lua';
let mission: { track: AccountTrack; id: string } | null = null;
let missionAttempts: AttemptRecord[] | null = null;

let metrics: MetricsSummary | null | undefined;
let metricsDays = 30;

/** Организация учителя (команда, ссылки) и, для админа, список всех организаций. */
let orgData: OrgData | null = null;
let adminOrgs: AdminOrg[] | null = null;
const isAdmin = () => getUser()?.role === 'admin';

/* ---------- Данные ---------- */

function say(kind: 'ok' | 'error', text: string, scroll = true): void {
    notice = { kind, text };
    render();
    // Быстрый зачёт отмечает много миссий подряд: список не должен прыгать к сообщению наверху.
    if (scroll) root?.querySelector('.cabt-notice')?.scrollIntoView({ block: 'nearest' });
}

async function guard(action: () => Promise<void>): Promise<void> {
    try { await action(); } catch (error) { say('error', (error as Error).message); }
}

async function loadOrg(): Promise<void> {
    await guard(async () => { orgData = await orgApi.get(); render(); });
}

async function loadAdminOrgs(): Promise<void> {
    await guard(async () => { adminOrgs = await adminApi.orgs(); render(); });
}

/** Ссылка, которую учитель отправляет ученикам или коллегам: открывает сайт и показывает приглашение. */
const inviteLink = (invite: OrgInvite) => `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(invite.token)}`;

async function refresh(): Promise<void> {
    overview = await teacherApi.overview();
    selected = new Set([...selected].filter((id) => overview!.students.some((item) => item.id === id)));
}

const className = (classId: string | null) => overview?.classes.find((item) => item.id === classId)?.name ?? '';
const lastSeen = (item: OverviewStudent) => Math.max(item.lastActiveAt ?? 0, item.lastAttemptAt ?? 0) || null;

async function openStudent(id: string, track?: AccountTrack, missionId?: string): Promise<void> {
    notice = null;
    view = 'student';
    student = null;
    studentCab = null;
    mission = null;
    missionAttempts = null;
    render();
    await guard(async () => {
        const [detail, cab] = await Promise.all([teacherApi.get(id), teacherApi.studentActivity(id)]);
        student = detail;
        studentCab = cab;
        const summary = overview?.students.find((item) => item.id === id);
        studentTrack = track ?? summary?.stuck?.track ?? (ACCOUNT_TRACKS.find((key) => detail.counts[key] > 0) ?? 'lua');
        render();
        if (missionId) await openMission(studentTrack, missionId);
    });
}

async function openMission(track: AccountTrack, id: string): Promise<void> {
    if (!student) return;
    mission = { track, id };
    missionAttempts = null;
    render();
    const owner = student.id;
    await guard(async () => {
        const list = await teacherApi.studentAttempts(owner, track, id);
        if (mission?.id === id && student?.id === owner) { missionAttempts = list; render(); }
    });
}

async function loadStuck(): Promise<void> {
    stuckStats = null;
    stuckDetail = null;
    render();
    await guard(async () => { stuckStats = await teacherApi.attempts(stuckTrack, filter.classId === 'none' ? '' : filter.classId); render(); });
}

async function loadMetrics(): Promise<void> {
    metrics = undefined;
    render();
    await guard(async () => { metrics = await teacherApi.metrics(metricsDays); render(); });
}

/* ---------- Класс ---------- */

const STATUS_ORDER: StudentStatus[] = ['stuck', 'today', 'active', 'away', 'new'];

function activityBars(ov: Overview): string {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) days.push(new Date(Date.parse(`${ov.today}T00:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10));
    const max = Math.max(1, ...days.map((day) => ov.activity[day] ?? 0));
    const sum = days.reduce((total, day) => total + (ov.activity[day] ?? 0), 0);
    if (!sum) return '';
    return `<section class="cabt-activity" aria-label="Сколько учеников занималось по дням за две недели">
        <div class="cabt-activity__head"><h3>Кто занимался за две недели</h3><span class="cab-muted">больше всего за день: ${max}</span></div>
        <div class="cabt-bars" role="img" aria-label="Число учеников по дням: ${days.map((day) => `${day.slice(8)}.${day.slice(5, 7)} — ${ov.activity[day] ?? 0}`).join(', ')}">${days.map((day) => {
            const count = ov.activity[day] ?? 0;
            const label = `${day.slice(8)}.${day.slice(5, 7)}: ${count} ${plural(count, 'ученик', 'ученика', 'учеников')}`;
            return `<span class="cabt-bars__col" title="${label}"><i style="height:${Math.round((count / max) * 100)}%"></i><b>${day.slice(8)}</b></span>`;
        }).join('')}</div></section>`;
}

function statusCell(item: OverviewStudent): string {
    const status = studentStatus(item);
    if (status === 'stuck' && item.stuck) {
        return `<button type="button" class="cab-chip cab-chip--danger cabt-chipbtn" data-act="open-student" data-id="${item.id}" data-track="${item.stuck.track}" data-mission="${esc(item.stuck.questId)}" title="${esc(titleOf(item.stuck.track, item.stuck.questId))}">Застрял: ${TRACK_LABELS[item.stuck.track]} ${esc(titleOf(item.stuck.track, item.stuck.questId).split('.')[0])}, ${item.stuck.fails} ${plural(item.stuck.fails, 'попытка', 'попытки', 'попыток')}</button>`;
    }
    const tone: Record<StudentStatus, string> = { stuck: 'danger', today: 'ok', active: 'plain', away: 'warn', new: 'plain' };
    const text: Record<StudentStatus, string> = { stuck: 'Застрял', today: 'Занимается сегодня', active: 'Занимается', away: 'Давно не заходил', new: 'Не начинал' };
    return `<span class="cab-chip cab-chip--${tone[status]}">${text[status]}</span>`;
}

function renderClass(ov: Overview): string {
    const counts = countByStatus(ov.students);
    const rows = sortStudents(filterStudents(ov.students, filter), sort.key, sort.desc, ov.classes);
    const all = rows.length > 0 && rows.every((item) => selected.has(item.id));
    const sums = totals();
    const chips = [`<button type="button" class="cabt-filter${filter.status === 'all' ? ' is-active' : ''}" data-act="status" data-status="all" aria-pressed="${filter.status === 'all'}">Все <b>${ov.students.length}</b></button>`,
        ...STATUS_ORDER.map((key) => `<button type="button" class="cabt-filter cabt-filter--${key}${filter.status === key ? ' is-active' : ''}" data-act="status" data-status="${key}" aria-pressed="${filter.status === key}"${counts[key] ? '' : ' data-empty="true"'}>${STATUS_LABELS[key]} <b>${counts[key]}</b></button>`)].join('');
    const th = (key: SortKey, label: string) => `<th scope="col" aria-sort="${sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}"><button type="button" class="cabt-sort" data-act="sort" data-key="${key}">${label}${sort.key === key ? (sort.desc ? ICON.sortDown : ICON.sortUp) : ''}</button></th>`;
    const bar = (item: OverviewStudent, key: AccountTrack) => {
        const count = item.counts[key];
        return `<td data-label="${TRACK_LABELS[key]}"><span class="cabt-prog"><span class="cab-meter cab-meter--sm" aria-hidden="true"><i style="width:${Math.round((count / sums[key]) * 100)}%"></i></span><span class="cab-num">${count}<small>/${sums[key]}</small></span></span></td>`;
    };
    const bulk = selected.size ? `<div class="cabt-bulk" role="region" aria-label="Действия с выбранными учениками">
            <strong>Выбрано: ${selected.size}</strong>
            <label class="cabt-inline"><span class="cab-sr">Класс для переноса</span><select class="cab-input cab-input--sm" data-bulk-class><option value="">Без класса</option>${ov.classes.map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label>
            <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="bulk-move">Перенести</button>
            <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="bulk-reset">${ICON.key}<span>Выдать новые пароли</span></button>
            <button type="button" class="cab-link" data-act="clear-selection">Снять выбор</button>
        </div>` : '';
    const empty = ov.students.length
        ? '<tr><td colspan="9" class="cab-empty">По этим условиям никого нет. Сбросьте фильтры или поиск.</td></tr>'
        : '<tr><td colspan="9" class="cab-empty">Учеников пока нет. Нажмите «Добавить учеников»: вставьте список имён, а логины и пароли появятся сами. Ученик также может зарегистрироваться сам.</td></tr>';
    return `${activityBars(ov)}
        <div class="cabt-filters" role="group" aria-label="Фильтр по состоянию">${chips}</div>
        <div class="cabt-toolbar">
            <label class="cabt-search"><span class="cab-sr">Поиск по имени или логину</span><input class="cab-input" type="search" placeholder="Поиск по имени или логину" value="${esc(filter.search)}" data-keep="search" data-filter="search"></label>
            <label class="cabt-inline"><span class="cab-sr">Класс</span><select class="cab-input" data-filter="classId">
                <option value="">Все классы</option><option value="none"${filter.classId === 'none' ? ' selected' : ''}>Без класса</option>
                ${ov.classes.map((item) => `<option value="${item.id}"${filter.classId === item.id ? ' selected' : ''}>${esc(item.name)} (${item.count ?? 0})</option>`).join('')}</select></label>
            <span class="cab-muted cabt-count" aria-live="polite">Показано ${rows.length} из ${ov.students.length}</span>
        </div>
        ${bulk}
        <div class="cabt-tablewrap"><table class="cabt-table">
            <thead><tr><th scope="col" class="cabt-check"><input type="checkbox" data-act="toggle-all" aria-label="Выбрать всех показанных"${all ? ' checked' : ''}></th>
                ${th('name', 'Ученик')}${th('class', 'Класс')}${ACCOUNT_TRACKS.map((key) => th(key, TRACK_LABELS[key])).join('')}${th('seen', 'Был')}<th scope="col">Состояние</th></tr></thead>
            <tbody>${rows.map((item) => `<tr class="${selected.has(item.id) ? 'is-selected' : ''}">
                <td class="cabt-check"><input type="checkbox" data-act="toggle-row" data-id="${item.id}" aria-label="Выбрать: ${esc(item.fullName)}"${selected.has(item.id) ? ' checked' : ''}></td>
                <td data-label="Ученик"><button type="button" class="cabt-name" data-act="open-student" data-id="${item.id}"><span class="cab-avatar cab-avatar--sm" aria-hidden="true">${esc(initials(item.fullName))}</span><span><strong>${esc(item.fullName)}</strong><small>${esc(item.login)}</small></span></button><button type="button" class="cab-btn cab-btn--ghost cab-btn--icon cabt-rename" data-act="rename-student" data-id="${item.id}" aria-label="Изменить имя: ${esc(item.fullName)}" title="Изменить имя">${ICON.edit}</button></td>
                <td data-label="Класс">${esc(className(item.classId)) || '<span class="cab-muted">—</span>'}</td>
                ${ACCOUNT_TRACKS.map((key) => bar(item, key)).join('')}
                <td data-label="Был" class="cabt-seen">${esc(ago(lastSeen(item)))}</td>
                <td data-label="Состояние">${statusCell(item)}</td></tr>`).join('') || empty}</tbody></table></div>`;
}

/* ---------- Таблица ученик × миссия ---------- */

function renderMatrix(ov: Overview): string {
    const quests = questsFor(matrixTrack);
    const rows = sortStudents(filterStudents(ov.students, { ...filter, status: 'all' }), 'name', false, ov.classes);
    const groups = questGroups(quests);
    const seg = ACCOUNT_TRACKS.map((key) => `<button type="button" role="tab" class="cab-seg__btn${key === matrixTrack ? ' is-active' : ''}" aria-selected="${key === matrixTrack}" data-act="matrix-track" data-track="${key}">${TRACK_LABELS[key]}</button>`).join('');
    const head = groups.map((group, index) => {
        const theme = groupTheme(group.label, index);
        return `<th scope="col" class="cabt-g-head" style="--g-hue:${theme.hue}" title="${esc(group.label)}"><span class="cabt-g-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${theme.art}</svg></span><span class="cabt-g-label">${esc(group.label)}</span><span class="cabt-g-total">${group.quests.length}</span></th>`;
    }).join('');
    const body = rows.map((item) => {
        const done = new Set(item.done[matrixTrack]);
        const cells = groups.map((group, index) => {
            const theme = groupTheme(group.label, index);
            const count = group.quests.filter((quest) => done.has(quest.id)).length;
            const stuck = item.stuck?.track === matrixTrack && group.quests.some((quest) => quest.id === item.stuck!.questId);
            const percent = Math.round((count / group.quests.length) * 100);
            const state = count === group.quests.length ? 'пройден целиком' : stuck ? 'застрял' : count ? 'в процессе' : 'не начат';
            return `<td class="cabt-g-cell${count === group.quests.length ? ' is-done' : ''}${stuck ? ' is-stuck' : ''}${count === 0 ? ' is-empty' : ''}" style="--g-hue:${theme.hue};--f:${percent}%">
                <button type="button" data-act="open-student" data-id="${item.id}" data-track="${matrixTrack}" title="${esc(`${item.fullName}: ${group.label}, ${count} из ${group.quests.length}, ${state}`)}"><b>${count}</b><span>/${group.quests.length}</span><span class="cab-sr"> ${state}</span></button></td>`;
        }).join('');
        return `<tr><th scope="row" class="cabt-g-name"><button type="button" class="cabt-link" data-act="open-student" data-id="${item.id}" data-track="${matrixTrack}">${esc(item.fullName)}</button></th>${cells}</tr>`;
    }).join('');
    const foot = rows.length > 1 ? `<tr class="cabt-g-avg"><th scope="row" class="cabt-g-name">Весь класс</th>${groups.map((group) => {
        const total = rows.length * group.quests.length;
        const count = rows.reduce((sum, item) => { const done = new Set(item.done[matrixTrack]); return sum + group.quests.filter((quest) => done.has(quest.id)).length; }, 0);
        return `<td><span>${Math.round((count / Math.max(1, total)) * 100)}%</span></td>`;
    }).join('')}</tr>` : '';
    return `<div class="cabt-toolbar">
            <div class="cab-seg" role="tablist" aria-label="Язык">${seg}</div>
            <label class="cabt-inline"><span class="cab-sr">Класс</span><select class="cab-input" data-filter="classId">
                <option value="">Все классы</option><option value="none"${filter.classId === 'none' ? ' selected' : ''}>Без класса</option>${ov.classes.map((item) => `<option value="${item.id}"${filter.classId === item.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
            <span class="cabt-legend"><i class="cabt-key is-done"></i>блок пройден <i class="cabt-key is-part"></i>частично <i class="cabt-key is-stuck"></i>застрял <i class="cabt-key"></i>не начат</span>
        </div>
        ${rows.length ? `<div class="cabt-tablewrap cabt-matrixwrap"><table class="cabt-gm"><thead><tr><th class="cabt-g-name" scope="col">Ученик</th>${head}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>
        <p class="cab-hint">Каждая клетка — блок миссий: сколько миссий из него пройдено. Нажмите на клетку или имя, чтобы открыть ученика.</p>` : '<p class="cab-empty">Нет учеников для таблицы.</p>'}`;
}

/* ---------- Ученик ---------- */

function renderStudent(): string {
    if (!student) return '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем ученика…</p></div>';
    const s = student;
    const summary = overview?.students.find((item) => item.id === s.id);
    const quests = questsFor(studentTrack);
    const seg = ACCOUNT_TRACKS.map((key) => `<button type="button" role="tab" class="cab-seg__btn${key === studentTrack ? ' is-active' : ''}" aria-selected="${key === studentTrack}" data-act="student-track" data-track="${key}">${TRACK_LABELS[key]} <span class="cab-num">${s.counts[key]}/${totals()[key]}</span></button>`).join('');
    const trackDone = quests.filter((quest) => s.progress[studentTrack][quest.id]);
    const nextQuestItem = quests.find((quest) => !s.progress[studentTrack][quest.id]);
    const lastDoneAt = trackDone.reduce((max, quest) => Math.max(max, s.progress[studentTrack][quest.id].at), 0);
    const manualCount = trackDone.filter((quest) => s.progress[studentTrack][quest.id].by === 'teacher').length;
    const trackPercent = Math.round((trackDone.length / Math.max(1, quests.length)) * 100);
    const stuckQuest = summary?.stuck?.track === studentTrack ? quests.find((quest) => quest.id === summary.stuck!.questId) : undefined;
    const hero = `<section class="cabt-shero" data-track="${studentTrack}" aria-label="Итог по языку ${TRACK_LABELS[studentTrack]}">
        <div class="cabt-shero__ring" role="progressbar" aria-label="Пройдено ${trackDone.length} из ${quests.length}" aria-valuemin="0" aria-valuemax="${quests.length}" aria-valuenow="${trackDone.length}" style="--p:${trackPercent}"><b>${trackPercent}%</b></div>
        <div class="cabt-shero__text">
            <h4>${TRACK_LABELS[studentTrack]}: пройдено ${trackDone.length} из ${quests.length}</h4>
            <p class="cab-muted">${nextQuestItem ? `Дальше: ${nextQuestItem.number}. ${esc(nextQuestItem.title)}` : 'Все миссии пройдены'}${lastDoneAt ? ` · последняя зачтена ${esc(fmtDate(lastDoneAt))}` : ''}</p>
        </div>
        <ul class="cabt-shero__chips">
            <li class="is-ok"><b>${trackDone.length - manualCount}</b><span>сам</span></li>
            <li class="is-manual"><b>${manualCount}</b><span>вручную</span></li>
            ${stuckQuest ? `<li class="is-bad"><b>!</b><span>застрял: ${stuckQuest.number}</span></li>` : ''}
        </ul>
    </section>`;

    const groups = questGroups(quests).map((group, groupIndex) => {
        const theme = groupTheme(group.label, groupIndex);
        const doneCount = group.quests.filter((quest) => s.progress[studentTrack][quest.id]).length;
        const complete = doneCount === group.quests.length;
        const hasNext = nextQuestItem ? group.quests.some((quest) => quest.id === nextQuestItem.id) : false;
        const key = `${studentTrack}:${group.id}`;
        const open = groupOpen.get(key) ?? (hasNext || (doneCount > 0 && !complete));
        const tiles = open ? `<div class="cabt-tiles">${group.quests.map((quest) => {
            const completion = s.progress[studentTrack][quest.id];
            const active = mission?.track === studentTrack && mission.id === quest.id;
            const stuck = summary?.stuck?.track === studentTrack && summary.stuck.questId === quest.id;
            const isNext = !completion && nextQuestItem?.id === quest.id;
            const sub = completion ? (completion.by === 'teacher' ? 'Засчитана вами' : `Пройдена ${fmtDate(completion.at)}`) : stuck ? `Застрял · ${summary!.stuck!.fails} ${plural(summary!.stuck!.fails, 'попытка', 'попытки', 'попыток')}` : isNext ? 'Дальше' : 'Не пройдена';
            const quick = `<button type="button" class="cabt-quick${completion ? ' is-on' : ''}" data-act="quick-mark" data-track="${studentTrack}" data-mission="${esc(quest.id)}" data-done="${completion ? '0' : '1'}" aria-label="${completion ? 'Снять зачёт' : 'Засчитать'}: ${esc(quest.title)}" title="${completion ? 'Снять зачёт' : 'Засчитать вручную'}">${ICON.check}</button>`;
            return `<div class="cabt-tilewrap"><button type="button" class="cabt-tile${completion ? ' is-done' : ''}${completion?.by === 'teacher' ? ' is-manual' : ''}${stuck ? ' is-stuck' : ''}${isNext ? ' is-next' : ''}${active ? ' is-active' : ''}" data-act="mission" data-track="${studentTrack}" data-mission="${esc(quest.id)}" aria-pressed="${active}">
                <span class="cabt-tile__mark">${completion ? ICON.check : quest.number}</span>
                <span class="cabt-tile__body"><span class="cabt-tile__title">${quest.number}. ${esc(quest.title)}</span><span class="cabt-tile__sub">${esc(sub)}</span></span>
                ${completion?.note ? '<span class="cabt-tile__flag" title="Есть комментарий">комментарий</span>' : ''}</button>${quick}</div>`;
        }).join('')}</div>` : '';
        const bulk = open ? `<div class="cabt-sgroup__bulk">${complete ? '' : `<button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="group-mark" data-group="${esc(group.id)}" data-done="1">${ICON.check}<span>Засчитать весь блок (${group.quests.length - doneCount})</span></button>`}${doneCount ? `<button type="button" class="cab-link" data-act="group-mark" data-group="${esc(group.id)}" data-done="0">Снять зачёты блока</button>` : ''}</div>` : '';
        return `<section class="cab-group cabt-sgroup${complete ? ' is-complete' : ''}${open ? ' is-open' : ''}" data-theme="${theme.id}" style="--g-hue:${theme.hue}">
            <svg class="cab-group__art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${theme.art}</svg>
            <button type="button" class="cab-group__head cabt-sgroup__toggle" data-act="group-toggle" data-group="${esc(key)}" aria-expanded="${open}">
                <span class="cab-group__badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${complete ? ICON.check.replace(/<svg[^>]*>|<\/svg>/g, '') : theme.art}</svg></span>
                <span class="cab-group__titles"><h4>${esc(group.label)}</h4><span class="cab-num">${doneCount} из ${group.quests.length}${complete ? ' · блок пройден' : ''}</span></span>
                <span class="cab-meter cab-group__meter" aria-hidden="true"><i style="width:${Math.round((doneCount / group.quests.length) * 100)}%"></i></span>
                <span class="cabt-sgroup__chev" aria-hidden="true"></span>
            </button>
            ${bulk}${tiles}</section>`;
    }).join('');

    let detail = '<p class="cab-hint">Нажмите на миссию, чтобы засчитать её вручную, написать комментарий и посмотреть попытки ученика.</p>';
    if (mission && mission.track === studentTrack) {
        const quest = quests.find((item) => item.id === mission!.id);
        const completion = s.progress[studentTrack][mission.id];
        const attempts = missionAttempts;
        detail = `<section class="cabt-detail" aria-label="Миссия ${esc(quest?.title ?? '')}">
            <header><h4>${esc(titleOf(studentTrack, mission.id))}</h4>
            <span class="cab-chip ${completion ? 'cab-chip--ok' : 'cab-chip--plain'}">${completion ? `${completion.by === 'teacher' ? 'Засчитана вами' : 'Прошёл сам'} · ${fmtDate(completion.at)}` : 'Не пройдена'}</span></header>
            <form class="cab-form" data-form="mark">
                <label class="cab-field"><span>Комментарий к зачёту</span><textarea class="cab-input" name="note" rows="2" maxlength="400" placeholder="Например: объяснил устно у доски. Ученик увидит это в своём кабинете.">${esc(completion?.note ?? '')}</textarea></label>
                <div class="cab-actions">
                    ${completion
                        ? `<button type="submit" class="cab-btn cab-btn--primary cab-btn--sm" data-mark="keep">Сохранить комментарий</button><button type="submit" class="cab-btn cab-btn--ghost cab-btn--sm cab-danger" data-mark="undo">Снять зачёт</button>`
                        : `<button type="submit" class="cab-btn cab-btn--primary cab-btn--sm" data-mark="done">${ICON.check}<span>Засчитать вручную</span></button>`}
                </div>
            </form>
            <h5>Попытки ученика</h5>
            ${attempts === null ? '<p class="cab-muted">Загружаем…</p>' : attempts.length ? `<ol class="cab-attempts">${attempts.slice(0, 15).map((attempt) => `<li>
                <div class="cab-attempts__row"><span class="cab-chip ${attempt.solved ? 'cab-chip--ok' : attempt.partial ? 'cab-chip--plain' : 'cab-chip--warn'}">${attempt.solved ? 'Прошла' : attempt.partial ? 'Опыт записан' : 'Не прошла'}</span><span class="cab-muted">${fmtDateTime(attempt.at)}</span>${attempt.titles.length ? `<span class="cab-attempts__why">${esc(attempt.titles.slice(0, 2).join('; '))}</span>` : ''}</div>
                ${attempt.code ? `<details><summary>Показать код</summary><pre class="cab-code-pre">${esc(attempt.code)}</pre></details>` : ''}</li>`).join('')}</ol>` : '<p class="cab-empty">Проверок по этой миссии не было.</p>'}
        </section>`;
    }

    const status = summary ? studentStatus(summary) : 'new';
    return `<div class="cabt-student">
        <header class="cabt-student__head">
            <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="tab" data-view="class">${ICON.back}<span>К классу</span></button>
            <div class="cabt-student__who"><span class="cab-avatar" aria-hidden="true">${esc(initials(s.fullName))}</span>
                <div><h3>${esc(s.fullName)} <button type="button" class="cab-btn cab-btn--ghost cab-btn--icon cabt-rename" data-act="rename-student" data-id="${s.id}" aria-label="Изменить имя" title="Изменить имя">${ICON.edit}</button></h3><p class="cab-muted">Логин ${esc(s.login)} · ${s.classId ? `класс ${esc(className(s.classId))} · ` : ''}был ${esc(ago(summary ? lastSeen(summary) : s.lastActiveAt))} · аккаунт с ${fmtDate(s.createdAt)}</p></div></div>
            <span class="cab-chip cab-chip--${status === 'stuck' ? 'danger' : status === 'away' ? 'warn' : status === 'today' ? 'ok' : 'plain'}">${STATUS_LABELS[status]}</span>
        </header>
        <div class="cabt-student__grid">
            <aside class="cabt-student__side">
                <form class="cab-block cab-form" data-form="account" aria-labelledby="cabt-acc-h">
                    <h3 id="cabt-acc-h">Аккаунт</h3>
                    <label class="cab-field"><span>Имя или ник</span><input class="cab-input" name="fullName" value="${esc(s.fullName)}" required></label>
                    <label class="cab-field"><span>Логин</span><input class="cab-input" name="login" value="${esc(s.login)}" required autocomplete="off"></label>
                    <label class="cab-field"><span>Класс</span><select class="cab-input" name="classId"><option value="">Без класса</option>${(overview?.classes ?? []).map((item) => `<option value="${item.id}"${s.classId === item.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
                    <label class="cab-field"><span>Заметка о ученике</span><textarea class="cab-input" name="note" rows="3" maxlength="400" placeholder="Видите только вы">${esc(s.note)}</textarea></label>
                    <label class="cab-field"><span>Свой пароль (необязательно)</span><input class="cab-input" name="password" placeholder="Пусто — не менять" autocomplete="new-password"><small>Старый пароль показать нельзя: хранится только его хеш.</small></label>
                    <button type="submit" class="cab-btn cab-btn--primary cab-btn--sm">Сохранить</button>
                </form>
                <div class="cab-block cabt-danger-zone">
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="view-as" title="Открыть обучение и кабинет глазами ученика. Пароль не нужен, ничего не сохраняется.">${ICON.eye}<span>Смотреть как ученик</span></button>
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="reset-one">${ICON.key}<span>Выдать новый пароль</span></button>
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm cab-danger" data-act="delete-student">Удалить аккаунт</button>
                </div>
                ${studentCab ? (() => {
                    const list = computeAchievements(studentCab, totals(), completedChapters(studentCab, questsFor));
                    const done = ACCOUNT_TRACKS.reduce((sum, key) => sum + Object.keys(studentCab!.progress[key]).length, 0);
                    const rank = rankFor(done);
                    const earned = list.filter((item) => item.earned);
                    return `<section class="cab-block cabt-awards" aria-labelledby="cabt-awd-h"><h3 id="cabt-awd-h">Звание и награды</h3>
                        <div class="cab-rank cab-rank--compact">${renderRankBadge(rank.index, 44)}<div><strong>${esc(rank.title)}</strong><span class="cab-muted">${done} ${plural(done, 'миссия', 'миссии', 'миссий')} · наград ${earned.length} из ${list.length}</span></div></div>
                        <div class="cabt-medals">${list.map((item) => `<span class="cabt-medal${item.earned ? ' is-earned' : ''}" title="${esc(item.title)}: ${item.earned ? 'получено' : item.progress}">${renderMedal({ tier: item.tier, glyph: item.glyph, earned: item.earned, fraction: item.fraction, label: `${item.title}: ${item.earned ? 'получено' : item.progress}`, size: 46 })}</span>`).join('')}</div></section>`;
                })() : ''}
                ${studentCab ? `<section class="cab-block" aria-labelledby="cabt-act-h"><h3 id="cabt-act-h">Активность</h3>${renderCalendar(studentCab.activity.days, studentCab.activity.today)}
                    <p class="cab-hint">Проверок: ${studentCab.stats.attempts}, из них прошли ${studentCab.stats.solvedChecks}. Лучшая серия: ${studentCab.activity.best} ${plural(studentCab.activity.best, 'день', 'дня', 'дней')}.</p></section>` : ''}
            </aside>
            <section class="cabt-student__main" aria-label="Прогресс">
                <div class="cab-seg" role="tablist" aria-label="Язык">${seg}</div>
                ${hero}
                ${detail}
                ${groups}
            </section>
        </div>
    </div>`;
}

/* ---------- Где застревают ---------- */

function renderStuck(): string {
    const seg = ACCOUNT_TRACKS.map((key) => `<button type="button" role="tab" class="cab-seg__btn${key === stuckTrack ? ' is-active' : ''}" aria-selected="${key === stuckTrack}" data-act="stuck-track" data-track="${key}">${TRACK_LABELS[key]}</button>`).join('');
    // Сверху миссии с наибольшим числом настоящих ошибок; обязательные промежуточные опыты в счёт не идут.
    const rows = [...(stuckStats ?? [])].sort((a, b) => b.failures - a.failures || b.attempts - a.attempts);
    const table = stuckStats === null ? '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем…</p></div>'
        : rows.length ? `<div class="cabt-tablewrap"><table class="cabt-table cabt-table--plain"><thead><tr><th scope="col">Миссия</th><th scope="col" title="Все запуски проверки">Проверок</th><th scope="col" title="Верные промежуточные опыты миссий из нескольких запусков: ошибкой не считаются">Опытов</th><th scope="col" title="Проверки, которые не засчитаны и не были верным промежуточным опытом">Ошибок</th><th scope="col">Решили</th><th scope="col" title="Сколько ошибок в среднем было до зачёта">Ошибок до зачёта</th><th scope="col">Частые замечания</th></tr></thead><tbody>${rows.map((row) => `
            <tr class="${stuckDetail?.questId === row.questId ? 'is-selected' : ''}"><td><button type="button" class="cabt-link" data-act="stuck-quest" data-mission="${esc(row.questId)}">${esc(titleOf(stuckTrack, row.questId))}</button></td>
            <td class="cab-num">${row.attempts}</td><td class="cab-num">${row.partial || '—'}</td><td class="cab-num">${row.failures}</td><td class="cab-num">${row.studentsSolved} из ${row.students}</td><td class="cab-num">${row.avgFailsToSolve ?? '—'}</td>
            <td>${row.topIssues.map((issue) => `${esc(issue.title)} <span class="cab-muted">×${issue.count}</span>`).join('<br>') || '—'}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="cab-empty">Проверок пока нет. Данные появятся, когда ученики с аккаунтом начнут проходить миссии.</p>';
    const detail = stuckDetail ? `<section class="cab-block cabt-detail" aria-label="Разбор миссии">
        <h3>${esc(titleOf(stuckTrack, stuckDetail.questId))}</h3>
        ${stuckDetail.stuck.length ? `<h5>Кто сейчас застрял</h5><ul class="cabt-stucklist">${stuckDetail.stuck.map((item) => `<li><button type="button" class="cabt-link" data-act="open-student" data-id="${item.userId}" data-track="${stuckTrack}" data-mission="${esc(stuckDetail!.questId)}">${esc(item.name)}</button> <span class="cab-muted">${item.fails} ${plural(item.fails, 'проверка', 'проверки', 'проверок')} без зачёта, последняя ${esc(ago(item.lastAt))}</span></li>`).join('')}</ul>` : '<p class="cab-muted">Сейчас на этой миссии никто не застрял.</p>'}
        <h5>Последние неудачные попытки</h5>
        ${stuckDetail.failures.map((item) => `<div class="cabt-failure"><div class="cab-muted">${esc(item.name)} · ${fmtDateTime(item.at)} · ${esc(item.titles.join('; ') || 'без замечаний')}</div><pre class="cab-code-pre">${esc(item.code || '(код не передан)')}</pre></div>`).join('') || '<p class="cab-empty">Неудачных попыток нет.</p>'}
    </section>` : '';
    return `<div class="cabt-toolbar"><div class="cab-seg" role="tablist" aria-label="Язык">${seg}</div>
            <label class="cabt-inline"><span class="cab-sr">Класс</span><select class="cab-input" data-filter="classId" data-reload="stuck"><option value="">Все классы</option>${(overview?.classes ?? []).map((item) => `<option value="${item.id}"${filter.classId === item.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label></div>
        <p class="cab-lead">Миссии с наибольшим числом ошибок вверху. «Опыты» — верные промежуточные запуски миссий из нескольких опытов (например, сначала зелёный, потом синий): они не ошибки. Если ученики часто спотыкаются об одно замечание, формулировка задания или подсказка непонятна. Нажмите на миссию, чтобы увидеть, кто застрял и какой код пишут.</p>
        ${table}${detail}`;
}

/* ---------- Что улучшить ---------- */

function renderImprove(): string {
    const periods = [7, 30, 90].map((days) => `<button type="button" class="cab-seg__btn${metricsDays === days ? ' is-active' : ''}" role="tab" aria-selected="${metricsDays === days}" data-act="metrics-days" data-days="${days}">${days} дн.</button>`).join('');
    let body: string;
    if (metrics === undefined) body = '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Считаем…</p></div>';
    else if (metrics === null || metrics.events === 0) body = '<p class="cab-empty">Данных пока нет. Метрика копится, пока ученики работают в симуляторе: открывают миссии, просят подсказки, уходят или проходят.</p>';
    else {
        const m = metrics;
        const scored = m.quests.map((row) => ({ row, score: troubleScore(row) }));
        const worst = scored.filter((item) => item.score !== null && item.score > 0).sort((a, b) => b.score! - a.score!).slice(0, 5);
        const roles = (['guest', 'student', 'teacher'] as const).map((key) => ({ key, label: { guest: 'гости', student: 'ученики', teacher: 'учителя' }[key], count: m.roles[key] ?? 0 })).filter((item) => item.count);
        const sorted = [...scored].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.row.opens - a.row.opens);
        body = `<p class="cab-lead">За ${m.days} ${plural(m.days, 'день', 'дня', 'дней')}: ${m.sessions} ${plural(m.sessions, 'вкладка', 'вкладки', 'вкладок')} с работой в симуляторе${roles.length ? `. Запусков: ${roles.map((item) => `${item.label} — ${item.count}`).join(', ')}` : ''}. Карту заданий открывали ${m.mapOpens} ${plural(m.mapOpens, 'раз', 'раза', 'раз')}, личный кабинет — ${m.cabinetOpens}.</p>
            <section class="cab-block" aria-labelledby="cabt-worst-h"><h3 id="cabt-worst-h">Что стоит переписать в первую очередь</h3>
            ${worst.length ? `<ol class="cabt-worst">${worst.map(({ row, score }) => `<li><div><strong>${TRACK_LABELS[row.track]} · ${esc(titleOf(row.track, row.questId))}</strong>
                <p class="cab-muted">Открывали ${row.opens} ${plural(row.opens, 'раз', 'раза', 'раз')}, ушли без зачёта ${row.leaves}, подсказку открывали ${row.hints}. ${row.medianLeaveSeconds !== null ? `Уходят обычно через ${fmtDuration(row.medianLeaveSeconds)}.` : ''}</p></div>
                <span class="cabt-score" title="Чем выше, тем чаще миссию бросают или просят подсказку">${score}</span></li>`).join('')}</ol>` : '<p class="cab-muted">Пока ни одна миссия не выделяется: данных мало или все справляются.</p>'}
            </section>
            <section class="cab-block" aria-labelledby="cabt-all-h"><h3 id="cabt-all-h">Все миссии</h3>
            <div class="cabt-tablewrap"><table class="cabt-table cabt-table--plain"><thead><tr><th scope="col">Миссия</th><th scope="col">Открытий</th><th scope="col">Подсказки</th><th scope="col">Прошли</th><th scope="col">Ушли</th><th scope="col">Время до зачёта</th><th scope="col">Время до ухода</th><th scope="col">Трудность</th></tr></thead>
            <tbody>${sorted.map(({ row, score }) => `<tr><td>${TRACK_LABELS[row.track]} · ${esc(titleOf(row.track, row.questId))}</td><td class="cab-num">${row.opens}</td><td class="cab-num">${row.hints}</td><td class="cab-num">${row.done}</td><td class="cab-num">${row.leaves}</td><td class="cab-num">${fmtDuration(row.medianDoneSeconds)}</td><td class="cab-num">${fmtDuration(row.medianLeaveSeconds)}</td><td class="cab-num">${score === null ? '<span class="cab-muted" title="Меньше трёх открытий">мало данных</span>' : score}</td></tr>`).join('')}</tbody></table></div></section>
            <p class="cab-hint">Метрика анонимна: в ней нет имён, логинов и кода, только название события, миссия, время и случайный номер вкладки. «Трудность» — доля тех, кто ушёл без зачёта, плюс доля открывших подсказку; для миссий, открытых меньше трёх раз, не считается.</p>`;
    }
    return `<div class="cabt-toolbar"><div class="cab-seg" role="tablist" aria-label="Период">${periods}</div></div>${body}`;
}

/* ---------- Окна ---------- */

function renderModal(): string {
    if (!modal) return '';
    const frame = (title: string, content: string, wide = false) => `<div class="cab-modal-back" data-act="modal-backdrop"><div class="cab-modal${wide ? ' cab-modal--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header><h3>${esc(title)}</h3><button type="button" class="cab-btn cab-btn--ghost cab-btn--icon" data-act="modal-close" data-cab-modal-close aria-label="Закрыть окно">${ICON.close}</button></header>${content}</div></div>`;
    const classOptions = (overview?.classes ?? []).map((item) => `<option value="${item.id}"${filter.classId === item.id ? ' selected' : ''}>${esc(item.name)}</option>`).join('');
    if (modal.kind === 'add') {
        return frame('Добавить учеников', `
            <div class="cab-seg" role="tablist" aria-label="Способ">
                <button type="button" role="tab" class="cab-seg__btn${modal.mode === 'list' ? ' is-active' : ''}" aria-selected="${modal.mode === 'list'}" data-act="add-mode" data-mode="list">Списком</button>
                <button type="button" role="tab" class="cab-seg__btn${modal.mode === 'one' ? ' is-active' : ''}" aria-selected="${modal.mode === 'one'}" data-act="add-mode" data-mode="one">Одного</button></div>
            ${modal.mode === 'list' ? `<form class="cab-form" data-form="bulk">
                <label class="cab-field"><span>Имена или ники, по одному в строке</span><textarea class="cab-input" name="names" rows="8" required placeholder="Иванов Иван&#10;Петрова Мария&#10;Сидоров Алексей" data-autofocus></textarea><small>Логины (ivanov.ivan) и временные пароли придумает сервер. До 100 человек за раз. Пароли покажутся один раз: скачайте или распечатайте их.</small></label>
                <label class="cab-field"><span>Класс</span><select class="cab-input" name="classId"><option value="">Без класса</option>${classOptions}</select></label>
                <button type="submit" class="cab-btn cab-btn--primary">Создать аккаунты</button></form>`
            : `<form class="cab-form" data-form="one">
                <label class="cab-field"><span>Имя или ник</span><input class="cab-input" name="fullName" required data-autofocus></label>
                <label class="cab-field"><span>Логин</span><input class="cab-input" name="login" required autocomplete="off"><small>Латинские буквы, цифры, точка, дефис, подчёркивание; от 3 символов</small></label>
                <label class="cab-field"><span>Пароль</span><input class="cab-input" name="password" required autocomplete="new-password"><small>Не короче 6 символов</small></label>
                <label class="cab-field"><span>Класс</span><select class="cab-input" name="classId"><option value="">Без класса</option>${classOptions}</select></label>
                <button type="submit" class="cab-btn cab-btn--primary">Создать</button></form>`}`);
    }
    if (modal.kind === 'rename') {
        return frame('Изменить имя', `<form class="cab-form" data-form="rename" data-id="${modal.id}">
            <label class="cab-field"><span>Имя или ник ученика</span><input class="cab-input" name="fullName" value="${esc(modal.fullName)}" required maxlength="100" autocomplete="off" data-autofocus><small>Фамилия и имя полностью. Логин и пароль не меняются, прогресс и история сохраняются.</small></label>
            <div class="cab-form__row"><button type="submit" class="cab-btn cab-btn--primary">Сохранить</button><button type="button" class="cab-btn cab-btn--ghost" data-act="modal-close">Отмена</button></div></form>`);
    }
    if (modal.kind === 'credentials') {
        return frame(modal.title, `
            <p class="cab-lead">Пароли показываются только сейчас, потом их нельзя будет узнать: на сервере хранится лишь хеш. Ученик должен сменить временный пароль при первом входе.</p>
            <div class="cabt-tablewrap"><table class="cabt-table cabt-table--plain"><thead><tr><th scope="col">Имя</th><th scope="col">Логин</th><th scope="col">Пароль</th></tr></thead><tbody>${modal.rows.map((row) => `<tr><td>${esc(row.fullName)}</td><td><code>${esc(row.login)}</code></td><td><code>${esc(row.password)}</code></td></tr>`).join('')}</tbody></table></div>
            ${modal.skipped.length ? `<div class="cab-notice cab-notice--warn" role="status"><span>Не созданы: ${modal.skipped.map((item) => `«${esc(item.line)}» — ${esc(item.reason)}`).join('; ')}</span></div>` : ''}
            <div class="cab-actions"><button type="button" class="cab-btn cab-btn--primary" data-act="csv-credentials">${ICON.download}<span>Скачать CSV</span></button><button type="button" class="cab-btn cab-btn--ghost" data-act="print-credentials">${ICON.print}<span>Распечатать листки</span></button></div>`, true);
    }
    if (modal.kind === 'classes') {
        const list = overview?.classes ?? [];
        return frame('Классы', `
            ${list.length ? `<ul class="cabt-classes">${list.map((item) => `<li><form class="cabt-classrow" data-form="class-rename" data-id="${item.id}"><label class="cab-sr" for="cls-${item.id}">Название класса</label><input id="cls-${item.id}" class="cab-input cab-input--sm" name="name" value="${esc(item.name)}" required maxlength="40"><span class="cab-muted">${item.count ?? 0} ${plural(item.count ?? 0, 'ученик', 'ученика', 'учеников')}</span><button type="submit" class="cab-btn cab-btn--ghost cab-btn--sm">Переименовать</button><button type="button" class="cab-btn cab-btn--ghost cab-btn--sm cab-danger" data-act="class-delete" data-id="${item.id}">Удалить</button></form></li>`).join('')}</ul>` : '<p class="cab-empty">Классов пока нет. Создайте первый: например «8А» или «Кружок, пятница».</p>'}
            <form class="cab-form cabt-classnew" data-form="class-add"><label class="cab-field"><span>Новый класс</span><input class="cab-input" name="name" required maxlength="40" placeholder="8А" data-autofocus></label><button type="submit" class="cab-btn cab-btn--primary">${ICON.plus}<span>Создать класс</span></button></form>
            <p class="cab-hint">Удаление класса не удаляет учеников: они остаются без класса.</p>`);
    }
    return frame('Отчёт для журнала', `
        <p class="cab-lead">Файлы CSV открываются в Excel и Google Таблицах. В отчёт попадают ученики ${filter.classId ? (filter.classId === 'none' ? 'без класса' : `класса ${esc(className(filter.classId))}`) : 'всех классов'}; класс выбирается в списке учеников.</p>
        <div class="cabt-reports">
            <button type="button" class="cab-btn cab-btn--primary" data-act="csv-summary">${ICON.download}<span>Итоги: кто сколько прошёл</span></button>
            ${ACCOUNT_TRACKS.map((key) => `<button type="button" class="cab-btn cab-btn--ghost" data-act="csv-matrix" data-track="${key}">${ICON.download}<span>Журнал миссий: ${TRACK_LABELS[key]}</span></button>`).join('')}
        </div>`);
}

/* ---------- Каркас ---------- */

const TABS: Array<{ id: View; label: string }> = [
    { id: 'class', label: 'Класс' }, { id: 'matrix', label: 'Таблица' }, { id: 'stuck', label: 'Где застревают' }, { id: 'improve', label: 'Что улучшить' },
    { id: 'org', label: 'Организация' }
];
/** Вкладки: у админа ещё «Организации» (все, кого он видит). */
const tabsFor = (): Array<{ id: View; label: string }> => (isAdmin() ? [...TABS, { id: 'admin', label: 'Организации' }] : TABS);

const INVITE_STATE: Record<OrgInvite['state'], string> = { ok: 'Действует', expired: 'Срок вышел', revoked: 'Отозвана', 'used-up': 'Использована' };

function renderInviteList(invites: OrgInvite[], kind: 'student' | 'teacher'): string {
    const list = invites.filter((invite) => invite.kind === kind);
    if (!list.length) return `<p class="cab-empty">Ссылок пока нет. Создайте первую кнопкой выше.</p>`;
    return `<ul class="cabo-invites">${list.map((invite) => `<li class="cabo-invite${invite.state === 'ok' ? '' : ' is-off'}">
        <div class="cabo-invite__link"><input class="cab-input" readonly value="${esc(inviteLink(invite))}" aria-label="Ссылка-приглашение" data-select-all>
            <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="invite-copy" data-id="${invite.id}">${ICON.copy}<span>Скопировать</span></button></div>
        <div class="cabo-invite__meta">
            <span class="cab-chip ${invite.state === 'ok' ? 'cab-chip--ok' : 'cab-chip--plain'}">${INVITE_STATE[invite.state]}</span>
            <span class="cab-muted">до ${fmtDate(invite.expiresAt)} · использована ${invite.uses}${invite.maxUses ? ` из ${invite.maxUses}` : ''} · создал ${esc(invite.createdBy || 'учитель')}</span>
            ${invite.state === 'ok' ? `<button type="button" class="cab-link cab-danger" data-act="invite-revoke" data-id="${invite.id}">Отозвать</button>` : ''}
        </div></li>`).join('')}</ul>`;
}

function inviteForm(kind: 'student' | 'teacher'): string {
    return `<form class="cabo-invite-form" data-form="invite-create" data-kind="${kind}">
        <label class="cab-field"><span>Срок действия</span><select class="cab-input" name="days"><option value="7">7 дней</option><option value="30" selected>30 дней</option><option value="90">90 дней</option><option value="365">Год</option></select></label>
        <label class="cab-field"><span>Сколько человек может воспользоваться</span><input class="cab-input" name="maxUses" type="number" min="1" max="1000" placeholder="Без ограничения"></label>
        <button type="submit" class="cab-btn cab-btn--primary cab-btn--sm">${ICON.plus}<span>${kind === 'student' ? 'Создать ссылку для учеников' : 'Создать ссылку для коллег'}</span></button>
    </form>`;
}

function renderOrg(): string {
    if (!orgData) return '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем организацию…</p></div>';
    const { org, teachers, invites, counts } = orgData;
    const admin = isAdmin();
    const rename = org.canManageTeam
        ? `<form class="cab-form cabo-rename" data-form="org-rename"><label class="cab-field"><span>Название организации</span><input class="cab-input" name="name" value="${esc(org.name)}" required maxlength="60"></label>
            <button type="submit" class="cab-btn cab-btn--primary cab-btn--sm">Сохранить</button></form>`
        : `<h3 class="cabo-name">${esc(org.name)}</h3>`;
    const team = teachers.map((teacher) => `<li class="cabo-teacher">
        <span class="cab-avatar cab-avatar--sm" aria-hidden="true">${esc(initials(teacher.fullName))}</span>
        <span class="cabo-teacher__who"><strong>${esc(teacher.fullName)}</strong><small>Логин ${esc(teacher.login)} · был ${esc(ago(teacher.lastActiveAt))}</small></span>
        ${teacher.isOwner ? '<span class="cab-chip cab-chip--ok">Владелец</span>' : teacher.role === 'admin' ? '<span class="cab-chip cab-chip--plain">Админ</span>' : ''}
        ${admin && teacher.role === 'teacher' ? `<button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="teacher-reset" data-id="${teacher.id}">${ICON.key}<span>Новый пароль</span></button>` : ''}
        ${org.canManageTeam && !teacher.isOwner && teacher.role === 'teacher' ? `<button type="button" class="cab-btn cab-btn--ghost cab-btn--sm cab-danger" data-act="teacher-remove" data-id="${teacher.id}">Убрать из команды</button>` : ''}
    </li>`).join('');
    return `<div class="cabo">
        <section class="cab-block cabo-section">
            ${rename}
            <p class="cab-muted">${counts.students} ${plural(counts.students, 'ученик', 'ученика', 'учеников')} · ${counts.teachers} ${plural(counts.teachers, 'учитель', 'учителя', 'учителей')}${org.blocked ? ' · организация заблокирована администратором' : ''}</p>
        </section>
        <section class="cab-block cabo-section" aria-labelledby="cabo-students-h">
            <h3 id="cabo-students-h">Ссылки для учеников</h3>
            <p class="cab-muted">Отправьте ссылку ученикам: они зарегистрируются сами и сразу попадут в вашу организацию. Потом вы разложите их по классам. Видеть их будете только вы и ваши коллеги.</p>
            ${inviteForm('student')}
            ${renderInviteList(invites, 'student')}
        </section>
        <section class="cab-block cabo-section" aria-labelledby="cabo-team-h">
            <h3 id="cabo-team-h">Команда</h3>
            <ul class="cabo-team">${team}</ul>
            ${org.canManageTeam ? `<h4>Пригласить коллегу</h4>
                <p class="cab-muted">Коллега станет учителем вашей организации: увидит всех её учеников и классы, но не сможет приглашать и убирать других учителей.</p>
                ${inviteForm('teacher')}${renderInviteList(invites, 'teacher')}` : '<p class="cab-muted">Приглашать и убирать коллег может владелец организации.</p>'}
        </section>
    </div>`;
}

function renderAdmin(): string {
    if (!adminOrgs) return '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем организации…</p></div>';
    const rows = adminOrgs.map((org) => `<tr class="${org.blocked ? 'is-blocked' : ''}">
        <td data-label="Организация"><strong>${esc(org.name)}</strong>${org.isMain ? ' <span class="cab-chip cab-chip--plain">основная</span>' : ''}${org.blocked ? ' <span class="cab-chip cab-chip--danger">заблокирована</span>' : ''}</td>
        <td data-label="Владелец">${esc(org.ownerName || '—')}</td>
        <td data-label="Учителей">${org.teachers}</td>
        <td data-label="Учеников">${org.students}</td>
        <td data-label="Был(а)">${esc(ago(org.lastActiveAt))}</td>
        <td class="cabo-actions"><button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="admin-open" data-id="${org.id}">Открыть</button>
            ${org.isMain ? '' : `<button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="admin-block" data-id="${org.id}" data-blocked="${org.blocked ? '0' : '1'}">${org.blocked ? 'Разблокировать' : 'Заблокировать'}</button>
            <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm cab-danger" data-act="admin-delete" data-id="${org.id}">Удалить</button>`}</td></tr>`).join('');
    return `<div class="cabo"><section class="cab-block cabo-section">
        <h3>Все организации</h3>
        <p class="cab-muted">Учителя регистрируются сами и создают организации. «Открыть» переключает кабинет на организацию: вы видите её учеников и команду. Удаление переносит учеников в «Основную», учителей и классы организации стирает.</p>
        <div class="cab-tablewrap"><table class="cabt-table cabt-table--plain cabo-table"><thead><tr><th>Организация</th><th>Владелец</th><th>Учителей</th><th>Учеников</th><th>Был(а)</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </section></div>`;
}

/** Админ выбирает, чьих учеников смотрит: «Все» или одну организацию. */
function renderAdminScope(): string {
    if (!isAdmin() || !adminOrgs) return '';
    const current = getAdminOrg() ?? '';
    const options = [`<option value="*"${current === '*' ? ' selected' : ''}>Все организации</option>`, ...adminOrgs.map((org) => `<option value="${org.id}"${current === org.id || (!current && org.isMain) ? ' selected' : ''}>${esc(org.name)}</option>`)].join('');
    return `<label class="cabo-scope"><span class="cab-sr">Организация</span><select class="cab-input cab-input--sm" data-act="admin-scope" aria-label="Организация">${options}</select></label>`;
}

function render(): void {
    if (!root) return;
    const keep = document.activeElement as HTMLElement | null;
    const keepKey = keep?.dataset?.keep;
    const caret = keep instanceof HTMLInputElement ? keep.selectionStart : null;
    const scroll = root.querySelector<HTMLElement>('.cabt-content')?.scrollTop ?? 0;

    let content: string;
    if (loading || !overview) content = '<div class="cab-state" role="status"><span class="cab-spinner" aria-hidden="true"></span><p>Загружаем класс…</p></div>';
    else if (view === 'class') content = renderClass(overview);
    else if (view === 'matrix') content = renderMatrix(overview);
    else if (view === 'student') content = renderStudent();
    else if (view === 'stuck') content = renderStuck();
    else if (view === 'org') content = renderOrg();
    else if (view === 'admin') content = renderAdmin();
    else content = renderImprove();

    const tabs = [...tabsFor(), ...(view === 'student' ? [{ id: 'student' as View, label: student ? student.fullName : 'Ученик' }] : [])];
    root.innerHTML = `
        <div class="cab-shell cabt-shell" role="dialog" aria-modal="true" aria-labelledby="cabt-title"${modal ? ' aria-hidden="true"' : ''}>
            <header class="cab-top">
                <h2 id="cabt-title">${isAdmin() ? 'Кабинет администратора' : 'Кабинет учителя'}</h2>
                <div class="cabt-top__actions">
                    ${renderAdminScope()}
                    <button type="button" class="cab-btn cab-btn--primary cab-btn--sm" data-act="add-open">${ICON.plus}<span>Добавить учеников</span></button>
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="classes-open">${ICON.users}<span>Классы</span></button>
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--sm" data-act="report-open">${ICON.download}<span>Отчёт CSV</span></button>
                    <button type="button" class="cab-btn cab-btn--ghost cab-btn--icon" data-act="close" aria-label="Закрыть кабинет">${ICON.close}</button>
                </div>
            </header>
            <nav class="cabt-tabs" role="tablist" aria-label="Разделы">${tabs.map((item) => `<button type="button" role="tab" class="cabt-tab${view === item.id ? ' is-active' : ''}" aria-selected="${view === item.id}" data-act="tab" data-view="${item.id}">${esc(item.label)}</button>`).join('')}</nav>
            <div class="cabt-content" id="cabt-content">
                ${notice ? `<div class="cab-notice cab-notice--${notice.kind} cabt-notice" role="${notice.kind === 'error' ? 'alert' : 'status'}"><span>${esc(notice.text)}</span><button type="button" class="cab-link" data-act="dismiss">Скрыть</button></div>` : ''}
                ${content}
            </div>
        </div>
        ${renderModal()}`;
    const fresh = root.querySelector<HTMLElement>('.cabt-content');
    if (fresh) fresh.scrollTop = scroll;
    if (keepKey) {
        const again = root.querySelector<HTMLInputElement>(`[data-keep="${keepKey}"]`);
        again?.focus();
        if (again && caret !== null) again.setSelectionRange(caret, caret);
    }
    root.querySelector<HTMLElement>('[data-autofocus]')?.focus();
}

/* ---------- События ---------- */

const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

function download(name: string, text: string): void { downloadText(name, text); }

function printCredentials(rows: BulkCredentials[]): void {
    const popup = window.open('', '_blank', 'width=800,height=700');
    if (!popup) { say('error', 'Браузер заблокировал окно печати. Разрешите всплывающие окна или скачайте CSV.'); return; }
    const slips = rows.map((row) => `<div class="slip"><b>${esc(row.fullName)}</b><div>Сайт: simulator.sakoryagin.ru</div><div>Логин: <code>${esc(row.login)}</code></div><div>Пароль: <code>${esc(row.password)}</code></div><small>Пароль временный: смените его при первом входе.</small></div>`).join('');
    popup.document.write(`<!doctype html><meta charset="utf-8"><title>Логины и пароли</title><style>body{font:14px system-ui,sans-serif;margin:16px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0}.slip{border:1px dashed #888;padding:12px 14px;break-inside:avoid;display:grid;gap:4px}code{font:600 15px ui-monospace,monospace}small{color:#555}</style><div class="grid">${slips}</div>`);
    popup.document.close();
    popup.focus();
    popup.print();
}

async function handleAction(node: HTMLElement): Promise<void> {
    const act = node.dataset.act!;
    const id = node.dataset.id ?? '';
    switch (act) {
        case 'close': closeTeacherPanel(); return;
        case 'dismiss': notice = null; render(); return;
        case 'tab': {
            const next = node.dataset.view as View;
            notice = null;
            view = next;
            if (next === 'stuck') { await loadStuck(); return; }
            if (next === 'improve') { await loadMetrics(); return; }
            if (next === 'org') { orgData = null; render(); await loadOrg(); return; }
            if (next === 'admin') { adminOrgs = null; render(); await loadAdminOrgs(); return; }
            render();
            return;
        }
        case 'invite-copy': {
            const invite = orgData?.invites.find((item) => item.id === id);
            if (!invite) return;
            const link = inviteLink(invite);
            try { await navigator.clipboard.writeText(link); say('ok', 'Ссылка скопирована. Отправьте её в мессенджере или напишите на доске.', false); }
            catch { window.prompt('Скопируйте ссылку (Ctrl+C):', link); }
            return;
        }
        case 'invite-revoke': {
            if (!window.confirm('Отозвать ссылку? По ней больше нельзя будет зарегистрироваться. Уже зарегистрированные останутся.')) return;
            await guard(async () => { await orgApi.revokeInvite(id); orgData = await orgApi.get(); say('ok', 'Ссылка отозвана.', false); });
            return;
        }
        case 'teacher-remove': {
            const teacher = orgData?.teachers.find((item) => item.id === id);
            if (!teacher || !window.confirm(`Убрать «${teacher.fullName}» из команды? Аккаунт останется, но у него будет своя пустая организация без ваших учеников.`)) return;
            await guard(async () => { await orgApi.removeTeacher(id); orgData = await orgApi.get(); say('ok', 'Учитель убран из команды.', false); });
            return;
        }
        case 'teacher-reset': {
            const teacher = orgData?.teachers.find((item) => item.id === id);
            if (!teacher || !window.confirm(`Выдать «${teacher.fullName}» новый пароль? Старый перестанет работать.`)) return;
            await guard(async () => {
                const result = await adminApi.resetTeacherPassword(id);
                modal = { kind: 'credentials', title: 'Новый пароль учителя', rows: [{ id, fullName: result.fullName, login: result.login, password: result.password }], skipped: [] };
                render();
            });
            return;
        }
        case 'admin-open': {
            setAdminOrg(id);
            await guard(async () => { await refresh(); orgData = null; view = 'class'; render(); });
            return;
        }
        case 'admin-block': {
            const block = node.dataset.blocked === '1';
            if (block && !window.confirm('Заблокировать организацию? Её учителя не смогут войти. Ученики продолжат учиться.')) return;
            await guard(async () => { await adminApi.update(id, { blocked: block }); adminOrgs = await adminApi.orgs(); say('ok', block ? 'Организация заблокирована.' : 'Организация разблокирована.', false); });
            return;
        }
        case 'admin-delete': {
            const org = adminOrgs?.find((item) => item.id === id);
            if (!org || !window.confirm(`Удалить организацию «${org.name}»? Её ${org.students} ${plural(org.students, 'ученик', 'ученика', 'учеников')} перейдут в «Основную» без класса, а ${org.teachers} ${plural(org.teachers, 'учитель', 'учителя', 'учителей')} и классы будут удалены. Это нельзя отменить.`)) return;
            await guard(async () => {
                const result = await adminApi.remove(id);
                if (getAdminOrg() === id) setAdminOrg(null);
                adminOrgs = await adminApi.orgs();
                say('ok', `Организация удалена. В «Основную» перенесено учеников: ${result.movedStudents}.`, false);
            });
            return;
        }
        case 'status': filter = { ...filter, status: node.dataset.status as StatusFilter }; render(); return;
        case 'sort': {
            const key = node.dataset.key as SortKey;
            sort = { key, desc: sort.key === key ? !sort.desc : key === 'seen' };
            render();
            return;
        }
        case 'toggle-row': if ((node as HTMLInputElement).checked) selected.add(id); else selected.delete(id); render(); return;
        case 'toggle-all': {
            const shown = filterStudents(overview!.students, filter);
            if ((node as HTMLInputElement).checked) shown.forEach((item) => selected.add(item.id)); else shown.forEach((item) => selected.delete(item.id));
            render();
            return;
        }
        case 'clear-selection': selected.clear(); render(); return;
        case 'open-student': await openStudent(id, node.dataset.track as AccountTrack | undefined, node.dataset.mission); return;
        case 'group-toggle': { const key = node.dataset.group!; groupOpen.set(key, node.getAttribute('aria-expanded') !== 'true'); render(); return; }
        case 'matrix-track': matrixTrack = node.dataset.track as AccountTrack; render(); return;
        case 'stuck-track': stuckTrack = node.dataset.track as AccountTrack; await loadStuck(); return;
        case 'stuck-quest': {
            const questId = node.dataset.mission!;
            await guard(async () => { const result = await teacherApi.failures(stuckTrack, questId); stuckDetail = { questId, ...result }; render(); });
            return;
        }
        case 'student-track': studentTrack = node.dataset.track as AccountTrack; mission = null; missionAttempts = null; render(); return;
        case 'mission': await openMission(node.dataset.track as AccountTrack, node.dataset.mission!); return;
        case 'metrics-days': metricsDays = Number(node.dataset.days); await loadMetrics(); return;
        case 'add-open': modal = { kind: 'add', mode: 'list' }; render(); return;
        case 'add-mode': if (modal?.kind === 'add') { modal = { kind: 'add', mode: node.dataset.mode as 'list' | 'one' }; render(); } return;
        case 'rename-student': {
            const target = overview?.students.find((item) => item.id === id) ?? (student?.id === id ? student : null);
            if (!target) return;
            modal = { kind: 'rename', id, fullName: target.fullName };
            render();
            return;
        }
        case 'classes-open': modal = { kind: 'classes' }; render(); return;
        case 'report-open': modal = { kind: 'report' }; render(); return;
        case 'modal-close': modal = null; render(); return;
        case 'modal-backdrop': return;
        case 'bulk-move': {
            const classId = root!.querySelector<HTMLSelectElement>('[data-bulk-class]')?.value || null;
            await guard(async () => {
                const { moved } = await teacherApi.moveStudents([...selected], classId);
                selected.clear();
                await refresh();
                say('ok', `Перенесено: ${moved}. Теперь они ${classId ? `в классе ${className(classId)}` : 'без класса'}.`);
            });
            return;
        }
        case 'bulk-reset': {
            if (!window.confirm(`Выдать новые пароли ${selected.size} ${plural(selected.size, 'ученику', 'ученикам', 'ученикам')}? Старые перестанут работать, ученики выйдут из аккаунтов.`)) return;
            await guard(async () => {
                const rows = await teacherApi.resetPasswords([...selected]);
                selected.clear();
                await refresh();
                modal = { kind: 'credentials', title: 'Новые пароли', rows, skipped: [] };
                render();
            });
            return;
        }
        case 'view-as': {
            if (!student) return;
            const target = student;
            await guard(async () => {
                await viewAsStudent(target.id);
                closeTeacherPanel();
                openOwnCabinet();
            });
            return;
        }
        case 'quick-mark': {
            if (!student) return;
            const target = student;
            const track = node.dataset.track as AccountTrack;
            const questId = node.dataset.mission!;
            const done = node.dataset.done === '1';
            await guard(async () => {
                student = await teacherApi.setDone(target.id, track, questId, done);
                await refresh();
                say('ok', done ? 'Миссия засчитана.' : 'Зачёт снят.', false);
            });
            return;
        }
        case 'group-mark': {
            if (!student) return;
            const target = student;
            const done = node.dataset.done === '1';
            const group = questGroups(questsFor(studentTrack)).find((item) => item.id === node.dataset.group);
            if (!group) return;
            const todo = group.quests.filter((quest) => Boolean(target.progress[studentTrack][quest.id]) !== done);
            if (!todo.length) return;
            const label = done ? `Засчитать ${todo.length} ${plural(todo.length, 'миссию', 'миссии', 'миссий')} блока «${group.label}»?` : `Снять зачёт с ${todo.length} ${plural(todo.length, 'миссии', 'миссий', 'миссий')} блока «${group.label}»?`;
            if (!window.confirm(label)) return;
            await guard(async () => {
                for (const quest of todo) student = await teacherApi.setDone(target.id, studentTrack, quest.id, done);
                await refresh();
                say('ok', done ? `Засчитано миссий: ${todo.length}.` : `Снято зачётов: ${todo.length}.`, false);
            });
            return;
        }
        case 'reset-one': {
            if (!student || !window.confirm(`Выдать «${student.fullName}» новый пароль? Старый перестанет работать.`)) return;
            const target = student;
            await guard(async () => {
                const rows = await teacherApi.resetPasswords([target.id]);
                await refresh();
                modal = { kind: 'credentials', title: 'Новый пароль', rows, skipped: [] };
                render();
            });
            return;
        }
        case 'delete-student': {
            if (!student || !window.confirm(`Удалить аккаунт «${student.fullName}» вместе с прогрессом и историей? Это нельзя отменить.`)) return;
            const target = student;
            await guard(async () => {
                await teacherApi.remove(target.id);
                student = null;
                view = 'class';
                await refresh();
                say('ok', `Аккаунт «${target.fullName}» удалён.`);
            });
            return;
        }
        case 'class-delete': {
            const group = overview?.classes.find((item) => item.id === id);
            if (!group || !window.confirm(`Удалить класс «${group.name}»? Ученики останутся, но без класса.`)) return;
            await guard(async () => {
                await teacherApi.deleteClass(id);
                if (filter.classId === id) filter = { ...filter, classId: '' };
                await refresh();
                render();
            });
            return;
        }
        case 'csv-credentials': if (modal?.kind === 'credentials') download('logins-passwords.csv', credentialsReport(modal.rows)); return;
        case 'print-credentials': if (modal?.kind === 'credentials') printCredentials(modal.rows); return;
        case 'csv-summary': {
            const rows = sortStudents(filterStudents(overview!.students, { ...filter, status: 'all' }), 'name', false, overview!.classes);
            download('itogi-klassa.csv', summaryReport(rows, overview!.classes, totals(), titleOf));
            return;
        }
        case 'csv-matrix': {
            const track = node.dataset.track as AccountTrack;
            const rows = sortStudents(filterStudents(overview!.students, { ...filter, status: 'all' }), 'name', false, overview!.classes);
            download(`zhurnal-${track}.csv`, matrixReport(rows, overview!.classes, track, questsFor(track)));
            return;
        }
        default: return;
    }
}

async function handleSubmit(form: HTMLFormElement, submitter: HTMLElement | null): Promise<void> {
    const values = formValues(form);
    switch (form.dataset.form) {
        case 'org-rename': {
            await guard(async () => { orgData = await orgApi.rename(values.name); say('ok', 'Название сохранено.', false); });
            return;
        }
        case 'invite-create': {
            const kind = form.dataset.kind === 'teacher' ? 'teacher' : 'student';
            await guard(async () => {
                await orgApi.createInvite(kind, { days: Number(values.days) || 30, maxUses: values.maxUses ? Number(values.maxUses) : null });
                orgData = await orgApi.get();
                say('ok', 'Ссылка создана. Скопируйте её кнопкой рядом.', false);
            });
            return;
        }
        case 'bulk': {
            await guard(async () => {
                const result = await teacherApi.bulkCreate(values.names, values.classId || null);
                await refresh();
                modal = { kind: 'credentials', title: `Создано: ${result.created.length}`, rows: result.created, skipped: result.skipped };
                render();
            });
            return;
        }
        case 'one': {
            await guard(async () => {
                const created = await teacherApi.create({ fullName: values.fullName, login: values.login, password: values.password, classId: values.classId || null });
                await refresh();
                modal = { kind: 'credentials', title: 'Аккаунт создан', rows: [{ id: created.id, fullName: created.fullName, login: created.login, password: values.password }], skipped: [] };
                render();
            });
            return;
        }
        case 'class-add': await guard(async () => { await teacherApi.createClass(values.name); await refresh(); render(); }); return;
        case 'class-rename': await guard(async () => { await teacherApi.renameClass(form.dataset.id!, values.name); await refresh(); say('ok', 'Название сохранено.'); }); return;
        case 'rename': {
            const id = form.dataset.id!;
            await guard(async () => {
                const updated = await teacherApi.update(id, { fullName: values.fullName });
                if (student?.id === id) student = updated;
                modal = null;
                await refresh();
                say('ok', `Имя изменено: ${updated.fullName}.`);
            });
            return;
        }
        case 'account': {
            if (!student) return;
            const id = student.id;
            await guard(async () => {
                student = await teacherApi.update(id, { fullName: values.fullName, login: values.login, classId: values.classId || null, note: values.note, password: values.password || undefined });
                await refresh();
                say('ok', values.password ? 'Сохранено. Пароль изменён, ученик выйдет из аккаунта на других устройствах.' : 'Сохранено.');
            });
            return;
        }
        case 'mark': {
            if (!student || !mission) return;
            const target = student;
            const { track, id } = mission;
            const action = submitter?.dataset.mark;
            await guard(async () => {
                student = await teacherApi.setDone(target.id, track, id, action !== 'undo', values.note);
                await refresh();
                say('ok', action === 'undo' ? 'Зачёт снят.' : action === 'keep' ? 'Комментарий сохранён.' : 'Миссия засчитана.');
            });
            return;
        }
        default: return;
    }
}

function onClick(event: Event): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target || target.tagName === 'INPUT') return;
    if (target.dataset.act === 'modal-backdrop' && event.target !== target) return;
    if (target.dataset.act === 'modal-backdrop') { modal = null; render(); return; }
    void handleAction(target);
}

function onChange(event: Event): void {
    const node = event.target as HTMLElement;
    if (node instanceof HTMLSelectElement && node.dataset.act === 'admin-scope') {
        setAdminOrg(node.value);
        void guard(async () => { orgData = null; await refresh(); if (view === 'org') await loadOrg(); render(); });
        return;
    }
    if (node instanceof HTMLInputElement && node.dataset.act) { void handleAction(node); return; }
    const key = node.dataset.filter as keyof StudentFilter | undefined;
    if (!key) return;
    filter = { ...filter, [key]: (node as HTMLInputElement | HTMLSelectElement).value };
    if (node.dataset.reload === 'stuck') { void loadStuck(); return; }
    render();
}

function onInput(event: Event): void {
    const node = event.target as HTMLInputElement;
    if (node.dataset.filter !== 'search') return;
    filter = { ...filter, search: node.value };
    render();
}

function onSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (!form.dataset.form) return;
    event.preventDefault();
    void handleSubmit(form, (event as SubmitEvent).submitter as HTMLElement | null);
}

export function closeTeacherPanel(): void {
    release?.();
    release = null;
    root?.remove();
    root = null;
}

export async function openTeacherPanel(): Promise<void> {
    closeTeacherPanel();
    root = document.createElement('div');
    root.className = 'cab-overlay';
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    root.addEventListener('submit', onSubmit);
    release = trapFocus(root, closeTeacherPanel);
    view = 'class';
    student = null;
    studentCab = null;
    mission = null;
    modal = null;
    notice = null;
    loading = true;
    selected = new Set();
    orgData = null;
    adminOrgs = null;
    render();
    if (isAdmin()) await guard(async () => { adminOrgs = await adminApi.orgs(); });
    await guard(async () => { await refresh(); });
    loading = false;
    render();
    root?.querySelector<HTMLElement>('.cabt-tab.is-active')?.focus();
}
