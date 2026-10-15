import { buildFlightTimeline } from '../public/modules/ui/mission-guide/evaluation/text/timeline.js';
import { renderFlightRecord } from '../public/modules/ui/mission-guide/render/results.js';
import type { DroneSample } from '../public/modules/ui/mission-guide/evaluation/text/trace.js';

const sample = (elapsedMs: number, over: Partial<DroneSample['snapshot']> = {}): DroneSample => ({
    elapsedMs: 1000 + elapsedMs,
    snapshot: { printText: '', status: '', leds: [{ r: 0, g: 0, b: 0, w: 0 }], pos: { x: 0, y: 0, z: 0 }, fsmState: 'IDLE', flightMode: '',
        pointReachedFlag: false, recentApiCalls: [], fsmTransitions: [], ...over }
});

describe('flight timeline', () => {
    test('needs at least two samples to say anything', () => {
        expect(buildFlightTimeline([sample(0)])).toBeUndefined();
    });

    test('records commands, state, light and messages in run time, not wall-clock time', () => {
        const timeline = buildFlightTimeline([
            sample(0),
            sample(500, { fsmState: 'PREFLIGHT', recentApiCalls: [{ api: 'ap.push', argumentsText: 'event=1', fsmState: 'IDLE' }] }),
            sample(1000, { fsmState: 'PREFLIGHT', leds: [{ r: 0, g: 255, b: 0, w: 0 }], printText: 'готово', recentApiCalls: [{ api: 'ap.push', argumentsText: 'event=1', fsmState: 'IDLE' }] })
        ])!;
        expect(timeline.durationMs).toBe(1000);
        expect(timeline.commands).toEqual([{ at: 500, label: 'ap.push · подготовка' }]);
        expect(timeline.states.map(item => item.label)).toEqual(['на земле', 'подготовка']);
        expect(timeline.light).toEqual([expect.objectContaining({ label: 'зелёный', from: 1000 })]);
        expect(timeline.messages).toEqual([{ at: 1000, label: 'готово' }]);
    });

    test('renders an accessible record with a text list of events', () => {
        const html = renderFlightRecord(buildFlightTimeline([sample(0), sample(1200, { fsmState: 'TAKEOFF_PROCESS', pos: { x: 0, y: 0, z: 1 } })])!);
        expect(html).toContain('aria-label="Запись полёта"');
        expect(html).toContain('автопилот: взлёт');
        expect(html).toContain('role="img"');
    });
});
