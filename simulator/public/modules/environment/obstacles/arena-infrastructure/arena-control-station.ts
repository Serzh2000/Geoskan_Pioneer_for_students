import * as THREE from 'three';
import { setCommonMeta } from '../utils.js';
import { attachInfraNode } from '../infra-props.js';

export function createArenaControlStationMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Пульт полигона', { collidableRadius: 0.8 });
    attachInfraNode(group, 'ControlStation');
    return group;
}
