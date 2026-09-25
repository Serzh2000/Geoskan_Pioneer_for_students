import dgram from 'dgram';
import express from 'express';
import net from 'net';
import {
    getExternalPythonBridgeState,
    recordExternalPythonBridgeEvent,
    type ExternalPythonBridgeState
} from './external-python-bridge.js';
import type { PioneerConnectionMethod } from './pioneer-connection.js';

interface BridgeConnectionRegistration {
    droneName: string;
    droneIp: string;
    mavlinkPort: number;
    cameraPort: number;
    connectionMethod: PioneerConnectionMethod;
    device: string;
    baud: number;
}

interface ParsedMavlinkFrame {
    sequence: number;
    systemId: number;
    componentId: number;
    messageId: number;
    payload: Buffer;
}

interface PositionTargetCommand {
    timeBootMs: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    afx: number;
    afy: number;
    afz: number;
    yaw: number;
    yawRate: number;
    typeMask: number;
    targetSystem: number;
    targetComponent: number;
    coordinateFrame: number;
}

interface RcOverrideCommand {
    channels: number[];
    targetSystem: number;
    targetComponent: number;
}

interface MavlinkSession {
    sessionId: string;
    remoteAddress: string | null;
    remotePort: number | null;
    remoteSystemId: number;
    remoteComponentId: number;
    lastSeenAt: number;
    announced: boolean;
    closed: boolean;
    outgoingSequence: number;
    missionSequence: number;
    lastPointReached: boolean;
}

interface CameraClientSession {
    sessionId: string;
    socket: net.Socket;
    remoteAddress: string;
    remotePort: number;
    /** Where frames go after the client "punched" our UDP port (see CameraTcpBridge). */
    udpTarget: { address: string; port: number } | null;
}

const MAVLINK_V1_MAGIC = 0xFE;
const MAVLINK_V2_MAGIC = 0xFD;
const MAVLINK_V1_HEADER_LENGTH = 6;
const MAVLINK_V2_HEADER_LENGTH = 10;
const MAVLINK_CHECKSUM_LENGTH = 2;
const MAVLINK_MSG_ID_HEARTBEAT = 0;
const MAVLINK_MSG_ID_LOCAL_POSITION_NED = 32;
const MAVLINK_MSG_ID_MISSION_ITEM_REACHED = 46;
const MAVLINK_MSG_ID_COMMAND_LONG = 76;
const MAVLINK_MSG_ID_COMMAND_ACK = 77;
const MAVLINK_MSG_ID_RC_CHANNELS_OVERRIDE = 70;
const MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED = 84;
const MAVLINK_MSG_ID_POSITION_TARGET_LOCAL_NED = 85;

const MAV_CMD_NAV_TAKEOFF = 22;
const MAV_CMD_NAV_LAND = 21;
const MAV_CMD_COMPONENT_ARM_DISARM = 400;
const MAV_CMD_USER_1 = 31010;

const MAV_FRAME_LOCAL_NED = 1;
const MAV_FRAME_BODY_FRD = 12;

const MAV_TYPE_QUADROTOR = 2;
const MAV_AUTOPILOT_ARDUPILOTMEGA = 3;
const MAV_STATE_STANDBY = 3;
const MAV_STATE_ACTIVE = 4;

const HEARTBEAT_BASE_MODE_SAFETY_ARMED = 0x80;
const HEARTBEAT_INTERVAL_MS = 200;
const MAVLINK_SESSION_TIMEOUT_MS = 2000;
// How often the camera bridge checks for a new frame (the browser uploads them
// separately, up to 30/s); an unchanged frame is only re-sent as a keep-alive.
const CAMERA_FRAME_INTERVAL_MS = 33;

const GO_TO_LOCAL_POINT_MASK = 0b0000100111111000;
const MANUAL_SPEED_MASK = 0b0000010111000111;

const MAVLINK_SYS_ID = 1;
const MAVLINK_COMP_ID = 1;

const MAVLINK_CRC_EXTRA: Record<number, number> = {
    [MAVLINK_MSG_ID_HEARTBEAT]: 50,
    [MAVLINK_MSG_ID_LOCAL_POSITION_NED]: 185,
    [MAVLINK_MSG_ID_MISSION_ITEM_REACHED]: 11,
    [MAVLINK_MSG_ID_COMMAND_LONG]: 152,
    [MAVLINK_MSG_ID_COMMAND_ACK]: 143,
    [MAVLINK_MSG_ID_RC_CHANNELS_OVERRIDE]: 124,
    [MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED]: 143,
    [MAVLINK_MSG_ID_POSITION_TARGET_LOCAL_NED]: 140
};

