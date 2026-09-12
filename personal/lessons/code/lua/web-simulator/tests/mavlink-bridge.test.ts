/**
 * Unit tests for the pure MAVLink v2 framing/parsing helpers in
 * server/mavlink-bridge.ts. No sockets are opened here — these are the
 * binary-protocol building blocks that everything else in the bridge
 * relies on being correct.
 */
import {
    buildCameraRegistrationKey,
    buildCameraSessionId,
    buildMavlinkRegistrationKey,
    buildMavlinkSessionId,
    computeX25Crc,
    decodeDataUrlToBuffer,
    encodeMavlinkV2Message,
    isArmedAutopilotState,
    mapAutopilotStateToCustomMode,
    mapAutopilotStateToSystemStatus,
    normalizeConnectionMethod,
    parseCommandLong,
    parseRcChannelsOverride,
    parseSetPositionTargetLocalNed,
    parseSingleMavlinkFrame,
    sanitizeRegistration
} from '../server/mavlink-bridge.js';

const MAVLINK_MSG_ID_HEARTBEAT = 0;
const MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED = 84;

describe('computeX25Crc', () => {
    test('is deterministic for the same input', () => {
        const buffer = Buffer.from([1, 2, 3, 4, 5]);
        expect(computeX25Crc(buffer, 50)).toBe(computeX25Crc(buffer, 50));
    });

    test('changes when a single byte changes', () => {
        const a = Buffer.from([1, 2, 3, 4, 5]);
        const b = Buffer.from([1, 2, 3, 4, 6]);
        expect(computeX25Crc(a, 50)).not.toBe(computeX25Crc(b, 50));
    });

    test('changes when the CRC_EXTRA byte changes', () => {
        const buffer = Buffer.from([1, 2, 3]);
        expect(computeX25Crc(buffer, 50)).not.toBe(computeX25Crc(buffer, 51));
    });

    test('stays within a 16-bit range', () => {
        const crc = computeX25Crc(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]), 255);
        expect(crc).toBeGreaterThanOrEqual(0);
        expect(crc).toBeLessThanOrEqual(0xFFFF);
    });
});

describe('encodeMavlinkV2Message / parseSingleMavlinkFrame round-trip', () => {
    test('an encoded heartbeat frame parses back to the same header fields and payload', () => {
        const payload = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const frame = encodeMavlinkV2Message(42, 1, 200, MAVLINK_MSG_ID_HEARTBEAT, payload);

        expect(frame[0]).toBe(0xFD); // MAVLink v2 magic byte

        const parsed = parseSingleMavlinkFrame(frame);
        expect(parsed).not.toBeNull();
        expect(parsed?.sequence).toBe(42);
        expect(parsed?.systemId).toBe(1);
        expect(parsed?.componentId).toBe(200);
        expect(parsed?.messageId).toBe(MAVLINK_MSG_ID_HEARTBEAT);
        expect(parsed?.payload).toEqual(payload);
    });

    test('encodes a 3-byte little-endian message id correctly', () => {
        // SET_POSITION_TARGET_LOCAL_NED (84) exercises byte 1 of the 3-byte message id field.
        const payload = Buffer.alloc(4);
        const frame = encodeMavlinkV2Message(0, 1, 1, MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED, payload);
        const parsed = parseSingleMavlinkFrame(frame);
        expect(parsed?.messageId).toBe(MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED);
    });

    test('returns null for a datagram shorter than a valid frame', () => {
        expect(parseSingleMavlinkFrame(Buffer.from([0xFD, 0x01]))).toBeNull();
    });

    test('returns null for a datagram with neither v1 nor v2 magic byte', () => {
        expect(parseSingleMavlinkFrame(Buffer.alloc(20))).toBeNull();
    });

    test('parses a v1-framed datagram', () => {
        // v1: [0xFE, len, seq, sysId, compId, msgId, ...payload, crcLo, crcHi]
        const payload = Buffer.from([9, 8, 7]);
        const datagram = Buffer.concat([
            Buffer.from([0xFE, payload.length, 5, 1, 1, MAVLINK_MSG_ID_HEARTBEAT]),
            payload,
            Buffer.from([0, 0])
        ]);
        const parsed = parseSingleMavlinkFrame(datagram);
        expect(parsed).toEqual({
            sequence: 5,
            systemId: 1,
            componentId: 1,
            messageId: MAVLINK_MSG_ID_HEARTBEAT,
            payload
        });
    });
});

describe('parseCommandLong', () => {
    test('reads the 7 float params, command id and target/confirmation bytes', () => {
        const payload = Buffer.alloc(33);
        payload.writeFloatLE(1.5, 0);
        payload.writeFloatLE(2.5, 4);
        payload.writeUInt16LE(400, 28); // command
        payload.writeUInt8(1, 30); // targetSystem
        payload.writeUInt8(1, 31); // targetComponent
        payload.writeUInt8(0, 32); // confirmation

        const parsed = parseCommandLong(payload);
        expect(parsed?.param1).toBeCloseTo(1.5);
        expect(parsed?.param2).toBeCloseTo(2.5);
        expect(parsed?.command).toBe(400);
        expect(parsed?.targetSystem).toBe(1);
        expect(parsed?.targetComponent).toBe(1);
    });

    test('returns null for a truncated payload', () => {
        expect(parseCommandLong(Buffer.alloc(10))).toBeNull();
    });
});

