import type { LearningEvent } from '../../../core/learning-journal.js';
import type { GuideDiagnostic, GuideEvaluation } from '../types.js';
import type { DroneSample } from '../evaluation/text/trace.js';

/**
 * Проверка миссий трека «Мини 2 · SDK2».
 *
 * Те же наблюдения, что у уроков Академии: журнал запуска (`LearningEvent`: arm, state, print, led, position, range,
 * velocity, camera, detect, display) и снимки дрона (`DroneSample`). Проверка не читает текст программы: она сверяет
 * то, что дрон сделал (взлёт, прилёт в точки, цвета светодиодов), с тем, что программа напечатала.
 * Каждая миссия описывает ожидание функцией `check(g)`, а `Sdk2Grader` даёт для неё готовые примитивы.
 */
export const SDK2_DONE_MESSAGE = 'Опыт завершён';

export type Point = [x: number, y: number, z?: number];
export type LedColor = 'off' | 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'white' | 'magenta' | 'cyan' | 'other';

export function ledColorName(color: { r: number; g: number; b: number }): LedColor {
    const { r, g, b } = color;
    if (Math.max(r, g, b) < 30) return 'off';
    const hi = (v: number) => v > 200;
    const lo = (v: number) => v < 60;
    if (hi(r) && lo(g) && lo(b)) return 'red';
    if (hi(g) && lo(r) && lo(b)) return 'green';
    if (hi(b) && lo(r) && lo(g)) return 'blue';
    if (hi(r) && hi(g) && b < 80) return 'yellow';
    if (hi(r) && g >= 60 && g <= 200 && lo(b)) return 'orange';
    if (hi(r) && hi(g) && hi(b)) return 'white';
    if (hi(r) && hi(b) && lo(g)) return 'magenta';
    if (hi(g) && hi(b) && lo(r)) return 'cyan';
    return 'other';
}

export type Arrival = { time: number; pos: { x: number; y: number; z: number }; yaw: number };
export type LedChange = { time: number; led: number; color: LedColor };

export class Sdk2Grader {
    readonly diagnostics: GuideDiagnostic[] = [];
    readonly prints: string[];
    readonly printEvents: LearningEvent[];
    readonly arms: LearningEvent[];
    readonly states: LearningEvent[];
    readonly last: DroneSample['snapshot'] | undefined;
    /** Прилёты в точки: переход FLYING_MOVING → FLYING_HOVER. */
    readonly arrivals: Arrival[];
    /** Взлёт: переход TAKEOFF_PROCESS → полёт. */
    readonly takeoffDone: LearningEvent | undefined;
    readonly landStart: LearningEvent | undefined;
    readonly landed: LearningEvent | undefined;

    constructor(readonly samples: DroneSample[], readonly events: LearningEvent[], readonly doneMessage: string = SDK2_DONE_MESSAGE) {
        this.last = samples[samples.length - 1]?.snapshot;
        this.printEvents = events.filter((event) => event.kind === 'print');
        this.prints = this.printEvents.map((event) => (event.text ?? '').trim());
        this.arms = events.filter((event) => event.kind === 'arm');
        this.states = events.filter((event) => event.kind === 'state');
        this.takeoffDone = this.states.find((event) => event.from === 'TAKEOFF_PROCESS' && (event.state === 'FLYING_HOVER' || event.state === 'FLYING_MOVING'));
        this.landStart = this.states.find((event) => event.state === 'LANDING_PROCESS');
        this.landed = this.states.find((event) => event.from === 'LANDING_PROCESS' && event.state === 'IDLE');
        this.arrivals = this.states
            .filter((event) => event.from === 'FLYING_MOVING' && event.state === 'FLYING_HOVER' && event.pos)
            .map((event) => ({ time: event.time, pos: event.pos!, yaw: event.yaw ?? 0 }));
    }

    fail(title: string, reason: string, fix: string): void {
        this.diagnostics.push({ kind: 'error', title, reason, fix });
    }

    /** Общие условия: программа не упала, дошла до конца; без полёта дрон остаётся на земле. */
    basics(flight: boolean): this {
        const bad = this.samples.some((sample) => /ОШИБКА|CRASHED|DISARMED_FALL/.test(sample.snapshot.status || ''));
        if (!this.last) this.fail('Нет наблюдений', 'Состояние дрона недоступно.', 'Дождитесь загрузки сцены и повторите проверку.');
        if (bad) this.fail('Программа завершилась ошибкой или аварией', 'Опыт прерван до конца, поэтому его результат не засчитывается.', 'Прочитайте первую ошибку в журнале (чаще всего это опечатка в имени метода или аргумента) и запустите проверку снова.');
        else if (!this.prints.includes(this.doneMessage)) this.fail('Программа не дошла до конца', `В журнале нет строки «${this.doneMessage}».`, this.doneMessage === SDK2_DONE_MESSAGE ? `Оставьте в конце программы print("${SDK2_DONE_MESSAGE}") и уберите из кода всё, что останавливает программу раньше.` : 'Программа должна дойти до конца: уберите бесконечные циклы и блоки, которые ждут вечно.');
        if (!flight && this.last && (Math.abs(this.last.pos.z) > 0.15 || this.states.some((event) => event.state === 'TAKEOFF_PROCESS'))) {
            this.fail('В этой миссии взлёт не нужен', 'Дрон поднялся в воздух, а миссия выполняется на земле.', 'Уберите takeoff() и команды полёта.');
        }
        return this;
    }

    armOnce(): this {
        const accepted = this.arms.filter((event) => event.accepted);
        if (accepted.length !== 1) this.fail('Нужна одна подготовка моторов', `Принятых команд arm() — ${accepted.length}, а нужна ровно одна.`, 'Вызовите pioneer.arm() один раз перед взлётом.');
        return this;
    }