const DEFAULT_CONNECTIONS: BridgeConnectionRegistration[] = [
    {
        droneName: 'pioneer',
        droneIp: '127.0.0.1',
        mavlinkPort: 8001,
        cameraPort: 18001,
        connectionMethod: 'udpout',
        device: '/dev/serial0',
        baud: 115200
    }
];

const registeredConnections = new Map<string, BridgeConnectionRegistration>();
const mavlinkBridges = new Map<string, MavlinkUdpBridge>();
const cameraBridges = new Map<string, CameraTcpBridge>();

// The maps above are keyed by port, but a client can re-register the same
// logical drone under a different port (e.g. the user changes the MAVLink
// port in the UI). These track which port-keyed bridge currently "belongs"
// to a given drone name, so that when a new registration for a known drone
// arrives under a different key, the old bridge can be closed instead of
// left running forever (leaked UDP socket / TCP server / interval timers).
const droneMavlinkKeys = new Map<string, string>();
const droneCameraKeys = new Map<string, string>();

export function normalizeConnectionMethod(value: unknown): PioneerConnectionMethod {
    return value === 'serial' || value === 'udpin' || value === 'camera' ? value : 'udpout';
}

export function sanitizeRegistration(input: Partial<BridgeConnectionRegistration>): BridgeConnectionRegistration {
    const mavlinkPort = Number.isFinite(input.mavlinkPort) ? Number(input.mavlinkPort) : 8001;
    return {
        droneName: typeof input.droneName === 'string' && input.droneName.trim() ? input.droneName.trim() : 'pioneer',
        droneIp: typeof input.droneIp === 'string' && input.droneIp.trim() ? input.droneIp.trim() : '127.0.0.1',
        mavlinkPort,
        cameraPort: Number.isFinite(input.cameraPort) ? Number(input.cameraPort) : mavlinkPort + 10000,
        connectionMethod: normalizeConnectionMethod(input.connectionMethod),
        device: typeof input.device === 'string' && input.device.trim() ? input.device.trim() : '/dev/serial0',
        baud: Number.isFinite(input.baud) ? Number(input.baud) : 115200
    };
}

export function buildMavlinkRegistrationKey(connection: BridgeConnectionRegistration): string {
    return `mavlink:${connection.mavlinkPort}`;
}

export function buildCameraRegistrationKey(connection: BridgeConnectionRegistration): string {
    return `camera:${connection.cameraPort}`;
}

export function buildMavlinkSessionId(connection: BridgeConnectionRegistration): string {
    return `mavlink-${connection.connectionMethod}-${connection.droneIp}-${connection.mavlinkPort}`;
}

export function buildCameraSessionId(connection: BridgeConnectionRegistration): string {
    return `camera-${connection.droneIp}-${connection.cameraPort}`;
}

export function computeX25Crc(buffer: Buffer, extra: number): number {
    let crc = 0xFFFF;
    for (const byte of buffer) {
        let tmp = byte ^ (crc & 0xFF);
        tmp ^= (tmp << 4) & 0xFF;
        crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF;
    }

    let tmp = extra ^ (crc & 0xFF);
    tmp ^= (tmp << 4) & 0xFF;
    crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF;
    return crc;
}

export function encodeMavlinkV2Message(sequence: number, systemId: number, componentId: number, messageId: number, payload: Buffer): Buffer {
    const header = Buffer.alloc(MAVLINK_V2_HEADER_LENGTH);
    header[0] = MAVLINK_V2_MAGIC;
    header[1] = payload.length;
    header[2] = 0;
    header[3] = 0;
    header[4] = sequence & 0xFF;
    header[5] = systemId & 0xFF;
    header[6] = componentId & 0xFF;
    header[7] = messageId & 0xFF;
    header[8] = (messageId >> 8) & 0xFF;
    header[9] = (messageId >> 16) & 0xFF;

    const crcInput = Buffer.concat([header.subarray(1), payload]);
    const crc = computeX25Crc(crcInput, MAVLINK_CRC_EXTRA[messageId] ?? 0);
    const checksum = Buffer.alloc(MAVLINK_CHECKSUM_LENGTH);
    checksum.writeUInt16LE(crc, 0);
    return Buffer.concat([header, payload, checksum]);
}

