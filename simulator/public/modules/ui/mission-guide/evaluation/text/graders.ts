/**
 * Грейдеры текстовых (Lua/Python) уроков практикума.
 *
 * В отличие от Blockly-грейдеров (`../lua-led-single.ts`, `../lua-led-sequence.ts`,
 * работающих над XML воркспейса), эти функции проверяют РЕЗУЛЬТАТ выполнения реального
 * кода — снимок состояния дрона (`DroneSnapshot`, см. `./snapshot.ts`).
 *
 * Один и тот же грейдер обслуживает и Lua-, и Python-версию урока с одним и тем же
 * topic-id, потому что итоговое состояние симулятора (`leds`, `pos`, `fsmState`,
 * `pointReachedFlag`, ...) обновляется одинаково независимо от языка, который им
 * управлял — см. `public/modules/autopilot/fsm.ts` (единые `enterPreflight`,
 * `enterTakeoffProcess`, `enterLandingProcess`, `applyGoToLocalPointRequest`) и
 * `public/modules/python/pioneer-js-bridge.ts` (Python-мост вызывает те же функции).
 *
 * ВАЖНЫЕ ОГРАНИЧЕНИЯ (проверено чтением исходников):
 * - `recentApiCalls` заполняется ТОЛЬКО для Lua: обёртка `__diag_record(...)` в
 *   `public/modules/lua/setup-script.ts` логирует лишь `ap.push`, `ap.goToPoint`,
 *   `ap.goToLocalPoint`, `ap.updateYaw`, `Timer.callLater`, `Timer.new`. Python-мост
 *   (`pioneer-js-bridge.ts`) никогда не вызывает `recordLuaApiCall`, поэтому для
 *   Python-сценариев `recentApiCalls` почти всегда пуст. Также ни для Lua, ни для
 *   Python не логируются вызовы управления светодиодами (`leds:set` / `led_control`)
 *   — эти массивы НЕ помогают отличить синий/зелёный/красный шаг LED-последовательности
 *   ни для одного из языков.
 * - `fsmTransitions`, вопреки названию поля (`luaDiagnostics.fsmTransitions`), ФАКТИЧЕСКИ
 *   заполняется для ОБОИХ языков: единая функция `setDroneFsmState()`
 *   (`public/modules/autopilot/fsm-runtime.ts`) вызывает `recordLuaFsmTransition(...)`
 *   при КАЖДОЙ смене состояния, независимо от того, кто её инициировал (Lua-скрипт или
 *   Python-мост через `withCommandSource(d, 'python', ...)`). Поэтому грейдеры ниже
 *   активно используют историю переходов FSM как надёжный языково-независимый сигнал.
 * - Симулятор не хранит ни истории цветов светодиодов, ни истории print/лог-сообщений
 *   в `DroneSnapshot` (см. состав интерфейса в `./snapshot.ts`), поэтому такие проверки,
 *   как "цвет был синим, потом зелёным" или "было подтверждающее сообщение", в общем
 *   случае невозможны без снимка состояния в несколько промежуточных моментов времени.
 *   Ниже это отражено явными `info`-диагностиками, а не фиктивным `success`.
 */
import type { GuideDiagnostic } from '../../types.js';
import type { DroneSnapshot } from './snapshot.js';

export type TextLessonGrader = (snapshot: DroneSnapshot) => GuideDiagnostic[];

/** Из скольки единиц (0-255) допустимо отклонение при сравнении цвета светодиода. */
const LED_COLOR_TOLERANCE = 24;
/** Насколько близко к земле должна быть высота, чтобы считать посадку завершенной. */
const GROUND_EPSILON = 0.3;
/** Минимальная высота, чтобы засчитать взлёт. */
const TAKEOFF_ALTITUDE_EPSILON = 0.5;
/** Минимальное смещение от предполагаемой точки старта, чтобы засчитать движение по маршруту. */
const ROUTE_DISTANCE_EPSILON = 0.5;

type LedColorLike = { r: number; g: number; b: number };

function firstLed(snapshot: DroneSnapshot): LedColorLike {
    return snapshot.leds[0] || { r: 0, g: 0, b: 0, w: 0 };
}

