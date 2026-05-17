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

export function getPythonLedLessons(): GuideLesson[] {
    return [
        {
            id: 'py-led-single',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 1',
            title: 'Включить красную подсветку',
            goal: 'Соберите минимальный Python-сценарий, который использует `pioneer.led_control(...)` для включения красного цвета.',
            summary: 'Первый шаг знакомит с прямым вызовом метода Pioneer SDK.',
            lessonIntro: 'Это стартовый урок по Python API. Его задача простая: понять, как один метод SDK меняет состояние дрона и почему для проверки достаточно одного точного вызова.',
            expectedOutcome: 'Код импортирует Pioneer SDK, создает `pioneer = Pioneer(simulator=True)` и вызывает `pioneer.led_control(r=255, g=0, b=0)`.',
            builderHint: 'Пролог Python добавляется автоматически. В рабочую область нужно собрать только смысловую последовательность методов.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Меняет цвет светодиодной подсветки. В этом уроке нужен именно красный сигнал как контрольный результат.', 'pioneer.led_control(r=255, g=0, b=0)')
            ],
            targetBlockIds: ['py_led_control'],
            blocks: [
                createStatementBlock('py1-red', 'красный LED', 'pioneer.led_control(r=255, g=0, b=0)', 'Эталонная команда урока.', 'action', 'pioneer.led_control(r=255, g=0, b=0)'),
                createStatementBlock('py1-blue', 'синий LED', 'pioneer.led_control(r=0, g=0, b=255)', 'Рабочий вызов, но неверный для цели задания.', 'action', 'pioneer.led_control(r=0, g=0, b=255)'),
                createStatementBlock('py1-sleep', 'пауза 0.5 c', 'time.sleep(0.5)', 'Пауза допустима, но для одного цвета она не нужна.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py1-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Настоящая команда, но она не относится к LED-упражнению.', 'action', 'pioneer.takeoff()')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' }
            ],
            solutionCode: PYTHON_LED_SINGLE_EXAMPLE,
            actionLabel: 'Открыть LED API',
            actionQuery: 'Pioneer.led_control',
            errorCatalog: [
                {
                    kind: 'warning',
                    title: 'Выбран другой цвет',
                    reason: 'Метод `led_control(...)` рабочий, но урок проверяет именно красный индикатор как контрольный результат.',
                    fix: 'Оставьте только блок `красный LED`.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлены лишние шаги миссии',
                    reason: '`takeoff()` или пауза здесь не помогают понять базовый вызов `led_control(...)`.',
                    fix: 'Соберите цепочку из одного LED-блока.'
                }
            ],
            missingBlockDiagnostics: {
                'py1-red': {
                    kind: 'error',
                    title: 'Нет целевого вызова `led_control(...)`',
                    reason: 'Без команды `pioneer.led_control(r=255, g=0, b=0)` задание не выполняет красную подсветку.',
                    fix: 'Добавьте блок `красный LED` в рабочую область.'
                }
            },
            extraBlockDiagnostics: {
                'py1-blue': {
                    kind: 'warning',
                    title: 'Использован неверный цвет',
                    reason: 'Синий светодиод это корректный вызов Pioneer SDK, но не тот результат, который требуется в уроке.',
                    fix: 'Удалите синий блок и оставьте красный.'
                },
                'py1-sleep': {
                    kind: 'warning',
                    title: 'Пауза не нужна для одиночного LED-вызова',
                    reason: 'Одно изменение цвета можно выполнить сразу, без дополнительного ожидания.',
                    fix: 'Уберите `time.sleep(0.5)` из первого задания.'
                },
                'py1-takeoff': {
                    kind: 'warning',
                    title: 'Команда полета лишняя',
                    reason: '`pioneer.takeoff()` технически рабочий, но не относится к упражнению про подсветку.',
                    fix: 'Сосредоточьтесь только на `led_control(...)`.'
                }
            },
            compile: compilePython
        },
        {
            id: 'py-led-sequence',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 2',
            title: 'Мигание с паузами',
            goal: 'Соберите Python-последовательность из трех цветов, разделенных паузами `time.sleep(...)`.',
            summary: 'Показываем, почему несколько вызовов подряд без задержек визуально не читаются.',
            lessonIntro: 'Здесь вы тренируете не новый тип устройства, а правильный порядок обычных Python-вызовов. Паузы нужны не ради синтаксиса, а чтобы поведение дрона можно было увидеть и понять.',
            expectedOutcome: 'Код последовательно вызывает `pioneer.led_control(...)`, а между изменениями цвета стоят две паузы по 0.5 секунды.',
            builderHint: 'В этом уроке порядок критичен: цвет -> пауза -> цвет -> пауза -> цвет.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Отвечает за сами кадры световой последовательности.', 'pioneer.led_control(r=0, g=255, b=0)'),
                apiFocus('time.sleep(seconds)', 'Приостанавливает выполнение между кадрами, чтобы цвета не сливались в один мгновенный переход.', 'time.sleep(0.5)')
            ],
            targetBlockIds: ['py_led_control', 'py_time_sleep', 'py_led_control', 'py_time_sleep', 'py_led_control'],
            blocks: [
                createStatementBlock('py2-blue', 'синий LED', 'pioneer.led_control(r=0, g=0, b=255)', 'Первый кадр последовательности.', 'action', 'pioneer.led_control(r=0, g=0, b=255)'),
                createStatementBlock('py2-wait-a', 'пауза 0.5 c', 'time.sleep(0.5)', 'Дает глазу время увидеть первый цвет.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py2-green', 'зеленый LED', 'pioneer.led_control(r=0, g=255, b=0)', 'Второй кадр.', 'action', 'pioneer.led_control(r=0, g=255, b=0)'),
                createStatementBlock('py2-wait-b', 'еще пауза 0.5 c', 'time.sleep(0.5)', 'Разводит второй и третий кадры.', 'wait', 'time.sleep(0.5)'),
                createStatementBlock('py2-red', 'красный LED', 'pioneer.led_control(r=255, g=0, b=0)', 'Финальный кадр.', 'action', 'pioneer.led_control(r=255, g=0, b=0)'),
                createStatementBlock('py2-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Рабочая команда, но не часть LED-анимации.', 'action', 'pioneer.takeoff()')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' },
                { label: 'time.sleep', query: 'time.sleep' }
            ],
            solutionCode: PYTHON_LED_SEQUENCE_EXAMPLE,
            actionLabel: 'Открыть паузы',
            actionQuery: 'Pioneer.led_control time.sleep',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Цвета идут подряд без пауз',
                    reason: 'Несколько `led_control(...)` без `time.sleep(...)` сменятся почти мгновенно, и пользователь увидит только последний цвет.',
                    fix: 'Обязательно вставляйте паузу между сменами цветов.'
                },
                {
                    kind: 'warning',
                    title: 'Добавлен лишний шаг полета',
                    reason: '`takeoff()` не относится к демонстрации LED-анимации и запутывает учебную цепочку.',
                    fix: 'Уберите команды полета из второго урока.'
                }
            ],
            missingBlockDiagnostics: {
                'py2-blue': {
                    kind: 'error',
                    title: 'Нет первого синего кадра',
                    reason: 'Сценарий теряет стартовую точку анимации.',
                    fix: 'Добавьте блок `синий LED` в начало.'
                },
                'py2-wait-a': {
                    kind: 'error',
                    title: 'Пропущена первая пауза',
                    reason: 'Без первой задержки синий и зеленый кадры сливаются.',
                    fix: 'Поставьте `пауза 0.5 c` между синим и зеленым.'
                },
                'py2-green': {
                    kind: 'error',
                    title: 'Нет зеленого кадра',
                    reason: 'Последовательность цветов неполная.',
                    fix: 'Добавьте блок `зеленый LED` после первой паузы.'
                },
                'py2-wait-b': {
                    kind: 'error',
                    title: 'Пропущена вторая пауза',
                    reason: 'Без второй задержки красный цвет включится слишком быстро после зеленого.',
                    fix: 'Добавьте вторую паузу перед красным кадром.'
                },
                'py2-red': {
                    kind: 'error',
                    title: 'Нет финального красного кадра',
                    reason: 'Анимация не завершается контрольным цветом урока.',
                    fix: 'Добавьте блок `красный LED` после второй паузы.'
                }
            },
            extraBlockDiagnostics: {
                'py2-takeoff': {
                    kind: 'warning',
                    title: 'Команда `takeoff()` здесь лишняя',
                    reason: 'Этот вызов не помогает изучить работу `led_control(...)` и `time.sleep(...)`.',
                    fix: 'Уберите `takeoff()` из LED-упражнения.'
                }
            },
            orderRules: [
                {
                    before: 'py2-blue',
                    after: 'py2-wait-a',
                    title: 'После первого цвета нет паузы',
                    reason: 'Пауза должна идти сразу за синим кадром, иначе анимация теряет читаемость.',
                    fix: 'Переместите первую паузу сразу после синего блока.'
                },
                {
                    before: 'py2-wait-a',
                    after: 'py2-green',
                    title: 'Зеленый цвет идет не после первой паузы',
                    reason: 'Порядок цветовых кадров нарушен.',
                    fix: 'Поставьте `зеленый LED` сразу после первой паузы.'
                },
                {
                    before: 'py2-green',
                    after: 'py2-wait-b',
                    title: 'Вторая пауза стоит не после зеленого',
                    reason: 'Между зеленым и красным кадрами нужен отдельный разрыв по времени.',
                    fix: 'Разместите вторую паузу после зеленого блока.'
                },
                {
                    before: 'py2-wait-b',
                    after: 'py2-red',
                    title: 'Красный цвет включается слишком рано',
                    reason: 'Он должен завершать анимацию после второй задержки.',
                    fix: 'Переместите красный блок ниже второй паузы.'
                }
            ],
            compile: compilePython
        },
    ];
}
