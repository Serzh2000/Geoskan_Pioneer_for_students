/**
 * Аккаунты учителя и учеников и зачёт миссий.
 *
 * Хранилище — один JSON-файл (ACCOUNTS_FILE, по умолчанию data/accounts.json): для класса из десятков учеников
 * этого достаточно, база не нужна. Пароли лежат только в виде scrypt-хеша, сессии — в виде sha256 от токена.
 * Подтверждения почтой нет: ученик сам вводит ФИО, логин и пароль дважды.
 *
 * Роли: `teacher` (создаётся из окружения или при первом запуске) и `student` (регистрируется сам).
 * Учитель управляет учениками и вручную засчитывает или снимает любую миссию; зачёт учителя главнее
 * автоматического: клиент ученика при входе берёт прогресс с сервера.
 */
import crypto from 'crypto';
import type express from 'express';
import fs from 'fs';
import { mkdir, rename, writeFile } from 'fs/promises';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { AttemptLog, type Attempt } from './attempts.js';
import { MetricsLog, sanitizeEvent } from './metrics.js';
import { activityByDay, dayKey, generatePassword, parseTz, streaks, suggestLogin } from './cabinet.js';

/** Способы обучения. sdk2 и bricks — треки «Мини 2»; у старых аккаунтов они появляются пустыми при чтении файла. */
export type Track = 'blocks' | 'lua' | 'python' | 'sdk2' | 'bricks';
export const TRACKS: readonly Track[] = ['blocks', 'lua', 'python', 'sdk2', 'bricks'];

export type Completion = { at: number; by: 'student' | 'teacher'; /** Комментарий учителя к зачёту. */ note?: string };
export type ClassGroup = { id: string; name: string; createdAt: number };
export type User = {
    id: string;
    role: 'teacher' | 'student';
    fullName: string;
    login: string;
    salt: string;
    hash: string;
    createdAt: number;
    progress: Record<Track, Record<string, Completion>>;
    /** Класс (группа), в которой учится ученик. */
    classId?: string | null;
    /** Последнее обращение к серверу из-под этого аккаунта. */
    lastActiveAt?: number;
    /** Пароль выдан учителем: ученику напоминаем его сменить. */
    mustChangePassword?: boolean;
    /** Заметка учителя об ученике; ученик её не видит. */
    note?: string;
};
/** viewAs — id учителя, который смотрит кабинет от имени ученика: такая сессия только для просмотра. */
type Session = { tokenHash: string; userId: string; expiresAt: number; viewAs?: string };
type Data = { version: number; users: User[]; sessions: Session[]; classes: ClassGroup[] };
/** Версия формата файла аккаунтов: 1 — без поля version (классов, заметок и дат активности не было). */
export const DATA_VERSION = 2;
const ACTIVE_TOUCH_MS = 60 * 1000;
const NOTE_MAX = 400;

const SESSION_COOKIE = 'pioneer_session';
/** Обычная сессия учителя, пока он смотрит от имени ученика: по ней возвращаемся обратно. */
const TEACHER_COOKIE = 'pioneer_teacher_session';
/** Просмотр от имени ученика живёт час и не продлевается. */
const VIEW_TTL_MS = 60 * 60 * 1000;
/** Вход действует два часа после последнего запроса: каждый запрос со своим токеном продлевает сессию. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** Продление сессии пишется на диск не чаще раза в минуту: перезапуск сервера теряет в худшем случае минуту. */
const SESSION_SAVE_DELAY_MS = 60 * 1000;
const QUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;
const LOGIN = /^[A-Za-z0-9_.-]{3,32}$/;

/** Заголовок, которым страница говорит, под каким пользователем она работает. */
export const EXPECTED_USER_HEADER = 'x-pioneer-user';

