// @ts-expect-error В проекте нет пакета @types/jsdom, используем jsdom только для DOMParser в Node-тестах.
import { JSDOM } from 'jsdom';
import { evaluateLesson } from '../public/modules/ui/mission-guide/evaluation/index.js';
import { getLuaLessonState } from '../public/modules/ui/mission-guide/lua-lessons.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/python-lessons.js';
import { buildTargetWorkspaceXml } from '../public/modules/ui/mission-guide/support/workspace-xml.js';
import type { GuideLesson } from '../public/modules/ui/mission-guide/types.js';

const { window } = new JSDOM();
globalThis.DOMParser = window.DOMParser;

const luaLessons = getLuaLessonState().lessons;
const pythonLessons = getPythonLessonState().lessons;
const allLessons = [...luaLessons, ...pythonLessons];

function getLesson(id: string): GuideLesson {
    const lesson = allLessons.find((item) => item.id === id);
    if (!lesson) throw new Error(`Урок ${id} не найден`);
    return lesson;
}

describe('Валидация заданий учебника', () => {
    test.each(allLessons.map((lesson) => [lesson.id, lesson] as const))(
        '%s содержит реальные Blockly-типы в цели',
        (_lessonId, lesson) => {
            expect(lesson.targetBlockIds.length).toBeGreaterThan(0);
            expect(lesson.targetBlockIds.every((blockId) => /^(lua|py)_/.test(blockId))).toBe(true);
        }
    );

    test.each(allLessons.filter((lesson) => !['lua-led-single', 'lua-led-sequence'].includes(lesson.id)).map((lesson) => [lesson.id, lesson] as const))(
        '%s засчитывает точную целевую последовательность',
        (_lessonId, lesson) => {
            const result = evaluateLesson(lesson, lesson.targetBlockIds);

            expect(result.complete).toBe(true);
            expect(result.solved).toBe(true);
            expect(result.diagnostics).toEqual([expect.objectContaining({ kind: 'success' })]);
        }
    );

    test('Lua LED: правильная цепочка с параметрами засчитывается', () => {
        const lesson = getLesson('lua-led-single');
        const result = evaluateLesson(
            lesson,
            lesson.targetBlockIds,
            buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds)
        );

        expect(result.solved).toBe(true);
        expect(result.complete).toBe(true);
    });

    test('Lua анимация: правильная структура таймеров засчитывается', () => {
        const lesson = getLesson('lua-led-sequence');
        const result = evaluateLesson(
            lesson,
            lesson.targetBlockIds,
            buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds)
        );

        expect(result.solved).toBe(true);
        expect(result.complete).toBe(true);
    });

    test('Lua LED: неверный цвет не засчитывается', () => {
        const lesson = getLesson('lua-led-single');
        const xml = buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds).replace(
            '<field name="R">1</field>',
            '<field name="R">0</field>'
        );
        const result = evaluateLesson(lesson, lesson.targetBlockIds, xml);

        expect(result.complete).toBe(true);
        expect(result.solved).toBe(false);
        expect(result.diagnostics).toEqual(expect.arrayContaining([
            expect.objectContaining({ title: 'Красный цвет задан неверно' })
        ]));
    });

    test('Lua анимация: неверная задержка не засчитывается', () => {
        const lesson = getLesson('lua-led-sequence');
        const xml = buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds).replace(
            '<field name="DELAY">2</field>',
            '<field name="DELAY">4</field>'
        );
        const result = evaluateLesson(lesson, lesson.targetBlockIds, xml);

        expect(result.complete).toBe(true);
        expect(result.solved).toBe(false);
        expect(result.diagnostics).toEqual(expect.arrayContaining([
            expect.objectContaining({ title: 'Вторая задержка указана неверно' })
        ]));
    });

    test('неполное решение не засчитывается для каждого урока', () => {
        for (const lesson of allLessons) {
            const result = evaluateLesson(lesson, lesson.targetBlockIds.slice(0, -1));
            expect(result.solved).toBe(false);
            expect(result.complete).toBe(false);
        }
    });
});
