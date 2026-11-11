"""
Запускает настоящий Python-код pioneer_sdk2 из симулятора
(PIONEER_SDK2_PRELUDE в pioneer-sdk2-module.ts) против поддельного мира js:
простой автомат IDLE -> PREFLIGHT -> TAKEOFF_PROCESS -> FLYING_HOVER ->
LANDING_PROCESS -> IDLE с ускоренным временем.

Запуск: python run_sdk2_module.py <prelude.py> <scenario.py>
В сценарии доступны: sdk2 (модуль pioneer_sdk2), piosdk2, js (поддельный мост),
calls (журнал вызовов моста: список [имя, аргументы]) и корутина main().
"""
import asyncio
import sys
import types

prelude_path, scenario_path = sys.argv[1], sys.argv[2]

calls = []
_state = {'fsm': 'IDLE', 'until': 0.0, 'next': None}


def _now():
    return asyncio.get_event_loop().time()


def _fsm():
    if _state['next'] and _now() >= _state['until']:
        _state['fsm'], _state['next'] = _state['next'], None
    return _state['fsm']


def _go(fsm, after=None, then=None):
    _state['fsm'] = fsm
    _state['next'] = then
    _state['until'] = _now() + (after or 0)


class Result:
    def __init__(self, value):
        self.value = value

    def to_py(self):
        return self.value


class JS(types.ModuleType):
    SIM_DRONE_ID = 'drone-1'

    def pioneer2_drone_model(self, _id):
        return 'pioneer-mini2'

    def pioneer2_log(self, text):
        return None

    def py_is_cancelled(self, _id):
        return False

    def pioneer2_snapshot(self, _id):
        return Result([_fsm(), 'OK', False, False, False, 0.0, 0.0, 0.0, 1.0, 0.0])

    def pioneer2_motion(self, _id):
        return Result([0.0] * 12 + [12.5, 7.9])

    def pioneer_arm(self, _id):
        _go('PREFLIGHT')
        return True

    def pioneer_disarm(self, _id):
        _go('IDLE')
        return True

    def pioneer_takeoff(self, _id):
        _go('TAKEOFF_PROCESS', 0.2, 'FLYING_HOVER')
        return True

    def pioneer_land(self, _id):
        _go('LANDING_PROCESS', 0.2, 'IDLE')
        return True

    def pioneer2_go_to(self, *args):
        calls.append(['go_to', list(args[1:])])

    def pioneer2_set_manual_speed(self, *args):
        calls.append(['speed', list(args[1:])])
        return True

    def pioneer_get_local_position_lps(self, _id):
        return Result([0.0, 0.0, 1.0])

    def pioneer2_cargo(self, _id, grab):
        calls.append(['cargo', grab])
        return False


js = JS('js')
sys.modules['js'] = js
sys.modules['pioneer_sdk'] = types.ModuleType('pioneer_sdk')

prelude = open(prelude_path, encoding='utf-8').read()
exec(compile(prelude, 'prelude', 'exec'), {'__name__': 'prelude'})

namespace = {'sdk2': sys.modules['pioneer_sdk2'], 'piosdk2': sys.modules['pioneer_sdk2.piosdk2'], 'js': js, 'calls': calls}
exec(compile(open(scenario_path, encoding='utf-8').read(), 'scenario', 'exec'), namespace)


async def run():
    try:
        await namespace['main']()
    finally:
        for task in getattr(__import__('builtins'), '__sim_bg_tasks', []):
            task.cancel()


asyncio.run(run())
