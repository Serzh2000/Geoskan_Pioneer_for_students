import { log } from '../shared/logging/logger.js';

export function registerGlobalErrorHandler(): void {
    window.onerror = function(message, source, lineno, colno, error) {
        const errorMsg = `[Global Error] ${message} at ${source}:${lineno}:${colno}`;
        console.error(errorMsg, error);
        log(errorMsg, 'error');
        (window as any).showSimulationNotice?.({
            title: 'Ошибка скрипта',
            message: String(message),
            detailsHtml: error?.stack ? `<div class="simulation-notice__code">${error.stack}</div>` : errorMsg,
            level: 'error'
        }, 'error');
        return false;
    };
}
