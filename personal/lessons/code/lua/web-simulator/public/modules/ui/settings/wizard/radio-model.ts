import type { GamepadInputRef } from '../../../core/state.js';
import type { PrimaryStickSlot } from '../input/values.js';
import type { ChannelKey, PrimaryChannelKey } from '../types.js';
import type { WizardStep } from './types.js';

/*
 * What the setup wizard's drawn transmitter shows, as plain numbers: where each stick stands, which control the
 * current step is about, how far a switch lever has swung and what every channel row says. The drawing itself
 * (radio-view.ts) only turns these into SVG, so the rules here can be tested without a browser.
 */

/** How far a stick knob travels from the centre of its gimbal, in the drawing's units. */
export const STICK_TRAVEL = 35;
/** The swing of a switch lever to either side, in degrees. */
export const LEVER_SWING = 32;
/** After a channel is found the wizard waits this long, showing it, then moves on by itself. */
export const AUTO_ADVANCE_MS = 1400;

export const PRIMARY_ORDER: PrimaryChannelKey[] = ['throttle', 'yaw', 'pitch', 'roll'];
export const CHANNEL_ORDER: ChannelKey[] = ['throttle', 'yaw', 'pitch', 'roll', 'mode', 'arm', 'magnet'];

/** The switches drawn on the transmitter and what each is used for here; the drawing is a guide, any switch may be flipped. */
export const AUX_SWITCHES = {
    mode: { id: 'SA', positions: 3 },
    arm: { id: 'SB', positions: 2 },
    magnet: { id: 'SD', positions: 2 }
} as const;

export type SwitchId = 'SA' | 'SB' | 'SC' | 'SD';

export interface StickOffsets {
    leftX: number;
    leftY: number;
    rightX: number;
    rightY: number;
}

/**
 * Knob offsets for the channel values: roll, pitch and yaw are centred (-1..1), the throttle runs 0..1 and rests at the
 * bottom of its stick. Which stick and axis a channel uses follows the chosen stick mode.
 */
export function stickOffsets(values: Record<PrimaryChannelKey, number>, slotOf: (channel: PrimaryChannelKey) => PrimaryStickSlot): StickOffsets {
    const offsets: StickOffsets = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    for (const channel of PRIMARY_ORDER) {
        const slot = slotOf(channel);
        const value = values[channel] ?? 0;
        // Throttle: 0 is the bottom (positive y in the drawing), 1 the top.
        const offset = channel === 'throttle' ? (0.5 - value) * 2 * STICK_TRAVEL * (slot.endsWith('-y') ? 1 : -1) : value * STICK_TRAVEL;
        if (slot === 'left-x') offsets.leftX = offset;
        else if (slot === 'left-y') offsets.leftY = offset;
        else if (slot === 'right-x') offsets.rightX = offset;
        else offsets.rightY = offset;
    }
    return offsets;
}

export type StepTarget =
    | { kind: 'stick'; side: 'left' | 'right'; axis: 'x' | 'y' }
    | { kind: 'switch'; switchId: SwitchId; positions: 2 | 3 };

/** The control the current step is about: a gimbal axis for the four flight channels, a switch for the others. */
export function describeTarget(step: WizardStep, slotOf: (channel: PrimaryChannelKey) => PrimaryStickSlot): StepTarget {
    if (step.type === 'primary') {
        const slot = slotOf(step.channel as PrimaryChannelKey);
        return { kind: 'stick', side: slot.startsWith('left') ? 'left' : 'right', axis: slot.endsWith('-x') ? 'x' : 'y' };
    }
    const aux = AUX_SWITCHES[step.channel as keyof typeof AUX_SWITCHES];
    return { kind: 'switch', switchId: aux.id, positions: aux.positions };
}

/** Angle of a switch lever for an RC value (1000-2000); a switch that is not heard yet rests in the middle. */
export function leverAngle(rcValue: number | null): number {
    if (rcValue === null || !Number.isFinite(rcValue)) return 0;
    const centered = Math.max(-1, Math.min(1, (rcValue - 1500) / 500));
    return centered * LEVER_SWING;
}

export type ChannelRowState = 'pending' | 'current' | 'done' | 'skipped';

export interface ChannelRow {
    channel: ChannelKey;
    label: string;
    state: ChannelRowState;
    /** -1..1 for the fill of the bar (a flight channel's live value, an aux channel's position). */
    value: number;
    /** Where the channel was heard from ("Ось 2 / CH3"), once it is found. */
    source: string | null;
}

/** One row per channel: waiting, being asked now, found (with its live value and source) or skipped. */
export function buildChannelRows(params: {
    current: ChannelKey | null;
    detected: Partial<Record<ChannelKey, GamepadInputRef>>;
    skipped: ReadonlySet<ChannelKey>;
    values: Partial<Record<ChannelKey, number>>;
    labels: Record<ChannelKey, string>;
    formatRef: (ref: GamepadInputRef) => string;
}): ChannelRow[] {
    return CHANNEL_ORDER.map((channel) => {
        const ref = params.detected[channel];
        const state: ChannelRowState = ref ? 'done' : params.skipped.has(channel) ? 'skipped' : channel === params.current ? 'current' : 'pending';
        const value = state === 'done' || state === 'current' ? Math.max(-1, Math.min(1, params.values[channel] ?? 0)) : 0;
        return { channel, label: params.labels[channel], state, value, source: ref ? params.formatRef(ref) : null };
    });
}

/** 0..1: how far the pause after a found channel has run. */
export function advanceProgress(resolvedAt: number | null, now: number): number {
    if (resolvedAt === null) return 0;
    return Math.max(0, Math.min(1, (now - resolvedAt) / AUTO_ADVANCE_MS));
}
