import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import radxaUrl from '../../assets/models/pioneer/radxa-module.glb?url';

/*
 * Вычислительный модуль Radxa Zero 3W на Пионере Базовом.
 *
 * pioneer_sdk2 работает на Базовом только с бортовым компьютером Radxa Zero 3W, поэтому, когда дрону
 * выбран язык «Python · SDK2», модуль стоит на модели: плата-адаптер на разъёмах платы расширения, на ней
 * Radxa Zero 3W с радиаторами, сверху оранжевый кронштейн с камерой, шлейф и антенна (схема сборки constr.pdf).
 * Модуль занимает тот же слот под корпусом, что и модуль ESP32, поэтому ESP32 в это время не показывается.
 *
 * Ассет собран tools/export_radxa_module.py из модели Radxa_v02.blend. Он уже стоит в координатах модели
 * дрона (узел radxa_module), так что достаточно добавить его в группу модели. GLB (2 МБ) грузится только
 * когда модуль нужен хотя бы одному дрону.
 */

const MODULE_NODE = 'radxa_module';

type RadxaState = {
    /** Включён ли модуль для этого дрона сейчас. */
    wanted: boolean;
    /** GLB уже запрошен. */
    requested: boolean;
    node: THREE.Object3D | null;
};

let templatePromise: Promise<THREE.Group> | null = null;

function loadTemplate(): Promise<THREE.Group> {
    if (!templatePromise) {
        templatePromise = new GLTFLoader().loadAsync(radxaUrl)
            .then(({ scene }) => scene)
            .catch((error) => {
                templatePromise = null;
                throw error;
            });
    }
    return templatePromise;
}

function stateOf(model: THREE.Object3D): RadxaState {
    let state = model.userData.radxa as RadxaState | undefined;
    if (!state) {
        state = { wanted: false, requested: false, node: null };
        model.userData.radxa = state;
    }
    return state;
}

/** Клон модуля для одного дрона: материалы свои, чтобы эффекты одного дрона не задевали другие. */
export function attachRadxaModule(model: THREE.Object3D, template: THREE.Object3D): THREE.Object3D {
    const node = template.getObjectByName(MODULE_NODE)?.clone(true);
    if (!node) throw new Error(`Radxa asset is missing ${MODULE_NODE}`);
    node.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
            ? object.material.map((material) => material.clone())
            : object.material.clone();
        object.castShadow = true;
    });
    const state = stateOf(model);
    state.node = node;
    if (state.wanted) model.add(node);
    return node;
}

/**
 * Каждый кадр: нужен ли модуль этому дрону (Базовый с pioneer_sdk2). Возвращает true, если модуль включён,
 * чтобы вызывающий код убрал с того же слота модуль ESP32.
 */
export function syncRadxaModule(model: THREE.Object3D, wanted: boolean): boolean {
    const state = stateOf(model);
    if (state.wanted !== wanted) {
        state.wanted = wanted;
        if (state.node) {
            if (wanted) model.add(state.node);
            else state.node.removeFromParent();
        }
    }
    if (wanted && !state.requested) {
        state.requested = true;
        void loadTemplate()
            .then((template) => {
                if (!state.node) attachRadxaModule(model, template);
            })
            .catch((error: unknown) => {
                state.requested = false;
                console.error('[DroneModel] Failed to load the Radxa module model.', error);
            });
    }
    return wanted;
}
