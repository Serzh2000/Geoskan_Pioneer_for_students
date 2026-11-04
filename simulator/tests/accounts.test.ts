/** Аккаунты: регистрация ученика, вход, прогресс и кабинет учителя. */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { AccountStore, ensureTeacher, registerAccountRoutes } from '../server/accounts.js';

async function makeApp() {
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'teacher', TEACHER_PASSWORD: 'teacher-pass' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store);
    return { app, store };
}

const student = { fullName: 'Иванов Иван', login: 'ivanov', loginRepeat: 'ivanov', password: 'secret1', passwordRepeat: 'secret1' };

async function login(app: express.Express, who: string, password: string) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ login: who, password });
    return { agent, res };
}

describe('регистрация ученика', () => {
    test('успешная регистрация сразу входит в аккаунт', async () => {
        const { app } = await makeApp();
        const agent = request.agent(app);
        const res = await agent.post('/api/auth/register').send(student);
        expect(res.status).toBe(201);
        expect(res.body.user).toMatchObject({ role: 'student', fullName: 'Иванов Иван', login: 'ivanov' });
        expect(JSON.stringify(res.body)).not.toMatch(/hash|salt|secret1/);
        const me = await agent.get('/api/auth/me');
        expect(me.body.user.login).toBe('ivanov');
    });

    test.each([
        ['логины не совпадают', { loginRepeat: 'ivanof' }],
        ['пароли не совпадают', { passwordRepeat: 'secret2' }],
        ['короткий пароль', { password: '123', passwordRepeat: '123' }],
        ['плохой логин', { login: 'и в', loginRepeat: 'и в' }],
        ['ФИО из одного слова', { fullName: 'Иванов' }]
    ])('%s: отказ 400', async (_name, patch) => {
        const { app } = await makeApp();
        const res = await request(app).post('/api/auth/register').send({ ...student, ...patch });
        expect(res.status).toBe(400);
        expect(res.body.error).toBeTruthy();
    });

    test('занятый логин (без учёта регистра) — 409', async () => {
        const { app } = await makeApp();
        await request(app).post('/api/auth/register').send(student);
        const res = await request(app).post('/api/auth/register').send({ ...student, login: 'IVANOV', loginRepeat: 'IVANOV' });
        expect(res.status).toBe(409);
    });

    test('вход: неверный пароль — 401, верный — сессия; выход закрывает сессию', async () => {
        const { app } = await makeApp();
        await request(app).post('/api/auth/register').send(student);
        expect((await login(app, 'ivanov', 'wrong')).res.status).toBe(401);
        const { agent, res } = await login(app, 'Ivanov', 'secret1');
        expect(res.status).toBe(200);
        await agent.post('/api/auth/logout');
        expect((await agent.get('/api/auth/me')).body.user).toBeNull();
    });
});