export function parseSingleMavlinkFrame(datagram: Buffer): ParsedMavlinkFrame | null {
    if (datagram.length < MAVLINK_V1_HEADER_LENGTH + MAVLINK_CHECKSUM_LENGTH) {
        return null;
    }

    if (datagram[0] === MAVLINK_V1_MAGIC) {
        const payloadLength = datagram[1];
        const frameLength = MAVLINK_V1_HEADER_LENGTH + payloadLength + MAVLINK_CHECKSUM_LENGTH;
        if (datagram.length < frameLength) {
            return null;
        }

        return {
            sequence: datagram[2],
            systemId: datagram[3],
            componentId: datagram[4],
            messageId: datagram[5],
            payload: datagram.subarray(MAVLINK_V1_HEADER_LENGTH, MAVLINK_V1_HEADER_LENGTH + payloadLength)
        };
    }

    if (datagram[0] !== MAVLINK_V2_MAGIC) {
        return null;
    }

    const payloadLength = datagram[1];
    const incompatFlags = datagram[2];
    const signatureLength = (incompatFlags & 0x01) === 0x01 ? 13 : 0;
    const frameLength = MAVLINK_V2_HEADER_LENGTH + payloadLength + MAVLINK_CHECKSUM_LENGTH + signatureLength;
    if (datagram.length < frameLength) {
        return null;
    }

    const messageId = datagram[7] | (datagram[8] << 8) | (datagram[9] << 16);
    const payload = datagram.subarray(MAVLINK_V2_HEADER_LENGTH, MAVLINK_V2_HEADER_LENGTH + payloadLength);
    return {
        sequence: datagram[4],
        systemId: datagram[5],
        componentId: datagram[6],
        messageId,
        payload
    };
}

export function parseCommandLong(payload: Buffer) {
    if (payload.length < 33) {
        return null;
    }

    return {
        param1: payload.readFloatLE(0),
        param2: payload.readFloatLE(4),
        param3: payload.readFloatLE(8),
        param4: payload.readFloatLE(12),
        param5: payload.readFloatLE(16),
        param6: payload.readFloatLE(20),
        param7: payload.readFloatLE(24),
        command: payload.readUInt16LE(28),
        targetSystem: payload.readUInt8(30),
        targetComponent: payload.readUInt8(31),
        confirmation: payload.readUInt8(32)
    };
}

export function parseSetPositionTargetLocalNed(payload: Buffer): PositionTargetCommand | null {
    if (payload.length < 53) {
        return null;
    }

    return {
        timeBootMs: payload.readUInt32LE(0),
        x: payload.readFloatLE(4),
        y: payload.readFloatLE(8),
        z: payload.readFloatLE(12),
        vx: payload.readFloatLE(16),
        vy: payload.readFloatLE(20),
        vz: payload.readFloatLE(24),
        afx: payload.readFloatLE(28),
        afy: payload.readFloatLE(32),
        afz: payload.readFloatLE(36),
        yaw: payload.readFloatLE(40),
        yawRate: payload.readFloatLE(44),
        typeMask: payload.readUInt16LE(48),
        targetSystem: payload.readUInt8(50),
        targetComponent: payload.readUInt8(51),
        coordinateFrame: payload.readUInt8(52)
    };
}

export function parseRcChannelsOverride(payload: Buffer): RcOverrideCommand | null {
    if (payload.length < 18) {
        return null;
    }

    return {
        channels: [
            payload.readUInt16LE(0),
            payload.readUInt16LE(2),
            payload.readUInt16LE(4),
            payload.readUInt16LE(6),
            payload.readUInt16LE(8),
            payload.readUInt16LE(10),
            payload.readUInt16LE(12),
            payload.readUInt16LE(14)
        ],
        targetSystem: payload.readUInt8(16),
        targetComponent: payload.readUInt8(17)
    };
}

export function decodeDataUrlToBuffer(dataUrl: string | null): Buffer | null {
    if (!dataUrl) {
        return null;
    }

    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!match?.[1]) {
        return null;
    }

    try {
        return Buffer.from(match[1], 'base64');
    } catch {
        return null;
    }
}

export function mapAutopilotStateToCustomMode(state: string | null | undefined): number {
    switch (state) {
        case 'ARMED':
            return 11;
        case 'TAKEOFF':
            return 12;
        case 'MISSION':
            return 15;
        case 'LANDING':
            return 23;
        case 'DISARMED':
            return 1;
        default:
            return 1;
    }
}

