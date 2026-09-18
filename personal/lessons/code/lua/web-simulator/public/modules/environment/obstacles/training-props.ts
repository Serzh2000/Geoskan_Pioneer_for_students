import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import url from '../../../assets/models/props/training-props-v2.glb?url';
let template: Promise<THREE.Group> | undefined;
export function loadTrainingTemplate(): Promise<THREE.Group> {
    template ??= new GLTFLoader().loadAsync(url).then(gltf => gltf.scene);
    return template;
}
