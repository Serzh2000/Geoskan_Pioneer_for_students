import { encodeFrame, FrameParser, MESSAGE_ID } from '../public/modules/hardware/plazlink/frame.js';
import { crc32, FILE_CHUNK, PlazlinkClient, PlazlinkError, type PlazlinkTransport } from '../public/modules/hardware/plazlink/client.js';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

/*
 * Frames and replies below were captured from Pioneer Station's own logs (dataLog/*output.msg, input.msg) and from the
 * drone's answers to the probe on COM10.
 */
describe('Plazlink frames', () => {
    it('encodes a file write the way Station does', () => {
        // open: component 10, file 0, position 0, no data
        const frame = encodeFrame(MESSAGE_ID.fileWrite, [0x0a, 0x00, 0, 0, 0, 0]);
        expect(hex(frame.subarray(0, 4))).toBe('706c3f06');
        expect(frame.length).toBe(4 + 6 + 2);
    });

    it('checks the Fletcher sum and skips noise and bad frames', () => {
        const good = encodeFrame(MESSAGE_ID.componentCount, [11]);
        const bad = Uint8Array.from(good);
        bad[bad.length - 1] ^= 0xff;
        const parser = new FrameParser();
        const frames = parser.push(Uint8Array.from([0x01, 0x70, ...bad, 0x00, ...good]));
        expect(frames).toHaveLength(1);
        expect(frames[0].id).toBe(MESSAGE_ID.componentCount);
        expect([...frames[0].payload]).toEqual([11]);
    });

    it('assembles a frame that arrives in pieces, even split inside the marker', () => {
        const frame = encodeFrame(MESSAGE_ID.field, [10, 0, 2, 1]);
        const parser = new FrameParser();
        const out = [...parser.push(frame.subarray(0, 1)), ...parser.push(frame.subarray(1, 5)), ...parser.push(frame.subarray(5))];
        expect(out).toHaveLength(1);
        expect([...out[0].payload]).toEqual([10, 0, 2, 1]);
    });

    it('refuses a payload longer than one length byte', () => {
        expect(() => encodeFrame(1, new Uint8Array(256))).toThrow(RangeError);
    });

    it('matches the CRC32 the drone reported for a known file', () => {
        // 176-byte bytecode of the first LED test: the drone answered with e64f09ad (see file info reply 0a 00 03 b0 00 00 00 ad 09 4f e6).
        expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    });
});

/** A drone that stores the file it is sent and answers like the real one. */
class FakeDrone implements PlazlinkTransport {
    stored = new Uint8Array(0);
    sizes: number[] = [];
    fields: Record<number, number> = {};
    dropFirstWrite = false;
    refuseAt: number | null = null;
    private handler: ((chunk: Uint8Array) => void) | null = null;
    private readonly parser = new FrameParser();

    onData(handler: (chunk: Uint8Array) => void) {
        this.handler = handler;
        return () => {
            this.handler = null;
        };
    }

    async close() {}

    async write(data: Uint8Array) {
        for (const frame of this.parser.push(data)) {
            const p = frame.payload;
            if (frame.id === MESSAGE_ID.componentCountRequest) this.reply(MESSAGE_ID.componentCount, [1]);
            else if (frame.id === MESSAGE_ID.fileWrite) {
                if (this.dropFirstWrite) {
                    this.dropFirstWrite = false;
                    continue;
                }
                const position = p[2] | (p[3] << 8) | (p[4] << 16) | (p[5] << 24);
                const result = this.refuseAt === position ? 5 : 0;
                if (result === 0) {
                    const piece = p.subarray(6);
                    const next = new Uint8Array(Math.max(this.stored.length, position + piece.length));
                    next.set(this.stored);
                    next.set(piece, position);
                    this.stored = next;
                    this.sizes.push(piece.length);
                }
                this.reply(MESSAGE_ID.fileWriteResponse, [...p.subarray(0, 6), result]);
            } else if (frame.id === MESSAGE_ID.field) {
                this.fields[p[1]] = p[3];
                this.reply(MESSAGE_ID.fieldResponse, [p[0], p[1], 0]);
            } else if (frame.id === MESSAGE_ID.fileDescribe) {
                const c = crc32(this.stored);
                const size = this.stored.length;
                this.reply(MESSAGE_ID.fileInfo, [p[0], p[1], 3, size & 255, size >> 8, 0, 0, c & 255, (c >> 8) & 255, (c >> 16) & 255, (c >>> 24) & 255]);
            }
        }
    }

    private reply(id: number, payload: number[]) {
        queueMicrotask(() => this.handler?.(encodeFrame(id, payload)));
    }
}

describe('Plazlink client', () => {
    it('writes a file as open, 40-byte pieces and close, and the drone ends up with the same bytes', async () => {
        const drone = new FakeDrone();
        const client = new PlazlinkClient(drone);
        const data = Uint8Array.from({ length: 174 }, (_, i) => (i * 7) & 0xff);
        const progress: number[] = [];
        await client.writeFile(10, 0, data, (done) => progress.push(done));
        expect(hex(drone.stored)).toBe(hex(data));
        // open (0 bytes), 40, 40, 40, 40, 14, close (0 bytes) - the sequence in Station's log
        expect(drone.sizes).toEqual([0, 40, 40, 40, 40, 14, 0]);
        expect(progress[progress.length - 1]).toBe(174);
        const info = await client.readFileInfo(10, 0);
        expect(info.size).toBe(174);
        expect(info.crc32).toBe(crc32(data));
        expect(FILE_CHUNK).toBe(40);
    });

    it('sets an integer field', async () => {
        const drone = new FakeDrone();
        await new PlazlinkClient(drone).setInt8Field(10, 0, 1);
        expect(drone.fields[0]).toBe(1);
    });

    it('repeats a message the drone did not answer', async () => {
        const drone = new FakeDrone();
        drone.dropFirstWrite = true;
        const client = new PlazlinkClient(drone);
        await expect(client.writeFile(10, 0, new Uint8Array([1, 2, 3]))).resolves.toBeUndefined();
        expect(hex(drone.stored)).toBe('010203');
    }, 10000);

    it('stops with a clear error when the drone refuses a piece', async () => {
        const drone = new FakeDrone();
        drone.refuseAt = 40;
        await expect(new PlazlinkClient(drone).writeFile(10, 0, new Uint8Array(100))).rejects.toBeInstanceOf(PlazlinkError);
    });
});
