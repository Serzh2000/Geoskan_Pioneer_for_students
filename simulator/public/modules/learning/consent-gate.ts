/**
 * Согласие на обработку данных для тех, кто зарегистрировался до политики или чей аккаунт создал учитель (а также при смене версии
 * политики). Окно закрыть нельзя: либо «Принять и продолжить», либо «Выйти». Без согласия сервер ничего не записывает.
 */
import { acceptConsent, getUser, logout, onUserChange, type AccountUser } from './account.js';

let open = false;

export function consentCheckboxes(staff: boolean): string {
    return `<label class="auth-check"><input type="checkbox" name="consentPd"> <span>Даю согласие на обработку моих данных на условиях <a href="/privacy/" target="_blank" rel="noopener">Политики</a></span></label>
        <label class="auth-check"><input type="checkbox" name="acceptTerms"> <span>Принимаю <a href="/privacy/#terms" target="_blank" rel="noopener">Условия использования</a></span></label>
        ${staff ? '<label class="auth-check"><input type="checkbox" name="confirmConsents"> <span>Подтверждаю, что имею право вносить данные учеников: у меня есть согласие их родителей или школы</span></label>' : ''}`;
}

function show(user: AccountUser): void {
    if (open) return;
    open = true;
    const staff = user.role !== 'student';
    const back = document.createElement('div');
    back.className = 'auth-nudge-back';
    back.innerHTML = `<form class="auth-nudge consent-gate" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title">Согласие на обработку данных</h2>
        <p>В симуляторе хранятся ваш ник или имя, логин, результаты миссий и история проверок. Их видит ваш учитель и администратор сервиса, больше никто. Данные не передаются третьим лицам и используются только для учёбы и улучшения уроков.</p>
        <p class="muted">Если вам меньше 14 лет, примите это вместе с родителем или учителем.</p>
        <div class="consent-gate__checks">${consentCheckboxes(staff)}</div>
        <div class="auth-error" role="alert" hidden></div>
        <div class="auth-nudge__actions">
            <button type="submit" class="btn-primary" disabled>Принять и продолжить</button>
            <button type="button" class="btn-secondary" data-consent="logout">Выйти из аккаунта</button>
        </div>
    </form>`;
    document.body.appendChild(back);
    const form = back.querySelector('form')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const error = form.querySelector<HTMLElement>('.auth-error')!;
    const checked = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked === true;
    const ready = () => checked('consentPd') && checked('acceptTerms') && (!staff || checked('confirmConsents'));
    form.addEventListener('change', () => { submit.disabled = !ready(); });
    form.querySelector('[data-consent="logout"]')!.addEventListener('click', () => { back.remove(); open = false; void logout(); });
    // Esc не закрывает окно: согласие нужно дать или выйти.
    form.addEventListener('keydown', (event) => { if (event.key === 'Escape') event.preventDefault(); });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!ready()) return;
        submit.disabled = true;
        error.hidden = true;
        try {
            await acceptConsent({ consentPd: true, acceptTerms: true, confirmConsents: staff ? true : undefined });
            back.remove();
            open = false;
        } catch (failure) {
            error.textContent = (failure as Error).message;
            error.hidden = false;
            submit.disabled = false;
        }
    });
    form.querySelector<HTMLElement>('input')?.focus();
}

/** Подключается один раз: показывает окно, когда у вошедшего пользователя нет согласия на нынешнюю политику. */
export function watchConsent(): void {
    const check = (user: AccountUser | null) => { if (user && user.needsConsent && !user.viewAs) show(user); };
    onUserChange(check);
    check(getUser());
}
