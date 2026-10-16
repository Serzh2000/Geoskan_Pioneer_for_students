import { getPioneerBlockTypesByCategory, isBlockSupported } from './registry.js';
import { UNSUPPORTED_TARGET_REASON } from './disable-reasons.js';
import type { PioneerBlockCategory, PioneerTarget } from './targets/types.js';

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
    camera: { name: 'Камера', colour: '#0ea5e9' },
    events: { name: 'События', colour: '#8b5cf6' },
    scene: { name: 'Сцена', colour: '#64748b' }
};

// Камера идёт после датчиков: это тоже «что дрон видит/меряет», а не команда
// полёта, но в отличие от датчиков она блок-действие, а не значение. События
// остаются последними — они про устройство программы, а не про дрон.
const CATEGORY_ORDER: PioneerBlockCategory[] = ['program', 'flight', 'time', 'leds', 'sensors', 'camera', 'events', 'scene'];

const NUMBER_SHADOWS: Record<string, Record<string, number>> = {
    pioneer_wait: { SECONDS: 1 },
    pioneer_colour_rgb: { R: 255, G: 0, B: 0 },
    pioneer_go_to: { X: 1, Y: 0, Z: 1 },
    pioneer_set_yaw: { ANGLE: 90 },
    pioneer_led_index: { INDEX: 0 },
    pioneer_set_manual_speed: { VX: 0, VY: 0, VZ: 0, YAW_RATE: 0 },
    pioneer_set_manual_speed_body: { VX: 0, VY: 0, VZ: 0, YAW_RATE: 0 },
    pioneer_go_to_yaw: { X: 1, Y: 0, Z: 1, YAW: 90 },
    pioneer_go_to_time: { X: 1, Y: 0, Z: 1, TIME: 5 },
    pioneer_go_to_body: { X: 1, Y: 0, Z: 0 },
    pioneer_every: { SECONDS: 0.1 },
    pioneer_after: { SECONDS: 1 },
    pioneer_colour_hsv: { H: 120, S: 100, V: 100 },
    pioneer_vehicle_speed: { SPEED: 1 }
};

// Текстовые входы (имя транспорта на сцене).
const TEXT_SHADOWS: Record<string, Record<string, string>> = {
    pioneer_vehicle_run: { NAME: 'Поезд' },
    pioneer_vehicle_speed: { NAME: 'Поезд' }
};

// Условие «Ждать, пока» — сравнение, которое остаётся только дополнить.
const CONDITION_SHADOWS: Record<string, string[]> = {
    pioneer_wait_until: ['CONDITION']
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

// Атрибут XML — 'disabled-reasons', а не 'disabled="true"' (§6 плана, фаза 6,
// шаг 2: "выбрать то, что работает в Blockly 12, и описать выбор в PR").
// 'disabled="true"' записал бы встроенную причину MANUALLY_DISABLED, которую
// applyPioneerTargetToWorkspace() (target-support.ts) не отслеживает и не
// умеет снимать — блок, вытянутый из flyout, остался бы отключён навсегда
// даже после переключения на поддерживаемый таргет. 'disabled-reasons'
// сразу проставляет ИМЕННО UNSUPPORTED_TARGET_REASON, поэтому дальнейший
// пересчёт таргета работает с тем же блоком без дополнительной синхронизации.
function disabledAttribute(type: string, target: PioneerTarget | undefined): string {
    if (!target || isBlockSupported(type, target)) return '';
    return ` disabled-reasons="${UNSUPPORTED_TARGET_REASON}"`;
}

function renderBlock(type: string, target?: PioneerTarget): string {
    const numberInputs = NUMBER_SHADOWS[type];
    const colourInputs = COLOUR_SHADOWS[type];
    const textInputs = TEXT_SHADOWS[type];
    const conditionInputs = CONDITION_SHADOWS[type];
    const disabledAttr = disabledAttribute(type, target);
    if (!numberInputs && !colourInputs && !textInputs && !conditionInputs) {
        return `<block type="${type}"${disabledAttr}></block>`;
    }

    const valueTags: string[] = [];
    Object.entries(textInputs ?? {}).forEach(([name, value]) => {
        valueTags.push(`<value name="${name}"><shadow type="text"><field name="TEXT">${value}</field></shadow></value>`);
    });
    (conditionInputs ?? []).forEach((name) => {
        valueTags.push(`<value name="${name}"><block type="logic_compare"><field name="OP">GT</field>`
            + `<value name="B">${numberShadow(0)}</value></block></value>`);
    });
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
    return `<block type="${type}"${disabledAttr}>${valueTags.join('')}</block>`;
}

function renderCategory(category: PioneerBlockCategory, target?: PioneerTarget): string {
    const types = getPioneerBlockTypesByCategory(category);
    if (types.length === 0) return '';
    const { name, colour } = CATEGORY_LABELS[category];
    const blocks = types.map((type) => renderBlock(type, target)).join('');
    return `<category name="${name}" colour="${colour}">${blocks}</category>`;
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
        <block type="controls_forEach"></block>
        <block type="controls_flow_statements"></block>
    </category>
    <category name="Числа" colour="#f59e0b">
        <block type="math_number"></block>
        <block type="math_arithmetic"></block>
        <block type="math_single"></block>
        <block type="math_trig"></block>
        <block type="math_constant"></block>
        <block type="math_number_property"></block>
        <block type="math_round"></block>
        <block type="math_modulo"></block>
        <block type="math_constrain"></block>
        <block type="math_random_int"></block>
        <block type="math_random_float"></block>
    </category>
    <category name="Текст" colour="#22c55e">
        <block type="text"></block>
        <block type="text_join"></block>
        <block type="text_length"></block>
        <block type="text_print"></block>
    </category>
    <category name="Списки" colour="#0d9488">
        <block type="lists_create_with"></block>
        <block type="lists_create_with"><mutation items="0"></mutation></block>
        <block type="lists_repeat"></block>
        <block type="lists_length"></block>
        <block type="lists_isEmpty"></block>
        <block type="lists_getIndex"></block>
        <block type="lists_setIndex"></block>
        <block type="lists_indexOf"></block>
    </category>
    <category name="Переменные" custom="VARIABLE" colour="#14b8a6"></category>
    <category name="Функции" custom="PROCEDURE" colour="#6366f1"></category>
`;

// target не задан — тулбокс без отключённых блоков (используется в тестах
// фаз 1-3, где таргет ещё не имеет значения). buildMainEditorToolbox()
// (index.ts, фаза 7) всегда передаёт текущий язык компиляции.
export function buildPioneerToolbox(target?: PioneerTarget): string {
    const categories = CATEGORY_ORDER.map((category) => renderCategory(category, target)).filter(Boolean).join('');
    return `<xml xmlns="https://developers.google.com/blockly/xml">${categories}${STANDARD_CATEGORIES}</xml>`;
}
