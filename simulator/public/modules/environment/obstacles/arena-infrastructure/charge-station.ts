import { createStyledLandingPad } from '../pads.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';

export function createChargeStationMesh() {
    const pad = createStyledLandingPad('⚡', '#475569');
    pad.name = 'Станция заряда';
    pad.userData.type = OBJECT_TYPE.CHARGE_STATION;
    return pad;
}