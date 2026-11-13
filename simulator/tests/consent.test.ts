/**
 * Согласие на обработку данных и условия использования: две отдельные отметки при регистрации, подтверждение учителя про права
 * на данные учеников, окно согласия для тех, кто пришёл раньше, и запрет записывать данные без согласия.
 */
import express from 'express';
import request from 'supertest';
import { AccountStore, ensureTeacher, migrateData, registerAccountRoutes } from '../server/accounts.js';
import { CONSENT_VERSION } from '../server/legal-config.js';

async function makeApp() {
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'admin', TEACHER_PASSWORD: 'admin-pass' } as NodeJS.ProcessEnv);
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store);
    return { app, store };
}

const base = (login: string) => ({ fullName: login, login, loginRepeat: login, password: 'secret1', passwordRepeat: 'secret1' });
const BOTH = { consentPd: true, acceptTerms: true };

describe('регистрация требует согласия', () => {
    test('ученик: без любой из двух отметок аккаунт не создаётся', async () => {
        const { app, store } = await makeApp();
        for (const extra of [{}, { consentPd: true }, { acceptTerms: true }, { consentPd: 'true', acceptTerms: 'true' }, { consentPd: false, acceptTerms: true }]) {
            const res = await request(app).post('/api/auth/register').send({ ...base('pupil'), ...extra });
            expect(res.status).toBe(400);
        }
        expect(store.findByLogin('pupil')).toBeUndefined();
    });

    test('ученик: с обеими отметками аккаунт создаётся, версия и время согласия записаны, окно согласия не нужно', async () => {
        const { app, store } = await makeApp();
        const agent = request.agent(app);
        const res = await agent.post('/api/auth/register').send({ ...base('pupil'), ...BOTH });
        expect(res.status).toBe(201);
        expect(res.body.user.needsConsent).toBe(false);
        const consent = store.findByLogin('pupil')!.consent!;
        expect(consent.version).toBe(CONSENT_VERSION);
        expect(consent.at).toBeGreaterThan(0);
    });

    test('достаточно ника: одно слово принимается, одна буква нет', async () => {
        const { app } = await makeApp();
        expect((await request(app).post('/api/auth/register').send({ ...base('nick'), fullName: 'Дрон42', ...BOTH })).status).toBe(201);
        expect((await request(app).post('/api/auth/register').send({ ...base('nick2'), fullName: 'Д', ...BOTH })).status).toBe(400);
    });

    test('учитель: нужна ещё и третья отметка о согласии учеников, и со ссылкой коллеги тоже', async () => {
        const { app, store } = await makeApp();
        const teacher = (extra: Record<string, unknown>) => request(app).post('/api/auth/register-teacher').send({ ...base('teach'), orgName: 'Школа', captchaToken: 'x', captchaAnswer: '1', ...extra });
        // Проверку «не бот» отдельным тестом: здесь сервер отвечает 400 раньше, на согласии.
        expect((await teacher(BOTH)).status).toBe(400);
        expect(store.findByLogin('teach')).toBeUndefined();
        const admin = request.agent(app);
        await admin.post('/api/auth/login').send({ login: 'admin', password: 'admin-pass' });
        const invite = (await admin.post('/api/org/invites').send({ kind: 'teacher' })).body.invite.token as string;
        expect((await request(app).post('/api/auth/register-teacher').send({ ...base('colleague'), invite, ...BOTH })).status).toBe(400);
        const ok = await request(app).post('/api/auth/register-teacher').send({ ...base('colleague'), invite, ...BOTH, confirmConsents: true });
        expect(ok.status).toBe(201);
        expect(store.findByLogin('colleague')!.consent?.version).toBe(CONSENT_VERSION);
    });
});

