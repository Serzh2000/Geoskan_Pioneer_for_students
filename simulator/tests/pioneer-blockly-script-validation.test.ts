/**
 * Фаза 7 плана, шаг 5-6: статические анализаторы уведомлений
 * (script-execution-notice/lua-validation.ts, python-validation.ts) не
 * должны давать ложных предупреждений на код, сгенерированный из pioneer_*.
 *
 * lua-validation.ts делил сценарий на "шаги" только по `sleep(`, а
 * сгенерированный Lua ждёт через __wait_event(...)/__wait_seconds(...) —
 * без этой правки полётный скрипт (моторы -> взлёт -> точка -> посадка)
 * ложно считался бы "несколько команд миссии в одном шаге".
 */
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { collectLuaIssues } from '../public/modules/app/script-execution-notice/lua-validation.js';
import { collectPythonIssues } from '../public/modules/app/script-execution-notice/python-validation.js';

await import('../public/modules/editor/blockly-mode/blockly-core.js');
await import('../public/modules/editor/blockly-mode/workspace-xml.js');
await import('../public/modules/editor/blockly-mode/lua-definitions.js');
await ensureEditorBlocklyDefinitions();

function numberBlock(workspace: Blockly.Workspace, value: number): Blockly.Block {
    const block = workspace.newBlock('math_number');
    block.setFieldValue(String(value), 'NUM');
    return block;
}

// Тот же маршрут, что и в интеграционном тесте фазы 4
// (pioneer-blockly-contract.test.ts): моторы -> взлёт -> точка (1, 0, 1) ->
// ждать 2с -> посадка.
function buildFullFlightWorkspace(): Blockly.Workspace {
    const workspace = new Blockly.Workspace();
    const start = workspace.newBlock('pioneer_start');
    const preflight = workspace.newBlock('pioneer_preflight');
    const takeoff = workspace.newBlock('pioneer_takeoff');
    const goTo = workspace.newBlock('pioneer_go_to');
    const wait = workspace.newBlock('pioneer_wait');
    const land = workspace.newBlock('pioneer_land');

    goTo.getInput('X')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
    goTo.getInput('Y')!.connection!.connect(numberBlock(workspace, 0).outputConnection!);
    goTo.getInput('Z')!.connection!.connect(numberBlock(workspace, 1).outputConnection!);
    wait.getInput('SECONDS')!.connection!.connect(numberBlock(workspace, 2).outputConnection!);

    start.nextConnection!.connect(preflight.previousConnection!);
    preflight.nextConnection!.connect(takeoff.previousConnection!);
    takeoff.nextConnection!.connect(goTo.previousConnection!);
    goTo.nextConnection!.connect(wait.previousConnection!);
    wait.nextConnection!.connect(land.previousConnection!);

    return workspace;
}

describe('collectLuaIssues: сгенерированный pioneer_*-скрипт (Lua)', () => {
    test('не даёт ложного "несколько команд миссии в одном шаге"', () => {
        const code = compilePioneerWorkspace(buildFullFlightWorkspace(), 'lua');
        const issues = collectLuaIssues(code);

        expect(issues.some((issue) => issue.includes('несколько команд миссии в одном шаге'))).toBe(false);
    });

    test('не даёт ложного "нет function callback(event)" — пролог всегда его определяет', () => {
        const code = compilePioneerWorkspace(buildFullFlightWorkspace(), 'lua');
        const issues = collectLuaIssues(code);

        expect(issues.some((issue) => issue.includes('только первую команду миссии'))).toBe(false);
    });

    test('пустая программа (только pioneer_start) не даёт предупреждений о шагах миссии', () => {
        const workspace = new Blockly.Workspace();
        workspace.newBlock('pioneer_start');
        const code = compilePioneerWorkspace(workspace, 'lua');

        const issues = collectLuaIssues(code);
        expect(issues.some((issue) => issue.includes('несколько команд миссии'))).toBe(false);
    });
});

describe('collectPythonIssues: сгенерированный pioneer_*-скрипт (Python)', () => {
    test('не даёт ложных предупреждений на полный маршрут', () => {
        const code = compilePioneerWorkspace(buildFullFlightWorkspace(), 'python');
        const issues = collectPythonIssues(code);

        expect(issues).toEqual([]);
    });
});
