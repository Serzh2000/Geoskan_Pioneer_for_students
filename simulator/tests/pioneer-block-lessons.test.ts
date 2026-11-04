/**
 * Уроки практикума на блоках Pioneer (учебник, том Blockly).
 *
 * Каждый урок проверяется как настоящая программа:
 * - пример и решение загружаются в Blockly и собираются и в Lua, и в Python;
 * - решение содержит блоки, без которых задание не считается выполненным;
 * - решение в симуляторе (Lua) и на pioneer_sdk (Python) делает ровно то, что
 *   записано в ожиданиях урока: слетает в нужные точки, меняет цвета, садится;
 * - время наблюдения урока покрывает весь полёт решения;
 * - пример летит без ошибок.
 */
import * as Blockly from 'blockly';
import { setupLuaSim, type LuaSim } from './helpers/lua-sim-harness.js';
import { findPython, runPythonScenario } from './helpers/python-sdk-harness.js';
import { behaviour } from './helpers/trace-compare.js';
import { expectFlight, luaPrelude, withStubs } from './helpers/block-flight.js';
import { PIONEER_LESSONS } from '../public/modules/ui/mission-guide/lessons/pioneer/catalog.js';
import type { WorkspaceJson } from '../public/modules/ui/mission-guide/lessons/pioneer/dsl.js';

let sim: LuaSim;
let compile: (workspace: Blockly.Workspace, target: 'lua' | 'python') => string;
let isBlockSupported: (type: string, target: 'lua' | 'python') => boolean;

beforeAll(async () => {
    sim = await setupLuaSim();
    const index = await import('../public/modules/editor/blockly-mode/index.js');
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await index.ensureEditorBlocklyDefinitions();
    compile = index.compilePioneerWorkspace;
    ({ isBlockSupported } = await import('../public/modules/editor/blockly-mode/pioneer/registry.js'));
});

const hasPython = findPython() !== null;

function load(json: WorkspaceJson): Blockly.Workspace {
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(json, workspace);
    return workspace;
}

function compiled(json: WorkspaceJson, target: 'lua' | 'python'): string {
    const workspace = load(json);
    const code = compile(workspace, target);
    workspace.dispose();
    return code;
}

test('в практикуме не меньше 15 уроков, темы не повторяются, у каждого есть всё нужное', () => {
    expect(PIONEER_LESSONS.length).toBeGreaterThanOrEqual(15);
    const topics = PIONEER_LESSONS.map((lesson) => lesson.topic);
    expect(new Set(topics).size).toBe(topics.length);
    for (const lesson of PIONEER_LESSONS) {
        expect(lesson.topic).toMatch(/^bk-[a-z-]+$/);
        expect(lesson.theory.length).toBeGreaterThanOrEqual(2);
        expect(lesson.notes.length).toBeGreaterThanOrEqual(2);
        expect(lesson.recipe.length).toBeGreaterThanOrEqual(2);
        expect(lesson.question.choices.length).toBeGreaterThanOrEqual(2);
        expect(lesson.question.correct).toBeLessThan(lesson.question.choices.length);
        expect(lesson.requires.length).toBeGreaterThan(0);
        // пример показывает приём, а задание его закрепляет: это разные программы
        expect(JSON.stringify(lesson.example)).not.toEqual(JSON.stringify(lesson.solution));
    }
});

describe.each(PIONEER_LESSONS.map((lesson) => [lesson.topic, lesson] as const))('%s', (_topic, lesson) => {
    test('пример и решение собираются в код для обоих языков', () => {
        for (const json of [lesson.example, lesson.solution]) {
            const workspace = load(json);
            const unsupported = workspace.getAllBlocks(false)
                .filter((block) => block.type.startsWith('pioneer_') && (!isBlockSupported(block.type, 'lua') || !isBlockSupported(block.type, 'python')));
            expect(unsupported.map((block) => block.type)).toEqual([]);
            workspace.dispose();
            expect(compiled(json, 'lua').trim().length).toBeGreaterThan(0);
            expect(compiled(json, 'python').trim().length).toBeGreaterThan(0);
        }
    });

    test('в решении есть блоки, которые требует задание', () => {
        const workspace = load(lesson.solution);
        const types = new Set(workspace.getAllBlocks(false).map((block) => block.type));
        workspace.dispose();
        expect(lesson.requires.filter(([type]) => !types.has(type)).map(([, label]) => label)).toEqual([]);
    });

    test('Lua: решение летит как записано в уроке и укладывается во время проверки', () => {
        const events = sim.run(compiled(lesson.solution, 'lua'), lesson.expect.waitMs / 1000 + 5, { prelude: luaPrelude });
        expectFlight(events, lesson.expect);
        const last = events.filter((event) => !event.what.startsWith('stopped')).map((event) => event.t).reduce((a, b) => Math.max(a, b), 0);
        // наблюдение должно охватить последний поворот сюжета с запасом на медленную машину
        expect({ lastEventAt: last, waitSeconds: lesson.expect.waitMs / 1000, enough: last * 1.25 + 1 <= lesson.expect.waitMs / 1000 })
            .toEqual({ lastEventAt: last, waitSeconds: lesson.expect.waitMs / 1000, enough: true });
    });

    (hasPython && (!lesson.languages || lesson.languages.includes('python')) ? test : test.skip)('Python: решение летит как записано в уроке', () => {
        const events = runPythonScenario(withStubs(compiled(lesson.solution, 'python')), { seconds: lesson.expect.waitMs / 1000 + 5 });
        expectFlight(events, lesson.expect);
    });

    test('Lua: пример летит без ошибок', () => {
        const events = sim.run(compiled(lesson.example, 'lua'), 60, { prelude: luaPrelude });
        expect(behaviour(events).failures).toEqual([]);
    });
});
