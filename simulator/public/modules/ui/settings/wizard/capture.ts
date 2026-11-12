import type { GamepadInputRef } from '../../../core/state.js';
import { getChannelInversionIndex } from '../constants.js';
import type { ChannelKey } from '../types.js';
import type { AuxDetectionResult, AxisMotionStats, WizardAuxChannelKey } from './types.js';

/*
 * Who owns an input while the wizard runs, as plain rules (wizard.ts only feeds them what the pad reports):
 * a stick that is already another channel's can be taken over by a clear, strong push; a light touch only earns a
 * warning; and a stick that is just coming back to rest after its own step must not count as either.
 */

export const FLIGHT_CHANNELS: readonly ChannelKey[] = ['throttle', 'yaw', 'pitch', 'roll'];
export const SWITCH_CHANNELS: readonly ChannelKey[] = ['mode', 'arm', 'magnet'];

/** How much one axis has moved during the step: far, long and often all count. */
export const axisScore = (stats: AxisMotionStats | undefined): number =>
    (stats ? stats.maxDelta * 4 + stats.travel + stats.activitySamples * 0.04 : 0);

/** The flight channel (other than `channel`) that listens to this input, if any. */
export function findOwner(
    mapping: Partial<Record<ChannelKey, GamepadInputRef>>,
    ref: GamepadInputRef,
    channel: ChannelKey,
    among: readonly ChannelKey[] = FLIGHT_CHANNELS
): ChannelKey | undefined {
    return (Object.keys(mapping) as ChannelKey[]).find((key) => key !== channel && mapping[key] === ref && among.includes(key));
}

export interface Takeover {
    ref: GamepadInputRef;
    owner: ChannelKey;
    score: number;
}

/**
 * The axis of another flight channel that is pushed clearly and harder than the best free axis: the student means it.
 * `minDelta` is how far it must have travelled from where the step began.
 */
export function pickAxisTakeover(params: {
    channel: ChannelKey;
    mapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    stats: Array<AxisMotionStats | undefined>;
    freeBest: GamepadInputRef | null;
}): Takeover | null {
    const { channel, mapping, stats, freeBest } = params;
    const freeScore = freeBest?.startsWith('a') ? axisScore(stats[Number(freeBest.slice(1))]) : 0;
    let pick: Takeover | null = null;
    for (let index = 0; index < stats.length; index += 1) {
        const item = stats[index];
        if (!item || item.maxDelta < 0.6) continue;
        const ref = `a${index}` as GamepadInputRef;
        const owner = findOwner(mapping, ref, channel);
        if (!owner) continue;
        const score = axisScore(item);
        if (score > freeScore + 0.5 && (!pick || score > pick.score)) pick = { ref, owner, score };
    }
    return pick;
}

/** An occupied axis that was moved noticeably but not enough to take it over: only worth a hint. */
export function pickOccupiedTouch(params: {
    channel: ChannelKey;
    mapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    stats: Array<AxisMotionStats | undefined>;
}): { ref: GamepadInputRef; owner: ChannelKey } | null {
    const { channel, mapping, stats } = params;
    let pick: { ref: GamepadInputRef; owner: ChannelKey; score: number } | null = null;
    for (let index = 0; index < stats.length; index += 1) {
        const item = stats[index];
        if (!item || item.maxDelta < 0.25) continue;
        const ref = `a${index}` as GamepadInputRef;
        const owner = findOwner(mapping, ref, channel);
        if (!owner) continue;
        const score = axisScore(item);
        if (!pick || score > pick.score) pick = { ref, owner, score };
    }
    return pick ? { ref: pick.ref, owner: pick.owner } : null;
}

export type AxisSpan = { min: number; max: number; center: number };

const spanOf = (seen: AxisSpan) => Math.max(1, seen.max - seen.min);

/** The axes whose stick did not rest at the start of the step: it is still coming back from the previous one. */
export function findDisplacedAxes(baseline: number[], draft: ReadonlyMap<number, AxisSpan>): Set<number> {
    const displaced = new Set<number>();
    for (const [index, seen] of draft) {
        if (Math.abs((baseline[index] ?? 0) - seen.center) > 0.3 * spanOf(seen)) displaced.add(index);
    }
    return displaced;
}

/**
 * Axes that are still coming back to rest count as standing still: what they move before they get there is the end of
 * the previous step, not a new answer. Once at rest they start fresh.
 */
export function settleReturningAxes(params: {
    axes: ArrayLike<number>;
    baseline: number[];
    last: number[];
    stats: AxisMotionStats[];
    returning: Set<number>;
    draft: ReadonlyMap<number, AxisSpan>;
}): void {
    const { axes, baseline, last, stats, returning, draft } = params;
    for (const index of [...returning]) {
        const seen = draft.get(index);
        const value = axes[index] ?? 0;
        if (!seen || !stats[index]) {
            returning.delete(index);
            continue;
        }
        baseline[index] = value;
        last[index] = value;
        stats[index].maxDelta = 0;
        stats[index].travel = 0;
        stats[index].activitySamples = 0;
        stats[index].firstDirection = 0;
        if (Math.abs(value - seen.center) <= 0.1 * spanOf(seen)) returning.delete(index);
    }
}

/** Forgets what a channel found: its input, its direction and what its axis showed. */
export function resetChannelResult(params: {
    channel: ChannelKey;
    mapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    skipped: Set<ChannelKey>;
    draft: Map<number, AxisSpan>;
    inversion: boolean[];
    savedInversion: boolean[];
}): void {
    const { channel, mapping, auxResults, skipped, draft, inversion, savedInversion } = params;
    const ref = mapping[channel];
    delete mapping[channel];
    delete auxResults[channel as WizardAuxChannelKey];
    skipped.delete(channel);
    if (ref?.startsWith('a')) draft.delete(Number(ref.slice(1)));
    const index = getChannelInversionIndex(channel);
    if (index >= 0) inversion[index] = !!savedInversion[index];
}

/** The first channel, in the wizard's order, that has neither an input nor been skipped. */
export function firstChannelWithoutInput(
    order: readonly ChannelKey[],
    mapping: Partial<Record<ChannelKey, GamepadInputRef>>,
    skipped: ReadonlySet<ChannelKey>
): number {
    return order.findIndex((channel) => !mapping[channel] && !skipped.has(channel));
}

/**
 * What one axis showed during its step, as its calibration. A centred stick that was only pushed one way has seen just
 * half of its travel: the other half is taken as the full -1..1 instead of squeezing the rest point into the middle.
 * Null when the axis hardly moved (nothing to calibrate).
 */
export function calibrationFromDraft(seen: AxisSpan, isThrottle: boolean): AxisSpan | null {
    if (seen.max - seen.min < 0.5) return null;
    let min = Math.max(-1, seen.min);
    let max = Math.min(1, seen.max);
    const center = Math.min(max, Math.max(min, seen.center));
    if (!isThrottle) {
        if (center - min < 0.2) min = -1;
        if (max - center < 0.2) max = 1;
    }
    return { min, max, center: Math.min(max, Math.max(min, center)) };
}
