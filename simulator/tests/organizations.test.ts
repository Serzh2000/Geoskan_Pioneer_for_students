/**
 * Организации: учитель видит только своих учеников, ссылки-приглашения, регистрация учителя, админ, миграция файла.
 * Главное, что здесь проверяется, - изоляция: ни один маршрут учителя не показывает и не меняет чужую организацию.
 */
import { jest } from '@jest/globals';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AccountStore, MAIN_ORG_ID, ensureTeacher, migrateData, registerAccountRoutes } from '../server/accounts.js';
import { AttemptLog } from '../server/attempts.js';
import { CaptchaIssuer } from '../server/captcha.js';
import { MetricsLog } from '../server/metrics.js';

type Setup = Awaited<ReturnType<typeof makeApp>>;

/** Проверка «не бот» в этих тестах всегда пропускает: её саму проверяет отдельный блок ниже. */
const passCaptcha = () => Object.assign(new CaptchaIssuer('test-secret'), { verify: () => true });

async function makeApp(options: { captcha?: CaptchaIssuer } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orgs-'));
    const store = new AccountStore(null);
    await ensureTeacher(store, { TEACHER_LOGIN: 'admin', TEACHER_PASSWORD: 'admin-pass' } as NodeJS.ProcessEnv);
    const attempts = new AttemptLog(path.join(dir, 'attempts.jsonl'));
    const metrics = new MetricsLog(path.join(dir, 'metrics.jsonl'));
    const app = express();
    app.use(express.json());
    registerAccountRoutes(app, store, attempts, metrics, options.captcha ?? passCaptcha());
    return { app, store, attempts, metrics };
}

const form = (login: string, extra: Record<string, unknown> = {}) => ({
    fullName: `Иванов ${login}`, login, loginRepeat: login, password: 'secret1', passwordRepeat: 'secret1', consentPd: true, acceptTerms: true, confirmConsents: true, ...extra
});

async function loginAs(app: express.Express, login: string, password = 'secret1') {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ login, password });
    expect(res.status).toBe(200);
    return agent;
}

/** Учитель регистрируется сам и создаёт свою организацию. */
async function registerTeacher(app: express.Express, login: string, orgName: string) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register-teacher').send(form(login, { orgName, captchaToken: 'x', captchaAnswer: '1' }));
    expect(res.status).toBe(201);
    return { agent, user: res.body.user };
}

let studentSeq = 0;
async function addStudent(teacher: request.Agent, name: string, classId?: string) {
    const res = await teacher.post('/api/teacher/students').send({ fullName: name, login: `pupil_${++studentSeq}`, password: 'pupil123', classId });
    expect(res.status).toBe(201);
    return res.body.student as { id: string; login: string };
}

/** Две организации с учителем и двумя учениками в каждой. */
async function twoOrgs(setup: Setup) {
    const a = await registerTeacher(setup.app, 'teacher_a', 'Школа А');
    const b = await registerTeacher(setup.app, 'teacher_b', 'Школа Б');
    const classA = (await a.agent.post('/api/teacher/classes').send({ name: '8А' })).body.classGroup.id as string;
    const classB = (await b.agent.post('/api/teacher/classes').send({ name: '8Б' })).body.classGroup.id as string;
    const studentsA = [await addStudent(a.agent, 'Аня', classA), await addStudent(a.agent, 'Антон', classA)];
    const studentsB = [await addStudent(b.agent, 'Боря', classB), await addStudent(b.agent, 'Белла', classB)];
    return { a, b, classA, classB, studentsA, studentsB };
}

