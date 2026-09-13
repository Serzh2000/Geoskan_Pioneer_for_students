import type { ScriptLanguage } from '../../core/state.js';
import { evConstants } from '../../docs/api-docs-events.js';
import { Blockly, getBlocklyGenerator, initBlocklyDefinitions, ensureBlocklyLoaded, type BlocklyNS } from './loader.js';
import { buildCatalog } from './catalog.js';
import type { ApiCatalogEntry } from './types.js';
import {
    compileMainEditorWorkspace as compileWorkspaceCode
} from './workspace.js';
import { buildPioneerToolbox } from './pioneer/toolbox.js';
import { compilePioneerWorkspace as compilePioneerWorkspaceCode } from './pioneer/targets/compile.js';

// Реэкспорт для тестов и будущей фазы 7 (§7 плана, фаза 2, шаг 4): новая
// система pioneer_* пока не подключена к тулбоксу/компиляции UI напрямую.
export { buildPioneerToolbox };
export const compilePioneerWorkspace = compilePioneerWorkspaceCode;

const LUA_EVENT_CONSTANT_BLOCK = 'lua_event_constant';

let definitionsInitialized = false;
let definitionsLoadPromise: Promise<void> | null = null;
let luaCatalog: ApiCatalogEntry[] = [];
let pythonCatalog: ApiCatalogEntry[] = [];

function buildCallCode(entry: ApiCatalogEntry, args: string): string {
    if (!entry.hasArgs) {
        return `${entry.callHead}()`;
    }
    const finalArgs = args.trim() || entry.defaultArgs;
    return `${entry.callHead}(${finalArgs})`;
}

function defineStatementBlock(entry: ApiCatalogEntry, language: ScriptLanguage): void {
    Blockly.Blocks[entry.type] = {
        init: function() {
            const input = this.appendDummyInput().appendField(entry.callHead);
            if (entry.hasArgs) {
                input
                    .appendField('(')
                    .appendField(new Blockly.FieldTextInput(entry.defaultArgs), 'ARGS')
                    .appendField(')');
            } else {
                input.appendField('()');
            }
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(entry.colour);
            this.setTooltip(entry.doc.desc || entry.key);
        }
    };

    const generator = getBlocklyGenerator(language);
    if (generator) {
        generator.forBlock[entry.type] = function(block: any) {
            const args = entry.hasArgs ? String(block.getFieldValue('ARGS') || '') : '';
            return `${buildCallCode(entry, args)}\n`;
        };
    }
}

function defineLuaEventConstantBlock(): void {
    Blockly.Blocks[LUA_EVENT_CONSTANT_BLOCK] = {
        init: function() {
            this.appendDummyInput()
                .appendField('Ev.')
                .appendField(new Blockly.FieldDropdown(evConstants.map((eventName) => [eventName, eventName] as [string, string])), 'EVENT');
            // Константы событий — числовые идентификаторы FSM: их можно подключать
            // только туда, где ожидается число (аргумент ap.push, сравнение event ==).
            this.setOutput(true, 'Number');
            this.setColour('#a855f7');
            this.setTooltip('Константа события FSM для Lua API.');
        }
    };

    const generator = getBlocklyGenerator('lua');
    if (generator) {
        generator.forBlock[LUA_EVENT_CONSTANT_BLOCK] = function(block: any) {
            return [`Ev.${block.getFieldValue('EVENT')}`, 0] as [string, number];
        };
    }
}

function getCatalog(language: ScriptLanguage): ApiCatalogEntry[] {
    return language === 'lua' ? luaCatalog : pythonCatalog;
}

