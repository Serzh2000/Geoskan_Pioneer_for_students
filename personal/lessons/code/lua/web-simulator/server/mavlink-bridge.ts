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
    frameTimer: NodeJS.Timeout | null;
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
const CAMERA_FRAME_INTERVAL_MS = 100;

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

function normalizeConnectionMethod(value: unknown): PioneerConnectionMethod {
    return value === 'serial' || value === 'udpin' || value === 'camera' ? value : 'udpout';
}

function sanitizeRegistration(input: Partial<BridgeConnectionRegistration>): BridgeConnectionRegistration {
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

function buildMavlinkRegistrationKey(connection: BridgeConnectionRegistration): string {
    return `${connection.connectionMethod}:${connection.mavlinkPort}`;
}

function buildCameraRegistrationKey(connection: BridgeConnectionRegistration): string {
    return `camera:${connection.cameraPort}`;
}

function buildMavlinkSessionId(connection: BridgeConnectionRegistration): string {
    return `mavlink-${connection.connectionMethod}-${connection.droneIp}-${connection.mavlinkPort}`;
}

function buildCameraSessionId(connection: BridgeConnectionRegistration): string {
    return `camera-${connection.droneIp}-${connection.cameraPort}`;
}

function computeX25Crc(buffer: Buffer, extra: number): number {
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

function encodeMavlinkV2Message(sequence: number, systemId: number, componentId: number, messageId: number, payload: Buffer): Buffer {
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

function parseSingleMavlinkFrame(datagram: Buffer): ParsedMavlinkFrame | null {
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

function parseCommandLong(payload: Buffer) {
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

function parseSetPositionTargetLocalNed(payload: Buffer): PositionTargetCommand | null {
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

function parseRcChannelsOverride(payload: Buffer): RcOverrideCommand | null {
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

function decodeDataUrlToBuffer(dataUrl: string | null): Buffer | null {
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

function mapAutopilotStateToCustomMode(state: string | null | undefined): number {
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

function mapAutopilotStateToSystemStatus(state: string | null | undefined): number {
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

function isArmedAutopilotState(state: string | null | undefined): boolean {
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

class CameraTcpBridge {
    private readonly connection: BridgeConnectionRegistration;
    private readonly server: net.Server;
    private readonly udpSocket: dgram.Socket;
    private client: CameraClientSession | null;

    constructor(connection: BridgeConnectionRegistration) {
        this.connection = connection;
        this.server = net.createServer((socket) => this.handleSocket(socket));
        this.server.on('error', (error) => {
            console.error(`Camera bridge TCP error on port ${this.connection.cameraPort}:`, error);
        });
        this.server.listen(this.connection.cameraPort, '0.0.0.0');
        this.udpSocket = dgram.createSocket('udp4');
        this.client = null;
    }

    close(): void {
        if (this.client) {
            this.stopClient(this.client, true);
        }
        this.server.close();
        this.udpSocket.close();
    }

    private handleSocket(socket: net.Socket): void {
        const remoteAddress = socket.remoteAddress || '127.0.0.1';
        const remotePort = socket.remotePort || 0;
        // #region debug-point C:camera-tcp-accept
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7778/event', s = 'camera-udp-timeout'; try { const e = fs.readFileSync('.dbg/camera-udp-timeout.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'C', location: 'server/mavlink-bridge.ts:handleSocket', msg: '[DEBUG] Camera TCP accepted', data: { remoteAddress, remotePort, localPort: this.connection.cameraPort }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        if (!remotePort) {
            socket.destroy();
            return;
        }

        if (this.client) {
            this.stopClient(this.client, true);
        }

        const client: CameraClientSession = {
            sessionId: buildCameraSessionId(this.connection),
            socket,
            remoteAddress,
            remotePort,
            frameTimer: null
        };
        this.client = client;
        emitCameraBridgeEvent(this.connection, client.sessionId, 'camera_connect');
        client.frameTimer = setInterval(() => this.flushFrame(client), CAMERA_FRAME_INTERVAL_MS);

        socket.on('close', () => {
            if (this.client === client) {
                this.stopClient(client, false);
                this.client = null;
            }
        });
        socket.on('error', () => {
            if (this.client === client) {
                this.stopClient(client, false);
                this.client = null;
            }
        });
    }

    private stopClient(client: CameraClientSession, destroySocket: boolean): void {
        // #region debug-point C:camera-stop-client
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7778/event', s = 'camera-udp-timeout'; try { const e = fs.readFileSync('.dbg/camera-udp-timeout.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'C', location: 'server/mavlink-bridge.ts:stopClient', msg: '[DEBUG] Camera client stopped', data: { remoteAddress: client.remoteAddress, remotePort: client.remotePort, destroySocket }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        if (client.frameTimer) {
            clearInterval(client.frameTimer);
            client.frameTimer = null;
        }
        emitCameraBridgeEvent(this.connection, client.sessionId, 'camera_disconnect');
        if (destroySocket && !client.socket.destroyed) {
            client.socket.destroy();
        }
    }

    private flushFrame(client: CameraClientSession): void {
        const state = getExternalPythonBridgeState({
            sessionId: client.sessionId,
            droneIp: this.connection.droneIp,
            mavlinkPort: this.connection.cameraPort,
            connectionMethod: 'camera'
        });
        // #region debug-point A:camera-flush-state
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7778/event', s = 'camera-udp-timeout'; try { const e = fs.readFileSync('.dbg/camera-udp-timeout.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'A', location: 'server/mavlink-bridge.ts:flushFrame', msg: '[DEBUG] Camera flush tick', data: { sessionId: client.sessionId, remoteAddress: client.remoteAddress, remotePort: client.remotePort, hasState: Boolean(state), cameraConnected: Boolean(state?.cameraConnected), hasFrameDataUrl: Boolean(state?.cameraFrameDataUrl), frameDataUrlLength: state?.cameraFrameDataUrl?.length ?? 0 }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        if (!state?.cameraConnected) {
            return;
        }

        const jpegBuffer = decodeDataUrlToBuffer(state.cameraFrameDataUrl);
        // #region debug-point D:camera-jpeg-buffer
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7778/event', s = 'camera-udp-timeout'; try { const e = fs.readFileSync('.dbg/camera-udp-timeout.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'D', location: 'server/mavlink-bridge.ts:flushFrame', msg: '[DEBUG] Camera JPEG decode result', data: { hasJpegBuffer: Boolean(jpegBuffer?.length), jpegBytes: jpegBuffer?.length ?? 0 }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        if (!jpegBuffer?.length) {
            return;
        }

        // #region debug-point C:camera-udp-send
        void import('node:fs').then((fs) => { let u = 'http://127.0.0.1:7778/event', s = 'camera-udp-timeout'; try { const e = fs.readFileSync('.dbg/camera-udp-timeout.env', 'utf8'); u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u; s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s; } catch {} return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s, runId: 'pre-fix', hypothesisId: 'C', location: 'server/mavlink-bridge.ts:flushFrame', msg: '[DEBUG] Camera UDP send', data: { remoteAddress: client.remoteAddress, remotePort: client.remotePort, jpegBytes: jpegBuffer.length }, ts: Date.now() }) }).catch(() => undefined); });
        // #endregion
        this.udpSocket.send(jpegBuffer, client.remotePort, client.remoteAddress);
    }
}

function ensureBridgeConnections(connections: BridgeConnectionRegistration[]): void {
    for (const rawConnection of connections) {
        const connection = sanitizeRegistration(rawConnection);
        const mavlinkKey = buildMavlinkRegistrationKey(connection);
        registeredConnections.set(mavlinkKey, connection);

        if ((connection.connectionMethod === 'udpout' || connection.connectionMethod === 'udpin') && !mavlinkBridges.has(mavlinkKey)) {
            mavlinkBridges.set(mavlinkKey, new MavlinkUdpBridge(connection));
        }

        const cameraKey = buildCameraRegistrationKey(connection);
        if (!cameraBridges.has(cameraKey)) {
            cameraBridges.set(cameraKey, new CameraTcpBridge(connection));
        }
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
            mavlinkPorts: Array.from(mavlinkBridges.keys()).map((key) => Number(key.split(':').pop() ?? 0)).filter(Boolean),
            cameraPorts: Array.from(cameraBridges.keys()).map((key) => Number(key.split(':').pop() ?? 0)).filter(Boolean)
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
}
