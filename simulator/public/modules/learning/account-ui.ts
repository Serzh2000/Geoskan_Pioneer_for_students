/**
 * Панель «Аккаунт» в левой рельсе: вход и регистрация формой прямо в панели, профиль со сменой пароля и выходом,
 * вход в кабинет учителя. Когда вход истёк (два часа без действий), панель открывается сама и просит войти снова.
 */
import { consentCheckboxes } from './consent-gate.js';
import { changePassword, deleteMyAccount, exitStudentView, fetchCaptcha, getUser, isSessionExpired, isStaffUser, login, logout, onProfileChange, onSessionExpired, onUserChange, register, registerTeacher, type AccountUser, type InviteInfo } from './account.js';

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type View = 'login' | 'register' | 'password' | 'delete';

let host: HTMLElement;
let railButton: HTMLElement | null = null;
let openTeacher: () => void = () => undefined;
let openCabinet: () => void = () => undefined;

/** Одна понятная строка о том, что хранится: показывается при входе, регистрации и в профиле. */
const PRIVACY = 'Ваш код и результаты проверок видит только ваш учитель, и сохраняются они только после входа в аккаунт. <a href="/privacy/" target="_blank" rel="noopener">Политика конфиденциальности</a>';
let view: View = 'login';
let lastLogin = '';
/** Сообщение, которое показывается один раз над формой (например, «Аккаунт удалён»). */
let flash: string | null = null;
/** Кто регистрируется: ученик или учитель (у учителя своя форма: организация и вопрос против ботов). */
let registerAs: 'student' | 'teacher' = 'student';
/** Ссылка-приглашение, с которой открыли сайт: регистрация пойдёт в её организацию. */
let invite: { token: string; info: InviteInfo } | null = null;
/** Вопрос «не бот» для регистрации учителя без ссылки. */
let captcha: { token: string; question: string } | null = null;
let captchaLoading = false;
/** Вопрос уже пытались загрузить: без этого при недоступном сервере форма просила бы его бесконечно. */
let captchaTried = false;

/** Запоминает ссылку-приглашение (страница по ссылке сообщает о ней) и открывает нужную форму регистрации. */
export function setInviteContext(next: { token: string; info: InviteInfo } | null): void {
    invite = next;
    if (next) registerAs = next.info.kind === 'teacher' ? 'teacher' : 'student';
    render();
}

/** inPlace: после ошибки меняем только вопрос, чтобы не стереть то, что человек уже ввёл в форму. */
function loadCaptcha(inPlace = false): void {
    if (captchaLoading) return;
    captchaLoading = true;
    captchaTried = true;
    fetchCaptcha().then((next) => { captcha = next; }).catch(() => { captcha = null; }).finally(() => {
        captchaLoading = false;
        if (!inPlace) { render(); return; }
        const label = host.querySelector<HTMLElement>('[data-captcha-label]');
        if (label && captcha) label.textContent = `Проверка: ${captcha.question}`;
        const input = host.querySelector<HTMLInputElement>('input[name="captchaAnswer"]');
        if (input) input.value = '';
    });
}

function field(name: string, label: string, type = 'text', autocomplete = 'off', hint = '', value = ''): string {
    return `<label class="auth-field"><span>${label}</span>
        <input class="auth-input" name="${name}" type="${type}" autocomplete="${autocomplete}" value="${esc(value)}" required spellcheck="false">
        ${hint ? `<small>${hint}</small>` : ''}</label>`;
}

