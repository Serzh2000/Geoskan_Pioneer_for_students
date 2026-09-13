import { getPioneerBlockTypesByCategory } from './registry.js';
import type { PioneerBlockCategory } from './targets/types.js';

// Категории строятся из того, что реально зарегистрировано в pioneer/registry.ts
// (definePioneerBlock), поэтому добавление нового блока в blocks/*.ts не требует
// правки этого файла — только запись в один из объектов ниже, если у блока
// есть числовые/цветовые входы, которым в тулбоксе нужен shadow-блок (§5 плана).
const CATEGORY_LABELS: Record<PioneerBlockCategory, { name: string; colour: string }> = {
    program: { name: 'Программа', colour: '#4b5563' },
    flight: { name: 'Полёт', colour: '#a855f7' },
    time: { name: 'Время', colour: '#f59e0b' },
    leds: { name: 'Светодиоды', colour: '#22c55e' },
    sensors: { name: 'Датчики', colour: '#14b8a6' },
    events: { name: 'События', colour: '#8b5cf6' }
};

const CATEGORY_ORDER: PioneerBlockCategory[] = ['program', 'flight', 'time', 'leds', 'sensors', 'events'];

const NUMBER_SHADOWS: Record<string, Record<string, number>> = {
    pioneer_wait: { SECONDS: 1 },
    pioneer_colour_rgb: { R: 255, G: 0, B: 0 },
    pioneer_go_to: { X: 1, Y: 0, Z: 1 },
    pioneer_set_yaw: { ANGLE: 90 },
    pioneer_led_index: { INDEX: 0 },
    pioneer_set_manual_speed: { VX: 0, VY: 0, VZ: 0, YAW_RATE: 0 }
};

const COLOUR_SHADOWS: Record<string, string[]> = {
    pioneer_led_all: ['COLOUR'],
    pioneer_led_index: ['COLOUR']
};

function numberShadow(value: number): string {
    return `<shadow type="math_number"><field name="NUM">${value}</field></shadow>`;
}

function colourShadow(): string {
    return '<block type="pioneer_colour_preset"></block>';
}

function renderBlock(type: string): string {
    const numberInputs = NUMBER_SHADOWS[type];
    const colourInputs = COLOUR_SHADOWS[type];
    if (!numberInputs && !colourInputs) {
        return `<block type="${type}"></block>`;
    }

    const valueTags: string[] = [];
    if (numberInputs) {
        Object.entries(numberInputs).forEach(([name, value]) => {
            valueTags.push(`<value name="${name}">${numberShadow(value)}</value>`);
        });
    }
    if (colourInputs) {
        colourInputs.forEach((name) => {
            valueTags.push(`<value name="${name}">${colourShadow()}</value>`);
        });
    }
    return `<block type="${type}">${valueTags.join('')}</block>`;
}

function renderCategory(category: PioneerBlockCategory): string {
    const types = getPioneerBlockTypesByCategory(category);
    if (types.length === 0) return '';
    const { name, colour } = CATEGORY_LABELS[category];
    return `<category name="${name}" colour="${colour}">${types.map(renderBlock).join('')}</category>`;
}

const STANDARD_CATEGORIES = `
    <sep></sep>
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
        <block type="controls_flow_statements"></block>
    </category>
    <category name="Числа" colour="#f59e0b">
        <block type="math_number"></block>
        <block type="math_arithmetic"></block>
        <block type="math_single"></block>
        <block type="math_round"></block>
    </category>
    <category name="Текст" colour="#22c55e">
        <block type="text"></block>
        <block type="text_join"></block>
        <block type="text_print"></block>
    </category>
    <category name="Переменные" custom="VARIABLE" colour="#14b8a6"></category>
    <category name="Функции" custom="PROCEDURE" colour="#6366f1"></category>
`;

// Пока не подключён в UI (см. §7 плана, фаза 2, шаг 4) — только для тестов
// и последующего включения в фазе 7.
export function buildPioneerToolbox(): string {
    const categories = CATEGORY_ORDER.map(renderCategory).filter(Boolean).join('');
    return `<xml xmlns="https://developers.google.com/blockly/xml">${categories}${STANDARD_CATEGORIES}</xml>`;
}