export class AccountError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { salt: string; hash: string } {
    return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function checkPassword(user: User, password: string): boolean {
    const candidate = Buffer.from(hashPassword(password, user.salt).hash, 'hex');
    const expected = Buffer.from(user.hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function emptyProgress(): User['progress'] {
    return Object.fromEntries(TRACKS.map((track) => [track, {}])) as unknown as User['progress'];
}

export function validateFullName(raw: unknown, requireSurnameAndName = true): string {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 100) throw new AccountError(400, 'Введите ФИО: от 2 до 100 символов.');
    if (requireSurnameAndName && name.split(' ').length < 2) throw new AccountError(400, 'Введите фамилию и имя полностью.');
    return name;
}

export function validateLogin(raw: unknown): string {
    const login = String(raw ?? '').trim();
    if (!LOGIN.test(login)) throw new AccountError(400, 'Логин: от 3 до 32 символов, латинские буквы, цифры, точка, дефис и подчёркивание.');
    return login;
}

export function validatePassword(raw: unknown): string {
    const password = String(raw ?? '');
    if (password.length < 6 || password.length > 128) throw new AccountError(400, 'Пароль: от 6 до 128 символов.');
    return password;
}

function parseTrack(raw: unknown): Track {
    if (!TRACKS.includes(raw as Track)) throw new AccountError(400, 'Неизвестный способ обучения.');
    return raw as Track;
}

function parseQuestId(raw: unknown): string {
    const id = String(raw ?? '');
    if (!QUEST_ID.test(id)) throw new AccountError(400, 'Неизвестная миссия.');
    return id;
}

export function validateNote(raw: unknown): string {
    return String(raw ?? '').replace(/\r/g, '').trim().slice(0, NOTE_MAX);
}

export function validateClassName(raw: unknown): string {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 1 || name.length > 40) throw new AccountError(400, 'Название класса: от 1 до 40 символов.');
    return name;
}

/**
 * Тихая миграция файла любой версии к текущей: недостающие поля дописываются, существующие не трогаются, неизвестные
 * поля остаются. Записи, которые не похожи на аккаунт (нет id, логина или хеша пароля), пропускаются.
 */
export function migrateData(raw: any): Data {
    const users: User[] = (Array.isArray(raw?.users) ? raw.users : []).filter((user: any) =>
        user && typeof user === 'object' && typeof user.id === 'string' && typeof user.login === 'string' && typeof user.hash === 'string' && typeof user.salt === 'string');
    const classes: ClassGroup[] = (Array.isArray(raw?.classes) ? raw.classes : []).filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item: any) => ({ ...item, createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now() }));
    const classIds = new Set(classes.map((item) => item.id));
    for (const user of users) {
        user.role = user.role === 'teacher' ? 'teacher' : 'student';
        user.fullName = typeof user.fullName === 'string' ? user.fullName : user.login;
        user.createdAt = Number.isFinite(user.createdAt) ? user.createdAt : Date.now();
        user.progress = { ...emptyProgress(), ...(user.progress && typeof user.progress === 'object' ? user.progress : {}) };
        for (const track of TRACKS) {
            const bucket = user.progress[track] && typeof user.progress[track] === 'object' ? user.progress[track] : {};
            for (const [id, completion] of Object.entries(bucket)) {
                if (!completion || typeof completion !== 'object') { bucket[id] = { at: user.createdAt, by: 'student' }; continue; }
                if (!Number.isFinite(completion.at)) completion.at = user.createdAt;
                if (completion.by !== 'teacher') completion.by = 'student';
            }
            user.progress[track] = bucket;
        }
        user.classId = user.classId && classIds.has(user.classId) ? user.classId : null;
    }
    const sessions: Session[] = Array.isArray(raw?.sessions) ? raw.sessions : [];
    return { version: DATA_VERSION, users, sessions, classes };
}

export class AccountStore {
    private data: Data = { version: DATA_VERSION, users: [], sessions: [], classes: [] };
    private writing: Promise<void> = Promise.resolve();
    private touchTimer: NodeJS.Timeout | null = null;

    constructor(private file: string | null) {
        if (file && fs.existsSync(file)) {
            try {
                const text = fs.readFileSync(file, 'utf8');
                const raw = JSON.parse(text);
                this.data = migrateData(raw);
                // Файл старого формата: перед первой записью в новом формате оставляем его копию.
                if (raw?.version !== DATA_VERSION) {
                    const backup = `${file}.v${raw?.version ?? 1}.bak`;
                    if (!fs.existsSync(backup)) fs.writeFileSync(backup, text, { mode: 0o600 });
                }
                // Сессии, выданные по прежнему сроку, укорачиваются до нынешнего.
                const limit = Date.now() + SESSION_TTL_MS;
                this.data.sessions.forEach((session) => { session.expiresAt = Math.min(session.expiresAt, limit); });
            } catch (error) {
                throw new Error(`Не удалось прочитать файл аккаунтов ${file}: ${(error as Error).message}`, { cause: error });
            }
        }
    }

    private save(): Promise<void> {
        if (!this.file) return Promise.resolve();
        const file = this.file;
        const json = JSON.stringify(this.data);
        this.writing = this.writing.then(async () => {
            await mkdir(path.dirname(file), { recursive: true });
            const temp = `${file}.${process.pid}.tmp`;
            await writeFile(temp, json, { mode: 0o600 });
            await rename(temp, file);
        }).catch((error) => { console.error('[accounts] не удалось сохранить файл аккаунтов', error); });
        return this.writing;
    }

    get classes(): readonly ClassGroup[] { return this.data.classes; }
    findClass(id: unknown): ClassGroup | undefined { return this.data.classes.find((item) => item.id === id); }

