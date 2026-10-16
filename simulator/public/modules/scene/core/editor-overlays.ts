import type * as THREE from 'three';
import { multiSelectedObjects, selectedObject } from './scene-init.js';

// Всё, что рисует редактор поверх сцены (рамка и гизмо выделения, метка
// Ctrl+ЛКМ, след полёта, предпросмотр маршрута, маркер расстановки), и
// подсветка выделенного объекта — это вид редактора, а не мир. Камера дрона
// их видеть не должна: ни окна камер во вьюпорте, ни кадры камеры для
// программ (Lua camera, Python Camera), иначе ArUco и ученик видят то, чего
// на настоящем полигоне нет.
const EDITOR_ONLY = 'editorOnly';

export function markEditorOnly<T extends THREE.Object3D>(object: T): T {
    object.userData[EDITOR_ONLY] = true;
    return object;
}

type EmissiveMaterial = THREE.Material & {
    emissive?: THREE.Color;
    emissiveIntensity?: number;
};

function materialsOf(node: THREE.Object3D): EmissiveMaterial[] {
    const material = (node as THREE.Mesh).material as EmissiveMaterial | EmissiveMaterial[] | undefined;
    if (!material) return [];
    return Array.isArray(material) ? material : [material];
}

/**
 * Рендер без следов редактора: помеченные объекты скрываются, а подсветка
 * выделенного объекта (выделение меняет emissive прямо в материалах, см.
 * scene/interaction/selection-ui.ts) на время рендера снимается.
 */
export function renderWithoutEditorOverlays<T>(scene: THREE.Scene, run: () => T): T {
    const hidden: THREE.Object3D[] = [];
    for (const child of scene.children) {
        if (child.userData[EDITOR_ONLY] && child.visible) {
            child.visible = false;
            hidden.push(child);
        }
    }

    const tinted: Array<{ material: EmissiveMaterial; emissive: number; intensity: number }> = [];
    const selection = new Set<THREE.Object3D>([...(selectedObject ? [selectedObject] : []), ...multiSelectedObjects]);
    selection.forEach((object) => object.traverse((node) => {
        materialsOf(node).forEach((material) => {
            if (!material.emissive || material.userData.originalEmissive === undefined) return;
            if (tinted.some((entry) => entry.material === material)) return;
            tinted.push({ material, emissive: material.emissive.getHex(), intensity: material.emissiveIntensity ?? 0 });
            material.emissive.setHex(material.userData.originalEmissive);
            material.emissiveIntensity = material.userData.originalEmissiveIntensity ?? 0;
        });
    }));

    try {
        return run();
    } finally {
        tinted.forEach(({ material, emissive, intensity }) => {
            material.emissive?.setHex(emissive);
            material.emissiveIntensity = intensity;
        });
        hidden.forEach((object) => { object.visible = true; });
    }
}
