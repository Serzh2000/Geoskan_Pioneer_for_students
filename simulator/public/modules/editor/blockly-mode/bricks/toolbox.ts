import { BRICKS_DRONE_ONLY_REASON, bricksType } from './constants.js';
import {
    BRICKS_CATEGORY_COLOUR,
    BRICKS_CATEGORY_LABEL,
    PAINT_OBJECT_TYPE,
    bricksSpecsByCategory,
    type BricksBlockSpec,
    type BricksCategory,
    type BricksPart,
    type BricksShadow
} from './block-specs.js';

/*
 * Тулбокс Bricks: категории в том же порядке, что в палитре Pioneer Bricks - стандартные блоки Blockly
 * (Текст, Логика, Циклы, Математика, Функции, Переменные, Массивы), затем блоки Пионера:
 * Полёт, Модули, Камера, ИИ, Компьютерное зрение, Прочее.
 */

const STANDARD_BEFORE = `
    <category name="Текст" colour="#5ba58c">
        <block type="text"></block>
        <block type="text_join"></block>
        <block type="text_append"></block>
        <block type="text_length"></block>
        <block type="text_isEmpty"></block>
        <block type="text_indexOf"></block>
        <block type="text_charAt"></block>
        <block type="text_getSubstring"></block>
        <block type="text_changeCase"></block>
        <block type="text_trim"></block>
        <block type="text_print"></block>
        <block type="text_count"></block>
        <block type="text_replace"></block>
    </category>
    <category name="Логика" colour="#5b80a5">
        <block type="controls_if"></block>
        <block type="logic_compare"></block>
        <block type="logic_operation"></block>
        <block type="logic_negate"></block>
        <block type="logic_boolean"></block>
        <block type="logic_null"></block>
        <block type="logic_ternary"></block>
    </category>
    <category name="Циклы" colour="#5ba55b">
        <block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
        <block type="controls_whileUntil"></block>
        <block type="controls_for">
            <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
            <value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
            <value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
        </block>
        <block type="controls_forEach"></block>
        <block type="controls_flow_statements"></block>
    </category>
    <category name="Математика" colour="#5b67a5">
        <block type="math_number"></block>
        <block type="math_arithmetic"></block>
        <block type="math_single"></block>
        <block type="math_constant"></block>
        <block type="math_number_property"></block>
        <block type="math_round"></block>
        <block type="math_trig"></block>
        <block type="math_on_list"></block>
        <block type="math_modulo"></block>
        <block type="math_constrain"></block>
        <block type="math_random_int"></block>
        <block type="math_random_float"></block>
    </category>
    <category name="Функции" custom="PROCEDURE" colour="#995ba5"></category>
    <category name="Переменные" custom="VARIABLE" colour="#a55b80"></category>
    <category name="Массивы" colour="#745ba5">
        <block type="lists_create_with"></block>
        <block type="lists_create_with"><mutation items="0"></mutation></block>
        <block type="lists_repeat"></block>
        <block type="lists_length"></block>
        <block type="lists_isEmpty"></block>
        <block type="lists_indexOf"></block>
        <block type="lists_getIndex"></block>
        <block type="lists_setIndex"></block>
        <block type="lists_getSublist"></block>
        <block type="lists_sort"></block>
    </category>
`;

function shadowXml(shadow: BricksShadow): string {
    return shadow.type === 'math_number'
        ? `<shadow type="math_number"><field name="NUM">${shadow.value}</field></shadow>`
        : `<shadow type="text"><field name="TEXT">${shadow.value}</field></shadow>`;
}

function inputsOf(spec: BricksBlockSpec): Array<Extract<BricksPart, { input: string }>> {
    return spec.parts.filter((part): part is Extract<BricksPart, { input: string }> => typeof part === 'object' && 'input' in part);
}

function renderBlock(spec: BricksBlockSpec): string {
    const shadows = inputsOf(spec)
        .filter((part) => part.shadow)
        .map((part) => `<value name="${part.input}">${shadowXml(part.shadow as BricksShadow)}</value>`)
        .join('');
    // Атрибут disabled-reasons, а не disabled="true": причину потом снимает и пересчитывает код редактора.
    const disabled = spec.droneOnly ? ` disabled-reasons="${BRICKS_DRONE_ONLY_REASON}"` : '';
    return `<block type="${bricksType(spec.type)}"${disabled}>${shadows}</block>`;
}

function renderCategory(category: BricksCategory): string {
    const specs = bricksSpecsByCategory(category);
    // «Нарисовать …» - блок камеры, но стоит после «Сохранить в файл кадр», как в палитре Bricks.
    const blocks = specs.map((spec) => {
        const html = renderBlock(spec);
        return category === 'camera' && spec.type === 'imwrite' ? `${html}<block type="${PAINT_OBJECT_TYPE}"></block>` : html;
    });
    return `<category name="${BRICKS_CATEGORY_LABEL[category]}" colour="${BRICKS_CATEGORY_COLOUR[category]}">${blocks.join('')}</category>`;
}

/** Тулбокс (XML) блоков Bricks для Пионера Мини 2. */
export function buildBricksToolbox(): string {
    const categories = (['flight', 'modules', 'camera', 'ai', 'vision', 'other'] as BricksCategory[]).map(renderCategory).join('');
    return `<xml xmlns="https://developers.google.com/blockly/xml">${STANDARD_BEFORE}${categories}</xml>`;
}