function colorCloseTo(led: LedColorLike, target: LedColorLike, tolerance = LED_COLOR_TOLERANCE): boolean {
    return Math.abs(led.r - target.r) <= tolerance
        && Math.abs(led.g - target.g) <= tolerance
        && Math.abs(led.b - target.b) <= tolerance;
}

function describeColor(led: LedColorLike): string {
    return `r=${Math.round(led.r)}, g=${Math.round(led.g)}, b=${Math.round(led.b)}`;
}

function hasFsmTransitionTo(snapshot: DroneSnapshot, to: string): boolean {
    return snapshot.fsmTransitions.some((transition) => transition.to === to);
}

function hasFsmTransition(snapshot: DroneSnapshot, from: string, to: string): boolean {
    return snapshot.fsmTransitions.some((transition) => transition.from === from && transition.to === to);
}

function successDiagnostic(title: string, reason: string): GuideDiagnostic {
    return {
        kind: 'success',
        title,
        reason,
        fix: 'Ничего делать не нужно, проверка пройдена.'
    };
}

function errorDiagnostic(title: string, reason: string, fix: string): GuideDiagnostic {
    return { kind: 'error', title, reason, fix };
}

function infoDiagnostic(title: string, reason: string, fix: string): GuideDiagnostic {
    return { kind: 'info', title, reason, fix };
}

// --- led-single: первый светодиод должен стать красным (255, 0, 0). ---
function gradeLedSingle(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const led = firstLed(snapshot);
    const target: LedColorLike = { r: 255, g: 0, b: 0 };

    if (colorCloseTo(led, target)) {
        return [successDiagnostic(
            'Первый светодиод горит красным',
            `leds[0] = {${describeColor(led)}} — совпадает с ожидаемым красным цветом (255, 0, 0).`
        )];
    }

    if (led.r === 0 && led.g === 0 && led.b === 0) {
        return [errorDiagnostic(
            'Светодиод так и не загорелся',
            'leds[0] остался {r:0, g:0, b:0} — команда управления светодиодом либо не выполнилась, либо задан не тот индекс.',
            'Проверьте, что скрипт задаёт цвет именно нулевому светодиоду (`leds:set(0, 1, 0, 0)` в Lua или `pioneer.led_control(led_id=0, r=255, g=0, b=0)` в Python) и что вызов действительно выполняется.'
        )];
    }

    return [errorDiagnostic(
        'Цвет первого светодиода не совпадает с ожидаемым',
        `leds[0] = {${describeColor(led)}}, а нужен чистый красный (255, 0, 0).`,
        'Задайте первому светодиоду максимум красного канала и обнулите зелёный и синий.'
    )];
}

// --- led-sequence: синий -> зелёный -> красный за ~3 секунды. ---
function gradeLedSequence(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const led = firstLed(snapshot);
    const target: LedColorLike = { r: 255, g: 0, b: 0 };

    if (!colorCloseTo(led, target)) {
        return [errorDiagnostic(
            'В конце сценария светодиод должен быть красным',
            `К моменту проверки leds[0] = {${describeColor(led)}}, ожидался финальный красный (255, 0, 0), которым должна заканчиваться последовательность синий -> зелёный -> красный.`,
            'Проверьте порядок команд и что скрипт успевает выполнить последний шаг (задержки в сумме должны укладываться во время проверки).'
        )];
    }

    return [
        successDiagnostic(
            'Финальный цвет светодиода — красный',
            `leds[0] = {${describeColor(led)}} в конце проверки соответствует ожидаемому финалу последовательности.`
        ),
        infoDiagnostic(
            'Промежуточные цвета (синий, зелёный) не проверяются',
            'Симулятор не хранит историю смены цветов светодиодов ни для Lua, ни для Python (не логируется ни в `recentApiCalls`, ни где-либо ещё) — грейдер видит только один финальный снимок состояния.',
            'Если важно строго проверить порядок цветов, потребуется отдельный механизм снятия промежуточных снимков — сейчас это упрощение.'
        )
    ];
}

