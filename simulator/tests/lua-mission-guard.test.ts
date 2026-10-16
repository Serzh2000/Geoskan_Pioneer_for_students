describe('lua mission guard', () => {
    let allowLuaMissionCommand: typeof import('../public/modules/lua/mission-guard.js').allowLuaMissionCommand;
    let resetLuaMissionGuard: typeof import('../public/modules/lua/mission-guard.js').resetLuaMissionGuard;

    beforeAll(async () => {
        ({ allowLuaMissionCommand, resetLuaMissionGuard } = await import('../public/modules/lua/mission-guard.js'));
    });

    test('accepts timer-sequenced mission commands when callback(event) is absent', () => {
        const drone = {
            luaHasEventCallback: false,
            luaMissionCommandsAcceptedWithoutCallback: 0,
            luaMissingCallbackNoticeShown: false
        } as any;

        resetLuaMissionGuard(drone, 'ap.push(Ev.MCE_PREFLIGHT)');

        expect(allowLuaMissionCommand(drone)).toBe(true);
        expect(allowLuaMissionCommand(drone)).toBe(true);
        expect(drone.luaMissionCommandsAcceptedWithoutCallback).toBe(0);
    });

    test('does not limit mission commands when callback(event) exists', () => {
        const drone = {
            luaHasEventCallback: false,
            luaMissionCommandsAcceptedWithoutCallback: 0,
            luaMissingCallbackNoticeShown: false
        } as any;

        resetLuaMissionGuard(drone, `
            function callback(event)
            end
        `);

        expect(allowLuaMissionCommand(drone)).toBe(true);
        expect(allowLuaMissionCommand(drone)).toBe(true);
        expect(drone.luaMissionCommandsAcceptedWithoutCallback).toBe(0);
    });
});
