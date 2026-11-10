export type PrimaryChannelKey = 'roll' | 'pitch' | 'throttle' | 'yaw';
export type AuxiliaryChannelKey = 'mode' | 'arm' | 'magnet';
export type ActionAuxChannelKey = 'arm' | 'magnet';
export type ChannelKey = PrimaryChannelKey | AuxiliaryChannelKey;
export type StickMode = 1 | 2 | 3 | 4;

export type ObservedInputPosition = {
    centerRc: number;
    minRc: number;
    maxRc: number;
    samples: number;
};

export type ObservedInputStats = {
    minRc: number;
    maxRc: number;
    lastRc: number;
    samples: number;
    positions: ObservedInputPosition[];
};
