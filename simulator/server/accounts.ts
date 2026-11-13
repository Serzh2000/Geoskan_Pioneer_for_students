/**
 * Аккаунты учителя и учеников и зачёт миссий.
 *
 * Хранилище — один JSON-файл (ACCOUNTS_FILE, по умолчанию data/accounts.json): для класса из десятков учеников
 * этого достаточно, база не нужна. Пароли лежат только в виде scrypt-хеша, сессии — в виде sha256 от токена.
 * Подтверждения почтой нет: ученик сам вводит ФИО, логин и пароль дважды.
 *
 * Роли: `admin` (создаётся из окружения или при первом запуске, владеет организацией «Основная» и видит всё),
 * `teacher` (регистрируется сам или по ссылке коллеги, учит только учеников своей организации) и `student`
 * (регистрируется сам или по ссылке организации). Организация: название, владелец, классы, учителя, ученики.
 * Учитель управляет учениками своей организации и вручную засчитывает или снимает любую миссию; зачёт учителя главнее
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
import { CaptchaIssuer } from './captcha.js';
import { CONSENT_VERSION } from './legal-config.js';
import { activityByDay, dayKey, generatePassword, parseTz, streaks, suggestLogin } from './cabinet.js';

/** Способы обучения. sdk2 и bricks — треки «Мини 2»; у старых аккаунтов они появляются пустыми при чтении файла. */
export type Track = 'blocks' | 'lua' | 'python' | 'sdk2' | 'bricks';
export const TRACKS: readonly Track[] = ['blocks', 'lua', 'python', 'sdk2', 'bricks'];

export type Completion = { at: number; by: 'student' | 'teacher'; /** Комментарий учителя к зачёту. */ note?: string };
export type Role = 'admin' | 'teacher' | 'student';
/** Организация (школа, кружок): владелец управляет командой, учителя видят всех её учеников. */
export type Organization = { id: string; name: string; ownerId: string; createdAt: number; blocked?: boolean };
/** Ссылка-приглашение: ученика в организацию или коллеги-учителя в неё же. Токен хранится как есть, чтобы ссылку можно было показать снова. */
export type Invite = {
    id: string; token: string; orgId: string; kind: 'student' | 'teacher'; createdBy: string;
    createdAt: number; expiresAt: number; maxUses: number | null; uses: number; revoked: boolean;
};
export type InviteState = 'ok' | 'expired' | 'revoked' | 'used-up';
export type ClassGroup = { id: string; name: string; createdAt: number; orgId: string };
export type User = {
    id: string;
    role: Role;
    /** Организация: у ученика, учителя и админа она всегда есть. */
    orgId: string;
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
    /** Согласие на обработку данных и принятие условий: когда и на какую версию политики. */
    consent?: { at: number; version: string };
};
/** viewAs — id учителя, который смотрит кабинет от имени ученика: такая сессия только для просмотра. */
type Session = { tokenHash: string; userId: string; expiresAt: number; viewAs?: string };
type Data = { version: number; users: User[]; sessions: Session[]; classes: ClassGroup[]; orgs: Organization[]; invites: Invite[] };
/** Версия формата файла аккаунтов: 1 — без поля version (классов, заметок и дат активности не было), 2 — без организаций и админа. */
export const DATA_VERSION = 3;
/** Организация, в которую перешли все ученики и классы до появления организаций, и куда попадают ученики без ссылки. */
export const MAIN_ORG_ID = 'org-main';
export const MAIN_ORG_NAME = 'Основная';
const INVITE_DEFAULT_DAYS = 30;
const ORG_NAME_MAX = 60;
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
    if (name.length < 2 || name.length > 100) throw new AccountError(400, 'Введите имя или ник: от 2 до 100 символов.');
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

export function validateOrgName(raw: unknown): string {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > ORG_NAME_MAX) throw new AccountError(400, `Название организации: от 2 до ${ORG_NAME_MAX} символов.`);
    return name;
}

/**
 * Тихая миграция файла любой версии к текущей: недостающие поля дописываются, существующие не трогаются, неизвестные
 * поля остаются. Записи, которые не похожи на аккаунт (нет id, логина или хеша пароля), пропускаются.
 * Версия 3: появляются организации. Все прежние ученики и классы переходят в «Основную»; самый старый учитель
 * становится админом и владельцем «Основной», остальные учителя остаются учителями в ней.
 */
