/**
 * Камера дрона не видит редактор: ни подсветку выделенного объекта, ни
 * рамку/гизмо/метки (scene/core/editor-overlays.ts). После рендера всё
 * возвращается как было.
 */
import { jest } from '@jest/globals';
import * as THREE from 'three';

// Jest копирует значения экспорта мока один раз, поэтому выделение — живой
// массив, который тесты меняют на месте (как multiSelectedObjects в
// scene-init.ts, где он содержит и основной выделенный объект).
const multiSelectedObjects: THREE.Object3D[] = [];
jest.unstable_mockModule('../public/modules/scene/core/scene-init.js', () => ({
    selectedObject: null,
    multiSelectedObjects
}));

function select(...objects: THREE.Object3D[]): void {
    multiSelectedObjects.splice(0, multiSelectedObjects.length, ...objects);
}
const { markEditorOnly, renderWithoutEditorOverlays } = await import('../public/modules/scene/core/editor-overlays.js');

function tintedBox(): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
    const material = new THREE.MeshStandardMaterial({ emissive: 0x000000 });
    // Как делает выделение (selection-ui.ts): запоминает исходное свечение и красит.
    material.userData.originalEmissive = 0x000000;
    material.userData.originalEmissiveIntensity = 0;
    material.emissive.setHex(0x38bdf8);
    material.emissiveIntensity = 0.08;
    return { mesh: new THREE.Mesh(new THREE.BoxGeometry(), material), material };
}

test('во время рендера камеры нет подсветки и меток редактора, после — всё на месте', () => {
    const scene = new THREE.Scene();
    const first = tintedBox();
    const second = tintedBox();
    scene.add(first.mesh, second.mesh);
    const gizmo = markEditorOnly(new THREE.Object3D());
    const hiddenHelper = markEditorOnly(new THREE.Object3D());
    hiddenHelper.visible = false;
    scene.add(gizmo, hiddenHelper);
    select(first.mesh, second.mesh);

    const seen = renderWithoutEditorOverlays(scene, () => ({
        gizmo: gizmo.visible,
        first: first.material.emissive.getHex(),
        second: second.material.emissive.getHex()
    }));

    expect(seen).toEqual({ gizmo: false, first: 0x000000, second: 0x000000 });
    expect(gizmo.visible).toBe(true);
    expect(hiddenHelper.visible).toBe(false);
    expect(first.material.emissive.getHex()).toBe(0x38bdf8);
    expect(second.material.emissiveIntensity).toBeCloseTo(0.08);
});

test('ошибка рендера не оставляет сцену без подсветки', () => {
    const scene = new THREE.Scene();
    const box = tintedBox();
    scene.add(box.mesh);
    select(box.mesh);

    expect(() => renderWithoutEditorOverlays(scene, () => { throw new Error('WebGL'); })).toThrow('WebGL');
    expect(box.material.emissive.getHex()).toBe(0x38bdf8);
});
