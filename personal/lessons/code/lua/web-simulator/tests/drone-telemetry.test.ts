import { decodeFieldValue, TELEMETRY_FIELDS, VALUE_TYPES } from '../public/modules/hardware/telemetry.js';

const payload = (type: number, ...bytes: number[]) => Uint8Array.from([8, 3, type, ...bytes]);

/* Raw replies and scales below were read from a live Pioneer (UavMonitor, SensorMonitor, CBoard). */
describe('drone telemetry decoding', () => {
    it('applies the scale of the field: roll -28 at scale -2 is -0.28 degrees', () => {
        expect(decodeFieldValue(payload(3, 0xe4, 0xff), -2)).toBe(-0.28);
    });

    it('reads signed and unsigned integers of every width', () => {
        expect(decodeFieldValue(payload(4, 0xa1, 0xff, 0xff, 0xff), -3)).toBe(-0.095);
        expect(decodeFieldValue(payload(7, 0xf0, 0x09), -3)).toBe(2.544); // VoltBatt 2544 mV
        expect(decodeFieldValue(payload(8, 0x40, 0xb3, 0xd5, 0x09), 0)).toBe(165_000_000); // cpuFrequency
        expect(decodeFieldValue(payload(9, 0xd0, 0x62, 0x01, 0, 0, 0, 0, 0), 0)).toBe(90_832); // allocatedMemory
        expect(decodeFieldValue(payload(2, 0xff), 0)).toBe(-1);
        expect(decodeFieldValue(payload(6, 0x02), 0)).toBe(2);
    });

    it('rounds away floating-point noise from a negative scale', () => {
        expect(decodeFieldValue(payload(4, 182, 0, 0, 0), -3)).toBe(0.182);
    });

    it('rejects an unknown type and a short payload', () => {
        expect(decodeFieldValue(payload(99, 1), 0)).toBeNull();
        expect(decodeFieldValue(payload(4, 1, 2), 0)).toBeNull();
    });

    it('lists every wire type with its size', () => {
        expect(Object.values(VALUE_TYPES).map((t) => t.size)).toEqual([1, 1, 1, 2, 4, 8, 1, 2, 4, 8, 4, 8]);
    });

    it('asks for each reading once', () => {
        const keys = TELEMETRY_FIELDS.map((f) => f.key);
        expect(new Set(keys).size).toBe(keys.length);
    });
});