// Полный список Lua-блоков (учебные + блоки из lua-definitions.ts),
// которые не должны перезаписываться динамическими API-блоками из каталога.
const LUA_FULL_BLOCK_TYPES = [
    // Блоки из lua-definitions.ts (полетные)
    'lua_go_to_local_point',
    'lua_go_to_local_point_bf',
    'lua_takeoff',
    'lua_landing',
    'lua_preflight',
    'lua_engines_disarm',
    'lua_waiting_for_point',
    'lua_not_point_reached',
    'lua_point_reached',
    'lua_update_yaw',
    'lua_set_manual_speed',
    'lua_set_manual_speed_bf',
    // Светодиоды
    'lua_led_all',
    'lua_led_index',
    // Сенсоры
    'lua_get_dist_sensor_data',
    'lua_get_local_position',
    'lua_get_local_velocity',
    'lua_get_pv_by_index',
    'lua_get_time',
    'lua_sleep',
    // Алиасы
    'lua_arm',
    'lua_disarm',
    'lua_takeoff_alias',
    'lua_land_alias',
    'lua_goto_local_point_alias',
    'lua_wait_point_reached',
    'lua_point_reached_alias',
    'lua_get_sensor_distance',
    'lua_get_local_point',
    'lua_get_battery',
    'lua_get_autopilot_state',
    'lua_get_time_alias',
    'lua_print_alias',
    'lua_time_sleep',
    'lua_variables_set_alias',
    'lua_variables_get_alias',
    // Существующие учебные блоки
    'lua_ledbar_new',
    'lua_led_set',
    'lua_timer_calllater',
    'lua_print',
    'lua_ap_push',
    'lua_event_callback',
    'lua_callback_open',
    'lua_callback_end',
    LUA_EVENT_CONSTANT_BLOCK,
    'lua_variables_set',
    'lua_variables_get',
    'lua-callback-stub',
];

// Список учебных блоков, которые не входят в динамический каталог API
// и должны всегда быть доступны в toolbox публичного редактора.
function getCourseBlockTypes(language: ScriptLanguage): string[] {
    if (language === 'lua') {
        return [
            'lua_ledbar_new',
            'lua_led_set',
            'lua_timer_calllater',
            'lua_print',
            'lua_ap_push',
            'lua_event_callback',
            'lua_goto_local_point',
            'lua_callback_open',
            'lua_callback_end'
        ];
    }
    return [
        'py_led_control',
        'py_time_sleep',
        'py_print',
        'py_arm',
        'py_disarm',
        'py_takeoff',
        'py_land',
        'py_goto_local_point',
        'py_wait_point_reached'
    ];
}

