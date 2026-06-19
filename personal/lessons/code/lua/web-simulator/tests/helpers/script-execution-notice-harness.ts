/**
 * Общая harness-инициализация для тестов уведомлений о выполнении скриптов.
 * Скрывает настройку window/document и ленивые импорты тестируемых модулей.
 */
export type ScriptExecutionNoticeHarness = {
    getShownNotice: () => any;
    setShownNotice: (value: any) => void;
    createScriptFailureError: typeof import('../../public/modules/app/script-execution-notice.js').createScriptFailureError;
    createDroneState: typeof import('../../public/modules/core/state.js').createDroneState;
    createLuaRuntimeFailureError: typeof import('../../public/modules/lua/diagnostics.js').createLuaRuntimeFailureError;
    rememberLuaFailureHint: typeof import('../../public/modules/lua/diagnostics.js').rememberLuaFailureHint;
    recordLuaApiCall: typeof import('../../public/modules/lua/diagnostics.js').recordLuaApiCall;
    showScenarioValidationNotice: typeof import('../../public/modules/app/script-execution-notice.js').showScenarioValidationNotice;
    showMissingCallbackMissionNotice: typeof import('../../public/modules/app/script-execution-notice.js').showMissingCallbackMissionNotice;
    showScriptFailureNotice: typeof import('../../public/modules/app/script-execution-notice.js').showScriptFailureNotice;
    resetScriptExecutionNoticeState: typeof import('../../public/modules/app/script-execution-notice.js').resetScriptExecutionNoticeState;
};

export async function createScriptExecutionNoticeHarness(): Promise<ScriptExecutionNoticeHarness> {
    let shownNotice: any = null;
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
        setTimeout: (cb: () => void) => {
            cb();
            return 0;
        },
        clearTimeout: () => {},
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

    await import('../../public/modules/shared/logging/logger.js');
    const noticeModule = await import('../../public/modules/app/script-execution-notice.js');
    const stateModule = await import('../../public/modules/core/state.js');
    const diagnosticsModule = await import('../../public/modules/lua/diagnostics.js');

    return {
        getShownNotice: () => shownNotice,
        setShownNotice: (value: any) => {
            shownNotice = value;
        },
        createScriptFailureError: noticeModule.createScriptFailureError,
        createDroneState: stateModule.createDroneState,
        createLuaRuntimeFailureError: diagnosticsModule.createLuaRuntimeFailureError,
        rememberLuaFailureHint: diagnosticsModule.rememberLuaFailureHint,
        recordLuaApiCall: diagnosticsModule.recordLuaApiCall,
        showScenarioValidationNotice: noticeModule.showScenarioValidationNotice,
        showMissingCallbackMissionNotice: noticeModule.showMissingCallbackMissionNotice,
        showScriptFailureNotice: noticeModule.showScriptFailureNotice,
        resetScriptExecutionNoticeState: noticeModule.resetScriptExecutionNoticeState
    };
}
