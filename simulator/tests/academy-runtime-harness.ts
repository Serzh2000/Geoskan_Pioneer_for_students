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
        // Датчики, таймеры, цвет, камера, mailbox и периферия для уроков 125–145 (значения как у симулятора в покое).
        if (lauxlib.luaL_dostring(L, to_luastring(`
Sensors = Sensors or {}
Sensors.accel = function() return 0, 0, 9.81 end
Sensors.gyro = function() return 0, 0, 0 end
Sensors.rc = function() return 0, 0, 0, 0, 0, 0, 0, 0 end
Sensors.orientation = function() return 0, 0, _yaw or 0 end
Sensors.lpsYaw = function() return _yaw or 0 end
Sensors.altitude = function() return _pos and _pos[3] or 0 end
Sensors.lpsVelocity = function()
    if _motion then
        local d = _motion.duration
        return (_target[1] - _motion.from[1]) / d, (_target[2] - _motion.from[2]) / d, (_target[3] - _motion.from[3]) / d
    end
    return 0, 0, 0
end
function time() return _clock end
function deltaTime() return 0.05 end
function launchTime() return 0 end
boardNumber = 'SIMULATOR'
Timer.new = function(period, action)
    local timer = {running = false}
    local function tick()
        if not timer.running then return end
        action()
        if timer.running then Timer.callLater(period, tick) end
    end
    timer.start = function(self) self.running = true; Timer.callLater(period, tick) end
    timer.stop = function(self) self.running = false end
    return timer
end
Timer.callAt = function(moment, action) Timer.callLater(math.max(moment - _clock, 0), action) end
Timer.callAtGlobal = function(moment, action) Timer.callLater(math.max(moment - (_clock + deltaTime()), 0), action) end
function fromHSV(h, s, v)
    h = (h % 360) / 360
    s = math.max(0, math.min(100, s)) / 100
    v = math.max(0, math.min(100, v)) / 100
    local i = math.floor(h * 6)
    local f = h * 6 - i
    local p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    i = i % 6
    if i == 0 then return v, t, p elseif i == 1 then return q, v, p elseif i == 2 then return p, v, t
    elseif i == 3 then return p, q, v elseif i == 4 then return t, p, v end
    return v, p, q
end
Ledbar.fromHSV = fromHSV
camera = {requestMakeShot = function() end, checkRequestShot = function() return 0 end, requestRecordStart = function() end,
    requestRecordStop = function() end, checkRequestRecord = function() return 0 end}
_hull = 1; _inbox = {}
mailbox = {
    connect = function(ip, port) return _hull, 'ok' end,
    setHullNumber = function(n) _hull = n; return true end,
    myHullNumber = function() return _hull end,
    send = function(to, message) if to == _hull then table.insert(_inbox, {_hull, message}) end; return true end,
    hasMessages = function() return #_inbox > 0 end,
    receive = function(blocking) local m = table.remove(_inbox, 1); if m then return m[1], m[2] end; return -1, -1 end}
Gpio = {A = 1, B = 2, C = 3, D = 4, E = 5, INPUT = 0, OUTPUT = 1, ALTFU = 2, new = function(port, pin, mode)
    local p = {state = false}
    p.set = function(self) self.state = true end
    p.reset = function(self) self.state = false end
    p.read = function(self) return self.state end
    return p
end}
Uart = {new = function() return {write = function() end, bytesToRead = function() return 0 end, read = function() return '' end, setBaudRate = function() end} end}
Spi = {new = function() return {write = function() end, read = function() return '' end, exchange = function() return '' end} end}
if ap.goToLocalPoint then ap.goToPoint = function(lat, lon, alt) ap.goToLocalPoint((lon - 304206500) * 0.01, (lat - 600859810) * 0.01, alt) end end
`)) !== lua.LUA_OK) throw new Error('Lesson API initialization failed: ' + to_jsstring(lua.lua_tostring(L, -1)));
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
import sys, types, json, ast, asyncio, inspect, hashlib
events = []
scripts = {}
wifi = {'ap_ssid': 'Pioneer_sim', 'ap_password': '12345678', 'sta_ssid': None, 'sta_password': None}
def emit(text): events.append(dict(kind='print', time=clock, text=text))
def emit_event(event): events.append(event)
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
    def get_battery_status(self, get_last_received=True): return 8.39
    def get_preflight_state(self): return {'BatteryLow':0,'NavSystem':0,'Area':0,'Attitude':0,'RcExpected':0,'RcMode':0,'RcUnexpected':0,'UavStartAllowed':128 if state=='IDLE' else 0}
    def get_autopilot_state(self): return {'PREFLIGHT':'ARMED','IDLE':'DISARMED','TAKEOFF_PROCESS':'TAKEOFF','FLYING_HOVER':'MISSION','FLYING_MOVING':'MISSION','LANDING_PROCESS':'LANDING'}[state]
    def log(self, msg, msg_type=None): emit('[pioneer] ' + msg)
    def disarm(self):
        global state
        if position[2] > .15: raise RuntimeError('disarm in the air')
        state = 'IDLE'
        return True
    def get_yaw(self, get_last_received=True): return yaw
    def cargo_set(self, grab):
        emit_event(dict(kind='cargo', time=clock, grab=bool(grab)))
        return True
    def cargo_grab(self): return self.cargo_set(True)
    def cargo_release(self): return self.cargo_set(False)
    def get_optical_flow(self, get_last_received=True): return 0.0, 0.0, (255 if position[2] >= .08 else 0)
    def get_optical_data(self, get_last_received=False):
        flow_x, flow_y, quality = self.get_optical_flow()
        return {'integration_time_us': 20000, 'integrated_x': flow_x * .02, 'integrated_y': flow_y * .02, 'distance': position[2], 'integrated_xgyro': 0.0, 'integrated_ygyro': 0.0, 'integrated_zgyro': 0.0, 'temperature': 0, 'quality': quality}
    def go_to_local_point_body_fixed(self, x, y, z, yaw_shift):
        import math
        global target, reached
        right, forward = x, y
        dx = right * math.cos(yaw) + forward * math.sin(yaw)
        dy = right * math.sin(yaw) - forward * math.cos(yaw)
        target = [position[0] + dx, position[1] + dy, position[2] + z]
        reached = False
        set_state('FLYING_MOVING')
        return True
    def set_manual_speed_body_fixed(self, vx, vy, vz, yaw_rate):
        import math
        return self.set_manual_speed(vx * math.cos(yaw) + vy * math.sin(yaw), vx * math.sin(yaw) - vy * math.cos(yaw), vz, yaw_rate)
    def send_rc_channels(self, channel_1=0xFF, channel_2=0xFF, channel_3=0xFF, channel_4=0xFF, channel_5=0xFF, channel_6=0xFF, channel_7=0xFF, channel_8=0xFF): return True
    def lua_script_upload(self, lua_source):
        scripts['source'] = str(lua_source)
        self.log('Lua-скрипт загружен на дрон (в симуляторе: сохранён как скрипт этого дрона)')
    def lua_script_control(self, state='Stop', command=None):
        value = state if command is None else command
        if str(value).lower() not in ('start', 'stop'): raise ValueError("Argument 'state' must be one of the following values: 'Stop', 'Start'.")
        if str(value).lower() == 'start' and scripts.get('source'):
            import re
            for text in re.findall(r'print[(]"([^"]*)"[)]', scripts['source']): emit(text)
        return True
    def ap_set_ssid(self, ssid): wifi['ap_ssid'] = ssid; return True
    def ap_set_password(self, password): wifi['ap_password'] = password; return True
    def sta_connect(self, ssid, password):
        wifi['sta_ssid'] = ssid; wifi['sta_password'] = password
        self.log('STA подключена к «' + ssid + '»')
        return True
    def sta_disconnect(self): wifi['sta_ssid'] = None; wifi['sta_password'] = None; return True
    def try_get_sta_status(self): return wifi['sta_ssid'], (None if wifi['sta_password'] is None else hashlib.md5(wifi['sta_password'].encode()).hexdigest())
    def try_get_ap_status(self): return wifi['ap_ssid'], hashlib.md5(wifi['ap_password'].encode()).hexdigest()
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
class Camera:
    def __init__(self, *args, **kwargs): self._connected = True
    def connected(self): return self._connected
    def connect(self): self._connected = True; return True
    def disconnect(self): self._connected = False; return True
    def get_frame(self): return b'\\xff\\xd8' + bytes(3000) + b'\\xff\\xd9'
class VideoStream:
    def __init__(self, *args, **kwargs): self.camera = Camera()
    # Симулятор сам дожидается start() и stop() у программ ученика: здесь они обычные вызовы.
    def start(self): return self.camera.connect()
    def stop(self): return self.camera.disconnect()
    def connected(self): return self.camera.connected()
sdk=types.ModuleType('pioneer_sdk')
sdk.Camera=Camera
sdk.VideoStream=VideoStream
sdk.Pioneer=Pioneer
sys.modules['pioneer_sdk']=sdk
${options.vision ? visionHarness(options.vision, options.seed || 42, PIONEER_CV_PRELUDE) : ''}
def capture_print(*values, **kwargs):
    events.append(dict(kind='print', time=clock, text=kwargs.get('sep',' ').join(str(value) for value in values)))
error=None
try:
    compiled = compile(${JSON.stringify(code)}, '<lesson>', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    outcome = eval(compiled, {'print':capture_print})
    if inspect.iscoroutine(outcome): asyncio.run(outcome)
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
