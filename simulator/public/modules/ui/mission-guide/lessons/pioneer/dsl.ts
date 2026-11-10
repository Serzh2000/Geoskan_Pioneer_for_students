/**
 * Короткая запись программ из блоков Pioneer для уроков: цепочка блоков — массив,
 * числа и строки на входах превращаются в math_number/text, переменные — в
 * variables_get по имени. Результат — JSON-сериализация рабочей области Blockly
 * (то, что принимает Blockly.serialization.workspaces.load).
 */
export type BlockJson = {
    type: string;
    x?: number;
    y?: number;
    fields?: Record<string, unknown>;
    inputs?: Record<string, { block: BlockJson }>;
    next?: { block: BlockJson };
    extraState?: unknown;
};

export type WorkspaceJson = {
    blocks: { languageVersion: number; blocks: BlockJson[] };
    variables: Array<{ name: string; id: string }>;
};

export type Variable = { variable: string };
export type Input = Spec | number | string | boolean | Input[] | Variable;
export type Spec = {
    type: string;
    x?: number;
    y?: number;
    fields?: Record<string, unknown>;
    inputs?: Record<string, Input>;
    statements?: Record<string, Spec[]>;
    extraState?: unknown;
};

let variables = new Map<string, string>();

function variableId(name: string): string {
    if (!variables.has(name)) variables.set(name, `var_${variables.size}_${name}`);
    return variables.get(name) as string;
}

function isVariable(value: unknown): value is Variable {
    return typeof value === 'object' && value !== null && 'variable' in value;
}

function valueBlock(input: Input): BlockJson {
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
    if (isVariable(input)) return { type: 'variables_get', fields: { VAR: { id: variableId(input.variable) } } };
    return toJson(input);
}

export function toJson(spec: Spec): BlockJson {
    const json: BlockJson = { type: spec.type };
    if (spec.x !== undefined) json.x = spec.x;
    if (spec.y !== undefined) json.y = spec.y;
    if (spec.fields) {
        json.fields = Object.fromEntries(Object.entries(spec.fields).map(([name, value]) => (
            isVariable(value) ? [name, { id: variableId(value.variable) }] : [name, value]
        )));
    }
    if (spec.extraState !== undefined) json.extraState = spec.extraState;
    const inputs: Record<string, { block: BlockJson }> = {};
    for (const [name, value] of Object.entries(spec.inputs ?? {})) inputs[name] = { block: valueBlock(value) };
    for (const [name, specs] of Object.entries(spec.statements ?? {})) {
        const first = chain(specs);
        if (first) inputs[name] = { block: first };
    }
    if (Object.keys(inputs).length) json.inputs = inputs;
    return json;
}

export function chain(specs: Spec[]): BlockJson | undefined {
    let head: BlockJson | undefined;
    for (let i = specs.length - 1; i >= 0; i -= 1) {
        const current = toJson(specs[i]);
        if (head) current.next = { block: head };
        head = current;
    }
    return head;
}

/** Рабочая область: «Начало программы» с цепочкой и отдельные верхние блоки (функции, таймеры). */
export function program(main: Spec[], topLevel: Spec[] = []): WorkspaceJson {
    variables = new Map();
    const start: BlockJson = { type: 'pioneer_start', x: 12, y: 12 };
    const body = chain(main);
    if (body) start.next = { block: body };
    // Отдельные блоки стоят ниже цепочки; точное место им даёт cleanUp() при показе, здесь важен только порядок.
    const blocks = [start, ...topLevel.map((spec, i) => toJson({ x: 12, y: 1000 + i * 100, ...spec }))];
    return {
        blocks: { languageVersion: 0, blocks },
        variables: Array.from(variables.entries()).map(([name, id]) => ({ name, id }))
    };
}

// --- сокращения ---------------------------------------------------------
export const preflight = (): Spec => ({ type: 'pioneer_preflight' });
export const takeoff = (): Spec => ({ type: 'pioneer_takeoff' });
export const land = (): Spec => ({ type: 'pioneer_land' });
export const wait = (seconds: Input): Spec => ({ type: 'pioneer_wait', inputs: { SECONDS: seconds } });
export const goTo = (x: Input, y: Input, z: Input): Spec => ({ type: 'pioneer_go_to', inputs: { X: x, Y: y, Z: z } });
export const cargo = (action: 'GRAB' | 'RELEASE'): Spec => ({ type: 'pioneer_cargo', fields: { ACTION: action } });
export const preset = (name: string): Spec => ({ type: 'pioneer_colour_preset', fields: { PRESET: name } });
export const rgb = (r: Input, g: Input, b: Input): Spec => ({ type: 'pioneer_colour_rgb', inputs: { R: r, G: g, B: b } });
export const ledAll = (colour: Spec): Spec => ({ type: 'pioneer_led_all', inputs: { COLOUR: colour } });
export const every = (seconds: Input, name: string, body: Spec[]): Spec => ({
    type: 'pioneer_every', fields: { NAME: name }, inputs: { SECONDS: seconds }, statements: { DO: body }
});
export const everyStop = (name: string): Spec => ({ type: 'pioneer_every_stop', fields: { NAME: name } });
export const after = (seconds: Input, body: Spec[]): Spec => ({ type: 'pioneer_after', inputs: { SECONDS: seconds }, statements: { DO: body } });

export const set = (name: string, value: Input): Spec => ({ type: 'variables_set', fields: { VAR: { variable: name } }, inputs: { VALUE: value } });
export const get = (name: string): Variable => ({ variable: name });
export const repeat = (times: Input, body: Spec[]): Spec => ({ type: 'controls_repeat_ext', inputs: { TIMES: times }, statements: { DO: body } });
export const forRange = (name: string, from: Input, to: Input, by: Input, body: Spec[]): Spec => ({
    type: 'controls_for', fields: { VAR: { variable: name } }, inputs: { FROM: from, TO: to, BY: by }, statements: { DO: body }
});
export const ifElse = (branches: Array<[Input, Spec[]]>, otherwise?: Spec[]): Spec => ({
    type: 'controls_if',
    extraState: { elseIfCount: branches.length - 1, hasElse: Boolean(otherwise) },
    inputs: Object.fromEntries(branches.map(([condition], i) => [`IF${i}`, condition])),
    statements: {
        ...Object.fromEntries(branches.map(([, body], i) => [`DO${i}`, body])),
        ...(otherwise ? { ELSE: otherwise } : {})
    }
});

export const arith = (op: 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE', a: Input, b: Input): Spec => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } });
export const add = (a: Input, b: Input): Spec => arith('ADD', a, b);
export const mul = (a: Input, b: Input): Spec => arith('MULTIPLY', a, b);
export const compare = (op: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE', a: Input, b: Input): Spec => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: a, B: b } });

export const define = (name: string, body: Spec[]): Spec => ({ type: 'procedures_defnoreturn', fields: { NAME: name }, statements: { STACK: body } });
export const call = (name: string): Spec => ({ type: 'procedures_callnoreturn', extraState: { name } });
