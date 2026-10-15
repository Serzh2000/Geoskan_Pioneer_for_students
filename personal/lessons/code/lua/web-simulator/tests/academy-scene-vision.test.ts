import { jest } from '@jest/globals';
import * as THREE from 'three';
import { createResidentialPreset } from '../public/modules/environment/obstacles/presets/residential.js';
import { createGeoskanArenaPreset } from '../public/modules/environment/obstacles/presets/geoskan-arena.js';
import { createRaceTrackPreset } from '../public/modules/environment/obstacles/presets/race-track.js';
import { createTrainingTerrain } from '../public/modules/environment/training/mesh.js';
import { createArucoMarkerMesh } from '../public/modules/environment/obstacles/markers/object.js';
import type { TrainingProfile } from '../public/modules/environment/training/layout.js';
import { createApartmentBuildingMesh } from '../public/modules/environment/obstacles/buildings.js';
import { createHillMesh } from '../public/modules/environment/obstacles/nature.js';
import { OBJECT_TYPE } from '../public/modules/shared/object-types.js';

const environment = new THREE.Group();
jest.unstable_mockModule('../public/modules/environment/index.js', () => ({
    envGroup: environment,
    createSceneObjectByType: (type: string, options: { trainingSeed?: number; value?: string; markerDictionary?: string; floors?: number }) => {
        if (type.startsWith('training-')) return createTrainingTerrain(type.slice(9) as TrainingProfile, options.trainingSeed);
        if (type === 'preset-residential') return createResidentialPreset();
        if (type === 'preset-geoskan-arena') return createGeoskanArenaPreset();
        if (type === 'preset-race-track') return createRaceTrackPreset();
        if (type === 'aruco') return createArucoMarkerMesh(options.value, options.markerDictionary);
        if (type === 'building') return createApartmentBuildingMesh(options);
        if (type === 'hill') return createHillMesh();
        return undefined;
    }
}));
const { prepareAcademyScene, restoreAcademyScene, getAcademySceneEvidence } = await import('../public/modules/ui/mission-guide/academy/scene.js');
const { detectVisibleMarkers, sealMarkerFrame, markersInFrame } = await import('../public/modules/python/marker-detection.js');

beforeAll(() => {
    // No pixels are needed for geometry, but factories retain their actual meshes/materials/transforms.
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => null }) } });
});
afterAll(() => { delete (globalThis as { document?: unknown }).document; });
afterEach(() => { restoreAcademyScene(); environment.clear(); });

function observe(x: number, y: number, z: number) {
    const camera = new THREE.PerspectiveCamera(72, 16 / 9, .01, 200);
    camera.up.set(0, 1, 0);
    camera.position.set(x, y, z + .02);
    camera.lookAt(x, y, z - 1);
    environment.updateMatrixWorld(true);
    return detectVisibleMarkers('learner', camera, 640, 360);
}

test('actual lesson factories expose the required markers from all authored observation points', () => {
    for (const number of [73, 86, 95, 99, 107, 108]) {
        prepareAcademyScene(number, 42);
        expect(observe(0, 0, 3).map(marker => marker.id)).toEqual(expect.arrayContaining([10, 11, 12]));
        expect(observe(0, 5, 3).find(marker => marker.id === 12)).toBeUndefined();
    }
    for (const number of [101, 102, 105]) {
        prepareAcademyScene(number, 42);
        expect(observe(0, 0, 3)).toHaveLength(0);
        expect(observe(0, 4, 3)).toHaveLength(0);
        expect(observe(0, 8, 3).map(marker => marker.id)).toContain(12);
    }
    prepareAcademyScene(103, 42);
    expect(observe(9, -7, 9).map(marker => marker.id)).toContain(102);
    expect(observe(-9, -7, 9).map(marker => marker.id)).toContain(101);
    prepareAcademyScene(104, 42);
    for (const x of [-9, -8.5]) expect(observe(x, 10.5, 4).map(marker => marker.id)).toEqual(expect.arrayContaining([10, 11]));
});

test('scene restoration preserves original object identity, hierarchy, transform and material', () => {
    const original = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    original.position.set(7, 8, 9);
    const ground = new THREE.Group(); ground.userData.type = OBJECT_TYPE.GROUND;
    environment.add(original, ground);
    const material = original.material;
    expect(prepareAcademyScene(73, 42)).toBe(true);
    expect(original.parent).toBeNull();
    expect(ground.parent).toBe(environment);
    expect(getAcademySceneEvidence()?.intact).toBe(true);
    prepareAcademyScene(103, 43);
    restoreAcademyScene();
    expect(environment.children).toEqual([ground, original]);
    expect(original.material).toBe(material);
    expect(original.position.toArray()).toEqual([7, 8, 9]);
    expect(getAcademySceneEvidence()).toBeUndefined();
});

test('recognition remains bound to its captured frame and owning drone', () => {
    prepareAcademyScene(73, 42);
    observe(0, 0, 3);
    const first = sealMarkerFrame('learner');
    observe(0, 5, 3);
    const empty = sealMarkerFrame('learner');
    const captured = markersInFrame(first, 'DICT_6X6_250', 'learner');
    expect(captured.map(marker => marker.id)).toContain(12);
    expect(markersInFrame(empty, 'DICT_6X6_250', 'learner')).toEqual([]);
    expect(markersInFrame(first, 'DICT_4X4_50', 'learner')).toEqual([]);
    expect(markersInFrame(first, 'DICT_6X6_250', 'another-drone')).toEqual([]);
    captured[0].corners[0][0] = -999;
    expect(markersInFrame(first, 'DICT_6X6_250', 'learner')[0].corners[0][0]).toBeGreaterThan(0);
});