describe('parseSetPositionTargetLocalNed', () => {
    test('reads position/velocity/acceleration/yaw fields and the trailing bytes', () => {
        const payload = Buffer.alloc(53);
        payload.writeFloatLE(1, 4); // x
        payload.writeFloatLE(2, 8); // y
        payload.writeFloatLE(3, 12); // z
        payload.writeFloatLE(0.5, 40); // yaw
        payload.writeUInt16LE(0b0000100111111000, 48); // typeMask
        payload.writeUInt8(1, 50); // targetSystem
        payload.writeUInt8(1, 51); // targetComponent
        payload.writeUInt8(1, 52); // coordinateFrame (MAV_FRAME_LOCAL_NED)

        const parsed = parseSetPositionTargetLocalNed(payload);
        expect(parsed).toMatchObject({ x: 1, y: 2, z: 3, yaw: 0.5, coordinateFrame: 1 });
    });

    test('returns null when the payload is too short', () => {
        expect(parseSetPositionTargetLocalNed(Buffer.alloc(52))).toBeNull();
    });
});

describe('parseRcChannelsOverride', () => {
    test('reads 8 uint16 channels plus target system/component', () => {
        const payload = Buffer.alloc(18);
        for (let index = 0; index < 8; index += 1) {
            payload.writeUInt16LE(1500 + index, index * 2);
        }
        payload.writeUInt8(1, 16);
        payload.writeUInt8(1, 17);

        const parsed = parseRcChannelsOverride(payload);
        expect(parsed?.channels).toEqual([1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507]);
        expect(parsed?.targetSystem).toBe(1);
        expect(parsed?.targetComponent).toBe(1);
    });

    test('returns null when the payload is too short', () => {
        expect(parseRcChannelsOverride(Buffer.alloc(17))).toBeNull();
    });
});

describe('decodeDataUrlToBuffer', () => {
    test('decodes a base64 data URL', () => {
        const original = Buffer.from('hello world');
        const dataUrl = `data:image/jpeg;base64,${original.toString('base64')}`;
        expect(decodeDataUrlToBuffer(dataUrl)).toEqual(original);
    });

    test('returns null for null input', () => {
        expect(decodeDataUrlToBuffer(null)).toBeNull();
    });

    test('returns null for a non-data-url string', () => {
        expect(decodeDataUrlToBuffer('not a data url')).toBeNull();
    });
});

describe('autopilot state mapping', () => {
    test.each([
        ['ARMED', 11],
        ['TAKEOFF', 12],
        ['MISSION', 15],
        ['LANDING', 23],
        ['DISARMED', 1],
        [null, 1],
        [undefined, 1],
        ['UNKNOWN_STATE', 1]
    ] as const)('mapAutopilotStateToCustomMode(%s) -> %d', (state, expected) => {
        expect(mapAutopilotStateToCustomMode(state)).toBe(expected);
    });

    test.each([
        ['ARMED', true],
        ['TAKEOFF', true],
        ['MISSION', true],
        ['LANDING', true],
        ['DISARMED', false],
        [null, false],
        [undefined, false]
    ] as const)('isArmedAutopilotState(%s) -> %s', (state, expected) => {
        expect(isArmedAutopilotState(state)).toBe(expected);
    });

    test('mapAutopilotStateToSystemStatus treats flight states as active, everything else as standby', () => {
        expect(mapAutopilotStateToSystemStatus('MISSION')).not.toBe(mapAutopilotStateToSystemStatus('DISARMED'));
        expect(mapAutopilotStateToSystemStatus(null)).toBe(mapAutopilotStateToSystemStatus('DISARMED'));
    });
});

describe('sanitizeRegistration / normalizeConnectionMethod', () => {
    test('falls back to sane defaults for an empty registration', () => {
        const sanitized = sanitizeRegistration({});
        expect(sanitized).toMatchObject({
            droneName: 'pioneer',
            droneIp: '127.0.0.1',
            mavlinkPort: 8001,
            connectionMethod: 'udpout',
            device: '/dev/serial0',
            baud: 115200
        });
    });

    test('derives the default camera port from the mavlink port when not given', () => {
        expect(sanitizeRegistration({ mavlinkPort: 8002 }).cameraPort).toBe(18002);
    });

    test('keeps an explicit cameraPort even when it does not follow the +10000 convention', () => {
        expect(sanitizeRegistration({ mavlinkPort: 8002, cameraPort: 9999 }).cameraPort).toBe(9999);
    });

    test.each(['serial', 'udpin', 'camera', 'udpout', 'garbage', undefined] as const)(
        'normalizeConnectionMethod(%s)',
        (value) => {
            const result = normalizeConnectionMethod(value);
            if (value === 'serial' || value === 'udpin' || value === 'camera') {
                expect(result).toBe(value);
            } else {
                expect(result).toBe('udpout');
            }
        }
    );
});

describe('registration key/session id builders', () => {
    const connection = sanitizeRegistration({ droneIp: '10.0.0.5', mavlinkPort: 8005, connectionMethod: 'udpin' });

    test('mavlink registration key is keyed only by port, so re-registering the same port replaces it', () => {
        expect(buildMavlinkRegistrationKey(connection)).toBe('mavlink:8005');
    });

    test('camera registration key is keyed by camera port', () => {
        expect(buildCameraRegistrationKey(connection)).toBe('camera:18005');
    });

    test('mavlink/camera session ids are distinct for the same connection', () => {
        expect(buildMavlinkSessionId(connection)).not.toBe(buildCameraSessionId(connection));
        expect(buildMavlinkSessionId(connection)).toContain('10.0.0.5');
        expect(buildCameraSessionId(connection)).toContain('10.0.0.5');
    });
});
