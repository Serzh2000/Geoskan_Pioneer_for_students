import { drones, currentDroneId, resetState } from '../public/modules/core/state.js';

describe('Simulation State', () => {
    beforeEach(() => {
        resetState();
    });

    test('should have default values after reset', () => {
        expect(drones[currentDroneId].running).toBe(false);
        expect(drones[currentDroneId].status).toBe('IDLE');
        expect(drones[currentDroneId].pos).toEqual({ x: 0, y: 0, z: 0 });
        expect(drones[currentDroneId].orientation.yaw).toBe(0);
        expect(drones[currentDroneId].battery).toBe(100);
    });

    test('should update position', () => {
        drones[currentDroneId].pos.x = 10;
        drones[currentDroneId].pos.y = 20;
        drones[currentDroneId].pos.z = 5;
        expect(drones[currentDroneId].pos).toEqual({ x: 10, y: 20, z: 5 });
    });

    test('should update orientation', () => {
        drones[currentDroneId].orientation.yaw = Math.PI;
        expect(drones[currentDroneId].orientation.yaw).toBeCloseTo(Math.PI);
    });
});
