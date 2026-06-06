import { createScriptExecutionNoticeHarness } from './helpers/script-execution-notice-harness.js';

describe('lua script execution notice scenario validation', () => {
    let harness: Awaited<ReturnType<typeof createScriptExecutionNoticeHarness>>;

    beforeAll(async () => {
        harness = await createScriptExecutionNoticeHarness();
    });

    beforeEach(() => {
        harness.setShownNotice(null);
        harness.resetScriptExecutionNoticeState();
        (globalThis as any).window.showSimulationNotice = (payload: any) => {
            harness.setShownNotice(payload);
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

        harness.showScenarioValidationNotice('lua', code);

        expect(harness.getShownNotice()).toBeNull();
    });

    test('warns for immediate lua mission commands', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
ap.push(Ev.MCE_TAKEOFF)
ap.goToLocalPoint(1, 0, 1)
ap.push(Ev.MCE_LANDING)`;

        harness.showScenarioValidationNotice('lua', code);

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('В одном шаге запускаются несколько команд миссии');
    });

    test('does not warn for lua mission separated by sleep calls', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
sleep(1)
ap.push(Ev.MCE_TAKEOFF)
sleep(3)
ap.goToLocalPoint(1, 0, 1)
sleep(2)
ap.push(Ev.MCE_LANDING)`;

        harness.showScenarioValidationNotice('lua', code);

        expect(harness.getShownNotice()).toBeNull();
    });

    test('warns when Timer.callLater receives an expression result', () => {
        const code = `local function changeColor(col)
    return col
end

Timer.callLater(1, changeColor({0,1,0}))`;

        const result = harness.showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(false);
        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().level || '')).toBe('warn');
        expect(String(harness.getShownNotice().title || '')).toContain('Проверьте сценарий перед запуском');
        expect(String(harness.getShownNotice().message || '')).toContain('Найдена проблема в сценарии');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('выполняется сразу');
    });

    test('does not warn when Timer.callLater receives an anonymous callback function', () => {
        const code = `local function changeColor(col)
    return col
end

Timer.callLater(1, function()
    changeColor({0,1,0})
end)`;

        const result = harness.showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(false);
        expect(harness.getShownNotice()).toBeNull();
    });

    test('blocks lua script with while true without sleep', () => {
        const code = `local function changeColor(col)
    return col
end

while true do
    Timer.callLater(1, changeColor({0,1,0}))
    Timer.callLater(3, changeColor({1,0,0}))
end`;

        const result = harness.showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(true);
        expect(result.blockingIssues.length).toBeGreaterThan(0);
        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().level || '')).toBe('error');
        expect(String(harness.getShownNotice().title || '')).toContain('Запуск заблокирован');
        expect(String(harness.getShownNotice().message || '')).toContain('Найден опасный сценарий');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('while true do');
    });
});
