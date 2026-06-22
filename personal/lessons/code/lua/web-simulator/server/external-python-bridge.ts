import express from 'express';
import type { PioneerConnectionMethod } from './pioneer-connection.js';

export interface ExternalPythonBridgeEvent {
    id: number;
    sessionId: string;
    timestamp: string;
    droneName: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
    device: string;
    baud: number;
    method: string;
    args: unknown[];
    kwargs: Record<string, unknown>;
}

export interface ExternalPythonBridgePosition {
    x: number;
    y: number;
    z: number;
}

export interface ExternalPythonBridgeState {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
    droneId: string;
    pointReached: boolean;
    cameraConnected: boolean;
    cameraFrameDataUrl: string | null;
    autopilotState: string | null;
    localPosition: ExternalPythonBridgePosition | null;
    updatedAt: string;
}

const externalPythonBridgeEvents: ExternalPythonBridgeEvent[] = [];
const externalPythonBridgeStates = new Map<string, ExternalPythonBridgeState>();
const MAX_EXTERNAL_BRIDGE_EVENTS = 1000;
let nextExternalBridgeEventId = 0;

function normalizeExternalBridgeKeyPart(value: string): string {
    return value.trim().toLowerCase();
}

function buildExternalBridgeStateKey(input: {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
}): string {
    return [
        normalizeExternalBridgeKeyPart(input.sessionId),
        normalizeExternalBridgeKeyPart(input.connectionMethod),
        normalizeExternalBridgeKeyPart(input.droneIp),
        String(Number.isFinite(input.mavlinkPort) ? input.mavlinkPort : 8001)
    ].join('::');
}

export function recordExternalPythonBridgeEvent(payload: Omit<ExternalPythonBridgeEvent, 'id' | 'timestamp'>): ExternalPythonBridgeEvent {
    nextExternalBridgeEventId += 1;
    const event: ExternalPythonBridgeEvent = {
        id: nextExternalBridgeEventId,
        timestamp: new Date().toISOString(),
        ...payload
    };

    externalPythonBridgeEvents.push(event);
    if (externalPythonBridgeEvents.length > MAX_EXTERNAL_BRIDGE_EVENTS) {
        externalPythonBridgeEvents.splice(0, externalPythonBridgeEvents.length - MAX_EXTERNAL_BRIDGE_EVENTS);
    }

    return event;
}

export function updateExternalPythonBridgeState(payload: Omit<ExternalPythonBridgeState, 'updatedAt'>): ExternalPythonBridgeState {
    const state: ExternalPythonBridgeState = {
        ...payload,
        updatedAt: new Date().toISOString()
    };
    externalPythonBridgeStates.set(buildExternalBridgeStateKey(state), state);
    return state;
}

export function getExternalPythonBridgeState(input: {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
}): ExternalPythonBridgeState | null {
    return externalPythonBridgeStates.get(buildExternalBridgeStateKey(input)) ?? null;
}

