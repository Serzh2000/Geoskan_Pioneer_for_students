/**
 * Короткая запись программ Blockly для примеров: цепочка блоков — массив,
 * числа/строки на входах превращаются в math_number/text, переменные — в
 * variables_get по имени. Результат — JSON-сериализация workspace Blockly
 * (то же, что принимает Blockly.serialization.workspaces.load).
 */
let variables = new Map();

export function resetVariables() {
    variables = new Map();
}

function variableId(name) {
    if (!variables.has(name)) variables.set(name, `var_${variables.size}_${name}`);
    return variables.get(name);
}

function valueBlock(input) {
    if (typeof input === 'number') return { type: 'math_number', fields: { NUM: input } };
    if (typeof input === 'string') return { type: 'text', fields: { TEXT: input } };
    if (typeof input === 'boolean') return { type: 'logic_boolean', fields: { BOOL: input ? 'TRUE' : 'FALSE' } };
    if (Array.isArray(input)) {
        return {
            type: 'lists_create_with',
            extraState: { itemCount: input.length },
            inputs: Object.fromEntries(input.map((item, i) => [`ADD${i}`, { block: valueBlock(item) }]))
        };
    }
    if (input && typeof input === 'object' && 'variable' in input) {
        return { type: 'variables_get', fields: { VAR: { id: variableId(input.variable) } } };
    }
    return toJson(input);
}

// spec: { type, fields, inputs, statements, extraState, x, y }
export function toJson(spec) {
    const json = { type: spec.type };
    if (spec.x !== undefined) json.x = spec.x;
    if (spec.y !== undefined) json.y = spec.y;
    if (spec.fields) {
        json.fields = Object.fromEntries(Object.entries(spec.fields).map(([name, value]) => (
            value && typeof value === 'object' && 'variable' in value
                ? [name, { id: variableId(value.variable) }]
                : [name, value]
        )));
    }
    if (spec.extraState !== undefined) json.extraState = spec.extraState;
    const inputs = {};
    for (const [name, value] of Object.entries(spec.inputs ?? {})) inputs[name] = { block: valueBlock(value) };
    for (const [name, specs] of Object.entries(spec.statements ?? {})) {
        const first = chain(specs);
        if (first) inputs[name] = { block: first };
    }
    if (Object.keys(inputs).length) json.inputs = inputs;
    return json;
}

export function chain(specs) {
    let head;
    for (let i = specs.length - 1; i >= 0; i -= 1) {
        const current = toJson(specs[i]);
        if (head) current.next = { block: head };
        head = current;
    }
    return head;
}

// Весь workspace: «Начало программы» с цепочкой и отдельные верхние блоки (функции,
// таймеры). comment — пояснение к примеру: заметка на рабочей области над программой,
// она ничего не перекрывает и не попадает в код.
export function program(main, topLevel = [], comment) {
    const start = { type: 'pioneer_start', x: 24, y: 24 };
    const body = chain(main);
    if (body) start.next = { block: body };
    const blocks = [start, ...topLevel.map((spec, i) => toJson({ x: 820, y: 24 + i * 220, ...spec }))];
    const workspace = {
        blocks: { languageVersion: 0, blocks },
        variables: Array.from(variables.entries()).map(([name, id]) => ({ name, id }))
    };
    if (comment) {
        workspace.workspaceComments = [{ text: comment, x: 480, y: 24, width: 300, height: 150 }];
    }
    return workspace;
}