export function mapAutopilotStateToSystemStatus(state: string | null | undefined): number {
    switch (state) {
        case 'TAKEOFF':
        case 'MISSION':
        case 'LANDING':
        case 'ARMED':
            return MAV_STATE_ACTIVE;
        default:
            return MAV_STATE_STANDBY;
    }
}

export function isArmedAutopilotState(state: string | null | undefined): boolean {
    return state === 'ARMED' || state === 'TAKEOFF' || state === 'MISSION' || state === 'LANDING';
}

function emitBridgeEvent(connection: BridgeConnectionRegistration, sessionId: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): void {
    recordExternalPythonBridgeEvent({
        sessionId,
        droneName: connection.droneName,
        droneIp: connection.droneIp,
        mavlinkPort: connection.mavlinkPort,
        connectionMethod: connection.connectionMethod,
        device: connection.device,
        baud: connection.baud,
        method,
        args,
        kwargs
    });
}

function emitCameraBridgeEvent(connection: BridgeConnectionRegistration, sessionId: string, method: string): void {
    recordExternalPythonBridgeEvent({
        sessionId,
        droneName: connection.droneName,
        droneIp: connection.droneIp,
        mavlinkPort: connection.cameraPort,
        connectionMethod: 'camera',
        device: connection.device,
        baud: connection.baud,
        method,
        args: [],
        kwargs: {}
    });
}

class MavlinkUdpBridge {
    private readonly connection: BridgeConnectionRegistration;
    private readonly session: MavlinkSession;
    private readonly socket: dgram.Socket;
    private readonly heartbeatTimer: NodeJS.Timeout;

    constructor(connection: BridgeConnectionRegistration) {
        this.connection = connection;
        this.session = {
            sessionId: buildMavlinkSessionId(connection),
            remoteAddress: null,
            remotePort: null,
            remoteSystemId: 255,
            remoteComponentId: 190,
            lastSeenAt: 0,
            announced: false,
            closed: false,
            outgoingSequence: 0,
            missionSequence: 0,
            lastPointReached: false
        };
        this.socket = dgram.createSocket('udp4');
        this.socket.on('message', (message, remote) => this.handleDatagram(message, remote.address, remote.port));
        this.socket.on('error', (error) => {
            console.error(`MAVLink bridge UDP error on port ${this.connection.mavlinkPort}:`, error);
        });
        this.socket.bind(this.connection.mavlinkPort, '0.0.0.0');
        this.heartbeatTimer = setInterval(() => this.flushTelemetry(), HEARTBEAT_INTERVAL_MS);
    }

    close(): void {
        clearInterval(this.heartbeatTimer);
        this.socket.close();
    }

    private handleDatagram(datagram: Buffer, remoteAddress: string, remotePort: number): void {
        const frame = parseSingleMavlinkFrame(datagram);
        if (!frame) {
            return;
        }

        this.touchSession(remoteAddress, remotePort, frame.systemId, frame.componentId);
        switch (frame.messageId) {
            case MAVLINK_MSG_ID_HEARTBEAT:
                this.sendHeartbeat();
                this.sendLocalPosition();
                return;
            case MAVLINK_MSG_ID_COMMAND_LONG:
                this.handleCommandLong(frame.payload);
                return;
            case MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED:
                this.handleSetPositionTargetLocalNed(frame.payload);
                return;
            case MAVLINK_MSG_ID_RC_CHANNELS_OVERRIDE:
                this.handleRcChannelsOverride(frame.payload);
                return;
            default:
                return;
        }
    }

    private touchSession(remoteAddress: string, remotePort: number, systemId: number, componentId: number): void {
        this.session.remoteAddress = remoteAddress;
        this.session.remotePort = remotePort;
        this.session.remoteSystemId = systemId || this.session.remoteSystemId;
        this.session.remoteComponentId = componentId || this.session.remoteComponentId;
        this.session.lastSeenAt = Date.now();
        this.session.closed = false;

        if (!this.session.announced) {
            emitBridgeEvent(this.connection, this.session.sessionId, '__init__');
            this.session.announced = true;
        }
    }

    private getBridgeState(): ExternalPythonBridgeState | null {
        return getExternalPythonBridgeState({
            sessionId: this.session.sessionId,
            droneIp: this.connection.droneIp,
            mavlinkPort: this.connection.mavlinkPort,
            connectionMethod: this.connection.connectionMethod
        });
    }