describe('регистрация учителя', () => {
    test('учитель создаёт свою организацию и становится её владельцем', async () => {
        const { app, store } = await makeApp();
        const { user } = await registerTeacher(app, 'teacher_a', 'Школа 5');
        expect(user).toMatchObject({ role: 'teacher', org: { name: 'Школа 5', isOwner: true } });
        expect(store.orgs.some((org) => org.name === 'Школа 5' && org.ownerId === user.id)).toBe(true);
        expect(JSON.stringify(user)).not.toMatch(/hash|salt/);
    });

    test('неверный ответ на вопрос и заполненная скрытая ловушка отклоняются', async () => {
        const issuer = new CaptchaIssuer('s');
        const { app } = await makeApp({ captcha: issuer });
        const bad = await request(app).post('/api/auth/register-teacher').send(form('t1', { orgName: 'Школа', captchaToken: 'мусор', captchaAnswer: '5' }));
        expect(bad.status).toBe(400);
        const bot = await request(app).post('/api/auth/register-teacher').send(form('t2', { orgName: 'Школа', website: 'http://spam', captchaToken: 'x', captchaAnswer: '1' }));
        expect(bot.status).toBe(400);
        const noOrg = await request(app).post('/api/auth/register-teacher').send(form('t3', { orgName: '', captchaToken: 'x', captchaAnswer: '1' }));
        expect(noOrg.status).toBe(400);
    });

    test('вопрос выдаётся и проверяется: один токен - одна попытка, слишком быстрый и чужой ответ не проходят', () => {
        const issuer = new CaptchaIssuer('secret-1');
        const now = 1_000_000;
        // Ответ спрятан в хэше; тест подбирает его перебором тем же секретом, как сделал бы человек, прочитав вопрос.
        const solve = (token: string) => Array.from({ length: 100 }, (_, i) => i).find((n) => new CaptchaIssuer('secret-1').verify(token, n, now + 5000));
        const first = issuer.create(now);
        expect(first.question).toMatch(/цифрами/);
        const answer = solve(first.token)!;
        expect(answer).toBeDefined();
        expect(issuer.verify(first.token, answer, now + 1000)).toBe(false); // быстрее двух секунд: бот
        expect(issuer.verify(first.token, answer, now + 5000)).toBe(true);
        expect(issuer.verify(first.token, answer, now + 6000)).toBe(false); // токен уже использован
        const second = issuer.create(now);
        const right = solve(second.token)!;
        expect(issuer.verify(second.token, right + 1, now + 5000)).toBe(false);
        expect(issuer.verify(second.token, right, now + 6000)).toBe(false); // неверная попытка тоже сжигает токен
        const third = issuer.create(now);
        expect(issuer.verify(third.token, 'не число', now + 5000)).toBe(false);
        const fourth = issuer.create(now);
        const ans4 = solve(fourth.token)!;
        expect(new CaptchaIssuer('другой секрет').verify(fourth.token, ans4, now + 5000)).toBe(false);
        expect(issuer.verify(`${fourth.token}x`, ans4, now + 5000)).toBe(false);
        expect(issuer.verify(fourth.token, ans4, now + 31 * 60 * 1000)).toBe(false); // устарел
    });

    test('логин занят - 409, как у учеников', async () => {
        const { app } = await makeApp();
        await registerTeacher(app, 'teacher_a', 'Школа А');
        const again = await request(app).post('/api/auth/register-teacher').send(form('TEACHER_A', { orgName: 'Другая', captchaToken: 'x', captchaAnswer: '1' }));
        expect(again.status).toBe(409);
    });
});

