import { jest } from '@jest/globals';
import {
    dronePropertiesText,
    isProtectedParam,
    planParamWrite
} from '../public/modules/hardware/drone-params.js';
import { DroneLink } from '../public/modules/hardware/drone-link.js';
import { PlazlinkClient, PlazlinkError, type PlazlinkTransport } from '../public/modules/hardware/plazlink/client.js';
import { encodeFrame, FrameParser, MESSAGE_ID } from '../public/modules/hardware/plazlink/frame.js';
import {
    cleanFloat32,
    decodeParam,
    encodeParam,
    readAllParams,
    sameFloat32,
    writeParam,
    type DroneParam
} from '../public/modules/hardware/plazlink/params.js';

/** The reply captured from a real Pioneer (build 10332) for "give me parameter 0". */
const REAL_PARAM_0 = Uint8Array.from([
    0x00, 0x00, 0x00, 0x00, 0x00,
    ...new TextEncoder().encode('Offsets_accel_xOffset'),
    ...new Array(11).fill(0)
]);

/** A drone that keeps parameters in a table and answers messages 5 and 7 the way the real one does. */
class FakeParamDrone implements PlazlinkTransport {
    readonly params: { name: string; value: number }[];
    /** Names the drone silently refuses to keep (the value stays as it was). */
    refuse = new Set<string>();
    silent = false;
    writes: string[] = [];
    private handler: ((chunk: Uint8Array) => void) | null = null;
    private readonly parser = new FrameParser();

    constructor(initial: Record<string, number>) {
        this.params = Object.entries(initial).map(([name, value]) => ({ name, value: Math.fround(value) }));
    }

    onData(handler: (chunk: Uint8Array) => void) {
        this.handler = handler;
        return () => {
            this.handler = null;
        };
    }

    async close() {}

    async write(data: Uint8Array) {
        if (this.silent) return;
        for (const frame of this.parser.push(data)) {
            const p = frame.payload;
            if (frame.id === MESSAGE_ID.paramRequest) {
                if (p[0] === 255) this.reply(MESSAGE_ID.paramCount, Uint8Array.from([this.params.length]));
                else if (this.params[p[0]]) this.reply(MESSAGE_ID.param, encodeParam(p[0], this.params[p[0]].name, this.params[p[0]].value));
            } else if (frame.id === MESSAGE_ID.param) {
                const decoded = decodeParam(p);
                const target = decoded && this.params[decoded.index];
                if (decoded && target) {
                    this.writes.push(target.name);
                    if (!this.refuse.has(target.name)) target.value = decoded.value;
                    this.reply(MESSAGE_ID.param, encodeParam(decoded.index, target.name, target.value));
                }
            }
        }
    }

    private reply(id: number, payload: Uint8Array) {
        queueMicrotask(() => this.handler?.(encodeFrame(id, payload)));
    }
}

const PROFILE_ON_DRONE = {
    Offsets_accel_xOffset: 0,
    BoardPioneer_auxUMux: 1,
    BoardPioneer_baudrate: 115200,
    Modules_lua: 0,
    Copter_xyRate_kp: 0.07,
    Board_number: 10345,
    State_startCount: 22
};

describe('Plazlink parameter messages', () => {
    it('decodes the reply captured from a real drone', () => {
        expect(decodeParam(REAL_PARAM_0)).toEqual({ index: 0, name: 'Offsets_accel_xOffset', value: 0 });
    });

    it('encodes index, little-endian float32 and a 32-byte zero-padded name', () => {
        const payload = encodeParam(19, 'Copter_pos_vMax', 0.4);
        expect(payload).toHaveLength(37);
        expect(payload[0]).toBe(19);
        expect([...payload.subarray(1, 5)]).toEqual([...new Uint8Array(new Float32Array([0.4]).buffer)]);
        expect(decodeParam(payload)).toEqual({ index: 19, name: 'Copter_pos_vMax', value: Math.fround(0.4) });
    });

    it('rejects names and indices the protocol cannot carry', () => {
        expect(() => encodeParam(0, 'x'.repeat(32), 1)).toThrow(RangeError);
        expect(() => encodeParam(255, 'Copter_pos_vMax', 1)).toThrow(RangeError);
    });

    it('compares and prints values as float32', () => {
        expect(sameFloat32(0.07, Math.fround(0.07))).toBe(true);
        expect(sameFloat32(0.07, 0.0701)).toBe(false);
        expect(cleanFloat32(Math.fround(0.07))).toBe(0.07);
        expect(cleanFloat32(Math.fround(3e-5))).toBe(3e-5);
    });

    it('reads every parameter the drone reports', async () => {
        const client = new PlazlinkClient(new FakeParamDrone(PROFILE_ON_DRONE));
        const progress: number[] = [];
        const params = await readAllParams(client, (done) => progress.push(done));
        expect(params.map((p) => p.name)).toEqual(Object.keys(PROFILE_ON_DRONE));
        expect(params.find((p) => p.name === 'BoardPioneer_baudrate')?.value).toBe(115200);
        expect(progress[progress.length - 1]).toBe(Object.keys(PROFILE_ON_DRONE).length);
    });

    it('writes a value and confirms it by reading it back', async () => {
        const drone = new FakeParamDrone(PROFILE_ON_DRONE);
        const client = new PlazlinkClient(drone);
        const stored = await writeParam(client, { index: 4, name: 'Copter_xyRate_kp' }, 0.09);
        expect(sameFloat32(stored, 0.09)).toBe(true);
        expect(sameFloat32(drone.params[4].value, 0.09)).toBe(true);
    });

    it('fails loudly when the drone does not keep the value', async () => {
        const drone = new FakeParamDrone(PROFILE_ON_DRONE);
        drone.refuse.add('Modules_lua');
        const client = new PlazlinkClient(drone);
        await expect(writeParam(client, { index: 3, name: 'Modules_lua' }, 1)).rejects.toMatchObject({ code: 'refused' });
    });

    it('refuses to write when the index belongs to another parameter on this firmware', async () => {
        const client = new PlazlinkClient(new FakeParamDrone(PROFILE_ON_DRONE));
        await expect(writeParam(client, { index: 3, name: 'Copter_xyRate_kp' }, 1)).rejects.toMatchObject({ code: 'protocol' });
    });
});

