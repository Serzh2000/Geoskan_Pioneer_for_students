describe('lua mission validation', () => {
    let collectLuaIssues: typeof import('../public/modules/app/script-execution-notice/lua-validation.js').collectLuaIssues;

    beforeAll(async () => {
        ({ collectLuaIssues } = await import('../public/modules/app/script-execution-notice/lua-validation.js'));
    });

    test('does not warn about missing callback when mission commands use Timer.callLater', () => {
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
        expect(issues.some((issue) => issue.includes('только первую команду миссии'))).toBe(false);
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

    test('still warns for two startup timers with the same deadline', () => {
        const issues = collectLuaIssues(`
            ap.push(Ev.MCE_PREFLIGHT)
            Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)
            Timer.callLater(1.0, function() ap.push(Ev.MCE_LANDING) end)
        `);
        expect(issues.some(issue => issue.includes('ставит несколько команд одновременно'))).toBe(true);
    });

    test('does not mistake helper declarations or strings for commands at startup', () => {
        expect(collectLuaIssues(`
            local function arm() ap.push(Ev.MCE_PREFLIGHT) end
            function takeoff() ap.push(Ev.MCE_TAKEOFF) end
            function point() ap.goToLocalPoint(1, 0, 1) end
            function callback(event) end
            local text = "ap.push(Ev.MCE_LANDING) end function"
            -- ap.push(Ev.MCE_LANDING)
        `)).toEqual([]);
    });

    test('accepts the real callback route with timers registered after takeoff', () => {
        const issues = collectLuaIssues(`
            ap.push(Ev.MCE_PREFLIGHT)
            Timer.callLater(1, function() ap.push(Ev.MCE_TAKEOFF) end)
            function callback(event)
                if event == Ev.TAKEOFF_COMPLETE then
                    ap.goToLocalPoint(0, 0, 1)
                end
                Timer.callLater(20, function() ap.goToLocalPoint(1, 0, 1) end)
                Timer.callLater(30, function() ap.goToLocalPoint(1, 1, 1) end)
                Timer.callLater(40, function() ap.goToLocalPoint(0, 1, 1) end)
                Timer.callLater(50, function() ap.goToLocalPoint(0, 0, 1) end)
                Timer.callLater(90, function() ap.push(Ev.ENGINES_DISARM) end)
            end
        `);
        expect(issues).toEqual([]);
    });
});
