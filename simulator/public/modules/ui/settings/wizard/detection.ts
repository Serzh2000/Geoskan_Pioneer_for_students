import { simSettings, type GamepadInputRef } from '../../../core/state.js';
import { normalizeCenteredAxis } from '../input/calibration.js';
import { axisRef, buttonRef, clampRc } from '../constants.js';
import { buildRangesFromPositions, getObservedPositions, pickRepresentativePositions } from '../input/observed.js';
import type { ChannelKey, ObservedInputStats } from '../types.js';
import type {
    AuxDetectionCandidate,
    AxisMotionStats,
    WizardAuxChannelKey,
    WizardStep
} from './types.js';

export function getUsedRefs(
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>,
    exceptChannel?: ChannelKey
): Set<GamepadInputRef> {
    const used = new Set<GamepadInputRef>();
    for (const [channel, ref] of Object.entries(detectedMapping) as Array<[ChannelKey, GamepadInputRef | undefined]>) {
        if (!ref || channel === exceptChannel) continue;
        used.add(ref);
    }
    return used;
}

export function detectPrimaryAxis(params: {
    gp: Gamepad;
    stepBaselineAxes: number[];
    stepLastAxes: number[];
    stepAxisStats: AxisMotionStats[];
    usedRefs: Set<GamepadInputRef>;
}): GamepadInputRef | null {
    const { gp, stepBaselineAxes, stepLastAxes, stepAxisStats, usedRefs } = params;
    let bestRef: GamepadInputRef | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestMaxDelta = 0;

    for (let index = 0; index < gp.axes.length; index += 1) {
        const value = gp.axes[index] ?? 0;
        const baseline = stepBaselineAxes[index] ?? 0;
        const last = stepLastAxes[index] ?? baseline;
        const stats = stepAxisStats[index];
        const deltaFromBaseline = Math.abs(value - baseline);
        const deltaFromLast = Math.abs(value - last);

        stats.maxDelta = Math.max(stats.maxDelta, deltaFromBaseline);
        stats.travel += deltaFromLast;
        if (deltaFromBaseline >= 0.12) {
            stats.activitySamples += 1;
        }
        stepLastAxes[index] = value;

        const ref = axisRef(index);
        if (usedRefs.has(ref)) continue;

        const score = stats.maxDelta * 4 + stats.travel + stats.activitySamples * 0.04;
        if (score > bestScore) {
            bestScore = score;
            bestRef = ref;
            bestMaxDelta = stats.maxDelta;
        }
    }

    if (!bestRef || (bestMaxDelta < 0.35 && bestScore < 1.1)) return null;
    return bestRef;
}

export function rememberSwitchTransition(
    stepLastSwitchValues: Map<GamepadInputRef, number>,
    stepSwitchTransitions: Map<GamepadInputRef, number>,
    ref: GamepadInputRef,
    rcValue: number
): void {
    const previousValue = stepLastSwitchValues.get(ref);
    if (previousValue === undefined) {
        stepLastSwitchValues.set(ref, rcValue);
        return;
    }

    if (Math.abs(previousValue - rcValue) >= 140) {
        stepSwitchTransitions.set(ref, (stepSwitchTransitions.get(ref) ?? 0) + 1);
        stepLastSwitchValues.set(ref, rcValue);
    }
}

export function getBestAuxCandidate(params: {
    gp: Gamepad | null;
    step: WizardStep;
    requireResolved: boolean;
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    stepObservedStats: Map<GamepadInputRef, ObservedInputStats>;
    stepSwitchTransitions: Map<GamepadInputRef, number>;
}): AuxDetectionCandidate | null {
    const { gp, step, requireResolved, detectedMapping, stepObservedStats, stepSwitchTransitions } = params;
    if (!gp) return null;

    const usedRefs = getUsedRefs(detectedMapping, step.channel);
    let bestCandidate: AuxDetectionCandidate | null = null;

    const refs: GamepadInputRef[] = [
        ...gp.axes.map((_, index) => axisRef(index)),
        ...gp.buttons.map((_, index) => buttonRef(index))
    ];

    for (const ref of refs) {
        if (usedRefs.has(ref)) continue;

        const candidate = getAuxCandidate({ step, ref, stepObservedStats, stepSwitchTransitions });
        if (!candidate) continue;
        if (requireResolved && (!candidate.hasEnoughPositions || !candidate.looksLikeSwitch || candidate.transitions < candidate.requiredTransitions)) {
            continue;
        }

        if (isBetterAuxCandidate(step, candidate, bestCandidate, requireResolved)) {
            bestCandidate = candidate;
        }
    }

    return bestCandidate;
}

