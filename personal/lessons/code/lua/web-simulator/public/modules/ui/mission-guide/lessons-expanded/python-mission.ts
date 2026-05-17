import { createStatementBlock } from '../lesson-builders.js';
import { compilePython } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getPythonMissionExpandedLessons(): GuideLesson[] {
    return [
        {
            id: 'py-land',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 9',
            title: 'Посадка после маршрута',
            goal: 'Соберите полетную цепочку, где `land()` вызывается только после подтверждения `point_reached()`.',
            summary: 'Это предпоследний этап курса: безопасное завершение маршрута с явной проверкой результата перед посадкой.',
            lessonIntro: 'Посадка в учебной миссии должна быть финальным шагом, а не реакцией "по времени". Правильнее сначала убедиться, что точка достигнута, и только потом завершать полет.',
            expectedOutcome: 'Сценарий выполняет маршрут, ждет `point_reached()` и затем вызывает `pioneer.land()`.',
            builderHint: 'Если `land()` стоит выше блока ожидания точки, миссия завершится слишком рано.',
            apiFocus: [
                apiFocus('pioneer.land()', 'Завершает миссию после подтвержденного достижения цели.', 'pioneer.land()'),
                apiFocus('pioneer.point_reached()', 'Гарантирует, что маршрут действительно завершен к моменту посадки.', 'while not pioneer.point_reached():\n    time.sleep(0.05)')
            ],
            targetBlockIds: ['py_arm', 'py_time_sleep', 'py_takeoff', 'py_time_sleep', 'py_goto_local_point', 'py_wait_point_reached', 'py_land'],
            blocks: [
                createStatementBlock('py10-arm', 'arm()', 'pioneer.arm()', 'Подготовка.', 'setup', 'pioneer.arm()'),
                createStatementBlock('py10-wait-start', 'пауза 1 c', 'time.sleep(1)', 'Разделяет arm и takeoff.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py10-takeoff', 'takeoff()', 'pioneer.takeoff()', 'Взлет.', 'action', 'pioneer.takeoff()'),
                createStatementBlock('py10-wait-flight', 'подождать 3 c', 'time.sleep(3)', 'Дает набрать высоту.', 'wait', 'time.sleep(3)'),
                createStatementBlock('py10-goto', 'go_to_local_point()', 'pioneer.go_to_local_point(x=1, y=0, z=1)', 'Маршрут.', 'action', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                createStatementBlock('py10-reached', 'ждать point_reached()', 'while not pioneer.point_reached():\n    time.sleep(0.05)', 'Подтверждает достижение точки.', 'wait', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                createStatementBlock('py10-land', 'land()', 'pioneer.land()', 'Безопасное завершение миссии.', 'action', 'pioneer.land()')
            ],
            links: [
                { label: 'Pioneer.land', query: 'Pioneer.land', previewKey: 'Pioneer.land' },
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' }
            ],
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)
while not pioneer.point_reached():
    time.sleep(0.05)
pioneer.land()`,
            actionLabel: 'Открыть посадку',
            actionQuery: 'Pioneer.land Pioneer.point_reached',
            actionPreviewKey: 'Pioneer.land',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Посадка идет без подтверждения точки',
                    reason: 'Если вызвать `land()` до `point_reached()`, миссия завершится раньше фактического конца маршрута.',
                    fix: 'Оставьте посадку только после блока ожидания точки.'
                }
            ],
            missingBlockDiagnostics: {
                py_land: {
                    kind: 'error',
                    title: 'Не добавлена посадка',
                    reason: 'Маршрут выполнен, но миссия не завершена безопасным финальным действием.',
                    fix: 'Добавьте `pioneer.land()` в конец цепочки.'
                }
            },
            extraBlockDiagnostics: {},
            orderRules: [
                {
                    before: 'py_wait_point_reached',
                    after: 'py_land',
                    title: 'Посадка вызывается до завершения маршрута',
                    reason: 'Блок `land()` должен следовать строго после подтверждения `point_reached()`.',
                    fix: 'Переместите `land()` ниже блока ожидания.'
                }
            ],
            compile: compilePython
        }
    ];
}
