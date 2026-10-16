import type { GuideTextLesson } from '../../types.js';
import { GUIDE_CHAPTER_IDS } from '../../curriculum.js';
import { apiFocus } from '../support/state-helpers.js';

// Text-track Python lessons: the same 10 curriculum topics as the Blockly
// Python track, but repackaged for hand-typed raw Python code instead of
// block assembly. Teaching content (title/goal/theory/API focus/solution) is
// copied verbatim from the Blockly lesson sources; only `id`, `topicId` and
// `starterCode` are new here.
//
// The Blockly `solutionCode` values for Python are method-call bodies only
// (e.g. `pioneer.led_control(...)`) — the Blockly-to-Python compiler
// (support/compilers.ts) prepends the `from pioneer_sdk import Pioneer` /
// `pioneer = Pioneer(...)` prologue afterwards, which this text track has no
// equivalent step for. Confirmed live (in-browser) that running a body-only
// script here throws immediately (no `pioneer` name bound) and the LED never
// changes. `PY_PROLOGUE` below reproduces that same prologue so the hand-typed
// scripts are actually runnable, and is prepended to every lesson's
// `starterCode`/`solutionCode` at the bottom of this file.
const PY_PROLOGUE = `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)`;

function withPrologue(lessons: GuideTextLesson[]): GuideTextLesson[] {
    return lessons.map((lesson) => ({
        ...lesson,
        starterCode: `${PY_PROLOGUE}\n\n${lesson.starterCode}`,
        solutionCode: `${PY_PROLOGUE}\n\n${lesson.solutionCode}`
    }));
}

