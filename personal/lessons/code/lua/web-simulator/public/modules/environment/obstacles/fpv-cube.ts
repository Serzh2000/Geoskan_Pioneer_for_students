import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import {
    clampFpvCubeHeight,
    fpvCubeFrameCentre,
    FPV_CUBE_FRAMES,
    FPV_CUBE_FRAME_SIZE,
    FPV_CUBE_LEG_INSET,
    FPV_CUBE_LEG_RADIUS,
    FPV_CUBE_OPENING,
    FPV_CUBE_OPENING_CORNER_RADIUS,
    FPV_CUBE_OUTER_CORNER_RADIUS,
    FPV_CUBE_REAL
} from '../../shared/fpv-cube-geometry.js';
import { DRONE_SIM_SCALE } from '../../shared/drone-scale.js';

/*
 * FPV racing cube: four square fabric frames (red edge, white and navy checkered border, rounded opening) standing as
 * the sides of a cube on a collapsible black stand, like the folding gates sold for FPV training. A drone can fly
 * through any of the four openings. The total height is adjustable in the real product (105 - 145 cm), so the mesh
 * takes it as a parameter (in scene metres, see shared/fpv-cube-geometry.ts) and remembers it in userData for the collision code.
 */

const FRAME_RED = '#d4202a';
const FRAME_NAVY = '#1f2a5a';
const FRAME_TEXTURE_SIZE = 512;

function roundedSquarePath(path: THREE.Path, half: number, radius: number) {
    const r = Math.min(radius, half);
    path.moveTo(-half + r, -half);
    path.lineTo(half - r, -half);
    path.absarc(half - r, -half + r, r, -Math.PI / 2, 0, false);
    path.lineTo(half, half - r);
    path.absarc(half - r, half - r, r, 0, Math.PI / 2, false);
    path.lineTo(-half + r, half);
    path.absarc(-half + r, half - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(-half, -half + r);
    path.absarc(-half + r, -half + r, r, Math.PI, Math.PI * 1.5, false);
}

/** A square frame with a rounded opening cut through it, UVs spanning the whole face from 0 to 1. */
function createFrameGeometry(): THREE.ShapeGeometry {
    const half = FPV_CUBE_FRAME_SIZE / 2;
    const shape = new THREE.Shape();
    roundedSquarePath(shape, half, FPV_CUBE_OUTER_CORNER_RADIUS);
    const hole = new THREE.Path();
    roundedSquarePath(hole, FPV_CUBE_OPENING / 2, FPV_CUBE_OPENING_CORNER_RADIUS);
    shape.holes.push(hole);
    const geometry = new THREE.ShapeGeometry(shape, 12);
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i += 1) {
        uv.setXY(i, (position.getX(i) + half) / FPV_CUBE_FRAME_SIZE, (position.getY(i) + half) / FPV_CUBE_FRAME_SIZE);
    }
    uv.needsUpdate = true;
    return geometry;
}

