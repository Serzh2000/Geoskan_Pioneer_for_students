import * as THREE from 'three';
import { DEFAULT_CARGO_MASS_KG, DEFAULT_CARGO_PHYSICS_MATERIAL } from '../../../physics/materials.js';
import { setCommonMeta } from '../utils.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';
import { attachInfraNode } from '../infra-props.js';

export function createCargoMesh() {
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.CARGO_SMALL, { collidableRadius: 0.22 });
    group.userData.massKg = DEFAULT_CARGO_MASS_KG;
    group.userData.physicsMaterial = { ...DEFAULT_CARGO_PHYSICS_MATERIAL };
    attachInfraNode(group, 'Cargo');
    return group;
}