    private sendMessage(messageId: number, payload: Buffer): void {
        if (!this.session.remoteAddress || !this.session.remotePort) {
            return;
        }

        const packet = encodeMavlinkV2Message(
            this.session.outgoingSequence++ & 0xFF,
            MAVLINK_SYS_ID,
            MAVLINK_COMP_ID,
            messageId,
            payload
        );
        this.socket.send(packet, this.session.remotePort, this.session.remoteAddress);
    }

    private sendHeartbeat(): void {
        const state = this.getBridgeState();
        const autopilotState = state?.autopilotState ?? 'DISARMED';
        const payload = Buffer.alloc(9);
        payload.writeUInt32LE(mapAutopilotStateToCustomMode(autopilotState), 0);
        payload.writeUInt8(MAV_TYPE_QUADROTOR, 4);
        payload.writeUInt8(MAV_AUTOPILOT_ARDUPILOTMEGA, 5);
        payload.writeUInt8(isArmedAutopilotState(autopilotState) ? HEARTBEAT_BASE_MODE_SAFETY_ARMED : 0, 6);
        payload.writeUInt8(mapAutopilotStateToSystemStatus(autopilotState), 7);
        payload.writeUInt8(3, 8);
        this.sendMessage(MAVLINK_MSG_ID_HEARTBEAT, payload);
    }

    private sendCommandAck(command: number, result = 0): void {
        const payload = Buffer.alloc(10);
        payload.writeUInt16LE(command, 0);
        payload.writeUInt8(result, 2);
        payload.writeUInt8(0, 3);
        payload.writeInt32LE(0, 4);
        payload.writeUInt8(this.session.remoteSystemId, 8);
        payload.writeUInt8(this.session.remoteComponentId, 9);
        this.sendMessage(MAVLINK_MSG_ID_COMMAND_ACK, payload);
    }

    private sendPositionTargetAck(command: PositionTargetCommand): void {
        const payload = Buffer.alloc(51);
        payload.writeUInt32LE(command.timeBootMs >>> 0, 0);
        payload.writeFloatLE(command.x, 4);
        payload.writeFloatLE(command.y, 8);
        payload.writeFloatLE(command.z, 12);
        payload.writeFloatLE(command.vx, 16);
        payload.writeFloatLE(command.vy, 20);
        payload.writeFloatLE(command.vz, 24);
        payload.writeFloatLE(command.afx, 28);
        payload.writeFloatLE(command.afy, 32);
        payload.writeFloatLE(command.afz, 36);
        payload.writeFloatLE(command.yaw, 40);
        payload.writeFloatLE(command.yawRate, 44);
        payload.writeUInt16LE(command.typeMask, 48);
        payload.writeUInt8(command.coordinateFrame, 50);
        this.sendMessage(MAVLINK_MSG_ID_POSITION_TARGET_LOCAL_NED, payload);
    }

    private sendLocalPosition(): void {
        const state = this.getBridgeState();
        if (!state?.localPosition) {
            return;
        }

        const payload = Buffer.alloc(28);
        payload.writeUInt32LE(Date.now() % 0xFFFFFFFF, 0);
        payload.writeFloatLE(state.localPosition.y, 4);
        payload.writeFloatLE(state.localPosition.x, 8);
        payload.writeFloatLE(-state.localPosition.z, 12);
        payload.writeFloatLE(0, 16);
        payload.writeFloatLE(0, 20);
        payload.writeFloatLE(0, 24);
        this.sendMessage(MAVLINK_MSG_ID_LOCAL_POSITION_NED, payload);
    }

    private sendMissionItemReached(): void {
        const payload = Buffer.alloc(2);
        payload.writeUInt16LE(this.session.missionSequence, 0);
        this.sendMessage(MAVLINK_MSG_ID_MISSION_ITEM_REACHED, payload);
    }

    private flushTelemetry(): void {
        if (!this.session.remoteAddress || !this.session.remotePort) {
            return;
        }

        const now = Date.now();
        if (now - this.session.lastSeenAt > MAVLINK_SESSION_TIMEOUT_MS) {
            if (this.session.announced && !this.session.closed) {
                emitBridgeEvent(this.connection, this.session.sessionId, 'close_connection');
                this.session.closed = true;
            }
            this.session.lastPointReached = false;
            return;
        }

        this.sendHeartbeat();
        this.sendLocalPosition();

        const state = this.getBridgeState();
        const pointReached = Boolean(state?.pointReached);
        if (pointReached && !this.session.lastPointReached) {
            this.session.missionSequence += 1;
            this.sendMissionItemReached();
        }
        this.session.lastPointReached = pointReached;
    }

