describe('flight tracing', () => {
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let resetState: typeof import('../public/modules/core/state.js').resetState;
    let pathPoints: typeof import('../public/modules/core/state.js').pathPoints;
    let updateTracePath: typeof import('../public/modules/physics/tracing.js').updateTracePath;
    let drone: ReturnType<typeof import('../public/modules/core/state.js').createDroneState>;

    beforeAll(async () => {
        ({ createDroneState, resetState, pathPoints } = await import('../public/modules/core/state.js'));
        ({ updateTracePath } = await import('../public/modules/physics/tracing.js'));
        drone = createDroneState('trace_test_drone', 'Trace Test Drone');
    });

    beforeEach(() => {
        resetState(drone.id);
        pathPoints[drone.id] = [];
    });

    test('collects trace points while drone is flying', () => {
        drone.pos = { x: 0, y: 0, z: 1 };

        updateTracePath(drone.id, drone, 0.05, true);
        drone.pos = { x: 1, y: 1, z: 1 };
        updateTracePath(drone.id, drone, 0.05, true);

        expect(pathPoints[drone.id].length).toBeGreaterThanOrEqual(2);
    });

    test('keeps trace on movement even if stale flying flag is false', () => {
        pathPoints[drone.id] = [{ x: 0, y: 0, z: 1 }];
        drone.pos = { x: 0.5, y: 0.5, z: 1 };

        updateTracePath(drone.id, drone, 0.05, false);

        expect(pathPoints[drone.id].length).toBe(2);
        expect(pathPoints[drone.id][1]).toEqual({ x: 0.5, y: 0.5, z: 1 });
    });
});
