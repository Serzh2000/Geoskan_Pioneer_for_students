import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { installWaitModelGuards } from '../wait-model-guards.js';
import { PY_INDENT, definitionsOf, ensurePythonMathImport, numberArg, requirePythonSimulatorSdk } from './shared.js';

const NUMBER_CHECK = 'Number';

// Курс в Python. У pioneer_sdk yaw — обязательный аргумент
// go_to_local_point(x, y, z, yaw): без него настоящий SDK падает с TypeError.
// А Lua ap.goToLocalPoint курс не трогает — держит тот, что задан последним
// ap.updateYaw. Чтобы блок «Лететь в точку» вёл себя одинаково, Python
// запоминает последний заданный курс в _pioneer_yaw и передаёт его в каждую
// точку. Программе без блоков курса запоминать нечего: курс всегда 0, как
// после взлёта.
const YAW_BLOCK_TYPES = new Set(['pioneer_set_yaw', 'pioneer_go_to_yaw']);

function pythonYaw(gen: Blockly.CodeGenerator, block: Blockly.Block): string {
    const tracksYaw = block.workspace.getAllBlocks(false).some((other) => YAW_BLOCK_TYPES.has(other.type) && other.isEnabled());
    if (!tracksYaw) return '0';
    definitionsOf(gen).pioneer_yaw_state = '_pioneer_yaw = 0';
    return '_pioneer_yaw';
}

function ensurePythonGoToYawHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    definitions.pioneer_yaw_state = '_pioneer_yaw = 0';
    if (definitions.pioneer_go_to_yaw_helper) return;
    const i = PY_INDENT;
    definitions.pioneer_go_to_yaw_helper = [
        'def _pioneer_go_to_yaw(x, y, z, yaw):',
        `${i}global _pioneer_yaw`,
        `${i}_pioneer_yaw = yaw`,
        `${i}pioneer.go_to_local_point(x=x, y=y, z=z, yaw=yaw)`,
        `${i}while not pioneer.point_reached():`,
        `${i}${i}pass`
    ].join('\n');
}

// Python пишется так, как официальные примеры pioneer_sdk: команды подряд,
// без проверок состояния автопилота и таймаутов. arm() и takeoff() — просто
// вызовы (manual_speed.py), точку ждут `while not point_reached(): pass`
// (aruco_flight.py). Автопилот сам держит точку, пока идёт взлёт
// (aruco_flight.py и circle_flight.py шлют её сразу после takeoff()).
function waitForPoint(gen: Blockly.CodeGenerator): string {
    return `while not pioneer.point_reached():\n${gen.INDENT}pass\n`;
}

// После посадки ждать нужно, только если дальше ещё что-то есть: повторный
// arm() во время посадки автопилот отклонит. Последняя посадка программы —
// просто land(), как в примерах. Точки «посадка закончена» у pioneer_sdk нет,
// кроме состояния автопилота.
function landingIsFollowed(block: Blockly.Block): boolean {
    let next = block.getNextBlock();
    while (next && !next.isEnabled()) next = next.getNextBlock();
    return Boolean(next) || block.getSurroundParent() !== null;
}

