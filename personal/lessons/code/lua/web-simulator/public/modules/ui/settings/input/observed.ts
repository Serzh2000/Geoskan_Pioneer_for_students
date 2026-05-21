import type { GamepadInputRef } from '../../../core/state.js';
import { MAX_PRESET_POSITIONS, MIN_POSITION_SAMPLES, POSITION_CLUSTER_THRESHOLD, clamp } from '../constants.js';
import type { ObservedInputPosition, ObservedInputStats } from '../types.js';

export function resetObservedInputStats() {
    return new Map<GamepadInputRef, ObservedInputStats>();
}

export function rememberObservedInputValue(
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>,
    ref: GamepadInputRef,
    rcValue: number
): void {
    const current = observedInputStats.get(ref);
    if (!current) {
        observedInputStats.set(ref, {
            minRc: rcValue,
            maxRc: rcValue,
            lastRc: rcValue,
            samples: 1,
            positions: [{
                centerRc: rcValue,
                minRc: rcValue,
                maxRc: rcValue,
                samples: 1
            }]
        });
        return;
    }

    current.minRc = Math.min(current.minRc, rcValue);
    current.maxRc = Math.max(current.maxRc, rcValue);
    current.lastRc = rcValue;
    current.samples += 1;

    let bestMatch: ObservedInputPosition | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const position of current.positions) {
        const distance = Math.abs(position.centerRc - rcValue);
        if (distance <= POSITION_CLUSTER_THRESHOLD && distance < bestDistance) {
            bestMatch = position;
            bestDistance = distance;
        }
    }

    if (!bestMatch) {
        current.positions.push({
            centerRc: rcValue,
            minRc: rcValue,
            maxRc: rcValue,
            samples: 1
        });
        return;
    }

    bestMatch.centerRc = Math.round((bestMatch.centerRc * bestMatch.samples + rcValue) / (bestMatch.samples + 1));
    bestMatch.minRc = Math.min(bestMatch.minRc, rcValue);
    bestMatch.maxRc = Math.max(bestMatch.maxRc, rcValue);
    bestMatch.samples += 1;
}

export function getObservedPositions(
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>,
    ref: GamepadInputRef
): ObservedInputPosition[] {
    const stats = observedInputStats.get(ref) ?? null;
    if (!stats) return [];

    const stable = stats.positions.filter((position) => position.samples >= MIN_POSITION_SAMPLES);
    const semiStable = stats.positions.filter((position) => position.samples >= Math.max(2, Math.floor(MIN_POSITION_SAMPLES / 2)));
    const source = stable.length >= 2
        ? stable
        : semiStable.length >= 2
            ? semiStable
            : stats.positions;

    const merged = mergeObservedPositions(source);

    return [...merged]
        .sort((a, b) => b.samples - a.samples)
        .slice(0, MAX_PRESET_POSITIONS)
        .sort((a, b) => a.centerRc - b.centerRc);
}

export function pickRepresentativePositions(
    positions: ObservedInputPosition[],
    maxPositions: number
): ObservedInputPosition[] {
    if (positions.length <= maxPositions) return [...positions];
    if (maxPositions <= 1) return [positions[0]];

    const sorted = [...positions].sort((a, b) => a.centerRc - b.centerRc);
    const selected = new Map<number, ObservedInputPosition>();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    selected.set(first.centerRc, first);
    selected.set(last.centerRc, last);

    const span = Math.max(1, last.centerRc - first.centerRc);
    for (let step = 1; step < maxPositions - 1; step += 1) {
        const target = first.centerRc + (span * step) / (maxPositions - 1);
        let best: ObservedInputPosition | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const position of sorted) {
            if (selected.has(position.centerRc)) continue;
            const distance = Math.abs(position.centerRc - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = position;
            }
        }
        if (best) {
            selected.set(best.centerRc, best);
        }
    }

    return [...selected.values()].sort((a, b) => a.centerRc - b.centerRc);
}

export function buildRangesFromPositions(positions: ObservedInputPosition[]) {
    if (positions.length === 0) return [];
    return positions.map((position, index) => {
        const prev = positions[index - 1];
        const next = positions[index + 1];
        const min = prev
            ? Math.round((prev.centerRc + position.centerRc) / 2)
            : Math.max(1000, position.minRc - Math.max(20, Math.round((position.maxRc - position.minRc) / 2)));
        const max = next
            ? Math.round((position.centerRc + next.centerRc) / 2)
            : Math.min(2000, position.maxRc + Math.max(20, Math.round((position.maxRc - position.minRc) / 2)));
        return {
            min: clamp(min, 1000, 2000),
            max: clamp(max, 1000, 2000),
            center: position.centerRc
        };
    });
}

export function findClosestRangeByCenter(
    ranges: Array<{ min: number; max: number; center?: number }>,
    center?: number
) {
    if (!ranges.length || center === undefined) return null;
    let best: { min: number; max: number; center?: number } | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const range of ranges) {
        const target = range.center ?? Math.round((range.min + range.max) / 2);
        const distance = Math.abs(target - center);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = range;
        }
    }
    return best;
}

function mergeObservedPositions(positions: ObservedInputPosition[]): ObservedInputPosition[] {
    if (positions.length <= 1) return [...positions];

    const sorted = [...positions].sort((a, b) => a.centerRc - b.centerRc);
    const merged: ObservedInputPosition[] = [];

    for (const position of sorted) {
        const previous = merged[merged.length - 1];
        if (!previous || Math.abs(previous.centerRc - position.centerRc) > POSITION_CLUSTER_THRESHOLD) {
            merged.push({ ...position });
            continue;
        }

        const totalSamples = previous.samples + position.samples;
        previous.centerRc = Math.round((previous.centerRc * previous.samples + position.centerRc * position.samples) / totalSamples);
        previous.minRc = Math.min(previous.minRc, position.minRc);
        previous.maxRc = Math.max(previous.maxRc, position.maxRc);
        previous.samples = totalSamples;
    }

    return merged;
}
