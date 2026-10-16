import { expect, test } from '@jest/globals';
import { focusCourseContent, focusCourseOutline, setCourseOutlineOpen } from '../public/modules/ui/mission-guide/support/outline-navigation.js';

test('compact navigation exposes only the visible surface and desktop restores both surfaces', () => {
    const outline = { inert: false, attributes: new Map<string, string>(), setAttribute(name: string, value: string) { this.attributes.set(name, value); } };
    const content = { ...outline, attributes: new Map<string, string>() };
    const toggle = { ...outline, attributes: new Map<string, string>(), textContent: '' };
    const classes = new Set<string>();
    let focused = false;
    const body = { focus: () => { focused = true; } };
    const overlay = {
        classList: { toggle(name: string, on: boolean) { if (on) classes.add(name); else classes.delete(name); } },
        querySelector(selector: string) { return selector.includes('toggle') ? toggle : selector.includes('outline') ? outline : selector.includes('walkthrough') ? body : content; }
    } as unknown as HTMLElement;
    setCourseOutlineOpen(overlay, false, true);
    expect(outline.inert).toBe(true);
    expect(content.inert).toBe(false);
    setCourseOutlineOpen(overlay, true, true);
    expect(outline.inert).toBe(false);
    expect(content.inert).toBe(true);
    expect(toggle.attributes.get('aria-expanded')).toBe('true');
    setCourseOutlineOpen(overlay, false, true);
    focusCourseContent(overlay);
    expect(focused).toBe(true);
    expect(content.attributes.get('aria-hidden')).toBe('false');
    setCourseOutlineOpen(overlay, false, false);
    expect(outline.inert).toBe(false);
    expect(outline.attributes.get('aria-hidden')).toBe('false');
    expect(content.inert).toBe(false);
});

test('opening the outline focuses the current enabled lesson before an earlier lesson, with an enabled fallback', () => {
    let focused = '';
    const lessons = [
        { current: false, disabled: false, focus() { focused = 'lesson 1'; } },
        { current: true, disabled: false, focus() { focused = 'lesson 2'; } }
    ];
    const overlay = {
        querySelector(selector: string) {
            // Like querySelector, a selector list returns its first matching node
            // in document order; it does not prioritize the first selector.
            return lessons.find(lesson => !lesson.disabled && selector.split(',').some(part => !part.includes('aria-current') || lesson.current)) ?? null;
        }
    } as unknown as HTMLElement;
    focusCourseOutline(overlay);
    expect(focused).toBe('lesson 2');
    lessons[1].disabled = true;
    focusCourseOutline(overlay);
    expect(focused).toBe('lesson 1');
    lessons[0].disabled = true;
    expect(() => focusCourseOutline(overlay)).not.toThrow();
});
