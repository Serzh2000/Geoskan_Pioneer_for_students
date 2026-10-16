import { simulateDetachedCargoStep } from '../public/modules/physics/cargo-contact.js';
import {
    DEFAULT_CARGO_PHYSICS_MATERIAL,
    GROUND_PHYSICS_MATERIAL
} from '../public/modules/physics/materials.js';

function runUntilGroundContact(initialVelocity: { x: number; y: number; z: number }, cargoMassKg: number) {
    let state = {
        position: { x: 0, y: 0, z: 1.2 },
        velocity: initialVelocity
    };

    for (let i = 0; i < 300; i++) {
        const next = simulateDetachedCargoStep({
            position: state.position,
            velocity: state.velocity,
            dt: 1 / 60,
            airDrag: 0.2,
            cargoMassKg,
            cargoMaterial: DEFAULT_CARGO_PHYSICS_MATERIAL,
            groundMaterial: GROUND_PHYSICS_MATERIAL
        });
        state = {
            position: next.position,
            velocity: next.velocity
        };
        if (next.touchedGround) {
            return next;
        }
    }

    throw new Error('Cargo did not reach the ground within the expected time');
}

describe('Cargo ground contact', () => {
    test.each([0.25, 0.35, 0.75, 1.5])(
        'stops horizontal sliding on impact for cargo mass %s kg',
        (cargoMassKg) => {
            const contact = runUntilGroundContact({ x: 1.6, y: 0.6, z: 0 }, cargoMassKg);

            expect(contact.position.z).toBe(0);
            expect(Math.hypot(contact.velocity.x, contact.velocity.y)).toBeLessThan(0.02);
            expect(Math.abs(contact.velocity.z)).toBeLessThanOrEqual(0.15);
        }
    );

    test.each([
        { x: 1.2, y: 0.2, z: -0.2 },
        { x: 1.8, y: 0.4, z: -1.2 },
        { x: 0.9, y: 0.9, z: -2.2 }
    ])('keeps cargo from sliding after shallow or angled drop %#', (velocity) => {
        const contact = runUntilGroundContact(velocity, 0.35);

        expect(contact.stoppedByStaticFriction).toBe(true);
        expect(Math.hypot(contact.velocity.x, contact.velocity.y)).toBeLessThan(0.02);
    });
});
