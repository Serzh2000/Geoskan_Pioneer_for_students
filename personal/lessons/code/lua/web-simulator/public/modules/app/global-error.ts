import { log } from '../shared/logging/logger.js';

// Browser-level notices, not failures: "ResizeObserver loop ..." only means
// a resize callback's layout change is deferred to the next frame. Nothing
// breaks, but it used to fill the student-facing terminal with red errors.
const BENIGN_ERROR_PATTERNS = [/^ResizeObserver loop/];

export function registerGlobalErrorHandler(): void {
    window.onerror = function(message, source, lineno, colno, error) {
        if (typeof message === 'string' && BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
            return true;
        }
        const errorMsg = `[Global Error] ${message} at ${source}:${lineno}:${colno}`;
        console.error(errorMsg, error);
        log(errorMsg, 'error');
        return false;
    };
}
