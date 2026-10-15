import * as THREE from 'three';
import { createFpvCubeMesh } from '../public/modules/environment/obstacles/fpv-cube.js';
import { DRONE_COLLISION_RADIUS } from '../public/modules/physics/constants.js';
import { obstacleHasCollision } from '../public/modules/physics/collisions.js';
import { DRONE_REAL_WIDTH, DRONE_SIM_WIDTH } from '../public/modules/shared/drone-scale.js';
import {
    clampFpvCubeHeight,
    fpvCubeFrameCentre,
    FPV_CUBE_DEFAULT_HEIGHT,
    FPV_CUBE_FRAMES,
    FPV_CUBE_FRAME_SIZE,
    FPV_CUBE_FRAME_THICKNESS,
    FPV_CUBE_LEG_INSET,
    FPV_CUBE_MAX_HEIGHT,
    FPV_CUBE_MIN_HEIGHT,
    FPV_CUBE_OPENING,
    FPV_CUBE_REAL
} from '../public/modules/shared/fpv-cube-geometry.js';
import { GATE_RING_RADIUS, GATE_RING_TUBE_RADIUS } from '../public/modules/shared/gate-geometry.js';
import { OBJECT_TYPE } from '../public/modules/shared/object-types.js';
import { getCatalogCategory } from '../public/modules/ui/scene-manager/catalog.js';

const cube = (height?: number) => {
    const object = createFpvCubeMesh(height);
    object.updateMatrixWorld(true);
    return object;
};
const hit = (object: THREE.Object3D, x: number, y: number, z: number) => obstacleHasCollision(object, [new THREE.Vector3(x, y, z)]);

describe('FPV cube proportions', () => {
    it('keeps the real ratio of the product to the drone: an 80 cm frame for a 29 cm Pioneer', () => {
        expect(FPV_CUBE_FRAME_SIZE / DRONE_SIM_WIDTH).toBeCloseTo(FPV_CUBE_REAL.frameSize / DRONE_REAL_WIDTH, 3);
        expect(FPV_CUBE_OPENING / DRONE_SIM_WIDTH).toBeCloseTo(FPV_CUBE_REAL.opening / DRONE_REAL_WIDTH, 3);
    });

    it('has an opening in line with the competition gate that is already in the simulator', () => {
        const gateOpening = 2 * (GATE_RING_RADIUS - GATE_RING_TUBE_RADIUS);
        expect(Math.abs(FPV_CUBE_OPENING - gateOpening)).toBeLessThan(0.1);
    });

    it('lets the whole drone through the opening with room to spare', () => {
        expect(FPV_CUBE_OPENING).toBeGreaterThan(DRONE_SIM_WIDTH * 1.9);
    });

    it('adjusts from 105 to 145 cm of a real cube, in the same proportion', () => {
        expect(FPV_CUBE_MAX_HEIGHT / FPV_CUBE_MIN_HEIGHT).toBeCloseTo(1.45 / 1.05, 5);
    });
});

describe('FPV cube', () => {
    it('is a draggable scene object of its own type and appears among the flight props', () => {
        const object = cube();
        expect(object.userData.type).toBe(OBJECT_TYPE.FPV_CUBE);
        expect(object.userData.draggable).toBe(true);
        expect(getCatalogCategory('fpv-cube')).toBe('flight');
    });

    it('keeps its height within what the product allows', () => {
        expect(clampFpvCubeHeight(undefined)).toBe(FPV_CUBE_DEFAULT_HEIGHT);
        expect(clampFpvCubeHeight(0.5)).toBe(FPV_CUBE_MIN_HEIGHT);
        expect(clampFpvCubeHeight(30)).toBe(FPV_CUBE_MAX_HEIGHT);
        expect(cube(FPV_CUBE_MAX_HEIGHT).userData.fpvCubeHeight).toBeCloseTo(FPV_CUBE_MAX_HEIGHT, 6);
    });

    it('stands on the ground and tops out at the requested height', () => {
        for (const height of [FPV_CUBE_MIN_HEIGHT, FPV_CUBE_MAX_HEIGHT]) {
            const box = new THREE.Box3().setFromObject(cube(height));
            expect(box.min.z).toBeGreaterThanOrEqual(-1e-6);
            expect(box.max.z).toBeCloseTo(height, 2);
            expect(box.max.x - box.min.x).toBeLessThan(FPV_CUBE_FRAME_SIZE * 1.2);
        }
    });

    describe('collisions (default height)', () => {
        const object = cube();
        const centre = fpvCubeFrameCentre(FPV_CUBE_DEFAULT_HEIGHT);
        const half = FPV_CUBE_FRAME_SIZE / 2;
        const bandMiddle = (FPV_CUBE_OPENING + FPV_CUBE_FRAME_SIZE) / 4;

        it('lets a drone fly through the middle of every opening', () => {
            for (const frame of FPV_CUBE_FRAMES) {
                const [x, y] = frame.normal === 'y' ? [0, frame.offset] : [frame.offset, 0];
                expect(hit(object, x, y, centre)).toBe(false);
            }
            expect(hit(object, 0, 0, centre)).toBe(false); // inside the cube
        });

        it('hits the border of a frame, beside, above and below the opening', () => {
            expect(hit(object, bandMiddle, half, centre)).toBe(true);
            expect(hit(object, 0, half, centre + bandMiddle)).toBe(true);
            expect(hit(object, 0, half, centre - bandMiddle)).toBe(true);
        });

        it('is clear anywhere away from the frames, and a close pass beside one is clear too', () => {
            expect(hit(object, 0, half + 2, centre)).toBe(false);
            expect(hit(object, 0, half + FPV_CUBE_FRAME_THICKNESS / 2 + DRONE_COLLISION_RADIUS + 0.03, centre)).toBe(false);
        });

        it('hits a leg of the stand, but not the space between the legs', () => {
            const legMiddle = (centre - half) / 2;
            expect(hit(object, FPV_CUBE_LEG_INSET, FPV_CUBE_LEG_INSET, legMiddle)).toBe(true);
            expect(hit(object, 0, 0, legMiddle)).toBe(false);
        });
    });
});