// Добавляет в каталог записи для учебных блоков, чтобы они попадали
// в категорию «Учебные блоки» вместе с api-блоками, сгруппированными каталогом.
function extendCatalogWithCourseBlocks(language: ScriptLanguage, catalog: ApiCatalogEntry[]): ApiCatalogEntry[] {
    const courseTypes = new Set(getCourseBlockTypes(language));
    const existing = new Map<string, ApiCatalogEntry>();
    catalog.forEach((entry) => existing.set(entry.type, entry));

    const additions: ApiCatalogEntry[] = [];

    if (language === 'lua') {
        // Учебные Lua-блоки с русскими названиями и тултипами
        const luaCourse: Array<{
            type: string;
            callHead: string;
            hasArgs: boolean;
            defaultArgs: string;
            colour: string;
            desc: string;
            key: string;
        }> = [
            {
                type: 'lua_ledbar_new',
                callHead: 'local leds = Ledbar.new(',
                hasArgs: true,
                defaultArgs: '29',
                colour: '#22c55e',
                desc: 'Инициализирует светодиодную ленту с указанным количеством светодиодов.',
                key: 'lua_ledbar_new'
            },
            {
                type: 'lua_led_set',
                callHead: 'leds:set(',
                hasArgs: true,
                defaultArgs: '0, 1, 0, 0',
                colour: '#22c55e',
                desc: 'Устанавливает цвет указанного светодиода LED-ленты (R, G, B от 0 до 1).',
                key: 'lua_led_set'
            },
            {
                type: 'lua_timer_calllater',
                callHead: 'Timer.callLater(',
                hasArgs: true,
                defaultArgs: '0.5',
                colour: '#f59e0b',
                desc: 'Откладывает выполнение вложенных блоков через указанную задержку (в секундах).',
                key: 'lua_timer_calllater'
            },
            {
                type: 'lua_print',
                callHead: 'print(',
                hasArgs: true,
                defaultArgs: 'сообщение',
                colour: '#160',
                desc: 'Выводит сообщение или значение переменной в консоль. Поддерживает переменные и текстовые строки.',
                key: 'lua_print'
            },
            {
                type: 'lua_ap_push',
                callHead: 'отправить событие автопилоту',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Отправляет событие в автопилот (например, запуск двигателей, взлет, посадка).',
                key: 'lua_ap_push'
            },
            {
                type: 'lua_event_callback',
                callHead: 'если получено событие',
                hasArgs: false,
                defaultArgs: '',
                colour: '#210',
                desc: 'Проверяет, совпадает ли текущее событие с указанным. Используется в функции callback(event).',
                key: 'lua_event_callback'
            },
            {
                type: 'lua_goto_local_point',
                callHead: 'ap.goToLocalPoint(',
                hasArgs: true,
                defaultArgs: '1, 0, 1',
                colour: '#a855f7',
                desc: 'Перемещает дрон к указанной точке в локальной системе координат (координаты в метрах).',
                key: 'lua_goto_local_point'
            },
            {
                type: 'lua_callback_open',
                callHead: 'открыть взаимодействие с автопилотом',
                hasArgs: false,
                defaultArgs: '',
                colour: '#210',
                desc: 'Открывает обязательный обработчик системных событий Lua. Все события приходят через эту функцию.',
                key: 'lua_callback_open'
            },
            {
                type: 'lua_callback_end',
                callHead: 'закрыть взаимодействие с автопилотом',
                hasArgs: false,
                defaultArgs: '',
                colour: '#210',
                desc: 'Закрывает функцию callback(event). Все обработчики событий должны быть внутри этой функции.',
                key: 'lua_callback_end'
            },
            {
                type: LUA_EVENT_CONSTANT_BLOCK,
                callHead: 'Ev.',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Константа события FSM для Lua API.',
                key: 'lua_event_constant'
            }
        ];

        for (const c of luaCourse) {
            if (!existing.has(c.type)) {
                additions.push({
                    key: c.key,
                    doc: { desc: c.desc } as any,
                    type: c.type,
                    category: 'Учебные блоки',
                    colour: c.colour,
                    callHead: c.callHead,
                    defaultArgs: c.defaultArgs,
                    hasArgs: c.hasArgs
                });
            }
        }
    } else {
        // Учебные Python-блоки
        const pyCourse: Array<{
            type: string;
            callHead: string;
            hasArgs: boolean;
            defaultArgs: string;
            colour: string;
            desc: string;
            key: string;
        }> = [
            {
                type: 'py_led_control',
                callHead: 'pioneer.led_control(',
                hasArgs: true,
                defaultArgs: 'led_id=255, r=255, g=0, b=0',
                colour: '#22c55e',
                desc: 'Управление светодиодами дрона Pioneer. Цвет устанавливается в формате RGB (0-255). led_id=255 для всех светодиодов.',
                key: 'py_led_control'
            },
            {
                type: 'py_time_sleep',
                callHead: 'time.sleep(',
                hasArgs: true,
                defaultArgs: '1',
                colour: '#f59e0b',
                desc: 'Приостанавливает выполнение кода на указанное количество секунд.',
                key: 'py_time_sleep'
            },
            {
                type: 'py_print',
                callHead: 'print(',
                hasArgs: true,
                defaultArgs: 'сообщение',
                colour: '#160',
                desc: 'Выводит сообщение или значение переменной в консоль.',
                key: 'py_print'
            },
            {
                type: 'py_arm',
                callHead: 'pioneer.arm()',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Запускает моторы квадрокоптера. Переводит дрон в режим автономного полета.',
                key: 'py_arm'
            },
            {
                type: 'py_disarm',
                callHead: 'pioneer.disarm()',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Отключает моторы квадрокоптера. Используется для безопасной остановки.',
                key: 'py_disarm'
            },
            {
                type: 'py_takeoff',
                callHead: 'pioneer.takeoff()',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Команда взлета. Дрон поднимается на высоту, заданную в параметрах автопилота.',
                key: 'py_takeoff'
            },
            {
                type: 'py_land',
                callHead: 'pioneer.land()',
                hasArgs: false,
                defaultArgs: '',
                colour: '#a855f7',
                desc: 'Команда посадки. Дрон снижается и останавливается на земле.',
                key: 'py_land'
            },
            {
                type: 'py_goto_local_point',
                callHead: 'pioneer.go_to_local_point(',
                hasArgs: true,
                defaultArgs: 'x=1, y=0, z=1, yaw=0',
                colour: '#a855f7',
                desc: 'Перемещает дрон к указанной точке в локальной системе координат (метры). yaw - поворот в радианах.',
                key: 'py_goto_local_point'
            },
            {
                type: 'py_wait_point_reached',
                callHead: 'подождать пока точка достигнута',
                hasArgs: false,
                defaultArgs: '',
                colour: '#f59e0b',
                desc: 'Ожидает, пока дрон достигнет целевой точки. Используется после команды перемещения.',
                key: 'py_wait_point_reached'
            }
        ];

        for (const c of pyCourse) {
            if (!existing.has(c.type)) {
                additions.push({
                    key: c.key,
                    doc: { desc: c.desc } as any,
                    type: c.type,
                    category: 'Учебные блоки',
                    colour: c.colour,
                    callHead: c.callHead,
                    defaultArgs: c.defaultArgs,
                    hasArgs: c.hasArgs
                });
            }
        }
    }

    return [...catalog, ...additions];
}