const FORMS: Record<View, () => string> = {
    login: () => field('login', 'Логин', 'text', 'username', '', lastLogin) + field('password', 'Пароль', 'password', 'current-password'),
    register: () => registerAsSwitch() + inviteBanner() + nameField()
        + field('login', 'Логин', 'text', 'username', 'Латинские буквы, цифры, точка, дефис, подчёркивание; от 3 символов')
        + field('loginRepeat', 'Логин ещё раз')
        + field('password', 'Пароль', 'password', 'new-password', 'Не короче 6 символов')
        + field('passwordRepeat', 'Пароль ещё раз', 'password', 'new-password')
        + teacherFields()
        + `<div class="auth-consents">${consentCheckboxes(registerAs === 'teacher')}</div>`
        + (registerAs === 'student' ? '<p class="auth-note">Если вам меньше 14 лет, регистрируйтесь вместе с родителем или учителем.</p>' : ''),
    password: () => field('current', 'Текущий пароль', 'password', 'current-password')
        + field('password', 'Новый пароль', 'password', 'new-password', 'Не короче 6 символов')
        + field('passwordRepeat', 'Новый пароль ещё раз', 'password', 'new-password'),
    // Удаление нельзя нажать случайно: логин набирается руками, нужен пароль и отметка, что последствия понятны.
    delete: () => field('confirm', `Чтобы подтвердить, введите свой логин: ${getUser()?.login ?? ''}`, 'text', 'off', 'Копировать и вставлять нельзя: наберите логин сами')
        + field('password', 'Ваш пароль', 'password', 'current-password')
        + '<label class="auth-check"><input type="checkbox" name="understand"> <span>Я понимаю, что удалённый аккаунт, прогресс и история проверок не восстанавливаются</span></label>'
};
const SUBMIT: Record<View, string> = { login: 'Войти', register: 'Создать аккаунт', password: 'Сменить пароль', delete: 'Удалить аккаунт навсегда' };

/** Имя или ник: настоящие фамилию и имя сервис не просит, это поле видит только учитель организации. */
function nameField(): string {
    return registerAs === 'teacher'
        ? field('fullName', 'Имя', 'text', 'name', 'Так вас будут видеть коллеги и ученики')
        : field('fullName', 'Имя или ник', 'text', 'nickname', 'Так вас будет видеть ваш учитель. Настоящие фамилию и имя вводить не нужно.');
}

/** «Я ученик / Я учитель». Со ссылкой-приглашением роль задана ссылкой, переключателя нет. */
function registerAsSwitch(): string {
    if (invite) return '';
    return `<div class="pk-seg account-tabs" role="tablist" aria-label="Кто вы">
        <button type="button" class="pk-seg__btn${registerAs === 'student' ? ' is-active' : ''}" data-register-as="student">Я ученик</button>
        <button type="button" class="pk-seg__btn${registerAs === 'teacher' ? ' is-active' : ''}" data-register-as="teacher">Я учитель</button>
    </div>`;
}

function inviteBanner(): string {
    if (!invite) return registerAs === 'teacher'
        ? '<p class="auth-note">Вы создадите свою организацию (школу, кружок) и получите ссылки, чтобы пригласить в неё учеников и коллег. Видеть ваших учеников будут только вы и ваша команда.</p>'
        : '';
    const who = invite.info.kind === 'teacher' ? 'как учитель' : 'как ученик';
    return `<div class="account-banner account-banner--info" role="status"><strong>Приглашение в «${esc(invite.info.orgName)}»</strong>Вы регистрируетесь ${who} в этой организации.</div>`;
}

