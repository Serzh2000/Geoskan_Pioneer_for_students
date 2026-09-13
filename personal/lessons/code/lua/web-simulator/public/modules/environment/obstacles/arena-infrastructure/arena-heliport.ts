import { createStyledLandingPad } from '../pads.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';

export function createArenaHeliportMesh() {
    const pad = createStyledLandingPad('H', '#2563eb');
    pad.name = 'Хелипорт';
    pad.userData.type = OBJECT_TYPE.HELIPORT;
    return pad;
}