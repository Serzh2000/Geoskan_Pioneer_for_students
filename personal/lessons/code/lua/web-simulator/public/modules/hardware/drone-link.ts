import { compileLuaForDrone } from './lua-bytecode.js';
import { crc32, PlazlinkClient, PlazlinkError, type ComponentInfo, type PlazlinkTransport } from './plazlink/client.js';
import { decodeFieldValue, TELEMETRY_FIELDS, type Telemetry } from './telemetry.js';
import { openPioneerPort } from './web-serial-transport.js';

/*
 * One connection to a real Pioneer, shared by the editor's "На дрон" button and the "Дрон" panel.
 * It finds the fields it needs by name (indices differ between firmware builds), reads telemetry in a loop and
 * serializes everything that talks to the port, so an upload never interleaves with a read.
 * Uploading only writes the script: starting it is a separate, explicit call (a drone on a desk must not take off
 * just because the code was sent).
 */

const LUA_COMPONENT = 'LuaScript';
const LUA_FILE = 0;
/** Slow readings are refreshed once per this many rounds. */
const SLOW_EVERY = 6;
const ROUND_PAUSE_MS = 25;

export type LinkStatus = 'disconnected' | 'connecting' | 'connected' | 'lost';

export interface DroneInfo {
    /** "Номер борта". */
    boardNumber: number;
    /** Autopilot build number, the number after the last dot of the firmware version. */
    firmwareBuild: number;
    protocol: string;
    uavType: number;
    hasLua: boolean;
}

export interface LinkSnapshot {
    status: LinkStatus;
    info: DroneInfo | null;
    telemetry: Telemetry;
    /** Why the link is `lost`, or why the last connect failed. */
    error: string | null;
    uploading: boolean;
    lastUpload: { at: number; bytes: number } | null;
}

export type UploadStage = 'compile' | 'connect' | 'prepare' | 'upload' | 'verify' | 'done';

export interface UploadProgress {
    stage: UploadStage;
    message: string;
    /** 0..1 inside the upload stage. */
    fraction?: number;
}

