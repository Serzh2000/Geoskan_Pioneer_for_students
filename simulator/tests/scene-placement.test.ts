import * as THREE from 'three';
import {
    FLAT_DECAL_LIFT,
    GRID_SNAP_STEP,
    applyFlatObjectDepthOffset,
    collectGroundSurfaces,
    isGridSnapActive,
    isRestingOnSurface,
    keepObjectBottomAboveSurface,
    pivotZAboveSurface,
    sampleSurfaceZ,
    seatObjectBottomOnSurface,
    seatedPivotZ,
    snapAngleRadians,
    snapPlanarPoint,
    snapToGridSoft,
    softSnapPlanarPoint,
    GRID_SNAP_PULL,
    snapToGrid,
    verticalExtent
} from '../public/modules/scene/objects/placement-geometry.js';
import { OBJECT_TYPE } from '../public/modules/shared/object-types.js';

// Marker and pad textures are drawn on a canvas; this suite runs without a DOM.
const context = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => target[key] ?? (() => ({ data: [] })) });
(globalThis as any).document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const { createArucoMarkerMesh } = await import('../public/modules/environment/obstacles/markers/object.js');
const { createStyledLandingPad } = await import('../public/modules/environment/obstacles/pads.js');

const box = (w: number, d: number, h: number, centreZ: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), new THREE.MeshStandardMaterial());
    mesh.position.z = centreZ;
    const root = new THREE.Group();
    root.add(mesh);
    return root;
};

describe('grid snapping', () => {
    test('rounds X/Y to the nearest 1 m node of the ground grid', () => {
        expect(GRID_SNAP_STEP).toBe(1);
        expect(snapToGrid(2.49)).toBe(2);
        expect(snapToGrid(2.51)).toBe(3);
        expect(snapToGrid(-0.4)).toBe(0);
        expect(Object.is(snapToGrid(-0.4), -0)).toBe(false);
        expect(snapToGrid(0.74, 0.5)).toBe(0.5);
        expect(snapToGrid(0.3 * 3, 0.1)).toBe(0.9);
        expect(snapPlanarPoint({ x: 3.7, y: -1.2 }, true)).toEqual({ x: 4, y: -1 });
    });

    test('soft snapping pulls to a grid line only when close, and each axis decides for itself', () => {
        expect(GRID_SNAP_PULL).toBeLessThan(0.5);
        expect(snapToGridSoft(2.1)).toBe(2);
        expect(snapToGridSoft(2.2)).toBe(2);
        expect(snapToGridSoft(2.3)).toBe(2.3);
        expect(snapToGridSoft(2.5)).toBe(2.5);
        expect(snapToGridSoft(2.85)).toBe(3);
        expect(softSnapPlanarPoint({ x: 3.1, y: -1.5 }, true)).toEqual({ x: 3, y: -1.5 });
        expect(softSnapPlanarPoint({ x: 3.1, y: -1.5 }, false)).toEqual({ x: 3.1, y: -1.5 });
    });

    test('Shift (or the switch turned off) leaves the point where it was', () => {
        expect(isGridSnapActive(true, false)).toBe(true);
        expect(isGridSnapActive(true, true)).toBe(false);
        expect(isGridSnapActive(false, false)).toBe(false);
        expect(snapPlanarPoint({ x: 3.7, y: -1.2 }, isGridSnapActive(true, true))).toEqual({ x: 3.7, y: -1.2 });
    });

    test('rotation snaps to 15° steps only while snapping is active', () => {
        const deg = THREE.MathUtils.degToRad;
        expect(snapAngleRadians(deg(37), true)).toBeCloseTo(deg(30));
        expect(snapAngleRadians(deg(38), true)).toBeCloseTo(deg(45));
        expect(snapAngleRadians(deg(37), false)).toBeCloseTo(deg(37));
    });
});

