/**
 * The concurrency cap (PYTHON_RUNTIME_MAX_CONCURRENT) in isolation, in its own
 * file so its many near-simultaneous spawns don't interact with sessions
 * created by python-runtime.test.ts's other cases.
 *
 * Requests are fired concurrently (Promise.all), not awaited one at a time:
 * the fake "python" process (the current Node binary, fed the wrapper's
 * `-u <path>` args it doesn't understand) exits almost immediately, so a
 * sequential loop can't reliably keep the earlier sessions "running" long
 * enough to still count against the cap by the time later requests land.
 * Firing them together keeps every request's synchronous
 * count-then-spawn check ahead of any child process's exit callback.
 */
import express from 'express';
import os from 'os';
import request from 'supertest';
import { registerPythonRuntimeRoutes, stopAllLocalPythonRuns } from '../server/python-runtime.js';

function makeApp() {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    registerPythonRuntimeRoutes(app, os.tmpdir());
    return app;
}

const app = makeApp();
const fakePythonConfig = { pythonExecutable: process.execPath };

afterAll(() => {
    stopAllLocalPythonRuns();
});

test('rejects runs past the server-wide concurrent-run limit with 429', async () => {
    // Default cap is 20 (PYTHON_RUNTIME_MAX_CONCURRENT); requesting 25 at once
    // must leave at least 5 rejected.
    const responses = await Promise.all(
        Array.from({ length: 25 }, (_, index) =>
            request(app)
                .post('/api/python-runtime/run')
                .send({ droneId: `concurrency-${index}`, code: 'print(1)', config: fakePythonConfig }))
    );

    const okCount = responses.filter((res) => res.status === 200).length;
    const limitedCount = responses.filter((res) => res.status === 429).length;

    expect(okCount).toBeLessThanOrEqual(20);
    expect(limitedCount).toBeGreaterThanOrEqual(5);
    expect(okCount + limitedCount).toBe(25);
    for (const res of responses) {
        if (res.status === 429) {
            expect(res.body.ok).toBe(false);
        }
    }
}, 30_000);
