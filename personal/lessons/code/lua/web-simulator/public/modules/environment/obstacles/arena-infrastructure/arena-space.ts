import * as THREE from 'three';
import { createTrussArenaMesh } from '../../truss-arena.js';
import { setCommonMeta, applyShadows } from '../utils.js';

export function createArenaSpaceMesh(size = 18) {
    const group = setCommonMeta(new THREE.Group(), 'Арена с сеткой', { collidableRadius: size / 2 + 0.5 });
    const frame = createTrussArenaMesh(size, 5);
    group.add(frame);
    applyShadows(group);
    return group;
}