describe('те, кто пришёл раньше', () => {
    async function oldPupil() {
        const { app, store } = await makeApp();
        // Ученика создал учитель: согласия нет.
        await store.createUser('student', 'Старый ник', 'old_pupil', 'secret1');
        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ login: 'old_pupil', password: 'secret1' });
        return { app, store, agent };
    }

    test('при входе требуется согласие, а запись прогресса и попыток закрыта до него', async () => {
        const { agent } = await oldPupil();
        expect((await agent.get('/api/auth/me')).body.user.needsConsent).toBe(true);
        expect((await agent.post('/api/progress/complete').send({ track: 'blocks', questId: 'bk-takeoff-land' })).status).toBe(403);
        expect((await agent.post('/api/learning/attempt').send({ track: 'blocks', questId: 'bk-takeoff-land', solved: true, titles: [], code: '' })).status).toBe(403);
        expect((await agent.get('/api/progress')).status).toBe(200);
    });

    test('после принятия двух отметок всё работает; без отметок согласие не принимается', async () => {
        const { agent, store } = await oldPupil();
        expect((await agent.post('/api/auth/consent').send({ consentPd: true })).status).toBe(400);
        expect((await agent.get('/api/auth/me')).body.user.needsConsent).toBe(true);
        const ok = await agent.post('/api/auth/consent').send(BOTH);
        expect(ok.status).toBe(200);
        expect(ok.body.user.needsConsent).toBe(false);
        expect(store.findByLogin('old_pupil')!.consent?.version).toBe(CONSENT_VERSION);
        expect((await agent.post('/api/progress/complete').send({ track: 'blocks', questId: 'bk-takeoff-land' })).status).toBe(200);
    });

    test('изменилась версия политики: согласие спрашивается заново', async () => {
        const { agent, store } = await oldPupil();
        await agent.post('/api/auth/consent').send(BOTH);
        store.findByLogin('old_pupil')!.consent!.version = '2000-01-01';
        expect((await agent.get('/api/auth/me')).body.user.needsConsent).toBe(true);
        expect((await agent.post('/api/progress/complete').send({ track: 'blocks', questId: 'bk-takeoff-land' })).status).toBe(403);
    });

    test('учитель и админ без согласия не входят в кабинет, пока не примут (с подтверждением прав на данные учеников)', async () => {
        const { app, store } = await makeApp();
        await store.createUser('teacher', 'Старый учитель', 'old_teacher', 'secret1');
        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ login: 'old_teacher', password: 'secret1' });
        expect((await agent.get('/api/teacher/students')).status).toBe(403);
        expect((await agent.post('/api/auth/consent').send(BOTH)).status).toBe(400);
        expect((await agent.post('/api/auth/consent').send({ ...BOTH, confirmConsents: true })).status).toBe(200);
        expect((await agent.get('/api/teacher/students')).status).toBe(200);
    });

    test('в режиме просмотра учителя согласие не спрашивается и принять его нельзя', async () => {
        const { app, store } = await makeApp();
        await store.createUser('student', 'Старый ник', 'old_pupil', 'secret1');
        const admin = request.agent(app);
        await admin.post('/api/auth/login').send({ login: 'admin', password: 'admin-pass' });
        const id = store.findByLogin('old_pupil')!.id;
        const view = await admin.post(`/api/teacher/students/${id}/view`);
        expect(view.body.user.needsConsent).toBe(false);
        expect((await admin.post('/api/auth/consent').send(BOTH)).status).toBe(403);
        expect(store.findByLogin('old_pupil')!.consent).toBeUndefined();
    });
});

describe('миграция и согласие', () => {
    const user = (extra: Record<string, unknown>) => ({ id: 'u', role: 'student', login: 'u', salt: 's', hash: 'h', fullName: 'u', createdAt: 1, progress: {}, ...extra });

    test('верное согласие сохраняется, испорченное отбрасывается', () => {
        const good = migrateData({ version: 3, users: [user({ consent: { at: 5, version: CONSENT_VERSION } })] });
        expect(good.users[0].consent).toEqual({ at: 5, version: CONSENT_VERSION });
        const broken = migrateData({ version: 3, users: [user({ consent: { at: 'вчера' } })] });
        expect(broken.users[0].consent).toBeUndefined();
    });
});
