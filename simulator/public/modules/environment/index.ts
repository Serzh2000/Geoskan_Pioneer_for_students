/**
 * Модуль генерации объектов окружения (препятствий).
 * Экспортирует функции для настройки сцены и добавления объектов.
 */
// Every raycast against the environment (rangefinder, markers, editor picks) goes through this: see the file for why.
import '../scene/core/fast-raycast.js';
import * as THREE from 'three';
import { setupLights } from './lights.js';
import { createGround } from './ground.js';
import { OBJECT_TYPE } from '../shared/object-types.js';
import { createTrainingTerrain } from './training/mesh.js';
import { TRAINING_PROFILES, type TrainingProfile } from './training/layout.js';
import { landscapeFogDensity } from '../world/atmosphere-model.js';
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
    createFpvCubeMesh,
    updateFpvCubeHeight,
    createGateMesh,
    createGeoskanArenaPreset,
    createHillMesh,
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
    createVehicleMesh,
    SceneObjectOptions,
    ScenePathPoint,
    snapMarkerToSurface,
    updateLinearFeaturePoints,
    updateMarkerValue
} from './obstacles.js';

export let envGroup: THREE.Group;

export function createSceneObjectByType(type: string, options: SceneObjectOptions = {}) {
    let obj: THREE.Object3D | undefined;
    if (type.startsWith('training-') && TRAINING_PROFILES.includes(type.slice(9) as TrainingProfile)) {
        obj = createTrainingTerrain(type.slice(9) as TrainingProfile, options.trainingSeed);
    }
    else if (type === 'gate') obj = createGateMesh();
    else if (type === 'fpv-cube') obj = createFpvCubeMesh(options.fpvCubeHeight);
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
    else if (type === 'car') obj = createVehicleMesh('car', options.vehicle);
    else if (type === 'train') obj = createVehicleMesh('train', options.vehicle);
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
    return obj || null;
}

export function setupEnvironment(scene: THREE.Scene) {
    const sunlight = setupLights(scene);

    envGroup = new THREE.Group();
    scene.add(envGroup);

    createGround(scene, envGroup);
    createObstacles(envGroup);
    // Presets supply their own layout; the empty-scene dressing must not cut through it.
    const syncDefaultDressing = () => {
        const hasPreset = envGroup.children.some(child => Boolean(child.userData.presetName));
        // Arena haze must scale with the landscape, or a full-map overview becomes opaque.
        const landscapeSize = Math.max(30, ...envGroup.children.filter(child => child.visible)
            .map(child => Number(child.userData.trainingLayout?.size) || 0));
        if (scene.fog instanceof THREE.FogExp2) scene.fog.density = landscapeFogDensity(landscapeSize);
        const lightScale = landscapeSize / 30;
        sunlight.position.set(-6 * lightScale, -4 * lightScale, 12 * lightScale);
        const shadowExtent = landscapeSize > 30 ? landscapeSize * .75 : 14;
        Object.assign(sunlight.shadow.camera, { left: -shadowExtent, right: shadowExtent,
            top: shadowExtent, bottom: -shadowExtent, far: Math.max(100, landscapeSize * 3) });
        sunlight.shadow.camera.updateProjectionMatrix();
        for (const child of envGroup.children) {
            if (child.userData.defaultArenaFrame) child.visible = !hasPreset;
            if (child.userData.type === OBJECT_TYPE.GROUND) {
                child.children.forEach(decoration => { decoration.visible = !hasPreset; });
            }
        }
    };
    envGroup.addEventListener('childadded', syncDefaultDressing);
    envGroup.addEventListener('childremoved', syncDefaultDressing);
}

export function addObjectToScene(type: string, camera?: THREE.Camera | null, options: SceneObjectOptions = {}) {
    if (!envGroup) return null;
    const obj = createSceneObjectByType(type, options);
    
    if (obj) {
        if (obj.userData.presetName) {
            const stampSlots = (parent: THREE.Object3D) => {
                parent.children.forEach((child, index) => {
                    child.userData.presetSlot = index;
                    stampSlots(child);
                });
            };
            stampSlots(obj);
        }
        let pos = new THREE.Vector3(0, 0, 0);
        if (camera && !obj.userData.presetName) {
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
    params: { value?: string; markerDictionary?: string; floors?: number; fpvCubeHeight?: number; building?: SceneObjectOptions['building'] }
) {
    if (object.userData?.type === OBJECT_TYPE.FPV_CUBE) {
        return params.fpvCubeHeight !== undefined && updateFpvCubeHeight(object, params.fpvCubeHeight);
    }
    if (object.userData?.type === OBJECT_TYPE.BUILDING) {
        return updateApartmentBuildingMetadata(object, {
            value: params.value,
            floors: params.floors,
            building: params.building
        });
    }
    return updateMarkerValue(object, { value: params.value, dictionaryId: params.markerDictionary });
}

export function updateSceneObjectPoints(object: THREE.Object3D, points: ScenePathPoint[]) {
    return updateLinearFeaturePoints(object, points);
}