/** Запись из файла аккаунтов любой версии: поля проверяются при чтении, поэтому здесь свободный тип. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = { [key: string]: any };

export function migrateData(raw: Raw): Data {
    const users: User[] = (Array.isArray(raw?.users) ? raw.users : []).filter((user: Raw) =>
        user && typeof user === 'object' && typeof user.id === 'string' && typeof user.login === 'string' && typeof user.hash === 'string' && typeof user.salt === 'string');
    const orgs: Organization[] = (Array.isArray(raw?.orgs) ? raw.orgs : []).filter((item: Raw) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item: Raw) => ({ ...item, ownerId: typeof item.ownerId === 'string' ? item.ownerId : '', createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now() } as Organization));
    if (!orgs.some((item) => item.id === MAIN_ORG_ID)) orgs.unshift({ id: MAIN_ORG_ID, name: MAIN_ORG_NAME, ownerId: '', createdAt: Date.now() });
    const orgIds = new Set(orgs.map((item) => item.id));
    const classes: ClassGroup[] = (Array.isArray(raw?.classes) ? raw.classes : []).filter((item: Raw) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item: Raw) => ({ ...item, createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(), orgId: orgIds.has(item.orgId) ? item.orgId : MAIN_ORG_ID } as ClassGroup));
    const classIds = new Set(classes.map((item) => item.id));
    for (const user of users) {
        user.role = user.role === 'teacher' || user.role === 'admin' ? user.role : 'student';
        user.orgId = orgIds.has(user.orgId) ? user.orgId : MAIN_ORG_ID;
        user.fullName = typeof user.fullName === 'string' ? user.fullName : user.login;
        user.createdAt = Number.isFinite(user.createdAt) ? user.createdAt : Date.now();
        if (!(user.consent && Number.isFinite(user.consent.at) && typeof user.consent.version === 'string')) delete user.consent;
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
        // Класс ученика должен быть из его же организации: иначе класс чужой и ученик остаётся без класса.
        const group = user.classId && classIds.has(user.classId) ? classes.find((item) => item.id === user.classId) : undefined;
        user.classId = group && group.orgId === user.orgId ? group.id : null;
    }
    // До организаций учитель был один и всемогущий: самый старый становится админом.
    if (!users.some((user) => user.role === 'admin')) {
        const first = users.filter((user) => user.role === 'teacher').sort((a, b) => a.createdAt - b.createdAt)[0];
        if (first) { first.role = 'admin'; first.orgId = MAIN_ORG_ID; }
    }
    // Владелец организации - её учитель или админ; если владельца нет (удалён), им становится самый старый из них.
    for (const org of orgs) {
        const staff = users.filter((user) => user.orgId === org.id && user.role !== 'student').sort((a, b) => a.createdAt - b.createdAt);
        if (!staff.some((user) => user.id === org.ownerId)) org.ownerId = (org.id === MAIN_ORG_ID ? staff.find((user) => user.role === 'admin') : undefined)?.id ?? staff[0]?.id ?? '';
    }
    const sessions: Session[] = Array.isArray(raw?.sessions) ? raw.sessions : [];
    const invites: Invite[] = (Array.isArray(raw?.invites) ? raw.invites : []).filter((item: Raw) =>
        item && typeof item.id === 'string' && typeof item.token === 'string' && orgIds.has(item.orgId) && (item.kind === 'student' || item.kind === 'teacher'))
        .map((item: Raw) => ({ ...item, uses: Number.isFinite(item.uses) ? item.uses : 0, maxUses: Number.isFinite(item.maxUses) ? item.maxUses : null, revoked: item.revoked === true } as Invite));
    return { version: DATA_VERSION, users, sessions, classes, orgs, invites };
}

export class AccountStore {
    private data: Data = { version: DATA_VERSION, users: [], sessions: [], classes: [], orgs: [{ id: MAIN_ORG_ID, name: MAIN_ORG_NAME, ownerId: '', createdAt: Date.now() }], invites: [] };
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

    /** Классы организации; без аргумента все (только для админа). */
    classesOf(orgId?: string | null): readonly ClassGroup[] { return orgId ? this.data.classes.filter((item) => item.orgId === orgId) : this.data.classes; }
    findClass(id: unknown): ClassGroup | undefined { return this.data.classes.find((item) => item.id === id); }

    async createClass(orgId: string, name: string): Promise<ClassGroup> {
        if (this.classesOf(orgId).some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new AccountError(409, 'Класс с таким названием уже есть.');
        const group: ClassGroup = { id: crypto.randomUUID(), name, createdAt: Date.now(), orgId };
        this.data.classes.push(group);
        await this.save();
        return group;
    }

    async renameClass(group: ClassGroup, name: string): Promise<void> {
        if (this.classesOf(group.orgId).some((item) => item.id !== group.id && item.name.toLowerCase() === name.toLowerCase())) throw new AccountError(409, 'Класс с таким названием уже есть.');
        group.name = name;
        await this.save();
    }

    // ---- организации ----
    get orgs(): readonly Organization[] { return this.data.orgs; }
    findOrg(id: unknown): Organization | undefined { return this.data.orgs.find((item) => item.id === id); }
    /** Организация пользователя; у любого аккаунта она есть (иначе «Основная»). */
    orgOf(user: User): Organization { return this.findOrg(user.orgId) ?? this.findOrg(MAIN_ORG_ID)!; }

    async createOrg(name: string, owner: User): Promise<Organization> {
        const org: Organization = { id: crypto.randomUUID(), name, ownerId: owner.id, createdAt: Date.now() };
        this.data.orgs.push(org);
        owner.orgId = org.id;
        owner.classId = null;
        await this.save();
        return org;
    }

    async renameOrg(org: Organization, name: string): Promise<void> {
        org.name = name;
        await this.save();
    }

    async setOrgBlocked(org: Organization, blocked: boolean): Promise<void> {
        if (blocked) org.blocked = true; else delete org.blocked;
        await this.save();
    }

    /**
     * Удаление организации (только админом): ученики не пропадают, а переходят в «Основную» без класса; учителя и
     * классы организации, её ссылки и сессии учителей удаляются. «Основную» удалить нельзя.
     */
    async deleteOrg(org: Organization): Promise<{ movedStudents: number; removedTeachers: number }> {
        if (org.id === MAIN_ORG_ID) throw new AccountError(400, 'Основную организацию удалить нельзя.');
        const students = this.data.users.filter((user) => user.orgId === org.id && user.role === 'student');
        const teachers = this.data.users.filter((user) => user.orgId === org.id && user.role !== 'student');
        students.forEach((user) => { user.orgId = MAIN_ORG_ID; user.classId = null; });
        const gone = new Set(teachers.map((user) => user.id));
        this.data.users = this.data.users.filter((user) => !gone.has(user.id));
        this.data.sessions = this.data.sessions.filter((session) => !gone.has(session.userId) && !(session.viewAs && gone.has(session.viewAs)));
        this.data.classes = this.data.classes.filter((item) => item.orgId !== org.id);
        this.data.invites = this.data.invites.filter((item) => item.orgId !== org.id);
        this.data.orgs = this.data.orgs.filter((item) => item.id !== org.id);
        await this.save();
        return { movedStudents: students.length, removedTeachers: teachers.length };
    }

    /** Ученик переходит в другую организацию по своей воле: прогресс остаётся, класс сбрасывается. */
    async moveStudentToOrg(student: User, orgId: string): Promise<void> {
        student.orgId = orgId;
        student.classId = null;
        await this.save();
    }

    /** Учитель уходит из чужой организации в новую свою (владелец убрал его из команды). */
    async acceptConsent(user: User): Promise<void> {
        user.consent = { at: Date.now(), version: CONSENT_VERSION };
        await this.save();
    }

    async spinOffTeacher(teacher: User): Promise<Organization> {
        return this.createOrg(`Организация ${teacher.fullName}`.slice(0, ORG_NAME_MAX), teacher);
    }

    staffOf(orgId: string): User[] {
        return this.data.users.filter((user) => user.orgId === orgId && user.role !== 'student');
    }

    studentsOf(orgId?: string | null): User[] {
        return this.data.users.filter((user) => user.role === 'student' && (!orgId || user.orgId === orgId));
    }

    // ---- ссылки-приглашения ----
    invitesOf(orgId: string): Invite[] { return this.data.invites.filter((item) => item.orgId === orgId); }
    findInvite(id: unknown): Invite | undefined { return this.data.invites.find((item) => item.id === id); }
    findInviteByToken(token: unknown): Invite | undefined {
        if (typeof token !== 'string' || token.length < 16 || token.length > 128) return undefined;
        const given = Buffer.from(token);
        // Сравнение за постоянное время: по времени ответа токен подобрать нельзя.
        return this.data.invites.find((item) => {
            const right = Buffer.from(item.token);
            return right.length === given.length && crypto.timingSafeEqual(right, given);
        });
    }

    inviteState(invite: Invite, now = Date.now()): InviteState {
        if (invite.revoked) return 'revoked';
        if (invite.expiresAt <= now) return 'expired';
        if (invite.maxUses !== null && invite.uses >= invite.maxUses) return 'used-up';
        return 'ok';
    }

    async createInvite(org: Organization, kind: Invite['kind'], createdBy: User, options: { days?: number; maxUses?: number | null } = {}): Promise<Invite> {
        const days = Math.min(Math.max(Math.round(options.days ?? INVITE_DEFAULT_DAYS), 1), 365);
        const maxUses = options.maxUses === null || options.maxUses === undefined ? null : Math.min(Math.max(Math.round(options.maxUses), 1), 1000);
        const now = Date.now();
        const invite: Invite = {
            id: crypto.randomUUID(), token: crypto.randomBytes(16).toString('base64url'), orgId: org.id, kind, createdBy: createdBy.id,
            createdAt: now, expiresAt: now + days * 24 * 60 * 60 * 1000, maxUses, uses: 0, revoked: false
        };
        this.data.invites.push(invite);
        await this.save();
        return invite;
    }

    async useInvite(invite: Invite): Promise<void> {
        invite.uses++;
        await this.save();
    }

    async revokeInvite(invite: Invite): Promise<void> {
        invite.revoked = true;
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

    hasAdmin(): boolean {
        return this.data.users.some((user) => user.role === 'admin');
    }

    async createUser(role: User['role'], fullName: string, login: string, password: string, extra: { orgId?: string; classId?: string | null; mustChangePassword?: boolean; consented?: boolean } = {}): Promise<User> {
        if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
        const orgId = extra.orgId && this.findOrg(extra.orgId) ? extra.orgId : MAIN_ORG_ID;
        const user: User = { id: crypto.randomUUID(), role, orgId, fullName, login, ...hashPassword(password), createdAt: Date.now(), progress: emptyProgress(), classId: extra.classId ?? null };
        if (extra.mustChangePassword) user.mustChangePassword = true;
        if (extra.consented) user.consent = { at: Date.now(), version: CONSENT_VERSION };
        this.data.users.push(user);
        // Админ - владелец «Основной», пока у неё нет владельца.
        const org = this.findOrg(orgId);
        if (org && !org.ownerId && role !== 'student') org.ownerId = user.id;
        await this.save();
        return user;
    }

    /** Учитель, который регистрируется сам: сразу и аккаунт, и своя организация (одной записью, без полусозданного состояния). */
    async createTeacherWithOrg(fullName: string, login: string, password: string, orgName: string, consented = false): Promise<{ user: User; org: Organization }> {
        if (this.findByLogin(login)) throw new AccountError(409, 'Такой логин уже занят.');
        const org: Organization = { id: crypto.randomUUID(), name: orgName, ownerId: '', createdAt: Date.now() };
        const user: User = { id: crypto.randomUUID(), role: 'teacher', orgId: org.id, fullName, login, ...hashPassword(password), createdAt: Date.now(), progress: emptyProgress(), classId: null };
        org.ownerId = user.id;
        if (consented) user.consent = { at: Date.now(), version: CONSENT_VERSION };
        this.data.orgs.push(org);
        this.data.users.push(user);
        await this.save();
        return { user, org };
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

/** Согласие дано на нынешнюю версию политики. Без него пользователь только принимает политику или выходит. */
export const hasConsent = (user: User): boolean => user.consent?.version === CONSENT_VERSION;

/** Учитель или админ: всё, что не ученик. */
export const isStaff = (user: User): boolean => user.role !== 'student';

export const publicUser = (user: User) => ({ id: user.id, role: user.role, fullName: user.fullName, login: user.login, mustChangePassword: user.mustChangePassword === true });
/** Пользователь для страницы: организация (название и роль в ней) и, в режиме просмотра, имя учителя. */
const sessionUser = (store: AccountStore, user: User, viewer?: User) => {
    const org = store.orgOf(user);
    return {
        ...publicUser(user),
        org: { id: org.id, name: org.name, isOwner: org.ownerId === user.id },
        // В режиме просмотра согласие не спрашивается: смотрит учитель, а не ученик.
        needsConsent: viewer ? false : !hasConsent(user),
        ...(viewer ? { viewAs: { teacherName: viewer.fullName } } : {})
    };
};

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
        // Промежуточный опыт миссии из нескольких запусков не ошибка: три правильных опыта подряд не делают ученика «застрявшим».
        if (attempt.partial) continue;
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

/** Обзор организации (orgId) или всех организаций сразу (null, только для админа). */
export function buildOverview(store: AccountStore, attempts: AttemptLog | undefined, tz: number, orgId: string | null, now = Date.now()) {
    const members = new Set(store.studentsOf(orgId).map((user) => user.id));
    const all = (attempts?.read() ?? []).filter((attempt) => members.has(attempt.userId));
    const byUser = new Map<string, Attempt[]>();
    for (const attempt of all) {
        const list = byUser.get(attempt.userId) ?? [];
        list.push(attempt);
        byUser.set(attempt.userId, list);
    }
    const students = store.studentsOf(orgId).map((user) => {
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
    for (const user of store.studentsOf(orgId)) completionTimes(user).forEach((at) => mark(user.id, at));
    for (const attempt of all) mark(attempt.userId, attempt.at);
    const activity = Object.fromEntries(Object.entries(perDay).map(([day, who]) => [day, who.size]));
    const classes = store.classesOf(orgId).map((group) => ({ ...group, count: students.filter((student) => student.classId === group.id).length }));
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
        recent: own.slice(-40).reverse().map(({ code: _code, ...rest }) => rest)
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

/** Первый админ: из TEACHER_LOGIN / TEACHER_PASSWORD, а если их нет, то случайный пароль в консоли сервера. */
export async function ensureTeacher(store: AccountStore, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    const login = env.TEACHER_LOGIN?.trim();
    const password = env.TEACHER_PASSWORD;
    if (login && password) {
        if (!store.findByLogin(login)) await store.createUser('admin', env.TEACHER_NAME?.trim() || 'Учитель', validateLogin(login), validatePassword(password), { orgId: MAIN_ORG_ID, consented: true });
        return;
    }
    if (store.hasAdmin()) return;
    const generated = crypto.randomBytes(9).toString('base64url');
    await store.createUser('admin', 'Учитель', 'teacher', generated, { orgId: MAIN_ORG_ID, consented: true });
    console.warn(`[accounts] Создан администратор: логин "teacher", пароль "${generated}". Смените его в кабинете или задайте TEACHER_LOGIN и TEACHER_PASSWORD.`);
}

/** Заголовок, которым админ выбирает организацию, с которой работает (`*` - со всеми сразу). */
export const ORG_HEADER = 'x-pioneer-org';

const INVITE_REASONS: Record<Exclude<InviteState, 'ok'>, string> = {
    expired: 'Срок действия ссылки закончился. Попросите у учителя новую.',
    revoked: 'Ссылка отозвана. Попросите у учителя новую.',
    'used-up': 'Ссылкой уже воспользовалось нужное число человек. Попросите у учителя новую.'
};

export function registerAccountRoutes(app: express.Express, store: AccountStore, attempts?: AttemptLog, metrics?: MetricsLog, captcha: CaptchaIssuer = new CaptchaIssuer()): void {
    // Каждый запрос живого входа продлевает и сессию на сервере, и cookie в браузере: два часа отсчитываются от последнего действия.
    app.use(['/api/auth', '/api/progress', '/api/teacher', '/api/learning', '/api/org', '/api/admin'], (req, res, next) => {
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
    /** Учитель или админ. Учитель заблокированной организации не работает, админ работает всегда. */
    const requireStaff = (req: express.Request): User => {
        const user = requireUser(req);
        if (!isStaff(user)) throw new AccountError(403, 'Доступно только учителю.');
        if (!hasConsent(user)) throw new AccountError(403, 'Сначала нужно принять политику обработки данных и условия использования.');
        if (user.role !== 'admin' && store.orgOf(user).blocked) throw new AccountError(403, 'Организация заблокирована администратором.');
        return user;
    };
    const requireAdmin = (req: express.Request): User => {
        const user = requireUser(req);
        if (user.role !== 'admin') throw new AccountError(403, 'Доступно только администратору.');
        return user;
    };
    /**
     * Чьих учеников видит и меняет этот запрос. Учитель - только свою организацию; админ - ту, что выбрал заголовком
     * (по умолчанию свою), а `*` означает все организации (null).
     */
    const scopeOf = (req: express.Request, actor: User): string | null => {
        if (actor.role !== 'admin') return actor.orgId;
        const wanted = req.headers[ORG_HEADER];
        if (wanted === '*') return null;
        return typeof wanted === 'string' && store.findOrg(wanted) ? wanted : actor.orgId;
    };
    /** Куда класть новое (классы, ученики): выбранная организация, а при «всех» - своя. */
    const writeOrgOf = (req: express.Request, actor: User): string => scopeOf(req, actor) ?? actor.orgId;
    const canManage = (actor: User, student: User): boolean => actor.role === 'admin' || student.orgId === actor.orgId;
    const studentFromParams = (req: express.Request, actor: User): User => {
        const student = store.findById(String(req.params.id));
        // Чужой ученик выглядит как несуществующий: по ответу нельзя узнать, есть ли такой в другой организации.
        if (!student || student.role !== 'student' || !canManage(actor, student)) throw new AccountError(404, 'Ученик не найден.');
        return student;
    };
    const classFromParams = (req: express.Request, actor: User) => {
        const group = store.findClass(String(req.params.id));
        if (!group || (actor.role !== 'admin' && group.orgId !== actor.orgId)) throw new AccountError(404, 'Класс не найден.');
        return group;
    };
    /** Класс из тела запроса: должен существовать и быть из той же организации, что и ученики. */
    const classForOrg = (classId: unknown, orgId: string): string | null => {
        if (!classId) return null;
        const group = store.findClass(classId);
        if (!group || group.orgId !== orgId) throw new AccountError(400, 'Такого класса нет.');
        return group.id;
    };
    const managesTeam = (actor: User, org: Organization): boolean => actor.role === 'admin' || org.ownerId === actor.id;
    const orgForRequest = (req: express.Request, actor: User): Organization => {
        const scope = scopeOf(req, actor);
        return (scope ? store.findOrg(scope) : undefined) ?? store.orgOf(actor);
    };
    const usableInvite = (token: unknown, kind?: Invite['kind']): Invite => {
        const invite = store.findInviteByToken(token);
        if (!invite) throw new AccountError(404, 'Ссылка не найдена. Проверьте, что она скопирована целиком.');
        const state = store.inviteState(invite);
        if (state !== 'ok') throw new AccountError(410, INVITE_REASONS[state]);
        if (kind && invite.kind !== kind) throw new AccountError(400, invite.kind === 'teacher' ? 'Эта ссылка для учителей.' : 'Эта ссылка для учеников.');
        if (store.findOrg(invite.orgId)?.blocked) throw new AccountError(403, 'Организация закрыта администратором.');
        return invite;
    };
    const userJson = (req: express.Request, user: User) => sessionUser(store, user, viewerOf(req));
    /** Две отдельные отметки: согласие на обработку данных и принятие условий. Учитель ещё подтверждает права на данные учеников. */
    const requireConsents = (body: Record<string, unknown>, staff: boolean): void => {
        if (body.consentPd !== true || body.acceptTerms !== true) throw new AccountError(400, 'Нужно отметить согласие на обработку данных и принятие условий использования: это две отдельные отметки.');
        if (staff && body.confirmConsents !== true) throw new AccountError(400, 'Подтвердите, что у вас есть согласие учеников или их родителей на ввод данных в сервис.');
    };
    /** Без согласия на нынешнюю политику сервис ничего не записывает про человека. */
    const requireConsented = (user: User): void => {
        if (!hasConsent(user)) throw new AccountError(403, 'Сначала нужно принять политику обработки данных и условия использования.');
    };

    // ---- вход, регистрация ----
    app.get('/api/auth/captcha', authLimiter, wrap((_req, res) => {
        res.json(captcha.create());
    }));

    // Что за ссылка: страница показывает «Вас приглашает: Школа 5» до того, как человек что-то ввёл.
    app.get('/api/invites/:token', authLimiter, wrap((req, res) => {
        const invite = store.findInviteByToken(req.params.token);
        if (!invite) throw new AccountError(404, 'Ссылка не найдена. Проверьте, что она скопирована целиком.');
        const state = store.inviteState(invite);
        res.json({ kind: invite.kind, orgName: store.findOrg(invite.orgId)?.name ?? '', state, message: state === 'ok' ? '' : INVITE_REASONS[state] });
    }));

    app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
        const body = req.body ?? {};
        // Достаточно ника: настоящие фамилию и имя сервис не требует, имя видит только учитель организации.
        const fullName = validateFullName(body.fullName, false);
        const login = validateLogin(body.login);
        if (String(body.loginRepeat ?? '') !== login) throw new AccountError(400, 'Логины не совпадают.');
        const password = validatePassword(body.password);
        if (String(body.passwordRepeat ?? '') !== password) throw new AccountError(400, 'Пароли не совпадают.');
        requireConsents(body, false);
        // Без ссылки ученик попадает в «Основную»; по ссылке организации - в неё.
        const invite = body.invite ? usableInvite(body.invite, 'student') : null;
        const user = await store.createUser('student', fullName, login, password, { orgId: invite?.orgId ?? MAIN_ORG_ID, consented: true });
        if (invite) await store.useInvite(invite);
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.status(201).json({ user: userJson(req, user) });
    }));

    // Учитель регистрируется сам: со ссылкой коллеги входит в его организацию, без неё создаёт свою (с проверкой «не бот»).
    app.post('/api/auth/register-teacher', authLimiter, wrap(async (req, res) => {
        const body = req.body ?? {};
        // Скрытое поле, которое человек не видит: бот заполняет всё подряд.
        if (typeof body.website === 'string' && body.website.trim()) throw new AccountError(400, 'Не удалось зарегистрироваться.');
        const fullName = validateFullName(body.fullName, false);
        const login = validateLogin(body.login);
        if (String(body.loginRepeat ?? '') !== login) throw new AccountError(400, 'Логины не совпадают.');
        const password = validatePassword(body.password);
        if (String(body.passwordRepeat ?? '') !== password) throw new AccountError(400, 'Пароли не совпадают.');
        requireConsents(body, true);
        let user: User;
        if (body.invite) {
            const invite = usableInvite(body.invite, 'teacher');
            user = await store.createUser('teacher', fullName, login, password, { orgId: invite.orgId, consented: true });
            await store.useInvite(invite);
        } else {
            const orgName = validateOrgName(body.orgName);
            if (!captcha.verify(body.captchaToken, body.captchaAnswer)) throw new AccountError(400, 'Неверный ответ на вопрос. Попробуйте ещё раз с новым вопросом.');
            user = (await store.createTeacherWithOrg(fullName, login, password, orgName, true)).user;
        }
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.status(201).json({ user: userJson(req, user) });
    }));

    // Ученик, у которого уже есть аккаунт, переходит в организацию по ссылке (по своей воле: страница спрашивает его).
    app.post('/api/auth/join', authLimiter, wrap(async (req, res) => {
        const user = requireUser(req);
        forbidInView(req);
        if (user.role !== 'student') throw new AccountError(400, 'Перейти по ссылке может только ученик.');
        const invite = usableInvite(req.body?.invite, 'student');
        if (invite.orgId === user.orgId) throw new AccountError(409, 'Вы уже в этой организации.');
        await store.moveStudentToOrg(user, invite.orgId);
        await store.useInvite(invite);
        res.json({ user: userJson(req, user) });
    }));

    app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
        const user = store.authenticate(String(req.body?.login ?? ''), String(req.body?.password ?? ''));
        if (!user) throw new AccountError(401, 'Неверный логин или пароль.');
        if (isStaff(user) && user.role !== 'admin' && store.orgOf(user).blocked) throw new AccountError(403, 'Организация заблокирована администратором.');
        setSessionCookie(req, res, await store.startSession(user), SESSION_TTL_MS);
        res.json({ user: userJson(req, user) });
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
        res.json({ user: userJson(req, user) });
    }));

    // Личный кабинет ученика: прогресс с датами, календарь активности, серия, последние проверки.
    app.get('/api/me/cabinet', wrap((req, res) => {
        const user = requireUser(req);
        const org = store.orgOf(user);
        res.json({ ...buildCabinet(store, user, attempts, parseTz(req.query.tz)), org: { id: org.id, name: org.name } });
    }));

    // История проверок с кодом: ученик видит только свои.
    app.get('/api/me/attempts', wrap((req, res) => {
        const user = requireUser(req);
        res.json({ attempts: attemptsForUser(attempts, user.id, req.query) });
    }));

    app.get('/api/auth/me', wrap((req, res) => {
        const user = currentUser(req);
        res.json({ user: user ? userJson(req, user) : null });
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
        requireConsented(user);
        await store.setCompletion(user, parseTrack(req.body?.track), parseQuestId(req.body?.questId), true, 'student');
        res.json({ progress: progressIds(user) });
    }));

    // Журнал попыток: ученик присылает результат каждой проверки, учитель видит, где ученики застревают.
    app.post('/api/learning/attempt', wrap(async (req, res) => {
        const user = requireUser(req);
        if (user.role === 'student' && !viewerOf(req)) requireConsented(user);
        if (user.role === 'student' && attempts && !viewerOf(req)) {
            await attempts.add(AttemptLog.sanitize({ userId: user.id, name: user.fullName, track: parseTrack(req.body?.track), questId: parseQuestId(req.body?.questId), body: req.body }));
        }
        res.json({ ok: true });
    }));

    // ---- кабинет учителя: везде только ученики своей организации (админ - выбранной) ----
    app.get('/api/teacher/attempts', wrap((req, res) => {
        const actor = requireStaff(req);
        const track = typeof req.query.track === 'string' && (TRACKS as readonly string[]).includes(req.query.track) ? req.query.track : undefined;
        // Можно ограничить сводку одним классом.
        const classId = typeof req.query.classId === 'string' && req.query.classId ? req.query.classId : undefined;
        const only = new Set(store.studentsOf(scopeOf(req, actor)).filter((student) => !classId || student.classId === classId).map((student) => student.id));
        res.json({ stats: attempts?.stats(track, only) ?? [] });
    }));

    app.get('/api/teacher/attempts/:questId', wrap((req, res) => {
        const actor = requireStaff(req);
        const track = parseTrack(req.query.track);
        const questId = parseQuestId(req.params.questId);
        const members = new Set(store.studentsOf(scopeOf(req, actor)).map((student) => student.id));
        const stuck = (attempts?.stuckStudents(track, questId, members) ?? []).filter((item) => {
            const student = store.findById(item.userId);
            return student && !student.progress[track][questId];   // уже засчитанные учителем не застряли
        });
        res.json({ failures: attempts?.recentFailures(track, questId, 25, members) ?? [], stuck });
    }));

    // Обзор класса: все ученики с прогрессом, последним входом и пометкой «застрял».
    app.get('/api/teacher/overview', wrap((req, res) => {
        const actor = requireStaff(req);
        res.json(buildOverview(store, attempts, parseTz(req.query.tz), scopeOf(req, actor)));
    }));

    app.post('/api/teacher/classes', wrap(async (req, res) => {
        const actor = requireStaff(req);
        res.status(201).json({ classGroup: await store.createClass(writeOrgOf(req, actor), validateClassName(req.body?.name)) });
    }));

    app.patch('/api/teacher/classes/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const group = classFromParams(req, actor);
        await store.renameClass(group, validateClassName(req.body?.name));
        res.json({ classGroup: group });
    }));

    app.delete('/api/teacher/classes/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        await store.deleteClass(classFromParams(req, actor));
        res.json({ ok: true });
    }));

    // Список учеников разом: по имени или нику в строке; логины и временные пароли придумывает сервер.
    app.post('/api/teacher/students/bulk', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const orgId = writeOrgOf(req, actor);
        const lines = String(req.body?.names ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) throw new AccountError(400, 'Впишите хотя бы одно имя или ник.');
        if (lines.length > 100) throw new AccountError(400, 'За один раз можно добавить до 100 учеников.');
        const classId = classForOrg(req.body?.classId, orgId);
        const created: { id: string; fullName: string; login: string; password: string }[] = [];
        const skipped: { line: string; reason: string }[] = [];
        for (const line of lines) {
            try {
                const fullName = validateFullName(line, false);
                const login = suggestLogin(fullName, (candidate) => Boolean(store.findByLogin(candidate)));
                const password = generatePassword();
                const user = await store.createUser('student', fullName, login, password, { orgId, classId, mustChangePassword: true });
                created.push({ id: user.id, fullName, login, password });
            } catch (error) {
                skipped.push({ line, reason: error instanceof AccountError ? error.message : 'Не удалось создать.' });
            }
        }
        res.status(201).json({ created, skipped });
    }));

    // Действие над несколькими учениками: перенос в класс или новые пароли.
    app.post('/api/teacher/students/batch', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const targets = ids.map((id) => store.findById(String(id))).filter((user): user is User => user?.role === 'student' && canManage(actor, user));
        if (!targets.length) throw new AccountError(400, 'Выберите хотя бы одного ученика.');
        if (req.body?.action === 'move') {
            const classId = req.body?.classId ? String(req.body.classId) : null;
            if (classId) {
                const group = store.findClass(classId);
                // Класс должен быть той же организации, что и все переносимые ученики.
                if (!group || targets.some((student) => student.orgId !== group.orgId)) throw new AccountError(400, 'Такого класса нет.');
            }
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
        const teacher = requireStaff(req);
        const student = studentFromParams(req, teacher);
        const teacherToken = readCookie(req, SESSION_COOKIE)!;
        const token = await store.startViewSession(student, teacher);
        setCookie(req, res, TEACHER_COOKIE, teacherToken, SESSION_TTL_MS);
        setSessionCookie(req, res, token, VIEW_TTL_MS);
        res.json({ user: sessionUser(store, student, teacher) });
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
        res.json({ user: sessionUser(store, teacher) });
    }));

    app.post('/api/teacher/students/:id/reset-password', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const student = studentFromParams(req, actor);
        const password = generatePassword();
        await store.updateUser(student, { password, temporaryPassword: true });
        res.json({ password, student: studentDetail(student) });
    }));

    app.get('/api/teacher/students/:id/attempts', wrap((req, res) => {
        const actor = requireStaff(req);
        res.json({ attempts: attemptsForUser(attempts, studentFromParams(req, actor).id, req.query) });
    }));

    app.get('/api/teacher/students/:id/activity', wrap((req, res) => {
        const actor = requireStaff(req);
        const student = studentFromParams(req, actor);
        res.json(buildCabinet(store, student, attempts, parseTz(req.query.tz)));
    }));

    // Анонимная метрика: принимает события без имён и кода, поэтому вход не нужен (гость тоже учится).
    // Организацию вошедшего ставит сервер по его входу, а не страница: подделать её нельзя.
    const metricsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Слишком много событий.' } });
    app.post('/api/metrics', metricsLimiter, wrap(async (req, res) => {
        const list: unknown[] = Array.isArray(req.body?.events) ? req.body.events.slice(0, 30) : [];
        const sid = req.body?.sid;
        const org = currentUser(req)?.orgId;
        const events = list.map((item) => sanitizeEvent({ ...(item as object), sid })).filter((event): event is NonNullable<typeof event> => event !== null)
            .map((event) => (org ? { ...event, org } : event));
        await metrics?.add(events);
        res.json({ ok: true, accepted: events.length });
    }));

    app.get('/api/teacher/metrics', wrap((req, res) => {
        const actor = requireStaff(req);
        const days = Math.min(Math.max(Math.round(Number(req.query.days)) || 30, 1), 365);
        res.json({ summary: metrics?.summary(days, Date.now(), scopeOf(req, actor)) ?? null });
    }));

    app.get('/api/teacher/students', wrap((req, res) => {
        const actor = requireStaff(req);
        res.json({ students: store.studentsOf(scopeOf(req, actor)).map(studentSummary).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')) });
    }));

    app.post('/api/teacher/students', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const body = req.body ?? {};
        const orgId = writeOrgOf(req, actor);
        const user = await store.createUser('student', validateFullName(body.fullName, false), validateLogin(body.login), validatePassword(body.password), { orgId, classId: classForOrg(body.classId, orgId) });
        res.status(201).json({ student: studentDetail(user) });
    }));

    app.get('/api/teacher/students/:id', wrap((req, res) => {
        const actor = requireStaff(req);
        res.json({ student: studentDetail(studentFromParams(req, actor)) });
    }));

    app.patch('/api/teacher/students/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const student = studentFromParams(req, actor);
        const { fullName, login, password, classId, note } = req.body ?? {};
        if (classId) classForOrg(classId, student.orgId);
        await store.updateUser(student, { fullName, login, password, classId, note, temporaryPassword: false });
        res.json({ student: studentDetail(student) });
    }));

    app.delete('/api/teacher/students/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const student = studentFromParams(req, actor);
        await store.deleteUser(student);
        await attempts?.removeUser(student.id);
        res.json({ ok: true });
    }));

    // Согласие тех, кто зарегистрировался до появления политики (или чей аккаунт создал учитель): принимается при входе.
    app.post('/api/auth/consent', authLimiter, wrap(async (req, res) => {
        const user = requireUser(req);
        forbidInView(req);
        requireConsents(req.body ?? {}, isStaff(user));
        await store.acceptConsent(user);
        res.json({ user: userJson(req, user) });
    }));

    // Ученик удаляет свой аккаунт сам. Случайно это не сделать: нужны логин (набирается вручную) и пароль, а в режиме просмотра
    // учителя удаление закрыто. Вместе с аккаунтом стираются прогресс, достижения и вся история проверок с кодом.
    app.post('/api/auth/delete-account', authLimiter, wrap(async (req, res) => {
        const user = requireUser(req);
        forbidInView(req);
        if (user.role !== 'student') throw new AccountError(400, 'Аккаунт учителя удаляет администратор: напишите ему.');
        if (String(req.body?.confirm ?? '').trim() !== user.login) throw new AccountError(400, 'Чтобы подтвердить удаление, введите свой логин точно так, как он записан.');
        if (!checkPassword(user, String(req.body?.password ?? ''))) throw new AccountError(403, 'Пароль неверный. Аккаунт не удалён.');
        await store.deleteUser(user);
        await attempts?.removeUser(user.id);
        setSessionCookie(req, res, '', 0);
        setCookie(req, res, TEACHER_COOKIE, '', 0);
        res.json({ ok: true });
    }));

    app.put('/api/teacher/students/:id/progress', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const student = studentFromParams(req, actor);
        await store.setCompletion(student, parseTrack(req.body?.track), parseQuestId(req.body?.questId), Boolean(req.body?.done), 'teacher', req.body?.note);
        res.json({ student: studentDetail(student) });
    }));

    // ---- организация: команда, ссылки ----
    const inviteJson = (invite: Invite) => ({
        id: invite.id, token: invite.token, kind: invite.kind, createdAt: invite.createdAt, expiresAt: invite.expiresAt,
        maxUses: invite.maxUses, uses: invite.uses, state: store.inviteState(invite), createdBy: store.findById(invite.createdBy)?.fullName ?? ''
    });
    const orgJson = (org: Organization, actor: User) => ({
        org: {
            id: org.id, name: org.name, isMain: org.id === MAIN_ORG_ID, blocked: org.blocked === true, createdAt: org.createdAt,
            ownerId: org.ownerId, canManageTeam: managesTeam(actor, org)
        },
        teachers: store.staffOf(org.id).map((user) => ({ id: user.id, fullName: user.fullName, login: user.login, role: user.role, isOwner: org.ownerId === user.id, lastActiveAt: user.lastActiveAt ?? null })),
        invites: store.invitesOf(org.id).filter((invite) => invite.kind === 'student' || managesTeam(actor, org)).sort((a, b) => b.createdAt - a.createdAt).map(inviteJson),
        counts: { students: store.studentsOf(org.id).length, teachers: store.staffOf(org.id).length }
    });

    app.get('/api/org', wrap((req, res) => {
        const actor = requireStaff(req);
        res.json(orgJson(orgForRequest(req, actor), actor));
    }));

    app.patch('/api/org', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const org = orgForRequest(req, actor);
        if (!managesTeam(actor, org)) throw new AccountError(403, 'Название меняет только владелец организации.');
        await store.renameOrg(org, validateOrgName(req.body?.name));
        res.json(orgJson(org, actor));
    }));

    app.post('/api/org/invites', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const org = orgForRequest(req, actor);
        const kind = req.body?.kind === 'teacher' ? 'teacher' : 'student';
        if (kind === 'teacher' && !managesTeam(actor, org)) throw new AccountError(403, 'Приглашать коллег может только владелец организации.');
        const days = req.body?.days === undefined ? undefined : Number(req.body.days);
        const maxUses = req.body?.maxUses === undefined || req.body.maxUses === null || req.body.maxUses === '' ? null : Number(req.body.maxUses);
        if ((days !== undefined && !Number.isFinite(days)) || (maxUses !== null && !Number.isFinite(maxUses))) throw new AccountError(400, 'Срок и число использований должны быть числами.');
        const invite = await store.createInvite(org, kind, actor, { days, maxUses });
        res.status(201).json({ invite: inviteJson(invite) });
    }));

    app.delete('/api/org/invites/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const invite = store.findInvite(req.params.id);
        const org = invite ? store.findOrg(invite.orgId) : undefined;
        if (!invite || !org || (actor.role !== 'admin' && org.id !== actor.orgId)) throw new AccountError(404, 'Ссылка не найдена.');
        if (invite.kind === 'teacher' && !managesTeam(actor, org)) throw new AccountError(403, 'Ссылку для коллег отзывает только владелец организации.');
        await store.revokeInvite(invite);
        res.json({ ok: true });
    }));

    // Владелец убирает коллегу из команды: аккаунт остаётся, у учителя появляется своя организация, учеников нет.
    app.delete('/api/org/teachers/:id', wrap(async (req, res) => {
        const actor = requireStaff(req);
        const org = orgForRequest(req, actor);
        if (!managesTeam(actor, org)) throw new AccountError(403, 'Команду меняет только владелец организации.');
        const teacher = store.findById(String(req.params.id));
        if (!teacher || teacher.role !== 'teacher' || teacher.orgId !== org.id) throw new AccountError(404, 'Учитель не найден.');
        if (org.ownerId === teacher.id) throw new AccountError(400, 'Владельца из организации убрать нельзя.');
        await store.spinOffTeacher(teacher);
        res.json({ ok: true });
    }));

    // ---- администратор: все организации ----
    app.get('/api/admin/orgs', wrap((req, res) => {
        requireAdmin(req);
        res.json({
            orgs: store.orgs.map((org) => {
                const staff = store.staffOf(org.id);
                const students = store.studentsOf(org.id);
                const last = [...staff, ...students].reduce((max, user) => Math.max(max, user.lastActiveAt ?? 0), 0);
                return {
                    id: org.id, name: org.name, isMain: org.id === MAIN_ORG_ID, blocked: org.blocked === true, createdAt: org.createdAt,
                    ownerName: store.findById(org.ownerId)?.fullName ?? '', teachers: staff.length, students: students.length, lastActiveAt: last || null
                };
            }).sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name, 'ru'))
        });
    }));

    const orgFromParams = (req: express.Request): Organization => {
        const org = store.findOrg(String(req.params.id));
        if (!org) throw new AccountError(404, 'Организация не найдена.');
        return org;
    };

    app.patch('/api/admin/orgs/:id', wrap(async (req, res) => {
        requireAdmin(req);
        const org = orgFromParams(req);
        if (req.body?.name !== undefined) await store.renameOrg(org, validateOrgName(req.body.name));
        if (req.body?.blocked !== undefined) {
            if (org.id === MAIN_ORG_ID) throw new AccountError(400, 'Основную организацию заблокировать нельзя.');
            await store.setOrgBlocked(org, Boolean(req.body.blocked));
        }
        res.json({ ok: true });
    }));

    app.delete('/api/admin/orgs/:id', wrap(async (req, res) => {
        requireAdmin(req);
        res.json(await store.deleteOrg(orgFromParams(req)));
    }));

    // Забытый пароль учителя: почты нет, поэтому новый временный пароль выдаёт админ.
    app.post('/api/admin/teachers/:id/reset-password', wrap(async (req, res) => {
        requireAdmin(req);
        const teacher = store.findById(String(req.params.id));
        if (!teacher || teacher.role !== 'teacher') throw new AccountError(404, 'Учитель не найден.');
        const password = generatePassword();
        await store.updateUser(teacher, { password, temporaryPassword: true });
        res.json({ password, login: teacher.login, fullName: teacher.fullName });
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
