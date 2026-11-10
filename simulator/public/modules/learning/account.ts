/**
 * Клиент аккаунтов: вход, регистрация, прогресс ученика и запросы кабинета учителя.
 * Сервер хранит учётные записи и зачёт миссий (server/accounts.ts); здесь только тонкая обёртка над fetch и
 * состояние «кто сейчас вошёл». Без входа всё работает как раньше: прогресс остаётся в браузере.
 */
export type AccountUser = { id: string; role: 'teacher' | 'student'; fullName: string; login: string; mustChangePassword?: boolean };
/** Способы обучения. sdk2 и bricks — треки для Пионера Мини 2 (Python на pioneer_sdk2 и блоки Pioneer Bricks). */
export type AccountTrack = 'blocks' | 'lua' | 'python' | 'sdk2' | 'bricks';
export const ACCOUNT_TRACKS: readonly AccountTrack[] = ['blocks', 'lua', 'python', 'sdk2', 'bricks'];
/** Названия треков для кабинетов и отчётов. */
export const TRACK_NAMES: Record<AccountTrack, string> = { blocks: 'Blockly', lua: 'Lua', python: 'Python', sdk2: 'Мини 2 · SDK2', bricks: 'Мини 2 · Bricks' };
export type ServerProgress = Record<AccountTrack, string[]>;
export type Completion = { at: number; by: 'student' | 'teacher'; note?: string };
export type StudentSummary = AccountUser & { createdAt: number; counts: Record<AccountTrack, number>; classId: string | null; lastActiveAt: number | null; note: string };
export type StudentDetail = StudentSummary & { progress: Record<AccountTrack, Record<string, Completion>> };
export type ClassInfo = { id: string; name: string; createdAt: number; count?: number };
export type StuckInfo = { track: AccountTrack; questId: string; fails: number; lastAt: number };
export type OverviewStudent = StudentSummary & { done: ServerProgress; attemptsTotal: number; attempts7d: number; lastAttemptAt: number | null; stuck: StuckInfo | null };
export type Overview = { classes: ClassInfo[]; students: OverviewStudent[]; activity: Record<string, number>; today: string };
export type AttemptRecord = { at: number; track: AccountTrack; questId: string; solved: boolean; titles: string[]; code: string; name?: string };
export type CabinetData = {
    user: AccountUser;
    classGroup: ClassInfo | null;
    progress: Record<AccountTrack, Record<string, Completion>>;
    activity: { days: Record<string, number>; today: string; current: number; best: number };
    stats: { attempts: number; solvedChecks: number; firstTrySolved: number; lastAttemptAt: number | null };
    recent: Omit<AttemptRecord, 'code'>[];
};
export type QuestMetrics = {
    track: AccountTrack; questId: string; opens: number; sessions: number; hints: number; done: number; leaves: number;
    medianDoneSeconds: number | null; medianLeaveSeconds: number | null;
};
export type MetricsSummary = {
    days: number; events: number; sessions: number; roles: Record<string, number>; features: Record<string, number>; tracks: Record<string, number>;
    mapOpens: number; cabinetOpens: number; sessionsByDay: Record<string, number>; quests: QuestMetrics[];
};
export type BulkCredentials = { id: string; fullName: string; login: string; password: string };

export type RegisterForm = { fullName: string; login: string; loginRepeat: string; password: string; passwordRepeat: string };

export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

let user: AccountUser | null = null;
/** Сервер больше не узнаёт сессию (два часа без запросов): пользователь остаётся «текущим», но входить нужно заново. */
let expired = false;
const listeners = new Set<(user: AccountUser | null) => void>();
const expiredListeners = new Set<() => void>();

export const isSessionExpired = () => expired;
export function onSessionExpired(listener: () => void): () => void {
    expiredListeners.add(listener);
    return () => expiredListeners.delete(listener);
}

function markExpired(): void {
    if (!user || expired) return;
    expired = true;
    expiredListeners.forEach((listener) => listener());
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
        // Страница называет серверу того, под кем она работает: если cookie уже чужая (в другой вкладке вошёл другой
        // человек), сервер откажет, а не запишет зачёт не тому.
        const headers: Record<string, string> = {};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (user && !url.startsWith('/api/auth/login') && !url.startsWith('/api/auth/register')) headers['X-Pioneer-User'] = user.id;
        response = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: Object.keys(headers).length ? headers : undefined,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw new ApiError(0, 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        // 401 на запросе прогресса или кабинета при «текущем» пользователе: вход закончился. Ошибки входа и регистрации сюда не относятся.
        if (response.status === 401 && !url.startsWith('/api/auth/')) markExpired();
        throw new ApiError(response.status, data?.error || `Ошибка сервера (${response.status}).`);
    }
    return data as T;
}