    async createClass(name: string): Promise<ClassGroup> {
        if (this.data.classes.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new AccountError(409, 'Класс с таким названием уже есть.');
        const group: ClassGroup = { id: crypto.randomUUID(), name, createdAt: Date.now() };
        this.data.classes.push(group);
        await this.save();
        return group;
    }

    async renameClass(group: ClassGroup, name: string): Promise<void> {
        if (this.data.classes.some((item) => item.id !== group.id && item.name.toLowerCase() === name.toLowerCase())) throw new AccountError(409, 'Класс с таким названием уже есть.');
        group.name = name;
        await this.save();
    }

    /** Удаление класса не удаляет учеников: они остаются «без класса». */
    async deleteClass(group: ClassGroup): Promise<void> {
        this.data.classes = this.data.classes.filter((item) => item.id !== group.id);
        this.data.users.forEach((user) => { if (user.classId === group.id) user.classId = null; });
        await this.save();
    }

    async moveToClass(users: User[], classId: string | null): Promise<void> {
        users.forEach((user) => { user.classId = classId; });
        await this.save();
    }

    findByLogin(login: string): User | undefined {
        return this.data.users.find((user) => user.login.toLowerCase() === login.toLowerCase());
    }

    findById(id: string): User | undefined {
        return this.data.users.find((user) => user.id === id);
    }

    hasTeacher(): boolean {
        return this.data.users.some((user) => user.role === 'teacher');
    }

    async createUser(role: User['role'], fullName: string, login: string, password: string, extra: { classId?: string | null; mustChangePassword?: boolean } = {}): Promise<User> {
        if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
        const user: User = { id: crypto.randomUUID(), role, fullName, login, ...hashPassword(password), createdAt: Date.now(), progress: emptyProgress(), classId: extra.classId ?? null };
        if (extra.mustChangePassword) user.mustChangePassword = true;
        this.data.users.push(user);
        await this.save();
        return user;
    }

    async updateUser(user: User, changes: { fullName?: unknown; login?: unknown; password?: unknown; classId?: unknown; note?: unknown; temporaryPassword?: boolean }): Promise<void> {
        if (changes.fullName !== undefined) user.fullName = validateFullName(changes.fullName, false);
        if (changes.note !== undefined) user.note = validateNote(changes.note);
        if (changes.classId !== undefined) {
            if (changes.classId && !this.findClass(changes.classId)) throw new AccountError(400, 'Такого класса нет.');
            user.classId = changes.classId ? String(changes.classId) : null;
        }
        if (changes.login !== undefined) {
            const login = validateLogin(changes.login);
            const taken = this.findByLogin(login);
            if (taken && taken.id !== user.id) throw new AccountError(409, 'Такой логин уже занят.');
            user.login = login;
        }
        if (changes.password !== undefined && changes.password !== '') {
            Object.assign(user, hashPassword(validatePassword(changes.password)));
            if (changes.temporaryPassword) user.mustChangePassword = true; else delete user.mustChangePassword;
            this.data.sessions = this.data.sessions.filter((session) => session.userId !== user.id);
        }
        await this.save();
    }

    async deleteUser(user: User): Promise<void> {
        this.data.users = this.data.users.filter((item) => item.id !== user.id);
        this.data.sessions = this.data.sessions.filter((session) => session.userId !== user.id);
        await this.save();
    }

    async startSession(user: User): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();
        this.data.sessions = this.data.sessions.filter((session) => session.expiresAt > now);
        this.data.sessions.push({ tokenHash: sha256(token), userId: user.id, expiresAt: now + SESSION_TTL_MS });
        user.lastActiveAt = now;
        await this.save();
        return token;
    }

    /** Сессия просмотра: учитель видит кабинет ученика его глазами. Активность ученика она не отмечает. */
    async startViewSession(student: User, teacher: User): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();
        this.data.sessions = this.data.sessions.filter((session) => session.expiresAt > now);
        this.data.sessions.push({ tokenHash: sha256(token), userId: student.id, expiresAt: now + VIEW_TTL_MS, viewAs: teacher.id });
        await this.save();
        return token;
    }

    /** Кто смотрит от имени ученика по этому токену (учитель) или undefined, если сессия обычная. */
    viewerForToken(token: string | undefined): User | undefined {
        if (!token) return undefined;
        const hash = sha256(token);
        const now = Date.now();
        const session = this.data.sessions.find((item) => item.tokenHash === hash && item.expiresAt > now);
        return session?.viewAs ? this.findById(session.viewAs) : undefined;
    }

    async endSession(token: string): Promise<void> {
        const hash = sha256(token);
        this.data.sessions = this.data.sessions.filter((session) => session.tokenHash !== hash);
        await this.save();
    }

    /** Пользователь по токену; живая сессия продлевается на два часа от этого запроса. */
    userForToken(token: string | undefined): User | undefined {
        if (!token) return undefined;
        const hash = sha256(token);
        const now = Date.now();
        const session = this.data.sessions.find((item) => item.tokenHash === hash && item.expiresAt > now);
        if (!session) return undefined;
        const user = this.findById(session.userId);
        if (session.viewAs) return user; // просмотр не продлевается и не отмечает ученика «был в сети»
        session.expiresAt = now + SESSION_TTL_MS;
        if (user && now - (user.lastActiveAt ?? 0) > ACTIVE_TOUCH_MS) user.lastActiveAt = now;
        this.scheduleSave();
        return user;
    }

    private scheduleSave(): void {
        if (this.touchTimer || !this.file) return;
        this.touchTimer = setTimeout(() => { this.touchTimer = null; void this.save(); }, SESSION_SAVE_DELAY_MS);
        this.touchTimer.unref?.();
    }

    authenticate(login: string, password: string): User | undefined {
        const user = this.findByLogin(login);
        return user && checkPassword(user, password) ? user : undefined;
    }

    async setCompletion(user: User, track: Track, questId: string, done: boolean, by: Completion['by'], note?: unknown): Promise<void> {
        const bucket = user.progress[track];
        if (done) {
            // Уже засчитанное не перезаписываем: так видно, кто и когда засчитал первым.
            if (!bucket[questId]) bucket[questId] = { at: Date.now(), by };
            if (note !== undefined) {
                const text = validateNote(note);
                if (text) bucket[questId].note = text; else delete bucket[questId].note;
            }
        } else {
            delete bucket[questId];
        }
        await this.save();
    }

    list(role: User['role']): User[] {
        return this.data.users.filter((user) => user.role === role);
    }
}

