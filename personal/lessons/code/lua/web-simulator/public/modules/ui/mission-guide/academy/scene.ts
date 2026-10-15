import * as THREE from 'three';
import { createSceneObjectByType, envGroup } from '../../../environment/index.js';
import { disposeObject3D } from '../../../environment/obstacles/utils.js';
import type { TrainingProfile } from '../../../environment/training/layout.js';
import { OBJECT_TYPE } from '../../../shared/object-types.js';

export type AcademySceneEvidence = { number: number; profile: string; seed: number; sameSeedRepeats: number; differentSeeds: number; intact: boolean };
let owned: THREE.Object3D | null = null;
let parked: THREE.Object3D[] = [];
let evidence: AcademySceneEvidence | undefined;
const seedsByLesson = new Map<number, number[]>();

function disposeTerrain(root: THREE.Object3D): void {
    const textures = new Set<THREE.Texture>();
    root.traverse(node => {
        const material = (node as THREE.Mesh).material;
        for (const entry of material ? Array.isArray(material) ? material : [material] : []) {
            for (const value of Object.values(entry)) if (value instanceof THREE.Texture) textures.add(value);
        }
    });
    textures.forEach(texture => texture.dispose());
    disposeObject3D(root);
}

export function academySceneProfile(number: number): TrainingProfile | 'race-track' | 'residential' | 'geoskan-arena' {
    if (number === 61) return 'race-track';
    if (number === 103) return 'residential';
    if (number === 104) return 'geoskan-arena';
    if ([42, 58].includes(number)) return 'hills';
    if ([57, 62, 102].includes(number)) return 'forest';
    if ([59, 103].includes(number)) return 'urban';
    if ([60, 105].includes(number)) return 'industrial';
    if ([55, 63, 107, 108].includes(number)) return 'mixed';
    return number >= 73 ? 'markers' : 'field';
}

export function restoreAcademyScene(): void {
    if (owned) { owned.removeFromParent(); disposeTerrain(owned); owned = null; }
    if (envGroup) parked.forEach(object => envGroup.add(object));
    parked = [];
    evidence = undefined;
}

/** Park original objects by identity, never delete/serialize the student's work. */
export function prepareAcademyScene(number: number, seed: number): boolean {
    if (!envGroup) return false;
    const profile = academySceneProfile(number);
    const builtin = ['race-track', 'residential', 'geoskan-arena'].includes(profile);
    const terrain = createSceneObjectByType(builtin ? `preset-${profile}` : `training-${profile}`, { trainingSeed: seed });
    if (!terrain) return false;
    if (owned) { owned.removeFromParent(); disposeTerrain(owned); owned = null; }
    const original = envGroup.children.filter(object => object.userData.type !== OBJECT_TYPE.GROUND);
    original.forEach(object => { envGroup.remove(object); parked.push(object); });
    terrain.userData.academyLesson = number;
    terrain.userData.label = `Учебная сцена · урок ${number} · seed ${seed}`;
    if (number === 42 || number === 59) {
        const prop = createSceneObjectByType(number === 42 ? 'hill' : 'building', { floors: 5 });
        if (prop) {
            prop.position.set(number === 42 ? 6 : 0, number === 42 ? 0 : 6, 0);
            if (number === 59) prop.scale.setScalar(.5);
            terrain.add(prop);
        }
    }
    if (number >= 73 && !builtin) {
        terrain.children.filter(child => child.userData.markerDictionary).forEach(marker => { terrain.remove(marker); disposeTerrain(marker); });
        const far = [101, 102, 105].includes(number);
        const targetX = number >= 107 ? .4 + seed % 7 * .1 : .6;
        const targetY = number >= 107 ? .2 + seed % 5 * .1 : .3;
        const markers = far ? [[12, 0, 8], [13, 0, 16]] : [[10, -1, 1], [11, 1, -1], [12, targetX, targetY]];
        for (const [id, x, y] of markers) {
            const marker = createSceneObjectByType('aruco', { value: String(id), markerDictionary: 'DICT_6X6_250' });
            if (marker) { marker.position.set(x, y, .03); terrain.add(marker); }
        }
    }
    envGroup.add(terrain);
    owned = terrain;
    const previous = seedsByLesson.get(number) || [];
    const seeds = [...previous, seed].slice(-16);
    seedsByLesson.set(number, seeds);
    evidence = { number, profile, seed, sameSeedRepeats: seeds.filter(value => value === seed).length, differentSeeds: new Set(seeds).size, intact: true };
    return true;
}

export function getAcademySceneEvidence(): AcademySceneEvidence | undefined {
    if (!evidence) return undefined;
    return { ...evidence, intact: owned?.parent === envGroup && owned.position.length() < .001 && owned.rotation.x === 0 && owned.rotation.y === 0 && owned.rotation.z === 0 && owned.scale.distanceTo(new THREE.Vector3(1, 1, 1)) < .001 };
}