let lastAuthKind: 'login' | 'register' | 'restore' = 'restore';
export const getLastAuthKind = () => lastAuthKind;
export const getUser = () => user;

export function onUserChange(listener: (user: AccountUser | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function setUser(next: AccountUser | null): void {
    // Повторный вход после истёкшей сессии тоже событие: накопленные зачёты нужно отправить.
    const changed = next?.id !== user?.id || (expired && next !== null);
    user = next;
    expired = false;
    if (changed) listeners.forEach((listener) => listener(user));
}

const profileListeners = new Set<(user: AccountUser | null) => void>();
export function onProfileChange(listener: (user: AccountUser | null) => void): () => void {
    profileListeners.add(listener);
    return () => profileListeners.delete(listener);
}

/** Имя или флаг пароля изменились у того же пользователя: экраны обновляются, но обучение не перезапускается. */
export function replaceUser(next: AccountUser): void {
    if (user?.id !== next.id) return;
    user = next;
    profileListeners.forEach((listener) => listener(user));
}

/** Проверка сессии при запуске: сервера может не быть (локальная сборка) — тогда работаем как гость. */
export async function restoreSession(): Promise<AccountUser | null> {
    try {
        setUser((await call<{ user: AccountUser | null }>('GET', '/api/auth/me')).user);
    } catch {
        setUser(null);
    }
    trackEvent('session_start', { detail: user?.role ?? 'guest' });
    return user;
}

/**
 * Пока ученик работает, раз в несколько минут спрашиваем сервер «я ещё вошёл?»: сам этот запрос продлевает вход
 * на два часа. Если сервер уже не узнаёт сессию, показываем просьбу войти заново, не сбрасывая прогресс на экране.
 */
const KEEP_ALIVE_EVERY_MS = 5 * 60 * 1000;
let lastPing = 0;

export async function checkSession(): Promise<void> {
    if (!user || expired) return;
    lastPing = Date.now();
    try {
        const result = await call<{ user: AccountUser | null }>('GET', '/api/auth/me');
        // Сессия закончилась или в этом браузере уже вошёл другой человек: входить нужно заново.
        if (!result.user || result.user.id !== user.id) markExpired();
    } catch {
        // Нет связи: решение отложено до следующей проверки.
    }
}

export function startKeepAlive(): void {
    const touch = () => { if (user && !expired && Date.now() - lastPing > KEEP_ALIVE_EVERY_MS) void checkSession(); };
    // Вернулись во вкладку: вход мог смениться в соседней, проверяем сразу, а не через пять минут.
    const recheck = () => { if (user && !expired && !document.hidden) void checkSession(); };
    ['pointerdown', 'keydown'].forEach((name) => window.addEventListener(name, touch, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
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

/** Результат одной проверки для журнала учителя; ошибки отправки не должны мешать ученику. */
export const reportAttempt = async (attempt: { track: AccountTrack; questId: string; solved: boolean; titles: string[]; code: string }): Promise<void> => {
    try { await call('POST', '/api/learning/attempt', attempt); } catch { /* журнал не критичен */ }
};

export type QuestStats = { track: AccountTrack; questId: string; attempts: number; solved: number; students: number; studentsSolved: number; avgAttemptsToSolve: number | null; topIssues: { title: string; count: number }[] };
export type FailedAttempt = { at: number; name: string; titles: string[]; code: string };
export type StuckStudent = { userId: string; name: string; fails: number; lastAt: number };

export const reportCompleted = async (track: AccountTrack, questId: string): Promise<void> => {
    await call('POST', '/api/progress/complete', { track, questId });
};

export const tzOffset = () => new Date().getTimezoneOffset();

/** Личный кабинет ученика. */
export const cabinetApi = {
    get: () => call<CabinetData>('GET', `/api/me/cabinet?tz=${tzOffset()}`),
    attempts: async (track?: AccountTrack, questId?: string) => {
        const query = new URLSearchParams();
        if (track) query.set('track', track);
        if (questId) query.set('questId', questId);
        return (await call<{ attempts: AttemptRecord[] }>('GET', `/api/me/attempts?${query}`)).attempts;
    },
    rename: async (fullName: string) => (await call<{ user: AccountUser }>('PATCH', '/api/auth/profile', { fullName })).user
};

export const teacherApi = {
    overview: () => call<Overview>('GET', `/api/teacher/overview?tz=${tzOffset()}`),
    metrics: async (days: number) => (await call<{ summary: MetricsSummary | null }>('GET', `/api/teacher/metrics?days=${days}`)).summary,
    attempts: async (track: AccountTrack, classId = '') => (await call<{ stats: QuestStats[] }>('GET', `/api/teacher/attempts?track=${track}${classId ? `&classId=${encodeURIComponent(classId)}` : ''}`)).stats,
    failures: (track: AccountTrack, questId: string) => call<{ failures: FailedAttempt[]; stuck: StuckStudent[] }>('GET', `/api/teacher/attempts/${encodeURIComponent(questId)}?track=${track}`),
    list: async () => (await call<{ students: StudentSummary[] }>('GET', '/api/teacher/students')).students,
    get: async (id: string) => (await call<{ student: StudentDetail }>('GET', `/api/teacher/students/${id}`)).student,
    create: async (body: { fullName: string; login: string; password: string; classId?: string | null }) => (await call<{ student: StudentDetail }>('POST', '/api/teacher/students', body)).student,
    update: async (id: string, body: { fullName?: string; login?: string; password?: string; classId?: string | null; note?: string }) => (await call<{ student: StudentDetail }>('PATCH', `/api/teacher/students/${id}`, body)).student,
    remove: async (id: string) => { await call('DELETE', `/api/teacher/students/${id}`); },
    setDone: async (id: string, track: AccountTrack, questId: string, done: boolean, note?: string) =>
        (await call<{ student: StudentDetail }>('PUT', `/api/teacher/students/${id}/progress`, { track, questId, done, note })).student,
    studentAttempts: async (id: string, track?: AccountTrack, questId?: string) => {
        const query = new URLSearchParams();
        if (track) query.set('track', track);
        if (questId) query.set('questId', questId);
        return (await call<{ attempts: AttemptRecord[] }>('GET', `/api/teacher/students/${id}/attempts?${query}`)).attempts;
    },
    studentActivity: (id: string) => call<CabinetData>('GET', `/api/teacher/students/${id}/activity?tz=${tzOffset()}`),
    createClass: async (name: string) => (await call<{ classGroup: ClassInfo }>('POST', '/api/teacher/classes', { name })).classGroup,
    renameClass: async (id: string, name: string) => (await call<{ classGroup: ClassInfo }>('PATCH', `/api/teacher/classes/${id}`, { name })).classGroup,
    deleteClass: async (id: string) => { await call('DELETE', `/api/teacher/classes/${id}`); },
    bulkCreate: (names: string, classId: string | null) => call<{ created: BulkCredentials[]; skipped: { line: string; reason: string }[] }>('POST', '/api/teacher/students/bulk', { names, classId }),
    moveStudents: (ids: string[], classId: string | null) => call<{ moved: number }>('POST', '/api/teacher/students/batch', { ids, action: 'move', classId }),
    resetPasswords: async (ids: string[]) => (await call<{ passwords: BulkCredentials[] }>('POST', '/api/teacher/students/batch', { ids, action: 'reset' })).passwords
};

/* ---------- Анонимная метрика ---------- */

/**
 * Что делают в симуляторе: открыли миссию, попросили подсказку, ушли. Без имён, логинов и кода: случайный номер вкладки
 * и название события. Нужна, чтобы видеть, какие уроки улучшать. Ошибки отправки никому не мешают.
 */
type MetricPayload = { name: string; track?: string; questId?: string; value?: number; detail?: string };
const metricQueue: MetricPayload[] = [];
let metricTimer = 0;
let metricSid = '';

function sessionTabId(): string {
    if (metricSid) return metricSid;
    try {
        metricSid = sessionStorage.getItem('pioneer:metrics:sid') || '';
        if (!metricSid) {
            metricSid = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
            sessionStorage.setItem('pioneer:metrics:sid', metricSid);
        }
    } catch {
        metricSid = metricSid || `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    }
    return metricSid;
}

export function flushMetrics(useBeacon = false): void {
    window.clearTimeout(metricTimer);
    metricTimer = 0;
    if (!metricQueue.length) return;
    const body = JSON.stringify({ sid: sessionTabId(), events: metricQueue.splice(0, 30) });
    try {
        if (useBeacon && navigator.sendBeacon) navigator.sendBeacon('/api/metrics', new Blob([body], { type: 'application/json' }));
        else void fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    } catch { /* метрика не критична */ }
}

export function trackEvent(name: string, extra: Omit<MetricPayload, 'name'> = {}): void {
    metricQueue.push({ name, ...extra });
    if (metricQueue.length >= 20) flushMetrics();
    else if (!metricTimer) metricTimer = window.setTimeout(() => flushMetrics(), 4000);
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => flushMetrics(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushMetrics(true); });
}
