import type { DroneSample } from './trace.js';

export type TimelineSegment = { from: number; to: number; label: string; rgb?: string };
export type TimelinePoint = { at: number; label: string };
export type FlightTimeline = {
    durationMs: number;
    commands: TimelinePoint[];
    states: TimelineSegment[];
    light: TimelineSegment[];
    messages: TimelinePoint[];
    altitude: Array<{ at: number; z: number }>;
};

const STATE_LABELS: Record<string, string> = {
    IDLE: 'на земле', PREFLIGHT: 'подготовка', TAKEOFF_PROCESS: 'взлёт', FLYING_HOVER: 'зависание',
    FLYING_MOVING: 'полёт к точке', LANDING_PROCESS: 'посадка', MISSION: 'зависание'
};
const LIGHT_NAMES: Array<[RegExp, string]> = [[/^255,0,0$/, 'красный'], [/^0,255,0$/, 'зелёный'], [/^0,0,255$/, 'синий'], [/^255,255,255$/, 'белый']];

const COMMAND_NAMES: Record<string, string> = { '1': 'подготовка', '2': 'взлёт', '3': 'посадка', '4': 'запуск моторов', '5': 'остановка моторов' };

function commandLabel(api: string, args: string): string {
    const event = api === 'ap.push' ? /event=(\d+)/.exec(args)?.[1] : undefined;
    return event && COMMAND_NAMES[event] ? `${api} · ${COMMAND_NAMES[event]}` : `${api}(${args})`;
}

function ledOf(sample: DroneSample): { rgb: string; label: string } | null {
    const led = sample.snapshot.leds.find(item => item.r + item.g + item.b > 12);
    if (!led) return null;
    const key = [led.r, led.g, led.b].map(value => Math.round(value > 1.5 ? value : value * 255)).join(',');
    const name = LIGHT_NAMES.find(([pattern]) => pattern.test(key))?.[1] ?? 'другой цвет';
    return { rgb: `rgb(${key})`, label: name };
}

function segments(samples: DroneSample[], read: (sample: DroneSample) => { key: string; label: string; rgb?: string } | null, end: number): TimelineSegment[] {
    const out: TimelineSegment[] = [];
    let open: { key: string; segment: TimelineSegment } | null = null;
    for (const sample of samples) {
        const value = read(sample);
        if (open && value?.key === open.key) { open.segment.to = sample.elapsedMs; continue; }
        if (open) open.segment.to = sample.elapsedMs;
        open = null;
        if (value) {
            const segment: TimelineSegment = { from: sample.elapsedMs, to: sample.elapsedMs, label: value.label, rgb: value.rgb };
            out.push(segment);
            open = { key: value.key, segment };
        }
    }
    if (open) open.segment.to = end;
    return out.filter(segment => segment.to > segment.from || segment === out[out.length - 1]);
}

/** One honest picture of a run: only what the simulator actually reported, sampled while the check waited. */
export function buildFlightTimeline(samples: DroneSample[]): FlightTimeline | undefined {
    if (samples.length < 2) return undefined;
    const base = samples[0].elapsedMs;
    const rebased = samples.map(sample => ({ ...sample, elapsedMs: sample.elapsedMs - base }));
    const durationMs = rebased[rebased.length - 1].elapsedMs;
    const commands: TimelinePoint[] = [];
    const messages: TimelinePoint[] = [];
    let lastCall = '';
    let lastText = '';
    for (const sample of rebased) {
        const call = sample.snapshot.recentApiCalls[sample.snapshot.recentApiCalls.length - 1];
        const callKey = call ? `${sample.snapshot.recentApiCalls.length}:${call.api}:${call.argumentsText}` : '';
        if (call && callKey !== lastCall) { commands.push({ at: sample.elapsedMs, label: commandLabel(call.api, call.argumentsText) }); }
        lastCall = callKey || lastCall;
        const text = sample.snapshot.printText?.trim() || '';
        if (text && text !== lastText) messages.push({ at: sample.elapsedMs, label: text });
        lastText = text || lastText;
    }
    return {
        durationMs,
        commands,
        messages,
        states: segments(rebased, sample => ({ key: sample.snapshot.fsmState, label: STATE_LABELS[sample.snapshot.fsmState] || sample.snapshot.fsmState }), durationMs),
        light: segments(rebased, sample => { const led = ledOf(sample); return led ? { key: led.rgb, label: led.label, rgb: led.rgb } : null; }, durationMs),
        altitude: rebased.map(sample => ({ at: sample.elapsedMs, z: sample.snapshot.pos.z }))
    };
}
