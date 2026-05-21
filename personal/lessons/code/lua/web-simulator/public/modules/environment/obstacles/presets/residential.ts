import * as THREE from 'three';
import { createApartmentBuildingMesh } from '../buildings.js';
import {
    createArenaControlStationMesh,
    createArenaHeliportMesh,
    createChargeStationMesh,
    createForestPatchMesh,
    createSettlementMesh
} from '../arena.js';
import { createAprilTagMarkerMesh, createArucoMarkerMesh } from '../markers.js';
import { createRoadMesh, createRailwayMesh } from '../linear.js';
import { createParkPatch, createTreeMesh } from '../nature.js';
import { applyShadows, setCommonMeta } from '../utils.js';

export function createResidentialPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: спальный район', {
        collidableRadius: 22,
        presetName: 'residential'
    });

    const roadMain = createRoadMesh({
        points: [
            { x: -18, y: -3, z: 0 },
            { x: -6, y: -3, z: 0 },
            { x: 8, y: -1, z: 0 },
            { x: 18, y: 2, z: 0 }
        ]
    });
    group.add(roadMain);

    const roadSide = createRoadMesh({
        points: [
            { x: -3, y: -14, z: 0 },
            { x: -1, y: -6, z: 0 },
            { x: 1, y: 4, z: 0 },
            { x: 4, y: 14, z: 0 }
        ]
    });
    roadSide.rotation.z = 0.12;
    group.add(roadSide);

    const rail = createRailwayMesh({
        points: [
            { x: -20, y: 12, z: 0 },
            { x: -8, y: 10, z: 0 },
            { x: 6, y: 8, z: 0 },
            { x: 18, y: 11, z: 0 }
        ]
    });
    group.add(rail);

    [
        [-12, -10, 8],
        [-16, 4, 10],
        [8, -10, 12],
        [15, 16, 9]
    ].forEach(([x, y, floors]) => {
        const building = createApartmentBuildingMesh({ floors: floors as number });
        building.position.set(x as number, y as number, 0);
        building.rotation.z = (x as number) > 0 ? Math.PI * 0.5 : 0;
        group.add(building);
    });

    const park = createParkPatch(10, 8);
    park.position.set(-8, 5, 0);
    group.add(park);

    const settlement = createSettlementMesh();
    settlement.position.set(-13, -8, 0);
    group.add(settlement);

    const forest = createForestPatchMesh();
    forest.position.set(11, -11, 0);
    group.add(forest);

    [
        [-11, 3, 0.9],
        [-8, 4.5, 1],
        [-5.2, 6, 0.85],
        [-9, 7.5, 1.1],
        [-4.5, 2.6, 0.95]
    ].forEach(([x, y, scale]) => {
        const tree = createTreeMesh(scale as number);
        tree.position.set(x as number, y as number, 0);
        group.add(tree);
    });

    const aruco = createArucoMarkerMesh('7');
    aruco.position.set(-15, 4, 0);
    group.add(aruco);

    const april = createAprilTagMarkerMesh('18');
    april.position.set(15, -5, 0);
    group.add(april);

    const heliport = createArenaHeliportMesh();
    heliport.position.set(-1, -10, 0.01);
    group.add(heliport);

    const charge = createChargeStationMesh();
    charge.position.set(4, -9.5, 0.01);
    group.add(charge);

    const controlStation = createArenaControlStationMesh();
    controlStation.position.set(6.5, 12, 0);
    controlStation.rotation.z = -0.4;
    group.add(controlStation);

    applyShadows(group);
    return group;
}

