import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { installWaitModelGuards } from '../wait-model-guards.js';

const NUMBER_CHECK = 'Number';

function numberArg(gen: Blockly.CodeGenerator, block: Blockly.Block, name: string, fallback: string): string {
    return gen.valueToCode(block, name, 0) || fallback;
}

// См. комментарий в blocks/leds.ts: definitions_ протектед у Blockly-генератора.
function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

// Опрос состояния — прямым инлайновым while, без общего хелпера с таймаутом
// и сообщением об ошибке (§4.4 плана, пересмотрено 2026-09-14 повторно):
// владелец сравнил сгенерированный код с официальными примерами Geoscan
// (там везде `while not pioneer.point_reached(): time.sleep(0.1)` без
// таймаута) и явно попросил визуально облегчить ожидание, приняв риск
// зависания скрипта, если состояние по какой-то причине не наступит —
// то же самое приняли и авторы официальных примеров.
//
// Условия для ARMED/MISSION/DISARMED взяты из маппинга get_autopilot_state()
// в pioneer-js-bridge.ts (~стр. 205): PREFLIGHT -> ARMED, (FLYING_HOVER|
// FLYING_MOVING) -> MISSION, IDLE -> DISARMED. Так что "взлёт завершён" — это
// переход в MISSION, а не в отдельное состояние TAKEOFF.
//
// Обязательный первый time.sleep(...) ДО проверки условия — не косметика.
// pioneer.arm() синхронно переводит дрон в состояние PREFLIGHT, а
// get_autopilot_state() маппит PREFLIGHT прямо в 'ARMED' (pioneer-js-bridge.ts,
// ~стр. 209) — то есть условие "armed" истинно уже на первой проверке, ДО
// того, как пройдёт хоть один реальный тик. Без гарантированного sleep()
// перед проверкой pioneer.takeoff() выполнился бы в тот же тик, что и
// pioneer.arm(), и рантайм симулятора кидает по этому поводу настоящее
// исключение: "CRITICAL ERROR: Commands ... run at the same time" (см.
// fsm-internals.ts:failSimultaneousCommands, recordTickCommand). Тот же риск
// был и у прежнего общего _pioneer_wait(...) — просто никто не запускал
// Python-сценарий с preflight+takeoff подряд вживую в браузере, пока
// владелец не поймал это на реальном запуске.
//
// Интервал 0.1, а не 0.05: проверено вживую в браузере — 0.05 реального
// времени слишком коротко, чтобы физический тик симулятора (current_time,
// physics/index.ts) успел продвинуться хотя бы на шаг между time.sleep() и
// следующей проверкой/командой, и ошибка "run at the same time" всё равно
// периодически возникает. 0.1 надёжно работает и совпадает с интервалом в
// официальных примерах Geoscan (`while not pioneer.point_reached():
// time.sleep(0.1)`).
function pollWhile(conditionCall: string): string {
    return `time.sleep(0.1)\nwhile not ${conditionCall}:\n    time.sleep(0.1)\n`;
}

// math.radians нужен только pioneer_set_yaw/pioneer_set_manual_speed — печатаем
// import через definitions_ тем же ключом ('import_math'), каким сама
// pythonGenerator помечает свои условные импорты (см. её math_number/
// math_atan2/math_random_int: definitions_.import_math = 'import math').
// Это не изобретённый нами механизм, а существующая конвенция generators/python.
function ensurePythonMathImport(gen: Blockly.CodeGenerator): void {
    definitionsOf(gen).import_math = 'import math';
}

// pioneer_sdk не умеет менять курс отдельно от полёта (нет аналога
// ap.updateYaw) — держим текущие координаты и переотправляем go_to_local_point
// с новым yaw, затем ждём как обычную точку (§5 плана: "проверить в
// симуляторе, что поведение совпадает" с Lua — остаётся ручной проверке).
function ensurePythonSetYawHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_set_yaw_helper) return;
    definitions.pioneer_set_yaw_helper = [
        'def _pioneer_set_yaw(yaw):',
        '    pos = pioneer.get_local_position_lps()',
        '    if pos is None:',
        '        pos = [0, 0, 0]',
        '    pioneer.go_to_local_point(x=pos[0], y=pos[1], z=pos[2], yaw=yaw)',
        // go_to_local_point — тоже команда, охраняемая проверкой "не в один
        // тик" (см. pollWhile выше) — тот же обязательный sleep до проверки.
        '    time.sleep(0.1)',
        '    while not pioneer.point_reached():',
        '        time.sleep(0.1)'
    ].join('\n');
}

