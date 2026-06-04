describe('lua script execution notice', () => {
    let createScriptFailureError: typeof import('../public/modules/app/script-execution-notice.js').createScriptFailureError;
    let createDroneState: typeof import('../public/modules/core/state.js').createDroneState;
    let createLuaRuntimeFailureError: typeof import('../public/modules/lua/diagnostics.js').createLuaRuntimeFailureError;
    let rememberLuaFailureHint: typeof import('../public/modules/lua/diagnostics.js').rememberLuaFailureHint;
    let recordLuaApiCall: typeof import('../public/modules/lua/diagnostics.js').recordLuaApiCall;
    let showScenarioValidationNotice: typeof import('../public/modules/app/script-execution-notice.js').showScenarioValidationNotice;
    let showScriptFailureNotice: typeof import('../public/modules/app/script-execution-notice.js').showScriptFailureNotice;
    let resetScriptExecutionNoticeState: typeof import('../public/modules/app/script-execution-notice.js').resetScriptExecutionNoticeState;
    let shownNotice: any = null;

    beforeAll(async () => {
        const logsEl = {
            appendChild: () => {},
            querySelector: () => null,
            replaceChildren: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };
        const fragment = {
            appendChild: () => {}
        };

        (globalThis as any).window = {
            showSimulationNotice: (payload: any) => {
                shownNotice = payload;
            }
        };
        (globalThis as any).document = {
            getElementById: (id: string) => (id === 'logs' ? logsEl : null),
            createDocumentFragment: () => fragment,
            createElement: () => ({
                className: '',
                dataset: {},
                textContent: '',
                append: () => {},
                remove: () => {}
            })
        };

        await import('../public/modules/shared/logging/logger.js');
        ({
            createScriptFailureError,
            showScenarioValidationNotice,
            showScriptFailureNotice,
            resetScriptExecutionNoticeState
        } = await import('../public/modules/app/script-execution-notice.js'));
        ({ createDroneState } = await import('../public/modules/core/state.js'));
        ({
            createLuaRuntimeFailureError,
            rememberLuaFailureHint,
            recordLuaApiCall
        } = await import('../public/modules/lua/diagnostics.js'));
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
        expect(String(shownNotice.detailsHtml || '')).toContain('В одном шаге запускаются несколько команд миссии');
    });

    test('does not warn for lua mission separated by sleep calls', () => {
        const code = `ap.push(Ev.MCE_PREFLIGHT)
sleep(1)
ap.push(Ev.MCE_TAKEOFF)
sleep(3)
ap.goToLocalPoint(1, 0, 1)
sleep(2)
ap.push(Ev.MCE_LANDING)`;

        showScenarioValidationNotice('lua', code);

        expect(shownNotice).toBeNull();
    });

    test('warns when Timer.callLater receives an expression result', () => {
        const code = `local function changeColor(col)
    return col
end

Timer.callLater(1, changeColor({0,1,0}))`;

        const result = showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(false);
        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.level || '')).toBe('warn');
        expect(String(shownNotice.title || '')).toContain('Проверьте сценарий перед запуском');
        expect(String(shownNotice.message || '')).toContain('Найдена проблема в сценарии');
        expect(String(shownNotice.detailsHtml || '')).toContain('выполняется сразу');
    });

    test('does not warn when Timer.callLater receives an anonymous callback function', () => {
        const code = `local function changeColor(col)
    return col
end

Timer.callLater(1, function()
    changeColor({0,1,0})
end)`;

        const result = showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(false);
        expect(shownNotice).toBeNull();
    });

    test('blocks lua script with while true without sleep', () => {
        const code = `local function changeColor(col)
    return col
end

while true do
    Timer.callLater(1, changeColor({0,1,0}))
    Timer.callLater(3, changeColor({1,0,0}))
end`;

        const result = showScenarioValidationNotice('lua', code);

        expect(result.shouldBlock).toBe(true);
        expect(result.blockingIssues.length).toBeGreaterThan(0);
        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.level || '')).toBe('error');
        expect(String(shownNotice.title || '')).toContain('Запуск заблокирован');
        expect(String(shownNotice.message || '')).toContain('Найден опасный сценарий');
        expect(String(shownNotice.detailsHtml || '')).toContain('while true do');
    });

    test('shows syntax notice with line number', () => {
        showScriptFailureNotice('lua', createScriptFailureError('syntax', "unexpected symbol near ')'", {
            line: 4
        }));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.title || '')).toContain('Синтаксическая ошибка');
        expect(String(shownNotice.message || '')).toContain('лишний или недопустимый символ');
        expect(String(shownNotice.detailsHtml || '')).toContain('Место ошибки: строка 4.');
        expect(String(shownNotice.detailsHtml || '')).toContain("Техническая деталь: unexpected symbol near");
    });

    test('humanizes lua missing closing parenthesis before end', () => {
        showScriptFailureNotice('lua', createScriptFailureError('syntax', "[string \"...\"]:13: ')' expected (to close '(' at line 12) near 'end'", {
            line: 13
        }));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('передан вызов уже существующей функции');
        expect(String(shownNotice.detailsHtml || '')).toContain('Timer.callLater');
        expect(String(shownNotice.detailsHtml || '')).toContain('blinkGreen');
        expect(String(shownNotice.detailsHtml || '')).toContain('лишний `end`');
    });

    test('humanizes lua broken identifier near or', () => {
        showScriptFailureNotice('lua', createScriptFailureError('syntax', "unexpected symbol near 'or'", {
            line: 7
        }));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('разорвано пробелом');
        expect(String(shownNotice.detailsHtml || '')).toContain('changeCol or');
        expect(String(shownNotice.detailsHtml || '')).toContain('changeColor');
    });

    test('shows runtime notice separately from syntax notice', () => {
        showScriptFailureNotice('python', createScriptFailureError('runtime', 'division by zero'));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.title || '')).toContain('Ошибка выполнения');
        expect(String(shownNotice.message || '')).toContain('деление на ноль');
        expect(String(shownNotice.detailsHtml || '')).toContain('Техническая деталь: division by zero');
    });

    test('humanizes common python syntax errors', () => {
        showScriptFailureNotice('python', createScriptFailureError('syntax', "expected ':'", {
            line: 3,
            column: 12
        }));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('требуется двоеточие');
        expect(String(shownNotice.detailsHtml || '')).toContain('Место ошибки: строка 3, колонка 12.');
    });

    test('humanizes lua fsm preflight conflict with actionable guidance', () => {
        showScriptFailureNotice('lua', createScriptFailureError(
            'runtime',
            'FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT'
        ));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('Повторный `Ev.MCE_PREFLIGHT`');
        expect(String(shownNotice.detailsHtml || '')).toContain('дождитесь события `Ev.ENGINES_STARTED`');
        expect(String(shownNotice.detailsHtml || '')).toContain('Техническая деталь: FSM error: invalid transition from PREFLIGHT by command MCE_PREFLIGHT');
    });

    test('filters meaningless numeric runtime details', () => {
        showScriptFailureNotice('lua', createScriptFailureError(
            'runtime',
            'attempt to call a nil value',
            {
                details: '1\n1\n1'
            }
        ));

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('не существует');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('Техническая деталь: 1');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('<div>1</div>');
    });

    test('renders runtime context, fsm history and stack trace sections', () => {
        showScriptFailureNotice('lua', createScriptFailureError(
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

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.detailsHtml || '')).toContain('Фаза выполнения: callback(event=11)');
        expect(String(shownNotice.detailsHtml || '')).toContain('Контекст выполнения');
        expect(String(shownNotice.detailsHtml || '')).toContain('История FSM');
        expect(String(shownNotice.detailsHtml || '')).toContain('Стек вызовов');
        expect(String(shownNotice.detailsHtml || '')).toContain('IDLE -&gt; PREFLIGHT');
    });

    test('replaces opaque numeric runtime error with stored failure hint', () => {
        const drone = createDroneState('notice_numeric_error', 'Notice Numeric Error');
        rememberLuaFailureHint(
            drone,
            'Команды миссии запущены одновременно без паузы: PREFLIGHT, PREFLIGHT.',
            ['Разнесите эти команды по этапам через `Timer.callLater(...)`, `sleep(...)` или `callback(event)`.']
        );
        recordLuaApiCall(drone, 'ap.push', '[string "..."]:4 [push]', 'event=1');
        recordLuaApiCall(drone, 'Timer.callLater', '[string "..."]:8 [callLater]', '0.5, function: 0x59');
        recordLuaApiCall(drone, 'ap.push', '[string "..."]:9 [push]', 'event=1');
        drone.luaDiagnostics.currentPhase = 'main chunk';
        drone.luaDiagnostics.lastErrorStack = '1';
        drone.luaDiagnostics.fsmTransitions.push({
            timeMs: 0,
            from: 'IDLE',
            to: 'IDLE',
            reason: 'simultaneous mission commands',
            source: 'system'
        });

        const error = createLuaRuntimeFailureError(drone, 'main chunk', '1');
        showScriptFailureNotice('lua', error);

        expect(shownNotice).not.toBeNull();
        expect(String(shownNotice.message || '')).toContain('Предполетная подготовка запущена повторно');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('<div class="is-critical">1</div>');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('&lt;div');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('Стек вызовов');
        expect(String(shownNotice.detailsHtml || '')).toContain('Ev.ENGINES_STARTED');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('Техническая деталь:');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('[DEBUG] ap.push');
        expect(String(shownNotice.detailsHtml || '')).not.toContain('Предыдущий вызов API:');
        expect(String(shownNotice.detailsHtml || '')).toContain('Сначала: Отправлена команда Ev.MCE_PREFLIGHT.');
        expect(String(shownNotice.detailsHtml || '')).toContain('Потом: Запланирован Timer.callLater(0.5s, ...), но его callback еще не успел выполниться.');
        expect(String(shownNotice.detailsHtml || '')).toContain('Затем: Повторно отправлена команда Ev.MCE_PREFLIGHT без ожидания следующего этапа.');
        expect(String(shownNotice.detailsHtml || '')).toContain('состояние осталось IDLE');
    });
});
