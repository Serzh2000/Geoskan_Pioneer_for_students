import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import type { LessonExample } from '../public/modules/ui/mission-guide/book/example.js';
import { courseExample, topicExample } from '../public/modules/ui/mission-guide/book/examples/index.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';

/*
 * Every lesson of the numbered course (Lua 1-72, Python 1-108) and every topic of the extra tasks and the Blockly assignments
 * has an example that is read in the theory and run in the demonstration. Run one lesson with: -t "lesson 10 "
 */
const LUA_LESSONS = getLuaTextLessonState().lessons.filter(lesson => lesson.academy);
const PYTHON_LESSONS = getPythonTextLessonState().lessons.filter(lesson => lesson.academy);
const TOPICS = ['led-single', 'led-sequence', 'led-confirm', 'led-delayed', 'preflight', 'takeoff', 'route', 'point-confirm', 'mission', 'landing'];

const squash = (code: string): string => code.replace(/\s+/g, '');

function checkShape(example: LessonExample): void {
    expect(example.theory.length).toBeGreaterThanOrEqual(2);
    expect(example.theory.length).toBeLessThanOrEqual(4);
    for (const paragraph of example.theory) {
        expect(paragraph.length).toBeGreaterThanOrEqual(40);
        expect(paragraph).not.toContain('___');
    }
    expect(example.steps.length).toBeGreaterThanOrEqual(2);
    expect(example.steps.length).toBeLessThanOrEqual(6);
    expect(example.watch.length).toBeGreaterThanOrEqual(15);
}

function checkCode(example: LessonExample, language: 'lua' | 'python', solution: string, run: (code: string) => { error: string | null }): void {
    const code = example[language];
    expect(code).toBeTruthy();
    expect(code).not.toContain('___');
    // The example teaches the fragment; it must not hand over the answer to the task.
    expect(squash(code!)).not.toBe(squash(solution));
    expect({ error: run(code!).error }).toEqual({ error: null });
    for (const step of example.steps) {
        const snippet = step[language];
        if (snippet) expect(code).toContain(snippet);
    }
    expect(example.steps.some(step => step[language])).toBe(true);
}

describe.each(PYTHON_LESSONS.map(lesson => lesson.academy!.number))('lesson %i example', number => {
    const python = PYTHON_LESSONS.find(lesson => lesson.academy!.number === number)!;
    const lua = LUA_LESSONS.find(lesson => lesson.academy!.number === number);

    test('is written with its theory and notes', () => {
        const example = courseExample(number);
        expect(example).toBeDefined();
        checkShape(example!);
    });

    test('runs in Python and does not give away the task', () => {
        checkCode(courseExample(number)!, 'python', python.solutionCode, code => executeAcademyPython(code, { vision: number >= 73 ? number : undefined, hill: number === 42 }));
    });

    test(lua ? 'runs in Lua and does not give away the task' : 'is Python only', () => {
        const example = courseExample(number)!;
        if (!lua) {
            expect(example.lua).toBeUndefined();
            return;
        }
        checkCode(example, 'lua', lua.solutionCode, code => executeAcademyLua(code, { flight: number >= 28, hill: number === 42 }));
    });
});

describe.each(TOPICS)('topic %s example', topic => {
    const solution = (language: 'lua' | 'python') => (language === 'lua' ? getLuaTextLessonState() : getPythonTextLessonState()).lessons.find(lesson => lesson.topicId === topic)!.solutionCode;

    test('is written with its theory and notes', () => {
        const example = topicExample(topic);
        expect(example).toBeDefined();
        checkShape(example!);
    });

    test.each(['lua', 'python'] as const)('runs in %s and does not give away the task', language => {
        const run = language === 'lua'
            ? (code: string) => executeAcademyLua(code, { flight: true })
            : (code: string) => executeAcademyPython(code);
        checkCode(topicExample(topic)!, language, solution(language), run);
    });
});
