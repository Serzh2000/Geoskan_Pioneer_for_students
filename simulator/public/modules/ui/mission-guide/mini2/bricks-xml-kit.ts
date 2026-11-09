/**
 * Небольшой сборщик проектов Pioneer Bricks (Blockly XML) для эталонных решений и шаблонов миссий.
 * Типы блоков здесь — родные имена Bricks (start_block, take_off…), как в файлах проектов: редактор сам
 * добавляет им префикс при открытии (`loadBricksProject`).
 */
import { bricksType } from '../../../editor/blockly-mode/bricks/constants.js';
import { allBricksNativeTypes } from '../../../editor/blockly-mode/bricks/block-specs.js';

/** Команда в цепочке: получает XML следующей команды и возвращает свой блок вместе с ней. */
export type Stmt = (next: string) => string;

const esc = (text: string | number) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type BlockParts = {
    fields?: Record<string, string | number>;
    values?: Record<string, string>;
    statements?: Record<string, string>;
    mutation?: string;
};

/** Блок со значением (без «next»). */
export function block(type: string, parts: BlockParts = {}, next = ''): string {
    const mutation = parts.mutation ? `<mutation ${parts.mutation}></mutation>` : '';
    const fields = Object.entries(parts.fields ?? {}).map(([name, value]) => `<field name="${name}">${esc(value)}</field>`).join('');
    const values = Object.entries(parts.values ?? {}).map(([name, xml]) => `<value name="${name}">${xml}</value>`).join('');
    const statements = Object.entries(parts.statements ?? {}).map(([name, xml]) => `<statement name="${name}">${xml}</statement>`).join('');
    return `<block type="${type}">${mutation}${fields}${values}${statements}${next ? `<next>${next}</next>` : ''}</block>`;
}

export const stmt = (type: string, parts: BlockParts = {}): Stmt => (next) => block(type, parts, next);
export const chain = (statements: Stmt[]): string => statements.reduceRight((rest, make) => make(rest), '');

export const num = (value: number) => block('math_number', { fields: { NUM: value } });
export const text = (value: string) => block('text', { fields: { TEXT: value } });
export const colour = (hex: string) => block('field-colour', { fields: { colour: hex } });
export const variable = (name: string) => `<field name="VAR" id="var_${name}">${name}</field>`;
export const getVar = (name: string) => `<block type="variables_get">${variable(name)}</block>`;
export const join = (...parts: string[]) => block('text_join', { mutation: `items="${parts.length}"`, values: Object.fromEntries(parts.map((part, i) => [`ADD${i}`, part])) });
export const compare = (op: 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE', a: string, b: string) => block('logic_compare', { fields: { OP: op }, values: { A: a, B: b } });

// --- команды ---
export const preflight = stmt('preflight');
export const takeOff = stmt('take_off');
export const landing = stmt('landing');
export const waitPoint = stmt('waiting_for_point');
export const sleep = (seconds: number): Stmt => stmt('sleep', { values: { NAME: num(seconds) } });
export const goPoint = (x: number, y: number, z: number, yaw = 0, time = 0): Stmt =>
    stmt('go_local_point', { values: { X: num(x), Y: num(y), Z: num(z), YAW: num(yaw), TIME: num(time) } });
export const speedStart = (x: number, y: number, z: number, w = 0): Stmt =>
    stmt('set_speed_start', { values: { X: num(x), Y: num(y), Z: num(z), W: num(w) } });
export const ledAll = (hex: string): Stmt => stmt('led_all', { values: { COLOR: colour(hex) } });
export const ledIndex = (hex: string, index: string): Stmt => stmt('led_index', { values: { COLOR: colour(hex), NUM: index } });
export const print = (value: string): Stmt => stmt('text_print', { values: { TEXT: value } });
export const servo = (angle: number): Stmt => stmt('servo_set_angle', { fields: { angle } });
export const repeat = (times: number, body: Stmt[]): Stmt => stmt('controls_repeat_ext', { values: { TIMES: num(times) }, statements: { DO: chain(body) } });
export const forRange = (name: string, from: number, to: number, body: Stmt[]): Stmt =>
    (next) => `<block type="controls_for">${variable(name)}<value name="FROM">${num(from)}</value><value name="TO">${num(to)}</value><value name="BY">${num(1)}</value><statement name="DO">${chain(body)}</statement>${next ? `<next>${next}</next>` : ''}</block>`;
export const setVar = (name: string, value: string): Stmt => (next) =>
    `<block type="variables_set">${variable(name)}<value name="VALUE">${value}</value>${next ? `<next>${next}</next>` : ''}</block>`;
export const ifElse = (condition: string, then: Stmt[], otherwise: Stmt[]): Stmt =>
    stmt('controls_if', { mutation: 'else="1"', values: { IF0: condition }, statements: { DO0: chain(then), ELSE: chain(otherwise) } });

// --- значения ---
export const distance = () => block('get_dist_sensor_data');
export const frame = (camera: 'MAIN' | 'OPT') => block('cam_get_cv_frame', { fields: { choice: `CameraType.${camera}` } });

/** Проект Bricks: «Начало программы» и цепочка команд под ним. */
export function project(name: string, statements: Stmt[], variables: string[] = []): string {
    const vars = variables.map((item) => `<variable id="var_${item}">${item}</variable>`).join('');
    return `<xml xmlns="https://developers.google.com/blockly/xml"><project name="${name}" /><variables>${vars}</variables>`
        + `<block type="start_block" deletable="false" movable="false" x="10" y="10">${statements.length ? `<next>${chain(statements)}</next>` : ''}</block></xml>`;
}

/** Типы блоков проекта, как их видит редактор (с префиксом Bricks у блоков Пионера). */
export function editorBlockTypes(xml: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const match of xml.matchAll(/<block type="([^"]+)"/g)) {
        const native = match[1];
        const type = BRICKS_NATIVE.has(native) ? bricksType(native) : native;
        counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts;
}

const BRICKS_NATIVE = new Set(allBricksNativeTypes());
