/** Журнал попыток: ученик присылает результат проверки, учитель видит, где застревают. */
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { AccountStore, ensureTeacher, registerAccountRoutes } from '../server/accounts.js';
import { AttemptLog, MAX_CODE_LENGTH } from '../server/attempts.js';

const student = { fullName: 'Иванов Иван', login: 'ivanov', loginRepeat: 'ivanov', password: 'secret1', passwordRepeat: 'secret1', consentPd: true, acceptTerms: true, confirmConsents: true };

async function makeApp() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attempts-'));
    const log = new AttemptLog(path.join(dir, 'attempts.jsonl'));
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'teacher', TEACHER_PASSWORD: 'teacher-pass' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store, log);
    const pupil = request.agent(app);
    await pupil.post('/api/auth/register').send(student);
    const teacher = request.agent(app);
    await teacher.post('/api/auth/login').send({ login: 'teacher', password: 'teacher-pass' });
    return { app, pupil, teacher, dir };
}

test('попытки ученика попадают в сводку учителя', async () => {
    const { pupil, teacher } = await makeApp();
    const body = (solved: boolean, titles: string[], code = 'print(1)') => ({ track: 'python', questId: 'academy-012', solved, titles, code });
    expect((await pupil.post('/api/learning/attempt').send(body(false, ['Нужен чистый зелёный или синий']))).status).toBe(200);
    await pupil.post('/api/learning/attempt').send(body(false, ['Нужен чистый зелёный или синий']));
    await pupil.post('/api/learning/attempt').send(body(true, []));

    const stats = (await teacher.get('/api/teacher/attempts?track=python')).body.stats;
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({ questId: 'academy-012', attempts: 3, solved: 1, students: 1, studentsSolved: 1, avgAttemptsToSolve: 3 });
    expect(stats[0].topIssues).toEqual([{ title: 'Нужен чистый зелёный или синий', count: 2 }]);

    const failures = (await teacher.get('/api/teacher/attempts/academy-012?track=python')).body.failures;
    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatchObject({ name: 'Иванов Иван', code: 'print(1)' });
});

test('журнал видит только учитель, а писать в него может только вошедший', async () => {
    const { app, pupil } = await makeApp();
    expect((await request(app).post('/api/learning/attempt').send({ track: 'lua', questId: 'a', solved: true })).status).toBe(401);
    expect((await pupil.get('/api/teacher/attempts')).status).toBe(403);
    expect((await pupil.get('/api/teacher/attempts/academy-012?track=python')).status).toBe(403);
});

test('плохие номера миссий отклоняются, длинный код обрезается, оборванная строка не ломает чтение', async () => {
    const { pupil, dir } = await makeApp();
    expect((await pupil.post('/api/learning/attempt').send({ track: 'cobol', questId: 'x', solved: true })).status).toBe(400);
    expect((await pupil.post('/api/learning/attempt').send({ track: 'lua', questId: '../etc', solved: true })).status).toBe(400);
    await pupil.post('/api/learning/attempt').send({ track: 'lua', questId: 'academy-001', solved: false, titles: ['x'], code: 'a'.repeat(MAX_CODE_LENGTH + 500) });
    const file = path.join(dir, 'attempts.jsonl');
    fs.appendFileSync(file, '{"at":1,"userId":');
    const read = new AttemptLog(file).read();
    expect(read).toHaveLength(1);
    expect(read[0].code.length).toBe(MAX_CODE_LENGTH);
});
