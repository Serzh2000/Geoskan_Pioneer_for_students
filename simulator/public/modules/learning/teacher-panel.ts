/**
 * Кабинет учителя: список учеников, создание и правка аккаунта, прогресс по миссиям с ручным зачётом и снятием.
 * Миссии берутся из тех же списков, что и в режиме обучения, поэтому учитель видит те же названия и главы.
 */
import { ACCOUNT_TRACKS, teacherApi, type AccountTrack, type StudentDetail, type StudentSummary } from './account.js';
import { buildAcademyQuests, buildQuests, questGroups, type Quest } from './quests.js';

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TRACK_LABELS: Record<AccountTrack, string> = { blocks: 'Blockly', lua: 'Lua', python: 'Python' };
const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

let root: HTMLElement | null = null;
let students: StudentSummary[] = [];
let selected: StudentDetail | null = null;
let track: AccountTrack = 'blocks';
let search = '';
let notice: { kind: 'ok' | 'error'; text: string } | null = null;
let creating = false;
const questCache: Partial<Record<AccountTrack, Quest[]>> = {};

const questsFor = (forTrack: AccountTrack): Quest[] =>
    questCache[forTrack] ??= forTrack === 'blocks' ? buildQuests() : buildAcademyQuests(forTrack);

function say(kind: 'ok' | 'error', text: string): void {
    notice = { kind, text };
    render();
}

async function refreshList(): Promise<void> {
    students = await teacherApi.list();
}

async function select(id: string): Promise<void> {
    creating = false;
    notice = null;
    selected = await teacherApi.get(id);
    render();
}

async function guard(action: () => Promise<void>): Promise<void> {
    try {
        await action();
    } catch (error) {
        say('error', (error as Error).message);
    }
}

function renderList(): string {
    const needle = search.trim().toLowerCase();
    const rows = students.filter((student) => !needle || student.fullName.toLowerCase().includes(needle) || student.login.toLowerCase().includes(needle));
    return `
        <div class="teacher-list">
            <div class="teacher-list__tools">
                <input class="auth-input" type="search" placeholder="Поиск по ФИО или логину" value="${esc(search)}" data-teacher-search aria-label="Поиск ученика">
                <button type="button" class="btn-primary btn--sm" data-teacher-new>Новый ученик</button>
            </div>
            <ul>${rows.map((student) => `
                <li><button type="button" class="teacher-row${selected?.id === student.id ? ' is-current' : ''}" data-teacher-student="${student.id}">
                    <strong>${esc(student.fullName)}</strong>
                    <small>${esc(student.login)} · Blockly ${student.counts.blocks} · Lua ${student.counts.lua} · Python ${student.counts.python}</small>
                </button></li>`).join('') || `<li class="teacher-empty">${students.length ? 'Никого не нашли.' : 'Учеников пока нет. Они могут зарегистрироваться сами, или создайте аккаунт кнопкой выше.'}</li>`}
            </ul>
        </div>`;
}

function renderCreate(): string {
    return `
        <form class="teacher-card" data-teacher-create>
            <h3>Новый ученик</h3>
            <label class="auth-field"><span>ФИО</span><input class="auth-input" name="fullName" required></label>
            <label class="auth-field"><span>Логин</span><input class="auth-input" name="login" required autocomplete="off"></label>
            <label class="auth-field"><span>Пароль</span><input class="auth-input" name="password" required autocomplete="new-password"></label>
            <div class="auth-actions"><button type="submit" class="btn-primary">Создать</button><button type="button" class="btn-secondary" data-teacher-cancel>Отмена</button></div>
        </form>`;
}

function renderStudent(student: StudentDetail): string {
    const quests = questsFor(track);
    const groups = questGroups(quests).map((group) => `
        <section class="teacher-group"><h4>${esc(group.label)} <small>${group.quests.filter((quest) => student.progress[track][quest.id]).length} из ${group.quests.length}</small></h4>
            <div class="teacher-tiles">${group.quests.map((quest) => {
                const completion = student.progress[track][quest.id];
                const title = completion
                    ? `${esc(quest.title)}: засчитана ${completion.by === 'teacher' ? 'учителем' : 'автоматически'} ${new Date(completion.at).toLocaleString('ru-RU')}. Нажмите, чтобы отменить`
                    : `${esc(quest.title)}: не пройдена. Нажмите, чтобы засчитать`;
                return `<button type="button" class="teacher-tile${completion ? ' is-done' : ''}${completion?.by === 'teacher' ? ' is-manual' : ''}" data-teacher-toggle="${esc(quest.id)}" aria-pressed="${completion ? 'true' : 'false'}" title="${title}">
                    <span>${completion ? TICK : quest.number}</span><em>${esc(quest.title)}</em>${completion?.by === 'teacher' ? '<b>учитель</b>' : ''}</button>`;
            }).join('')}</div></section>`).join('');
    const stats = ACCOUNT_TRACKS.map((key) => {
        const total = questsFor(key).length;
        const count = student.counts[key];
        return `<button type="button" class="teacher-stat${key === track ? ' is-active' : ''}" data-teacher-track="${key}" aria-pressed="${key === track}">
            <span class="teacher-stat__name">${TRACK_LABELS[key]}</span>
            <span class="teacher-stat__value">${count}<small> из ${total}</small></span>
            <span class="teacher-stat__bar"><i style="width:${Math.round((count / total) * 100)}%"></i></span></button>`;
    }).join('');
    return `
        <div class="teacher-student">
            <header class="teacher-student__head">
                <div><h3>${esc(student.fullName)}</h3><div class="teacher-meta">Логин ${esc(student.login)} · создан ${new Date(student.createdAt).toLocaleDateString('ru-RU')}</div></div>
            </header>
            <div class="teacher-student__grid">
                <form data-teacher-edit class="teacher-panelbox teacher-edit">
                    <h4>Аккаунт</h4>
                    <label class="auth-field"><span>ФИО</span><input class="auth-input" name="fullName" value="${esc(student.fullName)}" required></label>
                    <label class="auth-field"><span>Логин</span><input class="auth-input" name="login" value="${esc(student.login)}" required autocomplete="off"></label>
                    <label class="auth-field"><span>Новый пароль</span><input class="auth-input" name="password" placeholder="Пусто — не менять" autocomplete="new-password"><small>Старый пароль показать нельзя: на сервере хранится только его хеш.</small></label>
                    <div class="auth-actions"><button type="submit" class="btn-primary btn--sm">Сохранить</button><button type="button" class="btn-secondary btn--sm teacher-danger" data-teacher-delete>Удалить</button></div>
                </form>
                <div class="teacher-panelbox teacher-progress">
                    <h4>Прогресс</h4>
                    <div class="teacher-stats">${stats}</div>
                    <p class="teacher-meta">Нажмите на миссию, чтобы засчитать или отменить её вручную. Оранжевая рамка: зачёт выставил учитель.</p>
                    ${groups}
                </div>
            </div>
        </div>`;
}

