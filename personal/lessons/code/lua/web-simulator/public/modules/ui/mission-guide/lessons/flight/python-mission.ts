import { createEventBlock, createStatementBlock, createTimerBlock } from '../../lesson-builders.js';
import { compileLuaEvents, compileLuaLinear, compileLuaTimed, compilePython } from '../../lesson-compilers.js';
import {
    LUA_LED_SEQUENCE_EXAMPLE,
    LUA_LED_SINGLE_EXAMPLE,
    LUA_MISSION_EXAMPLE,
    LUA_PREFLIGHT_EXAMPLE,
    LUA_TAKEOFF_EXAMPLE,
    PYTHON_ARM_EXAMPLE,
    PYTHON_LED_SEQUENCE_EXAMPLE,
    PYTHON_LED_SINGLE_EXAMPLE,
    PYTHON_MISSION_EXAMPLE,
    PYTHON_TAKEOFF_EXAMPLE
} from '../../snippets.js';
import type { GuideLesson, GuideLessonState } from '../../types.js';
import { GUIDE_CHAPTER_IDS } from '../../curriculum.js';
import { apiFocus } from '../../lesson-state-helpers.js';

export function getPythonMissionLessons(): GuideLesson[] {
    return [
        {
            id: 'py-mission',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 5',
            title: 'Маршрут с ожиданием точки и посадкой',
            goal: 'Соберите полноценную Python-миссию: `arm()`, `takeoff()`, ожидание, `go_to_local_point(...)`, цикл `point_reached()` и `land()`.',
            summary: 'В финальном уроке блоки все еще совместимы по форме, но любая ошибка порядка нарушает логику сценария.',
            lessonIntro: 'Финальный Python-урок собирает полный маршрут: от подготовки дрона до завершения миссии посадкой. Здесь уже особенно важно понимать, зачем нужен каждый вызов и какое состояние он предполагает.',
            expectedOutcome: 'Сценарий последовательно подготавливает дрон, взлетает, летит к точке, ждет `point_reached()` и завершает полет посадкой.',
            builderHint: 'Особенно следите за блоком ожидания точки: без него посадка может уйти до завершения перемещения.',
            apiFocus: [
                apiFocus('pioneer.go_to_local_point(x, y, z)', 'Отправляет дрон к локальной координате после взлета и набора высоты.', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                apiFocus('pioneer.point_reached()', 'Проверяет, завершен ли маршрут. Без этого ожидания посадка может начаться слишком рано.', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                apiFocus('pioneer.land()', 'Завершает миссию безопасной посадкой после достижения точки.', 'pioneer.land()')
            ],
            targetBlockIds: ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_time_sleep', 'py_goto_local_point', 'py_wait_point_reached', 'py_land'],
            blocks: [
                createStatementBlock('py5-arm', 'arm()', 'pioneer.arm()', 'Подготовка двигателей.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py5-wait-start', 'пауза 1 c', 'time.sleep(1)', 'Разделяет подготовку и взлет.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py5-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Команда взлета.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py5-wait-flight', 'подождать 3 c', 'time.sleep(3)', 'Дает дрону набрать высоту перед маршрутом.', 'wait', 'time.sleep(3)'),
                createStatementBlock('py5-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Команда полета к локальной точке.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                createStatementBlock('py5-reached', 'ждать point_reached()', 'while not pioneer.point_reached():\n    time.sleep(0.05)', 'Ожидает фактическое завершение перемещения.', 'wait', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                createStatementBlock('py5-land', 'land()', 'pioneer.land()', 'Безопасно завершает миссию.', 'action', 'pioneer.land()'),
                createStatementBlock('py5-led', 'сигнал LED', 'pioneer.led_control(r=0, g=255, b=0)', 'Дополнительный рабочий вызов, но он не обязателен для урока маршрута.', 'check', 'pioneer.led_control(r=0, g=255, b=0)')
            ],
            links: [
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' },
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' },
                { label: 'Pioneer.land', query: 'Pioneer.land', previewKey: 'Pioneer.land' }
            ],
            solutionCode: PYTHON_MISSION_EXAMPLE,
            actionLabel: 'Открыть полную миссию',
            actionQuery: 'Pioneer.go_to_local_point Pioneer.point_reached Pioneer.land',
            actionPreviewKey: 'Pioneer.go_to_local_point',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Полет к точке идет до взлета',
                    reason: '`go_to_local_point(...)` без предварительного `takeoff()` нарушает базовую логику миссии.',
                    fix: 'Сначала соберите `arm()` -> `takeoff()`, затем переходите к маршруту.'
                },
                {
                    kind: 'error',
                    title: 'Нет ожидания `point_reached()`',
                    reason: 'Если сразу после `go_to_local_point(...)` поставить `land()`, посадка может начаться до завершения полета.',
                    fix: 'Добавьте цикл ожидания `while not pioneer.point_reached(): ...`.'
                },
                {
                    kind: 'warning',
                    title: 'Лишние дополнительные вызовы',
                    reason: 'Вспомогательные команды вроде `led_control(...)` допустимы, но не должны скрывать основную учебную цепочку.',
                    fix: 'Сначала соберите эталонную миссию, затем экспериментируйте.'
                }
            ],
            missingBlockDiagnostics: {
                'py5-arm': {
                    kind: 'error',
                    title: 'Нет `arm()`',
                    reason: 'Миссия начинается без подготовки двигателей.',
                    fix: 'Добавьте блок `arm()` первым.'
                },
                'py5-wait-start': {
                    kind: 'warning',
                    title: 'Пропущена стартовая пауза',
                    reason: 'Учебный сценарий теряет наглядность и команды выполняются слишком плотно.',
                    fix: 'Вставьте `time.sleep(1)` между `arm()` и `takeoff()`.'
                },
                'py5-takeoff': {
                    kind: 'error',
                    title: 'Нет `takeoff()`',
                    reason: 'Без взлета маршрут к точке нелогичен.',
                    fix: 'Добавьте блок `takeoff()` после первой паузы.'
                },
                'py5-wait-flight': {
                    kind: 'warning',
                    title: 'Нет паузы перед маршрутом',
                    reason: 'Маршрут к точке лучше отправлять после набора высоты.',
                    fix: 'Добавьте блок `подождать 3 c` перед `go_to_local_point(...)`.'
                },
                'py5-goto': {
                    kind: 'error',
                    title: 'Нет команды полета к точке',
                    reason: 'Миссия не выполняет маршрутную часть.',
                    fix: 'Добавьте `go_to_local_point()` после паузы полета.'
                },
                'py5-reached': {
                    kind: 'error',
                    title: 'Нет ожидания `point_reached()`',
                    reason: 'Сценарий не проверяет, что точка реально достигнута.',
                    fix: 'Добавьте блок `ждать point_reached()` перед посадкой.'
                },
                'py5-land': {
                    kind: 'error',
                    title: 'Нет `land()`',
                    reason: 'Маршрут выполнен не до конца: отсутствует безопасное завершение полета.',
                    fix: 'Добавьте блок `land()` в конец.'
                }
            },
            extraBlockDiagnostics: {
                'py5-led': {
                    kind: 'warning',
                    title: 'Дополнительный LED-сигнал не обязателен',
                    reason: 'Он не ломает код, но может отвлекать от основного порядка миссии.',
                    fix: 'Сначала соберите базовую миссию без дополнительных эффектов.'
                }
            },
            orderRules: [
                {
                    before: 'py5-arm',
                    after: 'py5-wait-start',
                    title: 'Первая пауза стоит раньше `arm()`',
                    reason: 'Сначала нужно подготовить дрон, и только потом делать осмысленную задержку.',
                    fix: 'Поставьте `arm()` перед первой паузой.'
                },
                {
                    before: 'py5-wait-start',
                    after: 'py5-takeoff',
                    title: '`takeoff()` идет не после стартовой паузы',
                    reason: 'Учебная логика требует явного разрыва между подготовкой и взлетом.',
                    fix: 'Переместите `takeoff()` после первой паузы.'
                },
                {
                    before: 'py5-wait-flight',
                    after: 'py5-goto',
                    title: 'Маршрут отправляется слишком рано',
                    reason: 'Команда `go_to_local_point(...)` должна идти после паузы на набор высоты.',
                    fix: 'Поставьте маршрут ниже блока `подождать 3 c`.'
                },
                {
                    before: 'py5-reached',
                    after: 'py5-land',
                    title: 'Посадка стоит раньше ожидания точки',
                    reason: '`land()` должен завершать миссию только после подтверждения `point_reached()`.',
                    fix: 'Переместите `land()` ниже блока ожидания точки.'
                }
            ],
            compile: compilePython
        }
    ];
}