    private handleCommandLong(payload: Buffer): void {
        const command = parseCommandLong(payload);
        if (!command) {
            return;
        }

        switch (command.command) {
            case MAV_CMD_COMPONENT_ARM_DISARM:
                emitBridgeEvent(
                    this.connection,
                    this.session.sessionId,
                    command.param1 >= 0.5 ? 'arm' : 'disarm'
                );
                this.sendCommandAck(command.command);
                return;
            case MAV_CMD_NAV_TAKEOFF:
                emitBridgeEvent(this.connection, this.session.sessionId, 'takeoff');
                this.sendCommandAck(command.command);
                return;
            case MAV_CMD_NAV_LAND:
                emitBridgeEvent(this.connection, this.session.sessionId, 'land');
                this.sendCommandAck(command.command);
                return;
            case MAV_CMD_USER_1:
                emitBridgeEvent(this.connection, this.session.sessionId, 'led_control', [], {
                    led_id: Math.round(command.param1),
                    r: Math.round(command.param2),
                    g: Math.round(command.param3),
                    b: Math.round(command.param4)
                });
                this.sendCommandAck(command.command);
                return;
            default:
                this.sendCommandAck(command.command, 0);
        }
    }

    private handleSetPositionTargetLocalNed(payload: Buffer): void {
        const command = parseSetPositionTargetLocalNed(payload);
        if (!command) {
            return;
        }

        if (command.typeMask === GO_TO_LOCAL_POINT_MASK) {
            emitBridgeEvent(
                this.connection,
                this.session.sessionId,
                command.coordinateFrame === MAV_FRAME_BODY_FRD ? 'go_to_local_point_body_fixed' : 'go_to_local_point',
                [],
                {
                    x: command.y,
                    y: command.x,
                    z: -command.z,
                    yaw: command.yaw
                }
            );
        } else if (command.typeMask === MANUAL_SPEED_MASK) {
            emitBridgeEvent(
                this.connection,
                this.session.sessionId,
                command.coordinateFrame === MAV_FRAME_BODY_FRD ? 'set_manual_speed_body_fixed' : 'set_manual_speed',
                [],
                {
                    vx: command.vy,
                    vy: command.vx,
                    vz: -command.vz,
                    yaw_rate: command.yawRate
                }
            );
        }

        this.sendPositionTargetAck(command);
    }

    private handleRcChannelsOverride(payload: Buffer): void {
        const command = parseRcChannelsOverride(payload);
        if (!command) {
            return;
        }

        emitBridgeEvent(this.connection, this.session.sessionId, 'send_rc_channels', [], {
            channel_1: command.channels[0],
            channel_2: command.channels[1],
            channel_3: command.channels[2],
            channel_4: command.channels[3],
            channel_5: command.channels[4],
            channel_6: command.channels[5],
            channel_7: command.channels[6],
            channel_8: command.channels[7]
        });
    }
}

/*
 * Pioneer camera protocol: the client opens TCP to the camera port, binds UDP to
 * the same local port and waits for JPEG datagrams - it never sends UDP itself.
 * On a LAN that is enough. Across the internet the client's router drops those
 * datagrams: it only lets UDP in after the computer sent UDP out from that port
 * (checked with tcpdump - the server sent every frame, none arrived). So the UDP
 * socket also listens on the camera port: one datagram from the client's camera
 * socket ("punch") opens its router, and from then on frames go exactly to the
 * address the punch came from, sent from the port it was sent to - what even
 * strict routers let back in. Without a punch nothing changes (TCP peer port).
 */
class CameraTcpBridge {
    private readonly connection: BridgeConnectionRegistration;
    private readonly server: net.Server;
    private readonly udpSocket: dgram.Socket;
    // Several viewers at once: a script restarted while the old one still runs,
    // or two scripts. Each new connection used to take the stream from the
    // previous one, so both kept dropping out and reconnecting.
    private readonly clients = new Set<CameraClientSession>();
    private frameTimer: NodeJS.Timeout | null = null;
    private lastSentFrame: Buffer | null = null;
    private lastConnectAnnouncedAt = 0;
    private lastSentAt = 0;
    /** Last punch per client IP: it may arrive a moment before the TCP connect is handled. */
    private readonly punches = new Map<string, { port: number; at: number }>();

