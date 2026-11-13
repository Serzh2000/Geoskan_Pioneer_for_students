/**
 * Удаление аккаунта учеником: нужны логин и пароль, случайно и чужой рукой не удалить; вместе с аккаунтом стирается история проверок.
 */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AccountStore, ensureTeacher, registerAccountRoutes } from '../server/accounts.js';
import { AttemptLog } from '../server/attempts.js';

async function makeApp() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-'));
    const attempts = new AttemptLog(path.join(dir, 'attempts.jsonl'));
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'admin', TEACHER_PASSWORD: 'admin-pass' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store, attempts);
    const register = async (login: string) => {
        const agent = request.agent(app);
        const res = await agent.post('/api/auth/register').send({ fullName: `Ник ${login}`, login, loginRepeat: login, password: 'secret1', passwordRepeat: 'secret1' });
        expect(res.status).toBe(201);
        return agent;
    };
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ login: 'admin', password: 'admin-pass' });
    return { app, store, attempts, register, admin, dir };
}

const attempt = (pupil: request.Agent, questId: string) => pupil.post('/api/learning/attempt').send({ track: 'lua', questId, solved: false, titles: ['Тест'], code: 'secret code' });

describe('удаление аккаунта учеником', () => {
    test('с верным логином и паролем аккаунт, сессия и история проверок удаляются, чужие данные целы', async () => {
        const { app, store, attempts, register, admin } = await makeApp();
        const mine = await register('pupil_a');
        const other = await register('pupil_b');
        await attempt(mine, 'academy-001');
        await attempt(mine, 'academy-002');
        await attempt(other, 'academy-001');
        expect(attempts.read()).toHaveLength(3);
        const res = await mine.post('/api/auth/delete-account').send({ confirm: 'pupil_a', password: 'secret1' });
        expect(res.status).toBe(200);
        expect(store.findByLogin('pupil_a')).toBeUndefined();
        expect(attempts.read().map((item) => item.name)).toEqual(['Ник pupil_b']);
        expect((await mine.get('/api/auth/me')).body.user).toBeNull();
        expect((await request(app).post('/api/auth/login').send({ login: 'pupil_a', password: 'secret1' })).status).toBe(401);
        expect((await admin.get('/api/teacher/students')).body.students.map((item: { login: string }) => item.login)).toEqual(['pupil_b']);
        expect((await other.get('/api/auth/me')).body.user.login).toBe('pupil_b');
    });

    test('неверный логин или пароль, пустые поля и повторный запрос не удаляют', async () => {
        const { store, register } = await makeApp();
        const pupil = await register('pupil_a');
        expect((await pupil.post('/api/auth/delete-account').send({ confirm: 'Pupil_A', password: 'secret1' })).status).toBe(400);
        expect((await pupil.post('/api/auth/delete-account').send({ confirm: 'pupil_a', password: 'wrong-pass' })).status).toBe(403);
        expect((await pupil.post('/api/auth/delete-account').send({ confirm: '', password: '' })).status).toBe(400);
        expect((await pupil.post('/api/auth/delete-account').send({})).status).toBe(400);
        expect(store.findByLogin('pupil_a')).toBeDefined();
        expect((await pupil.get('/api/auth/me')).body.user.login).toBe('pupil_a');
    });

    test('без входа, в режиме просмотра учителя и для аккаунтов учителей удаление закрыто', async () => {
        const { app, store, register, admin } = await makeApp();
        const pupil = await register('pupil_a');
        expect((await request(app).post('/api/auth/delete-account').send({ confirm: 'pupil_a', password: 'secret1' })).status).toBe(401);
        const id = store.findByLogin('pupil_a')!.id;
        expect((await admin.post(`/api/teacher/students/${id}/view`)).status).toBe(200);
        expect((await admin.post('/api/auth/delete-account').send({ confirm: 'pupil_a', password: 'secret1' })).status).toBe(403);
        expect(store.findByLogin('pupil_a')).toBeDefined();
        await admin.post('/api/auth/view-exit');
        expect((await admin.post('/api/auth/delete-account').send({ confirm: 'admin', password: 'admin-pass' })).status).toBe(400);
        expect(store.findByLogin('admin')).toBeDefined();
        expect((await pupil.get('/api/auth/me')).body.user.login).toBe('pupil_a');
    });

    test('учитель, удаляя ученика, тоже стирает его историю проверок', async () => {
        const { store, attempts, register, admin } = await makeApp();
        const pupil = await register('pupil_a');
        await attempt(pupil, 'academy-001');
        const id = store.findByLogin('pupil_a')!.id;
        expect((await admin.delete(`/api/teacher/students/${id}`)).status).toBe(200);
        expect(attempts.read()).toEqual([]);
    });

    test('история одного ученика стирается, оборванные строки и записи других остаются', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attempts-purge-'));
        const file = path.join(dir, 'attempts.jsonl');
        const log = new AttemptLog(file);
        const add = (userId: string) => log.add({ at: 1, userId, name: userId, track: 'lua', questId: 'q', solved: false, titles: [], code: '' });
        await add('a'); await add('b'); await add('a');
        fs.appendFileSync(file, '{"оборвано"');
        expect(await log.removeUser('a')).toBe(2);
        expect(await log.removeUser('a')).toBe(0);
        expect(log.read().map((item) => item.userId)).toEqual(['b']);
        expect(fs.readFileSync(file, 'utf8')).toContain('{"оборвано"');
    });
});
