/**
 * Блок «Сделать снимок» (pioneer_camera_take_photo, добавлен 2026-09-14) и
 * третий вид перехода Lua-цепочки — опрос условия (kind: 'poll',
 * targets/lua-fsm.ts).
 *
 * Отдельный файл, а не раздел в pioneer-blockly-codegen.test.ts: там
 * проверяется точная кодогенерация блоков БЕЗ модели ожидания, а здесь —
 * одновременно и кодогенерация, и форма перехода в обоих режимах Lua-таргета
 * (плоском и FSM), как в pioneer-blockly-lua-fsm.test.ts.
 *
 * Почему опрос вообще понадобился: камера симулятора не шлёт события
 * автопилота (Ev.*) и не укладывается в фиксированную задержку
 * Timer.callLater — camera.checkRequestShot() становится истинной через
 * неизвестное короткое время, когда асинхронная отрисовка кадра завершится
 * (modules/lua/hardware/camera.ts).
 */
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { isBlockSupported } from '../public/modules/editor/blockly-mode/pioneer/registry.js';

await import('../public/modules/editor/blockly-mode/blockly-core.js');
await import('../public/modules/editor/blockly-mode/workspace-xml.js');
await import('../public/modules/editor/blockly-mode/lua-definitions.js');
await ensureEditorBlocklyDefinitions();

function makeWorkspace(): Blockly.Workspace {
    return new Blockly.Workspace();
}

function chainUnderStart(workspace: Blockly.Workspace, ...blocks: Blockly.Block[]): void {
    const start = workspace.newBlock('pioneer_start');
    let previous = start;
    for (const block of blocks) {
        previous.nextConnection!.connect(block.previousConnection!);
        previous = block;
    }
}

describe('Lua: снимок как переход-опрос', () => {
    test('запрос снимка в сегменте, продолжение — в самоперезаводящемся __poll_sN', () => {
        const ws = makeWorkspace();
        chainUnderStart(ws, ws.newBlock('pioneer_camera_take_photo'));

        // Ни одного события Ev.* здесь нет вовсе (камера независима от
        // автопилота), поэтому режим плоский: ни __state, ни action[].
        // Пустая ветка `then` — тот же терминальный шаг, что и пустая
        // `if event == Ev.COPTER_LANDED then ... end` у последней посадки.
        expect(compilePioneerWorkspace(ws, 'lua')).toBe(
            '-- @pioneer-blockly v1\n'
            + 'camera.requestMakeShot()\n'
            + 'local function __poll_s0()\n'
            + '    if camera.checkRequestShot() == 1 then\n'
            + '    else\n'
            + '        Timer.callLater(0.05, __poll_s0)\n'
            + '    end\n'
            + 'end\n'
            + 'Timer.callLater(0.05, __poll_s0)\n'
            + '\n'
            + 'function callback(event)\n'
            + 'end\n'
        );
    });

    test('продолжение после снимка попадает ВНУТРЬ ветки готовности, а не на верхний уровень', () => {
        const ws = makeWorkspace();
        chainUnderStart(
            ws,
            ws.newBlock('pioneer_camera_take_photo'),
            ws.newBlock('pioneer_land')
        );

        const code = compilePioneerWorkspace(ws, 'lua');
        // Посадка не должна начаться, пока снимок не сохранён: она обязана
        // оказаться в ветке `if camera.checkRequestShot() == 1 then`, а не
        // строкой ниже запроса снимка.
        expect(code).toContain(
            'local function __poll_s0()\n'
            + '    if camera.checkRequestShot() == 1 then\n'
            + '        ap.push(Ev.MCE_LANDING)\n'
            + '    else\n'
        );
        expect(code).not.toContain('camera.requestMakeShot()\nap.push(Ev.MCE_LANDING)');
    });

    test('два снимка подряд не ломают плоский режим (в отличие от двух одинаковых событий)', () => {
        const ws = makeWorkspace();
        chainUnderStart(
            ws,
            ws.newBlock('pioneer_camera_take_photo'),
            ws.newBlock('pioneer_camera_take_photo')
        );

        const code = compilePioneerWorkspace(ws, 'lua');
        // Две pioneer_go_to подряд откатывают компиляцию в FSM: обе ждут
        // Ev.POINT_REACHED, и плоская ветка не отличила бы первую точку от
        // второй. У опроса такой неоднозначности нет — условие проверяется
        // внутри СВОЕГО замыкания __poll_sN, а не по общему имени события,
        // поэтому режим остаётся плоским (isFlatEligible, targets/lua-fsm.ts).
        expect(code).not.toContain('__state');
        expect(code).not.toContain('action[');
        expect(code).toContain('local function __poll_s0()');
        // Второй опрос объявлен ВНУТРИ ветки готовности первого — иначе оба
        // снимка ушли бы в очередь одновременно.
        expect(code).toContain(
            '    if camera.checkRequestShot() == 1 then\n'
            + '        camera.requestMakeShot()\n'
            + '        local function __poll_s1()\n'
        );
    });

    test('в FSM-режиме опрос печатается в теле состояния и сам двигает __state', () => {
        const ws = makeWorkspace();
        // Две точки подряд (повтор Ev.POINT_REACHED) — единственный способ
        // заставить компилятор выбрать FSM; снимок идёт третьим шагом.
        const first = ws.newBlock('pioneer_go_to');
        const second = ws.newBlock('pioneer_go_to');
        chainUnderStart(ws, first, second, ws.newBlock('pioneer_camera_take_photo'));

        const code = compilePioneerWorkspace(ws, 'lua');
        expect(code).toContain('local __state = "__s0"');
        // Ветки в callback(event) у опроса нет и быть не должно: камера
        // никаких Ev.* не шлёт, переход целиком живёт в теле состояния.
        const callbackBody = code.slice(code.indexOf('function callback(event)'));
        expect(callbackBody).not.toContain('__poll_s2');
        expect(callbackBody).not.toContain('__s3');
        expect(code).toContain(
            'action["__s2"] = function()\n'
            + '  camera.requestMakeShot()\n'
            + '  local function __poll_s2()\n'
            + '      if __state ~= "__s2" then return end\n'
            + '      if camera.checkRequestShot() == 1 then\n'
            + '          __state = "__s3"\n'
            + '          __advance()\n'
            + '      else\n'
            + '          Timer.callLater(0.05, __poll_s2)\n'
            + '      end\n'
            + '  end\n'
            + '  Timer.callLater(0.05, __poll_s2)\n'
            + 'end\n'
        );
    });
});

