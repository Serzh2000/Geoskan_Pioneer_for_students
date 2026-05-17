import { createStatementBlock } from '../lesson-builders.js';
import { compilePython } from '../lesson-compilers.js';
import { GUIDE_CHAPTER_IDS } from '../curriculum.js';
import { apiFocus } from '../lesson-state-helpers.js';
import type { GuideLesson } from '../types.js';

export function getPythonFoundationsExpandedLessons(): GuideLesson[] {
    return [
        {
            id: 'py-led-confirm',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 3',
            title: 'Сигнал и текстовое подтверждение',
            goal: 'Соберите Python-сценарий, который включает зеленый LED и выводит сообщение о готовности сигнала.',
            summary: 'Урок учит подтверждать шаги миссии двумя способами: через видимую индикацию и через понятный лог в консоли.',
            lessonIntro: 'В Python линейный стиль особенно удобен для таких сценариев: вы просто читаете шаги сверху вниз и видите, что индикация и лог относятся к одному и тому же этапу.',
            expectedOutcome: 'Сценарий вызывает `pioneer.led_control(...)` для зеленого цвета и затем печатает сообщение о готовности.',
            builderHint: 'Сначала видимый эффект, затем текст. Такой порядок лучше читается и легче отлаживается.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Меняет цвет подсветки дрона и дает мгновенный визуальный отклик.', 'pioneer.led_control(r=0, g=255, b=0)'),
                apiFocus('print(...)', 'Позволяет явно обозначить этап миссии в текстовом логе.', 'print("Сигнал готов")')
            ],
            targetBlockIds: ['py_led_control', 'py_print'],
            blocks: [
                createStatementBlock('py6-led', 'зеленый LED', 'pioneer.led_control(r=0, g=255, b=0)', 'Целевой световой сигнал.', 'action', 'pioneer.led_control(r=0, g=255, b=0)'),
                createStatementBlock('py6-print', 'сообщить о сигнале', 'print("Сигнал готов")', 'Подтверждает шаг текстом.', 'check', 'print("Сигнал готов")'),
                createStatementBlock('py6-sleep', 'пауза 0.5 c', 'time.sleep(0.5)', 'Пауза допустима, но для этого упражнения не обязательна.', 'wait', 'time.sleep(0.5)')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' },
                { label: 'print', query: 'python print' }
            ],
            solutionCode: `pioneer.led_control(r=0, g=255, b=0)
print("Сигнал готов")`,
            actionLabel: 'Открыть сигнализацию',
            actionQuery: 'Pioneer.led_control print',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Нет видимого подтверждения',
                    reason: 'Без `led_control(...)` пользователь не видит ключевой результат урока.',
                    fix: 'Добавьте блок управления LED перед `print(...)`.'
                }
            ],
            missingBlockDiagnostics: {
                py_led_control: {
                    kind: 'error',
                    title: 'Не добавлен LED-сигнал',
                    reason: 'Урок требует зеленую подсветку как основной наблюдаемый результат.',
                    fix: 'Добавьте `pioneer.led_control(...)` в начало.'
                },
                py_print: {
                    kind: 'warning',
                    title: 'Нет текстового подтверждения',
                    reason: 'Сигнал есть, но лог не показывает, что шаг осмысленно завершен.',
                    fix: 'Добавьте `print(...)` после LED-команды.'
                }
            },
            extraBlockDiagnostics: {
                py_time_sleep: {
                    kind: 'warning',
                    title: 'Лишняя пауза',
                    reason: 'Для одношагового подтверждения задержка не нужна и только растягивает выполнение.',
                    fix: 'Уберите `time.sleep(...)`, если он не нужен для наглядности.'
                }
            },
            orderRules: [
                {
                    before: 'py_led_control',
                    after: 'py_print',
                    title: 'Сообщение идет раньше сигнала',
                    reason: 'Лучше сначала показать наблюдаемый эффект, а затем подтвердить его текстом.',
                    fix: 'Переместите `print(...)` после `led_control(...)`.'
                }
            ],
            compile: compilePython
        },
        {
            id: 'py-led-delayed',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 4',
            title: 'Отложенный световой отклик',
            goal: 'Соберите Python-цепочку, где после короткой паузы включается синий LED и печатается сообщение о срабатывании.',
            summary: 'Урок показывает базовую модель отложенной реакции в линейном Python-сценарии: `time.sleep(...)` между шагами.',
            lessonIntro: 'В отличие от Lua, где для задержки удобны callback-таймеры, в Python вы обычно явно вставляете `time.sleep(...)` в саму последовательность. Это делает логику очень читаемой: пауза просто находится между двумя действиями.',
            expectedOutcome: 'Сценарий делает паузу, затем включает синий LED и выводит сообщение о срабатывании.',
            builderHint: 'Порядок простой: сначала `time.sleep(...)`, затем LED, затем `print(...)`.',
            apiFocus: [
                apiFocus('time.sleep(seconds)', 'Явно откладывает следующий шаг и делает реакцию наблюдаемой.', 'time.sleep(1)'),
                apiFocus('pioneer.led_control(...)', 'Срабатывает уже после паузы и показывает отложенный отклик.', 'pioneer.led_control(r=0, g=0, b=255)')
            ],
            targetBlockIds: ['py_time_sleep', 'py_led_control', 'py_print'],
            blocks: [
                createStatementBlock('py7-wait', 'пауза 1 c', 'time.sleep(1)', 'Откладывает реакцию.', 'wait', 'time.sleep(1)'),
                createStatementBlock('py7-led', 'синий LED', 'pioneer.led_control(r=0, g=0, b=255)', 'Показывает результат после ожидания.', 'action', 'pioneer.led_control(r=0, g=0, b=255)'),
                createStatementBlock('py7-print', 'сообщить о срабатывании', 'print("Задержка завершена")', 'Подтверждает шаг логом.', 'check', 'print("Задержка завершена")')
            ],
            links: [
                { label: 'time.sleep', query: 'time.sleep' },
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' }
            ],
            solutionCode: `time.sleep(1)
pioneer.led_control(r=0, g=0, b=255)
print("Задержка завершена")`,
            actionLabel: 'Открыть паузу и отклик',
            actionQuery: 'time.sleep Pioneer.led_control',
            errorCatalog: [
                {
                    kind: 'error',
                    title: 'Нет отложенного действия',
                    reason: 'Без `time.sleep(...)` урок теряет смысл реакции с задержкой.',
                    fix: 'Поставьте паузу перед LED-командой.'
                }
            ],
            missingBlockDiagnostics: {
                py_time_sleep: {
                    kind: 'error',
                    title: 'Не добавлена пауза',
                    reason: 'Реакция происходит мгновенно, а урок проверяет именно отложенный отклик.',
                    fix: 'Добавьте `time.sleep(...)` первым шагом.'
                },
                py_led_control: {
                    kind: 'error',
                    title: 'Нет LED-реакции после паузы',
                    reason: 'Сценарий ждет, но не показывает наблюдаемый результат.',
                    fix: 'Добавьте `pioneer.led_control(...)` после паузы.'
                },
                py_print: {
                    kind: 'warning',
                    title: 'Нет лог-подтверждения',
                    reason: 'Полезный визуальный эффект есть, но текстовое подтверждение не выведено.',
                    fix: 'Добавьте `print(...)` после LED-команды.'
                }
            },
            extraBlockDiagnostics: {},
            orderRules: [
                {
                    before: 'py_time_sleep',
                    after: 'py_led_control',
                    title: 'Синий сигнал включается до паузы',
                    reason: 'Урок специально учит откладывать наблюдаемый эффект, а не подтверждать его задним числом.',
                    fix: 'Переместите `time.sleep(...)` перед `led_control(...)`.'
                }
            ],
            compile: compilePython
        },
    ];
}
