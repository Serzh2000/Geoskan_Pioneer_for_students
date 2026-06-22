import { spawn } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import { glob } from 'glob';
import type { Server } from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

type ProcessWithPackaging = NodeJS.Process & {
    pkg?: unknown;
    resourcesPath?: string;
};

export interface StartServerOptions {
    port?: number;
    host?: string;
    packaged?: boolean;
    vitePort?: number;
}

export interface StartedServer {
    app: express.Express;
    close: () => Promise<void>;
    port: number;
    url: string;
}

const processWithPackaging = process as ProcessWithPackaging;
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const runtimeDir = path.dirname(process.execPath);
const resourcesDir = processWithPackaging.resourcesPath;
const isDistBuild = path.basename(currentDir) === 'dist';
const projectRoot = isDistBuild ? path.resolve(currentDir, '..') : currentDir;

function resolveFirstExistingPath(candidates: string[]): string {
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolvePublicPath(): string {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'public')] : []),
        path.join(runtimeDir, 'public'),
        path.join(currentDir, 'public'),
        path.join(projectRoot, 'public'),
        path.join(projectRoot, 'dist', 'public')
    ]);
}

function resolveExamplesPath(): string {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'examples')] : []),
        path.join(runtimeDir, 'examples'),
        path.join(projectRoot, 'examples'),
        path.resolve(projectRoot, '..', 'examples')
    ]);
}

function resolveAutopilotParametersPath(): string {
    return path.join(projectRoot, 'pio-classic-newopt-stable-1.6.7178-1.properties');
}

type PioneerConnectionMethod = 'udpin' | 'udpout' | 'serial';
type RuntimeOutputStream = 'stdout' | 'stderr' | 'system';

interface PioneerConnectionConfig {
    simulator?: boolean;
    name?: string;
    ip?: string;
    mavlinkPort?: number;
    connectionMethod?: PioneerConnectionMethod;
    device?: string;
    baud?: number;
    logger?: boolean;
    logConnection?: boolean;
    pythonExecutable?: string;
}

interface RuntimeOutputEntry {
    seq: number;
    stream: RuntimeOutputStream;
    text: string;
}

interface LocalPythonRunSession {
    droneId: string;
    process: ReturnType<typeof spawn>;
    output: RuntimeOutputEntry[];
    nextSeq: number;
    running: boolean;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    startedAt: string;
    finishedAt: string | null;
    tempDir: string;
    stdoutBuffer: string;
    stderrBuffer: string;
}

