/**
 * Блоки Bricks (Пионер Мини 2): 10 проектов из сборника «Pioneer Bricks» (XML из BRICKS/projects)
 * открываются и собираются в Python, равный выводу самого Bricks 2.3.0 (tests/fixtures/bricks/*.py).
 * Запуск этого Python в рантайме симулятора - tests/bricks-runtime.test.ts.
 */
import * as Blockly from 'blockly';
import {
    allBricksBlockTypes,
    BRICKS_SPECS,
    compileBricksWorkspace,
    loadBricksProject,
    serializeBricksProject
} from '../public/modules/editor/blockly-mode/bricks/index.js';
import {
    BRICKS_PROJECTS as PROJECTS,
    compileBricksProject,
    normalizePython,
    readBricksFixture
} from './helpers/bricks-fixtures.js';

describe('Bricks: проекты сборника', () => {
    test('в фикстурах все 10 проектов', () => {
        expect(PROJECTS).toHaveLength(10);
    });

    test.each(PROJECTS)('%s: XML открывается без потерянных блоков', (name) => {
        const workspace = new Blockly.Workspace();
        const title = loadBricksProject(readBricksFixture(name, 'xml'), workspace);
        expect(title).toBe(name);
        const known = new Set(allBricksBlockTypes());
        const standard = /^(controls_|math_|logic_|text|variables_|lists_)/;
        const unknown = workspace.getAllBlocks(false).filter((block) => !known.has(block.type) && !standard.test(block.type));
        expect(unknown.map((block) => block.type)).toEqual([]);
        workspace.dispose();
    });

    test.each(PROJECTS)('%s: Python равен выводу Bricks', (name) => {
        expect(normalizePython(compileBricksProject(name))).toBe(normalizePython(readBricksFixture(name, 'py')));
    });

    test.each(PROJECTS)('%s: проект сохраняется и открывается заново с тем же Python', (name) => {
        const first = new Blockly.Workspace();
        loadBricksProject(readBricksFixture(name, 'xml'), first);
        const saved = serializeBricksProject(first, name);
        expect(saved).toContain(`<project name="${name}"`);
        const second = new Blockly.Workspace();
        expect(loadBricksProject(saved, second)).toBe(name);
        expect(normalizePython(compileBricksWorkspace(second))).toBe(normalizePython(compileBricksWorkspace(first)));
        first.dispose();
        second.dispose();
    });
});

describe('Bricks: набор блоков', () => {
    test('типы блоков уникальны и для каждого есть определение', () => {
        const types = allBricksBlockTypes();
        expect(new Set(types).size).toBe(types.length);
        for (const type of types) expect(Blockly.Blocks[type]).toBeDefined();
        expect(BRICKS_SPECS.length).toBeGreaterThan(40);
    });
});
