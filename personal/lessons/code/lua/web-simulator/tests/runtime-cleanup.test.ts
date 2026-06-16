describe('runtime cleanup', () => {
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let drones: typeof import('../public/modules/core/state.js').drones;
    let pathPoints: typeof import('../public/modules/core/state.js').pathPoints;
    let removeDroneState: typeof import('../public/modules/core/state.js').removeDroneState;
    let cancelledRuns: typeof import('../public/modules/python/runtime-shared.js').cancelledRuns;
    let localOriginByDrone: typeof import('../public/modules/python/runtime-shared.js').localOriginByDrone;
    let lastManualSpeedUpdateMs: typeof import('../public/modules/python/runtime-shared.js').lastManualSpeedUpdateMs;
    let cleanupPythonRuntimeState: typeof import('../public/modules/python/runtime-shared.js').cleanupPythonRuntimeState;

    beforeAll(async () => {
        ({ createDroneState, drones, pathPoints, removeDroneState } = await import('../public/modules/core/state.js'));
        ({
            cancelledRuns,
            localOriginByDrone,
            lastManualSpeedUpdateMs,
            cleanupPythonRuntimeState
        } = await import('../public/modules/python/runtime-shared.js'));
    });

    test('removes drone trace storage together with drone state', () => {
        const drone = createDroneState('cleanup_test_drone', 'Cleanup Test Drone');
        pathPoints[drone.id] = [{ x: 1, y: 2, z: 3 }];

        removeDroneState(drone.id);

        expect(drones[drone.id]).toBeUndefined();
        expect(pathPoints[drone.id]).toBeUndefined();
    });

    test('cleans python runtime dictionaries for removed drone ids', () => {
        const droneId = 'cleanup_python_drone';
        cancelledRuns[droneId] = true;
        localOriginByDrone[droneId] = { x: 4, y: 5, z: 6 };
        lastManualSpeedUpdateMs[droneId] = 12345;

        cleanupPythonRuntimeState(droneId);

        expect(cancelledRuns[droneId]).toBeUndefined();
        expect(localOriginByDrone[droneId]).toBeUndefined();
        expect(lastManualSpeedUpdateMs[droneId]).toBeUndefined();
    });
});