export function getPythonTextLessons(): GuideTextLesson[] {
    return withPrologue([
        {
            id: 'py-led-single-text',
            topicId: 'led-single',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 1',
            title: 'Включить красную подсветку',
            goal: 'Соберите минимальный Python-сценарий, который использует `pioneer.led_control(...)` для включения красного цвета.',
            summary: 'Первый шаг знакомит с прямым вызовом метода Pioneer SDK.',
            lessonIntro: 'Это стартовый урок по Python API. Его задача простая: понять, как один метод SDK меняет состояние дрона и почему для проверки достаточно одного точного вызова.',
            expectedOutcome: 'Светодиодная подсветка дрона загорится красным цветом.',
            builderHint: 'Для этого урока достаточно одного вызова `pioneer.led_control(...)` с красным цветом.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Меняет цвет светодиодной подсветки. В этом уроке нужен именно красный сигнал как контрольный результат.', 'pioneer.led_control(r=255, g=0, b=0)')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' }
            ],
            starterCode: `# TODO: включите красный цвет через pioneer.led_control(r=255, g=0, b=0)`,
            solutionCode: `pioneer.led_control(r=255, g=0, b=0)`
        },
        {
            id: 'py-led-sequence-text',
            topicId: 'led-sequence',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 2',
            title: 'Мигание с паузами',
            goal: 'Соберите Python-последовательность из трех цветов, разделенных паузами `time.sleep(...)`.',
            summary: 'Показываем, почему несколько вызовов подряд без задержек визуально не читаются.',
            lessonIntro: 'Здесь вы тренируете не новый тип устройства, а правильный порядок обычных Python-вызовов. Паузы нужны не ради синтаксиса, а чтобы поведение дрона можно было увидеть и понять.',
            expectedOutcome: 'Подсветка дрона последовательно меняет цвет с паузами между кадрами: сначала синий, затем зеленый, затем красный, и каждую смену цвета видно отдельно.',
            builderHint: 'В этом уроке порядок критичен: цвет -> пауза -> цвет -> пауза -> цвет.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Отвечает за сами кадры световой последовательности.', 'pioneer.led_control(r=0, g=255, b=0)'),
                apiFocus('time.sleep(seconds)', 'Приостанавливает выполнение между кадрами, чтобы цвета не сливались в один мгновенный переход.', 'time.sleep(0.5)')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' },
                { label: 'time.sleep', query: 'time.sleep' }
            ],
            starterCode: `# TODO: включите синий, затем зеленый, затем красный цвет через pioneer.led_control(...), разделяя каждую смену цвета паузой time.sleep(0.5)`,
            solutionCode: `pioneer.led_control(r=0, g=0, b=255)
time.sleep(0.5)
pioneer.led_control(r=0, g=255, b=0)
time.sleep(0.5)
pioneer.led_control(r=255, g=0, b=0)`
        },
        {
            id: 'py-led-confirm-text',
            topicId: 'led-confirm',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 3',
            title: 'Сигнал и текстовое подтверждение',
            goal: 'Соберите Python-сценарий, который включает зеленый LED и выводит сообщение о готовности сигнала.',
            summary: 'Урок учит подтверждать шаги миссии двумя способами: через видимую индикацию и через понятный лог в консоли.',
            lessonIntro: 'В Python линейный стиль особенно удобен для таких сценариев: вы просто читаете шаги сверху вниз и видите, что индикация и лог относятся к одному и тому же этапу.',
            expectedOutcome: 'Подсветка дрона загорится зеленым цветом, а следом в журнале появится сообщение о готовности сигнала.',
            builderHint: 'Сначала видимый эффект, затем текст. Такой порядок лучше читается и легче отлаживается.',
            apiFocus: [
                apiFocus('pioneer.led_control(r, g, b)', 'Меняет цвет подсветки дрона и дает мгновенный визуальный отклик.', 'pioneer.led_control(r=0, g=255, b=0)'),
                apiFocus('print(...)', 'Позволяет явно обозначить этап миссии в текстовом логе.', 'print("Сигнал готов")')
            ],
            links: [
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' },
                { label: 'print', query: 'python print' }
            ],
            starterCode: `# TODO: включите зеленый цвет через pioneer.led_control(...) и выведите print("Сигнал готов")`,
            solutionCode: `pioneer.led_control(r=0, g=255, b=0)
print("Сигнал готов")`
        },
        {
            id: 'py-led-delayed-text',
            topicId: 'led-delayed',
            chapterId: GUIDE_CHAPTER_IDS.foundations,
            badge: 'Задание 4',
            title: 'Отложенный световой отклик',
            goal: 'Соберите Python-цепочку, где после короткой паузы включается синий LED и печатается сообщение о срабатывании.',
            summary: 'Урок показывает базовую модель отложенной реакции в линейном Python-сценарии: `time.sleep(...)` между шагами.',
            lessonIntro: 'В отличие от Lua, где для задержки удобны callback-таймеры, в Python вы обычно явно вставляете `time.sleep(...)` в саму последовательность. Это делает логику очень читаемой: пауза просто находится между двумя действиями.',
            expectedOutcome: 'После небольшой паузы подсветка дрона загорится синим цветом, и в журнале появится сообщение о срабатывании отложенного сигнала.',
            builderHint: 'Порядок простой: сначала `time.sleep(...)`, затем LED, затем `print(...)`.',
            apiFocus: [
                apiFocus('time.sleep(seconds)', 'Явно откладывает следующий шаг и делает реакцию наблюдаемой.', 'time.sleep(1)'),
                apiFocus('pioneer.led_control(...)', 'Срабатывает уже после паузы и показывает отложенный отклик.', 'pioneer.led_control(r=0, g=0, b=255)')
            ],
            links: [
                { label: 'time.sleep', query: 'time.sleep' },
                { label: 'Pioneer.led_control', query: 'Pioneer.led_control' }
            ],
            starterCode: `# TODO: подождите time.sleep(1), затем включите синий цвет через pioneer.led_control(...) и выведите print("Задержка завершена")`,
            solutionCode: `time.sleep(1)
pioneer.led_control(r=0, g=0, b=255)
print("Задержка завершена")`
        },
        {
            id: 'py-arm-text',
            topicId: 'preflight',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 3',
            title: 'Подготовить двигатели',
            goal: 'Соберите шаг подготовки в Python: вызовите `arm()` и выведите сообщение о готовности.',
            summary: 'Здесь важно понять, что без `arm()` следующие команды полета логически преждевременны.',
            lessonIntro: 'С этого урока начинается работа с полетными командами Python SDK. Прежде чем думать о взлете и маршруте, нужно понять обязательный подготовительный шаг `arm()`.',
            expectedOutcome: 'Двигатели дрона переходят в состояние готовности, а в журнале появляется сообщение об этом.',
            builderHint: 'Проверьте результат `arm()` перед тем, как сообщать о готовности.',
            apiFocus: [
                apiFocus('pioneer.arm()', 'Переводит дрон в состояние готовности к полету. Без этого вызова последующие команды взлета преждевременны.', 'pioneer.arm()'),
                apiFocus('print(...)', 'Не управляет дроном, но помогает подтвердить, что нужный шаг в сценарии действительно достигнут.', 'print("Двигатели готовы")')
            ],
            links: [
                { label: 'Pioneer.arm', query: 'Pioneer.arm', previewKey: 'Pioneer.arm' }
            ],
            starterCode: `# TODO: вызовите pioneer.arm(), и если он вернет True, выведите print("Двигатели готовы")`,
            solutionCode: `if pioneer.arm():
    print("Двигатели готовы")`
        },
        {
            id: 'py-takeoff-text',
            topicId: 'takeoff',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 4',
            title: 'Взлет с паузой',
            goal: 'Соберите базовый сценарий взлета: `arm()` -> пауза -> `takeoff()`.',
            summary: 'Пауза между подготовкой и взлетом помогает увидеть причинно-следственную связь команд.',
            lessonIntro: 'В этом уроке вы строите минимальный полетный сценарий: подготовка, короткая задержка и взлет. Это хорошая практика для понимания порядка команд и наблюдаемого поведения дрона.',
            expectedOutcome: 'Дрон сначала подготовит двигатели, затем после короткой паузы поднимется в воздух.',
            builderHint: 'Если поставить `takeoff()` раньше паузы или вовсе до `arm()`, это будет логическая ошибка даже при корректном синтаксисе.',
            apiFocus: [
                apiFocus('pioneer.arm()', 'Подготавливает двигатели к полету и должен идти первым.', 'pioneer.arm()'),
                apiFocus('time.sleep(1)', 'Дает короткую паузу между подготовкой и взлетом, чтобы переход был наглядным.', 'time.sleep(1)'),
                apiFocus('pioneer.takeoff()', 'Отправляет команду взлета после подготовки.', 'pioneer.takeoff()')
            ],
            links: [
                { label: 'Pioneer.takeoff', query: 'Pioneer.takeoff', previewKey: 'Pioneer.takeoff' },
                { label: 'time.sleep', query: 'time.sleep takeoff arm' }
            ],
            starterCode: `if pioneer.arm():
    # TODO: подождите time.sleep(1) и вызовите pioneer.takeoff()
    pass`,
            solutionCode: `if pioneer.arm():
    time.sleep(1)
    pioneer.takeoff()`
        },
        {
            id: 'py-route-text',
            topicId: 'route',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 7',
            title: 'Полет к локальной точке',
            goal: 'Соберите базовую маршрутную цепочку: `arm()`, пауза, `takeoff()`, ожидание набора высоты и `go_to_local_point(...)`.',
            summary: 'Урок отделяет сам факт взлета от начала навигации и показывает, что маршрут тоже должен иметь свой осмысленный момент запуска.',
            lessonIntro: 'Даже в линейном Python-сценарии полезно мыслить этапами. Сначала дрон подготавливается, затем взлетает, затем получает время на набор высоты, и только после этого отправляется к точке.',
            expectedOutcome: 'Дрон подготовит двигатели, взлетит и, дав себе время набрать высоту, отправится к заданной точке маршрута.',
            builderHint: 'Не пропускайте вторую паузу: она отделяет сам взлет от начала навигации.',
            apiFocus: [
                apiFocus('pioneer.go_to_local_point(x, y, z)', 'Отправляет дрон к локальной координате после взлета.', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                apiFocus('time.sleep(3)', 'Дает дрону время закончить взлет и перейти к устойчивому полету.', 'time.sleep(3)')
            ],
            links: [
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' },
                { label: 'Pioneer.takeoff', query: 'Pioneer.takeoff', previewKey: 'Pioneer.takeoff' }
            ],
            starterCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
# TODO: отправьте дрон в точку через pioneer.go_to_local_point(x=1, y=0, z=1)`,
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)`
        },
        {
            id: 'py-point-wait-text',
            topicId: 'point-confirm',
            chapterId: GUIDE_CHAPTER_IDS.flight,
            badge: 'Задание 8',
            title: 'Дождаться достижения точки',
            goal: 'Расширьте маршрут: после `go_to_local_point(...)` дождитесь `point_reached()` и только затем выведите сообщение об успехе.',
            summary: 'Урок закрепляет ключевую мысль: отправка маршрута и завершение маршрута это разные вещи.',
            lessonIntro: 'В Python особенно легко написать слишком оптимистичный сценарий, где после команды маршрута сразу идет следующий шаг. Этот урок вводит обязательную проверку результата через `point_reached()`.',
            expectedOutcome: 'Дрон долетит до точки маршрута, и только после подтверждения, что точка действительно достигнута, в журнале появится сообщение об успехе.',
            builderHint: 'Цикл ожидания должен стоять сразу после `go_to_local_point(...)`, иначе подтверждение маршрута станет преждевременным.',
            apiFocus: [
                apiFocus('pioneer.point_reached()', 'Сообщает, что дрон действительно достиг заданной координаты.', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                apiFocus('print(...)', 'В этом уроке используется для подтверждения уже завершенного маршрута.', 'print("Точка достигнута")')
            ],
            links: [
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' },
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' }
            ],
            starterCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)

# TODO: дождитесь pioneer.point_reached() в цикле while, а затем выведите print("Точка достигнута")`,
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)
while not pioneer.point_reached():
    time.sleep(0.05)
