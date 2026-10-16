import { bodyPlanarToWorld, worldPlanarToBody } from '../public/modules/physics/frames.js';

describe('physics frame transforms', () => {
    test('maps forward command to current nose direction after 180 degree yaw', () => {
        const worldVector = bodyPlanarToWorld(0, 3, Math.PI);

        expect(worldVector.x).toBeCloseTo(0, 6);
        expect(worldVector.y).toBeCloseTo(3, 6);
    });

    test('keeps right axis tied to drone body after 90 degree yaw', () => {
        const worldVector = bodyPlanarToWorld(2, 0, Math.PI / 2);

        expect(worldVector.x).toBeCloseTo(0, 6);
        expect(worldVector.y).toBeCloseTo(2, 6);
    });

    test('round-trips between body and world frames', () => {
        const yaw = -Math.PI / 3;
        const local = { right: 1.75, forward: 2.5 };
        const world = bodyPlanarToWorld(local.right, local.forward, yaw);
        const restored = worldPlanarToBody(world.x, world.y, yaw);

        expect(restored.right).toBeCloseTo(local.right, 6);
        expect(restored.forward).toBeCloseTo(local.forward, 6);
    });
});
