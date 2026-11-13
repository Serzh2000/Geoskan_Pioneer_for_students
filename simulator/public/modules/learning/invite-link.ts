/**
 * Вход по ссылке-приглашению: `?join=<токен>`. Учитель присылает ссылку своей организации; человек открывает её и видит,
 * кто приглашает и что делать. Ученик без аккаунта регистрируется в организации, ученик с аккаунтом сам решает, переходить
 * ли (прежний учитель после перехода его не видит). Приглашение коллеги ведёт на регистрацию учителя.
 */
import { fetchInvite, getUser, joinOrganization, onUserChange, type InviteInfo } from './account.js';
import { openAccountPanel, setInviteContext } from './account-ui.js';

const PARAM = 'join';

type DialogAction = { id: string; label: string; kind: 'primary' | 'secondary' | 'skip' };

/** Небольшое окно с текстом и кнопками; возвращает id нажатой кнопки (Esc равен последней «пропускающей» кнопке). */
function showDialog(options: { title: string; text: string; extra?: string; actions: DialogAction[] }): Promise<string> {
    return new Promise((resolve) => {
        const previous = document.activeElement as HTMLElement | null;
        const back = document.createElement('div');
        back.className = 'auth-nudge-back';
        const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const buttons = options.actions.filter((action) => action.kind !== 'skip').map((action) =>
            `<button type="button" class="${action.kind === 'primary' ? 'btn-primary' : 'btn-secondary'}" data-dialog="${action.id}">${esc(action.label)}</button>`).join('');
        const skip = options.actions.find((action) => action.kind === 'skip');
        back.innerHTML = `<div class="auth-nudge" role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title">
            <h2 id="invite-dialog-title">${esc(options.title)}</h2>
            <p>${esc(options.text)}</p>
            ${options.extra ? `<p class="auth-nudge__plus">${esc(options.extra)}</p>` : ''}
            <div class="auth-nudge__actions">${buttons}</div>
            ${skip ? `<button type="button" class="auth-nudge__skip" data-dialog="${skip.id}">${esc(skip.label)}</button>` : ''}
        </div>`;
        const finish = (id: string) => {
            document.removeEventListener('keydown', onKey, true);
            back.remove();
            previous?.focus?.({ preventScroll: true });
            resolve(id);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish((skip ?? options.actions[options.actions.length - 1]).id); }
        };
        back.addEventListener('click', (event) => {
            const button = (event.target as HTMLElement).closest<HTMLElement>('[data-dialog]');
            if (button) finish(button.dataset.dialog!);
        });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(back);
        back.querySelector<HTMLElement>('.btn-primary, button')?.focus({ preventScroll: true });
    });
}

/** Ссылка, по которой ждём входа: ученик нажал «У меня уже есть аккаунт», после входа предложим перейти. */
let pendingJoin: { token: string; info: InviteInfo } | null = null;

async function offerMove(token: string, info: InviteInfo): Promise<void> {
    const user = getUser();
    if (!user || user.role !== 'student') return;
    if (user.org && user.org.name === info.orgName) {
        await showDialog({ title: 'Вы уже здесь', text: `Вы уже в организации «${info.orgName}».`, actions: [{ id: 'ok', label: 'Понятно', kind: 'primary' }] });
        return;
    }
    const answer = await showDialog({
        title: `Перейти в «${info.orgName}»?`,
        text: 'Ваши пройденные миссии и достижения сохранятся. Вас будет видеть учитель этой организации, а прежний учитель перестанет видеть ваши результаты. Класс придётся выбрать заново.',
        actions: [{ id: 'join', label: 'Перейти', kind: 'primary' }, { id: 'stay', label: 'Остаться как есть', kind: 'skip' }]
    });
    if (answer !== 'join') return;
    try {
        await joinOrganization(token);
        await showDialog({ title: 'Готово', text: `Теперь вы в организации «${info.orgName}».`, actions: [{ id: 'ok', label: 'Хорошо', kind: 'primary' }] });
    } catch (error) {
        await showDialog({ title: 'Не получилось перейти', text: (error as Error).message, actions: [{ id: 'ok', label: 'Понятно', kind: 'primary' }] });
    }
}

/** Убирает токен из адреса: ссылку не видно в истории и не пересылается дальше вместе со страницей. */
function readToken(): string | null {
    try {
        const url = new URL(window.location.href);
        const token = url.searchParams.get(PARAM);
        if (!token) return null;
        url.searchParams.delete(PARAM);
        window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
        return token;
    } catch { return null; }
}

/** Вызывается один раз при запуске, когда проверка входа закончилась. */
export async function handleInviteLink(): Promise<void> {
    const token = readToken();
    if (!token) return;
    let info: InviteInfo;
    try {
        info = await fetchInvite(token);
    } catch (error) {
        await showDialog({ title: 'Ссылка не открылась', text: (error as Error).message, actions: [{ id: 'ok', label: 'Понятно', kind: 'primary' }] });
        return;
    }
    if (info.state !== 'ok') {
        await showDialog({ title: 'Ссылка не работает', text: info.message, actions: [{ id: 'ok', label: 'Понятно', kind: 'primary' }] });
        return;
    }
    const user = getUser();
    if (user) {
        if (info.kind === 'student' && user.role === 'student') { await offerMove(token, info); return; }
        await showDialog({
            title: 'Вы уже вошли',
            text: info.kind === 'teacher'
                ? 'Эта ссылка зовёт учителя в организацию. Чтобы воспользоваться ею, выйдите из аккаунта и зарегистрируйтесь по ссылке.'
                : 'Эта ссылка для учеников. Чтобы воспользоваться ею, выйдите из аккаунта учителя.',
            actions: [{ id: 'ok', label: 'Понятно', kind: 'primary' }]
        });
        return;
    }
    const teacher = info.kind === 'teacher';
    const answer = await showDialog({
        title: `Вас приглашает «${info.orgName}»`,
        text: teacher
            ? 'Вас зовут в команду учителей этой организации. Вы увидите её учеников и классы.'
            : 'Создайте аккаунт, и учитель увидит ваши пройденные миссии. Прогресс сохранится на сервере и не пропадёт.',
        actions: [
            { id: 'register', label: 'Создать аккаунт', kind: 'primary' },
            ...(teacher ? [] : [{ id: 'login', label: 'У меня уже есть аккаунт', kind: 'secondary' as const }]),
            { id: 'later', label: 'Позже', kind: 'skip' }
        ]
    });
    if (answer === 'register') { setInviteContext({ token, info }); openAccountPanel('register'); }
    else if (answer === 'login') {
        pendingJoin = { token, info };
        openAccountPanel('login');
    }
}

/** После входа по кнопке «У меня уже есть аккаунт» предлагаем перейти в организацию из ссылки. */
export function watchPendingJoin(): void {
    onUserChange((user) => {
        if (!user || !pendingJoin) return;
        const wanted = pendingJoin;
        pendingJoin = null;
        if (user.role === 'student') void offerMove(wanted.token, wanted.info);
    });
}
