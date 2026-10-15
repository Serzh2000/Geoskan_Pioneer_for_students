import { gradeWalkthroughTrace, type DroneSample } from '../public/modules/ui/mission-guide/evaluation/text/trace.js';

function sample(elapsedMs: number, name: string, printText = '', index = 0): DroneSample {
    const rgb = name === 'red' ? [255, 0, 0] : name === 'green' ? [0, 255, 0] : name === 'blue' ? [0, 0, 255] : [0, 0, 0];
    const leds = [{ r: 0, g: 0, b: 0, w: 0 }, { r: 0, g: 0, b: 0, w: 0 }];
    leds[index] = { r: rgb[0], g: rgb[1], b: rgb[2], w: 0 };
    return { elapsedMs, snapshot: { leds, printText, pos: { x: 0, y: 0, z: 0 }, fsmState: 'IDLE', flightMode: '', pointReachedFlag: false, recentApiCalls: [], fsmTransitions: [] } };
}
const errors = (topic: string, samples: DroneSample[], language: 'lua' | 'python' = 'python') => gradeWalkthroughTrace(topic, samples, language).filter(item => item.kind === 'error');

describe('Checks use observed execution, not just a final snapshot', () => {
    test('a single red command does not pass the three-colour lesson', () => {
        expect(errors('led-sequence', [sample(0, 'red'), sample(4200, 'red')]).length).toBeGreaterThan(0);
        expect(errors('led-sequence', [sample(0, 'blue'), sample(500, 'green'), sample(1000, 'red')])).toEqual([]);
        expect(errors('led-sequence', [sample(0, 'blue'), sample(100, 'green'), sample(200, 'red')]).length).toBeGreaterThan(0);
    });
    test('a delayed signal must actually be delayed and accompanied by a message', () => {
        expect(errors('led-delayed', [sample(0, 'blue', 'done')]).length).toBeGreaterThan(0);
        expect(errors('led-delayed', [sample(0, 'off'), sample(1000, 'blue', 'done')])).toEqual([]);
        expect(errors('led-delayed', [sample(0, 'off', 'done'), sample(1000, 'blue', 'done')]).length).toBeGreaterThan(0);
        expect(errors('led-delayed', [sample(0, 'off'), sample(1000, 'blue')]).length).toBeGreaterThan(0);
    });
    test('the Lua delayed exercise uses the second LED', () => {
        expect(errors('led-delayed', [sample(0, 'off'), sample(1000, 'blue', 'done', 1)], 'lua')).toEqual([]);
        expect(errors('led-delayed', [sample(0, 'off'), sample(1000, 'blue', 'done', 0)], 'lua').length).toBeGreaterThan(0);
    });
    test('a green LED without print does not pass the confirmation lesson', () => {
        expect(errors('led-confirm', [sample(0, 'green')]).length).toBeGreaterThan(0);
        expect(errors('led-confirm', [sample(0, 'green', 'Signal ready')])).toEqual([]);
    });
    test('remaining on the ground is not a landing; full ordered flight is required', () => {
        const final = sample(9000, 'off');
        expect(errors('landing', [final]).length).toBeGreaterThan(0);
        final.snapshot.fsmTransitions = [
            { from: 'IDLE', to: 'TAKEOFF_PROCESS', reason: '' },
            { from: 'FLYING_MOVING', to: 'FLYING_HOVER', reason: '' },
            { from: 'FLYING_HOVER', to: 'LANDING_PROCESS', reason: '' },
            { from: 'LANDING_PROCESS', to: 'IDLE', reason: '' }
        ];
        expect(errors('landing', [final])).toEqual([]);
        expect(errors('mission', [final])).toEqual([]);
        final.snapshot.fsmTransitions.reverse();
        expect(errors('mission', [final]).length).toBeGreaterThan(0);
    });
});
