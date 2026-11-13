/**
 * Исходы проверок: промежуточный опыт миссии из нескольких запусков («Опыт записан, проверьте следующий случай») не ошибка.
 * Раньше он писался как неудача: миссии 12, 13, 22, 23 выглядели самыми трудными, а ученик после трёх верных опытов подряд
 * мог получить метку «Застрял».
 */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AccountStore, ensureTeacher, findStuck, registerAccountRoutes, type User } from '../server/accounts.js';
import { AttemptLog, type Attempt } from '../server/attempts.js';

async function makeApp() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outcomes-'));
    const log = new AttemptLog(path.join(dir, 'attempts.jsonl'));
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'teacher', TEACHER_PASSWORD: 'teacher-pass' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store, log);
    const pupil = request.agent(app);
    await pupil.post('/api/auth/register').send({ fullName: 'Иванов Иван', login: 'ivanov', loginRepeat: 'ivanov', password: 'secret1', passwordRepeat: 'secret1' });
    const teacher = request.agent(app);
    await teacher.post('/api/auth/login').send({ login: 'teacher', password: 'teacher-pass' });
    return { pupil, teacher, store };
}

const send = (pupil: request.Agent, body: Record<string, unknown>) => pupil.post('/api/learning/attempt').send({ track: 'lua', questId: 'academy-012', titles: [], code: 'x', ...body });

describe('промежуточные опыты', () => {
    test('три верных опыта и зачёт: ни одной ошибки, замечаний нет, ошибок до зачёта 0', async () => {
        const { pupil, teacher } = await makeApp();
        await send(pupil, { solved: false, partial: true, titles: ['Опыт записан — проверьте следующий случай'] });
        await send(pupil, { solved: false, partial: true, titles: ['Опыт записан — проверьте следующий случай'] });
        await send(pupil, { solved: true });
        const stats = (await teacher.get('/api/teacher/attempts?track=lua')).body.stats[0];
        expect(stats).toMatchObject({ attempts: 3, solved: 1, partial: 2, failures: 0, avgFailsToSolve: 0, studentsSolved: 1 });
        expect(stats.topIssues).toEqual([]);
        const quest = (await teacher.get('/api/teacher/attempts/academy-012?track=lua')).body;
        expect(quest.failures).toEqual([]);
        expect(quest.stuck).toEqual([]);
    });

    test('настоящие ошибки считаются отдельно от опытов и попадают в замечания', async () => {
        const { pupil, teacher } = await makeApp();
        await send(pupil, { solved: false, titles: ['Нужен чистый зелёный или синий'] });
        await send(pupil, { solved: false, partial: true, titles: ['Опыт записан — проверьте следующий случай'] });
        await send(pupil, { solved: false, titles: ['Нужен чистый зелёный или синий'] });
        await send(pupil, { solved: true });
        const stats = (await teacher.get('/api/teacher/attempts?track=lua')).body.stats[0];
        expect(stats).toMatchObject({ attempts: 4, partial: 1, failures: 2, avgFailsToSolve: 2 });
        expect(stats.topIssues).toEqual([{ title: 'Нужен чистый зелёный или синий', count: 2 }]);
        const failures = (await teacher.get('/api/teacher/attempts/academy-012?track=lua')).body.failures;
        expect(failures).toHaveLength(2);
    });

    test('зачёт не бывает промежуточным, а лишнее поле partial у обычной неудачи не мешает', () => {
        const solved = AttemptLog.sanitize({ userId: 'u', name: 'Имя', track: 'lua', questId: 'q', body: { solved: true, partial: true } });
        expect(solved.partial).toBeUndefined();
        const partial = AttemptLog.sanitize({ userId: 'u', name: 'Имя', track: 'lua', questId: 'q', body: { solved: false, partial: true } });
        expect(partial.partial).toBe(true);
        const plain = AttemptLog.sanitize({ userId: 'u', name: 'Имя', track: 'lua', questId: 'q', body: { solved: false } });
        expect(plain.partial).toBeUndefined();
    });

    test('«Застрял» не ставится за обязательные опыты, но ставится за настоящие подряд идущие ошибки', () => {
        const user = { progress: { blocks: {}, lua: {}, python: {}, sdk2: {}, bricks: {} } } as unknown as User;
        const now = Date.now();
        const attempt = (partial: boolean, i: number): Attempt => ({ at: now - 1000 * (10 - i), userId: 'u', name: 'N', track: 'lua', questId: 'academy-023', solved: false, titles: [], code: '', ...(partial ? { partial: true } : {}) });
        expect(findStuck(user, [attempt(true, 1), attempt(true, 2), attempt(true, 3), attempt(true, 4)], now)).toBeNull();
        expect(findStuck(user, [attempt(false, 1), attempt(true, 2), attempt(false, 3), attempt(false, 4)], now)).toMatchObject({ questId: 'academy-023', fails: 3 });
    });

    test('«с первой проверки» не ломается из-за обязательных опытов', async () => {
        const { pupil } = await makeApp();
        await send(pupil, { solved: false, partial: true, titles: ['Опыт записан'] });
        await send(pupil, { solved: true });
        const cabinet = (await pupil.get('/api/me/cabinet')).body;
        expect(cabinet.stats.firstTrySolved).toBe(1);
    });
});
