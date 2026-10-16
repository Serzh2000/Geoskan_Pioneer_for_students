/**
 * Tests for the HTTP-level validation and abuse-limit logic in
 * server/python-runtime.ts (droneId/code validation, the concurrency cap,
 * the script-size cap, and stop/status bookkeeping).
 *
 * These do spawn real child processes (there is no exported hook to fake
 * child_process.spawn), but pythonExecutable is pointed at the current
 * Node binary instead of a real "python" — we only care that a process
 * starts and that the HTTP responses/session bookkeeping around it are
 * correct, not that pioneer_sdk actually runs.
 */
import express from 'express';
import os from 'os';
import request from 'supertest';
import { registerPythonRuntimeRoutes, stopAllLocalPythonRuns } from '../server/python-runtime.js';

function makeApp() {
    const app = express();
    // Match server.ts's actual body-size limit; the default express.json() limit
    // (100kb) would otherwise reject large-script requests before they even reach
    // the route's own MAX_SCRIPT_LENGTH check.
    app.use(express.json({ limit: '10mb' }));
    registerPythonRuntimeRoutes(app, os.tmpdir());
    return app;
}

const app = makeApp();
// A process guaranteed to exist in the test environment; python-runtime.ts
// doesn't care what it is for these tests, only that spawn() succeeds.
const fakePythonConfig = { pythonExecutable: process.execPath };
let droneCounter = 0;
function uniqueDroneId(): string {
    droneCounter += 1;
    return `test-drone-${droneCounter}`;
}

afterAll(() => {
    stopAllLocalPythonRuns();
});

describe('POST /api/python-runtime/run — validation', () => {
    test('rejects a missing droneId', async () => {
        const res = await request(app).post('/api/python-runtime/run').send({ code: 'print(1)' });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });

    test('rejects empty/whitespace-only code', async () => {
        const res = await request(app).post('/api/python-runtime/run').send({ droneId: uniqueDroneId(), code: '   ' });
        expect(res.status).toBe(400);
    });

    test('starts a run for a valid request', async () => {
        const res = await request(app)
            .post('/api/python-runtime/run')
            .send({ droneId: uniqueDroneId(), code: 'print(1)', config: fakePythonConfig });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true, running: true });
    });

    test('rejects a second run for a droneId that already has one in flight', async () => {
        const droneId = uniqueDroneId();
        const first = await request(app)
            .post('/api/python-runtime/run')
            .send({ droneId, code: 'print(1)', config: fakePythonConfig });
        expect(first.status).toBe(200);

        const second = await request(app)
            .post('/api/python-runtime/run')
            .send({ droneId, code: 'print(2)', config: fakePythonConfig });
        expect(second.status).toBe(409);
        expect(second.body.ok).toBe(false);
    });

    test('rejects a script over the size limit with 413', async () => {
        const res = await request(app)
            .post('/api/python-runtime/run')
            .send({ droneId: uniqueDroneId(), code: 'a'.repeat(200_001), config: fakePythonConfig });
        expect(res.status).toBe(413);
        expect(res.body.ok).toBe(false);
    });

    test('accepts a script right at the size limit', async () => {
        const res = await request(app)
            .post('/api/python-runtime/run')
            .send({ droneId: uniqueDroneId(), code: 'a'.repeat(200_000), config: fakePythonConfig });
        expect(res.status).toBe(200);
    });
});

describe('POST /api/python-runtime/stop', () => {
    test('rejects a missing droneId', async () => {
        const res = await request(app).post('/api/python-runtime/stop').send({});
        expect(res.status).toBe(400);
    });

    test('reports stopped:false for a droneId with no session', async () => {
        const res = await request(app).post('/api/python-runtime/stop').send({ droneId: 'never-started' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true, stopped: false });
    });

    test('reports stopped:true for a running session', async () => {
        const droneId = uniqueDroneId();
        await request(app).post('/api/python-runtime/run').send({ droneId, code: 'print(1)', config: fakePythonConfig });

        const res = await request(app).post('/api/python-runtime/stop').send({ droneId });
        expect(res.body).toMatchObject({ ok: true, stopped: true });
    });
});

describe('GET /api/python-runtime/status', () => {
    test('rejects a missing droneId', async () => {
        const res = await request(app).get('/api/python-runtime/status');
        expect(res.status).toBe(400);
    });

    test('returns 404 for a droneId with no session', async () => {
        const res = await request(app).get('/api/python-runtime/status?droneId=never-started');
        expect(res.status).toBe(404);
    });

    test('returns session info after starting a run', async () => {
        const droneId = uniqueDroneId();
        await request(app).post('/api/python-runtime/run').send({ droneId, code: 'print(1)', config: fakePythonConfig });

        const res = await request(app).get(`/api/python-runtime/status?droneId=${droneId}`);
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(typeof res.body.startedAt).toBe('string');
        expect(Array.isArray(res.body.output)).toBe(true);
    });
});
