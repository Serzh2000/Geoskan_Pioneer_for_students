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
const PIONEER_BRIDGE_SOURCE_PATH = path.join(HERE, '../public/modules/python/pioneer-js-bridge.ts');

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
// coroutine.* — [пересмотрено 2026-09-13, см. §2.1 плана] сознательно НЕ в
// списке: Lua-таргет с FSM корутины не использует вовсе, а если бы
// сгенерированный код где-то вызвал coroutine.*, это означало бы, что FSM
// реализована неправильно (см. targets/lua-fsm.ts, targets/lua-runtime.ts).
// 'function' — ложное срабатывание CALL_PATTERN на анонимных функциях FSM
// (`action["__sN"] = function()`, `Timer.callLater(t, function()`, см.
// targets/lua-fsm.ts): регэксп не различает "вызов" и "ключевое слово
// function перед (", когда сразу за ним, без имени, идёт открывающая
// скобка — это ключевое слово Lua, а не API, которое нужно проверять.
// 'current' — локальная переменная __advance() в targets/lua-runtime.ts
// (`local current = action[__state]; if current ~= nil then current() end`):
// вызов значения, хранящегося в локальной переменной, а не обращение к API.
const LUA_STD_NAMES = new Set(['print', 'error', 'select', 'tostring', 'callback', 'function', 'current']);
const LUA_STD_PREFIXES = ['math.'];

