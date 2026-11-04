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

export type Track = 'blocks' | 'lua' | 'python';
export const TRACKS: readonly Track[] = ['blocks', 'lua', 'python'];

type Completion = { at: number; by: 'student' | 'teacher' };
type User = {
    id: string;
    role: 'teacher' | 'student';
    fullName: string;
    login: string;
    salt: string;
    hash: string;
    createdAt: number;
    progress: Record<Track, Record<string, Completion>>;
};
type Session = { tokenHash: string; userId: string; expiresAt: number };
type Data = { users: User[]; sessions: Session[] };

const SESSION_COOKIE = 'pioneer_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const QUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;
const LOGIN = /^[A-Za-z0-9_.-]{3,32}$/;

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
    return { blocks: {}, lua: {}, python: {} };
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

export class AccountStore {
    private data: Data = { users: [], sessions: [] };
    private writing: Promise<void> = Promise.resolve();

    constructor(private file: string | null) {
        if (file && fs.existsSync(file)) {
            try {
                const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
                this.data = { users: Array.isArray(raw.users) ? raw.users : [], sessions: Array.isArray(raw.sessions) ? raw.sessions : [] };
                this.data.users.forEach((user) => { user.progress = { ...emptyProgress(), ...user.progress }; });
            } catch (error) {
                throw new Error(`Не удалось прочитать файл аккаунтов ${file}: ${(error as Error).message}`);
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

    findByLogin(login: string): User | undefined {
        return this.data.users.find((user) => user.login.toLowerCase() === login.toLowerCase());
    }

    findById(id: string): User | undefined {
        return this.data.users.find((user) => user.id === id);
    }

    hasTeacher(): boolean {
        return this.data.users.some((user) => user.role === 'teacher');
    }

    async createUser(role: User['role'], fullName: string, login: string, password: string): Promise<User> {
        if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
        const user: User = { id: crypto.randomUUID(), role, fullName, login, ...hashPassword(password), createdAt: Date.now(), progress: emptyProgress() };
        this.data.users.push(user);
        await this.save();
        return user;
    }

    async updateUser(user: User, changes: { fullName?: unknown; login?: unknown; password?: unknown }): Promise<void> {
        if (changes.fullName !== undefined) user.fullName = validateFullName(changes.fullName, false);
        if (changes.login !== undefined) {
            const login = validateLogin(changes.login);
            const taken = this.findByLogin(login);
            if (taken && taken.id !== user.id) throw new AccountError(409, 'Такой логин уже занят.');
            user.login = login;
        }
        if (changes.password !== undefined && changes.password !== '') {
            Object.assign(user, hashPassword(validatePassword(changes.password)));
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
        await this.save();
        return token;
    }

    async endSession(token: string): Promise<void> {
        const hash = sha256(token);
        this.data.sessions = this.data.sessions.filter((session) => session.tokenHash !== hash);
        await this.save();
    }

    userForToken(token: string | undefined): User | undefined {
        if (!token) return undefined;
        const hash = sha256(token);
        const session = this.data.sessions.find((item) => item.tokenHash === hash && item.expiresAt > Date.now());
        return session ? this.findById(session.userId) : undefined;
    }

    authenticate(login: string, password: string): User | undefined {
        const user = this.findByLogin(login);
        return user && checkPassword(user, password) ? user : undefined;
    }

    async setCompletion(user: User, track: Track, questId: string, done: boolean, by: Completion['by']): Promise<void> {
        const bucket = user.progress[track];
        if (done) {
            // Уже засчитанное не перезаписываем: так видно, кто и когда засчитал первым.
            if (!bucket[questId]) bucket[questId] = { at: Date.now(), by };
        } else {
            delete bucket[questId];
        }
        await this.save();
    }

    list(role: User['role']): User[] {
        return this.data.users.filter((user) => user.role === role);
    }
}

export const publicUser = (user: User) => ({ id: user.id, role: user.role, fullName: user.fullName, login: user.login });

const progressIds = (user: User) => Object.fromEntries(TRACKS.map((track) => [track, Object.keys(user.progress[track])]));

const studentSummary = (user: User) => ({
    ...publicUser(user),
    createdAt: user.createdAt,
    counts: Object.fromEntries(TRACKS.map((track) => [track, Object.keys(user.progress[track]).length]))
});

const studentDetail = (user: User) => ({ ...studentSummary(user), progress: user.progress });

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
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? '; Secure' : ''}`);
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

export function registerAccountRoutes(app: express.Express, store: AccountStore): void {
    const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Слишком много попыток. Подождите несколько минут.' } });

    const currentUser = (req: express.Request) => store.userForToken(readCookie(req, SESSION_COOKIE));
    const requireUser = (req: express.Request): User => {
        const user = currentUser(req);
        if (!user) throw new AccountError(401, 'Нужно войти в аккаунт.');
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
        res.json({ ok: true });
    }));

    app.get('/api/auth/me', wrap((req, res) => {
        const user = currentUser(req);
        res.json({ user: user ? publicUser(user) : null });
    }));

    app.post('/api/auth/password', authLimiter, wrap(async (req, res) => {
        const user = requireUser(req);
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
        await store.setCompletion(user, parseTrack(req.body?.track), parseQuestId(req.body?.questId), true, 'student');
        res.json({ progress: progressIds(user) });
    }));

    app.get('/api/teacher/students', wrap((req, res) => {
        requireTeacher(req);
        res.json({ students: store.list('student').map(studentSummary).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')) });
    }));

    app.post('/api/teacher/students', wrap(async (req, res) => {
        requireTeacher(req);
        const body = req.body ?? {};
        const user = await store.createUser('student', validateFullName(body.fullName, false), validateLogin(body.login), validatePassword(body.password));
        res.status(201).json({ student: studentDetail(user) });
    }));

    app.get('/api/teacher/students/:id', wrap((req, res) => {
        requireTeacher(req);
        res.json({ student: studentDetail(studentFromParams(req)) });
    }));

    app.patch('/api/teacher/students/:id', wrap(async (req, res) => {
        requireTeacher(req);
        const student = studentFromParams(req);
        const { fullName, login, password } = req.body ?? {};
        await store.updateUser(student, { fullName, login, password });
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
        await store.setCompletion(student, parseTrack(req.body?.track), parseQuestId(req.body?.questId), Boolean(req.body?.done), 'teacher');
        res.json({ student: studentDetail(student) });
    }));
}

export function resolveAccountsFile(projectRoot: string, env: NodeJS.ProcessEnv = process.env): string {
    return env.ACCOUNTS_FILE ? path.resolve(env.ACCOUNTS_FILE) : path.join(projectRoot, 'data', 'accounts.json');
}
