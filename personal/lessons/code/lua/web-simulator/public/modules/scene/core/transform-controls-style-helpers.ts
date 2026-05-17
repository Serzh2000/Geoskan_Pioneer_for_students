import * as THREE from 'three';
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type AxisName = 'X' | 'Y' | 'Z';

export type GizmoInternals = {
    materialLib?: Record<string, THREE.Material & { color?: THREE.Color; opacity?: number }>;
    gizmo: Record<TransformMode, THREE.Object3D>;
    picker: Record<TransformMode, THREE.Object3D>;
    helper: Record<TransformMode, THREE.Object3D>;
};

export type StyledTransformControls = TransformControls & {
    _gizmo?: GizmoInternals;
    __transformUxStyled?: boolean;
    __transformUxSync?: () => void;
};

export const AXIS_COLORS: Record<AxisName, THREE.Color> = {
    X: new THREE.Color('#d48f8f'),
    Y: new THREE.Color('#8fbe9f'),
    Z: new THREE.Color('#86a9d8')
};

export const ACTIVE_COLOR = new THREE.Color('#ffe29a');
export const NEUTRAL_COLOR = new THREE.Color('#94a3b8');
export const CENTER_COLOR = new THREE.Color('#f3f6fb');

export const MODE_SIZES: Record<TransformMode, number> = {
    translate: 0.72,
    rotate: 0.78,
    scale: 0.72
};

function getAxisValue(vector: THREE.Vector3, axis: AxisName): number {
    if (axis === 'X') return vector.x;
    if (axis === 'Y') return vector.y;
    return vector.z;
}

export function getGeometryMetrics(object: THREE.Object3D, axis: AxisName) {
    const mesh = object as THREE.Mesh;
    const geometry = mesh.geometry;
    if (!geometry) return { center: 0, size: 0 };

    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    if (!bounds) return { center: 0, size: 0 };

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);

    return {
        center: getAxisValue(center, axis),
        size: getAxisValue(size, axis)
    };
}

export function scaleGeometryAlongAxis(object: THREE.Object3D, axis: AxisName, factor: number) {
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry) return;

    mesh.geometry.scale(axis === 'X' ? factor : 1, axis === 'Y' ? factor : 1, axis === 'Z' ? factor : 1);
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
}

export function translateGeometryAlongAxis(object: THREE.Object3D, axis: AxisName, offset: number) {
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry) return;

    mesh.geometry.translate(axis === 'X' ? offset : 0, axis === 'Y' ? offset : 0, axis === 'Z' ? offset : 0);
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
}

export function cloneBaseMaterial(
    material: THREE.Material,
    options: { color?: THREE.Color; opacity?: number; depthTest?: boolean } = {}
) {
    const clone = material.clone() as THREE.Material & {
        color?: THREE.Color;
        opacity?: number;
        transparent?: boolean;
        depthTest?: boolean;
        depthWrite?: boolean;
        toneMapped?: boolean;
        fog?: boolean;
    };

    if (options.color && clone.color) clone.color.copy(options.color);
    if (options.opacity !== undefined) {
        clone.opacity = options.opacity;
        clone.transparent = options.opacity < 1;
    }
    if (options.depthTest !== undefined) clone.depthTest = options.depthTest;
    clone.depthWrite = false;
    clone.toneMapped = false;
    clone.fog = false;
    return clone;
}

export function replaceRotateGeometry(handle: THREE.Object3D, radius: number, tube: number, arcFraction: number) {
    const mesh = handle as THREE.Mesh;
    if (!mesh.geometry) return;

    mesh.geometry.dispose();
    const geometry = new THREE.TorusGeometry(radius, tube, 12, 96, Math.PI * 2 * arcFraction);
    geometry.rotateY(Math.PI / 2);
    geometry.rotateX(Math.PI / 2);
    mesh.geometry = geometry;
}

export function setMaterialColor(material: THREE.Material | THREE.Material[], color: THREE.Color, opacity?: number) {
    const list = Array.isArray(material) ? material : [material];
    list.forEach((item) => {
        const typed = item as THREE.Material & { color?: THREE.Color; opacity?: number; transparent?: boolean };
        if (typed.color) typed.color.copy(color);
        if (opacity !== undefined) {
            typed.opacity = opacity;
            typed.transparent = opacity < 1;
        }
    });
}

export function axisFromName(name: string): AxisName | null {
    return name === 'X' || name === 'Y' || name === 'Z' ? name : null;
}

export function applySharedRootStyling(root: THREE.Object3D) {
    root.renderOrder = 10000;
    root.frustumCulled = false;
    root.traverse((node) => {
        node.renderOrder = 10000;
        node.frustumCulled = false;
    });
}

export function tuneMaterialLibrary(internals: GizmoInternals) {
    const lib = internals.materialLib;
    if (!lib) return;

    if (lib.xAxis?.color) lib.xAxis.color.copy(AXIS_COLORS.X);
    if (lib.yAxis?.color) lib.yAxis.color.copy(AXIS_COLORS.Y);
    if (lib.zAxis?.color) lib.zAxis.color.copy(AXIS_COLORS.Z);
    if (lib.active?.color) lib.active.color.copy(ACTIVE_COLOR);

    if (lib.xAxisTransparent?.color) lib.xAxisTransparent.color.copy(AXIS_COLORS.X);
    if (lib.yAxisTransparent?.color) lib.yAxisTransparent.color.copy(AXIS_COLORS.Y);
    if (lib.zAxisTransparent?.color) lib.zAxisTransparent.color.copy(AXIS_COLORS.Z);
    if (lib.activeTransparent?.color) lib.activeTransparent.color.copy(ACTIVE_COLOR);

    if (lib.xAxisTransparent?.opacity !== undefined) lib.xAxisTransparent.opacity = 0.28;
    if (lib.yAxisTransparent?.opacity !== undefined) lib.yAxisTransparent.opacity = 0.28;
    if (lib.zAxisTransparent?.opacity !== undefined) lib.zAxisTransparent.opacity = 0.28;
    if (lib.activeTransparent?.opacity !== undefined) lib.activeTransparent.opacity = 0.42;
}

export function removeByName(group: THREE.Object3D, names: string[]) {
    const set = new Set(names);
    for (const child of [...group.children]) {
        if (set.has(child.name)) {
            group.remove(child);
        }
    }
}