export const publicUser = (user: User) => ({ id: user.id, role: user.role, fullName: user.fullName, login: user.login, mustChangePassword: user.mustChangePassword === true });
/** Пользователь для страницы: в режиме просмотра добавляется имя учителя. */
const sessionUser = (user: User, viewer?: User) => (viewer ? { ...publicUser(user), viewAs: { teacherName: viewer.fullName } } : publicUser(user));

const progressIds = (user: User) => Object.fromEntries(TRACKS.map((track) => [track, Object.keys(user.progress[track])]));

const studentSummary = (user: User) => ({
    ...publicUser(user),
    createdAt: user.createdAt,
    classId: user.classId ?? null,
    lastActiveAt: user.lastActiveAt ?? null,
    note: user.note ?? '',
    counts: Object.fromEntries(TRACKS.map((track) => [track, Object.keys(user.progress[track]).length]))
});

const studentDetail = (user: User) => ({ ...studentSummary(user), progress: user.progress });

const DAY = 24 * 60 * 60 * 1000;
/** Столько неудачных проверок подряд на одной непройденной миссии, и ученика считаем застрявшим. */
export const STUCK_FAILS = 3;
/** Застрявшим считаем только того, кто пробовал за последние две недели: старые неудачи не тревожат. */
const STUCK_WINDOW_MS = 14 * DAY;

function completionTimes(user: User): number[] {
    return TRACKS.flatMap((track) => Object.values(user.progress[track]).map((completion) => completion.at));
}

/** Миссия, на которой ученик бьётся: не засчитана и несколько проверок подряд неудачны. */
export function findStuck(user: User, attempts: Attempt[], now = Date.now()): { track: string; questId: string; fails: number; lastAt: number } | null {
    const byQuest = new Map<string, Attempt[]>();
    for (const attempt of attempts) {
        const list = byQuest.get(`${attempt.track}\n${attempt.questId}`) ?? [];
        list.push(attempt);
        byQuest.set(`${attempt.track}\n${attempt.questId}`, list);
    }
    let worst: { track: string; questId: string; fails: number; lastAt: number } | null = null;
    for (const list of byQuest.values()) {
        const last = list[list.length - 1];
        const done = (user.progress[last.track as Track] ?? {})[last.questId];
        if (done || now - last.at > STUCK_WINDOW_MS) continue;
        let fails = 0;
        for (let i = list.length - 1; i >= 0 && !list[i].solved; i--) fails++;
        if (fails >= STUCK_FAILS && (!worst || fails > worst.fails)) worst = { track: last.track, questId: last.questId, fails, lastAt: last.at };
    }
    return worst;
}