// --- led-confirm: светодиод становится зелёным + (недоступная) проверка подтверждающего вывода. ---
function gradeLedConfirm(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const led = firstLed(snapshot);
    const target: LedColorLike = { r: 0, g: 255, b: 0 };

    if (!colorCloseTo(led, target)) {
        return [errorDiagnostic(
            'Светодиод должен стать зелёным',
            `leds[0] = {${describeColor(led)}}, а ожидался зелёный (0, 255, 0).`,
            'Проверьте вызов управления светодиодом: зелёный канал должен быть на максимуме, красный и синий — на нуле.'
        )];
    }

    return [
        successDiagnostic(
            'Светодиод горит зелёным',
            `leds[0] = {${describeColor(led)}} совпадает с ожидаемым зелёным.`
        ),
        infoDiagnostic(
            'Подтверждающий текстовый вывод не проверяется',
            'Снимок состояния дрона (`DroneSnapshot`) не содержит истории print/лог-сообщений, поэтому оценивается только итоговый цвет светодиода.',
            'Если наличие текстового подтверждения критично для урока, проверьте вывод скрипта вручную либо расширьте снимок состояния логами (вне рамок этой задачи).'
        )
    ];
}

// --- led-delayed: светодиод включается не сразу, а после задержки. ---
function gradeLedDelayed(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const led = firstLed(snapshot);
    const isOn = led.r > LED_COLOR_TOLERANCE || led.g > LED_COLOR_TOLERANCE || led.b > LED_COLOR_TOLERANCE;

    if (!isOn) {
        return [errorDiagnostic(
            'Светодиод так и не загорелся',
            `К концу проверки leds[0] = {${describeColor(led)}} — светодиод остался выключен.`,
            'Проверьте, что таймер/задержка действительно включает светодиод, а не только планирует его включение.'
        )];
    }

    return [
        successDiagnostic(
            'Светодиод включен к концу ожидания',
            `leds[0] = {${describeColor(led)}} — светодиод включен.`
        ),
        infoDiagnostic(
            'Сама задержка перед включением не проверяется',
            'Грейдер получает только один финальный снимок состояния и не может сравнить его с состоянием сразу после старта скрипта, поэтому нельзя подтвердить, что светодиод не включился раньше времени.',
            'Если важно проверить именно задержку, нужен дополнительный ранний снимок состояния в оркестрации урока.'
        )
    ];
}

// --- preflight: fsmState достигает 'PREFLIGHT' (Lua ap.push(Ev.MCE_PREFLIGHT) / Python pioneer.arm()). ---
function gradePreflight(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const reachedPreflight = snapshot.fsmState === 'PREFLIGHT' || hasFsmTransitionTo(snapshot, 'PREFLIGHT');

    if (!reachedPreflight) {
        return [errorDiagnostic(
            'Дрон не перешёл в состояние PREFLIGHT',
            `Текущее состояние — ${snapshot.fsmState}, переходов в PREFLIGHT в истории FSM не найдено.`,
            'Убедитесь, что скрипт вызывает команду армирования: `ap.push(Ev.MCE_PREFLIGHT)` в Lua или `pioneer.arm()` в Python.'
        )];
    }

    return [successDiagnostic(
        'Дрон успешно вооружён (PREFLIGHT)',
        `Зафиксирован переход в состояние PREFLIGHT (текущее состояние: ${snapshot.fsmState}).`
    )];
}

