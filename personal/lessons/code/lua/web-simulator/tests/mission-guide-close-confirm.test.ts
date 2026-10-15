// @ts-expect-error В проекте нет пакета @types/jsdom, jsdom нужен только для DOM-тестов.
import { JSDOM } from 'jsdom';
import { CLOSE_CONFIRM_MARKUP, createCloseConfirm } from '../public/modules/ui/mission-guide/close-confirm.js';

function mount(busy: boolean) {
    const dom = new JSDOM(`<!doctype html><body><div id="mission-guide-overlay">
        <button id="mission-guide-close">x</button>${CLOSE_CONFIRM_MARKUP}
        <button id="lesson-button">lesson</button>
        <div id="mission-guide-modal-body" aria-busy="${busy}"></div></div></body>`);
    const document = dom.window.document;
    const overlay = document.getElementById('mission-guide-overlay') as HTMLElement;
    const stop = { calls: 0 };
    const body = document.getElementById('mission-guide-modal-body')!;
    const confirm = createCloseConfirm(overlay, { isBusy: () => body.getAttribute('aria-busy') === 'true', stop: () => { stop.calls++; } });
    return {
        document, overlay, stop, confirm, body,
        bar: document.getElementById('mission-guide-close-confirm') as HTMLElement,
        lesson: document.getElementById('lesson-button') as HTMLElement
    };
}

describe('Closing the textbook during a check', () => {
    test('an idle textbook closes at once and shows no question', () => {
        const { confirm, bar } = mount(false);
        expect(confirm.request()).toBe(false);
        expect(bar.hidden).toBe(true);
    });

    test('a running check shows the inline question and moves focus to the safe choice', () => {
        const { confirm, bar, document, lesson } = mount(true);
        lesson.focus();
        expect(confirm.request()).toBe(true);
        expect(bar.hidden).toBe(false);
        expect(bar.textContent).toContain('Проверка ещё идёт. Остановить её и закрыть учебник?');
        expect(bar.getAttribute('aria-labelledby')).toBe('mission-guide-close-confirm-text');
        expect(document.activeElement?.textContent).toBe('Продолжить проверку');
        expect(document.querySelector('[data-guide-close-continue]')?.className).toContain('btn-primary');
        expect(document.querySelector('[data-guide-close-stop]')?.className).toContain('btn-secondary');
    });

    test('«Продолжить проверку» (and Escape, which calls dismiss) hides the question and returns focus', () => {
        const { confirm, bar, document, lesson } = mount(true);
        lesson.focus();
        confirm.request();
        (document.querySelector('[data-guide-close-continue]') as HTMLElement).click();
        expect(bar.hidden).toBe(true);
        expect(confirm.isOpen()).toBe(false);
        expect(document.activeElement).toBe(lesson);
    });

    test('Escape path: dismiss() alone keeps the check running and focus where it was', () => {
        const { confirm, document, lesson, stop } = mount(true);
        lesson.focus();
        confirm.request();
        confirm.dismiss();
        expect(document.activeElement).toBe(lesson);
        expect(stop.calls).toBe(0);
    });

    test('«Остановить и закрыть» hands the decision to the caller exactly once', () => {
        const { confirm, document, stop } = mount(true);
        confirm.request();
        (document.querySelector('[data-guide-close-stop]') as HTMLElement).click();
        expect(stop.calls).toBe(1);
    });

    test('a second close request keeps the question open and focus on the safe choice', () => {
        const { confirm, document } = mount(true);
        confirm.request();
        (document.getElementById('mission-guide-close') as HTMLElement).focus();
        expect(confirm.request()).toBe(true);
        expect(document.activeElement?.textContent).toBe('Продолжить проверку');
    });

    test('a check that ends while the question is open makes the question disappear', async () => {
        const { confirm, bar, body } = mount(true);
        confirm.request();
        body.setAttribute('aria-busy', 'false');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(bar.hidden).toBe(true);
        expect(confirm.isOpen()).toBe(false);
    });

    test('reset hides the question without touching focus', () => {
        const { confirm, bar, document, lesson } = mount(true);
        lesson.focus();
        confirm.request();
        confirm.reset();
        expect(bar.hidden).toBe(true);
        expect(document.activeElement?.textContent).toBe('Продолжить проверку');
    });
});
