const FOCUSABLE = 'button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary';

/**
 * Клавиатура окна параметров: Esc (шаг назад или закрытие), Ctrl+F (поиск в редакторе) и Tab, который не выпускает фокус
 * в приложение под окном. Окно модальное, поэтому без этого клавиатурный пользователь «проваливается» под него.
 */
export function installAutopilotKeyboard(overlay: HTMLElement, handlers: {
    isOpen: () => boolean;
    /** Возвращает false, если назад идти некуда (главный экран). */
    goBack: () => boolean;
    close: () => void;
    inEditor: () => boolean;
}) {
    document.addEventListener('keydown', (event) => {
        if (!handlers.isOpen()) return;
        if (event.key === 'Escape') {
            if (!handlers.goBack()) handlers.close();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && handlers.inEditor()) {
            event.preventDefault();
            (overlay.querySelector('#autopilot-search-input') as HTMLInputElement | null)?.focus();
            return;
        }
        if (event.key !== 'Tab') return;
        const items = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement as HTMLElement | null;
        if (!current || !overlay.contains(current)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && current === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && current === last) { event.preventDefault(); first.focus(); }
    });
}