type FieldRef = { component: number; index: number; scale: number };
type Listener = (snapshot: LinkSnapshot) => void;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class DroneLink {
    private snapshot: LinkSnapshot = { status: 'disconnected', info: null, telemetry: {}, error: null, uploading: false, lastUpload: null };
    private readonly listeners = new Set<Listener>();
    private client: PlazlinkClient | null = null;
    private fields = new Map<string, FieldRef>();
    private luaRun: FieldRef | null = null;
    private chain: Promise<unknown> = Promise.resolve();
    private session = 0;

    constructor(private readonly openTransport: () => Promise<PlazlinkTransport> = openPioneerPort) {
        if (typeof navigator !== 'undefined' && 'serial' in navigator) {
            (navigator as unknown as { serial: EventTarget }).serial.addEventListener('disconnect', () => {
                if (this.snapshot.status === 'connected') void this.markLost('Дрон отключён от USB.');
            });
        }
    }

    getSnapshot(): LinkSnapshot {
        return this.snapshot;
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.snapshot);
        return () => this.listeners.delete(listener);
    }

    private update(patch: Partial<LinkSnapshot>): void {
        this.snapshot = { ...this.snapshot, ...patch };
        this.listeners.forEach((listener) => listener(this.snapshot));
    }

    private exclusive<T>(task: () => Promise<T>): Promise<T> {
        const run = this.chain.then(task, task);
        this.chain = run.catch(() => undefined);
        return run;
    }

    /** Opens the port (a click is required for the browser's picker), reads what the drone is and starts the telemetry loop. */
    async connect(): Promise<void> {
        if (this.snapshot.status === 'connected' || this.snapshot.status === 'connecting') return;
        this.update({ status: 'connecting', error: null, telemetry: {} });
        const session = ++this.session;
        try {
            const client = new PlazlinkClient(await this.openTransport());
            this.client = client;
            const [protocol, components] = await Promise.all([client.getProtocolInfo(), client.listComponents()]);
            this.fields = await this.resolveFields(client, components);
            this.luaRun = this.fields.get('luaRun') ?? null;
            this.update({
                status: 'connected',
                info: {
                    boardNumber: protocol.uavId,
                    firmwareBuild: protocol.autopilotVersion,
                    protocol: protocol.protocol,
                    uavType: protocol.uavType,
                    hasLua: components.some((c) => c.name === LUA_COMPONENT)
                }
            });
            void this.pollLoop(session);
        } catch (error) {
            await this.dropClient();
            this.update({ status: 'disconnected', info: null, error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.session += 1;
        await this.dropClient();
        this.update({ status: 'disconnected', info: null, telemetry: {}, error: null });
    }

    private async dropClient(): Promise<void> {
        const client = this.client;
        this.client = null;
        this.luaRun = null;
        if (client) await client.close().catch(() => undefined);
    }

    private async markLost(reason: string): Promise<void> {
        this.session += 1;
        await this.dropClient();
        this.update({ status: 'lost', error: reason, uploading: false });
    }

    private async resolveFields(client: PlazlinkClient, components: ComponentInfo[]): Promise<Map<string, FieldRef>> {
        const wanted = new Set(TELEMETRY_FIELDS.map((f) => f.component));
        const refs = new Map<string, FieldRef>();
        for (const component of components) {
            if (!wanted.has(component.name)) continue;
            const described = await client.listFields(component.id, component.fieldCount);
            for (const spec of TELEMETRY_FIELDS) {
                if (spec.component !== component.name) continue;
                const field = described.find((f) => f.name === spec.field);
                if (field) refs.set(spec.key, { component: component.id, index: field.index, scale: field.scale });
            }
        }
        return refs;
    }

    private async pollLoop(session: number): Promise<void> {
        let round = 0;
        while (this.session === session && this.snapshot.status === 'connected') {
            for (const spec of TELEMETRY_FIELDS) {
                if (this.session !== session) return;
                if (spec.tier === 'slow' && round % SLOW_EVERY !== 0) continue;
                const ref = this.fields.get(spec.key);
                const client = this.client;
                if (!ref || !client) continue;
                try {
                    const payload = await this.exclusive(() => client.readField(ref.component, ref.index));
                    const value = decodeFieldValue(payload, ref.scale);
                    if (value !== null) this.snapshot.telemetry[spec.key] = value;
                } catch {
                    if (this.session === session) await this.markLost('Нет связи с дроном. Проверьте USB-кабель.');
                    return;
                }
            }
            this.update({ telemetry: { ...this.snapshot.telemetry } });
            round += 1;
            await delay(ROUND_PAUSE_MS);
        }
    }

    /**
     * Compiles the program and writes it to the drone: stop the script, write, compare size and CRC32 with the drone's
     * own report. The script is left stopped.
     */
    async upload(source: string, onProgress: (progress: UploadProgress) => void): Promise<{ bytes: number }> {
        onProgress({ stage: 'compile', message: 'Компилирую программу…' });
        // First: a syntax error should not need the drone, and the browser's port picker needs the click that is still fresh.
        const bytecode = compileLuaForDrone(source);
        if (this.snapshot.status !== 'connected') {
            onProgress({ stage: 'connect', message: 'Подключаюсь к дрону…' });
            await this.connect();
        }
        const client = this.client;
        const luaRun = this.luaRun;
        if (!client || !luaRun || !this.snapshot.info?.hasLua) throw new PlazlinkError('На этом дроне нет Lua-компонента.', 'protocol');
        this.update({ uploading: true });
        try {
            await this.exclusive(async () => {
                onProgress({ stage: 'prepare', message: 'Останавливаю скрипт на дроне…' });
                // A file written while the script runs is only picked up by a fresh start.
                await client.setInt8Field(luaRun.component, luaRun.index, 0);
                onProgress({ stage: 'upload', message: 'Загружаю…', fraction: 0 });
                await client.writeFile(luaRun.component, LUA_FILE, bytecode, (done, total) =>
                    onProgress({ stage: 'upload', message: 'Загружаю…', fraction: done / total })
                );
                onProgress({ stage: 'verify', message: 'Проверяю, что дрон принял файл…' });
                const info = await client.readFileInfo(luaRun.component, LUA_FILE);
                if (info.size !== bytecode.length || info.crc32 !== crc32(bytecode)) {
                    throw new PlazlinkError('Дрон принял файл, но размер или контрольная сумма не совпали. Повторите загрузку.', 'protocol');
                }
            });
            this.update({ lastUpload: { at: Date.now(), bytes: bytecode.length } });
            onProgress({ stage: 'done', message: 'Программа загружена' });
            return { bytes: bytecode.length };
        } catch (error) {
            if (error instanceof PlazlinkError && error.code === 'timeout') await this.markLost(error.message);
            throw error;
        } finally {
            this.update({ uploading: false });
        }
    }

    /** Starts or stops the script already on the drone. Never called as a side effect of anything else. */
    async setScriptRunning(running: boolean): Promise<void> {
        const client = this.client;
        const luaRun = this.luaRun;
        if (!client || !luaRun) throw new PlazlinkError('Дрон не подключён.', 'closed');
        await this.exclusive(() => client.setInt8Field(luaRun.component, luaRun.index, running ? 1 : 0));
        this.update({ telemetry: { ...this.snapshot.telemetry, luaRun: running ? 1 : 0 } });
    }
}

export const droneLink = new DroneLink();
