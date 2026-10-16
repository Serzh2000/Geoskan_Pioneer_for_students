import * as THREE from 'three';
import { loadTrainingTemplate } from './training-props.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import infraPropsAUrl from '../../../assets/models/props/infra-props-a.glb?url';
import infraPropsBUrl from '../../../assets/models/props/infra-props-b.glb?url';

let templatePromiseA: Promise<THREE.Group> | undefined;
let templatePromiseB: Promise<THREE.Group> | undefined;

function loadTemplateA(): Promise<THREE.Group> {
    templatePromiseA ??= new GLTFLoader().loadAsync(infraPropsAUrl).then(({ scene }) => scene);
    return templatePromiseA;
}

function loadTemplateB(): Promise<THREE.Group> {
    templatePromiseB ??= new GLTFLoader().loadAsync(infraPropsBUrl).then(({ scene }) => scene);
    return templatePromiseB;
}

function attachFrom(loadTemplate: () => Promise<THREE.Group>, group: THREE.Group, nodeName: string, onReady?: (instance: THREE.Object3D) => void): void {
    void loadTemplate().then((template) => {
        const source = template.getObjectByName(nodeName);
        if (!source) throw new Error(`Infra asset is missing ${nodeName}`);
        const instance = source.clone(true);
        instance.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.material = Array.isArray(object.material)
                ? object.material.map((material) => material.clone())
                : object.material.clone();
            object.castShadow = true;
            object.receiveShadow = true;
            // Matches utils.ts#applyShadows: these props can pop out of view during camera motion
            // because their bounds are too aggressive for frustum culling.
            object.frustumCulled = false;
        });
        group.add(instance);
        onReady?.(instance);
    }).catch((error) => {
        console.error(`[InfraProps] Failed to load ${nodeName}`, error);
    });
}

/** Clones a named node out of the shared Blender export and preps it for one scene instance. */
export function attachInfraNode(group: THREE.Group, nodeName: string, onReady?: (instance: THREE.Object3D) => void): void {
    if (['Cargo', 'VideoTower', 'ControlStation'].includes(nodeName)) {
        attachFrom(loadTrainingTemplate, group, `V2_${nodeName}`, onReady);
        return;
    }
    attachFrom(loadTemplateA, group, nodeName, onReady);
}

/** Same as attachInfraNode but from the second infra-props Blender export (infra-props-b.glb). */
export function attachInfraNodeB(group: THREE.Group, nodeName: string, onReady?: (instance: THREE.Object3D) => void): void {
    if (nodeName === 'Transport') {
        attachFrom(loadTrainingTemplate, group, 'V2_Transport', onReady);
        return;
    }
    attachFrom(loadTemplateB, group, nodeName, onReady);
}
