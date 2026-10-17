import { spawnSync } from 'node:child_process';
import * as fengariModule from 'fengari-web';
import type { LearningEvent } from '../public/modules/core/learning-journal.js';
import type { DroneSample } from '../public/modules/ui/mission-guide/evaluation/text/trace.js';
import { PIONEER_CV_PRELUDE } from '../public/modules/python/pioneer-sdk-cv-prelude.js';
import { visionHarness } from './academy-vision-harness.js';
import { findPython } from './helpers/python-sdk-harness.js';

type Outcome = { events: LearningEvent[]; samples: DroneSample[]; error: string | null };
export function executeAcademyLua(code: string, options: { flight?: boolean; hill?: boolean } = {}): Outcome {
    const { lua, lauxlib, lualib, to_luastring, to_jsstring } = 'default' in fengariModule ? fengariModule.default : fengariModule;
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    const leds = Array.from({ length: 29 }, () => ({ r: 0, g: 0, b: 0, w: 0 }));
    const events: LearningEvent[] = [];
    let state = 'IDLE';
    let position = { x: 0, y: 0, z: 0 };
    let error: string | null = null;
    const clock = (stack: unknown): number => {
        lua.lua_getglobal(stack, to_luastring('_clock'));
        const value = lua.lua_tonumber(stack, -1);
        lua.lua_pop(stack, 1);
        return value;
    };
    try {
        lua.lua_register(L, to_luastring('learn_led'), (stack: unknown) => {
            const ledId = lua.lua_tointeger(stack, 1);
            const color = { r: lua.lua_tonumber(stack, 2) * 255, g: lua.lua_tonumber(stack, 3) * 255, b: lua.lua_tonumber(stack, 4) * 255, w: 0 };
            leds[ledId] = color;
            events.push({ kind: 'led', time: clock(stack), ledId, color: { ...color } });
            return 0;
        });
        lua.lua_register(L, to_luastring('learn_print'), (stack: unknown) => {
            events.push({ kind: 'print', time: clock(stack), text: to_jsstring(lua.lua_tostring(stack, 1)) });
            return 0;
        });
        lua.lua_register(L, to_luastring('learn_arm'), (stack: unknown) => {
            const accepted = Boolean(lua.lua_toboolean(stack, 1));
            events.push({ kind: 'arm', time: clock(stack), accepted, state });
            if (accepted) state = 'PREFLIGHT';
            return 0;
        });
        lua.lua_register(L, to_luastring('learn_state'), (stack: unknown) => {
            const previous = state;
            state = to_jsstring(lua.lua_tostring(stack, 1));
            position = { x: lua.lua_tonumber(stack, 2), y: lua.lua_tonumber(stack, 3), z: lua.lua_tonumber(stack, 4) };
            events.push({ kind: 'state', time: clock(stack), from: previous, state, pos: { ...position }, target: { x: lua.lua_tonumber(stack, 5), y: lua.lua_tonumber(stack, 6), z: lua.lua_tonumber(stack, 7) }, yaw: lua.lua_tonumber(stack, 8) });
            return 0;
        });
        lua.lua_register(L, to_luastring('learn_position'), (stack: unknown) => {
            position = { x: lua.lua_tonumber(stack, 1), y: lua.lua_tonumber(stack, 2), z: lua.lua_tonumber(stack, 3) };
            events.push({ kind: 'position', time: clock(stack), pos: { ...position }, yaw: lua.lua_tonumber(stack, 4) });
            return 0;
        });
        lua.lua_register(L, to_luastring('learn_range'), (stack: unknown) => {
            events.push({ kind: 'range', time: clock(stack), value: lua.lua_tonumber(stack, 1), pos: { x: lua.lua_tonumber(stack, 2), y: lua.lua_tonumber(stack, 3), z: lua.lua_tonumber(stack, 4) } });
            return 0;
        });
        const prelude = `
Ev = {MCE_PREFLIGHT=1, ENGINES_STARTED=11}
_phase = 'IDLE'
_clock = 0
_tasks = {}
Timer = {callLater=function(delay, action) table.insert(_tasks, {time=_clock+math.max(.05,delay), action=action}) end}
ap = {push=function(event)
    assert(event==1, 'this harness allows only preparation')
    if _phase ~= 'IDLE' then learn_arm(false); error('invalid transition from PREFLIGHT') end
    learn_arm(true); _phase='PREFLIGHT'
end}
Ledbar = {new=function(count) return {set=function(self,i,r,g,b) learn_led(i,r,g,b) end} end}
function print(value) learn_print(tostring(value)) end
`;
        if (lauxlib.luaL_dostring(L, to_luastring(prelude)) !== lua.LUA_OK) throw new Error('Harness initialization failed');
        if (options.flight && lauxlib.luaL_dostring(L, to_luastring(`
Ev.MCE_TAKEOFF=2; Ev.MCE_LANDING=3; Ev.TAKEOFF_COMPLETE=6; Ev.POINT_REACHED=10; Ev.COPTER_LANDED=7
_pos={0,0,0}; _target={0,0,0}; _yaw=0; _motion=nil
function set_phase(value)
    _phase=value
    learn_state(value,_pos[1],_pos[2],_pos[3],_target[1],_target[2],_target[3],_yaw)
end
function update_clock(value)
    _clock=value
    if _motion then
        local fraction=math.min(1,(_clock-_motion.start)/_motion.duration)
        for i=1,3 do _pos[i]=_motion.from[i]+(_target[i]-_motion.from[i])*fraction end
    end
end
function move(x,y,z,event)
    _target={x,y,z}
    local distance=math.sqrt((x-_pos[1])^2+(y-_pos[2])^2+(z-_pos[3])^2)
    local duration=math.max(.05,distance/.4)
    _motion={from={_pos[1],_pos[2],_pos[3]},start=_clock,duration=duration}
    Timer.callLater(duration,function()
        _pos={x,y,z}; _motion=nil
        set_phase(event==7 and 'IDLE' or 'FLYING_HOVER')
        if callback then callback(event) end
    end)
end
ap.push=function(event)
    if event==1 then
        assert(_phase=='IDLE'); learn_arm(true); set_phase('PREFLIGHT')
        Timer.callLater(.05,function() if callback then callback(11) end end)
    elseif event==2 then assert(_phase=='PREFLIGHT'); set_phase('TAKEOFF_PROCESS'); move(_pos[1],_pos[2],.4,6)
    elseif event==3 then set_phase('LANDING_PROCESS'); move(_pos[1],_pos[2],0,7)
    end
end
ap.goToLocalPoint=function(x,y,z)
    assert(_phase=='FLYING_HOVER' or _phase=='FLYING_MOVING')
    _target={x,y,z}; set_phase('FLYING_MOVING'); move(x,y,z,10)
end
ap.updateYaw=function(value) _yaw=value end
Sensors={lpsPosition=function() learn_position(_pos[1],_pos[2],_pos[3],_yaw); return _pos[1],_pos[2],_pos[3] end,
range=function()
    local range=_pos[3]-(${options.hill ? 'math.abs(_pos[1]-6)<.2 and 1.3 or 0' : '0'})
    learn_range(range,_pos[1],_pos[2],_pos[3]); return range
end}
`)) !== lua.LUA_OK) throw new Error('Flight harness initialization failed');
        const status = lauxlib.luaL_dostring(L, to_luastring(code + `
if callback and _phase=='PREFLIGHT' and not update_clock then callback(Ev.ENGINES_STARTED) end
local iterations=0
while #_tasks>0 do
    iterations=iterations+1
    assert(iterations<1000, 'too many scheduled tasks')
    table.sort(_tasks,function(a,b) return a.time<b.time end)
    local task=table.remove(_tasks,1)
    if update_clock then update_clock(task.time) else _clock=task.time end
    assert(_clock<500, 'unbounded timer')
    task.action()
end`));
        if (status !== lua.LUA_OK) error = to_jsstring(lua.lua_tostring(L, -1));
    } finally { lua.lua_close(L); }
    return { events, error, samples: [{ elapsedMs: 0, snapshot: { leds, pos: position, fsmState: state, flightMode: 'AUTO', pointReachedFlag: false, recentApiCalls: [], fsmTransitions: [], status: error ? 'ОШИБКА' : 'РАБОТАЕТ' } }] };
}

