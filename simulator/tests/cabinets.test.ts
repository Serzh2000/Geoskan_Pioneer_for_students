/** Кабинеты: миграция файла аккаунтов, классы, списки учеников, обзор, личный кабинет и анонимная метрика. */
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { AccountStore, DATA_VERSION, ensureTeacher, registerAccountRoutes } from '../server/accounts.js';
import { AttemptLog } from '../server/attempts.js';
import { MetricsLog, sanitizeEvent } from '../server/metrics.js';
import { activityByDay, dayKey, generatePassword, parseTz, streaks, suggestLogin } from '../server/cabinet.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-cab-'));
const DAY = 24 * 60 * 60 * 1000;

async function makeApp(dir = tmp()) {
    const accountsFile = path.join(dir, 'accounts.json');
    const store = new AccountStore(accountsFile);
    await ensureTeacher(store, { TEACHER_LOGIN: 'teacher', TEACHER_PASSWORD: 'teacher-pass' } as NodeJS.ProcessEnv);
    const attempts = new AttemptLog(path.join(dir, 'attempts.jsonl'));
    const metrics = new MetricsLog(path.join(dir, 'metrics.jsonl'));
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store, attempts, metrics);
    const teacher = request.agent(app);
    await teacher.post('/api/auth/login').send({ login: 'teacher', password: 'teacher-pass' });
    return { app, store, attempts, metrics, teacher, dir };
}

async function register(app: express.Express, login: string, fullName = 'Иванов Иван') {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({ fullName, login, loginRepeat: login, password: 'secret1', passwordRepeat: 'secret1' });
    return { agent, id: res.body.user.id as string };
}

describe('миграция файла аккаунтов', () => {
    // Так выглядит файл на проде до появления классов: без version, без classes, без lastActiveAt.
    const legacy = () => ({
        users: [
            { id: 'u1', role: 'teacher', fullName: 'Учитель', login: 'teacher', salt: 'aa', hash: 'bb', createdAt: 1000, progress: { blocks: {}, lua: {}, python: {} } },
            { id: 'u2', role: 'student', fullName: 'Иванов Иван', login: 'ivanov', salt: 'cc', hash: 'dd', createdAt: 2000, extraField: 'keep',
              progress: { blocks: { 'bk-takeoff-land': { at: 3000, by: 'student' } }, lua: { 'academy-001': { at: 4000, by: 'teacher' } } } },
            { id: 'u3', role: 'student', fullName: 'Без прогресса', login: 'bare', salt: 'ee', hash: 'ff', createdAt: 5000 },
            'мусор',
            { login: 'без-id' }
        ],
        sessions: [{ tokenHash: 'x', userId: 'u2', expiresAt: Date.now() + 1000 }]
    });

    test('старый файл читается: аккаунты и прогресс целы, новые поля дописаны, мусор отброшен', () => {
        const dir = tmp();
        const file = path.join(dir, 'accounts.json');
        fs.writeFileSync(file, JSON.stringify(legacy()));
        const store = new AccountStore(file);
        const ivanov = store.findByLogin('ivanov')!;
        expect(ivanov.progress.blocks['bk-takeoff-land']).toEqual({ at: 3000, by: 'student' });
        expect(ivanov.progress.lua['academy-001'].by).toBe('teacher');
        expect(ivanov.progress.python).toEqual({});
        // Новые треки Мини 2 у старых аккаунтов пустые: данные не теряются и не выдумываются.
        expect(ivanov.progress.sdk2).toEqual({});
        expect(ivanov.progress.bricks).toEqual({});
        expect((ivanov as any).extraField).toBe('keep');
        expect(ivanov.classId).toBeNull();
        expect(store.findByLogin('bare')!.progress).toEqual({ blocks: {}, lua: {}, python: {}, sdk2: {}, bricks: {} });
        expect(store.list('student')).toHaveLength(2);
        expect(store.classes).toEqual([]);
    });

    test('копия исходного файла сохраняется один раз, потом файл пишется новой версии', async () => {
        const dir = tmp();
        const file = path.join(dir, 'accounts.json');
        const original = JSON.stringify(legacy());
        fs.writeFileSync(file, original);
        const store = new AccountStore(file);
        expect(fs.readFileSync(`${file}.v1.bak`, 'utf8')).toBe(original);
        await store.createClass('8А');
        const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
        expect(saved.version).toBe(DATA_VERSION);
        expect(saved.classes).toHaveLength(1);
        expect(saved.users.find((user: any) => user.login === 'ivanov').extraField).toBe('keep');
        // Повторный запуск не затирает копию уже новым файлом.
        new AccountStore(file);
        expect(fs.readFileSync(`${file}.v1.bak`, 'utf8')).toBe(original);
    });

    test('ученик из старого файла входит со своим паролем', async () => {
        const dir = tmp();
        const first = await makeApp(dir);
        await register(first.app, 'old-pupil');
        await first.store.createClass('7Б');
        // Имитируем файл прошлой версии: убираем новые поля.
        const file = path.join(dir, 'accounts.json');
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        delete raw.version; delete raw.classes;
        raw.users.forEach((user: any) => { delete user.classId; delete user.lastActiveAt; });
        fs.writeFileSync(file, JSON.stringify(raw));
        const second = await makeApp(dir);
        const res = await request(second.app).post('/api/auth/login').send({ login: 'old-pupil', password: 'secret1' });
        expect(res.status).toBe(200);
    });
});