// pioneer_sdk не умеет менять курс отдельно от полёта (нет аналога
// ap.updateYaw) — держим текущие координаты и переотправляем go_to_local_point
// с новым yaw, затем ждём как обычную точку. get_last_received=True: у
// настоящего SDK без него повторное чтение уже прочитанной позиции даёт None.
function ensurePythonSetYawHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    definitions.pioneer_yaw_state = '_pioneer_yaw = 0';
    if (definitions.pioneer_set_yaw_helper) return;
    const i = PY_INDENT;
    definitions.pioneer_set_yaw_helper = [
        'def _pioneer_set_yaw(yaw):',
        `${i}global _pioneer_yaw`,
        `${i}_pioneer_yaw = yaw`,
        `${i}pos = pioneer.get_local_position_lps(get_last_received=True)`,
        `${i}if pos is None:`,
        `${i}${i}pos = [0, 0, 0]`,
        `${i}pioneer.go_to_local_point(x=pos[0], y=pos[1], z=pos[2], yaw=yaw)`,
        `${i}while not pioneer.point_reached():`,
        `${i}${i}pass`
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
            python: () => 'pioneer.arm()\n'
        },
        apiUsage: { lua: ['ap.push', '__wait_event'], python: ['pioneer.arm'] }
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
            python: () => 'pioneer.takeoff()\n'
        },
        apiUsage: { lua: ['ap.push', '__wait_event'], python: ['pioneer.takeoff'] }
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
                return `pioneer.go_to_local_point(x=${x}, y=${y}, z=${z}, yaw=${pythonYaw(gen, block)})\n${waitForPoint(gen)}`;
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
            python: (block, gen) => (landingIsFollowed(block)
                ? `pioneer.land()\nwhile pioneer.get_autopilot_state() not in ('LANDED', 'DISARMED'):\n${gen.INDENT}pass\n`
                : 'pioneer.land()\n')
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

    // Точка с курсом — как в официальном circle_flight.py
    // (go_to_local_point(x, y, z, yaw=...)). В Lua курс — отдельной командой
    // ap.updateYaw, точка — ap.goToLocalPoint: в сумме то же самое.
    definePioneerBlock({
        type: 'pioneer_go_to_yaw',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('X').setCheck(NUMBER_CHECK).appendField('Лететь в точку X');
            this.appendValueInput('Y').setCheck(NUMBER_CHECK).appendField('Y');
            this.appendValueInput('Z').setCheck(NUMBER_CHECK).appendField('Z');
            this.appendValueInput('YAW').setCheck(NUMBER_CHECK).appendField('м, курс');
            this.appendDummyInput().appendField('°');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Полёт в точку с поворотом на заданный курс и ожидание её достижения.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: (block, gen) => {
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                const yaw = numberArg(gen, block, 'YAW', '0');
                return `ap.updateYaw(math.rad(${yaw}))\nap.goToLocalPoint(${x}, ${y}, ${z})\n__wait_event(Ev.POINT_REACHED)\n`;
            },
            python: (block, gen) => {
                ensurePythonMathImport(gen);
                ensurePythonGoToYawHelper(gen);
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                const yaw = numberArg(gen, block, 'YAW', '0');
                return `_pioneer_go_to_yaw(${x}, ${y}, ${z}, math.radians(${yaw}))\n`;
            }
        },
        apiUsage: {
            lua: ['ap.updateYaw', 'math.rad', 'ap.goToLocalPoint', '__wait_event'],
            python: ['_pioneer_go_to_yaw', 'math.radians', 'pioneer.go_to_local_point', 'pioneer.point_reached']
        }
    });

    // Четвёртый аргумент ap.goToLocalPoint(x, y, z, time) из официальной
    // документации: «время, за которое коптер перейдёт в следующую точку». У
    // pioneer_sdk такого параметра нет, поэтому блок только для Lua.
    definePioneerBlock({
        type: 'pioneer_go_to_time',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('X').setCheck(NUMBER_CHECK).appendField('Лететь в точку X');
            this.appendValueInput('Y').setCheck(NUMBER_CHECK).appendField('Y');
            this.appendValueInput('Z').setCheck(NUMBER_CHECK).appendField('Z');
            this.appendValueInput('TIME').setCheck(NUMBER_CHECK).appendField('м за');
            this.appendDummyInput().appendField('сек');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Полёт в точку за заданное время. Только Lua: у pioneer_sdk нет такого параметра.');
            installWaitModelGuards(this);
        },
        targets: {
            lua: (block, gen) => {
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                const time = numberArg(gen, block, 'TIME', '1');
                return `ap.goToLocalPoint(${x}, ${y}, ${z}, ${time})\n__wait_event(Ev.POINT_REACHED)\n`;
            }
        },
        apiUsage: { lua: ['ap.goToLocalPoint', '__wait_event'] }
    });

    // go_to_local_point_body_fixed из pioneer_sdk: смещение от текущего
    // положения в осях дрона (aruco_flight.py). В Lua API такой команды нет.
    definePioneerBlock({
        type: 'pioneer_go_to_body',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('X').setCheck(NUMBER_CHECK).appendField('Сместиться вправо');
            this.appendValueInput('Y').setCheck(NUMBER_CHECK).appendField('вперёд');
            this.appendValueInput('Z').setCheck(NUMBER_CHECK).appendField('вверх');
            this.appendDummyInput().appendField('м от дрона');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Смещение относительно текущего положения в осях дрона и ожидание его достижения. Только Python: в Lua API такой команды нет.');
            installWaitModelGuards(this);
        },
        targets: {
            python: (block, gen) => {
                const x = numberArg(gen, block, 'X', '0');
                const y = numberArg(gen, block, 'Y', '0');
                const z = numberArg(gen, block, 'Z', '0');
                return `pioneer.go_to_local_point_body_fixed(x=${x}, y=${y}, z=${z}, yaw=0)\n${waitForPoint(gen)}`;
            }
        },
        apiUsage: { python: ['pioneer.go_to_local_point_body_fixed', 'pioneer.point_reached'] }
    });

    definePioneerBlock({
        type: 'pioneer_set_manual_speed_body',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendValueInput('VX').setCheck(NUMBER_CHECK).appendField('Скорость вправо');
            this.appendValueInput('VY').setCheck(NUMBER_CHECK).appendField('вперёд');
            this.appendValueInput('VZ').setCheck(NUMBER_CHECK).appendField('вверх м/с, поворот');
            this.appendValueInput('YAW_RATE').setCheck(NUMBER_CHECK).appendField('°/с');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Ручное управление скоростью в осях дрона (set_manual_speed_body_fixed). Команда действует недолго — повторяйте её в цикле. Только Python.');
        },
        targets: {
            python: (block, gen) => {
                ensurePythonMathImport(gen);
                const vx = numberArg(gen, block, 'VX', '0');
                const vy = numberArg(gen, block, 'VY', '0');
                const vz = numberArg(gen, block, 'VZ', '0');
                const yawRate = numberArg(gen, block, 'YAW_RATE', '0');
                return `pioneer.set_manual_speed_body_fixed(${vx}, ${vy}, ${vz}, math.radians(${yawRate}))\n`;
            }
        },
        apiUsage: { python: ['pioneer.set_manual_speed_body_fixed', 'math.radians'] }
    });

    // Модуль захвата груза. Lua — магнит на пине GPIO, как в официальном
    // example_cargo.lua (PC15 — плата 1.6; на 1.2–1.4 это PC3, на 1.1 — PA1).
    // Python — cargo_grab()/cargo_release() из pioneer_sdk 0.6.1 (GitFlic),
    // которые работают только с Pioneer(simulator=True).
    definePioneerBlock({
        type: 'pioneer_cargo',
        category: 'flight',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Груз:')
                .appendField(new Blockly.FieldDropdown([['захватить', 'GRAB'], ['отпустить', 'RELEASE']]), 'ACTION');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Включает или выключает магнит модуля захвата груза.');
        },
        targets: {
            lua: (block, gen) => {
                definitionsOf(gen).pioneer_cargo_magnet = 'local __magnet = Gpio.new(Gpio.C, 15, Gpio.OUTPUT)';
                return block.getFieldValue('ACTION') === 'GRAB' ? '__magnet:set()\n' : '__magnet:reset()\n';
            },
            python: (block, gen) => {
                requirePythonSimulatorSdk(gen);
                return block.getFieldValue('ACTION') === 'GRAB' ? 'pioneer.cargo_grab()\n' : 'pioneer.cargo_release()\n';
            }
        },
        apiUsage: { lua: ['Gpio.new', '__magnet:set', '__magnet:reset'], python: ['pioneer.cargo_grab', 'pioneer.cargo_release'] }
    });
}