function renderStandardCategories(language: ScriptLanguage): string {
    // Сенсорные value-блоки определены только для Python (blockly-core/python-definitions.ts)
    const pythonSensorCategory = language === 'python' ? `
        <category name="Сенсоры и данные" colour="#14b8a6">
            <block type="py_get_sensor_distance"></block>
            <block type="py_get_local_point"></block>
            <block type="py_get_battery"></block>
            <block type="py_get_autopilot_state"></block>
        </category>
    ` : '';

    // Категория сенсоров для Lua — показывает блоки из lua-definitions.ts
    const luaSensorCategory = language === 'lua' ? `
        <category name="Датчики и телеметрия" colour="#14b8a6">
            <block type="lua_get_dist_sensor_data"></block>
            <block type="lua_get_local_position"></block>
            <block type="lua_get_local_velocity"></block>
            <block type="lua_get_pv_by_index"></block>
            <block type="lua_get_time"></block>
            <block type="lua_sleep"></block>
            <block type="lua_get_battery"></block>
        </category>
    ` : '';

    // Категория полета для Lua
    const luaFlightCategory = language === 'lua' ? `
        <category name="Полёт" colour="#a855f7">
            <block type="lua_preflight"></block>
            <block type="lua_takeoff"></block>
            <block type="lua_landing"></block>
            <block type="lua_engines_disarm"></block>
            <block type="lua_go_to_local_point"></block>
            <block type="lua_update_yaw"></block>
            <block type="lua_waiting_for_point"></block>
            <block type="lua_not_point_reached"></block>
            <block type="lua_point_reached"></block>
        </category>
    ` : '';

    // Категория светодиодов для Lua
    const luaLedCategory = language === 'lua' ? `
        <category name="Светодиоды" colour="#22c55e">
            <block type="lua_ledbar_new"></block>
            <block type="lua_led_set"></block>
            <block type="lua_led_all"></block>
            <block type="lua_led_index"></block>
        </category>
    ` : '';

    // Категория сервоприводов удалена: в Lua API нет servo/grab-функций,
    // а их блоки больше не определены (раньше это ломало flyout ошибкой
    // «Invalid block definition for type: lua_servo_set_angle»).

    // Категория логики для Lua — блоки из lua-definitions.ts + event constant
    const luaLogicCategory = language === 'lua' ? `
        <category name="Логика и автопилот" colour="#8b5cf6">
            <block type="lua_callback_open"></block>
            <block type="lua_event_callback"></block>
            <block type="lua_ap_push"></block>
            <block type="lua_callback_end"></block>
        </category>
    ` : '';

    return `
        <sep></sep>
        ${luaFlightCategory}
        ${luaLedCategory}
        ${luaSensorCategory}
        <sep></sep>
        ${luaLogicCategory}
        <category name="Логика" colour="#8b5cf6">
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="logic_operation"></block>
            <block type="logic_negate"></block>
            <block type="logic_boolean"></block>
            <block type="logic_ternary"></block>
        </category>
        <category name="Циклы" colour="#ec4899">
            <block type="controls_repeat_ext"></block>
            <block type="controls_whileUntil"></block>
            <block type="controls_for"></block>
            <block type="controls_forEach"></block>
            <block type="controls_flow_statements"></block>
        </category>
        <category name="Числа" colour="#f59e0b">
            <block type="math_number"></block>
            <block type="math_arithmetic"></block>
            <block type="math_single"></block>
            <block type="math_modulo"></block>
            <block type="math_round"></block>
            <block type="math_constrain"></block>
            <block type="math_random_int"></block>
            <block type="math_random_float"></block>
        </category>
        <category name="Списки" colour="#f97316">
            <block type="lists_create_with"></block>
            <block type="lists_repeat"></block>
            <block type="lists_length"></block>
            <block type="lists_isEmpty"></block>
            <block type="lists_getIndex"></block>
            <block type="lists_setIndex"></block>
        </category>
        <category name="Текст" colour="#22c55e">
            <block type="text"></block>
            <block type="text_join"></block>
            <block type="text_length"></block>
            <block type="text_indexOf"></block>
            <block type="text_print"></block>
        </category>
        ${pythonSensorCategory}
        <category name="Переменные" custom="VARIABLE" colour="#14b8a6"></category>
        <category name="Функции" custom="PROCEDURE" colour="#6366f1"></category>
    `;
}