describe('Python: снимок через get_frame() + загрузку браузером', () => {
    test('кадр берётся get_frame(), а сохраняет его мост — одной записью definitions_', () => {
        const ws = makeWorkspace();
        chainUnderStart(ws, ws.newBlock('pioneer_camera_take_photo'));

        const code = compilePioneerWorkspace(ws, 'python');
        expect(code).toContain('from pioneer_sdk import Camera');
        expect(code).toContain('camera = Camera()');
        expect(code).toContain(
            'def _pioneer_take_photo():\n'
            + '    frame = camera.get_frame()\n'
            + '    if not frame:\n'
            + "        raise RuntimeError('Камера не передала кадр')\n"
            + '    js.pioneer_camera_save_photo(camera._id)'
        );
        expect(code).toContain('\n_pioneer_take_photo()\n');
        // Ожидания в Python-варианте нет вовсе: мост рендерит кадр синхронно,
        // внутри того же вызова (pioneer-js-bridge-camera-render.ts).
        expect(code).not.toContain('while not');
    });

    test('camera = Camera() печатается ТОЛЬКО когда снимок реально используется', () => {
        // Тот же принцип условных хелперов, что у _pioneer_t0/_pioneer_position:
        // Camera() в конструкторе сразу вызывает connect(), и программа без
        // блока камеры не должна подключаться к видеопотоку просто так.
        const wsWithout = makeWorkspace();
        chainUnderStart(wsWithout, wsWithout.newBlock('pioneer_takeoff'));
        const without = compilePioneerWorkspace(wsWithout, 'python');
        expect(without).not.toContain('Camera');
        expect(without).not.toContain('import js');
        expect(without).not.toContain('_pioneer_take_photo');

        const wsWith = makeWorkspace();
        chainUnderStart(wsWith, wsWith.newBlock('pioneer_camera_take_photo'));
        expect(compilePioneerWorkspace(wsWith, 'python')).toContain('camera = Camera()');
    });
});

describe('Поддержка таргетов', () => {
    test('блок поддержан обоими таргетами (в отличие от pioneer_set_manual_speed)', () => {
        expect(isBlockSupported('pioneer_camera_take_photo', 'lua')).toBe(true);
        expect(isBlockSupported('pioneer_camera_take_photo', 'python')).toBe(true);
        expect(isBlockSupported('pioneer_set_manual_speed', 'lua')).toBe(false);
    });
});
