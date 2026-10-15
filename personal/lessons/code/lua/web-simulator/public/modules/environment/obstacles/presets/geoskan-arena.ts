import * as THREE from 'three';
import {
    createAprilTagMarkerMapMesh,
    createArucoMarkerMapMesh
} from '../markers.js';
import {
    createArenaControlStationMesh,
    createArenaHeliportMesh,
    createArenaHillClusterMesh,
    createArenaSpaceMesh,
    createCargoMesh,
    createChargeStationMesh,
    createForestPatchMesh,
    createLightTowerMesh,
    createLocusBeaconMesh,
    createSettlementMesh,
    createStartPositionMesh,
    createVideoTowerMesh
} from '../arena.js';
import { applyShadows, setCommonMeta } from '../utils.js';
import { createGateMesh } from '../competition.js';

export function createGeoskanArenaPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: Геоскан Арена', {
        collidableRadius: 20,
        presetName: 'geoskan-arena'
    });

    group.add(createArenaSpaceMesh(30));

    [
        [-9, -11.5, '1'],
        [-3, -11.5, '2'],
        [3, -11.5, '3'],
        [9, -11.5, '4']
    ].forEach(([x, y, label]) => {
        const pad = createStartPositionMesh(label as string);
        pad.position.set(x as number, y as number, 0.01);
        pad.userData.label = `Старт ${label}`;
        group.add(pad);
    });

    const chargeLeft = createChargeStationMesh();
    chargeLeft.position.set(-11, -6.5, 0.01);
    group.add(chargeLeft);

    const chargeRight = createChargeStationMesh();
    chargeRight.position.set(11, -6.5, 0.01);
    group.add(chargeRight);

    const heliLeft = createArenaHeliportMesh();
    heliLeft.position.set(-8, 0, 0.01);
    heliLeft.userData.label = 'Западная площадка доставки';
    group.add(heliLeft);

    const heliRight = createArenaHeliportMesh();
    heliRight.position.set(8, 0, 0.01);
    heliRight.userData.label = 'Восточная площадка доставки';
    group.add(heliRight);

    const hillCluster = createArenaHillClusterMesh();
    hillCluster.position.set(0, 5.3, 0);
    group.add(hillCluster);

    const settlement = createSettlementMesh();
    settlement.position.set(0, 10.8, 0);
    group.add(settlement);

    const forestLeft = createForestPatchMesh();
    forestLeft.position.set(-11.3, 4.5, 0);
    group.add(forestLeft);

    const forestRight = createForestPatchMesh();
    forestRight.position.set(11.3, 4.5, 0);
    group.add(forestRight);

    const controlStation = createArenaControlStationMesh();
    controlStation.position.set(12, -12, 0);
    group.add(controlStation);

    const cameraTower = createVideoTowerMesh();
    cameraTower.position.set(-12, -12, 0);
    group.add(cameraTower);

    const lightTowerLeft = createLightTowerMesh();
    lightTowerLeft.position.set(-13, 12.5, 0);
    group.add(lightTowerLeft);

    const lightTowerRight = createLightTowerMesh();
    lightTowerRight.position.set(13, 12.5, 0);
    group.add(lightTowerRight);

    const locusA = createLocusBeaconMesh();
    locusA.position.set(-12, 0, 0);
    group.add(locusA);

    const locusB = createLocusBeaconMesh();
    locusB.position.set(12, 0, 0);
    group.add(locusB);

    [
        [-3, -5.5],
        [0, -5.5],
        [3, -5.5]
    ].forEach(([x, y], index) => {
        const cargo = createCargoMesh();
        cargo.position.set(x as number, y as number, 0);
        cargo.userData.label = `Груз ${index + 1}`;
        group.add(cargo);
    });

    for (const [index, x] of [-3, 3].entries()) {
        const gate = createGateMesh();
        gate.position.set(x, 0, 0);
        gate.userData.label = `Коридор: ворота ${index + 1}`;
        group.add(gate);
    }

    const arucoMap = createArucoMarkerMapMesh('DICT_6X6_250', {
        rows: 2,
        columns: 3,
        startId: 10,
        markerSize: 0.8,
        gapX: 0.15,
        gapY: 0.15,
        startCorner: 'top-left',
        traversal: 'row-major'
    });
    arucoMap.position.set(-9, 10.5, 0.01);
    arucoMap.userData.label = 'Карта ArUco 10–15';
    group.add(arucoMap);

    const aprilMap = createAprilTagMarkerMapMesh('DICT_APRILTAG_36h11', {
        rows: 2,
        columns: 2,
        startId: 20,
        markerSize: 0.8,
        gapX: 0.18,
        gapY: 0.18,
        startCorner: 'top-left',
        traversal: 'row-major'
    });
    aprilMap.position.set(9, 10.5, 0.01);
    aprilMap.userData.label = 'Карта AprilTag 20–23';
    group.add(aprilMap);

    applyShadows(group);
    return group;
}

