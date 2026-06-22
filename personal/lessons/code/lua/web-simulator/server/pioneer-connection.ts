export type PioneerConnectionMethod = 'udpin' | 'udpout' | 'serial' | 'camera';

export interface PioneerConnectionConfig {
    simulator?: boolean;
    name?: string;
    ip?: string;
    mavlinkPort?: number;
    cameraPort?: number;
    connectionMethod?: PioneerConnectionMethod;
    device?: string;
    baud?: number;
    logger?: boolean;
    logConnection?: boolean;
    pythonExecutable?: string;
}