describe('классы и ученики списком', () => {
    test('класс создаётся, переименовывается, удаляется; ученики остаются без класса', async () => {
        const { app, teacher } = await makeApp();
        const created = await teacher.post('/api/teacher/classes').send({ name: '8А' });
        expect(created.status).toBe(201);
        const id = created.body.classGroup.id;
        expect((await teacher.post('/api/teacher/classes').send({ name: '8а' })).status).toBe(409);
        expect((await teacher.post('/api/teacher/classes').send({ name: '' })).status).toBe(400);
        await teacher.patch(`/api/teacher/classes/${id}`).send({ name: '8Б' });
        const student = await teacher.post('/api/teacher/students').send({ fullName: 'Петров Пётр', login: 'petrov', password: 'start123', classId: id });
        expect(student.body.student.classId).toBe(id);
        expect((await teacher.post('/api/teacher/students').send({ fullName: 'Сидоров Сидор', login: 'sidorov', password: 'start123', classId: 'нет' })).status).toBe(400);
        await teacher.delete(`/api/teacher/classes/${id}`);
        const list = await teacher.get('/api/teacher/students');
        expect(list.body.students[0].classId).toBeNull();
        expect((await request(app).get('/api/teacher/overview')).status).toBe(401);
    });

    test('список ФИО: логины и временные пароли придумывает сервер, дубли и пустое пропускаются', async () => {
        const { app, teacher } = await makeApp();
        const classId = (await teacher.post('/api/teacher/classes').send({ name: '9А' })).body.classGroup.id;
        const res = await teacher.post('/api/teacher/students/bulk').send({ names: 'Иванов Иван\nИванов Иван\n\nЩукин Юрий Петрович\nА', classId });
        expect(res.status).toBe(201);
        expect(res.body.created.map((item: any) => item.login)).toEqual(['ivanov.ivan', 'ivanov.ivan2', 'shchukin.yuriy']);
        expect(res.body.skipped).toHaveLength(1);
        const { login, password } = res.body.created[0];
        const entered = request.agent(app);
        const loginRes = await entered.post('/api/auth/login').send({ login, password });
        expect(loginRes.body.user.mustChangePassword).toBe(true);
        // После смены пароля напоминание пропадает.
        const next = await entered.post('/api/auth/password').send({ current: password, password: 'brand-new1', passwordRepeat: 'brand-new1' });
        expect(next.status).toBe(200);
        expect((await entered.get('/api/auth/me')).body.user.mustChangePassword).toBe(false);
        expect((await teacher.post('/api/teacher/students/bulk').send({ names: '   ' })).status).toBe(400);
    });

    test('массово: перенос в класс и новые пароли', async () => {
        const { app, teacher } = await makeApp();
        const a = (await register(app, 'aaa')).id;
        const b = (await register(app, 'bbb', 'Петров Пётр')).id;
        const classId = (await teacher.post('/api/teacher/classes').send({ name: '10' })).body.classGroup.id;
        const moved = await teacher.post('/api/teacher/students/batch').send({ ids: [a, b], action: 'move', classId });
        expect(moved.body.moved).toBe(2);
        const reset = await teacher.post('/api/teacher/students/batch').send({ ids: [a], action: 'reset' });
        const { password } = reset.body.passwords[0];
        expect((await request(app).post('/api/auth/login').send({ login: 'aaa', password })).status).toBe(200);
        expect((await request(app).post('/api/auth/login').send({ login: 'aaa', password: 'secret1' })).status).toBe(401);
        expect((await teacher.post('/api/teacher/students/batch').send({ ids: [], action: 'move' })).status).toBe(400);
        const one = await teacher.post(`/api/teacher/students/${b}/reset-password`).send({});
        expect(one.body.password).toHaveLength(8);
    });
});

