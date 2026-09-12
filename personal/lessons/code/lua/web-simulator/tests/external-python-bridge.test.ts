import express from 'express';
import request from 'supertest';
import {
    clearExternalPythonBridgeStore,
    registerExternalPythonBridgeRoutes
} from '../server/external-python-bridge.js';

function makeApp() {
    const app = express();
    app.use(express.json());
    registerExternalPythonBridgeRoutes(app);
    return app;
}

const app = makeApp();

beforeEach(() => {
    clearExternalPythonBridgeStore();
});

describe('POST /api/external-python-bridge/event', () => {
    test('records an event and returns an incrementing eventId', async () => {
        const first = await request(app)
            .post('/api/external-python-bridge/event')
            .send({ sessionId: 's1', method: 'arm' });
        expect(first.status).toBe(200);
        expect(first.body).toMatchObject({ ok: true, eventId: 1 });

        const second = await request(app)
            .post('/api/external-python-bridge/event')
            .send({ sessionId: 's1', method: 'takeoff' });
        expect(second.body.eventId).toBe(2);
    });

    test('rejects a request without sessionId', async () => {
        const res = await request(app)
            .post('/api/external-python-bridge/event')
            .send({ method: 'arm' });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });

    test('rejects a request without method', async () => {
        const res = await request(app)
            .post('/api/external-python-bridge/event')
            .send({ sessionId: 's1' });
        expect(res.status).toBe(400);
    });

    test('defaults connectionMethod to udpout for an unrecognized value', async () => {
        await request(app)
            .post('/api/external-python-bridge/event')
            .send({ sessionId: 's1', method: 'arm', connectionMethod: 'not-a-real-method' });

        const events = await request(app).get('/api/external-python-bridge/events');
        expect(events.body.events[0].connectionMethod).toBe('udpout');
    });
});

describe('GET /api/external-python-bridge/events', () => {
    test('filters by afterId', async () => {
        await request(app).post('/api/external-python-bridge/event').send({ sessionId: 's1', method: 'arm' });
        await request(app).post('/api/external-python-bridge/event').send({ sessionId: 's1', method: 'takeoff' });
        await request(app).post('/api/external-python-bridge/event').send({ sessionId: 's1', method: 'land' });

        const res = await request(app).get('/api/external-python-bridge/events?afterId=1');
        expect(res.body.events).toHaveLength(2);
        expect(res.body.events.map((event: { method: string }) => event.method)).toEqual(['takeoff', 'land']);
        expect(res.body.latestId).toBe(3);
    });

    test('returns all events when afterId is omitted', async () => {
        await request(app).post('/api/external-python-bridge/event').send({ sessionId: 's1', method: 'arm' });
        const res = await request(app).get('/api/external-python-bridge/events');
        expect(res.body.events).toHaveLength(1);
    });
});

describe('POST/GET /api/external-python-bridge/state', () => {
    const baseConnection = {
        sessionId: 's1',
        droneIp: '192.168.4.1',
        mavlinkPort: 8001,
        connectionMethod: 'udpout' as const
    };

    test('round-trips state for a matching sessionId/connection', async () => {
        await request(app)
            .post('/api/external-python-bridge/state')
            .send({
                ...baseConnection,
                droneId: 'drone_1',
                pointReached: true,
                cameraConnected: false,
                autopilotState: 'MISSION',
                localPosition: { x: 1, y: 2, z: 3 }
            });

        const res = await request(app)
            .get('/api/external-python-bridge/state')
            .query(baseConnection);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            ok: true,
            droneId: 'drone_1',
            cameraConnected: false,
            autopilotState: 'MISSION',
            localPosition: { x: 1, y: 2, z: 3 }
        });
    });

    test('normalizes common simulator IPs to the same state bucket', async () => {
        await request(app)
            .post('/api/external-python-bridge/state')
            .send({ ...baseConnection, droneIp: '127.0.0.1', droneId: 'drone_1' });

        // Reading back with a different "simulator-equivalent" IP should hit the same bucket.
        const res = await request(app)
            .get('/api/external-python-bridge/state')
            .query({ ...baseConnection, droneIp: '192.168.4.1' });

        expect(res.body.droneId).toBe('drone_1');
    });

    test('unknown session/connection combination returns nulls, not an error', async () => {
        const res = await request(app)
            .get('/api/external-python-bridge/state')
            .query({ sessionId: 'never-seen', droneIp: '10.0.0.9', mavlinkPort: 8001, connectionMethod: 'udpout' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true, droneId: null, autopilotState: null, localPosition: null });
    });

    test('rejects state read/write without sessionId', async () => {
        const writeRes = await request(app).post('/api/external-python-bridge/state').send({ droneIp: '1.2.3.4' });
        expect(writeRes.status).toBe(400);

        const readRes = await request(app).get('/api/external-python-bridge/state').query({ droneIp: '1.2.3.4' });
        expect(readRes.status).toBe(400);
    });

    test('rejects a malformed localPosition instead of storing garbage', async () => {
        await request(app)
            .post('/api/external-python-bridge/state')
            .send({ ...baseConnection, droneId: 'drone_1', localPosition: { x: 'not-a-number', y: 0, z: 0 } });

        const res = await request(app).get('/api/external-python-bridge/state').query(baseConnection);
        expect(res.body.localPosition).toBeNull();
    });
});

describe('POST /api/external-python-bridge/clear', () => {
    test('empties both the event log and the state store', async () => {
        await request(app).post('/api/external-python-bridge/event').send({ sessionId: 's1', method: 'arm' });
        await request(app)
            .post('/api/external-python-bridge/state')
            .send({ sessionId: 's1', droneIp: '1.2.3.4', mavlinkPort: 8001, connectionMethod: 'udpout', droneId: 'drone_1' });

        await request(app).post('/api/external-python-bridge/clear');

        const events = await request(app).get('/api/external-python-bridge/events');
        expect(events.body.events).toHaveLength(0);
        expect(events.body.latestId).toBe(0);

        const state = await request(app)
            .get('/api/external-python-bridge/state')
            .query({ sessionId: 's1', droneIp: '1.2.3.4', mavlinkPort: 8001, connectionMethod: 'udpout' });
        expect(state.body.droneId).toBeNull();
    });
});
