/**
 * Панель «Аккаунт» в левой рельсе: вход и регистрация формой прямо в панели, профиль со сменой пароля и выходом,
 * вход в кабинет учителя. Когда вход истёк (два часа без действий), панель открывается сама и просит войти снова.
 */
import { changePassword, getUser, isSessionExpired, login, logout, onSessionExpired, onUserChange, register, type AccountUser } from './account.js';

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type View = 'login' | 'register' | 'password';

let host: HTMLElement;
let railButton: HTMLElement | null = null;
let openTeacher: () => void = () => undefined;
let view: View = 'login';
let lastLogin = '';

function field(name: string, label: string, type = 'text', autocomplete = 'off', hint = '', value = ''): string {
    return `<label class="auth-field"><span>${label}</span>
        <input class="auth-input" name="${name}" type="${type}" autocomplete="${autocomplete}" value="${esc(value)}" required spellcheck="false">
        ${hint ? `<small>${hint}</small>` : ''}</label>`;
}

const FORMS: Record<View, () => string> = {
    login: () => field('login', 'Логин', 'text', 'username', '', lastLogin) + field('password', 'Пароль', 'password', 'current-password'),
    register: () => field('fullName', 'ФИО', 'text', 'name', 'Фамилия, имя и отчество полностью')
        + field('login', 'Логин', 'text', 'username', 'Латинские буквы, цифры, точка, дефис, подчёркивание; от 3 символов')
        + field('loginRepeat', 'Логин ещё раз')
        + field('password', 'Пароль', 'password', 'new-password', 'Не короче 6 символов')
        + field('passwordRepeat', 'Пароль ещё раз', 'password', 'new-password'),
    password: () => field('current', 'Текущий пароль', 'password', 'current-password')
        + field('password', 'Новый пароль', 'password', 'new-password', 'Не короче 6 символов')
        + field('passwordRepeat', 'Новый пароль ещё раз', 'password', 'new-password')
};
const SUBMIT: Record<View, string> = { login: 'Войти', register: 'Создать аккаунт', password: 'Сменить пароль' };

function initials(user: AccountUser): string {
    const [first] = user.fullName.trim().split(/\s+/);
    return (first?.[0] ?? user.login[0] ?? '?').toUpperCase();
}

function renderForm(user: AccountUser | null): string {
    const tabs = user ? '' : `<div class="pk-seg account-tabs" role="tablist">
            <button type="button" class="pk-seg__btn${view === 'login' ? ' is-active' : ''}" data-account-view="login">Вход</button>
            <button type="button" class="pk-seg__btn${view === 'register' ? ' is-active' : ''}" data-account-view="register">Регистрация</button>
        </div>`;
    return `${tabs}
        <form class="account-form" novalidate>
            ${FORMS[view]()}
            <div class="auth-error" role="alert" hidden></div>
            <button type="submit" class="btn-primary account-submit">${SUBMIT[view]}</button>
            ${view === 'register' ? '<p class="auth-note">Подтверждения почтой нет: запомните логин и пароль. Если забудете, учитель задаст новый в своём кабинете.</p>' : ''}
        </form>`;
}

