/**
 * Модуль генерации объектов окружения (препятствий).
 * Экспортирует функции для настройки сцены и добавления объектов.
 */
import * as THREE from 'three';
import { setupLights } from './lights.js';
import { createGround } from './ground.js';
import {
    createArenaControlStationMesh,
    createArenaHeliportMesh,
    createArenaHillClusterMesh,
    createArenaSpaceMesh,
    createApartmentBuildingMesh,
    createAprilTagMarkerMesh,
    createAprilTagMarkerMapMesh,
    createArucoMarkerMesh,
    createArucoMarkerMapMesh,
    createCargoMesh,
    createChargeStationMesh,
    createFirTreeMesh,
    createForestPatchMesh,
    createFlagMesh,
    createGateMesh,
    createGeoskanArenaPreset,
    createHillMesh,
    createLandingPad,
    createLightTowerMesh,
    createLocusBeaconMesh,
    createObstacles,
    createPylonMesh,
    createRaceTrackPreset,
    createRailwayMesh,
    createResidentialPreset,
    createRoadMesh,
    createSettlementMesh,
    createStartPositionMesh,
    createStyledLandingPad,
    createTransportMesh,
    updateApartmentBuildingMetadata,
    createVideoTowerMesh,
    SceneObjectOptions,
    ScenePathPoint,
    snapMarkerToSurface,
    updateLinearFeaturePoints,
    updateMarkerValue
} from './obstacles.js';

export let envGroup: THREE.Group;

export function setupEnvironment(scene: THREE.Scene) {
    setupLights(scene);

    envGroup = new THREE.Group();
    scene.add(envGroup);

    createGround(scene, envGroup);
    createObstacles(envGroup);
}

export function addObjectToScene(type: string, camera?: THREE.Camera | null, options: SceneObjectOptions = {}) {
    if (!envGroup) return null;
    let obj: THREE.Object3D | undefined;
    if (type === 'gate') obj = createGateMesh();
    else if (type === 'pylon') obj = createPylonMesh();
    else if (type === 'flag') obj = createFlagMesh();
    else if (type === 'building') obj = createApartmentBuildingMesh(options);
    else if (type === 'aruco') obj = createArucoMarkerMesh(options.value || '0', options.markerDictionary);
    else if (type === 'apriltag') obj = createAprilTagMarkerMesh(options.value || '0', options.markerDictionary);
    else if (type === 'aruco-map') obj = createArucoMarkerMapMesh(options.markerDictionary, options.markerMap);
    else if (type === 'apriltag-map') obj = createAprilTagMarkerMapMesh(options.markerDictionary, options.markerMap);
    else if (type === 'road') obj = createRoadMesh(options);
    else if (type === 'rail') obj = createRailwayMesh(options);
    else if (type === 'hill') obj = createHillMesh();
    else if (type === 'arena-hills') obj = createArenaHillClusterMesh();
    else if (type === 'tree') obj = createFirTreeMesh();
    else if (type === 'forest-patch') obj = createForestPatchMesh();
    else if (type === 'settlement') obj = createSettlementMesh();
    else if (type === 'transport') obj = createTransportMesh();
    else if (type === 'cargo') obj = createCargoMesh();
    else if (type === 'start-position') obj = createStartPositionMesh(options.value || '1');
    else if (type === 'heliport') obj = createArenaHeliportMesh();
    else if (type === 'charge-station') obj = createChargeStationMesh();
    else if (type === 'locus-beacon') obj = createLocusBeaconMesh();
    else if (type === 'light-tower') obj = createLightTowerMesh();
    else if (type === 'video-tower') obj = createVideoTowerMesh();
    else if (type === 'control-station') obj = createArenaControlStationMesh();
    else if (type === 'arena-space') obj = createArenaSpaceMesh();
    else if (type === 'pad-h') obj = createStyledLandingPad('H', '#2563eb');
    else if (type === 'pad-charge') obj = createStyledLandingPad('⚡', '#475569');
    else if (type === 'preset-race-track') obj = createRaceTrackPreset();
    else if (type === 'preset-residential') obj = createResidentialPreset();
    else if (type === 'preset-geoskan-arena') obj = createGeoskanArenaPreset();
    
    if (obj) {
        let pos = new THREE.Vector3(0, 0, 0);
        if (camera) {
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            dir.multiplyScalar(5);
            pos = camera.position.clone().add(dir);
        }
        obj.position.set(pos.x, pos.y, 0);
        envGroup.add(obj);
        snapMarkerToSurface(obj, envGroup.children);
        return obj;
    }
    return null;
}

export function updateSceneObjectValue(
    object: THREE.Object3D,
    params: { value?: string; markerDictionary?: string; floors?: number }
) {
    if (object.userData?.type === 'Многоэтажка') {
        return updateApartmentBuildingMetadata(object, {
            value: params.value,
            floors: params.floors
        });
    }
    return updateMarkerValue(object, { value: params.value, dictionaryId: params.markerDictionary });
}

export function updateSceneObjectPoints(object: THREE.Object3D, points: ScenePathPoint[]) {
    return updateLinearFeaturePoints(object, points);
}

export { createLandingPad };
