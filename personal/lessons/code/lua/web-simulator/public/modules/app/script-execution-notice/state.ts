/**
 * Хранит короткоживущее состояние подавления повторяющихся UI-предупреждений.
 * Изолирует доступ к глобальному window-хранилищу.
 */
import type { NoticeSuppressionState } from './types.js';

function getNoticeSuppressionState(): NoticeSuppressionState {
    const state = (window as any).__simulationNoticeSuppression;
    if (state && typeof state === 'object') {
        return state as NoticeSuppressionState;
    }

    const nextState: NoticeSuppressionState = {
        simultaneousCommands: false,
        earlyRoute: false
    };
    (window as any).__simulationNoticeSuppression = nextState;
    return nextState;
}

export function resetScriptExecutionNoticeState() {
    delete (window as any).__simulationNoticeSuppression;
}

export function markSimultaneousNoticeAsShown() {
    getNoticeSuppressionState().simultaneousCommands = true;
}

export function shouldSuppressSimultaneousNotice() {
    return getNoticeSuppressionState().simultaneousCommands;
}

export function markEarlyRouteNoticeAsShown() {
    getNoticeSuppressionState().earlyRoute = true;
}

export function shouldSuppressEarlyRouteNotice() {
    return getNoticeSuppressionState().earlyRoute;
}
