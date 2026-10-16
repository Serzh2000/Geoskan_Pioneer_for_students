/*
 * Plazlink framing, as spoken by Pioneer Station over the drone's USB serial port:
 *   'p' 'l' | id | length | payload | ckA ckB
 * ckA/ckB is an 8-bit Fletcher sum over id, length and payload. Numbers are little-endian.
 * Recovered from the Station's gcs-plazlink classes and checked against its output.msg/input.msg logs.
 */

export const MESSAGE_ID = {
    protocolRequest: 34,
    protocolInfo: 35,
    componentCountRequest: 41,
    componentCount: 42,
    componentInfoRequest: 43,
    fieldRequest: 46,
    field: 47,
    fieldResponse: 48,
    fieldDescribe: 49,
    fileWrite: 63,
    fileWriteResponse: 64,
    fileDescribe: 60,
    fileInfo: 61,
    componentInfoExt: 73,
    fieldInfoExt: 74
} as const;

export interface Frame {
    id: number;
    payload: Uint8Array;
}

/** Payload is at most 255 bytes: the length is one byte. */
export const MAX_PAYLOAD = 255;

export function fletcher(bytes: ArrayLike<number>, from = 0, to = bytes.length): [number, number] {
    let a = 0;
    let b = 0;
    for (let i = from; i < to; i += 1) {
        a = (a + bytes[i]) & 0xff;
        b = (b + a) & 0xff;
    }
    return [a, b];
}

export function encodeFrame(id: number, payload: ArrayLike<number> = []): Uint8Array {
    if (payload.length > MAX_PAYLOAD) throw new RangeError(`Plazlink payload is ${payload.length} bytes, the limit is ${MAX_PAYLOAD}`);
    const out = new Uint8Array(4 + payload.length + 2);
    out[0] = 0x70; // 'p'
    out[1] = 0x6c; // 'l'
    out[2] = id & 0xff;
    out[3] = payload.length;
    out.set(payload as ArrayLike<number> as Uint8Array, 4);
    const [a, b] = fletcher(out, 2, 4 + payload.length);
    out[4 + payload.length] = a;
    out[5 + payload.length] = b;
    return out;
}

/** Collects the incoming byte stream and yields complete, checksum-valid frames; noise and bad frames are skipped. */
export class FrameParser {
    private buffer: number[] = [];

    push(chunk: ArrayLike<number>): Frame[] {
        for (let i = 0; i < chunk.length; i += 1) this.buffer.push(chunk[i]);
        const frames: Frame[] = [];
        for (;;) {
            let start = -1;
            for (let i = 0; i + 1 < this.buffer.length; i += 1) {
                if (this.buffer[i] === 0x70 && this.buffer[i + 1] === 0x6c) {
                    start = i;
                    break;
                }
            }
            if (start < 0) {
                // Keep a trailing 'p': the 'l' may arrive with the next chunk.
                this.buffer = this.buffer[this.buffer.length - 1] === 0x70 ? [0x70] : [];
                break;
            }
            if (start > 0) this.buffer.splice(0, start);
            if (this.buffer.length < 4) break;
            const length = this.buffer[3];
            const total = 4 + length + 2;
            if (this.buffer.length < total) break;
            const [a, b] = fletcher(this.buffer, 2, 4 + length);
            if (a === this.buffer[4 + length] && b === this.buffer[5 + length]) {
                frames.push({ id: this.buffer[2], payload: Uint8Array.from(this.buffer.slice(4, 4 + length)) });
                this.buffer.splice(0, total);
            } else {
                // Bad checksum: this "pl" was probably payload bytes; look for the next marker.
                this.buffer.splice(0, 2);
            }
        }
        return frames;
    }
}