describe('прогресс и кабинет учителя', () => {
    test('ученик не видит кабинет учителя, гость не видит прогресс', async () => {
        const { app } = await makeApp();
        expect((await request(app).get('/api/progress')).status).toBe(401);
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);
        expect((await agent.get('/api/teacher/students')).status).toBe(403);
    });

    test('ученик отмечает пройденное, учитель видит, засчитывает и снимает вручную', async () => {
        const { app } = await makeApp();
        const pupil = request.agent(app);
        await pupil.post('/api/auth/register').send(student);
        const done = await pupil.post('/api/progress/complete').send({ track: 'lua', questId: 'academy-001' });
        expect(done.body.progress.lua).toEqual(['academy-001']);
        expect((await pupil.post('/api/progress/complete').send({ track: 'java', questId: 'x' })).status).toBe(400);
        expect((await pupil.post('/api/progress/complete').send({ track: 'lua', questId: '../x' })).status).toBe(400);

        const { agent: teacher } = await login(app, 'teacher', 'teacher-pass');
        const list = await teacher.get('/api/teacher/students');
        expect(list.body.students).toHaveLength(1);
        const id = list.body.students[0].id;
        expect(list.body.students[0].counts.lua).toBe(1);

        await teacher.put(`/api/teacher/students/${id}/progress`).send({ track: 'blocks', questId: 'bk-takeoff-land', done: true });
        expect((await pupil.get('/api/progress')).body.progress).toEqual({ blocks: ['bk-takeoff-land'], lua: ['academy-001'], python: [] });
        const detail = await teacher.get(`/api/teacher/students/${id}`);
        expect(detail.body.student.progress.blocks['bk-takeoff-land'].by).toBe('teacher');

        await teacher.put(`/api/teacher/students/${id}/progress`).send({ track: 'lua', questId: 'academy-001', done: false });
        expect((await pupil.get('/api/progress')).body.progress.lua).toEqual([]);
    });

    test('учитель создаёт ученика, меняет логин и пароль, удаляет', async () => {
        const { app } = await makeApp();
        const { agent: teacher } = await login(app, 'teacher', 'teacher-pass');
        const created = await teacher.post('/api/teacher/students').send({ fullName: 'Петров Пётр', login: 'petrov', password: 'start123' });
        expect(created.status).toBe(201);
        const id = created.body.student.id;
        expect((await login(app, 'petrov', 'start123')).res.status).toBe(200);

        const patch = await teacher.patch(`/api/teacher/students/${id}`).send({ login: 'petrov2', password: 'newpass9', fullName: 'Петров Пётр Петрович' });
        expect(patch.body.student).toMatchObject({ login: 'petrov2', fullName: 'Петров Пётр Петрович' });
        expect((await login(app, 'petrov', 'start123')).res.status).toBe(401);
        expect((await login(app, 'petrov2', 'newpass9')).res.status).toBe(200);

        expect((await teacher.post('/api/teacher/students').send({ fullName: 'Другой Ученик', login: 'PETROV2', password: 'abcdef' })).status).toBe(409);
        expect((await teacher.delete(`/api/teacher/students/${id}`)).status).toBe(200);
        expect((await teacher.get(`/api/teacher/students/${id}`)).status).toBe(404);
    });

    test('смена пароля учителем закрывает старые сессии ученика', async () => {
        const { app } = await makeApp();
        const pupil = request.agent(app);
        await pupil.post('/api/auth/register').send(student);
        const { agent: teacher } = await login(app, 'teacher', 'teacher-pass');
        const id = (await teacher.get('/api/teacher/students')).body.students[0].id;
        await teacher.patch(`/api/teacher/students/${id}`).send({ password: 'brandnew1' });
        expect((await pupil.get('/api/auth/me')).body.user).toBeNull();
    });
});

describe('срок входа: два часа после последнего запроса', () => {
    const HOUR = 60 * 60 * 1000;
    afterEach(() => { jest.restoreAllMocks(); });

    test('каждый запрос продлевает вход, без запросов вход заканчивается через два часа', async () => {
        const { app } = await makeApp();
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);
        const start = Date.now();
        const now = jest.spyOn(Date, 'now');

        now.mockReturnValue(start + 1.5 * HOUR);
        expect((await agent.get('/api/auth/me')).body.user.login).toBe('ivanov');
        now.mockReturnValue(start + 3 * HOUR);   // 1,5 часа после последнего запроса: вход жив
        expect((await agent.get('/api/auth/me')).body.user.login).toBe('ivanov');
        now.mockReturnValue(start + 3 * HOUR + 2.1 * HOUR);   // больше двух часов тишины
        expect((await agent.get('/api/auth/me')).body.user).toBeNull();
        expect((await agent.get('/api/progress')).status).toBe(401);
    });

    test('ответ продлевает cookie на два часа, а выход его сбрасывает', async () => {
        const { app } = await makeApp();
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);
        const me = await agent.get('/api/auth/me');
        expect(String(me.headers['set-cookie'])).toMatch(/Max-Age=7200/);
        const out = await agent.post('/api/auth/logout');
        expect(String(out.headers['set-cookie'])).toMatch(/Max-Age=0\s*$|Max-Age=0;/);
        expect((await agent.get('/api/auth/me')).body.user).toBeNull();
    });
});