function renderPioneerSdkCategories(): string {
    const category = (name: string, colour: string, types: string[]) => `
        <category name="${name}" colour="${colour}">
            ${types.map((type) => `<block type="${type}"></block>`).join('')}
        </category>`;

    return [
        category('Полет', '#a855f7', [
            'preflight', 'take_off', 'go_local_point', 'go_local_point_body_fixed', 'set_manual_speed',
            'not_point_reached', 'landing', 'engines_disarm', 'close_connection'
        ]),
        category('Сенсоры и координаты', '#14b8a6', [
            'get_local_position_lps', 'get_local_position_component', 'get_dist_sensor_data',
            'get_battery_status', 'get_autopilot_state'
        ]),
        category('Светодиоды', '#22c55e', ['led_all', 'led_index']),
        category('Пульт и Lua-скрипт', '#f59e0b', ['send_rc_channels', 'lua_script_control']),
        category('Камера', '#06b6d4', ['camera_connect', 'camera_disconnect', 'camera_connected', 'camera_get_frame', 'cam_get_cv_frame']),
        category('Видеопоток', '#06b6d4', ['video_stream_start', 'video_stream_stop', 'video_stream_connected']),
        category('Время', '#f59e0b', ['sleep', 'get_time']),
        `<sep></sep>`,
        `<category name="Логика" colour="#8b5cf6">
            <block type="controls_if"></block><block type="logic_compare"></block><block type="logic_operation"></block>
            <block type="logic_negate"></block><block type="logic_boolean"></block>
        </category>`,
        `<category name="Циклы" colour="#ec4899">
            <block type="controls_repeat_ext"></block><block type="controls_whileUntil"></block>
            <block type="controls_for"></block><block type="controls_flow_statements"></block>
        </category>`,
        `<category name="Числа" colour="#f59e0b">
            <block type="math_number"></block><block type="math_arithmetic"></block><block type="math_single"></block>
        </category>`,
        `<category name="Цвет" colour="#22c55e"><block type="colour_picker"></block></category>`,
        `<category name="Текст" colour="#22c55e"><block type="text"></block><block type="text_print"></block></category>`,
        `<category name="Списки" colour="#f97316"><block type="lists_create_with"></block><block type="lists_getIndex"></block></category>`,
        `<category name="Переменные" custom="VARIABLE" colour="#14b8a6"></category>`,
        `<category name="Функции" custom="PROCEDURE" colour="#6366f1"></category>`
    ].join('');
}

