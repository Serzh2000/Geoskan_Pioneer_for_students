import * as THREE from 'three';
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
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
    fadeFarSideMaterial,
    ringGeometry,
    ROTATE_AXIS_RADIUS,
    scaleGeometryAlongAxis,
    setMaterialColor,
    type StyledTransformControls,
    translateGeometryAlongAxis,
    type TransformMode,
    tuneMaterialLibrary,
    type AxisName
} from './transform-controls-style-helpers.js';

function customizeLinearModeGroup(group: THREE.Object3D, options: {
    keepGroundPlane?: boolean;
    removeCenterUniform?: boolean;
    removeNegativeMirrors?: boolean;
    shaftScale?: number;
    headOffset?: number;
}) {
    // The XY plane is the ground: one gesture moves an object across it. Vertical planes stay removed.
    if (options.keepGroundPlane) removeByName(group, ['YZ', 'XZ']);
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

const IDENTITY_QUATERNION = new THREE.Quaternion();
const AXIS_CAPTIONS: Record<AxisName, string> = { X: 'наклон', Y: 'наклон', Z: 'поворот' };

/** A name tag for one rotate ring: "Z  поворот" in the ring's colour, always facing the camera. */
function createRingLabel(axis: AxisName): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    const color = `#${AXIS_COLORS[axis].getHexString()}`;
    if (ctx) {
        ctx.fillStyle = 'rgba(18, 22, 28, 0.92)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 28);
        ctx.fill();
        ctx.stroke();
        ctx.textBaseline = 'middle';
        ctx.font = '700 58px Inter, Arial, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(axis, 34, 58);
        ctx.font = '600 38px Inter, Arial, sans-serif';
        ctx.fillStyle = '#f2f2f2';
        ctx.fillText(AXIS_CAPTIONS[axis], 90, 60);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sprite.name = `label-${axis}`;
    sprite.scale.set(0.42, 0.147, 1);
    sprite.renderOrder = 10010;
    return sprite;
}

/** The tag sits on its ring, halfway between the other two axes, and never moves with the camera. */
function addRingLabel(handle: THREE.Object3D, axis: AxisName) {
    if (handle.getObjectByName(`label-${axis}`)) return;
    const d = ROTATE_AXIS_RADIUS * Math.SQRT1_2 * 1.55;
    const label = createRingLabel(axis);
    if (axis === 'X') label.position.set(0, d, d);
    if (axis === 'Y') label.position.set(d, 0, d);
    if (axis === 'Z') label.position.set(d, d, 0);
    handle.add(label);
}

function customizeRotateModeGroup(group: THREE.Object3D) {
    for (const child of group.children) {
        const axis = axisFromName(child.name);
        const mesh = child as THREE.Mesh;

        if (axis) {
            mesh.geometry?.dispose();
            mesh.geometry = ringGeometry(axis, ROTATE_AXIS_RADIUS, 0.022);
            mesh.material = fadeFarSideMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
            setMaterialColor(mesh.material, AXIS_COLORS[axis], 0.95);
            addRingLabel(child, axis);
        }
    }
}

function customizeRotatePickers(picker: THREE.Object3D) {
    for (const child of picker.children) {
        const axis = axisFromName(child.name);
        if (!axis) continue;
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        mesh.geometry = ringGeometry(axis, ROTATE_AXIS_RADIUS, 0.07, 6, 64);
    }
}

/**
 * The library re-aims every rotate ring at the camera each frame (and adds a camera-facing outer ring and a
 * trackball). Here the three rings stay on their axes and the camera-bound extras are hidden.
 */
function pinRotateRings(control: StyledTransformControls, internals: GizmoInternals) {
    const base = control.space === 'local' ? (control as unknown as { worldQuaternion: THREE.Quaternion }).worldQuaternion : IDENTITY_QUATERNION;
    for (const group of [internals.gizmo.rotate, internals.picker.rotate]) {
        for (const child of group.children) {
            if (axisFromName(child.name)) {
                child.quaternion.copy(base);
                child.updateMatrixWorld(true);
            } else if (child.name === 'E' || child.name === 'XYZE') {
                child.visible = false;
            }
        }
    }
}

/** The ground square (XY): a bigger quadrant at the object, for dragging across the floor in one move. */
function enlargeGroundPlane(group: THREE.Object3D) {
    const plane = group.children.find(child => child.name === 'XY');
    if (!plane) return;
    scaleGeometryAlongAxis(plane, 'X', 1.9);
    scaleGeometryAlongAxis(plane, 'Y', 1.9);
}

function customizeScaleModeGroup(gizmo: THREE.Object3D, picker: THREE.Object3D) {
    removeByName(gizmo, ['XY', 'YZ', 'XZ']);
    removeByName(picker, ['XY', 'YZ', 'XZ']);

    for (const child of gizmo.children) {
        const axis = axisFromName(child.name);
        if (axis) {
            const { size } = getGeometryMetrics(child, axis);
            const isAxisShaft = size > 0.32;
            if (isAxisShaft) scaleGeometryAlongAxis(child, axis, 1.18);
            continue;
        }

        if (child.name === 'XYZ') {
            scaleGeometryAlongAxis(child, 'X', 1.26);
            scaleGeometryAlongAxis(child, 'Y', 1.26);
            scaleGeometryAlongAxis(child, 'Z', 1.26);
            setMaterialColor((child as THREE.Mesh).material, CENTER_COLOR, 0.92);
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

function syncTransformControlsStyle(control: StyledTransformControls) {
    const mode = control.getMode() as TransformMode;
    control.setSize(MODE_SIZES[mode]);

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
        keepGroundPlane: true,
        removeCenterUniform: true,
        removeNegativeMirrors: true,
        shaftScale: 1.24,
        headOffset: 0.1
    });
    customizeLinearModeGroup(internals.picker.translate, {
        keepGroundPlane: true,
        removeCenterUniform: true,
        removeNegativeMirrors: true,
        shaftScale: 1.12,
        headOffset: 0.08
    });

    enlargeGroundPlane(internals.gizmo.translate);
    enlargeGroundPlane(internals.picker.translate);
    customizeRotateModeGroup(internals.gizmo.rotate);
    customizeRotatePickers(internals.picker.rotate);

    const gizmoRoot = internals as unknown as THREE.Object3D;
    const updateGizmoMatrices = gizmoRoot.updateMatrixWorld.bind(gizmoRoot);
    gizmoRoot.updateMatrixWorld = (force?: boolean) => {
        updateGizmoMatrices(force);
        pinRotateRings(styled, internals);
    };
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

