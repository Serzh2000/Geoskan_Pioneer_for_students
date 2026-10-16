import type { GamepadInputRef } from '../../../core/state.js';
import { getUsedRefs } from './detection.js';
import type { AxisMotionStats, WizardStep } from './types.js';
import type { ChannelKey } from '../types.js';

export function computePreviewRef(params: {
    channel: ChannelKey;
    step: WizardStep;
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    stepAxisStats: AxisMotionStats[];
}): GamepadInputRef | null {
    const { channel, step, detectedMapping, stepAxisStats } = params;
    if (step.type !== 'primary' || step.channel !== channel) {
        return null;
    }

    const usedRefs = getUsedRefs(detectedMapping, channel);
    let bestRef: GamepadInputRef | null = null;
    let bestScore = 0;

    for (let index = 0; index < stepAxisStats.length; index += 1) {
        const ref = `a${index}` as GamepadInputRef;
        if (usedRefs.has(ref)) continue;

        const stats = stepAxisStats[index];
        if (!stats) continue;

        const score = stats.maxDelta * 4 + stats.travel + stats.activitySamples * 0.04;
        if (score > bestScore) {
            bestScore = score;
            bestRef = ref;
        }
    }

    return bestScore > 0.08 ? bestRef : null;
}