describe('изоляция организаций', () => {
    test('учитель видит в списках и обзоре только своих учеников и свои классы', async () => {
        const setup = await makeApp();
        const { a, studentsA } = await twoOrgs(setup);
        const list = (await a.agent.get('/api/teacher/students')).body.students as Array<{ id: string }>;
        expect(list.map((item) => item.id).sort()).toEqual(studentsA.map((item) => item.id).sort());
        const overview = (await a.agent.get('/api/teacher/overview')).body;
        expect(overview.students).toHaveLength(2);
        expect(overview.classes.map((group: { name: string }) => group.name)).toEqual(['8А']);
    });

    test('чужого ученика нельзя ни прочитать, ни изменить, ни удалить, ни зачесть, ни сбросить пароль, ни посмотреть его глазами', async () => {
        const setup = await makeApp();
        const { a, studentsB, classA } = await twoOrgs(setup);
        const id = studentsB[0].id;
        const checks = [
            await a.agent.get(`/api/teacher/students/${id}`),
            await a.agent.patch(`/api/teacher/students/${id}`).send({ fullName: 'Взлом Взломов' }),
            await a.agent.put(`/api/teacher/students/${id}/progress`).send({ track: 'blocks', questId: 'bk-takeoff-land', done: true }),
            await a.agent.post(`/api/teacher/students/${id}/reset-password`),
            await a.agent.post(`/api/teacher/students/${id}/view`),
            await a.agent.get(`/api/teacher/students/${id}/attempts`),
            await a.agent.get(`/api/teacher/students/${id}/activity`),
            await a.agent.delete(`/api/teacher/students/${id}`)
        ];
        for (const res of checks) expect(res.status).toBe(404);
        // Ученик Б цел: имя, пароль и класс те же.
        const student = setup.store.findById(id)!;
        expect(student.fullName).not.toBe('Взлом Взломов');
        expect(Object.keys(student.progress.blocks)).toEqual([]);
        expect((await request(setup.app).post('/api/auth/login').send({ login: studentsB[0].login, password: 'pupil123' })).status).toBe(200);
        // Свой ученик работает как обычно.
        expect(classA).toBeTruthy();
    });

    test('массовые действия затрагивают только своих учеников', async () => {
        const setup = await makeApp();
        const { a, studentsA, studentsB, classA } = await twoOrgs(setup);
        const ids = [studentsA[0].id, studentsB[0].id];
        const reset = await a.agent.post('/api/teacher/students/batch').send({ ids, action: 'reset' });
        expect(reset.body.passwords).toHaveLength(1);
        expect((await request(setup.app).post('/api/auth/login').send({ login: studentsB[0].login, password: 'pupil123' })).status).toBe(200);
        const move = await a.agent.post('/api/teacher/students/batch').send({ ids: [studentsB[0].id], action: 'move', classId: classA });
        expect(move.status).toBe(400);
    });

    test('чужой класс нельзя ни изменить, ни удалить, ни назначить ученику', async () => {
        const setup = await makeApp();
        const { a, classA, classB, studentsA } = await twoOrgs(setup);
        expect((await a.agent.patch(`/api/teacher/classes/${classB}`).send({ name: 'Моё' })).status).toBe(404);
        expect((await a.agent.delete(`/api/teacher/classes/${classB}`)).status).toBe(404);
        expect((await a.agent.patch(`/api/teacher/students/${studentsA[0].id}`).send({ classId: classB })).status).toBe(400);
        expect((await a.agent.post('/api/teacher/students').send({ fullName: 'Новый', login: 'new_one', password: 'pupil123', classId: classB })).status).toBe(400);
        expect((await a.agent.post('/api/teacher/students/bulk').send({ names: 'Пётр Петров', classId: classB })).status).toBe(400);
        expect(setup.store.findClass(classB)?.name).toBe('8Б');
        expect(setup.store.findClass(classA)?.orgId).not.toBe(setup.store.findClass(classB)?.orgId);
    });

    test('одинаковое название класса в разных организациях допустимо', async () => {
        const setup = await makeApp();
        const { a, b } = await twoOrgs(setup);
        expect((await a.agent.post('/api/teacher/classes').send({ name: '9А' })).status).toBe(201);
        expect((await b.agent.post('/api/teacher/classes').send({ name: '9А' })).status).toBe(201);
        expect((await a.agent.post('/api/teacher/classes').send({ name: '9А' })).status).toBe(409);
    });

    test('сводка проверок и «где застревают» считаются только по своей организации', async () => {
        const setup = await makeApp();
        const { a, studentsA, studentsB } = await twoOrgs(setup);
        const attempt = (userId: string, name: string, solved: boolean) => setup.attempts.add({ at: Date.now(), userId, name, track: 'blocks', questId: 'bk-takeoff-land', solved, titles: solved ? [] : ['Свой тег'], code: 'код ' + name });
        await attempt(studentsA[0].id, 'Аня', false);
        await attempt(studentsB[0].id, 'Боря', false);
        await attempt(studentsB[1].id, 'Белла', false);
        await attempt(studentsB[1].id, 'Белла', false);
        await attempt(studentsB[1].id, 'Белла', false);
        const stats = (await a.agent.get('/api/teacher/attempts?track=blocks')).body.stats as Array<{ attempts: number; students: number }>;
        expect(stats).toHaveLength(1);
        expect(stats[0]).toMatchObject({ attempts: 1, students: 1 });
        const quest = (await a.agent.get('/api/teacher/attempts/bk-takeoff-land?track=blocks')).body;
        expect(quest.failures).toHaveLength(1);
        expect(quest.failures[0].name).toBe('Аня');
        expect(quest.stuck.map((item: { name: string }) => item.name)).toEqual(['Аня']);
        const overview = (await a.agent.get('/api/teacher/overview')).body;
        expect(overview.students.reduce((sum: number, item: { attemptsTotal: number }) => sum + item.attemptsTotal, 0)).toBe(1);
    });

    test('метрика: учитель видит только события своей организации, админ все', async () => {
        const setup = await makeApp();
        const { a, b } = await twoOrgs(setup);
        const send = (agent: { post: (url: string) => request.Test }, sid: string, questId: string) => agent.post('/api/metrics').send({ sid, events: [{ name: 'quest_open', track: 'blocks', questId }] });
        await send(a.agent, 'sid_aaaaaa', 'bk-a');
        await send(b.agent, 'sid_bbbbbb', 'bk-b');
        await send(request(setup.app), 'sid_guest1', 'bk-guest');
        const own = (await a.agent.get('/api/teacher/metrics')).body.summary.quests as Array<{ questId: string }>;
        expect(own.map((item) => item.questId)).toEqual(['bk-a']);
        const admin = await loginAs(setup.app, 'admin', 'admin-pass');
        const all = (await admin.get('/api/teacher/metrics').set('x-pioneer-org', '*')).body.summary.quests as Array<{ questId: string }>;
        expect(all.map((item) => item.questId).sort()).toEqual(['bk-a', 'bk-b', 'bk-guest']);
    });

    test('ученик не может зайти в маршруты учителя, организации и админа', async () => {
        const setup = await makeApp();
        const { studentsA } = await twoOrgs(setup);
        const pupil = await loginAs(setup.app, studentsA[0].login, 'pupil123');
        for (const res of [
            await pupil.get('/api/teacher/students'), await pupil.get('/api/org'), await pupil.post('/api/org/invites').send({ kind: 'student' }),
            await pupil.get('/api/admin/orgs'), await pupil.get('/api/teacher/metrics')
        ]) expect(res.status).toBe(403);
    });

    test('учитель не попадает в маршруты админа и не может выбрать чужую организацию заголовком', async () => {
        const setup = await makeApp();
        const { a, studentsB } = await twoOrgs(setup);
        expect((await a.agent.get('/api/admin/orgs')).status).toBe(403);
        expect((await a.agent.post(`/api/admin/teachers/${studentsB[0].id}/reset-password`)).status).toBe(403);
        const orgB = setup.store.findById(studentsB[0].id)!.orgId;
        const list = (await a.agent.get('/api/teacher/students').set('x-pioneer-org', orgB)).body.students as Array<{ id: string }>;
        expect(list.every((item) => item.id !== studentsB[0].id && item.id !== studentsB[1].id)).toBe(true);
        expect((await a.agent.get('/api/teacher/students').set('x-pioneer-org', '*')).body.students).toHaveLength(2);
        expect((await a.agent.get('/api/org').set('x-pioneer-org', orgB)).body.org.name).toBe('Школа А');
    });
});