interface ExternalPythonBridgeEvent {
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

interface ExternalPythonBridgeState {
    sessionId: string;
    droneIp: string;
    mavlinkPort: number;
    connectionMethod: PioneerConnectionMethod;
    droneId: string;
    pointReached: boolean;
    cameraConnected: boolean;
    cameraFrameDataUrl: string | null;
    updatedAt: string;
}

const localPythonRuns = new Map<string, LocalPythonRunSession>();
const MAX_RUNTIME_OUTPUT_ENTRIES = 500;
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

function sanitizePioneerConnectionConfig(config: PioneerConnectionConfig | null | undefined) {
    return {
        simulator: Boolean(config?.simulator ?? false),
        name: typeof config?.name === 'string' && config.name.trim() ? config.name.trim() : 'pioneer',
        ip: typeof config?.ip === 'string' && config.ip.trim() ? config.ip.trim() : '192.168.4.1',
        mavlinkPort: Number.isFinite(config?.mavlinkPort) ? Number(config?.mavlinkPort) : 8001,
        connectionMethod: config?.connectionMethod === 'serial' || config?.connectionMethod === 'udpin' ? config.connectionMethod : 'udpout',
        device: typeof config?.device === 'string' && config.device.trim() ? config.device.trim() : '/dev/serial0',
        baud: Number.isFinite(config?.baud) ? Number(config?.baud) : 115200,
        logger: Boolean(config?.logger ?? true),
        logConnection: Boolean(config?.logConnection ?? true),
        pythonExecutable: typeof config?.pythonExecutable === 'string' && config.pythonExecutable.trim()
            ? config.pythonExecutable.trim()
            : (process.env.PYTHON_EXECUTABLE || 'python')
    };
}

function appendRuntimeOutput(session: LocalPythonRunSession, stream: RuntimeOutputStream, text: string): void {
    const normalizedText = text.replace(/\r/g, '').trim();
    if (!normalizedText) return;

    session.nextSeq += 1;
    session.output.push({
        seq: session.nextSeq,
        stream,
        text: normalizedText
    });

    if (session.output.length > MAX_RUNTIME_OUTPUT_ENTRIES) {
        session.output.splice(0, session.output.length - MAX_RUNTIME_OUTPUT_ENTRIES);
    }
}

function flushRuntimeBuffer(session: LocalPythonRunSession, stream: 'stdout' | 'stderr'): void {
    const key = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const buffer = session[key];
    if (!buffer.trim()) {
        session[key] = '';
        return;
    }

    appendRuntimeOutput(session, stream, buffer);
    session[key] = '';
}

function appendRuntimeChunk(session: LocalPythonRunSession, stream: 'stdout' | 'stderr', chunk: Buffer | string): void {
    const key = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const nextText = session[key] + chunk.toString('utf8').replace(/\r\n/g, '\n');
    const parts = nextText.split('\n');
    session[key] = parts.pop() ?? '';
    parts.forEach((line) => appendRuntimeOutput(session, stream, line));
}

function createRuntimeWrapperSource(): string {
    return [
        'import json',
        'import sys',
        'from pathlib import Path',
        '',
        'SCRIPT_PATH = Path(sys.argv[1])',
        'CONFIG_PATH = Path(sys.argv[2])',
        'CONFIG = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))',
        '',
        'try:',
        '    import pioneer_sdk as _pioneer_sdk',
        'except Exception as exc:',
        '    print(f"[Python local] pioneer_sdk import failed: {exc}", file=sys.stderr, flush=True)',
        '    raise',
        '',
        'OriginalPioneer = getattr(_pioneer_sdk, "Pioneer")',
        'PIONEER_KEYS = [',
        '    "simulator",',
        '    "name",',
        '    "ip",',
        '    "mavlink_port",',
        '    "connection_method",',
        '    "device",',
        '    "baud",',
        '    "logger",',
        '    "log_connection"',
        ']',
        '',
        'DEFAULTS = {',
        '    "simulator": CONFIG.get("simulator", False),',
        '    "name": CONFIG.get("name", "pioneer"),',
        '    "ip": CONFIG.get("ip", "192.168.4.1"),',
        '    "mavlink_port": CONFIG.get("mavlink_port", 8001),',
        '    "connection_method": CONFIG.get("connection_method", "udpout"),',
        '    "device": CONFIG.get("device", "/dev/serial0"),',
        '    "baud": CONFIG.get("baud", 115200),',
        '    "logger": CONFIG.get("logger", True),',
        '    "log_connection": CONFIG.get("log_connection", True)',
        '}',
        '',
        'class BrowserConfiguredPioneer(OriginalPioneer):',
        '    def __init__(self, *args, **kwargs):',
        '        merged = dict(DEFAULTS)',
        '        for index, value in enumerate(args):',
        '            if index >= len(PIONEER_KEYS):',
        '                break',
        '            merged[PIONEER_KEYS[index]] = value',
        '        merged.update(kwargs)',
        '        super().__init__(**merged)',
        '',
        '_pioneer_sdk.Pioneer = BrowserConfiguredPioneer',
        '',
        'global_scope = {',
        '    "__name__": "__main__",',
        '    "__file__": str(SCRIPT_PATH),',
        '}',
        'code = compile(SCRIPT_PATH.read_text(encoding="utf-8"), str(SCRIPT_PATH), "exec")',
        'exec(code, global_scope, global_scope)'
    ].join('\n');
}

function stopLocalPythonRun(droneId: string): boolean {
    const session = localPythonRuns.get(droneId);
    if (!session || !session.running) {
        return false;
    }

    appendRuntimeOutput(session, 'system', 'Stop requested from browser UI.');
    session.process.kill();
    return true;
}

function startLocalPythonRun(droneId: string, code: string, config?: PioneerConnectionConfig): LocalPythonRunSession {
    const existingSession = localPythonRuns.get(droneId);
    if (existingSession?.running) {
        throw new Error(`Для ${droneId} уже запущен локальный Python runtime.`);
    }

    const normalizedConfig = sanitizePioneerConnectionConfig(config);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-browser-python-'));
    const scriptPath = path.join(tempDir, 'user_script.py');
    const configPath = path.join(tempDir, 'connection.json');
    const wrapperPath = path.join(tempDir, 'runner.py');

    fs.writeFileSync(scriptPath, code, 'utf8');
    fs.writeFileSync(configPath, JSON.stringify({
        simulator: normalizedConfig.simulator,
        name: normalizedConfig.name,
        ip: normalizedConfig.ip,
        mavlink_port: normalizedConfig.mavlinkPort,
        connection_method: normalizedConfig.connectionMethod,
        device: normalizedConfig.device,
        baud: normalizedConfig.baud,
        logger: normalizedConfig.logger,
        log_connection: normalizedConfig.logConnection
    }, null, 2), 'utf8');
    fs.writeFileSync(wrapperPath, createRuntimeWrapperSource(), 'utf8');

    const child = spawn(normalizedConfig.pythonExecutable, ['-u', wrapperPath, scriptPath, configPath], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const session: LocalPythonRunSession = {
        droneId,
        process: child,
        output: [],
        nextSeq: 0,
        running: true,
        exitCode: null,
        signal: null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        tempDir,
        stdoutBuffer: '',
        stderrBuffer: ''
    };

    localPythonRuns.set(droneId, session);
    appendRuntimeOutput(
        session,
        'system',
        `Started local Python runtime using "${normalizedConfig.pythonExecutable}" with ${normalizedConfig.connectionMethod} transport.`
    );

    child.stdout?.on('data', (chunk) => appendRuntimeChunk(session, 'stdout', chunk));
    child.stderr?.on('data', (chunk) => appendRuntimeChunk(session, 'stderr', chunk));
    child.on('error', (error) => {
        appendRuntimeOutput(session, 'stderr', `Process error: ${error.message}`);
    });
    child.on('close', (exitCode, signal) => {
        flushRuntimeBuffer(session, 'stdout');
        flushRuntimeBuffer(session, 'stderr');
        session.running = false;
        session.exitCode = exitCode;
        session.signal = signal;
        session.finishedAt = new Date().toISOString();
        appendRuntimeOutput(
            session,
            'system',
            `Process finished with exit code ${exitCode ?? 'null'}${signal ? ` and signal ${signal}` : ''}.`
        );
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    return session;
}

function appendExternalBridgeEvent(payload: Omit<ExternalPythonBridgeEvent, 'id' | 'timestamp'>): ExternalPythonBridgeEvent {
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

function upsertExternalBridgeState(payload: Omit<ExternalPythonBridgeState, 'updatedAt'>): ExternalPythonBridgeState {
    const state: ExternalPythonBridgeState = {
        ...payload,
        updatedAt: new Date().toISOString()
    };
    externalPythonBridgeStates.set(buildExternalBridgeStateKey(state), state);
    return state;
}

function createApp(options: StartServerOptions): express.Express {
    const app = express();
    const vitePort = options.vitePort ?? 3001;
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const publicPath = resolvePublicPath();
    const luaExamplesPath = resolveExamplesPath();
    const autopilotParametersPath = resolveAutopilotParametersPath();
    const shouldServeStaticUi = isDistBuild || packagedRuntime;

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    app.get('/api/files', (_req: express.Request, res: express.Response) => {
        console.log('Listing files in:', luaExamplesPath);

        try {
            const files = glob.sync('**/*.lua', { cwd: luaExamplesPath, nodir: true });
            const normalizedFiles = files.map((filePath) => filePath.replace(/\\/g, '/'));
            res.json(normalizedFiles);
        } catch (error) {
            console.error('Glob error:', error);
            res.status(500).json({ error: 'Failed to list files' });
        }
    });

    app.get('/api/file-content', (req: express.Request, res: express.Response) => {
        const relativePath = req.query.path as string | undefined;
        if (!relativePath) {
            return res.status(400).json({ error: 'Path required' });
        }

        const examplesRoot = path.resolve(luaExamplesPath);
        const filePath = path.resolve(examplesRoot, relativePath);

        if (!filePath.startsWith(examplesRoot + path.sep) && filePath !== examplesRoot) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    });

    app.get('/api/autopilot-parameters', (_req: express.Request, res: express.Response) => {
        try {
            if (!fs.existsSync(autopilotParametersPath)) {
                return res.status(404).json({ error: 'Файл параметров автопилота не найден.' });
            }

            const content = fs.readFileSync(autopilotParametersPath, 'utf8');
            return res.json({
                fileName: path.basename(autopilotParametersPath),
                filePath: autopilotParametersPath,
                content
            });
        } catch (error) {
            console.error('Failed to read autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось прочитать файл параметров автопилота.' });
        }
    });

    app.put('/api/autopilot-parameters', (req: express.Request, res: express.Response) => {
        const content = typeof req.body?.content === 'string' ? req.body.content : null;
        if (!content) {
            return res.status(400).json({ error: 'Тело запроса должно содержать строковое поле content.' });
        }

        try {
            fs.writeFileSync(autopilotParametersPath, content, 'utf8');
            return res.json({
                ok: true,
                fileName: path.basename(autopilotParametersPath),
                filePath: autopilotParametersPath,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to save autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось сохранить файл параметров автопилота.' });
        }
    });

    app.post('/api/python-runtime/run', (req: express.Request, res: express.Response) => {
        const droneId = typeof req.body?.droneId === 'string' ? req.body.droneId.trim() : '';
        const code = typeof req.body?.code === 'string' ? req.body.code : '';
        const config = (req.body?.config ?? null) as PioneerConnectionConfig | null;

        if (!droneId) {
            return res.status(400).json({ ok: false, error: 'droneId обязателен.' });
        }
        if (!code.trim()) {
            return res.status(400).json({ ok: false, error: 'Python-код пустой.' });
        }

        try {
            const session = startLocalPythonRun(droneId, code, config ?? undefined);
            return res.json({
                ok: true,
                running: session.running,
                startedAt: session.startedAt
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось запустить локальный Python runtime.';
            return res.status(409).json({ ok: false, error: message });
        }
    });

    app.post('/api/python-runtime/stop', (req: express.Request, res: express.Response) => {
        const droneId = typeof req.body?.droneId === 'string' ? req.body.droneId.trim() : '';
        if (!droneId) {
            return res.status(400).json({ ok: false, error: 'droneId обязателен.' });
        }

        const stopped = stopLocalPythonRun(droneId);
        return res.json({
            ok: true,
            stopped
        });
    });

    app.get('/api/python-runtime/status', (req: express.Request, res: express.Response) => {
        const droneId = typeof req.query.droneId === 'string' ? req.query.droneId.trim() : '';
        const afterSeq = Number.parseInt(typeof req.query.afterSeq === 'string' ? req.query.afterSeq : '0', 10) || 0;

        if (!droneId) {
            return res.status(400).json({ ok: false, error: 'droneId обязателен.' });
        }

        const session = localPythonRuns.get(droneId);
        if (!session) {
            return res.status(404).json({ ok: false, error: 'Сессия локального Python runtime не найдена.' });
        }

        return res.json({
            ok: true,
            running: session.running,
            exitCode: session.exitCode,
            signal: session.signal,
            startedAt: session.startedAt,
            finishedAt: session.finishedAt,
            output: session.output.filter((entry) => entry.seq > afterSeq)
        });
    });

    app.post('/api/external-python-bridge/event', (req: express.Request, res: express.Response) => {
        const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
        const droneName = typeof req.body?.droneName === 'string' ? req.body.droneName.trim() : 'Pioneer';
        const droneIp = typeof req.body?.droneIp === 'string' ? req.body.droneIp.trim() : '';
        const mavlinkPort = Number.isFinite(req.body?.mavlinkPort) ? Number(req.body.mavlinkPort) : 8001;
        const connectionMethod = req.body?.connectionMethod === 'serial' || req.body?.connectionMethod === 'udpin'
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

        const event = appendExternalBridgeEvent({
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
        const connectionMethod = req.body?.connectionMethod === 'serial' || req.body?.connectionMethod === 'udpin'
            ? req.body.connectionMethod as PioneerConnectionMethod
            : 'udpout';
        const droneId = typeof req.body?.droneId === 'string' ? req.body.droneId.trim() : '';
        const pointReached = Boolean(req.body?.pointReached);
        const cameraConnected = Boolean(req.body?.cameraConnected);
        const cameraFrameDataUrl = typeof req.body?.cameraFrameDataUrl === 'string' && req.body.cameraFrameDataUrl.trim()
            ? req.body.cameraFrameDataUrl
            : null;

        if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'sessionId обязателен.' });
        }

        const state = upsertExternalBridgeState({
            sessionId,
            droneIp,
            mavlinkPort,
            connectionMethod,
            droneId,
            pointReached,
            cameraConnected,
            cameraFrameDataUrl
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
        const connectionMethod = req.query.connectionMethod === 'serial' || req.query.connectionMethod === 'udpin'
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

    app.get('/api-docs', (_req: express.Request, res: express.Response) => {
        res.json({ message: 'OpenAPI documentation will be here' });
    });

    if (shouldServeStaticUi) {
        console.log(`Serving static files from: ${publicPath}`);
        app.use(express.static(publicPath));
        app.get(/^\/(?!api).*/, (_req: express.Request, res: express.Response) => {
            res.sendFile(path.join(publicPath, 'index.html'));
        });
    } else {
        app.get('/', (_req: express.Request, res: express.Response) => {
            res.redirect(302, `http://localhost:${vitePort}/`);
        });
    }

    return app;
}

export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const defaultPort = isDistBuild || packagedRuntime ? 1234 : 3000;
    const port = options.port ?? Number(process.env.PORT ?? defaultPort);
    const host = options.host;
    const app = createApp(options);

    const server = await new Promise<Server>((resolve) => {
        if (host) {
            const listeningServer = app.listen(port, host, () => resolve(listeningServer));
            return;
        }

        const listeningServer = app.listen(port, () => resolve(listeningServer));
    });

    const addressInfo = server.address();
    const actualPort = typeof addressInfo === 'object' && addressInfo ? addressInfo.port : port;
    const urlHost = host ?? 'localhost';
    const url = `http://${urlHost}:${actualPort}`;
    console.log(`Server running at ${url}`);

    return {
        app,
        port: actualPort,
        url,
        close: async () => new Promise<void>((resolve, reject) => {
            for (const session of localPythonRuns.values()) {
                if (session.running) {
                    session.process.kill();
                }
            }
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        })
    };
}

const startedDirectly = process.argv[1] && path.resolve(process.argv[1]) === currentFilePath;

if (startedDirectly) {
    startServer().catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