/** The face artwork: red edge, white fabric, navy checks on the left and right bands, a label on the top and bottom ones. */
function createFrameTexture(): THREE.Texture | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_TEXTURE_SIZE;
    canvas.height = FRAME_TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // The artwork is laid out in the product's real metres; the scene scale only stretches the whole face.
    const px = (realMetres: number) => (realMetres / FPV_CUBE_REAL.frameSize) * FRAME_TEXTURE_SIZE;
    const size = FRAME_TEXTURE_SIZE;

    ctx.fillStyle = FRAME_RED;
    ctx.fillRect(0, 0, size, size);
    const edge = px(0.018);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(edge, edge, size - 2 * edge, size - 2 * edge);

    // Navy checks on the side bands, outside the opening.
    const band = px((FPV_CUBE_REAL.frameSize - FPV_CUBE_REAL.opening) / 2);
    const cell = px(0.026);
    ctx.fillStyle = FRAME_NAVY;
    for (let row = 0; row * cell < size; row += 1) {
        for (let col = 0; col * cell < band; col += 1) {
            if ((row + col) % 2 !== 0) continue;
            ctx.fillRect(edge + col * cell, row * cell, cell, cell);
            ctx.fillRect(size - edge - (col + 1) * cell, row * cell, cell, cell);
        }
    }
    // White strips with the label on the top and bottom edges (the bottom one reads upside down, as on the product).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(band, edge, size - 2 * band, band - edge);
    ctx.fillRect(band, size - band, size - 2 * band, band - edge);
    ctx.fillStyle = FRAME_NAVY;
    ctx.font = `700 ${px(0.04)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FPV GATE', size / 2, (edge + band) / 2);
    ctx.save();
    ctx.translate(size / 2, size - (edge + band) / 2);
    ctx.rotate(Math.PI);
    ctx.fillText('FPV GATE', 0, 0);
    ctx.restore();

    // The red rim around the opening, centred on the cut edge so half of it stays on the fabric.
    ctx.strokeStyle = FRAME_RED;
    ctx.lineWidth = px(0.03);
    const open = px(FPV_CUBE_REAL.opening);
    const radius = px(FPV_CUBE_REAL.openingCornerRadius);
    const start = (size - open) / 2;
    ctx.beginPath();
    ctx.roundRect(start, start, open, open, radius);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

function tube(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
    const direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
    mesh.position.copy(from).addScaledVector(direction, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
}

export function createFpvCubeMesh(requestedHeight?: number) {
    const height = clampFpvCubeHeight(requestedHeight);
    const frameCentre = fpvCubeFrameCentre(height);
    const frameBottom = frameCentre - FPV_CUBE_FRAME_SIZE / 2;
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.FPV_CUBE, {
        collidableRadius: 0.7,
        fpvCubeHeight: height
    });

    const texture = createFrameTexture();
    const fabric = new THREE.MeshStandardMaterial({
        color: texture ? 0xffffff : 0xe8e8ef,
        map: texture,
        roughness: 0.85,
        metalness: 0,
        side: THREE.DoubleSide
    });
    const frameGeometry = createFrameGeometry();

    // Frames: the shape lives in XY; standing up turns its Y into the world's Z, and side frames then turn about Z.
    for (const frame of FPV_CUBE_FRAMES) {
        const holder = new THREE.Group();
        const mesh = new THREE.Mesh(frameGeometry, fabric);
        mesh.rotation.x = Math.PI / 2;
        holder.add(mesh);
        if (frame.normal === 'x') {
            holder.rotation.z = Math.PI / 2;
            holder.position.set(frame.offset, 0, frameCentre);
        } else {
            holder.position.set(0, frame.offset, frameCentre);
        }
        group.add(holder);
    }

    // Stand: four legs, a platform square under the cube, a mid brace and a square of feet on the ground.
    const metal = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.5, metalness: 0.6 });
    const inset = FPV_CUBE_LEG_INSET;
    const corners: Array<[number, number]> = [[-inset, -inset], [inset, -inset], [inset, inset], [-inset, inset]];
    const railHeights = [0.03 * DRONE_SIM_SCALE, Math.max(0.1 * DRONE_SIM_SCALE, frameBottom * 0.55), frameBottom - 0.015 * DRONE_SIM_SCALE];
    for (const [x, y] of corners) {
        group.add(tube(new THREE.Vector3(x, y, 0.02 * DRONE_SIM_SCALE), new THREE.Vector3(x, y, frameBottom), FPV_CUBE_LEG_RADIUS, metal));
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * DRONE_SIM_SCALE, 0.035 * DRONE_SIM_SCALE, 0.02 * DRONE_SIM_SCALE, 14), metal);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(x, y, 0.01 * DRONE_SIM_SCALE);
        group.add(foot);
    }
    for (const z of railHeights) {
        for (let i = 0; i < corners.length; i += 1) {
            const [ax, ay] = corners[i];
            const [bx, by] = corners[(i + 1) % corners.length];
            group.add(tube(new THREE.Vector3(ax, ay, z), new THREE.Vector3(bx, by, z), FPV_CUBE_LEG_RADIUS * 0.8, metal));
        }
    }

    applyShadows(group);
    return group;
}

/**
 * Changes the height of a placed cube (the real gate adjusts from 105 to 145 cm): the frames and the stand are rebuilt in
 * place, so the object keeps its identity, position, rotation and selection. Returns false when nothing changed.
 */
export function updateFpvCubeHeight(object: THREE.Object3D, requestedHeight: number): boolean {
    const height = clampFpvCubeHeight(requestedHeight);
    if (Math.abs(height - Number(object.userData?.fpvCubeHeight ?? 0)) < 1e-6) return false;
    const fresh = createFpvCubeMesh(height);
    for (const child of [...object.children]) {
        object.remove(child);
        child.traverse((part) => {
            if (part instanceof THREE.Mesh) part.geometry.dispose();
        });
    }
    for (const child of [...fresh.children]) object.add(child);
    object.userData.fpvCubeHeight = height;
    return true;
}
