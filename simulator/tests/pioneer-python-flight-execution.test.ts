import { spawnSync } from 'node:child_process';
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';
import { compilePioneerWorkspace } from '../public/modules/editor/blockly-mode/pioneer/targets/compile.js';
import { createStarterWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace.js';

await import('../public/modules/editor/blockly-mode/blockly-core.js');
await ensureEditorBlocklyDefinitions();

function runStarter(scenario: string) {
    const workspace = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(createStarterWorkspaceXml('python')), workspace);
    const code = compilePioneerWorkspace(workspace, 'python');
    workspace.dispose();
    // Execute real generated Python, with an SDK-shaped transport and a virtual
    // clock. ARMED is deliberately never published: ACK must allow takeoff.
    const harness = `
import sys, types, json
scenario = ${JSON.stringify(scenario)}
clock = [0.0]
calls = []
def sleep(seconds):
    clock[0] += seconds
    if clock[0] > 180:
        raise RuntimeError('unbounded wait')
time = types.ModuleType('time')
time.sleep = sleep
time.monotonic = lambda: clock[0]
sys.modules['time'] = time
class Pioneer:
    def __init__(self):
        self.phase = 'idle'
        self.changed = 0
    def arm(self):
        calls.append('arm')
        self.changed = clock[0]
        return scenario != 'rejected'
    def takeoff(self):
        assert clock[0] - self.changed >= 1, 'no settling interval'
        calls.append('takeoff')
        self.phase = 'takeoff'
        self.changed = clock[0]
        return True
    def land(self):
        assert self.get_autopilot_state() == 'MISSION', 'land before takeoff completes'
        calls.append('land')
        self.phase = 'landing'
        self.changed = clock[0]
        return True
    def get_autopilot_state(self):
        if scenario == 'missing-telemetry': return None
        if clock[0] - self.changed < 3: return None
        if self.phase == 'takeoff': return 'MISSION'
        if self.phase == 'landing': return 'LANDED' if scenario == 'landed' else 'DISARMED'
        return 'PREFLIGHT'
    def close_connection(self):
        assert self.get_autopilot_state() in ('LANDED', 'DISARMED'), 'closed during flight'
        calls.append('close')
sdk = types.ModuleType('pioneer_sdk')
sdk.Pioneer = Pioneer
sys.modules['pioneer_sdk'] = sdk
error = None
try:
    exec(${JSON.stringify(code)})
except Exception as exc:
    error = type(exc).__name__ + ': ' + str(exc)
print(json.dumps({'calls': calls, 'error': error, 'elapsed': clock[0]}))
`;
    const result = spawnSync(process.env.PYTHON || 'python', ['-c', harness], { encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    expect(result.status).toBe(0);
    return JSON.parse(result.stdout.trim());
}

describe('generated starter Python execution', () => {
    test.each(['disarmed', 'landed'])('finishes flight without an ARMED telemetry sample (%s)', scenario => {
        expect(runStarter(scenario)).toMatchObject({ calls: ['arm', 'takeoff', 'land', 'close'], error: null });
    });
    test('does not send takeoff after rejected arm', () => {
        expect(runStarter('rejected')).toMatchObject({ calls: ['arm'], error: expect.stringContaining('RuntimeError') });
    });
    test('reports missing telemetry instead of waiting forever or landing prematurely', () => {
        const result = runStarter('missing-telemetry');
        expect(result.calls).toEqual(['arm', 'takeoff']);
        expect(result.error).toContain('TimeoutError');
        expect(result.elapsed).toBeLessThan(62);
    });
});
