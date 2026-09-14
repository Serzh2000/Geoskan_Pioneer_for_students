/**
 * Регрессия на баг из этой сессии: общий rate-limit на /api (30 запросов/60с,
 * server.ts:createSensitiveRouteLimiter) душил собственный поллинг внешнего
 * Python-моста (external-bridge.ts опрашивает /state и /events каждые
 * 100-250мс — до ~20 запросов/сек с одной привязкой дрона). Тест строит ту же
 * пару лимитеров, что и createApp() в server.ts, на игрушечном приложении —
 * без реального listen() и без поднятия MAVLink-UDP сокета (registerMavlinkBridgeRoutes
 * в server.ts делает это при регистрации, что лишнее и рискованное для юнит-теста).
 */
import express from 'express';
import request from 'supertest';
import { BRIDGE_POLL_PATHS, createBridgePollLimiter, createSensitiveRouteLimiter } from '../server.js';

function makeApp(): express.Express {
    const app = express();
    app.use('/api', createSensitiveRouteLimiter());
    app.use(Array.from(BRIDGE_POLL_PATHS), createBridgePollLimiter());
    app.get('/api/external-python-bridge/state', (_req, res) => res.json({ ok: true }));
    app.get('/api/external-python-bridge/events', (_req, res) => res.json({ ok: true, events: [] }));
    app.post('/api/mavlink-bridge/connections', (_req, res) => res.json({ ok: true }));
    return app;
}

describe('server.ts: поллинг внешнего моста не душится общим rate-limit', () => {
    test('35 запросов подряд к /state — ни один не блокируется (общий лимит был бы 30/60с)', async () => {
        const app = makeApp();
        for (let i = 0; i < 35; i += 1) {
            const res = await request(app).get('/api/external-python-bridge/state');
            expect(res.status).toBe(200);
        }
    });

    test('35 запросов подряд к /events — ни один не блокируется', async () => {
        const app = makeApp();
        for (let i = 0; i < 35; i += 1) {
            const res = await request(app).get('/api/external-python-bridge/events');
            expect(res.status).toBe(200);
        }
    });

    test('обычный "чувствительный" маршрут по-прежнему ограничен основным лимитом', async () => {
        const app = makeApp();
        let sawRateLimited = false;
        for (let i = 0; i < 35; i += 1) {
            const res = await request(app).post('/api/mavlink-bridge/connections').send({});
            if (res.status === 429) {
                sawRateLimited = true;
                break;
            }
        }
        expect(sawRateLimited).toBe(true);
    });
});
