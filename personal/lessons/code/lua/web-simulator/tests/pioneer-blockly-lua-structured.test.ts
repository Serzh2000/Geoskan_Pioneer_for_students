/**
 * Ожидание внутри циклов и «если» в Lua (targets/lua-structured.ts): код
 * не только собирается, но и летает в рантайме симулятора так же, как
 * задумано блоками.
 */
import * as Blockly from 'blockly';
import { setupLuaSim, eventNames, type LuaSim } from './helpers/lua-sim-harness.js';
import { program, resetVariables, S, type Spec } from './helpers/blockly-json.js';

let sim: LuaSim;
let compile: (workspace: Blockly.Workspace, target: 'lua' | 'python') => string;

beforeAll(async () => {
    sim = await setupLuaSim();
    const index = await import('../public/modules/editor/blockly-mode/index.js');
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await index.ensureEditorBlocklyDefinitions();
    compile = index.compilePioneerWorkspace;
});

function compileProgram(main: Spec[], topLevel: Spec[] = [], target: 'lua' | 'python' = 'lua'): string {
    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(program(main, topLevel), workspace);
    const code = compile(workspace, target);
    workspace.dispose();
    return code;
}

beforeEach(() => resetVariables());

test('полёт по точкам в цикле «повторить»', () => {
    const lua = compileProgram([
        S.preflight(),
        S.takeoff(),
        S.set('i', 0),
        S.repeat(3, [
            S.set('i', S.arith('ADD', S.get('i'), 1)),
            S.goTo(S.get('i'), 0, 1),
            S.wait(0.5)
        ]),
        S.land()
    ]);
    expect(lua).toContain('local __loop = {}');
    expect(lua).not.toMatch(/__wait_(event|seconds|poll)\(/);

    const events = eventNames(sim.run(lua, 60));
    expect(events.filter((name) => name.startsWith('goto'))).toEqual(['goto 1,0,1', 'goto 2,0,1', 'goto 3,0,1']);
    expect(events).toContain('fsm LANDING_PROCESS');
    expect(events[events.length - 1]).toBe('fsm IDLE');
    expect(events.some((name) => name.startsWith('stopped'))).toBe(false);
});

test('ожидание в ветках «если» и «пока» с прерыванием', () => {
    const lua = compileProgram([
        S.preflight(),
        S.takeoff(),
        S.set('n', 0),
        {
            type: 'controls_whileUntil',
            fields: { MODE: 'WHILE' },
            inputs: { BOOL: true },
            statements: {
                DO: [
                    S.set('n', S.arith('ADD', S.get('n'), 1)),
                    {
                        type: 'controls_if',
                        extraState: { hasElse: true },
                        inputs: { IF0: S.compare('EQ', S.get('n'), 2) },
                        statements: {
                            DO0: [S.goTo(0, 1, 1)],
                            ELSE: [S.goTo(1, 0, 1)]
                        }
                    },
                    {
                        type: 'controls_if',
                        inputs: { IF0: S.compare('GTE', S.get('n'), 3) },
                        statements: { DO0: [{ type: 'controls_flow_statements', fields: { FLOW: 'BREAK' } }] }
                    }
                ]
            }
        },
        S.land()
    ]);
    const events = eventNames(sim.run(lua, 60));
    expect(events.filter((name) => name.startsWith('goto'))).toEqual(['goto 1,0,1', 'goto 0,1,1', 'goto 1,0,1']);
    expect(events[events.length - 1]).toBe('fsm IDLE');
});

test('цикл «для» идёт в обе стороны, как штатный генератор Blockly', () => {
    const lua = compileProgram([
        S.preflight(),
        S.takeoff(),
        {
            type: 'controls_for',
            fields: { VAR: { variable: 'k' } },
            inputs: { FROM: 3, TO: 1, BY: 1 },
            statements: { DO: [S.goTo(S.get('k'), 0, 1)] }
        },
        S.land()
    ]);
    const events = eventNames(sim.run(lua, 60));
    expect(events.filter((name) => name.startsWith('goto'))).toEqual(['goto 3,0,1', 'goto 2,0,1', 'goto 1,0,1']);
});

test('линейная программа по-прежнему плоская', () => {
    const lua = compileProgram([S.preflight(), S.takeoff(), S.goTo(1, 0, 1), S.land()]);
    expect(lua).not.toContain('__state');
});