export function executeAcademyPython(code: string, options: { hill?: boolean; vision?: number; seed?: number } = {}): Outcome {
    const harness = `
import sys, types, json
events = []
leds = [dict(r=0,g=0,b=0,w=0) for _ in range(29)]
state = 'IDLE'
clock = 0
position = [0,0,0]
velocity = [0,0,0]
target = [0,0,0]
yaw = 0
reached = False
def set_state(value):
    global state
    previous=state
    state=value
    events.append(dict(kind='state',time=clock,state=state,**{'from':previous},pos=dict(zip(['x','y','z'],position)),target=dict(zip(['x','y','z'],target)),yaw=yaw))
def sleep(seconds):
    global clock, position, reached
    clock += seconds
    if clock>500: raise RuntimeError('unbounded wait')
    if state=='FLYING_HOVER': position=[position[i]+velocity[i]*seconds for i in range(3)]
    if state in ['TAKEOFF_PROCESS','FLYING_MOVING','LANDING_PROCESS']:
        distance=sum((target[i]-position[i])**2 for i in range(3))**.5
        fraction=min(1,seconds*.4/max(.0001,distance))
        position=[position[i]+(target[i]-position[i])*fraction for i in range(3)]
        if fraction==1:
            previous=state
            set_state('IDLE' if state=='LANDING_PROCESS' else 'FLYING_HOVER')
            reached=previous=='FLYING_MOVING'
time_module=types.ModuleType('time')
time_module.sleep=sleep
time_module.monotonic=lambda:clock
sys.modules['time']=time_module
class Pioneer:
    def __init__(self, **kwargs): pass
    def set_manual_speed(self,vx,vy,vz,yaw_rate):
        global velocity
        velocity=[vx,vy,vz]
        events.append(dict(kind='velocity',time=clock,velocity=dict(zip(['x','y','z'],velocity))))
        return True
    def arm(self):
        global state
        accepted = state == 'IDLE'
        events.append(dict(kind='arm', time=clock, accepted=accepted, state=state))
        if not accepted: raise RuntimeError('invalid transition from PREFLIGHT')
        state = 'PREFLIGHT'
        return True
    def get_autopilot_state(self): return {'PREFLIGHT':'ARMED','IDLE':'DISARMED','TAKEOFF_PROCESS':'TAKEOFF','FLYING_HOVER':'MISSION','FLYING_MOVING':'MISSION','LANDING_PROCESS':'LANDING'}[state]
    def takeoff(self):
        global target
        target=[position[0],position[1],.4]
        set_state('TAKEOFF_PROCESS')
        return True
    def go_to_local_point(self,x=None,y=None,z=None,yaw=None):
        global target,reached
        globals()['yaw']=globals()['yaw'] if yaw is None else yaw
        target=[position[i] if value is None else value for i,value in enumerate([x,y,z])]
        reached=False
        set_state('FLYING_MOVING')
        return True
    def point_reached(self):
        global reached
        value=reached; reached=False
        return value
    def land(self):
        global target
        target=[position[0],position[1],0]
        set_state('LANDING_PROCESS')
        return True
    def get_local_position_lps(self):
        events.append(dict(kind='position',time=clock,pos=dict(zip(['x','y','z'],position)),yaw=yaw))
        return position.copy()
    def get_dist_sensor_data(self):
        value=position[2]-(1.3 if ${options.hill ? 'True' : 'False'} and abs(position[0]-6)<.2 else 0)
        events.append(dict(kind='range',time=clock,value=value,pos=dict(zip(['x','y','z'],position))))
        return value
    def led_control(self, led_id=255, r=0, g=0, b=0):
        for index in (range(len(leds)) if led_id == 255 else [led_id]):
            leds[index] = dict(r=r,g=g,b=b,w=0)
            events.append(dict(kind='led', time=clock, ledId=index, color=leds[index].copy()))
        return True
sdk=types.ModuleType('pioneer_sdk')
sdk.Pioneer=Pioneer
sys.modules['pioneer_sdk']=sdk
${options.vision ? visionHarness(options.vision, options.seed || 42, PIONEER_CV_PRELUDE) : ''}
def capture_print(*values, **kwargs):
    events.append(dict(kind='print', time=clock, text=kwargs.get('sep',' ').join(str(value) for value in values)))
error=None
try:
    exec(${JSON.stringify(code)}, {'print':capture_print})
except Exception as exception:
    error=str(exception)
snapshot=dict(leds=leds,pos=dict(zip(['x','y','z'],position)),fsmState=state,flightMode='AUTO',pointReachedFlag=reached,recentApiCalls=[],fsmTransitions=[],status='ОШИБКА' if error else 'РАБОТАЕТ')
print(json.dumps(dict(events=events,error=error,samples=[dict(elapsedMs=0,snapshot=snapshot)])))
`;
    const result = spawnSync(findPython() ?? 'python3', ['-'], { input: harness, encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr);
    return JSON.parse(result.stdout.trim()) as Outcome;
}
