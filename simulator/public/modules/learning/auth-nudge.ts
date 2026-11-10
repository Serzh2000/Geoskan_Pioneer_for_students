/**
 * Напоминание об аккаунте при входе в обучение. Гость учится без входа, но прогресс тогда лежит только в этом браузере и может
 * пропасть (очистили историю, другой компьютер, прошло время). Поэтому не чаще раза в день при открытии обучения
 * показываем окно: создать аккаунт, войти или продолжить без него.
 */
const STORAGE_KEY = 'pioneer:learning:auth-nudge:v1';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const storage = (): Storage | null => {
    try { return window.localStorage; } catch { return null; }
};

/** Дата по местному времени в виде 2026-11-10: «раз в день» считается по календарю, а не по 24 часам. */
export function dayKey(date: Date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Окно нужно, если сегодня его ещё не показывали. */
export function shouldShowAuthNudge(store: Pick<Storage, 'getItem'> | null = storage(), now: Date = new Date()): boolean {
    try { return store?.getItem(STORAGE_KEY) !== dayKey(now); } catch { return true; }
}

export function markAuthNudgeShown(store: Pick<Storage, 'setItem'> | null = storage(), now: Date = new Date()): void {
    try { store?.setItem(STORAGE_KEY, dayKey(now)); } catch { /* без хранилища напомним в следующий раз */ }
}

export type AuthNudgeChoice = 'register' | 'login' | 'skip';

/** Показывает окно и возвращает выбор ученика. Окно модальное: фокус внутри, Esc равен «продолжить без аккаунта». */
export function showAuthNudge(): Promise<AuthNudgeChoice> {
    markAuthNudgeShown();
    return new Promise((resolve) => {
        const previous = document.activeElement as HTMLElement | null;
        const back = document.createElement('div');
        back.className = 'auth-nudge-back';
        back.innerHTML = `<div class="auth-nudge" role="dialog" aria-modal="true" aria-labelledby="auth-nudge-title" aria-describedby="auth-nudge-text">
            <span class="auth-nudge__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.500-3 8-7 10-4-2-7-5.500-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></span>
            <h2 id="auth-nudge-title">Сохраним ваш прогресс?</h2>
            <p id="auth-nudge-text">Без аккаунта пройденные миссии хранятся только в этом браузере. Они могут пропасть: если очистить историю, сесть за другой компьютер или просто со временем.</p>
            <p class="auth-nudge__plus">С аккаунтом прогресс сохранится на сервере, вы продолжите с любого компьютера, а учитель увидит ваши успехи.</p>
            <div class="auth-nudge__actions">
                <button type="button" class="btn-primary" data-nudge="register">Создать аккаунт</button>
                <button type="button" class="btn-secondary" data-nudge="login">У меня уже есть аккаунт</button>
            </div>
            <button type="button" class="auth-nudge__skip" data-nudge="skip">Продолжить без аккаунта</button>
            <p class="auth-nudge__again">Напомним завтра.</p>
        </div>`;
        const finish = (choice: AuthNudgeChoice) => {
            document.removeEventListener('keydown', onKey, true);
            back.remove();
            previous?.focus?.({ preventScroll: true });
            resolve(choice);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish('skip'); return; }
            if (event.key !== 'Tab') return;
            const items = [...back.querySelectorAll<HTMLElement>('button')];
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        back.addEventListener('click', (event) => {
            const button = (event.target as HTMLElement).closest<HTMLElement>('[data-nudge]');
            if (button) finish(button.dataset.nudge as AuthNudgeChoice);
        });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(back);
        back.querySelector<HTMLElement>('[data-nudge="register"]')?.focus({ preventScroll: true });
    });
}
