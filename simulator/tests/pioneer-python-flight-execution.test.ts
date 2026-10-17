import { spawnSync } from 'node:child_process';
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { createStarterWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace.js';
import { findPython } from './helpers/python-sdk-harness.js';

await import('../public/modules/editor/blockly-mode/blockly-core.js');
await ensureEditorBlocklyDefinitions();

/*
 * The starter program of the Python Blockly target («Запустить моторы → Взлететь → Сесть»).
 * Python blocks are generated the way the official pioneer_sdk examples are written
 * (manual_speed.py: arm(); takeoff() back to back, no state polling, no timeouts) - see
 * pioneer/blocks/flight.ts and tests/geoscan-examples-blockly.test.ts, which compares the
 * blocks with those examples. This test runs the real generated code end to end.
 */

function starterCode() {
    const workspace = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(createStarterWorkspaceXml('python')), workspace);
    const code = compilePioneerWorkspace(workspace, 'python');
    workspace.dispose();
    return code;
}

function runStarter(code: string) {
    const harness = `
import sys, types, json
calls = []
class Pioneer:
    def arm(self):
        calls.append('arm')
        return True
    def takeoff(self):
        calls.append('takeoff')
        return True
    def land(self):
        calls.append('land')
        return True
    def close_connection(self):
        calls.append('close')
sdk = types.ModuleType('pioneer_sdk')
sdk.Pioneer = Pioneer
sys.modules['pioneer_sdk'] = sdk
error = None
try:
    exec(${JSON.stringify(code)})
except Exception as exc:
    error = type(exc).__name__ + ': ' + str(exc)
print(json.dumps({'calls': calls, 'error': error}))
`;
    const result = spawnSync(python!, ['-c', harness], { encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
    return JSON.parse(result.stdout.trim());
}

const python = findPython();
const withPython = python ? test : test.skip;

describe('generated starter Python', () => {
    test('is written like the official pioneer_sdk examples', () => {
        const code = starterCode();
        expect(code).toContain('from pioneer_sdk import Pioneer');
        expect(code.indexOf('pioneer.arm()')).toBeLessThan(code.indexOf('pioneer.takeoff()'));
        expect(code.indexOf('pioneer.takeoff()')).toBeLessThan(code.indexOf('pioneer.land()'));
        expect(code.indexOf('pioneer.land()')).toBeLessThan(code.indexOf('pioneer.close_connection()'));
    });

    withPython('runs end to end: arm, takeoff, land, close', () => {
        expect(runStarter(starterCode())).toEqual({ calls: ['arm', 'takeoff', 'land', 'close'], error: null });
    });
});
