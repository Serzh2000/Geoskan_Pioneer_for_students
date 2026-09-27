import type { SimEvent } from './lua-sim-harness.js';

/**
 * Приводит трассы Lua-симулятора и Python-модели к одному словарю и
 * сравнивает то, что видно на коптере:
 * - полёт: взлёт/посадка, точки, курс, груз, ручная скорость — одной
 *   последовательностью;
 * - каждый из четырёх бортовых светодиодов — своей последовательностью
 *   цветов (порядок между разными светодиодами в одном тике не важен).
 */
const FSM_TO_COMMAND: Record<string, string> = {
    PREFLIGHT: 'arm',
    TAKEOFF_PROCESS: 'takeoff',
    LANDING_PROCESS: 'land'
};

export type Behaviour = {
    flight: SimEvent[];
    leds: SimEvent[][];
    failures: string[];
};

function collapse(events: SimEvent[]): SimEvent[] {
    return events.filter((event, i) => i === 0 || events[i - 1].what !== event.what);
}

// Цвет, продержавшийся меньше 0.3 с, — вспышка между двумя командами: в
// симуляторе смена цвета и следующая команда могут уложиться в один тик, а в
// модели дрона — в пару опросов. Такие вспышки в сравнение не идут (с обеих
// сторон одинаково).
const VISIBLE_SECONDS = 0.3;

function visible(events: SimEvent[]): SimEvent[] {
    return events.filter((event, i) => i === events.length - 1 || events[i + 1].t - event.t >= VISIBLE_SECONDS);
}

export function behaviour(events: SimEvent[]): Behaviour {
    const flight: SimEvent[] = [];
    const leds: SimEvent[][] = [[], [], [], []];
    const failures: string[] = [];
    for (const event of events) {
        const [kind, ...rest] = event.what.split(' ');
        if (kind === 'fsm') {
            const command = FSM_TO_COMMAND[rest[0]];
            if (command) flight.push({ t: event.t, what: command });
        } else if (kind === 'led') {
            leds[Number(rest[0])].push({ t: event.t, what: rest[1] });
        } else if (kind === 'stopped' || kind === 'error') {
            failures.push(event.what);
        } else {
            flight.push(event);
        }
    }
    return { flight: collapse(flight), leds: leds.map((sequence) => collapse(visible(collapse(sequence)))), failures };
}

const names = (events: SimEvent[]) => events.map((event) => event.what);

// Одинаковое поведение: те же события в том же порядке и, если задан
// допуск, примерно в то же время.
export function expectSameBehaviour(actual: SimEvent[], expected: SimEvent[], timeTolerance?: number): void {
    const a = behaviour(actual);
    const e = behaviour(expected);
    expect(a.failures).toEqual([]);
    expect(e.failures).toEqual([]);
    expect(names(a.flight)).toEqual(names(e.flight));
    a.leds.forEach((sequence, i) => {
        expect({ led: i, colours: names(sequence) }).toEqual({ led: i, colours: names(e.leds[i]) });
    });
    if (timeTolerance === undefined) return;
    const pairs: Array<[SimEvent, SimEvent]> = [
        ...a.flight.map((event, i): [SimEvent, SimEvent] => [event, e.flight[i]]),
        ...a.leds.flatMap((sequence, led) => sequence.map((event, i): [SimEvent, SimEvent] => [event, e.leds[led][i]]))
    ];
    const late = pairs
        .filter(([x, y]) => Math.abs(x.t - y.t) > timeTolerance)
        .map(([x, y]) => `${x.what}: ${x.t} с против ${y.t} с`);
    expect(late).toEqual([]);
}
