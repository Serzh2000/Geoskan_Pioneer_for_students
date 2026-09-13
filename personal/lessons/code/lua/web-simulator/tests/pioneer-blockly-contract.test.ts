/**
 * Контрактные тесты единого набора блоков pioneer_* (см.
 * docs/blockly-unification-plan.md, фаза 1): белый список вызываемого API,
 * покрытие таргетов генераторами и (где возможно) синтаксическая проверка
 * сгенерированного Lua через настоящий Fengari.
 *
 * Раздел "legacy" прогоняет тот же белый список через СТАРЫЕ блоки
 * (lua_waiting_for_point, lua_get_pv_by_index, update_yaw), чтобы доказать:
 * список действительно ловит реальные дефекты старой реализации (§3 плана).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
// Именованный import * не работает под нативным ESM-интеропом Node для этого
// CJS-пакета (даёт только { default, 'module.exports' }) — в отличие от
// Vite/esbuild в браузерной сборке. Остальные lua-тесты поэтому мокают
// fengari-web целиком; здесь он нужен по-настоящему (проверка синтаксиса),
// так что берём default-импорт, под которым Node отдаёт сам module.exports.
import fengari from 'fengari-web';

import { luaApiDocs } from '../public/modules/docs/lua-api-docs.js';
import {
    buildPioneerToolbox,
    compilePioneerWorkspace,
    ensureEditorBlocklyDefinitions
} from '../public/modules/editor/blockly-mode/index.js';
import { getPioneerBlockTypes, isBlockSupported } from '../public/modules/editor/blockly-mode/pioneer/registry.js';
import type { PioneerTarget } from '../public/modules/editor/blockly-mode/pioneer/targets/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PIONEER_SDK_SOURCE_PATH = path.join(HERE, '../public/modules/python/pioneer-sdk-module.ts');

const CALL_PATTERN = /\b([A-Za-z_][\w]*(?:[.:][A-Za-z_]\w*)*)\s*\(/g;

function extractCalls(code: string): string[] {
    return Array.from(code.matchAll(CALL_PATTERN)).map((match) => match[1]);
}

function buildLuaAllowSet(): Set<string> {
    const keys = new Set(Object.keys(luaApiDocs));
    // Экземпляр ленты называется `leds`, а не именем класса `Ledbar` —
    // нормализация из §1 плана (фаза 1, шаг 1).
    if (keys.has('Ledbar:set')) keys.add('leds:set');
    return keys;
}

// 'callback' — не вызов API, а ложное срабатывание регэкспа на объявлении
// `function callback(event)` из фиксированного пролога (targets/lua-runtime.ts):
// вызовов с таким именем в теле программы не бывает, это часть каждого
// сгенерированного Lua-скрипта.
const LUA_STD_NAMES = new Set(['print', 'error', 'select', 'tostring', 'callback']);
const LUA_STD_PREFIXES = ['math.', 'coroutine.'];

function isAllowedLuaCall(name: string, allowSet: Set<string>): boolean {
    if (name.startsWith('__')) return true;
    if (allowSet.has(name)) return true;
    if (LUA_STD_NAMES.has(name)) return true;
    return LUA_STD_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function extractPioneerMethods(source: string): Set<string> {
    const classStart = source.indexOf('class Pioneer:');
    if (classStart === -1) throw new Error('class Pioneer: не найден в pioneer-sdk-module.ts');
    const rest = source.slice(classStart);
    const nextClassIdx = rest.indexOf('\nclass ', 1);
    const classBody = nextClassIdx === -1 ? rest : rest.slice(0, nextClassIdx);
    const methods = new Set<string>();
    const re = /^\s*def\s+(\w+)\s*\(/gm;
    let match: RegExpExecArray | null = re.exec(classBody);
    while (match) {
        methods.add(match[1]);
        match = re.exec(classBody);
    }
    return methods;
}

const PYTHON_STD_NAMES = new Set(['time.sleep', 'time.time', 'print', 'RuntimeError', 'Pioneer', 'condition']);

function isAllowedPythonCall(name: string, pioneerMethods: Set<string>): boolean {
    if (name.startsWith('_pioneer_')) return true;
    if (name.startsWith('pioneer.')) return pioneerMethods.has(name.slice('pioneer.'.length));
    if (name.startsWith('math.')) return true;
    return PYTHON_STD_NAMES.has(name);
}

function checkLuaSyntax(code: string): { ok: boolean; error: string | null } {
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);
    const status = fengari.lauxlib.luaL_loadstring(L, fengari.to_luastring(code));
    if (status === fengari.lua.LUA_OK) {
        fengari.lua.lua_close(L);
        return { ok: true, error: null };
    }
    const raw = fengari.lua.lua_tostring(L, -1);
    const message = fengari.to_jsstring(raw);
    fengari.lua.lua_close(L);
    return { ok: false, error: message };
}

function fillNumericInputs(workspace: Blockly.Workspace, block: Blockly.Block): void {
    block.inputList.forEach((input) => {
        const check = input.connection?.getCheck();
        if (!check || !check.includes('Number')) return;
        const numberBlock = workspace.newBlock('math_number');
        numberBlock.setFieldValue('2', 'NUM');
        input.connection!.connect(numberBlock.outputConnection!);
    });
}

function fillColourInputs(workspace: Blockly.Workspace, block: Blockly.Block): void {
    block.inputList.forEach((input) => {
        const check = input.connection?.getCheck();
        if (!check || !check.includes('PioneerColour')) return;
        const colourBlock = workspace.newBlock('pioneer_colour_preset');
        input.connection!.connect(colourBlock.outputConnection!);
    });
}

const PIONEER_START_TYPE = 'pioneer_start';

// Оборачивает блок-под-тестом в цепочку под pioneer_start, чтобы прогнать его
// через тот же compilePioneerWorkspace(), которым пользуется редактор
// (см. фазу 1, шаг 1 плана). Value-блоки подключаются к подходящему "приёмнику".
function buildWorkspaceForBlock(type: string): Blockly.Workspace {
    const workspace = new Blockly.Workspace();

    if (type === PIONEER_START_TYPE) {
        workspace.newBlock(PIONEER_START_TYPE);
        return workspace;
    }

    const start = workspace.newBlock(PIONEER_START_TYPE);
    const block = workspace.newBlock(type);
    fillNumericInputs(workspace, block);
    fillColourInputs(workspace, block);

    if (block.previousConnection) {
        start.nextConnection!.connect(block.previousConnection);
        return workspace;
    }

    if (block.outputConnection) {
        const isColour = (block.outputConnection.getCheck() || []).includes('PioneerColour');
        const sink = workspace.newBlock(isColour ? 'pioneer_led_all' : 'pioneer_wait');
        const inputName = isColour ? 'COLOUR' : 'SECONDS';
        sink.getInput(inputName)!.connection!.connect(block.outputConnection);
        start.nextConnection!.connect(sink.previousConnection!);
    }

    return workspace;
}

// Top-level await, а не beforeAll(): describe()-тела ниже перечисляют блоки
// через getPioneerBlockTypes() синхронно, на этапе СБОРА тестов, который Jest
// выполняет раньше, чем успевает отработать любой beforeAll(). Реестр должен
// быть заполнен уже к моменту, когда движок дойдёт до первого describe().
//
// Тот же приём "прогрева" динамических импортов для Jest, что и в
// tests/blockly-codegen.test.ts — иначе внутренний import() внутри
// ensureEditorBlocklyDefinitions() не резолвит голые спецификаторы пакетов.
await import('../public/modules/editor/blockly-mode/blockly-core.js');
await import('../public/modules/editor/blockly-mode/workspace-xml.js');
await import('../public/modules/editor/blockly-mode/lua-definitions.js');
await import('../public/modules/editor/blockly-mode/pioneer/registry.js');
await ensureEditorBlocklyDefinitions();

describe('Белый список API (pioneer_*)', () => {
    const luaAllowSet = buildLuaAllowSet();
    const pioneerMethods = extractPioneerMethods(fs.readFileSync(PIONEER_SDK_SOURCE_PATH, 'utf8'));

    const targets: PioneerTarget[] = ['lua', 'python'];

    for (const type of getPioneerBlockTypes()) {
        for (const target of targets) {
            test(`${type} [${target}]: генерирует только разрешённые вызовы API`, () => {
                if (!isBlockSupported(type, target)) {
                    return;
                }

                const workspace = buildWorkspaceForBlock(type);
                const code = compilePioneerWorkspace(workspace, target);
                const calls = extractCalls(code);

                const unknown = target === 'lua'
                    ? calls.filter((name) => !isAllowedLuaCall(name, luaAllowSet))
                    : calls.filter((name) => !isAllowedPythonCall(name, pioneerMethods));

                expect(unknown).toEqual([]);
            });
        }
    }

    test('в реестре зарегистрирован хотя бы один блок', () => {
        // На старте фазы 1 pioneer/blocks/*.ts ещё не существует — это
        // намеренно "красный" тест, который станет зелёным в фазе 3.
        expect(getPioneerBlockTypes().length).toBeGreaterThan(0);
    });
});

describe('Покрытие таргетов', () => {
    test('каждый зарегистрированный тип есть в Blockly.Blocks', () => {
        for (const type of getPioneerBlockTypes()) {
            expect(Blockly.Blocks[type]).toBeDefined();
        }
    });

    test('поддерживаемые таргеты имеют реальный генератор, а не заглушку', () => {
        for (const type of getPioneerBlockTypes()) {
            if (isBlockSupported(type, 'lua')) {
                expect(luaGenerator.forBlock[type]).toBeDefined();
            }
            if (isBlockSupported(type, 'python')) {
                expect(pythonGenerator.forBlock[type]).toBeDefined();
            }
        }
    });

    test('buildPioneerToolbox() не ссылается на незарегистрированные типы', () => {
        const known = new Set(getPioneerBlockTypes());
        const toolboxXml = buildPioneerToolbox();
        const types = Array.from(toolboxXml.matchAll(/<block type="(pioneer_[^"]+)"/g)).map((m) => m[1]);
        for (const type of types) {
            expect(known.has(type)).toBe(true);
        }
    });
});

describe('Синтаксис Lua (настоящий Fengari luaL_loadstring)', () => {
    for (const type of getPioneerBlockTypes()) {
        test(`${type}: сгенерированный Lua синтаксически корректен`, () => {
            if (!isBlockSupported(type, 'lua')) return;

            const workspace = buildWorkspaceForBlock(type);
            const code = compilePioneerWorkspace(workspace, 'lua');
            const result = checkLuaSyntax(code);
            expect(result.ok).toBe(true);
        });
    }
});

describe('legacy (ожидаемо падает по тому же белому списку)', () => {
    const luaAllowSet = buildLuaAllowSet();
    const pioneerMethods = extractPioneerMethods(fs.readFileSync(PIONEER_SDK_SOURCE_PATH, 'utf8'));

    test('lua_waiting_for_point вызывает несуществующие ap.point_reached()/task.wait()', () => {
        const workspace = new Blockly.Workspace();
        workspace.newBlock('lua_waiting_for_point');
        const code = luaGenerator.workspaceToCode(workspace);
        const unknown = extractCalls(code).filter((name) => !isAllowedLuaCall(name, luaAllowSet));

        expect(unknown).toEqual(expect.arrayContaining(['ap.point_reached', 'task.wait']));
    });

    test('lua_get_pv_by_index без подключённого входа даёт синтаксически неверный Lua', () => {
        const workspace = new Blockly.Workspace();
        workspace.newBlock('lua_get_pv_by_index');
        const code = luaGenerator.workspaceToCode(workspace);

        // Дефолт блока — литерал '[0, 0, 0]', а такого синтаксиса в Lua нет
        // (списки задаются {..}), см. §3 плана, lua-definitions.ts:421-425.
        const result = checkLuaSyntax(code);
        expect(result.ok).toBe(false);
    });

    test('update_yaw (pioneer-sdk2) вызывает несуществующий pioneer.set_yaw()', () => {
        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock('update_yaw');
        const numberBlock = workspace.newBlock('math_number');
        numberBlock.setFieldValue('90', 'NUM');
        block.getInput('YAW')!.connection!.connect(numberBlock.outputConnection!);

        const code = pythonGenerator.workspaceToCode(workspace);
        const unknown = extractCalls(code).filter((name) => !isAllowedPythonCall(name, pioneerMethods));

        expect(unknown).toContain('pioneer.set_yaw');
    });
});
