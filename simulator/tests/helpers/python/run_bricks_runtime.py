"""
Запускает программу Bricks так, как её запускает рантайм симулятора, но на настоящем CPython:
 - библиотеки - настоящий Python-код симулятора: pioneer_sdk2 (pioneer-sdk2-module.ts), pioneer_rknn
   (pioneer-rknn-module.ts) и cv2 (pioneer-sdk-cv-prelude.ts); поддельный только мост `js` и камера первого SDK;
 - программа проходит через тот же преобразователь __SimAsyncify, что и в browser-runtime.ts
   (await у arm/takeoff/land/sleep, asyncio.sleep в циклах).

Запуск: python run_bricks_runtime.py <папка с файлами> <config.json>
В папке: sdk2.py, rknn.py, cv.py (прелюдии), transformer.py (кусок browser-runtime.ts), program.py.
config: {"seconds": 5, "speed": 20, "tof": 0.4, "detect": [[x1,y1,x2,y2,класс,уверенность]], "pose": [[...]],
         "ocr": [[[x1,y1,x2,y2,x3,y3,x4,y4], "текст", 0.9]], "markers": [[id, [[x,y]*4]]]}
Последняя строка вывода - JSON после маркера @@RESULT@@: print-вывод, обращения к мосту и ошибка программы.
"""
import asyncio
import ast
import builtins
import inspect
import json
import sys
import time as _time
import types

import numpy as np

folder, config_path = sys.argv[1], sys.argv[2]
with open(config_path, encoding='utf-8') as f:
    config = json.load(f)
SPEED = float(config.get('speed', 20))
START = _time.monotonic()

OUT = []
CALLS = []
state = {'fsm': 'IDLE', 'until': 0.0, 'next': None, 'target': None, 'reach_at': None, 'pos': [0.0, 0.0, 0.0], 'reached': False}


def world_now():
    return (_time.monotonic() - START) * SPEED


def current_fsm():
    if state['next'] and world_now() >= state['until']:
        state['fsm'], state['next'] = state['next'], None
    return state['fsm']


def go(fsm, after=0.0, then=None):
    state['fsm'], state['next'], state['until'] = fsm, then, world_now() + after


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
        CALLS.append(['log', str(text)])

    def pioneer_print(self, _id, text):
        OUT.append(str(text))

    def py_is_cancelled(self, _id):
        return False

    def pioneer2_snapshot(self, _id):
        fsm = current_fsm()
        if state['reach_at'] is not None and world_now() >= state['reach_at']:
            state['reach_at'] = None
            state['reached'] = True
            state['pos'] = list(state['target'])
        reached = state['reached']
        state['reached'] = False
        x, y, z = state['pos']
        return Result([fsm, 'OK', False, False, reached, 0.0, x, y, z, 0.0])

    def pioneer2_motion(self, _id):
        return Result([0.0] * 12 + [12.5, 7.9])

    def pioneer_arm(self, _id):
        CALLS.append(['arm'])
        go('PREFLIGHT')
        return True

    def pioneer_disarm(self, _id):
        CALLS.append(['disarm'])
        go('IDLE')
        return True

    def pioneer_takeoff(self, _id):
        CALLS.append(['takeoff'])
        go('TAKEOFF_PROCESS', 0.5, 'FLYING_HOVER')
        return True

    def pioneer_land(self, _id):
        CALLS.append(['land'])
        go('LANDING_PROCESS', 0.5, 'IDLE')
        return True

    def pioneer2_go_to(self, _id, x, y, z, yaw, time):
        CALLS.append(['go_to', [x, y, z, None if yaw is None else round(float(yaw), 3), time]])
        state['target'] = (x, y, z)
        state['reach_at'] = world_now() + 0.4

    def pioneer2_set_manual_speed(self, *args):
        CALLS.append(['speed', list(args[1:])])
        return True

    def pioneer_led_control(self, _id, led, r, g, b):
        CALLS.append(['led', [int(led), round(r), round(g), round(b)]])
        return True

    def pioneer_get_dist_sensor_data(self, _id):
        tof = config.get('tof', 0.4)
        if isinstance(tof, list):
            now = world_now()
            for t0, t1, value in tof:
                if t0 <= now < t1:
                    return value
            return tof[-1][2]
        return tof

    def pioneer2_camera_tilt(self, _id, angle):
        CALLS.append(['tilt', angle])
        return True

    def pioneer2_ranger(self, _id):
        return [1.0, 2.0, 3.0, 4.0, 5.0]

    def pioneer_rknn_detect(self, *_args):
        return Result(config.get('detect', []))

    def pioneer_rknn_pose(self, *_args):
        return Result(config.get('pose', []))

    def pioneer_rknn_ocr(self, *_args):
        return Result(config.get('ocr', []))

    def pioneer_cv_detect_markers(self, family, _token):
        return Result(config.get('markers', []))

    def pioneer_cv_imshow_pixels(self, name, w, h, *_rest):
        CALLS.append(['imshow', str(name).split(' ')[0], int(w), int(h)])

    def pioneer_cv_imshow(self, name, _payload):
        CALLS.append(['imshow', str(name).split(' ')[0]])

    def pioneer_cv_annotation(self, *_args):
        return None

    def pioneer_cv_destroy_all_windows(self):
        return None

    def pioneer_cv_wait_key(self, _delay):
        return -1


