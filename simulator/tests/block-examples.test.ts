/**
 * Примеры для блочного редактора (examples-blocks/).
 *
 * Каждый пример проверяется как настоящая программа:
 * - JSON загружается в Blockly, в нём нет блоков, которых нет в нужном языке;
 * - Lua из блоков выполняется в рантайме симулятора (физика, автопилот), а
 *   Python — в CPython на поддельном pioneer_sdk;
 * - дрон обязан слетать в ожидаемые точки в ожидаемом порядке, закончить
 *   посадкой и не упасть с ошибкой;
 * - один и тот же набор блоков в Lua и в Python даёт одинаковое поведение.
 * Ожидания лежат в fixtures/block-examples.json: их пишет
 * tools/block-examples/build.mjs вместе с самими примерами.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Blockly from 'blockly';
import { setupLuaSim, type LuaSim } from './helpers/lua-sim-harness.js';
import { findPython, runPythonScenario } from './helpers/python-sdk-harness.js';
import { expectFlight, flightNames, luaPrelude, withStubs } from './helpers/block-flight.js';

type Expectation = {
    file: string;
    targets: Array<'lua' | 'python'>;
    points: number[][];
    led?: string[];
    lands: boolean;
    seconds: number;
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(HERE, '..', 'examples-blocks');
const expectations: Expectation[] = JSON.parse(
    fs.readFileSync(path.join(HERE, 'fixtures', 'block-examples.json'), 'utf8')
);

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

function load(file: string): { workspace: Blockly.Workspace; json: unknown } {
    const json = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(json, workspace);
    return { workspace, json };
}

const hasPython = findPython() !== null;

test('в каталоге не меньше 30 примеров, и на диске нет лишних файлов', () => {
    expect(expectations.length).toBeGreaterThanOrEqual(30);
    const onDisk = fs.readdirSync(EXAMPLES_DIR, { recursive: true, encoding: 'utf8' })
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.split(path.sep).join('/'))
        .sort();
    expect(onDisk).toEqual(expectations.map((entry) => entry.file).sort());
});

describe.each(expectations)('$file', (expected) => {
    test('загружается и собирается в код для своих языков', () => {
        const { workspace } = load(expected.file);
        const blocks = workspace.getAllBlocks(false);
        expect(blocks.length).toBeGreaterThan(1);
        for (const target of expected.targets) {
            const unsupported = blocks.filter((block) => block.type.startsWith('pioneer_') && !isBlockSupported(block.type, target));
            expect(unsupported.map((block) => block.type)).toEqual([]);
            const code = compile(workspace, target);
            expect(code.trim().length).toBeGreaterThan(0);
        }
        workspace.dispose();
    });

    if (expected.targets.includes('lua')) {
        test('Lua: выполняется в симуляторе и летит по плану', () => {
            const { workspace } = load(expected.file);
            const code = compile(workspace, 'lua');
            workspace.dispose();
            // math.random без seed в Lua даёт одно и то же, но для надёжности фиксируем.
            const events = sim.run(code, expected.seconds, { prelude: luaPrelude });
            expectFlight(events, expected);
        });
    }

    if (expected.targets.includes('python')) {
        (hasPython ? test : test.skip)('Python: выполняется на pioneer_sdk и летит по плану', () => {
            const { workspace } = load(expected.file);
            const code = compile(workspace, 'python');
            workspace.dispose();
            const events = runPythonScenario(withStubs(code), { seconds: expected.seconds });
            expectFlight(events, expected);
        });
    }

    if (expected.targets.length === 2) {
        (hasPython ? test : test.skip)('Lua и Python летят одинаково', () => {
            const { workspace } = load(expected.file);
            const lua = sim.run(compile(workspace, 'lua'), expected.seconds, { prelude: luaPrelude });
            const py = runPythonScenario(withStubs(compile(workspace, 'python')), { seconds: expected.seconds });
            workspace.dispose();
            expect(flightNames(lua)).toEqual(flightNames(py));
        });
    }
});