// --- takeoff: fsmState достигает TAKEOFF_PROCESS/полёта, и pos.z заметно выше земли. ---
function gradeTakeoff(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const flyingStates = new Set(['TAKEOFF_PROCESS', 'FLYING_HOVER', 'FLYING_MOVING']);
    const reachedTakeoffState = flyingStates.has(snapshot.fsmState) || hasFsmTransitionTo(snapshot, 'TAKEOFF_PROCESS');
    const roseHighEnough = snapshot.pos.z > TAKEOFF_ALTITUDE_EPSILON;

    if (!reachedTakeoffState) {
        return [errorDiagnostic(
            'Дрон не начал взлёт',
            `Состояние ${snapshot.fsmState}, переходов в TAKEOFF_PROCESS в истории FSM не найдено.`,
            'Проверьте, что после армирования вызывается команда взлёта: `ap.push(Ev.MCE_TAKEOFF)` в Lua или `pioneer.takeoff()` в Python.'
        )];
    }

    if (!roseHighEnough) {
        return [errorDiagnostic(
            'Высота дрона недостаточна для взлёта',
            `pos.z = ${snapshot.pos.z.toFixed(2)} м, ожидалось больше ${TAKEOFF_ALTITUDE_EPSILON} м.`,
            'Дайте сценарию больше времени на взлёт (увеличьте `waitMs` проверки) либо проверьте целевую высоту взлёта в скрипте.'
        )];
    }

    return [successDiagnostic(
        'Взлёт выполнен',
        `Состояние ${snapshot.fsmState}, высота pos.z = ${snapshot.pos.z.toFixed(2)} м.`
    )];
}

// --- route: pos.{x,y} заметно сместилась в сторону цели. ---
function gradeRoute(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const movedTransition = hasFsmTransitionTo(snapshot, 'FLYING_MOVING');
    const horizontalDistanceFromOrigin = Math.sqrt(snapshot.pos.x ** 2 + snapshot.pos.y ** 2);
    const movedMeaningfully = horizontalDistanceFromOrigin > ROUTE_DISTANCE_EPSILON;

    if (!movedTransition && !movedMeaningfully) {
        return [errorDiagnostic(
            'Дрон не сдвинулся к точке маршрута',
            `Позиция осталась около начальной (x=${snapshot.pos.x.toFixed(2)}, y=${snapshot.pos.y.toFixed(2)}), переходов в FLYING_MOVING не найдено.`,
            'Проверьте вызов команды перемещения: `ap.goToLocalPoint(...)` / `ap.goToPoint(...)` в Lua или `pioneer.go_to_local_point(...)` в Python.'
        )];
    }

    return [
        successDiagnostic(
            'Дрон переместился по маршруту',
            `Позиция сместилась на ${horizontalDistanceFromOrigin.toFixed(2)} м от предполагаемой точки старта${movedTransition ? ', зафиксирован переход в FLYING_MOVING' : ''}.`
        ),
        infoDiagnostic(
            'Проверка использует (0, 0) как предполагаемую точку старта',
            'Снимок состояния не содержит исходной позиции дрона или `target_pos`, поэтому смещение считается от начала координат — это может быть неточно, если дрон стартовал не из (0, 0).',
            'Для точной проверки маршрута нужно отдельно сохранять стартовую позицию перед запуском урока.'
        )
    ];
}

// --- point-confirm: pointReachedFlag стал true, либо FSM показывает прибытие в точку. ---
function gradePointConfirm(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const flagSet = snapshot.pointReachedFlag === true;
    const transitionSeen = hasFsmTransition(snapshot, 'FLYING_MOVING', 'FLYING_HOVER');

    if (!flagSet && !transitionSeen) {
        return [errorDiagnostic(
            'Точка маршрута не была достигнута',
            `pointReachedFlag = ${snapshot.pointReachedFlag}, переход FLYING_MOVING -> FLYING_HOVER в истории FSM не зафиксирован.`,
            'Проверьте, что скрипт дожидается прибытия в точку: цикл ожидания `pioneer.point_reached()` в Python или обработка `Ev.POINT_REACHED` в Lua.'
        )];
    }

    const diagnostics: GuideDiagnostic[] = [successDiagnostic(
        'Точка маршрута достигнута',
        flagSet
            ? 'pointReachedFlag = true в момент снимка состояния.'
            : 'Зафиксирован переход FLYING_MOVING -> FLYING_HOVER, что соответствует прибытию в целевую точку.'
    )];

    if (!flagSet) {
        diagnostics.push(infoDiagnostic(
            'pointReachedFlag уже сброшен к моменту снимка',
            '`pioneer.point_reached()` в Python сам сбрасывает флаг сразу после успешного чтения (см. `pioneer_point_reached` в `pioneer-js-bridge.ts`), поэтому итоговый снимок часто застаёт flag=false, даже если точка была достигнута. Поэтому проверка полагается на историю переходов FSM как на более надёжный сигнал.',
            'Ничего делать не нужно — это особенность API, а не ошибка скрипта.'
        ));
    }

    return diagnostics;
}