function render(): void {
    if (!root) return;
    root.innerHTML = `
        <div class="teacher-shell" role="dialog" aria-modal="true" aria-labelledby="teacher-title">
            <header class="teacher-head">
                <h2 id="teacher-title">Кабинет учителя</h2>
                <button type="button" class="btn-secondary btn--sm" data-teacher-close>Закрыть</button>
            </header>
            ${notice ? `<div class="teacher-notice teacher-notice--${notice.kind}" role="status">${esc(notice.text)}</div>` : ''}
            <div class="teacher-body">
                ${renderList()}
                <div class="teacher-main">${creating ? renderCreate() : selected ? renderStudent(selected) : '<div class="teacher-empty">Выберите ученика слева.</div>'}</div>
            </div>
        </div>`;
    wire();
}

function wire(): void {
    if (!root) return;
    const on = (selector: string, handler: (node: HTMLElement) => void) => root!.querySelectorAll<HTMLElement>(selector).forEach((node) => node.addEventListener('click', () => handler(node)));
    on('[data-teacher-close]', closeTeacherPanel);
    on('[data-teacher-student]', (node) => { void guard(() => select(node.dataset.teacherStudent!)); });
    on('[data-teacher-new]', () => { creating = true; selected = null; notice = null; render(); });
    on('[data-teacher-cancel]', () => { creating = false; render(); });
    on('[data-teacher-track]', (node) => { track = node.dataset.teacherTrack as AccountTrack; render(); });
    on('[data-teacher-toggle]', (node) => {
        if (!selected) return;
        const id = node.dataset.teacherToggle!;
        const student = selected;
        void guard(async () => {
            selected = await teacherApi.setDone(student.id, track, id, !student.progress[track][id]);
            await refreshList();
            render();
        });
    });
    on('[data-teacher-delete]', () => {
        if (!selected || !window.confirm(`Удалить аккаунт «${selected.fullName}» вместе с прогрессом? Это нельзя отменить.`)) return;
        const id = selected.id;
        void guard(async () => {
            await teacherApi.remove(id);
            selected = null;
            await refreshList();
            say('ok', 'Аккаунт удалён.');
        });
    });
    root.querySelector<HTMLInputElement>('[data-teacher-search]')?.addEventListener('input', (event) => {
        search = (event.target as HTMLInputElement).value;
        const caret = (event.target as HTMLInputElement).selectionStart;
        render();
        const input = root!.querySelector<HTMLInputElement>('[data-teacher-search]');
        input?.focus();
        if (caret !== null) input?.setSelectionRange(caret, caret);
    });
    root.querySelector<HTMLFormElement>('[data-teacher-create]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.target as HTMLFormElement).entries()) as Record<string, string>;
        void guard(async () => {
            const created = await teacherApi.create({ fullName: values.fullName, login: values.login, password: values.password });
            creating = false;
            selected = created;
            await refreshList();
            say('ok', `Аккаунт создан: логин ${created.login}.`);
        });
    });
    root.querySelector<HTMLFormElement>('[data-teacher-edit]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!selected) return;
        const values = Object.fromEntries(new FormData(event.target as HTMLFormElement).entries()) as Record<string, string>;
        const id = selected.id;
        void guard(async () => {
            selected = await teacherApi.update(id, { fullName: values.fullName, login: values.login, password: values.password || undefined });
            await refreshList();
            say('ok', values.password ? 'Сохранено, пароль изменён. Ученик выйдет из аккаунта на других устройствах.' : 'Сохранено.');
        });
    });
}

export function closeTeacherPanel(): void {
    root?.remove();
    root = null;
}

export async function openTeacherPanel(): Promise<void> {
    closeTeacherPanel();
    root = document.createElement('div');
    root.className = 'teacher-overlay';
    document.body.appendChild(root);
    selected = null;
    creating = false;
    notice = null;
    render();
    await guard(async () => {
        await refreshList();
        render();
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root && !document.querySelector('.auth-overlay:not([hidden])')) closeTeacherPanel();
});
