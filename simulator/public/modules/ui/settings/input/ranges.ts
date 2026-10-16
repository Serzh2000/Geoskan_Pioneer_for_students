import { simSettings, type AuxChannelRange, type GamepadInputRef } from '../../../core/state.js';
import { buildRangesFromPositions, getObservedPositions, pickRepresentativePositions } from './observed.js';
import { clamp } from '../constants.js';
import type { ActionAuxChannelKey, ObservedInputPosition, ObservedInputStats } from '../types.js';

export function getAuxRange(key: ActionAuxChannelKey): AuxChannelRange {
    return simSettings.gamepadAuxRanges[key];
}

export function setAuxRange(key: ActionAuxChannelKey, range: AuxChannelRange): void {
    simSettings.gamepadAuxRanges[key] = range;
}

export function setModeRange(key: 'loiter' | 'althold' | 'stabilize', range: AuxChannelRange): void {
    simSettings.gamepadModeRanges[key] = range;
}

export function getObservedStats(
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>,
    ref: GamepadInputRef
): ObservedInputStats | null {
    return observedInputStats.get(ref) ?? null;
}

export function getModeObservedPositions(
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>,
    modeRef: GamepadInputRef
): ObservedInputPosition[] {
    const positions = getObservedPositions(observedInputStats, modeRef);
    if (positions.length <= 3) return positions;
    return pickRepresentativePositions(positions, 3);
}

export function applyModeRangesFromObserved(
    observedInputStats: Map<GamepadInputRef, ObservedInputStats>,
    modeRef: GamepadInputRef
): void {
    const positions = getModeObservedPositions(observedInputStats, modeRef);
    const ranges = buildRangesFromPositions(positions);
    if (ranges.length < 2) return;

    setModeRange('loiter', ranges[0]);
    if (ranges.length >= 3) {
        setModeRange('althold', ranges[1]);
        setModeRange('stabilize', ranges[2]);
        return;
    }

    const midpoint = Math.round((ranges[0].max + ranges[1].min) / 2);
    setModeRange('althold', {
        min: clamp(midpoint - 25, 1000, 2000),
        max: clamp(midpoint + 25, 1000, 2000),
        center: midpoint
    });
    setModeRange('stabilize', ranges[1]);
}
