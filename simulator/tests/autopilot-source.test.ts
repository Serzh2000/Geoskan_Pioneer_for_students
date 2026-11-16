/**
 * Исходный файл параметров автопилота: читать может любой, а перезаписать общий файл на сервере нельзя.
 * Запись и путь к файлу на диске доступны только локально (разработка, настольная сборка) или по явному флагу.
 */
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { isAutopilotSourceWritable, registerAutopilotSourceRoutes } from '../server/autopilot-source.js';

function makeApp(writable: boolean) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-source-'));
    const file = path.join(dir, 'profile.properties');
    fs.writeFileSync(file, 'Copter_alt_b=0.5\n');
    const app = express();
    app.use(express.json());
    registerAutopilotSourceRoutes(app, { filePath: file, writable });
    return { app, file };
}

describe('исходный файл параметров автопилота', () => {
    test('на общем сервере запись закрыта: файл не меняется, путь на диске не раскрывается', async () => {
        const { app, file } = makeApp(false);
        const read = await request(app).get('/api/autopilot-parameters');
        expect(read.status).toBe(200);
        expect(read.body).toMatchObject({ fileName: 'profile.properties', writable: false, content: 'Copter_alt_b=0.5\n' });
        expect(read.body.filePath).toBeUndefined();

        const write = await request(app).put('/api/autopilot-parameters').send({ content: 'взлом=1\n' });
        expect(write.status).toBe(403);
        expect(fs.readFileSync(file, 'utf8')).toBe('Copter_alt_b=0.5\n');
    });

    test('локально запись работает, путь известен, пустое тело отклоняется', async () => {
        const { app, file } = makeApp(true);
        const read = await request(app).get('/api/autopilot-parameters');
        expect(read.body).toMatchObject({ writable: true, filePath: file });
        expect((await request(app).put('/api/autopilot-parameters').send({})).status).toBe(400);
        const write = await request(app).put('/api/autopilot-parameters').send({ content: 'Copter_alt_b=0.7\n' });
        expect(write.status).toBe(200);
        expect(fs.readFileSync(file, 'utf8')).toBe('Copter_alt_b=0.7\n');
    });

    test('когда запись разрешена: разработка, настольная сборка или явный флаг, а боевая сборка закрыта', () => {
        const prod = { distBuild: true, packaged: false };
        expect(isAutopilotSourceWritable({}, prod)).toBe(false);
        expect(isAutopilotSourceWritable({ AUTOPILOT_SOURCE_WRITE: '0' }, prod)).toBe(false);
        expect(isAutopilotSourceWritable({ AUTOPILOT_SOURCE_WRITE: '1' }, prod)).toBe(true);
        expect(isAutopilotSourceWritable({}, { distBuild: true, packaged: true })).toBe(true);
        expect(isAutopilotSourceWritable({}, { distBuild: false, packaged: false })).toBe(true);
    });
});
