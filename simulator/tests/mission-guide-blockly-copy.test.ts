import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';
import { blocklyLessonCopy, blocklyPracticeSteps, BLOCK_HELP } from '../public/modules/ui/mission-guide/render/blockly-copy.js';
import { BLOCK_LABELS } from '../public/modules/ui/mission-guide/render/shared.js';

describe('Blockly lesson presentation', () => {
    test.each([getLuaLessonState(), getPythonLessonState()])('explains blocks without leaking text-language instructions', state => {
        for (const lesson of state.lessons) {
            const copy = blocklyLessonCopy(lesson);
            expect([copy.summary, copy.lessonIntro, copy.goal, copy.builderHint].join(' ')).not.toMatch(/\bLua\b|\bPython\b|Ledbar\.new|leds:set/);
            for (const id of lesson.targetBlockIds) {
                expect(BLOCK_HELP[id]).toBeDefined();
                expect(BLOCK_LABELS[id]).toBeDefined();
            }
            expect(copy.compile).toBe(lesson.compile);
            expect(copy.targetBlockIds).toBe(lesson.targetBlockIds);
        }
    });

    test('does not mutate the source lesson used by text tracks', () => {
        const lesson = getLuaLessonState().lessons[0];
        const intro = lesson.lessonIntro;
        blocklyLessonCopy(lesson);
        expect(lesson.lessonIntro).toBe(intro);
        expect(intro).toContain('В Lua');
    });

    test('gives every Lua task a concrete build order with exact block names', () => {
        const { lessons } = getLuaLessonState();
        expect(lessons.map(lesson => lesson.id).slice(-2)).toEqual(['lua-landing', 'lua-mission']);
        for (const lesson of lessons) {
            const steps = blocklyPracticeSteps(lesson);
            expect(steps.length).toBeGreaterThan(1);
            expect(steps.join(' ')).toContain('«');
        }
        const delayed = blocklyPracticeSteps(lessons.find(lesson => lesson.id === 'lua-led-delayed')!).join(' ');
        expect(delayed).toContain('номер **1**');
    });

    test('gives every Python task a build order with the names printed on the blocks', () => {
        const { lessons } = getPythonLessonState();
        for (const lesson of lessons) {
            const steps = blocklyPracticeSteps(lesson);
            expect(steps.length).toBeGreaterThan(0);
            expect(steps.join(' ')).toContain('«');
            expect(steps.join(' ')).not.toMatch(/Подготовить двигатели|Взлететь|Приземлиться|Перейти к точке/);
        }
    });
});
