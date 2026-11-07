/*
 * Types of road vehicle in the ambient traffic: real-world sizes (metres, at scale 1) and who may drive where. Pure data, no THREE,
 * so that traffic.ts (lane fit and spacing) and car-model.ts (geometry) agree on the dimensions.
 */
export type VehicleKind = 'hatchback' | 'sedan' | 'suv' | 'van' | 'truck' | 'bus';

export interface VehicleSpec {
    length: number; width: number; height: number;
    /** Needs a lane of a collector or an arterial: heavy vehicles do not turn into side streets. */
    heavy: boolean;
}

export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
    hatchback: { length: 4.2, width: 1.75, height: 1.45, heavy: false },
    sedan: { length: 4.7, width: 1.8, height: 1.45, heavy: false },
    suv: { length: 4.6, width: 1.9, height: 1.75, heavy: false },
    van: { length: 5.0, width: 1.9, height: 2.1, heavy: false },
    truck: { length: 7.2, width: 2.4, height: 3.1, heavy: true },
    bus: { length: 10.5, width: 2.5, height: 3.1, heavy: true }
};

/** Mix of the traffic: mostly cars, a few vans, now and then a lorry or a bus (by agent number, so a seed gives the same fleet). */
const MIX: VehicleKind[] = ['hatchback', 'sedan', 'suv', 'hatchback', 'van', 'sedan', 'bus', 'suv', 'hatchback', 'truck', 'sedan', 'van'];

export function vehicleKindFor(agentId: number, roadWidth: number): VehicleKind {
    const kind = MIX[(agentId * 5 + 2) % MIX.length];
    return VEHICLES[kind].heavy && roadWidth < 4.7 ? (agentId % 2 ? 'sedan' : 'hatchback') : kind;
}
