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

export function createGeoskanArenaPreset() {
    const group = setCommonMeta(new THREE.Group(), 'Пресет: Геоскан Арена', {
        collidableRadius: 18,
        presetName: 'geoskan-arena'
    });

    group.add(createArenaSpaceMesh());

    [
        [-6, -7.5, '1'],
        [-2, -7.5, '2'],
        [2, -7.5, '3'],
        [6, -7.5, '4']
    ].forEach(([x, y, label]) => {
        const pad = createStartPositionMesh(label as string);
        pad.position.set(x as number, y as number, 0.01);
        group.add(pad);
    });

    const chargeLeft = createChargeStationMesh();
    chargeLeft.position.set(-4, 4.5, 0.01);
    group.add(chargeLeft);

    const chargeRight = createChargeStationMesh();
    chargeRight.position.set(4, 4.5, 0.01);
    group.add(chargeRight);

    const heliLeft = createArenaHeliportMesh();
    heliLeft.position.set(-6, 0.5, 0.01);
    group.add(heliLeft);

    const heliRight = createArenaHeliportMesh();
    heliRight.position.set(6, 0.5, 0.01);
    group.add(heliRight);

    const hillCluster = createArenaHillClusterMesh();
    hillCluster.position.set(-0.6, 0.4, 0);
    group.add(hillCluster);

    const settlement = createSettlementMesh();
    settlement.position.set(0, 8.5, 0);
    group.add(settlement);

    const forestLeft = createForestPatchMesh();
    forestLeft.position.set(-8.2, 7.2, 0);
    group.add(forestLeft);

    const forestRight = createForestPatchMesh();
    forestRight.position.set(8.4, 7.1, 0);
    group.add(forestRight);

    const controlStation = createArenaControlStationMesh();
    controlStation.position.set(0, -9.5, 0);
    group.add(controlStation);

    const cameraTower = createVideoTowerMesh();
    cameraTower.position.set(-8.5, -8.5, 0);
    group.add(cameraTower);

    const lightTowerLeft = createLightTowerMesh();
    lightTowerLeft.position.set(-8.2, 8.2, 0);
    group.add(lightTowerLeft);

    const lightTowerRight = createLightTowerMesh();
    lightTowerRight.position.set(8.2, 8.2, 0);
    group.add(lightTowerRight);

    const pointLight = new THREE.PointLight(0xffffff, 50, 20);
    pointLight.position.set(0, 0, 5);
    group.add(pointLight);

    const locusA = createLocusBeaconMesh();
    locusA.position.set(-8.1, -0.2, 0);
    group.add(locusA);

    const locusB = createLocusBeaconMesh();
    locusB.position.set(8.1, -0.2, 0);
    group.add(locusB);

    [
        [-2.8, 2.2],
        [0.2, 2.6],
        [2.8, 2.1]
    ].forEach(([x, y]) => {
        const cargo = createCargoMesh();
        cargo.position.set(x as number, y as number, 0);
        group.add(cargo);
    });

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
    arucoMap.position.set(-6.4, 8.2, 0.01);
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
    aprilMap.position.set(6.4, 8.2, 0.01);
    group.add(aprilMap);

    applyShadows(group);
    return group;
}