// --- сокращения ---------------------------------------------------------
export const preflight = () => ({ type: 'pioneer_preflight' });
export const takeoff = () => ({ type: 'pioneer_takeoff' });
export const land = () => ({ type: 'pioneer_land' });
export const disarm = () => ({ type: 'pioneer_disarm' });
export const wait = (seconds) => ({ type: 'pioneer_wait', inputs: { SECONDS: seconds } });
export const goTo = (x, y, z) => ({ type: 'pioneer_go_to', inputs: { X: x, Y: y, Z: z } });
export const goToYaw = (x, y, z, yaw) => ({ type: 'pioneer_go_to_yaw', inputs: { X: x, Y: y, Z: z, YAW: yaw } });
export const setYaw = (angle) => ({ type: 'pioneer_set_yaw', inputs: { ANGLE: angle } });
export const cargo = (action) => ({ type: 'pioneer_cargo', fields: { ACTION: action } });
export const preset = (name) => ({ type: 'pioneer_colour_preset', fields: { PRESET: name } });
export const rgb = (r, g, b) => ({ type: 'pioneer_colour_rgb', inputs: { R: r, G: g, B: b } });
export const hsv = (h, s, v) => ({ type: 'pioneer_colour_hsv', inputs: { H: h, S: s, V: v } });
export const ledAll = (colour) => ({ type: 'pioneer_led_all', inputs: { COLOUR: colour } });
export const ledIndex = (index, colour) => ({ type: 'pioneer_led_index', inputs: { INDEX: index, COLOUR: colour } });
export const position = (axis) => ({ type: 'pioneer_position', fields: { AXIS: axis } });
export const battery = () => ({ type: 'pioneer_battery' });
export const yawNow = () => ({ type: 'pioneer_yaw' });
export const elapsed = () => ({ type: 'pioneer_time' });
export const waitUntil = (condition) => ({ type: 'pioneer_wait_until', inputs: { CONDITION: condition } });
export const every = (seconds, name, body) => ({ type: 'pioneer_every', fields: { NAME: name }, inputs: { SECONDS: seconds }, statements: { DO: body } });
export const everyStop = (name) => ({ type: 'pioneer_every_stop', fields: { NAME: name } });
export const after = (seconds, body) => ({ type: 'pioneer_after', inputs: { SECONDS: seconds }, statements: { DO: body } });
export const photo = () => ({ type: 'pioneer_camera_take_photo' });
export const onEvent = (event, body) => ({ type: 'pioneer_on_event', fields: { EVENT: event }, statements: { DO: body } });

export const set = (name, value) => ({ type: 'variables_set', fields: { VAR: { variable: name } }, inputs: { VALUE: value } });
export const get = (name) => ({ variable: name });
export const change = (name, delta) => ({ type: 'math_change', fields: { VAR: { variable: name } }, inputs: { DELTA: delta } });
export const repeat = (times, body) => ({ type: 'controls_repeat_ext', inputs: { TIMES: times }, statements: { DO: body } });
export const whileDo = (condition, body) => ({ type: 'controls_whileUntil', fields: { MODE: 'WHILE' }, inputs: { BOOL: condition }, statements: { DO: body } });
export const forRange = (name, from, to, by, body) => ({
    type: 'controls_for', fields: { VAR: { variable: name } }, inputs: { FROM: from, TO: to, BY: by }, statements: { DO: body }
});
export const forEach = (name, list, body) => ({
    type: 'controls_forEach', fields: { VAR: { variable: name } }, inputs: { LIST: list }, statements: { DO: body }
});
export const ifElse = (branches, otherwise) => ({
    type: 'controls_if',
    extraState: { elseIfCount: branches.length - 1, hasElse: Boolean(otherwise) },
    inputs: Object.fromEntries(branches.map(([condition], i) => [`IF${i}`, condition])),
    statements: {
        ...Object.fromEntries(branches.map(([, body], i) => [`DO${i}`, body])),
        ...(otherwise ? { ELSE: otherwise } : {})
    }
});
export const print = (text) => ({ type: 'text_print', inputs: { TEXT: text } });
export const join = (...parts) => ({
    type: 'text_join', extraState: { itemCount: parts.length },
    inputs: Object.fromEntries(parts.map((p, i) => [`ADD${i}`, p]))
});

export const arith = (op, a, b) => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } });
export const add = (a, b) => arith('ADD', a, b);
export const sub = (a, b) => arith('MINUS', a, b);
export const mul = (a, b) => arith('MULTIPLY', a, b);
export const div = (a, b) => arith('DIVIDE', a, b);
export const modulo = (a, b) => ({ type: 'math_modulo', inputs: { DIVIDEND: a, DIVISOR: b } });
export const trig = (op, value) => ({ type: 'math_trig', fields: { OP: op }, inputs: { NUM: value } });
export const randomInt = (from, to) => ({ type: 'math_random_int', inputs: { FROM: from, TO: to } });
export const compare = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: a, B: b } });
export const and = (a, b) => ({ type: 'logic_operation', fields: { OP: 'AND' }, inputs: { A: a, B: b } });
export const item = (list, index) => ({
    type: 'lists_getIndex', fields: { MODE: 'GET', WHERE: 'FROM_START' }, inputs: { VALUE: list, AT: index }
});

export const define = (name, body) => ({
    type: 'procedures_defnoreturn',
    fields: { NAME: name },
    statements: { STACK: body }
});
export const call = (name) => ({ type: 'procedures_callnoreturn', extraState: { name } });
