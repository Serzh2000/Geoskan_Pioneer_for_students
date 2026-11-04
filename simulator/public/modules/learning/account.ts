/**
 * Клиент аккаунтов: вход, регистрация, прогресс ученика и запросы кабинета учителя.
 * Сервер хранит учётные записи и зачёт миссий (server/accounts.ts); здесь только тонкая обёртка над fetch и
 * состояние «кто сейчас вошёл». Без входа всё работает как раньше: прогресс остаётся в браузере.
 */
export type AccountUser = { id: string; role: 'teacher' | 'student'; fullName: string; login: string };
export type AccountTrack = 'blocks' | 'lua' | 'python';
export const ACCOUNT_TRACKS: readonly AccountTrack[] = ['blocks', 'lua', 'python'];
export type ServerProgress = Record<AccountTrack, string[]>;
export type Completion = { at: number; by: 'student' | 'teacher' };
export type StudentSummary = AccountUser & { createdAt: number; counts: Record<AccountTrack, number> };
export type StudentDetail = StudentSummary & { progress: Record<AccountTrack, Record<string, Completion>> };

export type RegisterForm = { fullName: string; login: string; loginRepeat: string; password: string; passwordRepeat: string };

export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

let user: AccountUser | null = null;
let ready = false;
const listeners = new Set<(user: AccountUser | null) => void>();

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
        response = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, data?.error || `Ошибка сервера (${response.status}).`);
    return data as T;
}

let lastAuthKind: 'login' | 'register' | 'restore' = 'restore';
export const getLastAuthKind = () => lastAuthKind;
export const getUser = () => user;
export const isAccountReady = () => ready;

export function onUserChange(listener: (user: AccountUser | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function setUser(next: AccountUser | null): void {
    const changed = next?.id !== user?.id;
    user = next;
    ready = true;
    if (changed) listeners.forEach((listener) => listener(user));
}

/** Проверка сессии при запуске: сервера может не быть (локальная сборка) — тогда работаем как гость. */
export async function restoreSession(): Promise<AccountUser | null> {
    try {
        setUser((await call<{ user: AccountUser | null }>('GET', '/api/auth/me')).user);
    } catch {
        setUser(null);
    }
    return user;
}

export async function login(loginName: string, password: string): Promise<AccountUser> {
    const result = await call<{ user: AccountUser }>('POST', '/api/auth/login', { login: loginName, password });
    lastAuthKind = 'login';
    setUser(result.user);
    return result.user;
}

export async function register(form: RegisterForm): Promise<AccountUser> {
    const result = await call<{ user: AccountUser }>('POST', '/api/auth/register', form);
    lastAuthKind = 'register';
    setUser(result.user);
    return result.user;
}

export async function logout(): Promise<void> {
    await call('POST', '/api/auth/logout').catch(() => undefined);
    setUser(null);
}

export async function changePassword(current: string, password: string, passwordRepeat: string): Promise<void> {
    await call('POST', '/api/auth/password', { current, password, passwordRepeat });
}

export const fetchProgress = async (): Promise<ServerProgress> => (await call<{ progress: ServerProgress }>('GET', '/api/progress')).progress;

export const reportCompleted = async (track: AccountTrack, questId: string): Promise<void> => {
    await call('POST', '/api/progress/complete', { track, questId });
};

export const teacherApi = {
    list: async () => (await call<{ students: StudentSummary[] }>('GET', '/api/teacher/students')).students,
    get: async (id: string) => (await call<{ student: StudentDetail }>('GET', `/api/teacher/students/${id}`)).student,
    create: async (body: { fullName: string; login: string; password: string }) => (await call<{ student: StudentDetail }>('POST', '/api/teacher/students', body)).student,
    update: async (id: string, body: { fullName?: string; login?: string; password?: string }) => (await call<{ student: StudentDetail }>('PATCH', `/api/teacher/students/${id}`, body)).student,
    remove: async (id: string) => { await call('DELETE', `/api/teacher/students/${id}`); },
    setDone: async (id: string, track: AccountTrack, questId: string, done: boolean) =>
        (await call<{ student: StudentDetail }>('PUT', `/api/teacher/students/${id}/progress`, { track, questId, done })).student
};
