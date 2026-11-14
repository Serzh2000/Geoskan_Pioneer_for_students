/**
 * Замечания уроков говорят, что ученик получил на самом деле: цвет светодиода, число запросов подготовки, напечатанные строки.
 * Раньше «Нужен чистый зелёный или синий» и «Повторная команда пока не исследована» просто сообщали «не так» (миссии 12 и 4 были самыми
 * частыми затруднениями в журнале), и ребёнок не знал, что менять.
 */
import { gradeDroneAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/drone.js';
import { gradeSignalsCode } from '../public/modules/ui/mission-guide/academy/evaluation/signals-code.js';
import type { LearningEvent } from '../public/modules/core/learning-journal.js';
import type { DroneSnapshot } from '../public/modules/ui/mission-guide/evaluation/text/snapshot.js';

const idle: DroneSnapshot = { pos: { x: 0, y: 0, z: 0 }, leds: [], fsmState: 'IDLE', flightMode: 'AUTO', pointReachedFlag: false, recentApiCalls: [], fsmTransitions: [], status: 'РАБОТАЕТ' };
const withLed = (r: number, g: number, b: number, state = 'IDLE') => [{ elapsedMs: 0, snapshot: { ...idle, fsmState: state, leds: [{ r, g, b }] as unknown as DroneSnapshot['leds'] } }];
const arm = (accepted: boolean, state: string): LearningEvent => ({ kind: 'arm', accepted, state, time: 0 });
const led = (r: number, g: number, b: number): LearningEvent => ({ kind: 'led', ledId: 0, color: { r, g, b }, time: 0 } as unknown as LearningEvent);
const text = (evaluation: { diagnostics: Array<{ reason: string; fix: string }> }) => evaluation.diagnostics.map((item) => `${item.reason} ${item.fix}`).join(' | ');

describe('замечания показывают, что получилось', () => {
    test('миссия 12: цвет, который получился, и шкала языка (Python с числом 1 вместо 255 даёт почти чёрный)', () => {
        const evaluation = gradeSignalsCode(12, withLed(0, 1, 0), [led(0, 1, 0)], { code: 'pioneer.led_control(0, 0, 1, 0)' });
        expect(evaluation.solved).toBe(false);
        const message = text(evaluation);
        expect(message).toContain('LED 0 сейчас: R 0, G 1, B 0');
        expect(message).toContain('G 255');
        expect(message).toContain('В Lua канал задают числом от 0 до 1, в Python от 0 до 255');
    });

    test('миссия 13: при неравных каналах показан фактический цвет и оба верных варианта', () => {
        const message = text(gradeSignalsCode(13, withLed(255, 0, 0), [led(255, 0, 0)], { code: '' }));
        expect(message).toContain('R 255, G 0, B 0');
        expect(message).toMatch(/255, 255, 255.*128, 128, 128/);
    });

    test('миссия 10: неверный индекс или цвет - видно, что горит сейчас и что нужно', () => {
        const message = text(gradeSignalsCode(10, withLed(0, 255, 0), [led(0, 255, 0)], { code: '' }));
        expect(message).toContain('LED 0 сейчас: R 0, G 255, B 0');
        expect(message).toContain('Нужно: R 255, G 0, B 0');
        expect(message).toContain('считается с нуля');
    });

    test('миссия 4: два принятых запроса - объяснено, что второй ушёл слишком рано; один запрос - нужен второй', () => {
        const both = gradeDroneAcademy(4, [{ elapsedMs: 0, snapshot: { ...idle, fsmState: 'PREFLIGHT' } }], [arm(true, 'IDLE'), arm(true, 'IDLE')], { code: '' });
        const bothText = text(both);
        expect(both.solved).toBe(false);
        expect(bothText).toContain('запросов подготовки: 2, принято: 2, отклонено в PREFLIGHT: 0');
        expect(bothText).toContain('слишком рано');
        expect(bothText).toContain('ENGINES_STARTED');
        const single = text(gradeDroneAcademy(4, [{ elapsedMs: 0, snapshot: { ...idle, fsmState: 'PREFLIGHT' } }], [arm(true, 'IDLE')], { code: '' }));
        expect(single).toContain('запросов подготовки: 1, принято: 1');
        expect(single).toContain('Нужен второй запрос');
        const none = text(gradeDroneAcademy(4, [{ elapsedMs: 0, snapshot: idle }], [], { code: '' }));
        expect(none).toContain('запросов подготовки: 0');
    });

    test('миссия 4 с верным опытом по-прежнему засчитывается', () => {
        const ok = gradeDroneAcademy(4, [{ elapsedMs: 0, snapshot: { ...idle, fsmState: 'PREFLIGHT' } }], [arm(true, 'IDLE'), arm(false, 'PREFLIGHT')], { code: '' });
        expect(ok.solved).toBe(true);
    });
});