export function registerFlightBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_preflight',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Запустить моторы');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Подготовка к полёту: запускает моторы и ждёт готовности.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: () => 'ap.push(Ev.MCE_PREFLIGHT)\n__wait_event(Ev.ENGINES_STARTED)\n',
            python: () => `pioneer.arm()\n${pollWhile("pioneer.get_autopilot_state() == 'ARMED'")}`
        },
        apiUsage: { lua: ['ap.push', '__wait_event'], python: ['pioneer.arm', 'pioneer.get_autopilot_state'] }
    });

    definePioneerBlock({
        type: 'pioneer_takeoff',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Взлететь');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Взлёт и ожидание набора высоты.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: () => 'ap.push(Ev.MCE_TAKEOFF)\n__wait_event(Ev.TAKEOFF_COMPLETE)\n',
            python: () => `pioneer.takeoff()\n${pollWhile("pioneer.get_autopilot_state() == 'MISSION'")}`
        },
        apiUsage: { lua: ['ap.push', '__wait_event'], python: ['pioneer.takeoff', 'pioneer.get_autopilot_state'] }
    });

    definePioneerBlock({
        type: 'pioneer_go_to',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('X').setCheck(NUMBER_CHECK).appendField('Лететь в точку X');
            this.appendValueInput('Y').setCheck(NUMBER_CHECK).appendField('Y');
            this.appendValueInput('Z').setCheck(NUMBER_CHECK).appendField('Z');
            this.appendDummyInput().appendField('м');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Полёт в точку локальной системы координат и ожидание её достижения.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: (block, gen) => {
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                return `ap.goToLocalPoint(${x}, ${y}, ${z})\n__wait_event(Ev.POINT_REACHED)\n`;
            },
            python: (block, gen) => {
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                return `pioneer.go_to_local_point(x=${x}, y=${y}, z=${z})\n${pollWhile('pioneer.point_reached()')}`;
            }
        },
        apiUsage: {
            lua: ['ap.goToLocalPoint', '__wait_event'],
            python: ['pioneer.go_to_local_point', 'pioneer.point_reached']
        }
    });

    definePioneerBlock({
        type: 'pioneer_set_yaw',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('ANGLE').setCheck(NUMBER_CHECK).appendField('Повернуться на курс');
            this.appendDummyInput().appendField('°');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Поворот на заданный курс (угол в градусах).');
        },
        targets: {
            // ap.updateYaw принимает радианы (§2 плана) — блок хранит градусы.
            lua: (block, gen) => `ap.updateYaw(math.rad(${numberArg(gen, block, 'ANGLE', '0')}))\n`,
            // В pioneer_sdk нет отдельного set_yaw: поворот делаем через
            // go_to_local_point в текущие координаты с новым yaw (§5 плана,
            // "проверить в симуляторе, что поведение совпадает" с Lua).
            python: (block, gen) => {
                ensurePythonMathImport(gen);
                ensurePythonSetYawHelper(gen);
                return `_pioneer_set_yaw(math.radians(${numberArg(gen, block, 'ANGLE', '0')}))\n`;
            }
        },
        apiUsage: {
            lua: ['ap.updateYaw', 'math.rad'],
            python: ['_pioneer_set_yaw', 'math.radians', 'pioneer.point_reached', 'pioneer.get_local_position_lps', 'pioneer.go_to_local_point']
        }
    });

    definePioneerBlock({
        type: 'pioneer_land',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Приземлиться');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Посадка и ожидание касания земли.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: () => 'ap.push(Ev.MCE_LANDING)\n__wait_event(Ev.COPTER_LANDED)\n',
            python: () => `pioneer.land()\n${pollWhile("pioneer.get_autopilot_state() == 'DISARMED'")}`
        },
        apiUsage: { lua: ['ap.push', '__wait_event'], python: ['pioneer.land', 'pioneer.get_autopilot_state'] }
    });

    definePioneerBlock({
        type: 'pioneer_disarm',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Выключить моторы');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Выключает моторы дрона.');
        },
        targets: {
            lua: () => 'ap.push(Ev.ENGINES_DISARM)\n',
            python: () => 'pioneer.disarm()\n'
        },
        apiUsage: { lua: ['ap.push'], python: ['pioneer.disarm'] }
    });

    definePioneerBlock({
        type: 'pioneer_set_manual_speed',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('VX').setCheck(NUMBER_CHECK).appendField('Скорость Vx');
            this.appendValueInput('VY').setCheck(NUMBER_CHECK).appendField('Vy');
            this.appendValueInput('VZ').setCheck(NUMBER_CHECK).appendField('Vz м/с, поворот');
            this.appendValueInput('YAW_RATE').setCheck(NUMBER_CHECK).appendField('°/с');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Ручное управление скоростью. Доступно только в Python — в Lua API симулятора нет ap.setManualSpeed (см. §2 плана).');
        },
        targets: {
            // Только Python: в Lua-рантайме симулятора нет ap.setManualSpeed
            // (проверено в §2 плана) — генератор для 'lua' не регистрируем,
            // блок остаётся неподдержан для этого таргета (см. фазу 6).
            python: (block, gen) => {
                ensurePythonMathImport(gen);
                const vx = numberArg(gen, block, 'VX', '0');
                const vy = numberArg(gen, block, 'VY', '0');
                const vz = numberArg(gen, block, 'VZ', '0');
                const yawRate = numberArg(gen, block, 'YAW_RATE', '0');
                return `pioneer.set_manual_speed(${vx}, ${vy}, ${vz}, math.radians(${yawRate}))\n`;
            }
        },
        apiUsage: { python: ['pioneer.set_manual_speed', 'math.radians'] }
    });
}