    noArm(): this {
        if (this.arms.length) this.fail('Моторы запускать не нужно', 'В журнале есть arm(), хотя миссия выполняется без запуска двигателей.', 'Уберите pioneer.arm().');
        return this;
    }

    /** Взлёт подтверждён и дрон повис на высоте не ниже minZ. */
    takeoff(minZ = 0.3): this {
        const hover = this.takeoffDone;
        if (!hover || !hover.pos || hover.pos.z < minZ) this.fail('Взлёт не подтверждён', 'Не видно, что дрон поднялся и завис после takeoff().', 'Вызовите pioneer.arm(), затем pioneer.takeoff() и дождитесь окончания взлёта.');
        return this;
    }

    /** Посадка завершена: после посадки дрон на земле, моторы остановлены. */
    landing(): this {
        if (!this.landStart || !this.landed || !this.last || this.last.pos.z > 0.2 || this.last.fsmState !== 'IDLE') {
            this.fail('Посадка не подтверждена', 'Дрон не закончил посадку: в конце программы он не стоит на земле.', 'Вызовите pioneer.land() и дождитесь окончания. Программа должна завершиться на земле.');
        }
        return this;
    }

    /** Секунд между окончанием взлёта и началом посадки. */
    airTime(): number {
        return this.takeoffDone && this.landStart ? this.landStart.time - this.takeoffDone.time : 0;
    }

    /** Прилёты в точки по порядку (подпоследовательность). Допуск tol, м; если z не указан — высота не проверяется. */
    route(points: Point[], tol = 0.4): this {
        let index = 0;
        for (const arrival of this.arrivals) {
            const target = points[index];
            if (!target) break;
            const near = Math.hypot(arrival.pos.x - target[0], arrival.pos.y - target[1]) <= tol && (target[2] === undefined || Math.abs(arrival.pos.z - target[2]) <= tol);
            if (near) index += 1;
        }
        if (index < points.length) {
            const target = points[index];
            const where = `(${target[0]}, ${target[1]}${target[2] === undefined ? '' : `, ${target[2]}`})`;
            this.fail(index === 0 ? 'Дрон не прилетел в первую точку' : `Точка ${index + 1} не достигнута`, `Ожидался прилёт в точку ${where}, засчитано точек: ${index} из ${points.length}.`, 'Проверьте координаты и дождитесь прилёта: после go_to_local_point ждите point_reached().');
        }
        return this;
    }

    /** Значение строки журнала вида «Метка: значение»; null, если такой строки нет. */
    text(label: string): string | null {
        const line = this.prints.find((item) => item.startsWith(label));
        return line === undefined ? null : line.slice(label.length).trim();
    }

    texts(label: string): string[] {
        return this.prints.filter((item) => item.startsWith(label)).map((item) => item.slice(label.length).trim());
    }

    /** Числа из первой строки с этой подписью. */
    numbers(label: string): number[] | null {
        const value = this.text(label);
        if (value === null) return null;
        const numbers = (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        return numbers.length ? numbers : null;
    }

    expectText(label: string, expected: string, fix: string): this {
        const value = this.text(label);
        if (value === null) this.fail(`Нет строки «${label}»`, 'Строка не напечатана.', fix);
        else if (value !== expected) this.fail(`Строка «${label}» не совпала`, `Ожидалось «${expected}», напечатано «${value}».`, fix);
        return this;
    }

    expectNumber(label: string, min: number, max: number, fix: string): number | null {
        const value = this.numbers(label)?.[0];
        if (value === undefined) { this.fail(`Нет строки «${label}»`, 'Число не напечатано.', fix); return null; }
        if (!(value >= min && value <= max)) { this.fail(`Значение «${label}» вне ожидаемого`, `Напечатано ${value}, ожидалось от ${min} до ${max}.`, fix); return null; }
        return value;
    }

    /** Строки журнала по порядку (подпоследовательность). */
    order(lines: string[], fix: string): this {
        let at = 0;
        for (const line of lines) {
            const found = this.prints.findIndex((item, i) => i >= at && item === line);
            if (found < 0) { this.fail('Строки журнала в неверном порядке или их нет', `Не найдена строка «${line}» на своём месте.`, fix); break; }
            at = found + 1;
        }
        return this;
    }

    /** Изменения цвета светодиодов (только реальные смены цвета). */
    ledChanges(led?: number): LedChange[] {
        const current = new Map<number, LedColor>();
        const out: LedChange[] = [];
        for (const event of this.events) {
            if (event.kind !== 'led' || event.ledId === undefined || !event.color) continue;
            if (led !== undefined && event.ledId !== led) continue;
            const color = ledColorName(event.color);
            if ((current.get(event.ledId) ?? 'off') === color) continue;
            current.set(event.ledId, color);
            out.push({ time: event.time, led: event.ledId, color });
        }
        return out;
    }

    ledSequence(led = 0): LedColor[] {
        return this.ledChanges(led).map((change) => change.color);
    }

    velocities(): LearningEvent[] {
        return this.events.filter((event) => event.kind === 'velocity' && event.velocity);
    }

    cameraFrames(): LearningEvent[] {
        return this.events.filter((event) => event.kind === 'camera');
    }

    result(): GuideEvaluation {
        const solved = !this.diagnostics.some((item) => item.kind === 'error');
        const diagnostics: GuideDiagnostic[] = solved ? [{ kind: 'success', title: 'Миссия выполнена', reason: 'Полёт и журнал совпали с ожиданием.', fix: '' }] : this.diagnostics;
        return { solved, complete: true, diagnostics };
    }
}

export type Sdk2Check = (g: Sdk2Grader) => void;