function isAllowedLuaCall(name: string, allowSet: Set<string>): boolean {
    if (name.startsWith('__')) return true;
    if (allowSet.has(name)) return true;
    if (LUA_STD_NAMES.has(name)) return true;
    return LUA_STD_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function extractClassMethods(source: string, className: string): Set<string> {
    const classStart = source.indexOf(`class ${className}:`);
    if (classStart === -1) throw new Error(`class ${className}: не найден в pioneer-sdk-module.ts`);
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

function extractPioneerMethods(source: string): Set<string> {
    return extractClassMethods(source, 'Pioneer');
}

// Всё, что мост реально кладёт в window (`w.pioneer_* = ...`,
// pioneer-js-bridge.ts). Для Python это такой же контракт, как luaApiDocs для
// Lua: сгенерированный код обращается к js.pioneer_* напрямую, и опечатка в
// имени иначе всплыла бы только вживую в браузере.
function extractBridgeGlobals(source: string): Set<string> {
    return new Set(Array.from(source.matchAll(/^\s*w\.(pioneer_\w+)\s*=/gm)).map((match) => match[1]));
}

const PIONEER_SDK_SOURCE = fs.readFileSync(PIONEER_SDK_SOURCE_PATH, 'utf8');
// Объект камеры в сгенерированном коде называется `camera` (blocks/camera.ts,
// `camera = Camera()`) — ровно как в официальном примере Geoscan
// docs/imported/Python_files/frames_from_camera.py.
const CAMERA_METHODS = extractClassMethods(PIONEER_SDK_SOURCE, 'Camera');
const BRIDGE_GLOBALS = extractBridgeGlobals(fs.readFileSync(PIONEER_BRIDGE_SOURCE_PATH, 'utf8'));

const PYTHON_STD_NAMES = new Set([
    'time.sleep', 'time.time', 'print', 'RuntimeError', 'Pioneer', 'Camera', 'condition'
]);

function isAllowedPythonCall(name: string, pioneerMethods: Set<string>): boolean {
    if (name.startsWith('_pioneer_')) return true;
    if (name.startsWith('pioneer.')) return pioneerMethods.has(name.slice('pioneer.'.length));
    if (name.startsWith('camera.')) return CAMERA_METHODS.has(name.slice('camera.'.length));
    if (name.startsWith('js.')) return BRIDGE_GLOBALS.has(name.slice('js.'.length));
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

// Фаза 4, шаг 5 плана: «моторы → взлёт → точка (1, 0, 1) → ждать 2 → посадка»
// в стиле существующих «Интеграционные тесты Lua» (blockly-codegen.test.ts).
function buildFullFlightWorkspace(): Blockly.Workspace {
    const workspace = new Blockly.Workspace();
    const start = workspace.newBlock(PIONEER_START_TYPE);
    const preflight = workspace.newBlock('pioneer_preflight');
    const takeoff = workspace.newBlock('pioneer_takeoff');
    const goTo = workspace.newBlock('pioneer_go_to');
    const wait = workspace.newBlock('pioneer_wait');
    const land = workspace.newBlock('pioneer_land');

    goTo.getInput('X')!.connection!.connect(numberInput(workspace, 1).outputConnection!);
    goTo.getInput('Y')!.connection!.connect(numberInput(workspace, 0).outputConnection!);
    goTo.getInput('Z')!.connection!.connect(numberInput(workspace, 1).outputConnection!);
    wait.getInput('SECONDS')!.connection!.connect(numberInput(workspace, 2).outputConnection!);

    start.nextConnection!.connect(preflight.previousConnection!);
    preflight.nextConnection!.connect(takeoff.previousConnection!);
    takeoff.nextConnection!.connect(goTo.previousConnection!);
    goTo.nextConnection!.connect(wait.previousConnection!);
    wait.nextConnection!.connect(land.previousConnection!);

    return workspace;
}

function numberInput(workspace: Blockly.Workspace, value: number): Blockly.Block {
    const block = workspace.newBlock('math_number');
    block.setFieldValue(String(value), 'NUM');
    return block;
}

describe('Интеграционный тест: полный полёт (фаза 4)', () => {
    const luaAllowSet = buildLuaAllowSet();
    const pioneerMethods = extractPioneerMethods(fs.readFileSync(PIONEER_SDK_SOURCE_PATH, 'utf8'));

    test('Lua: моторы -> взлёт -> точка (1, 0, 1) -> ждать 2с -> посадка', () => {
        const code = compilePioneerWorkspace(buildFullFlightWorkspace(), 'lua');

        // Маркеры __wait_event/__wait_seconds — не настоящие функции, а сигнал
        // для lua-fsm.ts на этапе сборки (§4.3 плана, пересмотрено 2026-09-13,
        // см. §2.1): в готовом коде вместо них — состояния FSM и переходы.
        expect(code).not.toContain('__wait_event');
        expect(code).not.toContain('__wait_seconds');
        expect(code).not.toContain('coroutine');

        // [пересмотрено 2026-09-14] Ни одно имя события в этом маршруте не
        // повторяется (ENGINES_STARTED, TAKEOFF_COMPLETE, POINT_REACHED,
        // COPTER_LANDED — по одному разу), поэтому компилируется ПЛОСКИЙ
        // вариант: соседние ветки в callback(event), без таблицы состояний
        // (§4.3 плана). Байт-в-байт этот вывод зафиксирован в
        // tests/pioneer-blockly-lua-fsm.test.ts; здесь — структура и
        // белый список API.
        expect(code).not.toContain('action[');
        expect(code).not.toContain('__state');
        expect(code).not.toContain('__advance');

        expect(code).toContain('ap.push(Ev.MCE_PREFLIGHT)');
        expect(code).toContain('if event == Ev.ENGINES_STARTED then\n        ap.push(Ev.MCE_TAKEOFF)\n    end');
        expect(code).toContain('if event == Ev.TAKEOFF_COMPLETE then\n        ap.goToLocalPoint(1, 0, 1)\n    end');
        expect(code).toContain('if event == Ev.POINT_REACHED then\n        Timer.callLater(2, function()\n');
        expect(code).toContain('ap.push(Ev.MCE_LANDING)');
        expect(code).toContain('if event == Ev.COPTER_LANDED then\n    end');

        const unknown = extractCalls(code).filter((name) => !isAllowedLuaCall(name, luaAllowSet));
        expect(unknown).toEqual([]);

        expect(checkLuaSyntax(code).ok).toBe(true);
    });

    test('Python: тот же маршрут через pioneer_sdk с ожиданием по опросу состояния', () => {
        const code = compilePioneerWorkspace(buildFullFlightWorkspace(), 'python');

        // Никакого общего хелпера с таймаутом/сообщением (пересмотрено
        // 2026-09-14 повторно, см. §4.4 плана) — прямой инлайновый while,
        // как в официальных примерах Geoscan.
        expect(code).toContain('pioneer.arm()');
        expect(code).toContain("while not pioneer.get_autopilot_state() == 'ARMED':\n    time.sleep(0.1)");
        expect(code).toContain('pioneer.takeoff()');
        expect(code).toContain("while not pioneer.get_autopilot_state() == 'MISSION':\n    time.sleep(0.1)");
        expect(code).toContain('pioneer.go_to_local_point(x=1, y=0, z=1)');
        expect(code).toContain('while not pioneer.point_reached():\n    time.sleep(0.1)');
        expect(code).toContain('time.sleep(2)');
        expect(code).toContain('pioneer.land()');
        expect(code).toContain("while not pioneer.get_autopilot_state() == 'DISARMED':\n    time.sleep(0.1)");
        expect(code.trimEnd().endsWith('pioneer.close_connection()')).toBe(true);

        expect(code).not.toContain('_pioneer_wait');
        // Ни один блок в этом маршруте не использует math/pioneer_time.
        expect(code).not.toContain('import math');
        expect(code).not.toContain('_pioneer_t0');

        const unknown = extractCalls(code).filter((name) => !isAllowedPythonCall(name, pioneerMethods));
        expect(unknown).toEqual([]);
    });
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