    constructor(connection: BridgeConnectionRegistration) {
        this.connection = connection;
        this.server = net.createServer((socket) => this.handleSocket(socket));
        this.server.on('error', (error) => {
            console.error(`Camera bridge TCP error on port ${this.connection.cameraPort}:`, error);
        });
        this.server.listen(this.connection.cameraPort, '0.0.0.0');
        this.udpSocket = dgram.createSocket('udp4');
        this.udpSocket.on('message', (_message, remote) => this.handlePunch(remote.address, remote.port));
        this.udpSocket.on('error', (error) => {
            console.error(`Camera bridge UDP error on port ${this.connection.cameraPort}:`, error);
        });
        this.udpSocket.bind(this.connection.cameraPort, '0.0.0.0');
    }

    close(): void {
        for (const client of this.clients) {
            if (!client.socket.destroyed) client.socket.destroy();
        }
        this.clients.clear();
        this.stopFrames(true);
        this.server.close();
        this.udpSocket.close();
    }

    private handlePunch(address: string, port: number): void {
        const now = Date.now();
        for (const [host, punch] of this.punches) {
            if (now - punch.at >= CAMERA_PUNCH_TTL_MS) this.punches.delete(host);
        }
        const host = normalizeIpv4(address);
        this.punches.set(host, { port, at: now });
        // Behind one NAT (a classroom) several clients share the address: the punch
        // belongs to the newest one from there that has no target yet.
        const candidates = Array.from(this.clients).filter((client) => sameHost(client.remoteAddress, host));
        const target = candidates.reverse().find((client) => !client.udpTarget) ?? candidates[0];
        if (target) target.udpTarget = { address: host, port };
    }

    private handleSocket(socket: net.Socket): void {
        const remoteAddress = socket.remoteAddress || '127.0.0.1';
        const remotePort = socket.remotePort || 0;
        if (!remotePort) {
            socket.destroy();
            return;
        }

        const recentPunch = this.punches.get(normalizeIpv4(remoteAddress));
        const client: CameraClientSession = {
            sessionId: buildCameraSessionId(this.connection),
            socket,
            remoteAddress,
            remotePort,
            udpTarget: recentPunch && Date.now() - recentPunch.at < CAMERA_PUNCH_TTL_MS
                && !Array.from(this.clients).some((other) => other.udpTarget?.port === recentPunch.port && sameHost(other.remoteAddress, remoteAddress))
                ? { address: normalizeIpv4(remoteAddress), port: recentPunch.port }
                : null
        };
        // Dead peers (router forgot the connection, laptop lid closed) otherwise
        // stay "connected" for hours.
        socket.setKeepAlive(true, CAMERA_KEEPALIVE_PROBE_MS);
        this.clients.add(client);
        // Every connection asks the browser to start the camera, not only the
        // first: that one request could have gone to a tab that was reloaded or
        // closed since, and later viewers then never got a picture.
        this.announceConnect();
        if (!this.frameTimer) {
            this.frameTimer = setInterval(() => this.flushFrame(), CAMERA_FRAME_INTERVAL_MS);
        }

        const drop = () => {
            if (!this.clients.delete(client)) return;
            if (this.clients.size === 0) this.stopFrames(true);
        };
        socket.on('close', drop);
        socket.on('error', drop);
    }

    private stopFrames(announce: boolean): void {
        if (this.frameTimer) {
            clearInterval(this.frameTimer);
            this.frameTimer = null;
            if (announce) {
                emitCameraBridgeEvent(this.connection, buildCameraSessionId(this.connection), 'camera_disconnect');
            }
        }
    }

    private announceConnect(): void {
        this.lastConnectAnnouncedAt = Date.now();
        emitCameraBridgeEvent(this.connection, buildCameraSessionId(this.connection), 'camera_connect');
    }

    private flushFrame(): void {
        const state = getExternalPythonBridgeState({
            sessionId: buildCameraSessionId(this.connection),
            droneIp: this.connection.droneIp,
            mavlinkPort: this.connection.cameraPort,
            connectionMethod: 'camera'
        });
        if (!state?.cameraConnected || !state.cameraFrame?.length) {
            // Viewers are waiting but no tab is sending frames (one opened after
            // the request, or was reloaded): ask again every couple of seconds.
            if (Date.now() - this.lastConnectAnnouncedAt >= CAMERA_REANNOUNCE_MS) {
                this.announceConnect();
            }
            return;
        }
        // New frames go out as they arrive; an unchanged one only as a keep-alive,
        // often enough that the SDK's receive timeout (0.5 s) never fires.
        const now = Date.now();
        if (state.cameraFrame === this.lastSentFrame && now - this.lastSentAt < CAMERA_KEEPALIVE_MS) {
            return;
        }
        this.lastSentFrame = state.cameraFrame;
        this.lastSentAt = now;

        for (const client of this.clients) {
            const target = client.udpTarget ?? { address: client.remoteAddress, port: client.remotePort };
            this.udpSocket.send(state.cameraFrame, target.port, target.address);
        }
    }
}