describe('ссылки-приглашения', () => {
    async function studentInvite(teacher: request.Agent, body: Record<string, unknown> = {}) {
        const res = await teacher.post('/api/org/invites').send({ kind: 'student', ...body });
        expect(res.status).toBe(201);
        return res.body.invite as { id: string; token: string; state: string };
    }

    test('ученик по ссылке попадает в организацию учителя без класса и виден только ему', async () => {
        const setup = await makeApp();
        const { a, b } = await twoOrgs(setup);
        const invite = await studentInvite(a.agent);
        const info = await request(setup.app).get(`/api/invites/${invite.token}`);
        expect(info.body).toMatchObject({ kind: 'student', orgName: 'Школа А', state: 'ok' });
        const pupil = request.agent(setup.app);
        const res = await pupil.post('/api/auth/register').send(form('by_link', { invite: invite.token }));
        expect(res.status).toBe(201);
        expect(res.body.user.org.name).toBe('Школа А');
        const list = (await a.agent.get('/api/teacher/students')).body.students as Array<{ login: string; classId: string | null }>;
        const created = list.find((item) => item.login === 'by_link');
        expect(created).toBeDefined();
        expect(created!.classId).toBeNull();
        expect((await b.agent.get('/api/teacher/students')).body.students.some((item: { login: string }) => item.login === 'by_link')).toBe(false);
    });

    test('ученик без ссылки попадает в «Основную», админ его видит, учитель другой организации нет', async () => {
        const setup = await makeApp();
        const { a } = await twoOrgs(setup);
        const res = await request(setup.app).post('/api/auth/register').send(form('lonely'));
        expect(res.body.user.org.id).toBe(MAIN_ORG_ID);
        const admin = await loginAs(setup.app, 'admin', 'admin-pass');
        expect((await admin.get('/api/teacher/students')).body.students.some((item: { login: string }) => item.login === 'lonely')).toBe(true);
        expect((await a.agent.get('/api/teacher/students')).body.students.some((item: { login: string }) => item.login === 'lonely')).toBe(false);
    });

    test('ссылка с ограничением числа использований, срок действия и отзыв', async () => {
        const setup = await makeApp();
        const { a } = await twoOrgs(setup);
        const once = await studentInvite(a.agent, { maxUses: 1 });
        expect((await request(setup.app).post('/api/auth/register').send(form('first', { invite: once.token }))).status).toBe(201);
        const second = await request(setup.app).post('/api/auth/register').send(form('second', { invite: once.token }));
        expect(second.status).toBe(410);
        expect(setup.store.findByLogin('second')).toBeUndefined();

        const old = await studentInvite(a.agent);
        setup.store.findInvite(old.id)!.expiresAt = Date.now() - 1000;
        expect((await request(setup.app).post('/api/auth/register').send(form('third', { invite: old.token }))).status).toBe(410);
        expect((await request(setup.app).get(`/api/invites/${old.token}`)).body.state).toBe('expired');

        const revoked = await studentInvite(a.agent);
        expect((await a.agent.delete(`/api/org/invites/${revoked.id}`)).status).toBe(200);
        expect((await request(setup.app).post('/api/auth/register').send(form('fourth', { invite: revoked.token }))).status).toBe(410);
        expect((await request(setup.app).post('/api/auth/register').send(form('fifth', { invite: 'нет-такой-ссылки-вообще' }))).status).toBe(404);
    });

    test('чужую ссылку нельзя отозвать, а в списке видны только свои', async () => {
        const setup = await makeApp();
        const { a, b } = await twoOrgs(setup);
        const mine = await studentInvite(a.agent);
        const theirs = await studentInvite(b.agent);
        expect((await a.agent.delete(`/api/org/invites/${theirs.id}`)).status).toBe(404);
        const listed = (await a.agent.get('/api/org')).body.invites as Array<{ id: string }>;
        expect(listed.map((item) => item.id)).toEqual([mine.id]);
    });

    test('ссылка для учителей и для учеников не подменяют друг друга', async () => {
        const setup = await makeApp();
        const { a } = await twoOrgs(setup);
        const forStudents = await studentInvite(a.agent);
        const forTeachers = (await a.agent.post('/api/org/invites').send({ kind: 'teacher' })).body.invite as { token: string };
        expect((await request(setup.app).post('/api/auth/register-teacher').send(form('sneaky', { invite: forStudents.token }))).status).toBe(400);
        expect((await request(setup.app).post('/api/auth/register').send(form('sneaky2', { invite: forTeachers.token }))).status).toBe(400);
    });

    test('ученик, у которого уже есть аккаунт, переходит по ссылке сам: прогресс остаётся, класс сбрасывается, прежний учитель его теряет', async () => {
        const setup = await makeApp();
        const { a, b, studentsB, classB } = await twoOrgs(setup);
        await b.agent.put(`/api/teacher/students/${studentsB[0].id}/progress`).send({ track: 'blocks', questId: 'bk-takeoff-land', done: true });
        const invite = await studentInvite(a.agent);
        const pupil = await loginAs(setup.app, studentsB[0].login, 'pupil123');
        const joined = await pupil.post('/api/auth/join').send({ invite: invite.token });
        expect(joined.status).toBe(200);
        expect(joined.body.user.org.name).toBe('Школа А');
        const moved = setup.store.findById(studentsB[0].id)!;
        expect(moved.classId).toBeNull();
        expect(Object.keys(moved.progress.blocks)).toEqual(['bk-takeoff-land']);
        expect((await b.agent.get(`/api/teacher/students/${studentsB[0].id}`)).status).toBe(404);
        expect((await a.agent.get(`/api/teacher/students/${studentsB[0].id}`)).status).toBe(200);
        expect(classB).toBeTruthy();
        // Повторный переход в ту же организацию и переход учителя отклоняются.
        expect((await pupil.post('/api/auth/join').send({ invite: invite.token })).status).toBe(409);
        expect((await a.agent.post('/api/auth/join').send({ invite: invite.token })).status).toBe(400);
    });

    test('в режиме просмотра перейти по ссылке нельзя', async () => {
        const setup = await makeApp();
        const { a, studentsA, b } = await twoOrgs(setup);
        const invite = await studentInvite(b.agent);
        await a.agent.post(`/api/teacher/students/${studentsA[0].id}/view`);
        expect((await a.agent.post('/api/auth/join').send({ invite: invite.token })).status).toBe(403);
        expect(setup.store.findById(studentsA[0].id)!.orgId).toBe(setup.store.findById(a.user.id)!.orgId);
    });
});

