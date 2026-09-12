describe('lua api constants', () => {
    let getLuaMissingGlobalConstantError: typeof import('../public/modules/lua/api-constants.js').getLuaMissingGlobalConstantError;
    let looksLikeLuaApiConstant: typeof import('../public/modules/lua/api-constants.js').looksLikeLuaApiConstant;
    let humanizeLuaRuntimeMessage: typeof import('../public/modules/app/script-execution-notice/humanize-lua.js').humanizeLuaRuntimeMessage;

    beforeAll(async () => {
        ({ getLuaMissingGlobalConstantError, looksLikeLuaApiConstant } = await import('../public/modules/lua/api-constants.js'));
        ({ humanizeLuaRuntimeMessage } = await import('../public/modules/app/script-execution-notice/humanize-lua.js'));
    });

    test('detects missing Ev prefix for known autopilot constants', () => {
        expect(looksLikeLuaApiConstant('TAKEOFF_COMPLETE')).toBe(true);
        expect(getLuaMissingGlobalConstantError('TAKEOFF_COMPLETE')).toContain('Ev.TAKEOFF_COMPLETE');
    });

    test('reports unknown autopilot constants absent from api reference', () => {
        expect(looksLikeLuaApiConstant('TAKEOFF_FINISHED')).toBe(true);
        expect(getLuaMissingGlobalConstantError('TAKEOFF_FINISHED')).toContain('отсутствует в справочнике Lua API');
    });

    test('does not hijack unrelated missing globals', () => {
        expect(looksLikeLuaApiConstant('someVariable')).toBe(false);
        expect(getLuaMissingGlobalConstantError('someVariable')).toBeNull();
        expect(getLuaMissingGlobalConstantError('HELLO_WORLD')).toBeNull();
    });

    test('humanizes missing Ev prefix runtime errors', () => {
        const result = humanizeLuaRuntimeMessage('Константа `TAKEOFF_COMPLETE` должна использоваться с префиксом `Ev.`: `Ev.TAKEOFF_COMPLETE`.');
        expect(result?.summary).toContain('Ev.TAKEOFF_COMPLETE');
        expect(result?.details).toContain('Замените `TAKEOFF_COMPLETE`');
    });

    test('humanizes unknown api constant runtime errors', () => {
        const result = humanizeLuaRuntimeMessage('Событие или команда `TAKEOFF_FINISHED` отсутствует в справочнике Lua API. Проверьте название и используйте константы вида `Ev.NAME`.');
        expect(result?.summary).toContain('TAKEOFF_FINISHED');
        expect(result?.details).toContain('Ev.NAME');
    });
});
