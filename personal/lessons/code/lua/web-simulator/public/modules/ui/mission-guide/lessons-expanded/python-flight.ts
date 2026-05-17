import { createStatementBlock } from '../lesson-builders.js';
import { compilePython } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getPythonFlightExpandedLessons(): GuideLesson[] {
    return [
            {
            id: 'py-route',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 7',
            title: 'Полет к локальной точке',
            goal: 'Соберите базовую маршрутную цепочку: `arm()`, пауза, `takeoff()`, ожидание набора высоты и `go_to_local_point(...)`.',
            summary: 'Урок отделяет сам факт взлета от начала навигации и показывает, что маршрут тоже должен иметь свой осмысленный момент запуска.',
            lessonIntro: 'Даже в линейном Python-сценарии полезно мыслить этапами. Сначала дрон подготавливается, затем взлетает, затем получает время на набор высоты, и только после этого отправляется к точке.',
            expectedOutcome: 'Сценарий вызывает `arm()`, `takeoff()` и затем `go_to_local_point(...)` после пауз подготовки и набора высоты.',
            builderHint: 'Не пропускайте вторую паузу: она отделяет сам взлет от начала навигации.',
            apiFocus: [
                apiFocus('pioneer.go_to_local_point(x, y, z)', 'Отправляет дрон к локальной координате после взлета.', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                apiFocus('time.sleep(3)', 'Дает дрону время закончить взлет и перейти к устойчивому полету.', 'time.sleep(3)')
            ],
            targetBlockIds: ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_time_sleep', 'py_goto_local_point'],
            blocks: [
                createStatementBlock('py8-arm', 'arm()', 'pioneer.arm()', 'Подготовка к полету.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py8-wait-start', 'пауза 1 c', 'time.sleep(1)', 'Разделяет arm и takeoff.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py8-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Взлет.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py8-wait-flight', 'подождать 3 c', 'time.sleep(3)', 'Дает набрать высоту.', 'wait', 'time.sleep(3)'),
                createStatementBlock('py8-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Целевой маршрут.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)')
            ],
            links: [
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' },
                { label: 'Pioneer.takeoff', query: 'Pioneer.takeoff', previewKey: 'Pioneer.takeoff' }
            ],
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)`,
            actionLabel: 'Открыть маршрут',
            actionQuery: 'Pioneer.go_to_local_point Pioneer.takeoff',
            actionPreviewKey: 'Pioneer.go_to_local_point',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Маршрут отправлен слишком рано',
                    reason: 'Без подготовки и взлета команда `go_to_local_point(...)` не отражает корректный этап миссии.',
                    fix: 'Сначала соберите `arm()` и `takeoff()`, затем переходите к маршруту.'
                }
            ],
            missingBlockDiagnostics: {
                py_goto_local_point: {
                    kind: 'error',
                    title: 'Нет команды маршрута',
                    reason: 'Урок требует переход именно к локальной точке, а не только взлет.',
                    fix: 'Добавьте `go_to_local_point(...)` в конец цепочки.'
                }
            },
            extraBlockDiagnostics: {},
            orderRules: [
                {
                    before: 'py_time_sleep',
                    after: 'py_takeoff',
                    title: '`takeoff()` идет без разделяющей паузы',
                    reason: 'Первая пауза помогает явно отделить подготовку от взлета.',
                    fix: 'Поставьте `time.sleep(1)` между `arm()` и `takeoff()`.'
                }
            ],
            compile: compilePython
        },
        {
            id: 'py-point-wait',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 8',
            title: 'Дождаться достижения точки',
            goal: 'Расширьте маршрут: после `go_to_local_point(...)` дождитесь `point_reached()` и только затем выведите сообщение об успехе.',
            summary: 'Урок закрепляет ключевую мысль: отправка маршрута и завершение маршрута это разные вещи.',
            lessonIntro: 'В Python особенно легко написать слишком оптимистичный сценарий, где после команды маршрута сразу идет следующий шаг. Этот урок вводит обязательную проверку результата через `point_reached()`.',
            expectedOutcome: 'Сценарий долетает до точки, ждет завершения маршрута в цикле и только после этого печатает сообщение.',
            builderHint: 'Цикл ожидания должен стоять сразу после `go_to_local_point(...)`, иначе подтверждение маршрута станет преждевременным.',
            apiFocus: [
                apiFocus('pioneer.point_reached()', 'Сообщает, что дрон действительно достиг заданной координаты.', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                apiFocus('print(...)', 'В этом уроке используется для подтверждения уже завершенного маршрута.', 'print("Точка достигнута")')
            ],
            targetBlockIds: ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_time_sleep', 'py_goto_local_point', 'py_wait_point_reached', 'py_print'],
            blocks: [
                createStatementBlock('py9-arm', 'arm()', 'pioneer.arm()', 'Подготовка.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py9-wait-start', 'пауза 1 c', 'time.sleep(1)', 'Разделяет arm и takeoff.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py9-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Взлет.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py9-wait-flight', 'подождать 3 c', 'time.sleep(3)', 'Дает набрать высоту.', 'wait', 'time.sleep(3)'),
                createStatementBlock('py9-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Старт маршрута.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                createStatementBlock('py9-reached', 'ждать point_reached()', 'while not pioneer.point_reached():\n    time.sleep(0.05)', 'Ожидание фактического завершения.', 'wait', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                createStatementBlock('py9-print', 'сообщить об успехе', 'print("Точка достигнута")', 'Текстовое подтверждение.', 'check', 'print("Точка достигнута")')
            ],
            links: [
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' },
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' }
            ],
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)
while not pioneer.point_reached():
    time.sleep(0.05)
print("Точка достигнута")`,
            actionLabel: 'Открыть ожидание точки',
            actionQuery: 'Pioneer.point_reached Pioneer.go_to_local_point',
            actionPreviewKey: 'Pioneer.point_reached',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Нет подтверждения завершения маршрута',
                    reason: 'Без цикла `point_reached()` сообщение об успехе появляется слишком рано.',
                    fix: 'Добавьте блок ожидания перед `print(...)`.'
                }
            ],
            missingBlockDiagnostics: {
                py_wait_point_reached: {
                    kind: 'error',
                    title: 'Нет ожидания `point_reached()`',
                    reason: 'Урок требует подтвердить завершение маршрута, а не просто отправить команду полета.',
                    fix: 'Добавьте блок `while not pioneer.point_reached(): ...`.'
                },
                py_print: {
                    kind: 'warning',
                    title: 'Нет сообщения о завершении',
                    reason: 'Маршрут завершен, но пользователь не получает явного подтверждения.',
                    fix: 'Добавьте `print("Точка достигнута")` в конец.'
                }
            },
            extraBlockDiagnostics: {},
            orderRules: [
                {
                    before: 'py_wait_point_reached',
                    after: 'py_print',
                    title: 'Сообщение выводится до подтверждения точки',
                    reason: 'Текст должен появляться только после завершения цикла ожидания.',
                    fix: 'Поставьте `print(...)` после `point_reached()`.'
                }
            ],
            compile: compilePython
        }
    ];
}