describe('команда организации', () => {
    test('владелец зовёт коллегу ссылкой; коллега видит тех же учеников, но не управляет командой', async () => {
        const setup = await makeApp();
        const { a, studentsA } = await twoOrgs(setup);
        const invite = (await a.agent.post('/api/org/invites').send({ kind: 'teacher' })).body.invite as { token: string };
        const colleague = request.agent(setup.app);
        const reg = await colleague.post('/api/auth/register-teacher').send(form('colleague', { invite: invite.token }));
        expect(reg.status).toBe(201);
        expect(reg.body.user).toMatchObject({ role: 'teacher', org: { name: 'Школа А', isOwner: false } });
        const list = (await colleague.get('/api/teacher/students')).body.students as Array<{ id: string }>;
        expect(list.map((item) => item.id).sort()).toEqual(studentsA.map((item) => item.id).sort());
        // Коллега не владелец: ни ссылок для учителей, ни переименования, ни удаления коллег.
        expect((await colleague.post('/api/org/invites').send({ kind: 'teacher' })).status).toBe(403);
        expect((await colleague.patch('/api/org').send({ name: 'Захват' })).status).toBe(403);
        expect((await colleague.delete(`/api/org/teachers/${a.user.id}`)).status).toBe(403);
        // Но ссылки для учеников делает.
        expect((await colleague.post('/api/org/invites').send({ kind: 'student' })).status).toBe(201);
        const team = (await a.agent.get('/api/org')).body.teachers as Array<{ login: string; isOwner: boolean }>;
        expect(team.map((item) => item.login).sort()).toEqual(['colleague', 'teacher_a']);
        expect((await colleague.get('/api/org')).body.invites.every((item: { kind: string }) => item.kind === 'student')).toBe(true);
    });

    test('владелец убирает коллегу: аккаунт остаётся, учеников у него нет; владельца убрать нельзя', async () => {
        const setup = await makeApp();
        const { a } = await twoOrgs(setup);
        const invite = (await a.agent.post('/api/org/invites').send({ kind: 'teacher' })).body.invite as { token: string };
        const colleague = request.agent(setup.app);
        const reg = await colleague.post('/api/auth/register-teacher').send(form('colleague', { invite: invite.token }));
        expect((await a.agent.delete(`/api/org/teachers/${reg.body.user.id}`)).status).toBe(200);
        const me = (await colleague.get('/api/auth/me')).body.user;
        expect(me.org.name).toMatch(/^Организация /);
        expect(me.org.isOwner).toBe(true);
        expect((await colleague.get('/api/teacher/students')).body.students).toHaveLength(0);
        expect((await a.agent.get('/api/teacher/students')).body.students).toHaveLength(2);
        expect((await a.agent.delete(`/api/org/teachers/${a.user.id}`)).status).toBe(400);
    });

    test('владелец переименовывает организацию', async () => {
        const setup = await makeApp();
        const { a } = await twoOrgs(setup);
        expect((await a.agent.patch('/api/org').send({ name: 'Гимназия 7' })).status).toBe(200);
        expect((await a.agent.get('/api/auth/me')).body.user.org.name).toBe('Гимназия 7');
        expect((await a.agent.patch('/api/org').send({ name: 'x' })).status).toBe(400);
    });
});