// Единственная точка входа, которую должны ждать все вызывающие стороны
// (ensureBlocklyWorkspace в workspace-controller.ts) перед тем, как трогать
// Blockly.* синхронно. buildMainEditorToolbox/compileMainEditorWorkspace ниже
// сами по себе синхронны и полагаются на то, что вызывающая сторона это уже сделала.
export function ensureEditorBlocklyDefinitions(): Promise<void> {
    if (definitionsInitialized) return Promise.resolve();
    if (!definitionsLoadPromise) {
        definitionsLoadPromise = Promise.all([
            ensureBlocklyLoaded(),
            import('./lua-definitions.js')
        ]).then(([, luaDefinitions]) => {
            definitionsInitialized = true;

            initBlocklyDefinitions();

            // Регистрируем полный набор Lua-блоков из lua-definitions.ts
            // перед построением каталога, чтобы динамические API-блоки не перезаписали их.
            luaDefinitions.registerLuaEditorBlocklyDefinitions();

            luaCatalog = buildCatalog('lua');
            pythonCatalog = buildCatalog('python');

            // Расширяем каталог учебными блоками, чтобы они группировались в отдельную категорию
            const luaCatalogWithCourse = extendCatalogWithCourseBlocks('lua', luaCatalog);
            const pythonCatalogWithCourse = extendCatalogWithCourseBlocks('python', pythonCatalog);

            // Защита: блоки из LUA_FULL_BLOCK_TYPES уже зарегистрированы в lua-definitions.ts
            // и не должны быть перезаписаны динамическими версиями из каталога API.
            // Динамические блоки создаём только для типов, которых нет в полном наборе Lua-блоков.
            const luaProtectedTypes = new Set(LUA_FULL_BLOCK_TYPES);
            luaCatalogWithCourse.forEach((entry) => {
                if (!luaProtectedTypes.has(entry.type)) {
                    defineStatementBlock(entry, 'lua');
                }
            });
            pythonCatalogWithCourse.forEach((entry) => {
                if (!getCourseBlockTypes('python').includes(entry.type)) {
                    defineStatementBlock(entry, 'python');
                }
            });

            defineLuaEventConstantBlock();
        });
    }
    return definitionsLoadPromise;
}

export function buildMainEditorToolbox(language: ScriptLanguage): string {
    if (language === 'python') {
        return `
            <xml xmlns="https://developers.google.com/blockly/xml">
                ${renderPioneerSdkCategories()}
            </xml>
        `;
    }

    // Для Lua используем категории, аналогичные Python, но с Lua-блоками из lua-definitions.ts
    return `
        <xml xmlns="https://developers.google.com/blockly/xml">
            ${renderStandardCategories('lua')}
        </xml>
    `;
}

export function compileMainEditorWorkspace(language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg): string {
    return compileWorkspaceCode(language, workspace);
}
