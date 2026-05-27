describe('lua script execution notice', () => {
    let showScenarioValidationNotice: typeof import('../public/modules/app/script-execution-notice.js').showScenarioValidationNotice;
    let resetScriptExecutionNoticeState: typeof import('../public/modules/app/script-execution-notice.js').resetScriptExecutionNoticeState;
    let shownNotice: any = null;

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            querySelector: () => null,
            scrollTop: 0,
            scrollHeight: 0
        };

        (globalThis as any).window = {
            showSimulationNotice: (payload: any) => {
                shownNotice = payload;
            }
        };
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createElement: () => ({
                className: '',
                textContent: '',
                append: () => {},
                remove: () => {}
            })
        };

        await import('../public/modules/shared/logging/logger.js');
        ({ showScenarioValidationNotice, resetScriptExecutionNoticeState } = await import('../public/modules/app/script-execution-notice.js'));
    });

    beforeEach(() => {
        shownNotice = null;
        resetScriptExecutionNoticeState();
        (globalThis as any).window.showSimulationNotice = (payload: any) => {
            shownNotice = payload;
        };
    });

    test('does not warn for event-driven lua mission', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)

function callback(event)
    if event == Ev.ENGINES_STARTED then
        ap.push(Ev.MCE_TAKEOFF)
    end
    if event == Ev.TAKEOFF_COMPLETE then
        ap.goToLocalPoint(1, 0, 1)
    end
    if event == Ev.POINT_REACHED then
        ap.push(Ev.MCE_LANDING)
    end
end`;

        showScenarioValidationNotice('lua', code);

        expect(shownNotice).toBeNull();
    });

    test('warns for immediate lua mission commands', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
ap.push(Ev.MCE_TAKEOFF)
ap.goToLocalPoint(1, 0, 1)
ap.push(Ev.MCE_LANDING)`;

        showScenarioValidationNotice('lua', code);

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.detailsHtml || '')).toContain('Ќесколько управл€ющих команд запускаютс€ сразу');
    });
});
