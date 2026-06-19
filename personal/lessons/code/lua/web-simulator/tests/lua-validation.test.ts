describe('lua mission validation', () => {
    let collectLuaIssues: typeof import('../public/modules/app/script-execution-notice/lua-validation.js').collectLuaIssues;

    beforeAll(async () => {
        ({ collectLuaIssues } = await import('../public/modules/app/script-execution-notice/lua-validation.js'));
    });

    test('warns that only the first mission command will run without callback(event)', () => {
        const code = `
            ap.push(Ev.MCE_PREFLIGHT)
            Timer.callLater(2, function()
                ap.push(Ev.MCE_TAKEOFF)
            end)
            Timer.callLater(7, function()
                ap.goToLocalPoint(1, 1, 1)
            end)
            Timer.callLater(15, function()
                ap.push(Ev.MCE_LANDING)
            end)
        `;

        const issues = collectLuaIssues(code);
        expect(issues.some((issue) => issue.includes('только первую команду миссии'))).toBe(true);
    });

    test('does not warn about missing callback(event) when callback exists explicitly', () => {
        const code = `
            function callback(event)
                if event == Ev.MCE_PREFLIGHT then
                    Timer.callLater(2, function()
                        ap.push(Ev.MCE_TAKEOFF)
                    end)
                end
            end
        `;

        const issues = collectLuaIssues(code);
        expect(issues.some((issue) => issue.includes('только первую команду миссии'))).toBe(false);
    });
});
