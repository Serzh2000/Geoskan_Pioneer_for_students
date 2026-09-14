import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { installWaitModelGuards } from '../wait-model-guards.js';

// См. комментарий в blocks/leds.ts: definitions_ протектед у Blockly-генератора.
function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

// Одна запись definitions_ на всю камеру — импорт, объект и хелпер вместе.
// Строку `camera = Camera()` нельзя печатать безусловно рядом с
// `pioneer = Pioneer(simulator=True)` в targets/python-runtime.ts: Camera()
// в конструкторе сразу вызывает connect() (pioneer-sdk-module.ts), то есть
// программа без единого блока камеры подключалась бы к видеопотоку просто так.
// Тот же принцип «печатаем только то, чем пользуемся», что у
// _pioneer_position/_pioneer_set_yaw (§4.4 плана, пересмотрено 2026-09-14).
//
// get_frame() здесь не для красоты: это ровно тот вызов из официального
// примера Geoscan (docs/imported/Python_files/frames_from_camera.py), и он же
// возвращает пустые байты, когда камера ни к чему не подключена — тогда
// ученик видит ошибку в СВОЁМ коде, а не молча пустой файл. Сам снимок
// сохраняет мост (pioneer-js-bridge-camera.ts, downloadDroneCameraPhoto):
// в браузере у ученика нет файловой системы, а cv2.imwrite из того же примера
// в симуляторе — заглушка (pioneer-sdk-cv-prelude.ts). `import js` — цена
// этого: на реальном дроне вместо него была бы строка с cv2.imwrite.
function ensurePythonCameraHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_camera_helper) return;
    definitions.pioneer_camera_helper = [
        'from pioneer_sdk import Camera',
        'import js',
        '',
        'camera = Camera()',
        '',
        'def _pioneer_take_photo():',
        '    frame = camera.get_frame()',
        '    if not frame:',
        "        raise RuntimeError('Камера не передала кадр')",
        '    js.pioneer_camera_save_photo(camera._id)'
    ].join('\n');
}

export function registerCameraBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_camera_take_photo',
        category: 'camera',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Сделать снимок');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#0ea5e9');
            this.setTooltip('Снимок с камеры дрона: файл сохраняется в загрузки браузера. Программа продолжается, когда снимок готов.');
            // Блок модели ожидания, как pioneer_wait: в Lua он режет цепочку
            // на шаги (переход kind: 'poll', см. targets/lua-fsm.ts), а внутри
            // цикла/«если» границу шага поставить некуда — см.
            // wait-in-loop-guard.ts.
            installWaitModelGuards(this);
        },
        targets: {
            // Семантика проверки — местная, симуляторная: camera.checkRequestShot()
            // здесь возвращает 0, пока снимок готовится, и 1, когда готов
            // (modules/lua/hardware/camera.ts), а не -1/0/1 из документации
            // на железо. Генерируем код против того, что реально реализовано.
            lua: () => 'camera.requestMakeShot()\n__wait_poll(camera.checkRequestShot() == 1)\n',
            // В Python ждать нечего: мост рендерит кадр синхронно, внутри того
            // же вызова (pioneer-js-bridge-camera-render.ts) — отдельного
            // «запросили / проверяем готовность» у этого пути нет вовсе.
            python: (block, gen) => {
                ensurePythonCameraHelper(gen);
                return '_pioneer_take_photo()\n';
            }
        },
        apiUsage: {
            lua: ['camera.requestMakeShot', 'camera.checkRequestShot', '__wait_poll'],
            python: ['_pioneer_take_photo', 'camera.get_frame', 'js.pioneer_camera_save_photo']
        }
    });
}
