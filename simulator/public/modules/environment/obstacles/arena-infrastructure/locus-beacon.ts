import * as THREE from 'three';
import { setCommonMeta } from '../utils.js';
import { attachInfraNode } from '../infra-props.js';

export function createLocusBeaconMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Локус-маяк', { collidableRadius: 0.4 });
    attachInfraNode(group, 'LocusBeacon');
    return group;
}