export function buildOverview(store: AccountStore, attempts: AttemptLog | undefined, tz: number, now = Date.now()) {
    const all = attempts?.read() ?? [];
    const byUser = new Map<string, Attempt[]>();
    for (const attempt of all) {
        const list = byUser.get(attempt.userId) ?? [];
        list.push(attempt);
        byUser.set(attempt.userId, list);
    }
    const students = store.list('student').map((user) => {
        const own = byUser.get(user.id) ?? [];
        return {
            ...studentSummary(user),
            done: progressIds(user),
            attemptsTotal: own.length,
            attempts7d: own.filter((attempt) => now - attempt.at <= 7 * DAY).length,
            lastAttemptAt: own.length ? own[own.length - 1].at : null,
            stuck: findStuck(user, own, now)
        };
    }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
    // Сколько разных учеников занималось в каждый из последних 30 дней.
    const perDay: Record<string, Set<string>> = {};
    const mark = (userId: string, at: number) => { if (now - at <= 30 * DAY) (perDay[dayKey(at, tz)] ??= new Set()).add(userId); };
    for (const user of store.list('student')) completionTimes(user).forEach((at) => mark(user.id, at));
    for (const attempt of all) mark(attempt.userId, attempt.at);
    const activity = Object.fromEntries(Object.entries(perDay).map(([day, who]) => [day, who.size]));
    const classes = store.classes.map((group) => ({ ...group, count: students.filter((student) => student.classId === group.id).length }));
    return { classes, students, activity, today: dayKey(now, tz) };
}

/** Всё для личного кабинета ученика одним ответом. Код попыток отдельно (`/api/me/attempts`): он тяжёлый. */
export function buildCabinet(store: AccountStore, user: User, attempts: AttemptLog | undefined, tz: number, now = Date.now()) {
    const own = attempts?.forUser(user.id) ?? [];
    const events = [...own.map((attempt) => attempt.at), ...completionTimes(user)];
    const days = activityByDay(events, tz);
    const today = dayKey(now, tz);
    return {
        user: publicUser(user),
        classGroup: user.classId ? store.findClass(user.classId) ?? null : null,
        progress: user.progress,
        activity: {
            days: Object.fromEntries(Object.entries(days).filter(([day]) => now - Date.parse(`${day}T12:00:00Z`) < 100 * DAY)),
            today,
            ...streaks(Object.keys(days), today)
        },
        stats: {
            attempts: own.length,
            solvedChecks: own.filter((attempt) => attempt.solved).length,
            firstTrySolved: attempts?.firstTrySolved(user.id) ?? 0,
            lastAttemptAt: own.length ? own[own.length - 1].at : null
        },
        recent: own.slice(-40).reverse().map(({ code, ...rest }) => rest)
    };
}

function readCookie(req: express.Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
    }
    return undefined;
}

function setSessionCookie(req: express.Request, res: express.Response, token: string, maxAgeMs: number): void {
    setCookie(req, res, SESSION_COOKIE, token, maxAgeMs);
}

function setCookie(req: express.Request, res: express.Response, name: string, token: string, maxAgeMs: number): void {
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.append('Set-Cookie', `${name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? '; Secure' : ''}`);
}

type Handler = (req: express.Request, res: express.Response) => Promise<void> | void;
const wrap = (handler: Handler): express.RequestHandler => async (req, res) => {
    try {
        await handler(req, res);
    } catch (error) {
        if (error instanceof AccountError) res.status(error.status).json({ error: error.message });
        else { console.error('[accounts]', error); res.status(500).json({ error: 'Внутренняя ошибка сервера.' }); }
    }
};

/** Первый учитель: из TEACHER_LOGIN / TEACHER_PASSWORD, а если их нет, то случайный пароль в консоли сервера. */
export async function ensureTeacher(store: AccountStore, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    const login = env.TEACHER_LOGIN?.trim();
    const password = env.TEACHER_PASSWORD;
    if (login && password) {
        if (!store.findByLogin(login)) await store.createUser('teacher', env.TEACHER_NAME?.trim() || 'Учитель', validateLogin(login), validatePassword(password));
        return;
    }
    if (store.hasTeacher()) return;
    const generated = crypto.randomBytes(9).toString('base64url');
    await store.createUser('teacher', 'Учитель', 'teacher', generated);
    console.warn(`[accounts] Создан учитель: логин "teacher", пароль "${generated}". Смените его в кабинете или задайте TEACHER_LOGIN и TEACHER_PASSWORD.`);
}

