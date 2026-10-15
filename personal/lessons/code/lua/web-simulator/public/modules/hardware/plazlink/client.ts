import { encodeFrame, FrameParser, MESSAGE_ID, type Frame } from './frame.js';

/** Anything that can carry bytes to and from the drone: Web Serial in the browser, a fake in tests. */
export interface PlazlinkTransport {
    write(data: Uint8Array): Promise<void>;
    /** Subscribe to incoming bytes; returns the unsubscribe function. */
    onData(handler: (chunk: Uint8Array) => void): () => void;
    close(): Promise<void>;
}

export class PlazlinkError extends Error {
    constructor(message: string, readonly code: 'timeout' | 'refused' | 'protocol' | 'closed') {
        super(message);
        this.name = 'PlazlinkError';
    }
}

export interface ComponentInfo {
    id: number;
    type: number;
    fieldCount: number;
    software: string;
    name: string;
}

export interface FieldInfo {
    index: number;
    name: string;
    /** Value-type code of the field (see VALUE_TYPES in telemetry.ts). */
    type: number;
    flags: number;
    /** A raw value times 10^scale is the physical value (roll -28 with scale -2 is -0.28 degrees). */
    scale: number;
}

export interface ProtocolInfo {
    protocol: string;
    /** Autopilot build number. */
    autopilotVersion: number;
    uavType: number;
    /** The number of the aircraft ("номер борта"). */
    uavId: number;
}

export interface FileInfo {
    status: number;
    size: number;
    crc32: number;
}

/** Value-type code Pioneer Station uses when it writes a one-byte integer field (the Lua `run` switch). */
const VALUE_INT8 = 2;
/** Largest file piece in one message: 40 bytes, the limit of Station's uploader. */
export const FILE_CHUNK = 40;

const REQUEST_TIMEOUT_MS = 1000;
const WRITE_TIMEOUT_MS = 2000;
const RETRIES = 2;

type Waiter = { want: number; match?: (payload: Uint8Array) => boolean; resolve: (payload: Uint8Array) => void };

