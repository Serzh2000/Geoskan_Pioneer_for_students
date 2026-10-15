import { createScriptExecutionNoticeHarness } from './helpers/script-execution-notice-harness.js';

describe('lua script execution notice failure rendering', () => {
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

    test('shows syntax notice with line number', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError('syntax', "unexpected symbol near ')'", {
            line: 4
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().title || '')).toContain('Непонятный символ в строке');
        expect(String(harness.getShownNotice().message || '')).toContain('Lua не понял');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Место ошибки: строка 4.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Техническая деталь: unexpected symbol near');
    });

    test('humanizes lua missing closing parenthesis before end', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError('syntax', "[string \"...\"]:13: ')' expected (to close '(' at line 12) near 'end'", {
            line: 13
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('вместо функции передан её вызов');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Timer.callLater');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('blinkGreen');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('лишний <code>end</code>');
    });

    test('humanizes lua broken identifier near or', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError('syntax', "unexpected symbol near 'or'", {
            line: 7
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('попало внутрь имени');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('changeCol or');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('changeColor');
    });

    test('shows runtime notice separately from syntax notice', () => {
        harness.showScriptFailureNotice('python', harness.createScriptFailureError('runtime', 'division by zero'));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().title || '')).toContain('Деление на ноль');
        expect(String(harness.getShownNotice().message || '')).toContain('делится на ноль');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Техническая деталь: division by zero');
    });

    test('humanizes common python syntax errors', () => {
        harness.showScriptFailureNotice('python', harness.createScriptFailureError('syntax', "expected ':'", {
            line: 3,
            column: 12
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('нужно двоеточие');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Место ошибки: строка 3, колонка 12.');
    });

    test('humanizes lua fsm preflight conflict with actionable guidance', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError(
            'runtime',
            'FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT'
        ));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('отправлена второй раз');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('дождитесь события ENGINES_STARTED');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Техническая деталь: FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT');
    });

    test('filters meaningless numeric runtime details', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError(
            'runtime',
            'attempt to call a nil value',
            {
                details: '1\n1\n1'
            }
        ));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('вызывается то, чего нет');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Техническая деталь: 1');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('<div>1</div>');
    });

    test('renders runtime context, fsm history and stack trace sections', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError(
            'runtime',
            'FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT',
            {
                phase: 'callback(event=11)',
                contextLines: [
                    'Последний вызов API: ap.push(event=1) из [string "..."]:6; FSM=PREFLIGHT; source=direct; t=0.500s.'
                ],
                fsmHistory: [
                    't=0.000s: IDLE -> PREFLIGHT (setDroneFsmState(PREFLIGHT); source=direct)'
                ],
                stack: 'stack traceback:\n\t[string "..."]:6: in function <[string "..."]:4>'
            }
        ));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Фаза выполнения: callback(event=11)');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Контекст выполнения');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('История FSM');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Стек вызовов');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('IDLE -&gt; PREFLIGHT');
    });

    test.each(['1', 'Unknown Lua Error (no message)', 'Empty Lua Error message'])('replaces opaque runtime error %s with stored failure hint', (rawError) => {
        const drone = harness.createDroneState('notice_numeric_error', 'Notice Numeric Error');
        harness.rememberLuaFailureHint(
            drone,
            'Команды миссии запущены одновременно без паузы: PREFLIGHT, PREFLIGHT.',
            ['Разнесите эти команды по этапам через `Timer.callLater(...)`, `sleep(...)` или `callback(event)`.']
        );
        harness.recordLuaApiCall(drone, 'ap.push', '[string "..."]:4 [push]', 'event=1');
        harness.recordLuaApiCall(drone, 'Timer.callLater', '[string "..."]:8 [callLater]', '0.5, function: 0x59');
        harness.recordLuaApiCall(drone, 'ap.push', '[string "..."]:9 [push]', 'event=1');
        drone.luaDiagnostics.currentPhase = 'main chunk';
        drone.luaDiagnostics.lastErrorStack = rawError;
        drone.luaDiagnostics.fsmTransitions.push({
            timeMs: 0,
            from: 'IDLE',
            to: 'IDLE',
            reason: 'simultaneous mission commands',
            source: 'system'
        });

        const error = harness.createLuaRuntimeFailureError(drone, 'main chunk', rawError);
        harness.showScriptFailureNotice('lua', error);

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('отправлен два раза подряд');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('<div class="is-critical">1</div>');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('&lt;div');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Стек вызовов');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Unknown Lua Error');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Empty Lua Error');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Ev.ENGINES_STARTED');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Техническая деталь:');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('[DEBUG] ap.push');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Предыдущий вызов API:');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Сначала: Отправлена команда Ev.MCE_PREFLIGHT.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Потом: Запланирован Timer.callLater(0.5s, ...), но его callback еще не успел выполниться.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Затем: Повторно отправлена команда Ev.MCE_PREFLIGHT без ожидания следующего этапа.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('состояние осталось IDLE');
    });

    test('suppresses runtime notice when simultaneous command warning was already shown before launch', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(0.5, function()
    ap.push(Ev.MCE_TAKEOFF)
end)
Timer.callLater(0.5, function()
    ap.push(Ev.MCE_TAKEOFF)
end)`;

        harness.showScenarioValidationNotice('lua', code);
        const firstNotice = harness.getShownNotice();

        expect(firstNotice).not.toBeNull();
        expect(String(firstNotice.message || '')).toContain('ставит несколько команд одновременно');

        harness.showScriptFailureNotice('lua', harness.createScriptFailureError(
            'runtime',
            'Команды миссии запущены одновременно без паузы: TAKEOFF, TAKEOFF.'
        ));

        expect(harness.getShownNotice()).toBe(firstNotice);
        expect(String(harness.getShownNotice().title || '')).toContain('Проверьте программу');
    });

    test('does not show a missing callback warning for a timer-based mission', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
Timer.callLater(2, function()
    ap.push(Ev.MCE_TAKEOFF)
end)
Timer.callLater(7, function()
    ap.goToLocalPoint(1, 1, 1)
end)`;

        harness.showScenarioValidationNotice('lua', code);
        const firstNotice = harness.getShownNotice();

        expect(firstNotice).toBeNull();
    });
});
