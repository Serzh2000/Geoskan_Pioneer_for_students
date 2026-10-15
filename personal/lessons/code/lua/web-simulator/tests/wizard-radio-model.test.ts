import { describe, expect, it } from '@jest/globals';
import {
    AUTO_ADVANCE_MS,
    LEVER_SWING,
    STICK_TRAVEL,
    advanceProgress,
    buildChannelRows,
    leverAngle,
    stickOffsets
} from '../public/modules/ui/settings/wizard/radio-model.js';

const slotOf = (channel: string) => (({ throttle: 'left-y', yaw: 'left-x', pitch: 'right-y', roll: 'right-x' }) as const)[channel as 'throttle'];

describe('wizard radio model', () => {
    it('rests the throttle at the bottom of its stick and moves the others from the centre', () => {
        const rest = stickOffsets({ throttle: 0, yaw: 0, pitch: 0, roll: 0 }, slotOf);
        expect(rest).toEqual({ leftX: 0, leftY: STICK_TRAVEL, rightX: 0, rightY: 0 });
        const full = stickOffsets({ throttle: 1, yaw: 1, pitch: -1, roll: 0.5 }, slotOf);
        expect(full.leftY).toBe(-STICK_TRAVEL);
        expect(full.leftX).toBe(STICK_TRAVEL);
        expect(full.rightY).toBe(-STICK_TRAVEL);
        expect(full.rightX).toBe(STICK_TRAVEL / 2);
    });

    it('swings a lever with its RC value and keeps an unheard switch in the middle', () => {
        expect(leverAngle(null)).toBe(0);
        expect(leverAngle(1500)).toBe(0);
        expect(leverAngle(2000)).toBe(LEVER_SWING);
        expect(leverAngle(1000)).toBe(-LEVER_SWING);
        expect(leverAngle(9000)).toBe(LEVER_SWING);
    });

    it('runs the pause after a found channel from 0 to 1', () => {
        expect(advanceProgress(null, 500)).toBe(0);
        expect(advanceProgress(0, AUTO_ADVANCE_MS / 2)).toBeCloseTo(0.5);
        expect(advanceProgress(0, AUTO_ADVANCE_MS * 3)).toBe(1);
    });

    it('marks channels as done, current, skipped or pending', () => {
        const labels = { throttle: 'Газ', yaw: 'Рыскание', pitch: 'Тангаж', roll: 'Крен', mode: 'Режим', arm: 'Взвод', magnet: 'Магнит' };
        const rows = buildChannelRows({
            current: 'yaw',
            detected: { throttle: { type: 'axis', index: 1 } as never },
            skipped: new Set(['mode'] as never),
            values: { throttle: 2, yaw: 0.4 },
            labels: labels as never,
            formatRef: () => 'Ось 1'
        });
        const state = (channel: string) => rows.find((row) => row.channel === channel);
        expect(state('throttle')).toMatchObject({ state: 'done', value: 1, source: 'Ось 1' });
        expect(state('yaw')).toMatchObject({ state: 'current', value: 0.4 });
        expect(state('mode')?.state).toBe('skipped');
        expect(state('roll')?.state).toBe('pending');
    });
});