function readUint32(bytes: Uint8Array, offset: number): number {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function readPascal(bytes: Uint8Array, offset: number): { text: string; next: number } {
    const length = bytes[offset] ?? 0;
    const text = new TextDecoder().decode(bytes.subarray(offset + 1, offset + 1 + length));
    return { text, next: offset + 1 + length };
}

export function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i += 1) {
        crc ^= data[i];
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export class PlazlinkClient {
    private readonly parser = new FrameParser();
    private waiters: Waiter[] = [];
    private readonly unsubscribe: () => void;

    constructor(private readonly transport: PlazlinkTransport) {
        this.unsubscribe = transport.onData((chunk) => this.dispatch(this.parser.push(chunk)));
    }

    async close(): Promise<void> {
        this.unsubscribe();
        this.waiters = [];
        await this.transport.close();
    }

    private dispatch(frames: Frame[]): void {
        for (const frame of frames) {
            const index = this.waiters.findIndex((w) => w.want === frame.id && (!w.match || w.match(frame.payload)));
            if (index >= 0) this.waiters.splice(index, 1)[0].resolve(frame.payload);
        }
    }

    /** Sends one message and waits for the reply of the given id; repeats it when the drone stays silent. */
    async request(
        id: number,
        payload: ArrayLike<number>,
        want: number,
        match?: (payload: Uint8Array) => boolean,
        timeoutMs = REQUEST_TIMEOUT_MS
    ): Promise<Uint8Array> {
        const frame = encodeFrame(id, payload);
        for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
            const reply = new Promise<Uint8Array | null>((resolve) => {
                const waiter: Waiter = {
                    want,
                    match,
                    resolve: (p) => {
                        clearTimeout(timer);
                        resolve(p);
                    }
                };
                const timer = setTimeout(() => {
                    this.waiters = this.waiters.filter((w) => w !== waiter);
                    resolve(null);
                }, timeoutMs);
                this.waiters.push(waiter);
            });
            await this.transport.write(frame);
            const payloadBack = await reply;
            if (payloadBack) return payloadBack;
        }
        throw new PlazlinkError('Дрон не отвечает. Проверьте, что Pioneer Station закрыта, и переподключите USB.', 'timeout');
    }

    async listComponents(): Promise<ComponentInfo[]> {
        const count = (await this.request(MESSAGE_ID.componentCountRequest, [], MESSAGE_ID.componentCount))[0];
        const components: ComponentInfo[] = [];
        for (let index = 0; index < count; index += 1) {
            const info = await this.request(MESSAGE_ID.componentInfoRequest, [index], MESSAGE_ID.componentInfoExt, (p) => p[0] === index);
            // id, type, fieldCount, swMajor, swMinor, swRevision(u32), hwMajor, hwMinor, hash(u32), name
            components.push({
                id: info[0],
                type: info[1],
                fieldCount: info[2],
                software: `${info[3]}.${info[4]}.${readUint32(info, 5)}`,
                name: readPascal(info, 15).text
            });
        }
        return components;
    }

    async listFields(component: number, fieldCount: number): Promise<FieldInfo[]> {
        const fields: FieldInfo[] = [];
        for (let index = 0; index < fieldCount; index += 1) {
            const info = await this.request(MESSAGE_ID.fieldDescribe, [component, index], MESSAGE_ID.fieldInfoExt, (p) => p[0] === component && p[1] === index);
            fields.push({ index, type: info[2], flags: info[4], scale: (info[5] << 24) >> 24, name: readPascal(info, 6).text });
        }
        return fields;
    }

    async getProtocolInfo(): Promise<ProtocolInfo> {
        const info = await this.request(MESSAGE_ID.protocolRequest, [0, 0], MESSAGE_ID.protocolInfo);
        return { protocol: `${info[0]}.${info[1]}`, autopilotVersion: info[2] | (info[3] << 8), uavType: info[4], uavId: readUint32(info, 5) };
    }

    async readField(component: number, field: number): Promise<Uint8Array> {
        return this.request(MESSAGE_ID.fieldRequest, [component, field], MESSAGE_ID.field, (p) => p[0] === component && p[1] === field);
    }

    async setInt8Field(component: number, field: number, value: number): Promise<void> {
        const reply = await this.request(
            MESSAGE_ID.field,
            [component, field, VALUE_INT8, value & 0xff],
            MESSAGE_ID.fieldResponse,
            (p) => p[0] === component && p[1] === field
        );
        if (reply[2] !== 0) throw new PlazlinkError(`Дрон отклонил запись поля (код ${reply[2]}).`, 'refused');
    }

    async readFileInfo(component: number, file: number): Promise<FileInfo> {
        const info = await this.request(MESSAGE_ID.fileDescribe, [component, file, 2], MESSAGE_ID.fileInfo, (p) => p[0] === component && p[1] === file);
        return { status: info[2], size: readUint32(info, 3), crc32: readUint32(info, 7) };
    }

    /**
     * Writes a file as Pioneer Station does: an empty write at 0 opens it, 40-byte pieces follow, and an empty write at
     * the end closes it. One piece at a time (Station sends four ahead); each is confirmed by the drone.
     */
    async writeFile(component: number, file: number, data: Uint8Array, onProgress?: (done: number, total: number) => void): Promise<void> {
        const send = async (position: number, piece: Uint8Array) => {
            const payload = new Uint8Array(6 + piece.length);
            payload[0] = component;
            payload[1] = file;
            payload[2] = position & 0xff;
            payload[3] = (position >>> 8) & 0xff;
            payload[4] = (position >>> 16) & 0xff;
            payload[5] = (position >>> 24) & 0xff;
            payload.set(piece, 6);
            const reply = await this.request(
                MESSAGE_ID.fileWrite,
                payload,
                MESSAGE_ID.fileWriteResponse,
                (p) => p[0] === component && p[1] === file && readUint32(p, 2) === position,
                WRITE_TIMEOUT_MS
            );
            if (reply[6] !== 0) throw new PlazlinkError(`Дрон отклонил запись файла на позиции ${position} (код ${reply[6]}).`, 'refused');
        };
        await send(0, new Uint8Array(0));
        for (let position = 0; position < data.length; position += FILE_CHUNK) {
            await send(position, data.subarray(position, position + FILE_CHUNK));
            onProgress?.(Math.min(position + FILE_CHUNK, data.length), data.length);
        }
        await send(data.length, new Uint8Array(0));
    }
}