function parsePositionPayload(value: unknown): ExternalPythonBridgePosition | null {
    if (typeof value !== 'object' || !value) {
        return null;
    }

    const x = Number((value as Record<string, unknown>).x);
    const y = Number((value as Record<string, unknown>).y);
    const z = Number((value as Record<string, unknown>).z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    return { x, y, z };
}

export function registerExternalPythonBridgeRoutes(app: express.Express): void {
    app.post('/api/external-python-bridge/event', (req: express.Request, res: express.Response) => {
        // #region debug-point B:external-bridge-event-route
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7777/event', s = 'camera-mavlink-reset'; try { const e = fs.readFileSync('.dbg/camera-mavlink-reset.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'B', location: 'server/external-python-bridge.ts:event', msg: '[DEBUG] external bridge event route hit', data: { method: req.body?.method ?? null, sessionId: req.body?.sessionId ?? null, droneIp: req.body?.droneIp ?? null, mavlinkPort: req.body?.mavlinkPort ?? null, connectionMethod: req.body?.connectionMethod ?? null }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
        const droneName = typeof req.body?.droneName === 'string' ? req.body.droneName.trim() : 'Pioneer';
        const droneIp = typeof req.body?.droneIp === 'string' ? req.body.droneIp.trim() : '';
        const mavlinkPort = Number.isFinite(req.body?.mavlinkPort) ? Number(req.body.mavlinkPort) : 8001;
        const connectionMethod = req.body?.connectionMethod === 'serial' || req.body?.connectionMethod === 'udpin' || req.body?.connectionMethod === 'camera'
            ? req.body.connectionMethod as PioneerConnectionMethod
            : 'udpout';
        const device = typeof req.body?.device === 'string' ? req.body.device.trim() : '/dev/serial0';
        const baud = Number.isFinite(req.body?.baud) ? Number(req.body.baud) : 115200;
        const method = typeof req.body?.method === 'string' ? req.body.method.trim() : '';
        const args = Array.isArray(req.body?.args) ? req.body.args : [];
        const kwargs = typeof req.body?.kwargs === 'object' && req.body?.kwargs
            ? req.body.kwargs as Record<string, unknown>
            : {};

        if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'sessionId обязателен.' });
        }
        if (!method) {
            return res.status(400).json({ ok: false, error: 'method обязателен.' });
        }

        const event = recordExternalPythonBridgeEvent({
            sessionId,
            droneName,
            droneIp,
            mavlinkPort,
            connectionMethod,
            device,
            baud,
            method,
            args,
            kwargs
        });

        return res.json({
            ok: true,
            eventId: event.id
        });
    });

    app.post('/api/external-python-bridge/state', (req: express.Request, res: express.Response) => {
        const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
        const droneIp = typeof req.body?.droneIp === 'string' ? req.body.droneIp.trim() : '';
        const mavlinkPort = Number.isFinite(req.body?.mavlinkPort) ? Number(req.body.mavlinkPort) : 8001;
        const connectionMethod = req.body?.connectionMethod === 'serial' || req.body?.connectionMethod === 'udpin' || req.body?.connectionMethod === 'camera'
            ? req.body.connectionMethod as PioneerConnectionMethod
            : 'udpout';
        const droneId = typeof req.body?.droneId === 'string' ? req.body.droneId.trim() : '';
        const pointReached = Boolean(req.body?.pointReached);
        const cameraConnected = Boolean(req.body?.cameraConnected);
        const cameraFrameDataUrl = typeof req.body?.cameraFrameDataUrl === 'string' && req.body.cameraFrameDataUrl.trim()
            ? req.body.cameraFrameDataUrl
            : null;
        const autopilotState = typeof req.body?.autopilotState === 'string' && req.body.autopilotState.trim()
            ? req.body.autopilotState.trim()
            : null;
        const localPosition = parsePositionPayload(req.body?.localPosition);

        if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'sessionId обязателен.' });
        }

        const state = updateExternalPythonBridgeState({
            sessionId,
            droneIp,
            mavlinkPort,
            connectionMethod,
            droneId,
            pointReached,
            cameraConnected,
            cameraFrameDataUrl,
            autopilotState,
            localPosition
        });

        return res.json({
            ok: true,
            updatedAt: state.updatedAt
        });
    });

    app.get('/api/external-python-bridge/state', (req: express.Request, res: express.Response) => {
        const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
        const droneIp = typeof req.query.droneIp === 'string' ? req.query.droneIp.trim() : '';
        const mavlinkPort = Number.parseInt(typeof req.query.mavlinkPort === 'string' ? req.query.mavlinkPort : '8001', 10) || 8001;
        const connectionMethod = req.query.connectionMethod === 'serial' || req.query.connectionMethod === 'udpin' || req.query.connectionMethod === 'camera'
            ? req.query.connectionMethod as PioneerConnectionMethod
            : 'udpout';

        if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'sessionId обязателен.' });
        }

        const state = externalPythonBridgeStates.get(buildExternalBridgeStateKey({
            sessionId,
            droneIp,
            mavlinkPort,
            connectionMethod
        }));

        return res.json({
            ok: true,
            pointReached: state?.pointReached ?? false,
            cameraConnected: state?.cameraConnected ?? false,
            cameraFrameDataUrl: state?.cameraFrameDataUrl ?? null,
            autopilotState: state?.autopilotState ?? null,
            localPosition: state?.localPosition ?? null,
            droneId: state?.droneId ?? null,
            updatedAt: state?.updatedAt ?? null
        });
    });

    app.get('/api/external-python-bridge/events', (req: express.Request, res: express.Response) => {
        const afterId = Number.parseInt(typeof req.query.afterId === 'string' ? req.query.afterId : '0', 10) || 0;
        return res.json({
            ok: true,
            events: externalPythonBridgeEvents.filter((event) => event.id > afterId),
            latestId: nextExternalBridgeEventId
        });
    });
}
