// @ts-expect-error This repository uses jsdom without its optional type declarations.
import { JSDOM } from 'jsdom';
import { migrateLessonLedValues } from '../public/modules/editor/blockly/legacy-values.js';
import { buildTargetWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace-xml.js';
import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { evaluateLesson } from '../public/modules/ui/mission-guide/evaluation/index.js';
import { getFieldValue } from '../public/modules/ui/mission-guide/evaluation/xml.js';

test('legacy LED solutions survive current Blockly value inputs and are still graded by their actual numbers', () => {
    const window = new JSDOM('').window;
    const original = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
    Object.defineProperty(globalThis, 'DOMParser', { configurable: true, value: window.DOMParser });
    try {
        for (const lesson of getLuaLessonState().lessons.slice(0, 2)) {
            const doc = new window.DOMParser().parseFromString(buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds), 'text/xml');
            migrateLessonLedValues(doc.documentElement);
            const xml = new window.XMLSerializer().serializeToString(doc.documentElement);
            expect(xml).toContain('<value name="COUNT"><shadow type="math_number"><field name="NUM">29');
            expect(evaluateLesson(lesson, lesson.targetBlockIds, xml).solved).toBe(true);
            const number = doc.querySelector('value[name="R"] field[name="NUM"]');
            number.textContent = '0.5';
            expect(evaluateLesson(lesson, lesson.targetBlockIds, new window.XMLSerializer().serializeToString(doc.documentElement)).solved).toBe(false);
        }
        const doc = new window.DOMParser().parseFromString('<xml><block type="lua_led_set"><value name="R"><shadow type="math_number"><field name="NUM">1</field></shadow><block type="math_number"><field name="NUM">0</field></block></value></block></xml>', 'text/xml');
        expect(getFieldValue(doc.querySelector('block'), 'R')).toBe('0');
    } finally {
        if (original) Object.defineProperty(globalThis, 'DOMParser', original);
        else Reflect.deleteProperty(globalThis, 'DOMParser');
        window.close();
    }
});

test('a ledbar with the required 29 lights is accepted, any other count is not (assignments with a ledbar after the first two)', () => {
    const window = new JSDOM('').window;
    const original = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
    Object.defineProperty(globalThis, 'DOMParser', { configurable: true, value: window.DOMParser });
    try {
        const lesson = getLuaLessonState().lessons.find(item => item.id === 'lua-led-confirm')!;
        const xml = (count: string) => `<xml><block type="lua_ledbar_new"><value name="COUNT"><shadow type="math_number"><field name="NUM">${count}</field></shadow></value></block></xml>`;
        expect(evaluateLesson(lesson, lesson.targetBlockIds, xml('29')).solved).toBe(true);
        expect(evaluateLesson(lesson, lesson.targetBlockIds, xml('30')).solved).toBe(false);
    } finally {
        if (original) Object.defineProperty(globalThis, 'DOMParser', original);
        else Reflect.deleteProperty(globalThis, 'DOMParser');
        window.close();
    }
});