describe('write plan', () => {
    const drone: DroneParam[] = Object.entries(PROFILE_ON_DRONE).map(([name, value], index) => ({ index, name, value: Math.fround(value) }));

    it('lists only real differences and writes the baud rate last', () => {
        const plan = planParamWrite(drone, {
            BoardPioneer_baudrate: 57600,
            BoardPioneer_auxUMux: 0,
            Modules_lua: 1,
            Copter_xyRate_kp: 0.07,
            Lua_gpio: 1
        });
        expect(plan.changes.map((c) => c.name)).toEqual(['BoardPioneer_auxUMux', 'Modules_lua', 'BoardPioneer_baudrate']);
        expect(plan.unchanged).toBe(1);
        expect(plan.missingOnDrone).toEqual(['Lua_gpio']);
        expect(plan.changes.at(-1)?.linkNote).toContain('57600');
        expect(plan.changes[0].linkNote).not.toBeNull();
        expect(plan.changes[1].linkNote).toBeNull();
    });

    it('marks identity, counters and calibration as protected', () => {
        expect(['Board_number', 'State_startCount', 'Offsets_gyro_xOffset'].every(isProtectedParam)).toBe(true);
        expect(isProtectedParam('Copter_pos_vMax')).toBe(false);
        const plan = planParamWrite(drone, { Board_number: 1, State_startCount: 5, Modules_lua: 1 });
        expect(plan.changes.filter((c) => c.protectedByDefault).map((c) => c.name).sort()).toEqual(['Board_number', 'State_startCount']);
    });

    it('prints drone values as a profile the importer reads', () => {
        const text = dronePropertiesText(drone, 'drone 10345');
        expect(text.startsWith('# drone 10345\n')).toBe(true);
        expect(text).toContain('Copter_xyRate_kp=0.07\n');
        expect(text).toContain('BoardPioneer_baudrate=115200\n');
    });
});

describe('DroneLink parameters', () => {
    /** A drone that also answers the connection handshake, so DroneLink.connect() works against it. */
    class ConnectableDrone extends FakeParamDrone {
        override async write(data: Uint8Array) {
            for (const frame of new FrameParser().push(data)) {
                if (frame.id === MESSAGE_ID.protocolRequest) {
                    queueMicrotask(() => this.emit(MESSAGE_ID.protocolInfo, [1, 0, 0x5c, 0x28, 1, 0x69, 0x28, 0, 0]));
                } else if (frame.id === MESSAGE_ID.componentCountRequest) {
                    queueMicrotask(() => this.emit(MESSAGE_ID.componentCount, [0]));
                }
            }
            return super.write(data);
        }
        private emit(id: number, payload: number[]) {
            (this as unknown as { handler: ((chunk: Uint8Array) => void) | null }).handler?.(encodeFrame(id, payload));
        }
    }

    it('refuses to read or write while not connected', async () => {
        const link = new DroneLink(async () => new FakeParamDrone(PROFILE_ON_DRONE));
        await expect(link.readParameters()).rejects.toBeInstanceOf(PlazlinkError);
        await expect(link.writeParameters([])).rejects.toBeInstanceOf(PlazlinkError);
    });

    it('reads, then writes the planned changes through the shared port queue', async () => {
        const drone = new ConnectableDrone(PROFILE_ON_DRONE);
        const link = new DroneLink(async () => drone);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        await link.connect();
        const params = await link.readParameters();
        expect(params).toHaveLength(Object.keys(PROFILE_ON_DRONE).length);

        const plan = planParamWrite(params, { BoardPioneer_baudrate: 57600, BoardPioneer_auxUMux: 0, Modules_lua: 1 });
        const seen: string[] = [];
        const result = await link.writeParameters(plan.changes, (_done, _total, name) => name && seen.push(name));
        expect(result.failed).toBeNull();
        expect(result.written).toEqual(['BoardPioneer_auxUMux', 'Modules_lua', 'BoardPioneer_baudrate']);
        expect(drone.writes).toEqual(['BoardPioneer_auxUMux', 'Modules_lua', 'BoardPioneer_baudrate']);
        expect(seen).toEqual(result.written);
        await link.disconnect();
    });

    it('stops at the first parameter the drone does not keep and reports what was written before', async () => {
        const drone = new ConnectableDrone(PROFILE_ON_DRONE);
        drone.refuse.add('Modules_lua');
        const link = new DroneLink(async () => drone);
        await link.connect();
        const params = await link.readParameters();
        const plan = planParamWrite(params, { BoardPioneer_auxUMux: 0, Modules_lua: 1, BoardPioneer_baudrate: 57600 });
        const result = await link.writeParameters(plan.changes);
        expect(result.written).toEqual(['BoardPioneer_auxUMux']);
        expect(result.failed?.name).toBe('Modules_lua');
        expect(drone.writes).not.toContain('BoardPioneer_baudrate');
        await link.disconnect();
    });
});