export function getAuxStepRcValue(
    gp: Gamepad,
    ref: GamepadInputRef,
    channel: WizardAuxChannelKey,
    isInverted: boolean
): number {
    const index = Number(ref.slice(1));
    if (ref.startsWith('a')) {
        let normalized = normalizeCenteredAxis(simSettings.gamepadCalibration, gp.axes[index] ?? 0, index);
        if (isInverted) normalized = -normalized;
        return clampRc(1500 + normalized * 500);
    }

    const buttonValue = Math.max(0, Math.min(1, gp.buttons[index]?.value ?? 0));
    return clampRc(1000 + (isInverted ? 1 - buttonValue : buttonValue) * 1000);
}

function getAuxCandidate(params: {
    step: WizardStep;
    ref: GamepadInputRef;
    stepObservedStats: Map<GamepadInputRef, ObservedInputStats>;
    stepSwitchTransitions: Map<GamepadInputRef, number>;
}): AuxDetectionCandidate | null {
    const { step, ref, stepObservedStats, stepSwitchTransitions } = params;
    const positions = getObservedPositions(stepObservedStats, ref);
    const stablePositions = step.preferThreePositions && positions.length > 3
        ? pickRepresentativePositions(positions, 3)
        : positions;
    const ranges = buildRangesFromPositions(stablePositions);
    const stats = stepObservedStats.get(ref);
    if (!stats) return null;

    const minPositions = step.minPositions ?? 2;
    const span = stats.maxRc - stats.minRc;
    const transitions = stepSwitchTransitions.get(ref) ?? 0;
    const requiredTransitions = Math.max(1, minPositions - 1);
    const positionCount = stablePositions.length;
    const hasEnoughPositions = positionCount >= minPositions;
    const looksLikeSwitch = span >= 250 || ref.startsWith('b');
    const hasMiddlePosition = stablePositions.some((position) => Math.abs(position.centerRc - 1500) <= 150);
    const selectedRange = step.channel === 'mode'
        ? null
        : ranges[ranges.length - 1] ?? null;
    const score = transitions * 20000 + positionCount * 10000 + span * 10 + Math.min(stats.samples, 999);

    return {
        ref,
        positions: stablePositions,
        ranges,
        selectedRange,
        transitions,
        requiredTransitions,
        score,
        hasEnoughPositions,
        looksLikeSwitch,
        hasMiddlePosition
    };
}

function isBetterAuxCandidate(
    step: WizardStep,
    candidate: AuxDetectionCandidate,
    bestCandidate: AuxDetectionCandidate | null,
    requireResolved: boolean
): boolean {
    if (!bestCandidate) return true;

    if (!requireResolved) {
        if (candidate.hasEnoughPositions !== bestCandidate.hasEnoughPositions) {
            return candidate.hasEnoughPositions;
        }
        if (step.preferThreePositions && candidate.hasMiddlePosition !== bestCandidate.hasMiddlePosition) {
            return candidate.hasMiddlePosition;
        }
        if (candidate.positions.length !== bestCandidate.positions.length) {
            return candidate.positions.length > bestCandidate.positions.length;
        }
        if (step.preferThreePositions && candidate.ref.startsWith('a') !== bestCandidate.ref.startsWith('a')) {
            return candidate.ref.startsWith('a');
        }
        if (candidate.looksLikeSwitch !== bestCandidate.looksLikeSwitch) {
            return candidate.looksLikeSwitch;
        }
        if (candidate.transitions !== bestCandidate.transitions) {
            return candidate.transitions > bestCandidate.transitions;
        }
    }

    return candidate.score > bestCandidate.score;
}