describe('администратор', () => {
    test('видит все организации и работает с чужими учениками, выбрав организацию заголовком', async () => {
        const setup = await makeApp();
        const { studentsB } = await twoOrgs(setup);
        const admin = await loginAs(setup.app, 'admin', 'admin-pass');
        const orgs = (await admin.get('/api/admin/orgs')).body.orgs as Array<{ name: string; teachers: number; students: number; isMain: boolean }>;
        expect(orgs.map((org) => org.name)).toEqual(['Основная', 'Школа А', 'Школа Б']);
        expect(orgs.find((org) => org.name === 'Школа Б')).toMatchObject({ teachers: 1, students: 2 });
        expect(orgs[0].isMain).toBe(true);
        expect((await admin.get('/api/teacher/students').set('x-pioneer-org', '*')).body.students).toHaveLength(4);
        expect((await admin.get('/api/teacher/students')).body.students).toHaveLength(0);
        expect((await admin.get(`/api/teacher/students/${studentsB[0].id}`)).status).toBe(200);
        expect((await admin.post(`/api/teacher/students/${studentsB[0].id}/view`)).status).toBe(200);
    });

    test('сбрасывает пароль учителю; блокировка организации не пускает её учителей, а «Основную» блокировать нельзя', async () => {
        const setup = await makeApp();
        const { b } = await twoOrgs(setup);
        const admin = await loginAs(setup.app, 'admin', 'admin-pass');
        const reset = await admin.post(`/api/admin/teachers/${b.user.id}/reset-password`);
        expect(reset.status).toBe(200);
        // Сброс пароля закрывает старые входы учителя; он входит заново новым паролем.
        expect((await b.agent.get('/api/teacher/students')).status).toBe(401);
        const again = await loginAs(setup.app, 'teacher_b', reset.body.password);
        const orgB = setup.store.findById(b.user.id)!.orgId;
        expect((await admin.patch(`/api/admin/orgs/${orgB}`).send({ blocked: true })).status).toBe(200);
        expect((await again.get('/api/teacher/students')).status).toBe(403);
        expect((await request(setup.app).post('/api/auth/login').send({ login: 'teacher_b', password: reset.body.password })).status).toBe(403);
        expect((await admin.patch(`/api/admin/orgs/${MAIN_ORG_ID}`).send({ blocked: true })).status).toBe(400);
        expect((await admin.patch(`/api/admin/orgs/${orgB}`).send({ blocked: false })).status).toBe(200);
        expect((await request(setup.app).post('/api/auth/login').send({ login: 'teacher_b', password: reset.body.password })).status).toBe(200);
    });

    test('удаление организации переносит учеников в «Основную», удаляет учителей и классы; «Основную» удалить нельзя', async () => {
        const setup = await makeApp();
        const { b, studentsB, classB } = await twoOrgs(setup);
        const admin = await loginAs(setup.app, 'admin', 'admin-pass');
        const orgB = setup.store.findById(b.user.id)!.orgId;
        const res = await admin.delete(`/api/admin/orgs/${orgB}`);
        expect(res.body).toEqual({ movedStudents: 2, removedTeachers: 1 });
        expect(setup.store.findById(b.user.id)).toBeUndefined();
        expect(setup.store.findClass(classB)).toBeUndefined();
        const moved = setup.store.findById(studentsB[0].id)!;
        expect(moved.orgId).toBe(MAIN_ORG_ID);
        expect(moved.classId).toBeNull();
        expect((await b.agent.get('/api/auth/me')).body.user).toBeNull();
        expect((await admin.delete(`/api/admin/orgs/${MAIN_ORG_ID}`)).status).toBe(400);
    });
});

