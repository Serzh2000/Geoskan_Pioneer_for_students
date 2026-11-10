import { describe, expect, it } from '@jest/globals';
import {
    STICK_TRAVEL,
    buildChannelRows,
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