js = JS('js')
sys.modules['js'] = js

# Камера первого SDK: настоящий SDK2 берёт её кадры (pioneer-sdk2-module.ts: _sdk1.Camera).
sdk1 = types.ModuleType('pioneer_sdk')


class FakeCamera:
    def __init__(self, view='front'):
        self.view = view

    def get_cv_frame(self):
        # Не чёрный кадр: на пустом входе модель ничего не находит (pioneer-rknn-module.py: _rk_has_picture).
        return np.full((480, 640, 3), 30, dtype=np.uint8)

    def disconnect(self):
        return None


sdk1.Camera = FakeCamera
sys.modules['pioneer_sdk'] = sdk1


def read(name):
    with open(f'{folder}/{name}', encoding='utf-8') as handle:
        return handle.read()


# --- настоящие прелюдии симулятора ---
header = 'import asyncio, inspect, sys, types\nimport js\n'
exec(compile(header + read('cv.py'), 'cv-prelude', 'exec'), {'__name__': 'cv_prelude'})
exec(compile(read('sdk2.py'), 'sdk2-prelude', 'exec'), {'__name__': 'sdk2_prelude'})
exec(compile(read('rknn.py'), 'rknn-prelude', 'exec'), {'__name__': 'rknn_prelude'})

# Записываем обращения программы к cv2: сохранение фото.
cv2 = sys.modules['cv2']
_real_imwrite = cv2.imwrite


def imwrite(path, frame, *args):
    CALLS.append(['imwrite', str(path)])
    return _real_imwrite(path, frame, *args)


cv2.imwrite = imwrite

_real_rectangle = cv2.rectangle
_real_put_text = cv2.putText


def rectangle(frame, pt1, pt2, *args, **kwargs):
    CALLS.append(['rect', [int(pt1[0]), int(pt1[1]), int(pt2[0]), int(pt2[1])]])
    return _real_rectangle(frame, pt1, pt2, *args, **kwargs)


def put_text(frame, text, *args, **kwargs):
    CALLS.append(['text', str(text)])
    return _real_put_text(frame, text, *args, **kwargs)


cv2.rectangle = rectangle
cv2.putText = put_text

# --- преобразователь рантайма ---
_scaled_sleep = asyncio.sleep


async def sleep(delay, *args, **kwargs):
    return await _scaled_sleep(delay / SPEED if delay else delay, *args, **kwargs)


asyncio.sleep = sleep

namespace = {'ast': ast, 'asyncio': asyncio, 'inspect': inspect, 'builtins': builtins}
exec(compile(read('transformer.py'), 'transformer', 'exec'), namespace)

builtins.__sim_bg_tasks = []
_real_print = builtins.print
builtins.__sim_base_print = _real_print


def sim_print(*args, sep=' ', end='\n', **kwargs):
    js.pioneer_print(js.SIM_DRONE_ID, sep.join(str(a) for a in args))


builtins.print = sim_print

source = read('program.py')
namespace['__user_main'] = namespace['__sim_load'](source)

error = None


async def run():
    global error
    task = asyncio.ensure_future(namespace['__user_main']())
    try:
        await asyncio.wait_for(asyncio.shield(task), timeout=max(0.5, float(config.get('seconds', 5)) / SPEED))
    except asyncio.TimeoutError:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        except Exception as exc:  # noqa: BLE001
            error = type(exc).__name__ + ': ' + str(exc)
    except Exception as exc:  # noqa: BLE001
        error = type(exc).__name__ + ': ' + str(exc)
    for background in builtins.__sim_bg_tasks:
        background.cancel()


START = _time.monotonic()  # время мира считается от запуска программы, а не от загрузки библиотек
asyncio.run(run())
builtins.print = _real_print
print('@@RESULT@@' + json.dumps({'out': OUT, 'calls': CALLS, 'error': error}, ensure_ascii=False))
