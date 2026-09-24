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
    /** Latest camera frame, JPEG bytes (POST /frame, or a data URL on /state). */
    cameraFrame: Buffer | null;
    autopilotState: string | null;
    localPosition: ExternalPythonBridgePosition | null;
    updatedAt: string;
}

/**
 * State as the browser reports it. The frame is optional: absent - keep the
 * last one (frames arrive separately on POST /frame); a data URL or null -
 * replace it (older browsers and the IDLE hook still send it inline).
 */
export type ExternalPythonBridgeStateUpdate = Omit<ExternalPythonBridgeState, 'updatedAt' | 'cameraFrame'> & {
    cameraFrameDataUrl?: string | null;
};

const externalPythonBridgeEvents: ExternalPythonBridgeEvent[] = [];
const externalPythonBridgeStates = new Map<string, ExternalPythonBridgeState>();
const MAX_EXTERNAL_BRIDGE_EVENTS = 1000;
let nextExternalBridgeEventId = 0;

function normalizeExternalBridgeKeyPart(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeExternalBridgeIp(value: string): string {
    const normalized = normalizeExternalBridgeKeyPart(value);
    if (!normalized) {
        return '';
    }
    if (normalized === '127.0.0.1' || normalized === 'localhost' || normalized === '192.168.4.1') {
        return 'simulator-default';
    }
    return normalized;
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
        normalizeExternalBridgeIp(input.droneIp),
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

function decodeJpegDataUrl(dataUrl: string | null): Buffer | null {
    if (!dataUrl) return null;
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const buffer = Buffer.from(dataUrl.slice(comma + 1), 'base64');
    return buffer.length ? buffer : null;
}

export function updateExternalPythonBridgeState(payload: ExternalPythonBridgeStateUpdate): ExternalPythonBridgeState {
    const { cameraFrameDataUrl, ...rest } = payload;
    const key = buildExternalBridgeStateKey(rest);
    const previous = externalPythonBridgeStates.get(key);
    const state: ExternalPythonBridgeState = {
        ...rest,
        cameraFrame: cameraFrameDataUrl === undefined
            ? previous?.cameraFrame ?? null
            : decodeJpegDataUrl(cameraFrameDataUrl),
        updatedAt: new Date().toISOString()
    };
    externalPythonBridgeStates.set(key, state);
    return state;
}

/** A new camera frame for this session (raw JPEG from the browser). */
export function updateExternalPythonBridgeFrame(input: {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
}, frame: Buffer): void {
    const key = buildExternalBridgeStateKey(input);
    const previous = externalPythonBridgeStates.get(key);
    externalPythonBridgeStates.set(key, {
        sessionId: input.sessionId,
        droneIp: input.droneIp,
        mavlinkPort: input.mavlinkPort,
        connectionMethod: input.connectionMethod,
        droneId: previous?.droneId ?? '',
        pointReached: previous?.pointReached ?? false,
        cameraConnected: previous?.cameraConnected ?? true,
        autopilotState: previous?.autopilotState ?? null,
        localPosition: previous?.localPosition ?? null,
        cameraFrame: frame,
        updatedAt: new Date().toISOString()
    });
}

// GET /state hands the frame out as a data URL (the IDLE hook reads it that
// way); encode each frame once, not on every poll.
const frameDataUrls = new WeakMap<Buffer, string>();
function frameToDataUrl(frame: Buffer | null): string | null {
    if (!frame) return null;
    let dataUrl = frameDataUrls.get(frame);
    if (!dataUrl) {
        dataUrl = `data:image/jpeg;base64,${frame.toString('base64')}`;
        frameDataUrls.set(frame, dataUrl);
    }
    return dataUrl;
}

export function getExternalPythonBridgeState(input: {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
}): ExternalPythonBridgeState | null {
    return externalPythonBridgeStates.get(buildExternalBridgeStateKey(input)) ?? null;
}

export function clearExternalPythonBridgeStore(): void {
    externalPythonBridgeEvents.length = 0;
    externalPythonBridgeStates.clear();
    nextExternalBridgeEventId = 0;
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
        // Absent key = frame sent separately (POST /frame): keep it.
        const cameraFrameDataUrl = !req.body || !('cameraFrameDataUrl' in req.body)
            ? undefined
            : typeof req.body.cameraFrameDataUrl === 'string' && req.body.cameraFrameDataUrl.trim()
                ? req.body.cameraFrameDataUrl as string
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

        const state = getExternalPythonBridgeState({
            sessionId,
            droneIp,
            mavlinkPort,
            connectionMethod
        });

        return res.json({
            ok: true,
            // The browser computes this from the FSM (autopilot/fsm.ts isPointReached)
            // and reports it as is - like the MAVLink bridge does. Re-deriving it here
            // from autopilotState never matched: that field carries Pioneer names
            // (TAKEOFF/MISSION/LANDING), not FSM statuses, so point_reached() in
            // external Python was always False.
            pointReached: Boolean(state?.pointReached),
            cameraConnected: state?.cameraConnected ?? false,
            cameraFrameDataUrl: frameToDataUrl(state?.cameraFrame ?? null),
            autopilotState: state?.autopilotState ?? null,
            localPosition: state?.localPosition ?? null,
            droneId: state?.droneId ?? null,
            updatedAt: state?.updatedAt ?? null
        });
    });

    // Raw JPEG frames from the browser's camera upload loop (no base64, no JSON).
    app.post(
        '/api/external-python-bridge/frame',
        express.raw({ type: 'image/jpeg', limit: '4mb' }),
        (req: express.Request, res: express.Response) => {
            const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
            const droneIp = typeof req.query.droneIp === 'string' ? req.query.droneIp.trim() : '';
            const mavlinkPort = Number.parseInt(typeof req.query.mavlinkPort === 'string' ? req.query.mavlinkPort : '8001', 10) || 8001;
            const connectionMethod = req.query.connectionMethod === 'serial' || req.query.connectionMethod === 'udpin' || req.query.connectionMethod === 'camera'
                ? req.query.connectionMethod as PioneerConnectionMethod
                : 'udpout';
            if (!sessionId) {
                return res.status(400).json({ ok: false, error: 'sessionId обязателен.' });
            }
            if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
                return res.status(400).json({ ok: false, error: 'Ожидается кадр image/jpeg.' });
            }
            updateExternalPythonBridgeFrame({ sessionId, droneIp, mavlinkPort, connectionMethod }, req.body);
            return res.status(204).end();
        }
    );

    app.get('/api/external-python-bridge/events', (req: express.Request, res: express.Response) => {
        const afterId = Number.parseInt(typeof req.query.afterId === 'string' ? req.query.afterId : '0', 10) || 0;
        return res.json({
            ok: true,
            events: externalPythonBridgeEvents.filter((event) => event.id > afterId),
            latestId: nextExternalBridgeEventId
        });
    });

    app.post('/api/external-python-bridge/clear', (_req: express.Request, res: express.Response) => {
        clearExternalPythonBridgeStore();
        return res.json({
            ok: true,
            latestId: nextExternalBridgeEventId
        });
    });
}
