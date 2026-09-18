import * as THREE from 'three';
import { createApartmentBuildingMesh } from '../buildings.js';
import { createArenaControlStationMesh, createArenaHeliportMesh, createChargeStationMesh, createForestPatchMesh } from '../arena.js';
import { createAprilTagMarkerMesh, createArucoMarkerMesh } from '../markers.js';
import { createRoadMesh, createRailwayMesh } from '../linear.js';
import { createParkPatch, createTreeMesh } from '../nature.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createResidentialPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: спальный район', {
        collidableRadius: 23, presetName: 'residential'
    });
    const place = (object: THREE.Object3D, x: number, y: number, z = 0) => {
        object.position.set(x, y, z); group.add(object); return object;
    };
    // A legible street, four separate blocks, central park and a service yard.
    group.add(createRoadMesh({ points: [{x:-18,y:0,z:0},{x:18,y:0,z:0}] }));
    group.add(createRoadMesh({ points: [{x:0,y:-14,z:0},{x:0,y:0,z:0}] }));
    group.add(createRailwayMesh({ points: [{x:-18,y:13,z:0},{x:18,y:13,z:0}] }));
    for (const [x, y, floors] of [[-8,-6,6],[8,-6,8],[-8,6,7],[8,6,5]]) {
        const block = place(createApartmentBuildingMesh({floors}), x, y);
        block.rotation.z = y > 0 ? Math.PI : 0;
    }
    place(createParkPatch(7, 6), 0, 6);
    for (const [x,y,scale] of [[-2,4,1],[2,4,0.9],[-2,8,1.1],[2,8,1]]) {
        place(createTreeMesh(scale), x, y, 0.07);
    }
    place(createForestPatchMesh(), -14, 7);
    place(createForestPatchMesh(), 14, 7);
    place(createArenaHeliportMesh(), -4, -11, 0.025);
    place(createChargeStationMesh(), 4, -11, 0.025);
    place(createArenaControlStationMesh(), 8, -12);
    place(createArucoMarkerMesh('7'), -8, 2.7, 0.02);
    place(createAprilTagMarkerMesh('18'), 8, -2.7, 0.02);
    applyShadows(group);
    return group;
}