const CAMERA_PUNCH_TTL_MS = 10_000;
const CAMERA_KEEPALIVE_MS = 250;
const CAMERA_REANNOUNCE_MS = 2000;
const CAMERA_KEEPALIVE_PROBE_MS = 15_000;

function normalizeIpv4(address: string): string {
    return address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
}

function sameHost(a: string, b: string): boolean {
    return normalizeIpv4(a) === normalizeIpv4(b);
}

function closeStaleMavlinkBridge(droneName: string, currentMavlinkKey: string): void {
    const previousMavlinkKey = droneMavlinkKeys.get(droneName);
    if (!previousMavlinkKey || previousMavlinkKey === currentMavlinkKey) {
        return;
    }

    const previousBridge = mavlinkBridges.get(previousMavlinkKey);
    if (previousBridge) {
        previousBridge.close();
        mavlinkBridges.delete(previousMavlinkKey);
    }
    registeredConnections.delete(previousMavlinkKey);
}

function closeStaleCameraBridge(droneName: string, currentCameraKey: string): void {
    const previousCameraKey = droneCameraKeys.get(droneName);
    if (!previousCameraKey || previousCameraKey === currentCameraKey) {
        return;
    }

    const previousBridge = cameraBridges.get(previousCameraKey);
    if (previousBridge) {
        previousBridge.close();
        cameraBridges.delete(previousCameraKey);
    }
}

function ensureBridgeConnections(connections: BridgeConnectionRegistration[]): void {
    for (const rawConnection of connections) {
        const connection = sanitizeRegistration(rawConnection);
        const mavlinkKey = buildMavlinkRegistrationKey(connection);
        const cameraKey = buildCameraRegistrationKey(connection);

        // If this drone was already registered under a different port, close
        // its previous bridge(s) before creating new ones so re-registering
        // (e.g. the user changes the MAVLink port) can't leak sockets/timers.
        closeStaleMavlinkBridge(connection.droneName, mavlinkKey);
        closeStaleCameraBridge(connection.droneName, cameraKey);

        registeredConnections.set(mavlinkKey, connection);

        if (connection.connectionMethod === 'udpout' || connection.connectionMethod === 'udpin') {
            if (!mavlinkBridges.has(mavlinkKey)) {
                mavlinkBridges.set(mavlinkKey, new MavlinkUdpBridge(connection));
            }
            droneMavlinkKeys.set(connection.droneName, mavlinkKey);
        } else {
            droneMavlinkKeys.delete(connection.droneName);
        }

        if (!cameraBridges.has(cameraKey)) {
            cameraBridges.set(cameraKey, new CameraTcpBridge(connection));
        }
        droneCameraKeys.set(connection.droneName, cameraKey);
    }
}

export function registerMavlinkBridgeRoutes(app: express.Express): void {
    ensureBridgeConnections(DEFAULT_CONNECTIONS);

    app.post('/api/mavlink-bridge/connections', (req: express.Request, res: express.Response) => {
        const connections = Array.isArray(req.body?.connections) ? req.body.connections as Array<Partial<BridgeConnectionRegistration>> : [];
        ensureBridgeConnections(connections.map((entry: Partial<BridgeConnectionRegistration>) => sanitizeRegistration(entry)));
        return res.json({
            ok: true,
            connections: Array.from(registeredConnections.values()),
            mavlinkPorts: Array.from(new Set(
                Array.from(registeredConnections.values())
                    .filter((connection) => connection.connectionMethod === 'udpout' || connection.connectionMethod === 'udpin')
                    .map((connection) => connection.mavlinkPort)
            )),
            cameraPorts: Array.from(cameraBridges.keys()).map((key) => Number(key.slice('camera:'.length))).filter(Boolean)
        });
    });
}

export function stopAllMavlinkBridges(): void {
    for (const bridge of mavlinkBridges.values()) {
        bridge.close();
    }
    mavlinkBridges.clear();

    for (const bridge of cameraBridges.values()) {
        bridge.close();
    }
    cameraBridges.clear();

    registeredConnections.clear();
    droneMavlinkKeys.clear();
    droneCameraKeys.clear();
}