describe('обзор класса и личный кабинет', () => {
    const fail = (userId: string, questId: string, at: number) => ({ at, userId, name: 'Иванов Иван', track: 'lua', questId, solved: false, titles: ['Нужен цикл'], code: 'print(1)' });

    test('застрявший виден в обзоре, пока миссия не засчитана; последний вход обновляется', async () => {
        const { app, teacher, attempts } = await makeApp();
        const { id } = await register(app, 'ivanov');
        const now = Date.now();
        for (let i = 0; i < 3; i++) await attempts.add(fail(id, 'academy-005', now - (3 - i) * 1000));
        let overview = (await teacher.get('/api/teacher/overview')).body;
        const row = overview.students[0];
        expect(row.stuck).toMatchObject({ track: 'lua', questId: 'academy-005', fails: 3 });
        expect(row.attemptsTotal).toBe(3);
        expect(row.lastActiveAt).toBeGreaterThan(now - 5000);
        expect(Object.values(overview.activity)[0]).toBe(1);

        await teacher.put(`/api/teacher/students/${id}/progress`).send({ track: 'lua', questId: 'academy-005', done: true, note: 'Хорошо объяснил устно' });
        overview = (await teacher.get('/api/teacher/overview')).body;
        expect(overview.students[0].stuck).toBeNull();
        const failures = await teacher.get('/api/teacher/attempts/academy-005?track=lua');
        expect(failures.body.stuck).toEqual([]);
    });

    test('кабинет ученика: прогресс с комментарием учителя, серия дней, история с кодом только своя', async () => {
        const { app, teacher, attempts } = await makeApp();
        const ivanov = await register(app, 'ivanov');
        const petrov = await register(app, 'petrov', 'Петров Пётр');
        const now = Date.now();
        await attempts.add({ ...fail(ivanov.id, 'academy-001', now - 2 * DAY), solved: true });
        await attempts.add({ ...fail(ivanov.id, 'academy-002', now - DAY), solved: true });
        await attempts.add({ ...fail(ivanov.id, 'academy-003', now), solved: false });
        await attempts.add(fail(petrov.id, 'academy-003', now));
        await teacher.put(`/api/teacher/students/${ivanov.id}/progress`).send({ track: 'lua', questId: 'academy-003', done: true, note: 'Зачёт после беседы' });

        const cabinet = (await ivanov.agent.get('/api/me/cabinet?tz=0')).body;
        expect(cabinet.progress.lua['academy-003']).toMatchObject({ by: 'teacher', note: 'Зачёт после беседы' });
        expect(cabinet.activity.current).toBe(3);
        expect(cabinet.stats).toMatchObject({ attempts: 3, solvedChecks: 2, firstTrySolved: 2 });
        expect(cabinet.recent[0].code).toBeUndefined();

        const history = (await ivanov.agent.get('/api/me/attempts?track=lua&questId=academy-003')).body.attempts;
        expect(history).toHaveLength(1);
        expect(history[0].code).toBe('print(1)');
        expect((await request(app).get('/api/me/cabinet')).status).toBe(401);
        // Учитель видит ту же историю ученика, ученик — не чужую.
        expect((await teacher.get(`/api/teacher/students/${ivanov.id}/attempts`)).body.attempts).toHaveLength(3);
        expect((await ivanov.agent.get(`/api/teacher/students/${petrov.id}/attempts`)).status).toBe(403);
    });

    test('ученик меняет своё имя, но не логин', async () => {
        const { app } = await makeApp();
        const { agent } = await register(app, 'ivanov');
        const res = await agent.patch('/api/auth/profile').send({ fullName: 'Иванов Иван Иванович', login: 'hacker' });
        expect(res.body.user).toMatchObject({ fullName: 'Иванов Иван Иванович', login: 'ivanov' });
    });

    test('комментарий к зачёту можно изменить и убрать', async () => {
        const { app, teacher, store } = await makeApp();
        const { id } = await register(app, 'ivanov');
        const put = (body: object) => teacher.put(`/api/teacher/students/${id}/progress`).send({ track: 'python', questId: 'academy-080', done: true, ...body });
        expect((await put({ note: 'раз' })).body.student.progress.python['academy-080'].note).toBe('раз');
        expect((await put({ note: '' })).body.student.progress.python['academy-080'].note).toBeUndefined();
        expect(store.findById(id)!.progress.python['academy-080'].by).toBe('teacher');
    });
});

