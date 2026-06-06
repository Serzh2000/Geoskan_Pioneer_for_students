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
        expect(String(harness.getShownNotice().title || '')).toContain('Синтаксическая ошибка');
        expect(String(harness.getShownNotice().message || '')).toContain('лишний или недопустимый символ');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Место ошибки: строка 4.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Техническая деталь: unexpected symbol near');
    });

    test('humanizes lua missing closing parenthesis before end', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError('syntax', "[string \"...\"]:13: ')' expected (to close '(' at line 12) near 'end'", {
            line: 13
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('передан вызов уже существующей функции');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Timer.callLater');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('blinkGreen');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('лишний `end`');
    });

    test('humanizes lua broken identifier near or', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError('syntax', "unexpected symbol near 'or'", {
            line: 7
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('разорвано пробелом');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('changeCol or');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('changeColor');
    });

    test('shows runtime notice separately from syntax notice', () => {
        harness.showScriptFailureNotice('python', harness.createScriptFailureError('runtime', 'division by zero'));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().title || '')).toContain('Ошибка выполнения');
        expect(String(harness.getShownNotice().message || '')).toContain('деление на ноль');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Техническая деталь: division by zero');
    });

    test('humanizes common python syntax errors', () => {
        harness.showScriptFailureNotice('python', harness.createScriptFailureError('syntax', "expected ':'", {
            line: 3,
            column: 12
        }));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('требуется двоеточие');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Место ошибки: строка 3, колонка 12.');
    });

    test('humanizes lua fsm preflight conflict with actionable guidance', () => {
        harness.showScriptFailureNotice('lua', harness.createScriptFailureError(
            'runtime',
            'FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT'
        ));

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('Повторный `Ev.MCE_PREFLIGHT`');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('дождитесь события `Ev.ENGINES_STARTED`');
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
        expect(String(harness.getShownNotice().message || '')).toContain('не существует');
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

    test('replaces opaque numeric runtime error with stored failure hint', () => {
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
        drone.luaDiagnostics.lastErrorStack = '1';
        drone.luaDiagnostics.fsmTransitions.push({
            timeMs: 0,
            from: 'IDLE',
            to: 'IDLE',
            reason: 'simultaneous mission commands',
            source: 'system'
        });

        const error = harness.createLuaRuntimeFailureError(drone, 'main chunk', '1');
        harness.showScriptFailureNotice('lua', error);

        expect(harness.getShownNotice()).not.toBeNull();
        expect(String(harness.getShownNotice().message || '')).toContain('Предполетная подготовка запущена повторно');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('<div class="is-critical">1</div>');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('&lt;div');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Стек вызовов');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Ev.ENGINES_STARTED');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Техническая деталь:');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('[DEBUG] ap.push');
        expect(String(harness.getShownNotice().detailsHtml || '')).not.toContain('Предыдущий вызов API:');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Сначала: Отправлена команда Ev.MCE_PREFLIGHT.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Потом: Запланирован Timer.callLater(0.5s, ...), но его callback еще не успел выполниться.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('Затем: Повторно отправлена команда Ev.MCE_PREFLIGHT без ожидания следующего этапа.');
        expect(String(harness.getShownNotice().detailsHtml || '')).toContain('состояние осталось IDLE');
    });
});
