import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setCommonMeta } from './utils.js';
import parkSetUrl from '../../../assets/models/props/park-set.glb?url';

let templatePromise: Promise<THREE.Group> | undefined;

function loadTemplate(): Promise<THREE.Group> {
    templatePromise ??= new GLTFLoader().loadAsync(parkSetUrl).then(({ scene }) => scene);
    return templatePromise;
}

function createPropMesh(nodeName: string, label: string, collidableRadius: number): THREE.Group {
    const group = setCommonMeta(new THREE.Group(), label, { collidableRadius });
    void loadTemplate().then((template) => {
        const source = template.getObjectByName(nodeName);
        if (!source) throw new Error(`Park asset is missing ${nodeName}`);
        const instance = source.clone(true);
        instance.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.material = Array.isArray(object.material)
                ? object.material.map((material) => material.clone())
                : object.material.clone();
            object.castShadow = true;
            object.receiveShadow = true;
            object.frustumCulled = false;
        });
        group.add(instance);
    }).catch((error) => {
        console.error(`[ParkProps] Failed to load ${nodeName}`, error);
    });
    return group;
}

export const createParkBenchMesh = () => createPropMesh('Bench', 'Скамейка', 0.9);
export const createParkLampMesh = () => createPropMesh('Lamp', 'Парковый фонарь', 0.35);
export const createParkPlanterMesh = () => createPropMesh('Planter', 'Клумба', 0.75);