print("Точка достигнута")`
        },
        {
            id: 'py-mission-text',
            topicId: 'mission',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 5',
            title: 'Маршрут с ожиданием точки и посадкой',
            goal: 'Соберите полноценную Python-миссию: `arm()`, `takeoff()`, ожидание, `go_to_local_point(...)`, цикл `point_reached()` и `land()`.',
            summary: 'В финальном уроке блоки все еще совместимы по форме, но любая ошибка порядка нарушает логику сценария.',
            lessonIntro: 'Финальный Python-урок собирает полный маршрут: от подготовки дрона до завершения миссии посадкой. Здесь уже особенно важно понимать, зачем нужен каждый вызов и какое состояние он предполагает.',
            expectedOutcome: 'Дрон подготовится, взлетит, долетит до заданной точки и затем безопасно приземлится, только после подтверждения, что точка действительно достигнута.',
            builderHint: 'Особенно следите за блоком ожидания точки: без него посадка может уйти до завершения перемещения.',
            apiFocus: [
                apiFocus('pioneer.go_to_local_point(x, y, z)', 'Отправляет дрон к локальной координате после взлета и набора высоты.', 'pioneer.go_to_local_point(x=1, y=0, z=1)'),
                apiFocus('pioneer.point_reached()', 'Проверяет, завершен ли маршрут. Без этого ожидания посадка может начаться слишком рано.', 'while not pioneer.point_reached():\n    time.sleep(0.05)'),
                apiFocus('pioneer.land()', 'Завершает миссию безопасной посадкой после достижения точки.', 'pioneer.land()')
            ],
            links: [
                { label: 'Pioneer.go_to_local_point', query: 'Pioneer.go_to_local_point', previewKey: 'Pioneer.go_to_local_point' },
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' },
                { label: 'Pioneer.land', query: 'Pioneer.land', previewKey: 'Pioneer.land' }
            ],
            starterCode: `# TODO: соберите полную миссию: arm() -> пауза -> takeoff() -> пауза -> go_to_local_point(x=1, y=0, z=1) -> дождитесь point_reached() -> land()`,
            solutionCode: `if pioneer.arm():
    time.sleep(1)
    pioneer.takeoff()

time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)

while not pioneer.point_reached():
    time.sleep(0.05)

pioneer.land()`
        },
        {
            id: 'py-land-text',
            topicId: 'landing',
            chapterId: GUIDE_CHAPTER_IDS.mission,
            badge: 'Задание 9',
            title: 'Посадка после маршрута',
            goal: 'Соберите полетную цепочку, где `land()` вызывается только после подтверждения `point_reached()`.',
            summary: 'Это предпоследний этап курса: безопасное завершение маршрута с явной проверкой результата перед посадкой.',
            lessonIntro: 'Посадка в учебной миссии должна быть финальным шагом, а не реакцией "по времени". Правильнее сначала убедиться, что точка достигнута, и только потом завершать полет.',
            expectedOutcome: 'Дрон долетит до точки маршрута и приземлится только после подтверждения, что точка действительно достигнута.',
            builderHint: 'Если `land()` стоит выше блока ожидания точки, миссия завершится слишком рано.',
            apiFocus: [
                apiFocus('pioneer.land()', 'Завершает миссию после подтвержденного достижения цели.', 'pioneer.land()'),
                apiFocus('pioneer.point_reached()', 'Гарантирует, что маршрут действительно завершен к моменту посадки.', 'while not pioneer.point_reached():\n    time.sleep(0.05)')
            ],
            links: [
                { label: 'Pioneer.land', query: 'Pioneer.land', previewKey: 'Pioneer.land' },
                { label: 'Pioneer.point_reached', query: 'Pioneer.point_reached', previewKey: 'Pioneer.point_reached' }
            ],
            starterCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)
while not pioneer.point_reached():
    time.sleep(0.05)

# TODO: безопасно завершите миссию через pioneer.land()`,
            solutionCode: `pioneer.arm()
time.sleep(1)
pioneer.takeoff()
time.sleep(3)
pioneer.go_to_local_point(x=1, y=0, z=1)
while not pioneer.point_reached():
    time.sleep(0.05)
pioneer.land()`
        }
    ]);
}