export function registerAccountRoutes(app: express.Express, store: AccountStore, attempts?: AttemptLog, metrics?: MetricsLog): void {
    // Каждый запрос живого входа продлевает и сессию на сервере, и cookie в браузере: два часа отсчитываются от последнего действия.
    app.use(['/api/auth', '/api/progress', '/api/teacher', '/api/learning'], (req, res, next) => {
        const token = readCookie(req, SESSION_COOKIE);
        if (token && req.path !== '/logout' && store.userForToken(token)) setSessionCookie(req, res, token, SESSION_TTL_MS);
        next();
    });
    const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Слишком много попыток. Подождите несколько минут.' } });

    const currentUser = (req: express.Request) => store.userForToken(readCookie(req, SESSION_COOKIE));
    const viewerOf = (req: express.Request) => store.viewerForToken(readCookie(req, SESSION_COOKIE));
    /** Просмотр от имени ученика только читает: зачёты, попытки и профиль ученика остаются как были. */
    const forbidInView = (req: express.Request): void => {
        if (viewerOf(req)) throw new AccountError(403, 'В режиме просмотра нельзя ничего менять. Вернитесь к своему аккаунту.');
    };
    const requireUser = (req: express.Request): User => {
        const user = currentUser(req);
        if (!user) throw new AccountError(401, 'Нужно войти в аккаунт.');
        // Cookie одна на браузер: если во второй вкладке вошёл другой человек, страница первой вкладки об этом не знает. Она
        // сообщает, чей это вход (X-Pioneer-User), и зачёт чужого ученика не записывается в аккаунт того, кто вошёл последним.
        const expected = req.headers[EXPECTED_USER_HEADER];
        if (typeof expected === 'string' && expected && expected !== user.id) {
            throw new AccountError(401, 'В этом браузере вошёл другой пользователь. Войдите заново.');
        }
        return user;
    };
    const requireTeacher = (req: express.Request): User => {
        const user = requireUser(req);
        if (user.role !== 'teacher') throw new AccountError(403, 'Доступно только учителю.');
        return user;
    };
    const studentFromParams = (req: express.Request): User => {
        const student = store.findById(String(req.params.id));
        if (!student || student.role !== 'student') throw new AccountError(404, 'Ученик не найден.');
        return student;
    };

    app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
        const body = req.body ?? {};
        const fullName = validateFullName(body.fullName);
        const login = validateLogin(body.login);
        if (String(body.loginRepeat ?? '') !== login) throw new AccountError(400, 'Логины не совпадают.');
        const password = validatePassword(body.password);
        if (String(body.passwordRepeat ?? '') !== password) throw new AccountError(400, 'Пароли не совпадают.');
        const user = await store.createUser('student', fullName, login, password);
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.status(201).json({ user: publicUser(user) });
    }));

    app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
        const user = store.authenticate(String(req.body?.login ?? ''), String(req.body?.password ?? ''));
        if (!user) throw new AccountError(401, 'Неверный логин или пароль.');
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.json({ user: publicUser(user) });
    }));

    app.post('/api/auth/logout', wrap(async (req, res) => {
        const token = readCookie(req, SESSION_COOKIE);
        if (token) await store.endSession(token);
        setSessionCookie(req, res, '', 0);
        // Выход из режима просмотра не выходит из аккаунта учителя.
        const teacherToken = readCookie(req, TEACHER_COOKIE);
        if (teacherToken && store.userForToken(teacherToken)) setSessionCookie(req, res, teacherToken, SESSION_TTL_MS);
        setCookie(req, res, TEACHER_COOKIE, '', 0);
        res.json({ ok: true });
    }));

    // Профиль: ученик сам правит своё имя (логин и класс меняет учитель).
    app.patch('/api/auth/profile', wrap(async (req, res) => {
        const user = requireUser(req);
        forbidInView(req);
        await store.updateUser(user, { fullName: req.body?.fullName });
        res.json({ user: publicUser(user) });
    }));

    // Личный кабинет ученика: прогресс с датами, календарь активности, серия, последние проверки.
    app.get('/api/me/cabinet', wrap((req, res) => {
        res.json(buildCabinet(store, requireUser(req), attempts, parseTz(req.query.tz)));
    }));

    // История проверок с кодом: ученик видит только свои.
    app.get('/api/me/attempts', wrap((req, res) => {
        const user = requireUser(req);
        res.json({ attempts: attemptsForUser(attempts, user.id, req.query) });
    }));

    app.get('/api/auth/me', wrap((req, res) => {
        const user = currentUser(req);
        res.json({ user: user ? sessionUser(user, viewerOf(req)) : null });
    }));

    app.post('/api/auth/password', authLimiter, wrap(async (req, res) => {
        const user = requireUser(req);
        forbidInView(req);
        if (!checkPassword(user, String(req.body?.current ?? ''))) throw new AccountError(403, 'Текущий пароль неверный.');
        const next = validatePassword(req.body?.password);
        if (String(req.body?.passwordRepeat ?? '') !== next) throw new AccountError(400, 'Пароли не совпадают.');
        await store.updateUser(user, { password: next });
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.json({ ok: true });
    }));

    // Прогресс ученика: клиент берёт его с сервера при входе и сообщает о каждой пройденной миссии.
    app.get('/api/progress', wrap((req, res) => {
        res.json({ progress: progressIds(requireUser(req)) });
    }));

    app.post('/api/progress/complete', wrap(async (req, res) => {
        const user = requireUser(req);
        if (viewerOf(req)) { res.json({ progress: progressIds(user) }); return; }
        await store.setCompletion(user, parseTrack(req.body?.track), parseQuestId(req.body?.questId), true, 'student');
        res.json({ progress: progressIds(user) });
    }));

    // Журнал попыток: ученик присылает результат каждой проверки, учитель видит, где ученики застревают.
    app.post('/api/learning/attempt', wrap(async (req, res) => {
        const user = requireUser(req);
        if (user.role === 'student' && attempts && !viewerOf(req)) {
            await attempts.add(AttemptLog.sanitize({ userId: user.id, name: user.fullName, track: parseTrack(req.body?.track), questId: parseQuestId(req.body?.questId), body: req.body }));
        }
        res.json({ ok: true });
    }));

    app.get('/api/teacher/attempts', wrap((req, res) => {
        requireTeacher(req);
        const track = typeof req.query.track === 'string' && (TRACKS as readonly string[]).includes(req.query.track) ? req.query.track : undefined;
        // Можно ограничить сводку одним классом.
        const classId = typeof req.query.classId === 'string' && req.query.classId ? req.query.classId : undefined;
        const only = classId ? new Set(store.list('student').filter((student) => student.classId === classId).map((student) => student.id)) : undefined;
        res.json({ stats: attempts?.stats(track, only) ?? [] });
    }));

    app.get('/api/teacher/attempts/:questId', wrap((req, res) => {
        requireTeacher(req);
        const track = parseTrack(req.query.track);
        const questId = parseQuestId(req.params.questId);
        const stuck = (attempts?.stuckStudents(track, questId) ?? []).filter((item) => {
            const student = store.findById(item.userId);
            return student && !student.progress[track][questId];   // уже засчитанные учителем не застряли
        });
        res.json({ failures: attempts?.recentFailures(track, questId) ?? [], stuck });
    }));

    // Обзор класса: все ученики с прогрессом, последним входом и пометкой «застрял».
    app.get('/api/teacher/overview', wrap((req, res) => {
        requireTeacher(req);
        res.json(buildOverview(store, attempts, parseTz(req.query.tz)));
    }));

    app.post('/api/teacher/classes', wrap(async (req, res) => {
        requireTeacher(req);
        res.status(201).json({ classGroup: await store.createClass(validateClassName(req.body?.name)) });
    }));

    const classFromParams = (req: express.Request) => {
        const group = store.findClass(String(req.params.id));
        if (!group) throw new AccountError(404, 'Класс не найден.');
        return group;
    };

    app.patch('/api/teacher/classes/:id', wrap(async (req, res) => {
        requireTeacher(req);
        const group = classFromParams(req);
        await store.renameClass(group, validateClassName(req.body?.name));
        res.json({ classGroup: group });
    }));

    app.delete('/api/teacher/classes/:id', wrap(async (req, res) => {
        requireTeacher(req);
        await store.deleteClass(classFromParams(req));
        res.json({ ok: true });
    }));

    // Список учеников разом: по ФИО в строке; логины и временные пароли придумывает сервер.
    app.post('/api/teacher/students/bulk', wrap(async (req, res) => {
        requireTeacher(req);
        const lines = String(req.body?.names ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) throw new AccountError(400, 'Впишите хотя бы одно ФИО.');
        if (lines.length > 100) throw new AccountError(400, 'За один раз можно добавить до 100 учеников.');
        const classId = req.body?.classId ? String(req.body.classId) : null;
        if (classId && !store.findClass(classId)) throw new AccountError(400, 'Такого класса нет.');
        const created: { id: string; fullName: string; login: string; password: string }[] = [];
        const skipped: { line: string; reason: string }[] = [];
        for (const line of lines) {
            try {
                const fullName = validateFullName(line, false);
                const login = suggestLogin(fullName, (candidate) => Boolean(store.findByLogin(candidate)));
                const password = generatePassword();
                const user = await store.createUser('student', fullName, login, password, { classId, mustChangePassword: true });
                created.push({ id: user.id, fullName, login, password });
            } catch (error) {
                skipped.push({ line, reason: error instanceof AccountError ? error.message : 'Не удалось создать.' });
            }
        }
        res.status(201).json({ created, skipped });
    }));

    // Действие над несколькими учениками: перенос в класс или новые пароли.
    app.post('/api/teacher/students/batch', wrap(async (req, res) => {
        requireTeacher(req);
        const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const targets = ids.map((id) => store.findById(String(id))).filter((user): user is User => user?.role === 'student');
        if (!targets.length) throw new AccountError(400, 'Выберите хотя бы одного ученика.');
        if (req.body?.action === 'move') {
            const classId = req.body?.classId ? String(req.body.classId) : null;
            if (classId && !store.findClass(classId)) throw new AccountError(400, 'Такого класса нет.');
            await store.moveToClass(targets, classId);
            res.json({ moved: targets.length });
        } else if (req.body?.action === 'reset') {
            const passwords: { id: string; fullName: string; login: string; password: string }[] = [];
            for (const user of targets) {
                const password = generatePassword();
                await store.updateUser(user, { password, temporaryPassword: true });
                passwords.push({ id: user.id, fullName: user.fullName, login: user.login, password });
            }
            res.json({ passwords });
        } else {
            throw new AccountError(400, 'Неизвестное действие.');
        }
    }));

    // Посмотреть кабинет и обучение глазами ученика, не зная его пароля. Сессия только для чтения, живёт час.
    app.post('/api/teacher/students/:id/view', wrap(async (req, res) => {
        const teacher = requireTeacher(req);
        const student = studentFromParams(req);
        const teacherToken = readCookie(req, SESSION_COOKIE)!;
        const token = await store.startViewSession(student, teacher);
        setCookie(req, res, TEACHER_COOKIE, teacherToken, SESSION_TTL_MS);
        setSessionCookie(req, res, token, VIEW_TTL_MS);
        res.json({ user: sessionUser(student, teacher) });
    }));

    // Вернуться из просмотра в свой аккаунт учителя.
    app.post('/api/auth/view-exit', wrap(async (req, res) => {
        const token = readCookie(req, SESSION_COOKIE);
        const viewer = viewerOf(req);
        if (!token || !viewer) throw new AccountError(400, 'Режим просмотра не включён.');
        const teacherToken = readCookie(req, TEACHER_COOKIE);
        await store.endSession(token);
        setCookie(req, res, TEACHER_COOKIE, '', 0);
        const teacher = teacherToken ? store.userForToken(teacherToken) : undefined;
        if (!teacher || teacher.id !== viewer.id) {
            setSessionCookie(req, res, '', 0);
            res.json({ user: null });
            return;
        }
        setSessionCookie(req, res, teacherToken!, SESSION_TTL_MS);
        res.json({ user: publicUser(teacher) });
    }));

    app.post('/api/teacher/students/:id/reset-password', wrap(async (req, res) => {
        requireTeacher(req);
        const student = studentFromParams(req);
        const password = generatePassword();
        await store.updateUser(student, { password, temporaryPassword: true });
        res.json({ password, student: studentDetail(student) });
    }));

    app.get('/api/teacher/students/:id/attempts', wrap((req, res) => {
        requireTeacher(req);
        res.json({ attempts: attemptsForUser(attempts, studentFromParams(req).id, req.query) });
    }));

    app.get('/api/teacher/students/:id/activity', wrap((req, res) => {
        requireTeacher(req);
        const student = studentFromParams(req);
        res.json(buildCabinet(store, student, attempts, parseTz(req.query.tz)));
    }));

    // Анонимная метрика: принимает события без имён и кода, поэтому вход не нужен (гость тоже учится).
    const metricsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Слишком много событий.' } });
    app.post('/api/metrics', metricsLimiter, wrap(async (req, res) => {
        const list: unknown[] = Array.isArray(req.body?.events) ? req.body.events.slice(0, 30) : [];
        const sid = req.body?.sid;
        const events = list.map((item) => sanitizeEvent({ ...(item as object), sid })).filter((event): event is NonNullable<typeof event> => event !== null);
        await metrics?.add(events);
        res.json({ ok: true, accepted: events.length });
    }));

    app.get('/api/teacher/metrics', wrap((req, res) => {
        requireTeacher(req);
        const days = Math.min(Math.max(Math.round(Number(req.query.days)) || 30, 1), 365);
        res.json({ summary: metrics?.summary(days) ?? null });
    }));

    app.get('/api/teacher/students', wrap((req, res) => {
        requireTeacher(req);
        res.json({ students: store.list('student').map(studentSummary).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')) });
    }));

    app.post('/api/teacher/students', wrap(async (req, res) => {
        requireTeacher(req);
        const body = req.body ?? {};
        if (body.classId && !store.findClass(body.classId)) throw new AccountError(400, 'Такого класса нет.');
        const user = await store.createUser('student', validateFullName(body.fullName, false), validateLogin(body.login), validatePassword(body.password), { classId: body.classId ? String(body.classId) : null });
        res.status(201).json({ student: studentDetail(user) });
    }));

    app.get('/api/teacher/students/:id', wrap((req, res) => {
        requireTeacher(req);
        res.json({ student: studentDetail(studentFromParams(req)) });
    }));

    app.patch('/api/teacher/students/:id', wrap(async (req, res) => {
        requireTeacher(req);
        const student = studentFromParams(req);
        const { fullName, login, password, classId, note } = req.body ?? {};
        await store.updateUser(student, { fullName, login, password, classId, note, temporaryPassword: false });
        res.json({ student: studentDetail(student) });
    }));

    app.delete('/api/teacher/students/:id', wrap(async (req, res) => {
        requireTeacher(req);
        await store.deleteUser(studentFromParams(req));
        res.json({ ok: true });
    }));

    app.put('/api/teacher/students/:id/progress', wrap(async (req, res) => {
        requireTeacher(req);
        const student = studentFromParams(req);
        await store.setCompletion(student, parseTrack(req.body?.track), parseQuestId(req.body?.questId), Boolean(req.body?.done), 'teacher', req.body?.note);
        res.json({ student: studentDetail(student) });
    }));
}

/** Проверки одного ученика с кодом, новые сверху; можно сузить до языка и миссии. */
function attemptsForUser(attempts: AttemptLog | undefined, userId: string, query: express.Request['query']): Attempt[] {
    const track = typeof query.track === 'string' && (TRACKS as readonly string[]).includes(query.track) ? query.track : undefined;
    const questId = typeof query.questId === 'string' && QUEST_ID.test(query.questId) ? query.questId : undefined;
    return (attempts?.forUser(userId) ?? [])
        .filter((attempt) => (!track || attempt.track === track) && (!questId || attempt.questId === questId))
        .slice(-80).reverse();
}

export function resolveAccountsFile(projectRoot: string, env: NodeJS.ProcessEnv = process.env): string {
    return env.ACCOUNTS_FILE ? path.resolve(env.ACCOUNTS_FILE) : path.join(projectRoot, 'data', 'accounts.json');
}
