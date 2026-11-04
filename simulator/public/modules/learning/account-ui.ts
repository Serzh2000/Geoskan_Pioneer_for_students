/**
 * Интерфейс аккаунта на стартовом экране: кнопки «Войти» и «Регистрация», окно входа, смена пароля и вход в кабинет учителя.
 */
import { changePassword, getUser, login, logout, register, onUserChange, type AccountUser } from './account.js';

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type DialogMode = 'login' | 'register' | 'password';

let bar: HTMLElement;
let dialog: HTMLElement;
let openTeacher: () => void = () => undefined;

function field(name: string, label: string, type = 'text', autocomplete = 'off', hint = ''): string {
    return `<label class="auth-field"><span>${label}</span>
        <input class="auth-input" name="${name}" type="${type}" autocomplete="${autocomplete}" required spellcheck="false">
        ${hint ? `<small>${hint}</small>` : ''}</label>`;
}

function renderBar(): void {
    const user = getUser();
    if (!user) {
        bar.innerHTML = `
            <button type="button" class="btn-secondary btn--sm" data-account="login">Войти</button>
            <button type="button" class="btn-primary btn--sm" data-account="register">Регистрация</button>`;
    } else {
        bar.innerHTML = `
            <span class="account-bar__who"><strong>${esc(user.fullName)}</strong><small>${user.role === 'teacher' ? 'Учитель' : 'Ученик'} · ${esc(user.login)}</small></span>
            ${user.role === 'teacher' ? '<button type="button" class="btn-primary btn--sm" data-account="teacher">Кабинет учителя</button>' : ''}
            <button type="button" class="btn-secondary btn--sm" data-account="password">Пароль</button>
            <button type="button" class="btn-secondary btn--sm" data-account="logout">Выйти</button>`;
    }
    bar.querySelectorAll<HTMLElement>('[data-account]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.account;
            if (action === 'login' || action === 'register' || action === 'password') showDialog(action);
            else if (action === 'teacher') openTeacher();
            else if (action === 'logout') void logout();
        });
    });
}

function showDialog(mode: DialogMode): void {
    const titles: Record<DialogMode, string> = { login: 'Вход', register: 'Регистрация ученика', password: 'Смена пароля' };
    const forms: Record<DialogMode, string> = {
        login: field('login', 'Логин', 'text', 'username') + field('password', 'Пароль', 'password', 'current-password'),
        register: field('fullName', 'ФИО', 'text', 'name', 'Фамилия, имя и отчество полностью')
            + field('login', 'Логин', 'text', 'username', 'Латинские буквы, цифры, точка, дефис, подчёркивание; от 3 символов')
            + field('loginRepeat', 'Логин ещё раз')
            + field('password', 'Пароль', 'password', 'new-password', 'Не короче 6 символов')
            + field('passwordRepeat', 'Пароль ещё раз', 'password', 'new-password'),
        password: field('current', 'Текущий пароль', 'password', 'current-password')
            + field('password', 'Новый пароль', 'password', 'new-password', 'Не короче 6 символов')
            + field('passwordRepeat', 'Новый пароль ещё раз', 'password', 'new-password')
    };
    dialog.hidden = false;
    dialog.innerHTML = `
        <form class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title" novalidate>
            <div class="auth-card__head">
                <h2 id="auth-title">${titles[mode]}</h2>
                <button type="button" class="quest-hud__icon" data-auth-close aria-label="Закрыть">×</button>
            </div>
            ${mode === 'login' || mode === 'register' ? `<div class="pk-seg auth-tabs" role="tablist">
                <button type="button" class="pk-seg__btn${mode === 'login' ? ' is-active' : ''}" data-auth-tab="login">Вход</button>
                <button type="button" class="pk-seg__btn${mode === 'register' ? ' is-active' : ''}" data-auth-tab="register">Регистрация</button>
            </div>` : ''}
            ${forms[mode]}
            <div class="auth-error" role="alert" hidden></div>
            <div class="auth-actions"><button type="submit" class="btn-primary">${mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : 'Сменить пароль'}</button></div>
            ${mode === 'register' ? '<p class="auth-note">Подтверждения почтой нет: запомните логин и пароль. Если забудете, учитель задаст новый.</p>' : ''}
        </form>`;
    const form = dialog.querySelector('form') as HTMLFormElement;
    const error = dialog.querySelector('.auth-error') as HTMLElement;
    const close = () => { dialog.hidden = true; dialog.innerHTML = ''; };
    dialog.querySelector('[data-auth-close]')?.addEventListener('click', close);
    dialog.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach((tab) => tab.addEventListener('click', () => showDialog(tab.dataset.authTab as DialogMode)));
    // Повторные поля вводятся руками: так ошибка в логине или пароле не копируется в проверку.
    form.querySelectorAll<HTMLInputElement>('input[name$="Repeat"]').forEach((input) => input.addEventListener('paste', (event) => event.preventDefault()));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        const submit = form.querySelector('button[type=submit]') as HTMLButtonElement;
        error.hidden = true;
        submit.disabled = true;
        try {
            if (mode === 'login') await login(values.login, values.password);
            else if (mode === 'register') await register({
                fullName: values.fullName, login: values.login, loginRepeat: values.loginRepeat,
                password: values.password, passwordRepeat: values.passwordRepeat
            });
            else await changePassword(values.current, values.password, values.passwordRepeat);
            close();
        } catch (failure) {
            error.textContent = (failure as Error).message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    });
    form.querySelector<HTMLElement>('input')?.focus();
}

export function initAccountUi(host: HTMLElement, hooks: { openTeacher: () => void }): void {
    openTeacher = hooks.openTeacher;
    bar = document.createElement('div');
    bar.className = 'account-bar';
    host.appendChild(bar);
    dialog = document.createElement('div');
    dialog.className = 'auth-overlay';
    dialog.hidden = true;
    document.body.appendChild(dialog);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !dialog.hidden) { dialog.hidden = true; dialog.innerHTML = ''; }
    });
    onUserChange((_user: AccountUser | null) => renderBar());
    renderBar();
}
