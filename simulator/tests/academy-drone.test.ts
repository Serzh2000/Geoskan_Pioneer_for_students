import { spawnSync } from 'node:child_process';
import * as fengari from 'fengari-web';
import { getDroneAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/drone.js';
import { gradeDroneAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/drone.js';
import { beginLearningCapture, recordLearningEvent, finishLearningCapture, type LearningEvent } from '../public/modules/core/learning-journal.js';
import { collectLuaBlockingIssues } from '../public/modules/app/script-execution-notice/lua-validation.js';
import type { DroneSnapshot } from '../public/modules/ui/mission-guide/evaluation/text/snapshot.js';

const idle: DroneSnapshot = { pos: { x: 0, y: 0, z: 0 }, leds: [], fsmState: 'IDLE', flightMode: 'AUTO', pointReachedFlag: false, recentApiCalls: [], fsmTransitions: [], status: 'РАБОТАЕТ' };
const samples = (state = 'PREFLIGHT', status = 'РАБОТАЕТ') => [{ elapsedMs: 0, snapshot: { ...idle, fsmState: state, status } }];
const arm: LearningEvent = { kind: 'arm', accepted: true, state: 'IDLE', time: 0 };
const print = (text: string): LearningEvent => ({ kind: 'print', text, time: 0 });

test('a print claiming preparation cannot replace a real arm, and off-target flight is rejected', () => {
    expect(gradeDroneAcademy(3, samples(), [print('Готово')], { code: '' }).solved).toBe(false);
    expect(gradeDroneAcademy(3, samples(), [arm], { code: '' }).solved).toBe(true);
    expect(gradeDroneAcademy(3, [{ elapsedMs: 0, snapshot: { ...idle, pos: { x: 0, y: 0, z: 2 } } }], [arm], { code: '' }).solved).toBe(false);
});

test('expected rejection is distinguished from an arbitrary script error', () => {
    expect(gradeDroneAcademy(4, samples('PREFLIGHT', 'ОШИБКА'), [arm], { code: '' }).solved).toBe(false);
    expect(gradeDroneAcademy(4, samples('PREFLIGHT', 'ОШИБКА'), [arm, { ...arm, accepted: false, state: 'PREFLIGHT' }], { code: '' }).solved).toBe(true);
    expect(gradeDroneAcademy(8, samples('PREFLIGHT', 'ОШИБКА'), [arm], { code: '' }).solved).toBe(false);
});

test('messages must surround the actual command, including events in the same frame', () => {
    expect(gradeDroneAcademy(6, samples(), [print('До arm'), arm, print('После arm')], { code: '' }).solved).toBe(true);
    for (const events of [[print('После arm')], [arm, print('До arm'), print('После arm')], [print('До arm'), print('После arm'), arm]]) {
        expect(gradeDroneAcademy(6, samples(), events, { code: '' }).solved).toBe(false);
    }
});

test('observation, edited comment and the second independent run have separate gates', () => {
    expect(gradeDroneAcademy(1, samples('IDLE'), [], { code: '' }).solved).toBe(false);
    expect(gradeDroneAcademy(1, samples('IDLE'), [], { code: '', lift: 'rotors', vision: 'camera' }).solved).toBe(true);
    expect(gradeDroneAcademy(2, samples('IDLE'), [], { code: 'print("Мой первый опыт")' }).solved).toBe(false);
    expect(gradeDroneAcademy(2, samples('IDLE'), [], { code: '# Мой первый опыт' }).solved).toBe(true);
    expect(gradeDroneAcademy(5, samples(), [arm], { code: 'arm()' }).solved).toBe(false);
    expect(gradeDroneAcademy(5, samples(), [arm], { code: 'arm()', previousRun: true }).solved).toBe(true);
});

test('journal scopes evidence to a run and a drone and limits excessive output', () => {
    recordLearningEvent('uncaptured', arm);
    const old = beginLearningCapture('journal-test');
    recordLearningEvent('journal-test', arm);
    const fresh = beginLearningCapture('journal-test');
    expect(finishLearningCapture('journal-test', old)).toEqual([]);
    for (let i = 0; i < 600; i++) recordLearningEvent('journal-test', print(String(i)));
    const events = finishLearningCapture('journal-test', fresh);
    expect(events).toHaveLength(512);
    expect(events[0].text).toBe('88');
    expect(finishLearningCapture('journal-test', fresh)).toEqual([]);
});

test('all nine authored Lua solutions execute; only the repeated preparation intentionally raises an FSM error', () => {
    const { lua, lauxlib, lualib, to_luastring, to_jsstring } = 'default' in fengari ? fengari.default : fengari;
    for (const lesson of getDroneAcademyPractices('lua')) {
        expect(collectLuaBlockingIssues(lesson.solutionCode)).toEqual([]);
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);
        try {
            const prelude = `Ev = { MCE_PREFLIGHT = 1, ENGINES_STARTED = 11 }; _requests = 0; _accepted = 0; _phase = "IDLE";
                ap = { push = function(event) assert(event == 1); _requests = _requests + 1;
                    if _phase ~= "IDLE" then error("FSM error: invalid transition from PREFLIGHT") end;
                    _accepted = _accepted + 1; _phase = "PREFLIGHT"; end }; print = function() end;`;
            expect(lauxlib.luaL_dostring(L, to_luastring(prelude))).toBe(lua.LUA_OK);
            const status = lauxlib.luaL_dostring(L, to_luastring(lesson.solutionCode + '\ncallback(Ev.ENGINES_STARTED)'));
            if (lesson.academy?.number === 4) {
                expect(status).not.toBe(lua.LUA_OK);
                expect(to_jsstring(lua.lua_tostring(L, -1))).toContain('invalid transition from PREFLIGHT');
                lua.lua_pop(L, 1);
            } else expect(status).toBe(lua.LUA_OK);
            lua.lua_getglobal(L, to_luastring('_accepted'));
            expect(lua.lua_tointeger(L, -1)).toBe(lesson.academy!.number > 2 ? 1 : 0);
        } finally { lua.lua_close(L); }
    }
});

test('all nine Python solutions execute against the SDK contract, with the expected repeated-arm rejection', () => {
    for (const lesson of getDroneAcademyPractices('python')) {
        const harness = `
import sys, types, json
accepted = 0
class Pioneer:
    def __init__(self, **kwargs): pass
    def arm(self):
        global accepted
        if accepted: raise RuntimeError('FSM error: invalid transition from PREFLIGHT')
        accepted += 1
        return True
sdk = types.ModuleType('pioneer_sdk')
sdk.Pioneer = Pioneer
sys.modules['pioneer_sdk'] = sdk
error = None
try:
    exec(${JSON.stringify(lesson.solutionCode)})
except Exception as exception:
    error = str(exception)
print(json.dumps({'accepted': accepted, 'error': error}))
`;
        const result = spawnSync(process.env.PYTHON || 'python', ['-c', harness], { encoding: 'utf8', timeout: 10000 });
        if (result.error) throw result.error;
        expect(result.status).toBe(0);
        const outcome = JSON.parse(result.stdout.trim().split('\n').pop()!);
        expect(outcome.accepted).toBe(lesson.academy!.number > 2 ? 1 : 0);
        expect(outcome.error).toBe(lesson.academy!.number === 4 ? 'FSM error: invalid transition from PREFLIGHT' : null);
    }
});