describe('standing on the surface', () => {
    test('the bounding-box bottom, not the pivot, goes onto the surface', () => {
        // Pivot in the middle of a 2 m tall body: pivot z = 0 buries half of it.
        expect(seatedPivotZ(0, -1, 1, 0)).toBe(1);
        // Pivot at the base already: unchanged on the ground, raised on a 3 m hill.
        expect(seatedPivotZ(0, 0, 2, 0)).toBe(0);
        expect(seatedPivotZ(0, 0, 2, 3)).toBe(3);
        // A zero-thickness decal keeps its small lift above the surface.
        expect(seatedPivotZ(0, 0, 0, 0)).toBe(FLAT_DECAL_LIFT);
        expect(pivotZAboveSurface(0, -0.5, 0)).toBe(0.5);
        expect(pivotZAboveSurface(2, 1.5, 0)).toBe(2);
        expect(isRestingOnSurface(0, 0, 2, 0)).toBe(true);
        expect(isRestingOnSurface(1.5, 1.5, 3.5, 0)).toBe(false);
    });

    test('seats a centred model on the ground and on a raised surface', () => {
        const crate = box(1, 1, 2, 0);
        expect(verticalExtent(crate)).toEqual({ bottom: -1, top: 1 });
        seatObjectBottomOnSurface(crate, 0);
        expect(verticalExtent(crate)?.bottom).toBeCloseTo(0);
        seatObjectBottomOnSurface(crate, 2.5);
        expect(verticalExtent(crate)?.bottom).toBeCloseTo(2.5);
        expect(crate.position.z).toBeCloseTo(3.5);
    });

    test('keeps a lifted object where it is, only pushes a sunken one up', () => {
        const flying = box(1, 1, 1, 0.5);
        flying.position.z = 4;
        expect(keepObjectBottomAboveSurface(flying, 0)).toBe(false);
        expect(flying.position.z).toBe(4);
        const sunk = box(1, 1, 1, 0.5);
        sunk.position.z = -0.3;
        expect(keepObjectBottomAboveSurface(sunk, 0)).toBe(true);
        expect(verticalExtent(sunk)?.bottom).toBeCloseTo(0);
    });

    test('works inside a moved parent (world height, local position)', () => {
        const parent = new THREE.Group();
        parent.position.z = 10;
        const child = box(1, 1, 2, 0);
        parent.add(child);
        seatObjectBottomOnSurface(child, 0);
        expect(verticalExtent(child)?.bottom).toBeCloseTo(0);
        expect(child.position.z).toBeCloseTo(-9);
    });

    test('a marker sheet placed at z = 0 is half under the ground until seated', () => {
        const marker = createArucoMarkerMesh('7');
        const thickness = verticalExtent(marker)!;
        expect(thickness.bottom).toBeLessThan(0); // centred sheet: the old "half stuck in the ground"
        seatObjectBottomOnSurface(marker, 0);
        expect(verticalExtent(marker)!.bottom).toBeCloseTo(0, 6);
        expect(verticalExtent(marker)!.top).toBeGreaterThan(0.015);
    });

    test('a pad dropped at z = 0 gets its lift back and a depth offset', () => {
        const pad = createStyledLandingPad('H');
        pad.position.z = 0; // what addObjectToScene does to every object
        seatObjectBottomOnSurface(pad, 0);
        expect(pad.position.z).toBeCloseTo(FLAT_DECAL_LIFT);
        expect(applyFlatObjectDepthOffset(pad)).toBe(true);
        const material = pad.material as THREE.Material;
        expect(material.polygonOffset).toBe(true);
        expect(material.polygonOffsetFactor).toBeLessThan(0);
        expect(material.polygonOffsetUnits).toBeLessThan(0);
        // Solid props are left alone.
        const tower = box(1, 1, 3, 1.5);
        expect(applyFlatObjectDepthOffset(tower)).toBe(false);
        expect(((tower.children[0] as THREE.Mesh).material as THREE.Material).polygonOffset).toBe(false);
    });
});

describe('ground surface sampling', () => {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial());
    ground.userData.type = OBJECT_TYPE.GROUND;
    // Decoration parented to the ground (the H pad) is not a surface.
    const decoration = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
    decoration.position.z = 0.015;
    ground.add(decoration);

    const training = new THREE.Group();
    const relief = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    relief.position.set(100, 0, 2);
    relief.userData.trainingGround = { size: 40 };
    training.add(relief);
    const roots = [ground, training, box(1, 1, 3, 1.5)];

    test('finds the ground plane and the training relief, nothing else', () => {
        expect(collectGroundSurfaces(roots)).toEqual([ground, relief]);
    });

    test('returns the highest surface under the point, 0 off the map', () => {
        const surfaces = collectGroundSurfaces(roots);
        expect(sampleSurfaceZ(surfaces, 0, 0)).toBeCloseTo(0);
        expect(sampleSurfaceZ(surfaces, 100, 5)).toBeCloseTo(2);
        expect(sampleSurfaceZ(surfaces, 1000, 1000)).toBe(0);
        expect(sampleSurfaceZ([], 0, 0)).toBe(0);
        // A training map being moved is not its own surface.
        expect(sampleSurfaceZ(surfaces, 100, 5, training)).toBeCloseTo(0);
    });
});