// --- mission: взлёт + достижение точки + дрон всё ещё отслеживается в конце. ---
function gradeMission(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const tookOff = hasFsmTransitionTo(snapshot, 'TAKEOFF_PROCESS')
        || ['TAKEOFF_PROCESS', 'FLYING_HOVER', 'FLYING_MOVING'].includes(snapshot.fsmState);
    const pointReached = snapshot.pointReachedFlag === true || hasFsmTransition(snapshot, 'FLYING_MOVING', 'FLYING_HOVER');

    const missing: string[] = [];
    if (!tookOff) missing.push('взлёт (переход в TAKEOFF_PROCESS)');
    if (!pointReached) missing.push('достижение точки маршрута');

    if (missing.length > 0) {
        return [errorDiagnostic(
            'Миссия выполнена не полностью',
            `Не подтверждено: ${missing.join(', ')}. Итоговое состояние: ${snapshot.fsmState}.`,
            'Проверьте полную последовательность миссии целиком: взлёт, перемещение к точке, ожидание её достижения.'
        )];
    }

    return [
        successDiagnostic(
            'Миссия выполнена',
            `Зафиксированы и взлёт, и достижение точки маршрута. Итоговое состояние: ${snapshot.fsmState}.`
        ),
        infoDiagnostic(
            '«Дрон всё ещё отслеживается» проверяется лишь косвенно',
            'Снимок состояния подтверждает, что дрон с текущим `currentDroneId` существует (иначе проверка не дошла бы до этого места), но не различает штатное завершение миссии от, например, аварийного состояния — в `DroneSnapshot` нет поля статуса/аварии.',
            'Ничего делать не нужно; это ограничение текущей модели снимка состояния.'
        )
    ];
}

// --- landing: fsmState достигает LANDING_PROCESS/IDLE, и pos.z возвращается к земле. ---
function gradeLanding(snapshot: DroneSnapshot): GuideDiagnostic[] {
    const enteredLanding = hasFsmTransitionTo(snapshot, 'LANDING_PROCESS');
    const isIdleOrLanding = snapshot.fsmState === 'IDLE' || snapshot.fsmState === 'LANDING_PROCESS';
    const backOnGround = snapshot.pos.z <= GROUND_EPSILON;

    if (!enteredLanding && !isIdleOrLanding) {
        return [errorDiagnostic(
            'Дрон не начал посадку',
            `Состояние ${snapshot.fsmState}, переходов в LANDING_PROCESS в истории FSM не найдено.`,
            'Проверьте вызов команды посадки: `ap.push(Ev.MCE_LANDING)` в Lua или `pioneer.land()` в Python.'
        )];
    }

    if (!backOnGround) {
        return [errorDiagnostic(
            'Дрон ещё не приземлился',
            `pos.z = ${snapshot.pos.z.toFixed(2)} м, ожидалось значение около 0.`,
            'Дайте сценарию больше времени на завершение посадки (увеличьте `waitMs` проверки).'
        )];
    }

    return [successDiagnostic(
        'Посадка выполнена',
        `Состояние ${snapshot.fsmState}, pos.z = ${snapshot.pos.z.toFixed(2)} м.`
    )];
}

/**
 * Реестр грейдеров по topic-id. Ключи ДОЛЖНЫ дословно совпадать со списком тем,
 * который использует параллельный агент, готовящий контент уроков.
 */
export const TEXT_LESSON_GRADERS: Record<string, TextLessonGrader> = {
    'led-single': gradeLedSingle,
    'led-sequence': gradeLedSequence,
    'led-confirm': gradeLedConfirm,
    'led-delayed': gradeLedDelayed,
    'preflight': gradePreflight,
    'takeoff': gradeTakeoff,
    'route': gradeRoute,
    'point-confirm': gradePointConfirm,
    'mission': gradeMission,
    'landing': gradeLanding
};