describe('миграция файла аккаунтов', () => {
    const user = (id: string, role: string, createdAt: number, extra: Record<string, unknown> = {}) => ({ id, role, login: id, salt: 's', hash: 'h', fullName: id, createdAt, progress: {}, ...extra });

    test('версия 2: самый старый учитель становится админом, всё остальное уходит в «Основную»', () => {
        const data = migrateData({
            version: 2,
            users: [user('t_new', 'teacher', 200), user('t_old', 'teacher', 100), user('s1', 'student', 300, { classId: 'c1' })],
            classes: [{ id: 'c1', name: '8А', createdAt: 1 }],
            sessions: []
        });
        expect(data.version).toBe(3);
        expect(data.users.find((item) => item.id === 't_old')!.role).toBe('admin');
        expect(data.users.find((item) => item.id === 't_new')!.role).toBe('teacher');
        expect(data.users.every((item) => item.orgId === MAIN_ORG_ID)).toBe(true);
        expect(data.classes[0].orgId).toBe(MAIN_ORG_ID);
        expect(data.users.find((item) => item.id === 's1')!.classId).toBe('c1');
        const main = data.orgs.find((org) => org.id === MAIN_ORG_ID)!;
        expect(main).toMatchObject({ name: 'Основная', ownerId: 't_old' });
        expect(data.invites).toEqual([]);
    });

    test('повторная миграция версии 3 ничего не меняет, а класс чужой организации у ученика сбрасывается', () => {
        const first = migrateData({ version: 2, users: [user('t', 'teacher', 1), user('s', 'student', 2)], classes: [{ id: 'c', name: 'К', createdAt: 1 }], sessions: [] });
        first.orgs.push({ id: 'o2', name: 'Вторая', ownerId: '', createdAt: 5 });
        first.classes.push({ id: 'c2', name: 'Чужой', createdAt: 1, orgId: 'o2' });
        first.users.find((item) => item.id === 's')!.classId = 'c2';
        const again = migrateData(JSON.parse(JSON.stringify(first)));
        expect(again.users.find((item) => item.id === 's')!.classId).toBeNull();
        expect(again.users.find((item) => item.id === 't')!.role).toBe('admin');
        expect(again.orgs.map((org) => org.id)).toEqual([MAIN_ORG_ID, 'o2']);
    });

    test('файл версии 2 читается, перед записью остаётся копия, ученики и прогресс не потеряны', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orgs-file-'));
        const file = path.join(dir, 'accounts.json');
        const old = {
            version: 2,
            users: [user('t', 'teacher', 1), user('s', 'student', 2, { progress: { blocks: { 'bk-takeoff-land': { at: 5, by: 'student' } } } })],
            classes: [{ id: 'c', name: '8А', createdAt: 1 }],
            sessions: []
        };
        fs.writeFileSync(file, JSON.stringify(old));
        const store = new AccountStore(file);
        expect(fs.existsSync(`${file}.v2.bak`)).toBe(true);
        expect(JSON.parse(fs.readFileSync(`${file}.v2.bak`, 'utf8')).version).toBe(2);
        expect(store.findById('t')!.role).toBe('admin');
        expect(store.findById('s')!.orgId).toBe(MAIN_ORG_ID);
        expect(Object.keys(store.findById('s')!.progress.blocks)).toEqual(['bk-takeoff-land']);
        expect(store.studentsOf(MAIN_ORG_ID)).toHaveLength(1);
        expect(store.classesOf(MAIN_ORG_ID)).toHaveLength(1);
        // После сохранения файл читается тем же кодом и содержит организации.
        await store.createInvite(store.findOrg(MAIN_ORG_ID)!, 'student', store.findById('t')!);
        await new Promise((resolve) => setTimeout(resolve, 50));
        const again = new AccountStore(file);
        expect(again.orgs.map((org) => org.id)).toEqual([MAIN_ORG_ID]);
        expect(again.invitesOf(MAIN_ORG_ID)).toHaveLength(1);
    });

    test('старый учитель из окружения входит как админ и видит всех прежних учеников', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orgs-env-'));
        const file = path.join(dir, 'accounts.json');
        fs.writeFileSync(file, JSON.stringify({ version: 2, users: [], classes: [], sessions: [] }));
        const store = new AccountStore(file);
        await ensureTeacher(store, { TEACHER_LOGIN: 'old_teacher', TEACHER_PASSWORD: 'old-pass-1' } as NodeJS.ProcessEnv);
        const app = express();
        app.use(express.json());
        registerAccountRoutes(app, store);
        await request(app).post('/api/auth/register').send(form('pupil'));
        const agent = await loginAs(app, 'old_teacher', 'old-pass-1');
        expect((await agent.get('/api/auth/me')).body.user).toMatchObject({ role: 'admin', org: { id: MAIN_ORG_ID, name: 'Основная', isOwner: true } });
        expect((await agent.get('/api/teacher/students')).body.students).toHaveLength(1);
    });
});

// Не даём тесту повиснуть на таймерах сохранения сессий.
afterAll(() => { jest.useRealTimers(); });
