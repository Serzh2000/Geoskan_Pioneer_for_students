import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
const localPythonRuns = new Map();
const MAX_RUNTIME_OUTPUT_ENTRIES = 500;
function sanitizePioneerConnectionConfig(config) {
    const mavlinkPort = Number.isFinite(config?.mavlinkPort) ? Number(config?.mavlinkPort) : 8001;
    return {
        simulator: Boolean(config?.simulator ?? false),
        name: typeof config?.name === 'string' && config.name.trim() ? config.name.trim() : 'pioneer',
        ip: typeof config?.ip === 'string' && config.ip.trim() ? config.ip.trim() : '192.168.4.1',
        mavlinkPort,
        cameraPort: Number.isFinite(config?.cameraPort) ? Number(config?.cameraPort) : (mavlinkPort + 10000),
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
function appendRuntimeOutput(session, stream, text) {
    const normalizedText = text.replace(/\r/g, '').trim();
    if (!normalizedText)
        return;
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
function flushRuntimeBuffer(session, stream) {
    const key = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const buffer = session[key];
    if (!buffer.trim()) {
        session[key] = '';
        return;
    }
    appendRuntimeOutput(session, stream, buffer);
    session[key] = '';
}
function appendRuntimeChunk(session, stream, chunk) {
    const key = stream === 'stdout' ? 'stdoutBuffer' : 'stderrBuffer';
    const nextText = session[key] + chunk.toString('utf8').replace(/\r\n/g, '\n');
    const parts = nextText.split('\n');
    session[key] = parts.pop() ?? '';
    parts.forEach((line) => appendRuntimeOutput(session, stream, line));
}
function createRuntimeWrapperSource() {
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
        'OriginalCamera = getattr(_pioneer_sdk, "Camera", None)',
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
        'CAMERA_KEYS = [',
        '    "timeout",',
        '    "ip",',
        '    "port",',
        '    "video_buffer_size",',
        '    "log_connection"',
        ']',
        '',
        'CAMERA_DEFAULTS = {',
        '    "timeout": CONFIG.get("camera_timeout", 0.5),',
        '    "ip": CONFIG.get("ip", "192.168.4.1"),',
        '    "port": CONFIG.get("camera_port", CONFIG.get("mavlink_port", 8001) + 10000),',
        '    "video_buffer_size": CONFIG.get("video_buffer_size", 65000),',
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
        'if OriginalCamera is not None:',
        '    class BrowserConfiguredCamera(OriginalCamera):',
        '        def __init__(self, *args, **kwargs):',
        '            merged = dict(CAMERA_DEFAULTS)',
        '            for index, value in enumerate(args):',
        '                if index >= len(CAMERA_KEYS):',
        '                    break',
        '                merged[CAMERA_KEYS[index]] = value',
        '            merged.update(kwargs)',
        '            super().__init__(**merged)',
        '',
        '    _pioneer_sdk.Camera = BrowserConfiguredCamera',
        '',
        'global_scope = {',
        '    "__name__": "__main__",',
        '    "__file__": str(SCRIPT_PATH),',
        '}',
        'code = compile(SCRIPT_PATH.read_text(encoding="utf-8"), str(SCRIPT_PATH), "exec")',
        'exec(code, global_scope, global_scope)'
    ].join('\n');
}
function stopLocalPythonRun(droneId) {
    const session = localPythonRuns.get(droneId);
    if (!session || !session.running) {
        return false;
    }
    appendRuntimeOutput(session, 'system', 'Stop requested from browser UI.');
    session.process.kill();
    return true;
}
function startLocalPythonRun(droneId, code, projectRoot, config) {
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
        camera_port: normalizedConfig.cameraPort,
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
    const session = {
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
    appendRuntimeOutput(session, 'system', `Started local Python runtime using "${normalizedConfig.pythonExecutable}" with ${normalizedConfig.connectionMethod} transport.`);
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
        appendRuntimeOutput(session, 'system', `Process finished with exit code ${exitCode ?? 'null'}${signal ? ` and signal ${signal}` : ''}.`);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    return session;
}
export function registerPythonRuntimeRoutes(app, projectRoot) {
    app.post('/api/python-runtime/run', (req, res) => {
        // #region debug-point C:python-runtime-run-route
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7777/event', s = 'camera-mavlink-reset'; try {
            const e = fs.readFileSync('.dbg/camera-mavlink-reset.env', 'utf8');
            u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
            s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        }
        catch { } return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'C', location: 'server/python-runtime.ts:run', msg: '[DEBUG] local python runtime route hit', data: { droneId: req.body?.droneId ?? null, codeSize: typeof req.body?.code === 'string' ? req.body.code.length : null, hasConfig: Boolean(req.body?.config) }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        const droneId = typeof req.body?.droneId === 'string' ? req.body.droneId.trim() : '';
        const code = typeof req.body?.code === 'string' ? req.body.code : '';
        const config = (req.body?.config ?? null);
        if (!droneId) {
            return res.status(400).json({ ok: false, error: 'droneId обязателен.' });
        }
        if (!code.trim()) {
            return res.status(400).json({ ok: false, error: 'Python-код пустой.' });
        }
        try {
            const session = startLocalPythonRun(droneId, code, projectRoot, config ?? undefined);
            return res.json({
                ok: true,
                running: session.running,
                startedAt: session.startedAt
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось запустить локальный Python runtime.';
            return res.status(409).json({ ok: false, error: message });
        }
    });
    app.post('/api/python-runtime/stop', (req, res) => {
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
    app.get('/api/python-runtime/status', (req, res) => {
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
}
export function stopAllLocalPythonRuns() {
    for (const session of localPythonRuns.values()) {
        if (session.running) {
            session.process.kill();
        }
    }
}