describe('анонимная метрика', () => {
    test('в событие попадают только разрешённые поля', () => {
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'quest_open', track: 'lua', questId: 'academy-001', value: 12.4, fullName: 'Иванов', code: 'x' }, 5))
            .toEqual({ at: 5, sid: 'abcdef12', name: 'quest_open', track: 'lua', questId: 'academy-001', value: 12 });
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'quest_open', track: 'sdk2', questId: 'sdk2-connect' })?.track).toBe('sdk2');
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'quest_open', track: 'bricks', questId: 'bricks-hover' })?.track).toBe('bricks');
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'quest_open', track: 'mini3', questId: 'x' })?.track).toBeUndefined();
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'hack' })).toBeNull();
        expect(sanitizeEvent({ sid: 'bad sid!', name: 'quest_open' })).toBeNull();
        expect(sanitizeEvent({ sid: 'abcdef12', name: 'feature_use', detail: 'Иванов Иван' })?.detail).toBeUndefined();
    });

    test('гость отправляет события, учитель видит сводку по миссиям', async () => {
        const { app, teacher } = await makeApp();
        const sid = 'tab-abcdef01';
        const post = (events: object[]) => request(app).post('/api/metrics').send({ sid, events });
        const res = await post([
            { name: 'session_start', detail: 'guest' },
            { name: 'quest_open', track: 'lua', questId: 'academy-001' },
            { name: 'hint_open', track: 'lua', questId: 'academy-001' },
            { name: 'quest_done', track: 'lua', questId: 'academy-001', value: 100 },
            { name: 'quest_open', track: 'lua', questId: 'academy-002' },
            { name: 'quest_leave', track: 'lua', questId: 'academy-002', value: 40 },
            { name: 'nonsense' }
        ]);
        expect(res.body.accepted).toBe(6);
        const summary = (await teacher.get('/api/teacher/metrics?days=7')).body.summary;
        expect(summary.sessions).toBe(1);
        expect(summary.roles.guest).toBe(1);
        const first = summary.quests.find((item: any) => item.questId === 'academy-001');
        expect(first).toMatchObject({ opens: 1, hints: 1, done: 1, medianDoneSeconds: 100 });
        expect(summary.quests.find((item: any) => item.questId === 'academy-002')).toMatchObject({ leaves: 1, medianLeaveSeconds: 40 });
        expect((await request(app).get('/api/teacher/metrics')).status).toBe(401);
    });
});

describe('вычисления кабинета', () => {
    test('календарь и серии дней считаются по часовому поясу', () => {
        const at = Date.parse('2026-03-01T22:30:00Z');
        expect(dayKey(at, -180)).toBe('2026-03-02');   // Москва, уже следующий день
        expect(dayKey(at, 0)).toBe('2026-03-01');
        expect(activityByDay([at, at + 1000], 0)).toEqual({ '2026-03-01': 2 });
        expect(parseTz('-180')).toBe(-180);
        expect(parseTz('9999')).toBe(0);
        expect(parseTz('abc')).toBe(0);
    });

    test('серия не рвётся, пока не прошёл сегодняшний день', () => {
        expect(streaks(['2026-03-01', '2026-03-02', '2026-03-03'], '2026-03-03')).toEqual({ current: 3, best: 3 });
        expect(streaks(['2026-03-01', '2026-03-02'], '2026-03-03')).toEqual({ current: 2, best: 2 });
        expect(streaks(['2026-03-01', '2026-03-02'], '2026-03-05')).toEqual({ current: 0, best: 2 });
        expect(streaks(['2026-03-01', '2026-03-03', '2026-03-04'], '2026-03-04')).toEqual({ current: 2, best: 2 });
        expect(streaks([], '2026-03-04')).toEqual({ current: 0, best: 0 });
    });

    test('логины и пароли для списка', () => {
        const taken = new Set(['ivanov.ivan']);
        expect(suggestLogin('Иванов Иван Петрович', (login) => taken.has(login))).toBe('ivanov.ivan2');
        expect(suggestLogin('Ёлкин Ъ', () => false)).toBe('elkin');
        expect(suggestLogin('Ян', () => false)).toMatch(/^[a-z0-9.]{3,}$/);
        expect(generatePassword()).toMatch(/^[a-zA-Z2-9]{8}$/);
        expect(generatePassword()).not.toMatch(/[0O1lI]/);
    });
});
