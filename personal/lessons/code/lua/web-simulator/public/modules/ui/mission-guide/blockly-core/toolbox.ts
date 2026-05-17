import type { ScriptLanguage } from '../../api-docs/sections.js';

type ToolboxCategory = {
    name: string;
    colour: string;
    blockTypes: string[];
};

const lessonBlockMap: Record<string, string[]> = {
    'lua-led-single': ['lua_ledbar_new', 'lua_led_set', 'lua_print', 'lua_timer_calllater', 'lua_callback_open', 'lua_callback_end'],
    'lua-led-sequence': ['lua_ledbar_new', 'lua_led_set', 'lua_timer_calllater', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-led-confirm': ['lua_ledbar_new', 'lua_led_set', 'lua_print', 'lua_timer_calllater', 'lua_callback_open', 'lua_callback_end'],
    'lua-led-delayed': ['lua_ledbar_new', 'lua_led_set', 'lua_timer_calllater', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-preflight': ['lua_ap_push', 'lua_event_callback', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-takeoff': ['lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-route': ['lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-point-confirm': ['lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-mission': ['lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'lua-landing': ['lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', 'lua_print', 'lua_callback_open', 'lua_callback_end'],
    'py-led-single': ['py_led_control', 'py_time_sleep', 'py_print', 'py_takeoff'],
    'py-led-sequence': ['py_led_control', 'py_time_sleep', 'py_print', 'py_takeoff'],
    'py-led-confirm': ['py_led_control', 'py_time_sleep', 'py_print'],
    'py-led-delayed': ['py_led_control', 'py_time_sleep', 'py_print'],
    'py-arm': ['py_arm', 'py_print', 'py_takeoff', 'py_land'],
    'py-takeoff': ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_goto_local_point'],
    'py-route': ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_goto_local_point'],
    'py-point-wait': ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_goto_local_point', 'py_wait_point_reached', 'py_print'],
    'py-mission': ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_goto_local_point', 'py_wait_point_reached', 'py_land', 'py_led_control'],
    'py-land': ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_goto_local_point', 'py_wait_point_reached', 'py_land']
};

function getLuaCategories(): ToolboxCategory[] {
    return [
        {
            name: 'Подготовка',
            colour: '#0ea5e9',
            blockTypes: ['lua_ledbar_new', 'lua_ap_push', 'lua_callback_open', 'lua_callback_end']
        },
        {
            name: 'Индикация и лог',
            colour: '#22c55e',
            blockTypes: ['lua_led_set', 'lua_print']
        },
        {
            name: 'Время и события',
            colour: '#f59e0b',
            blockTypes: ['lua_timer_calllater', 'lua_event_callback']
        },
        {
            name: 'Полет',
            colour: '#a855f7',
            blockTypes: ['lua_goto_local_point']
        }
    ];
}

function getPythonCategories(): ToolboxCategory[] {
    return [
        {
            name: 'Подготовка',
            colour: '#0ea5e9',
            blockTypes: ['py_arm', 'py_takeoff', 'py_land']
        },
        {
            name: 'Индикация и лог',
            colour: '#22c55e',
            blockTypes: ['py_led_control', 'py_print']
        },
        {
            name: 'Паузы и ожидание',
            colour: '#f59e0b',
            blockTypes: ['py_time_sleep', 'py_wait_point_reached']
        },
        {
            name: 'Маршрут',
            colour: '#a855f7',
            blockTypes: ['py_goto_local_point']
        }
    ];
}

export function buildGuideToolbox(language: ScriptLanguage, lessonId: string): string {
    const fallbackBlockTypes = (language === 'python' ? getPythonCategories() : getLuaCategories())
        .flatMap((category) => category.blockTypes);
    const allowed = new Set(lessonBlockMap[lessonId] || fallbackBlockTypes);
    const categories = (language === 'python' ? getPythonCategories() : getLuaCategories())
        .map((category) => ({
            ...category,
            blockTypes: category.blockTypes.filter((blockType) => allowed.has(blockType))
        }))
        .filter((category) => category.blockTypes.length > 0);

    return `
        <xml xmlns="https://developers.google.com/blockly/xml">
            ${categories.map((category) => `
                <category name="${category.name}" colour="${category.colour}">
                    ${category.blockTypes.map((blockType) => `<block type="${blockType}"></block>`).join('')}
                </category>
            `).join('')}
        </xml>
    `;
}