/** Только для учителя без ссылки: название организации, вопрос против ботов и скрытая ловушка. */
function teacherFields(): string {
    if (registerAs !== 'teacher' || invite) return '';
    const question = captcha
        ? `<label class="auth-field"><span data-captcha-label>Проверка: ${esc(captcha.question)}</span><input class="auth-input" name="captchaAnswer" inputmode="numeric" autocomplete="off" required></label>`
        : `<p class="auth-note">${captchaTried && !captchaLoading ? 'Не удалось загрузить вопрос. Проверьте связь и обновите страницу.' : 'Загружаем вопрос…'}</p>`;
    return field('orgName', 'Название организации', 'text', 'organization', 'Школа, кружок или клуб: так вас увидят ученики и коллеги')
        + question
        + '<input class="auth-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
}

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
            ${view === 'login' || view === 'register' ? `<p class="auth-privacy">${PRIVACY}</p>` : ''}
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
    } else if (view === 'delete' && user.role === 'student') {
        body = `<button type="button" class="account-back" data-account-view="back">← К профилю</button>
            <div class="account-intro"><h3>Удаление аккаунта</h3>
                <p>Будут удалены навсегда: аккаунт «${esc(user.login)}», все пройденные миссии и достижения, история проверок с вашим кодом. Учитель перестанет вас видеть.</p>
                <p>Отменить это нельзя. Если вы просто хотите уйти с этого компьютера, нажмите «Выйти» в профиле.</p></div>${renderForm(user)}`;
    } else {
        const teacher = isStaffUser(user);
        body = `<div class="account-profile">
                <span class="account-avatar" aria-hidden="true">${esc(initials(user))}</span>
                <span class="account-profile__who"><strong>${esc(user.fullName)}</strong><small>Логин ${esc(user.login)}${user.org ? ` · ${esc(user.org.name)}` : ''}</small></span>
                <span class="account-role account-role--${teacher ? 'teacher' : 'student'}">${user.role === 'admin' ? 'Администратор' : teacher ? 'Учитель' : 'Ученик'}</span>
            </div>
            ${user.mustChangePassword ? '<div class="account-banner" role="status"><strong>Временный пароль</strong>Учитель выдал вам пароль. Смените его на свой, кнопка ниже.</div>' : ''}
            <div class="account-actions">
                ${teacher ? '<button type="button" class="btn-primary" data-account="teacher">Кабинет учителя</button>' : '<button type="button" class="btn-primary" data-account="cabinet">Мой кабинет</button>'}
                <button type="button" class="btn-secondary" data-account="password">Сменить пароль</button>
                <button type="button" class="btn-secondary" data-account="logout">Выйти</button>
            </div>
            ${teacher ? '' : '<button type="button" class="account-delete-link" data-account="delete">Удалить мой аккаунт</button>'}
            <p class="auth-note">${teacher ? 'В кабинете вы ведёте классы, видите, кто застрял, и вручную засчитываете миссии. ' : 'В кабинете виден весь прогресс, история проверок и достижения. '}Вход действует два часа после последнего действия, потом нужно войти снова.</p>
            ${teacher ? '' : `<p class="auth-privacy">${PRIVACY}</p>`}`;
    }
    const notice = flash ? `<div class="account-banner account-banner--info" role="status"><strong>${esc(flash)}</strong></div>` : '';
    flash = null;
    const banner = notice + (expired
        ? `<div class="account-banner" role="status"><strong>Вход закончился</strong>Вы не пользовались симулятором больше двух часов. Войдите снова: всё, что вы прошли, уже сохранено и дойдёт до учителя.</div>`
        : '');
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
        else if (action === 'delete') { view = 'delete'; render(); }
        else if (action === 'teacher') openTeacher();
        else if (action === 'cabinet') openCabinet();
        else if (action === 'logout') void logout();
    }));
    host.querySelectorAll<HTMLElement>('[data-register-as]').forEach((button) => button.addEventListener('click', () => {
        registerAs = button.dataset.registerAs === 'teacher' ? 'teacher' : 'student';
        captchaTried = false;
        render();
    }));
    const form = host.querySelector<HTMLFormElement>('.account-form');
    if (!form) return;
    // Учителю без ссылки нужен вопрос против ботов; грузим его, когда форма открыта.
    if (view === 'register' && registerAs === 'teacher' && !invite && !captcha && !captchaTried) loadCaptcha();
    // Повторные поля вводятся руками: так ошибка в логине или пароле не копируется в проверку.
    form.querySelectorAll<HTMLInputElement>('input[name$="Repeat"], input[name="confirm"]').forEach((input) => input.addEventListener('paste', (event) => event.preventDefault()));
    // Кнопка удаления неактивна, пока не набран логин, не введён пароль и не поставлена отметка.
    const submitButton = form.querySelector<HTMLButtonElement>('button[type=submit]');
    const syncDelete = () => {
        if (view !== 'delete' || !submitButton) return;
        const get = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`);
        submitButton.disabled = !(get('confirm')?.value.trim() === getUser()?.login && (get('password')?.value.length ?? 0) > 0 && get('understand')?.checked);
    };
    // Регистрация: кнопка неактивна, пока не поставлены обязательные отметки согласия (сервер проверяет их тоже).
    if (view === 'register' && submitButton) {
        const syncRegister = () => {
            const on = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked === true;
            submitButton.disabled = !(on('consentPd') && on('acceptTerms') && (registerAs !== 'teacher' || on('confirmConsents')));
        };
        form.addEventListener('change', syncRegister);
        syncRegister();
    }
    if (view === 'delete') {
        submitButton?.classList.add('account-submit--danger');
        form.addEventListener('input', syncDelete);
        form.addEventListener('change', syncDelete);
        syncDelete();
    }
    const error = form.querySelector('.auth-error') as HTMLElement;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        const submit = form.querySelector('button[type=submit]') as HTMLButtonElement;
        error.hidden = true;
        submit.disabled = true;
        try {
            if (view === 'login') { lastLogin = values.login; await login(values.login, values.password); }
            else if (view === 'register') {
                const base = {
                    fullName: values.fullName, login: values.login, loginRepeat: values.loginRepeat,
                    password: values.password, passwordRepeat: values.passwordRepeat, ...(invite ? { invite: invite.token } : {}),
                    consentPd: values.consentPd === 'on', acceptTerms: values.acceptTerms === 'on', confirmConsents: values.confirmConsents === 'on'
                };
                if (registerAs === 'teacher') {
                    await registerTeacher({ ...base, orgName: values.orgName, captchaToken: captcha?.token, captchaAnswer: values.captchaAnswer, website: values.website });
                } else {
                    await register(base);
                }
                invite = null;
                captcha = null;
            }
            else if (view === 'delete') {
                await deleteMyAccount(values.confirm, values.password);
                flash = 'Аккаунт удалён. Ваши данные стёрты.';
                view = 'login';
                render();
            }
            else { await changePassword(values.current, values.password, values.passwordRepeat); view = 'login'; render(); }
        } catch (failure) {
            error.textContent = (failure as Error).message;
            error.hidden = false;
            // Токен вопроса одноразовый: после любой ошибки нужен новый.
            if (view === 'register' && registerAs === 'teacher' && !invite) { captcha = null; loadCaptcha(true); }
        } finally {
            submit.disabled = view === 'register' ? !(['consentPd', 'acceptTerms'].every((name) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked) && (registerAs !== 'teacher' || form.querySelector<HTMLInputElement>('[name="confirmConsents"]')?.checked === true)) : false;
            syncDelete();
        }
    });
    if (!getUser() || view === 'password' || view === 'delete') form.querySelector<HTMLElement>('input')?.focus();
}

/** Панель открывается только когда она закрыта: openPanel переключает, и второй вызов закрыл бы её. */
function showPanel(): void {
    if (!document.querySelector('#account-panel.active')) (window as any).openPanel?.('account-panel');
}

/** Полоса сверху, пока учитель смотрит от имени ученика: видно, чей это экран, и есть выход. */
function renderViewBanner(user: AccountUser | null): void {
    document.getElementById('view-as-banner')?.remove();
    document.body.classList.toggle('is-view-as', Boolean(user?.viewAs));
    if (!user?.viewAs) return;
    const bar = document.createElement('div');
    bar.id = 'view-as-banner';
    bar.className = 'view-as-banner';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `<span>Вы смотрите глазами ученика <b>${esc(user.fullName)}</b>. Зачёты и попытки не сохраняются.</span><button type="button" class="view-as-banner__exit">Вернуться к себе</button>`;
    bar.querySelector('button')!.addEventListener('click', () => { void exitStudentView(); });
    document.body.appendChild(bar);
}

/** Открывает панель «Аккаунт» сразу на входе или регистрации (напоминание об аккаунте при входе в обучение). */
export function openAccountPanel(next: 'login' | 'register'): void {
    view = next;
    render();
    showPanel();
}

/** Открывает личный кабинет текущего пользователя (нужно учителю после входа от имени ученика). */
export function openOwnCabinet(): void {
    openCabinet();
}

export function initAccountUi(target: HTMLElement, hooks: { openTeacher: () => void; openCabinet: () => void }): void {
    openTeacher = hooks.openTeacher;
    openCabinet = hooks.openCabinet;
    host = target;
    railButton = document.getElementById('sidebar-account-btn');
    onUserChange((user: AccountUser | null) => {
        renderViewBanner(user);
        if (user) lastLogin = user.login;
        view = 'login';
        render();
    });
    onProfileChange(() => render());
    onSessionExpired(() => {
        const user = getUser();
        if (user) lastLogin = user.login;
        view = 'login';
        render();
        showPanel();
    });
    render();
}
