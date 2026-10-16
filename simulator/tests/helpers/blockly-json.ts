/**
 * Короткая запись программ Blockly для тестов: цепочка блоков — массив,
 * числа и строки на входах превращаются в math_number/text, а переменные —
 * в variables_get по имени.
 */
export type BlockJson = {
    type: string;
    fields?: Record<string, unknown>;
    inputs?: Record<string, { block?: BlockJson; shadow?: BlockJson }>;
    next?: { block: BlockJson };
    extraState?: unknown;
};

export type Input = BlockJson | number | string | Input[] | { variable: string } | boolean;
export type Spec = {
    type: string;
    fields?: Record<string, unknown>;
    inputs?: Record<string, Input>;
    statements?: Record<string, Spec[]>;
    extraState?: unknown;
};

const variables = new Map<string, string>();

export function resetVariables(): void {
    variables.clear();
}

function variableId(name: string): string {
    if (!variables.has(name)) variables.set(name, `var_${variables.size}_${name}`);
    return variables.get(name)!;
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
    if ('variable' in input) return { type: 'variables_get', fields: { VAR: { id: variableId(input.variable) } } };
    return input as BlockJson;
}

export function block(spec: Spec): BlockJson {
    const json: BlockJson = { type: spec.type };
    if (spec.fields) {
        json.fields = Object.fromEntries(Object.entries(spec.fields).map(([name, value]) => (
            typeof value === 'object' && value && 'variable' in (value as object)
                ? [name, { id: variableId((value as { variable: string }).variable) }]
                : [name, value]
        )));
    }
    if (spec.extraState !== undefined) json.extraState = spec.extraState;
    const inputs: Record<string, { block: BlockJson }> = {};
    Object.entries(spec.inputs ?? {}).forEach(([name, value]) => {
        inputs[name] = { block: valueBlock(value) };
    });
    Object.entries(spec.statements ?? {}).forEach(([name, specs]) => {
        const first = chain(specs);
        if (first) inputs[name] = { block: first };
    });
    if (Object.keys(inputs).length) json.inputs = inputs;
    return json;
}

export function chain(specs: Spec[]): BlockJson | undefined {
    let head: BlockJson | undefined;
    for (let i = specs.length - 1; i >= 0; i -= 1) {
        const current = block(specs[i]);
        if (head) current.next = { block: head };
        head = current;
    }
    return head;
}

// Весь workspace: «Начало программы» с цепочкой и отдельные верхние блоки.
export function program(main: Spec[], topLevel: Spec[] = []): { blocks: { languageVersion: number; blocks: BlockJson[] }; variables: Array<{ name: string; id: string }> } {
    const start: BlockJson = { type: 'pioneer_start' };
    const body = chain(main);
    if (body) start.next = { block: body };
    const blocks = [start, ...topLevel.map((spec) => block(spec))];
    return {
        blocks: { languageVersion: 0, blocks },
        variables: Array.from(variables.entries()).map(([name, id]) => ({ name, id }))
    };
}

// Сокращения для самых частых блоков.
export const S = {
    preflight: (): Spec => ({ type: 'pioneer_preflight' }),
    takeoff: (): Spec => ({ type: 'pioneer_takeoff' }),
    land: (): Spec => ({ type: 'pioneer_land' }),
    disarm: (): Spec => ({ type: 'pioneer_disarm' }),
    wait: (seconds: Input): Spec => ({ type: 'pioneer_wait', inputs: { SECONDS: seconds } }),
    goTo: (x: Input, y: Input, z: Input): Spec => ({ type: 'pioneer_go_to', inputs: { X: x, Y: y, Z: z } }),
    rgb: (r: Input, g: Input, b: Input): Spec => ({ type: 'pioneer_colour_rgb', inputs: { R: r, G: g, B: b } }),
    ledAll: (colour: Spec): Spec => ({ type: 'pioneer_led_all', inputs: { COLOUR: block(colour) } }),
    ledIndex: (index: Input, colour: Spec): Spec => ({ type: 'pioneer_led_index', inputs: { INDEX: index, COLOUR: block(colour) } }),
    set: (name: string, value: Input): Spec => ({ type: 'variables_set', fields: { VAR: { variable: name } }, inputs: { VALUE: value } }),
    get: (name: string): Input => ({ variable: name }),
    repeat: (times: Input, body: Spec[]): Spec => ({ type: 'controls_repeat_ext', inputs: { TIMES: times }, statements: { DO: body } }),
    arith: (op: string, a: Input, b: Input): Input => block({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } }),
    compare: (op: string, a: Input, b: Input): Input => block({ type: 'logic_compare', fields: { OP: op }, inputs: { A: a, B: b } })
};