function render(): void {
    const expired = isSessionExpired();
    const user = expired ? null : getUser();   // истёкший вход для экрана — выход: показываем форму, а не профиль
    if (railButton) {
        railButton.classList.toggle('has-alert', expired);
        railButton.dataset.tooltip = user ? `Аккаунт: ${user.fullName}` : 'Аккаунт';
    }
    let body: string;
    if (!user) {
        body = `<div class="account-intro">
                <h3>Войдите, чтобы прогресс сохранялся</h3>
                <p>Учитель увидит пройденные миссии, а вы продолжите с любого компьютера. Без входа обучение работает, прогресс остаётся в этом браузере.</p>
            </div>${renderForm(null)}`;
    } else if (view === 'password') {
        body = `<button type="button" class="account-back" data-account-view="back">← К профилю</button>
            <div class="account-intro"><h3>Смена пароля</h3></div>${renderForm(user)}`;
    } else {
        const teacher = user.role === 'teacher';
        body = `<div class="account-profile">
                <span class="account-avatar" aria-hidden="true">${esc(initials(user))}</span>
                <span class="account-profile__who"><strong>${esc(user.fullName)}</strong><small>Логин ${esc(user.login)}</small></span>
                <span class="account-role account-role--${teacher ? 'teacher' : 'student'}">${teacher ? 'Учитель' : 'Ученик'}</span>
            </div>
            <div class="account-actions">
                ${teacher ? '<button type="button" class="btn-primary" data-account="teacher">Кабинет учителя</button>' : ''}
                <button type="button" class="btn-secondary" data-account="password">Сменить пароль</button>
                <button type="button" class="btn-secondary" data-account="logout">Выйти</button>
            </div>
            <p class="auth-note">${teacher ? 'Здесь вы создаёте учеников, меняете пароли и вручную засчитываете миссии. ' : 'Пройденные миссии сохраняются на сервере. '}Вход действует два часа после последнего действия, потом нужно войти снова.</p>`;
    }
    const banner = expired
        ? `<div class="account-banner" role="status"><strong>Вход закончился</strong>Вы не пользовались симулятором больше двух часов. Войдите снова: всё, что вы прошли, уже сохранено и дойдёт до учителя.</div>`
        : '';
    host.innerHTML = `<div class="account">${banner}${body}</div>`;
    wire();
}

function wire(): void {
    host.querySelectorAll<HTMLElement>('[data-account-view]').forEach((button) => button.addEventListener('click', () => {
        const next = button.dataset.accountView;
        view = next === 'back' ? 'login' : (next as View);
        render();
    }));
    host.querySelectorAll<HTMLElement>('[data-account]').forEach((button) => button.addEventListener('click', () => {
        const action = button.dataset.account;
        if (action === 'password') { view = 'password'; render(); }
        else if (action === 'teacher') openTeacher();
        else if (action === 'logout') void logout();
    }));
    const form = host.querySelector<HTMLFormElement>('.account-form');
    if (!form) return;
    // Повторные поля вводятся руками: так ошибка в логине или пароле не копируется в проверку.
    form.querySelectorAll<HTMLInputElement>('input[name$="Repeat"]').forEach((input) => input.addEventListener('paste', (event) => event.preventDefault()));
    const error = form.querySelector('.auth-error') as HTMLElement;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        const submit = form.querySelector('button[type=submit]') as HTMLButtonElement;
        error.hidden = true;
        submit.disabled = true;
        try {
            if (view === 'login') { lastLogin = values.login; await login(values.login, values.password); }
            else if (view === 'register') await register({
                fullName: values.fullName, login: values.login, loginRepeat: values.loginRepeat,
                password: values.password, passwordRepeat: values.passwordRepeat
            });
            else { await changePassword(values.current, values.password, values.passwordRepeat); view = 'login'; render(); }
        } catch (failure) {
            error.textContent = (failure as Error).message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    });
    if (!getUser() || view === 'password') form.querySelector<HTMLElement>('input')?.focus();
}

/** Панель открывается только когда она закрыта: openPanel переключает, и второй вызов закрыл бы её. */
function showPanel(): void {
    if (!document.querySelector('#account-panel.active')) (window as any).openPanel?.('account-panel');
}

export function initAccountUi(target: HTMLElement, hooks: { openTeacher: () => void }): void {
    openTeacher = hooks.openTeacher;
    host = target;
    railButton = document.getElementById('sidebar-account-btn');
    onUserChange((user: AccountUser | null) => {
        if (user) lastLogin = user.login;
        view = 'login';
        render();
    });
    onSessionExpired(() => {
        const user = getUser();
        if (user) lastLogin = user.login;
        view = 'login';
        render();
        showPanel();
    });
    render();
}
