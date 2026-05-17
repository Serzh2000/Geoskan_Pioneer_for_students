import * as THREE from 'three';
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
    ACTIVE_COLOR,
    applySharedRootStyling,
    AXIS_COLORS,
    axisFromName,
    CENTER_COLOR,
    cloneBaseMaterial,
    getGeometryMetrics,
    type GizmoInternals,
    MODE_SIZES,
    NEUTRAL_COLOR,
    removeByName,
    replaceRotateGeometry,
    scaleGeometryAlongAxis,
    setMaterialColor,
    type StyledTransformControls,
    translateGeometryAlongAxis,
    type TransformMode,
    tuneMaterialLibrary,
    type AxisName
} from './transform-controls-style-helpers.js';

function customizeLinearModeGroup(group: THREE.Object3D, options: {
    removeCenterPlanes?: boolean;
    removeCenterUniform?: boolean;
    removeNegativeMirrors?: boolean;
    shaftScale?: number;
    headOffset?: number;
}) {
    if (options.removeCenterPlanes) removeByName(group, ['XY', 'YZ', 'XZ']);
    if (options.removeCenterUniform) removeByName(group, ['XYZ']);

    for (const child of [...group.children]) {
        const axis = axisFromName(child.name);
        if (!axis) continue;

        const { center, size } = getGeometryMetrics(child, axis);
        const isNegativeMirror = center < -0.12;
        const isAxisShaft = size > 0.32 && center > -0.02;
        const isPositiveHead = center > 0.42;

        if (options.removeNegativeMirrors && isNegativeMirror) {
            group.remove(child);
            continue;
        }

        if (isAxisShaft && options.shaftScale && options.shaftScale !== 1) {
            scaleGeometryAlongAxis(child, axis, options.shaftScale);
        }

        if (isPositiveHead && options.headOffset) {
            translateGeometryAlongAxis(child, axis, options.headOffset);
        }
    }
}

function addBackHalfArc(handle: THREE.Object3D, axis: AxisName, color: THREE.Color) {
    const mesh = handle as THREE.Mesh;
    if (!mesh.geometry || !mesh.material || handle.getObjectByName(`back-${axis}`)) return;

    const backArc = new THREE.Mesh(
        mesh.geometry.clone(),
        cloneBaseMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, {
            color,
            opacity: 0.3,
            depthTest: false
        })
    );

    backArc.name = `back-${axis}`;
    backArc.userData.transformUxBackArc = true;
    backArc.renderOrder = 9999;

    if (axis === 'X') backArc.rotation.x = Math.PI;
    if (axis === 'Y') backArc.rotation.y = Math.PI;
    if (axis === 'Z') backArc.rotation.z = Math.PI;

    handle.add(backArc);
}

function customizeRotateModeGroup(group: THREE.Object3D) {
    for (const child of group.children) {
        const axis = axisFromName(child.name);

        if (axis) {
            replaceRotateGeometry(child, 0.58, 0.012, 0.5);
            setMaterialColor((child as THREE.Mesh).material, AXIS_COLORS[axis], 0.96);
            addBackHalfArc(child, axis, AXIS_COLORS[axis]);
            continue;
        }

        if (child.name === 'XYZE') {
            replaceRotateGeometry(child, 0.54, 0.008, 1);
            setMaterialColor((child as THREE.Mesh).material, NEUTRAL_COLOR, 0.12);
            continue;
        }

        if (child.name === 'E') {
            replaceRotateGeometry(child, 0.84, 0.012, 1);
            setMaterialColor((child as THREE.Mesh).material, CENTER_COLOR, 0.22);
        }
    }
}

function customizeScaleModeGroup(gizmo: THREE.Object3D, picker: THREE.Object3D) {
    removeByName(gizmo, ['XY', 'YZ', 'XZ']);
    removeByName(picker, ['XY', 'YZ', 'XZ']);

    for (const child of gizmo.children) {
        const axis = axisFromName(child.name);
        if (axis) {
            const { center, size } = getGeometryMetrics(child, axis);
            const isAxisShaft = size > 0.32;
            if (isAxisShaft) scaleGeometryAlongAxis(child, axis, 1.18);
            continue;
        }

        if (child.name === 'XYZ') {
            scaleGeometryAlongAxis(child, 'X', 1.2);
            scaleGeometryAlongAxis(child, 'Y', 1.2);
            scaleGeometryAlongAxis(child, 'Z', 1.2);
            setMaterialColor((child as THREE.Mesh).material, CENTER_COLOR, 0.85);
        }
    }

    for (const child of picker.children) {
        if (child.name === 'XYZ') {
            scaleGeometryAlongAxis(child, 'X', 1.25);
            scaleGeometryAlongAxis(child, 'Y', 1.25);
            scaleGeometryAlongAxis(child, 'Z', 1.25);
        }
    }
}

function isAxisActive(control: TransformControls, handleName: string) {
    const activeAxis = (control.axis || '').toUpperCase();
    if (!activeAxis) return false;
    if (handleName === activeAxis) return true;
    return activeAxis.split('').includes(handleName);
}

function syncCustomHighlight(control: TransformControls, internals: GizmoInternals) {
    const rotateGroup = internals.gizmo.rotate;
    if (!rotateGroup) return;

    for (const child of rotateGroup.children) {
        const axis = axisFromName(child.name);
        if (!axis) continue;

        const active = isAxisActive(control, axis);
        const backArc = child.getObjectByName(`back-${axis}`) as THREE.Mesh | null;
        if (!backArc) continue;

        setMaterialColor(
            backArc.material,
            active ? ACTIVE_COLOR : AXIS_COLORS[axis],
            active ? 0.48 : 0.3
        );
    }
}

function syncTransformControlsStyle(control: StyledTransformControls) {
    const mode = control.getMode() as TransformMode;
    control.setSize(MODE_SIZES[mode]);

    if (!control._gizmo) return;
    syncCustomHighlight(control, control._gizmo);
}

export function applyTransformControlsUxTheme(control: TransformControls, helper: THREE.Object3D) {
    const styled = control as StyledTransformControls;
    if (styled.__transformUxStyled) {
        styled.__transformUxSync?.();
        return;
    }

    const internals = styled._gizmo;
    if (!internals) return;

    applySharedRootStyling(helper);
    tuneMaterialLibrary(internals);

    customizeLinearModeGroup(internals.gizmo.translate, {
        removeCenterPlanes: true,
        removeCenterUniform: true,
        removeNegativeMirrors: true,
        shaftScale: 1.34,
        headOffset: 0.12
    });
    customizeLinearModeGroup(internals.picker.translate, {
        removeCenterPlanes: true,
        removeCenterUniform: true,
        removeNegativeMirrors: true,
        shaftScale: 1.16,
        headOffset: 0.1
    });

    customizeRotateModeGroup(internals.gizmo.rotate);
    customizeScaleModeGroup(internals.gizmo.scale, internals.picker.scale);

    styled.__transformUxStyled = true;
    styled.__transformUxSync = () => syncTransformControlsStyle(styled);

    control.addEventListener('change', styled.__transformUxSync);
    control.addEventListener('axis-changed', styled.__transformUxSync as (event: any) => void);
    control.addEventListener('mode-changed', styled.__transformUxSync as (event: any) => void);
    control.addEventListener('mouseDown', styled.__transformUxSync as (event: any) => void);
    control.addEventListener('mouseUp', styled.__transformUxSync as (event: any) => void);

    styled.__transformUxSync();
}

export function refreshTransformControlsUxTheme(control: TransformControls) {
    (control as StyledTransformControls).__transformUxSync?.();
}
