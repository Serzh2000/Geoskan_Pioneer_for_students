import type { GamepadInputRef } from '../../core/state.js';
import { getChannelInversionIndex } from './constants.js';
import {
    rememberObservedInputValue,
    resetObservedInputStats
} from './input/observed.js';
import { getPrimaryChannelStickSlot, readRefNormalizedValue, readRefRcValue } from './input/values.js';
import type { ChannelKey, PrimaryChannelKey } from './types.js';
import { CHANNEL_LABELS, STEPS } from './wizard/config.js';
import {
    detectPrimaryAxis,
    getAuxStepRcValue,
    getBestAuxCandidate,
    getUsedRefs,
    rememberSwitchTransition
} from './wizard/detection.js';
import { createWizardDraftInversion } from './wizard/persistence.js';
import { AUTO_ADVANCE_MS, AUX_SWITCHES, describeTarget, stickOffsets } from './wizard/radio-model.js';
import { createRadioView, type RadioView } from './wizard/radio-view.js';
import { computePreviewRef } from './wizard/preview-ref.js';
import { renderWizardState as renderWizardUi } from './wizard/ui.js';
import {
    finishWizardSession,
    getFirstConnectedGamepad
} from './wizard/lifecycle.js';
import type {
    AuxDetectionResult,
    AxisMotionStats,
    WizardAuxChannelKey,
    WizardChannelState,
    WizardStep
} from './wizard/types.js';

const WIZARD_UI_RENDER_INTERVAL_MS = 120;
const WIZARD_LOOP_INTERVAL_MS = 50;

let currentStepIdx = 0;
let isWizardActive = false;
let showingSummary = false;
let stepBaselineAxes: number[] = [];
let stepLastAxes: number[] = [];
let stepAxisStats: AxisMotionStats[] = [];
let stepObservedStats = resetObservedInputStats();
let stepLastSwitchValues = new Map<GamepadInputRef, number>();
let stepSwitchTransitions = new Map<GamepadInputRef, number>();
let detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>> = {};
let auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>> = {};
let wizardDraftInversion = createWizardDraftInversion();
let lastWizardUiRenderAt = 0;
let lastWizardLoopAt = 0;
let wizardFrameId = 0;
let wizardOverlayEl: HTMLElement | null = null;
/** Channels the student left out (only switches can be). */
const skippedChannels = new Set<ChannelKey>();
/** When the current step's channel was found; the wizard moves on by itself a moment later. */
let resolvedAt: number | null = null;
/** The student asked for time (went back, or changed the direction): no automatic move on this step. */
let advanceCancelled = false;
let radioView: RadioView | null = null;
let channelValues: Partial<Record<ChannelKey, number>> = {};

export function initWizard() {
    const btn = document.getElementById('gp-btn-wizard');
    const overlay = document.getElementById('gp-wizard-overlay');
    const closeBtn = document.getElementById('gp-wizard-close');
    const nextBtn = document.getElementById('gp-wizard-next') as HTMLButtonElement | null;
    const prevBtn = document.getElementById('gp-wizard-prev') as HTMLButtonElement | null;
    const invertCheckbox = document.getElementById('gp-wizard-invert') as HTMLInputElement | null;
    const skipBtn = document.getElementById('gp-wizard-skip') as HTMLButtonElement | null;

    if (!btn || !overlay || !closeBtn || !nextBtn || !prevBtn || !invertCheckbox || !skipBtn) return;
    wizardOverlayEl = overlay;

    btn.onclick = () => {
        overlay.style.display = 'flex';
        startWizard();
    };

    closeBtn.onclick = () => {
        overlay.style.display = 'none';
        stopWizard();
    };

    nextBtn.onclick = () => goNext();

    prevBtn.onclick = () => {
        // Going back to a step that is already answered must not send the wizard straight forward again.
        advanceCancelled = true;
        resolvedAt = null;
        if (showingSummary) {
            showingSummary = false;
            renderWizardState();
            return;
        }

        if (currentStepIdx === 0) return;
        currentStepIdx -= 1;
        prepareCurrentStep();
        renderWizardState();
    };

    skipBtn.onclick = () => {
        const step = getCurrentStep();
        if (step.type !== 'aux' || isCurrentStepResolved()) return;
        skippedChannels.add(step.channel);
        goNext();
    };

    invertCheckbox.onchange = () => {
        const channelState = getCurrentChannelState();
        const inversionIndex = channelState ? getChannelInversionIndex(channelState.channel) : -1;
        if (inversionIndex < 0) return;
        wizardDraftInversion[inversionIndex] = invertCheckbox.checked;
        // Changing the direction is a reason to stay on the step: the student decides when to go on.
        advanceCancelled = true;
        renderWizardState();
    };

    document.addEventListener('visibilitychange', () => ensureWizardLoop(true));
}

function startWizard() {
    isWizardActive = true;
    showingSummary = false;
    currentStepIdx = 0;
    lastWizardUiRenderAt = 0;
    lastWizardLoopAt = 0;
    detectedMapping = {};
    auxResults = {};
    wizardDraftInversion = createWizardDraftInversion();
    skippedChannels.clear();
    channelValues = {};
    advanceCancelled = false;
    const radioRoot = document.getElementById('gp-wizard-radio');
    if (radioRoot && !radioView) radioView = createRadioView(radioRoot);
    prepareCurrentStep();
    renderWizardState();
    ensureWizardLoop(true);
}

function stopWizard() {
    isWizardActive = false;
    showingSummary = false;
    lastWizardUiRenderAt = 0;
    lastWizardLoopAt = 0;
    if (wizardFrameId !== 0) {
        window.cancelAnimationFrame(wizardFrameId);
        wizardFrameId = 0;
    }
}

function goNext() {
    if (showingSummary) {
        finishWizard();
        return;
    }

    if (!isCurrentStepResolved() && !skippedChannels.has(getCurrentStep().channel)) return;

    advanceCancelled = false;
    resolvedAt = null;
    if (currentStepIdx < STEPS.length - 1) {
        currentStepIdx += 1;
        prepareCurrentStep();
        renderWizardState();
        return;
    }

    showingSummary = true;
    renderWizardState();
}

function prepareCurrentStep() {
    resolvedAt = null;
    stepBaselineAxes = [];
    stepLastAxes = [];
    stepAxisStats = [];
    stepObservedStats = resetObservedInputStats();
    stepLastSwitchValues = new Map<GamepadInputRef, number>();
    stepSwitchTransitions = new Map<GamepadInputRef, number>();
}

function renderWizardState(force = true) {
    const now = performance.now();
    if (!force && now - lastWizardUiRenderAt < WIZARD_UI_RENDER_INTERVAL_MS) {
        return;
    }
    lastWizardUiRenderAt = now;

    renderWizardUi({
        currentStepIdx,
        showingSummary,
        detectedMapping,
        auxResults,
        stepObservedStats,
        stepSwitchTransitions,
        skipped: skippedChannels,
        channelValues,
        connected: getFirstConnectedGamepad() !== null,
        advancing: isCurrentStepResolved() && !advanceCancelled,
        getCurrentStep,
        getDetectedRef,
        getCurrentChannelState,
        getChannelInversion,
        getFirstConnectedGamepad,
        isCurrentStepResolved
    });
}

function getCurrentStep(): WizardStep {
    return STEPS[currentStepIdx];
}

function getDetectedRef(channel: ChannelKey): GamepadInputRef | null {
    return detectedMapping[channel] ?? null;
}

function getPreviewRef(channel: ChannelKey): GamepadInputRef | null {
    const resolvedRef = getDetectedRef(channel);
    if (resolvedRef) return resolvedRef;
    return computePreviewRef({
        channel,
        step: getCurrentStep(),
        detectedMapping,
        stepAxisStats
    });
}

function isCurrentStepResolved(): boolean {
    return getDetectedRef(getCurrentStep().channel) !== null;
}

function getChannelInversion(channel: ChannelKey): boolean {
    const inversionIndex = getChannelInversionIndex(channel);
    return inversionIndex >= 0 ? !!wizardDraftInversion[inversionIndex] : false;
}

function getCurrentChannelState(): WizardChannelState | null {
    const step = getCurrentStep();
    return {
        channel: step.channel,
        label: CHANNEL_LABELS[step.channel],
        inverted: getChannelInversion(step.channel),
        type: step.type
    };
}

function isWizardVisible(): boolean {
    return isWizardActive
        && document.visibilityState !== 'hidden'
        && !!wizardOverlayEl
        && wizardOverlayEl.isConnected
        && wizardOverlayEl.getClientRects().length > 0;
}

function ensureWizardLoop(resetTiming = false): void {
    if (!isWizardVisible()) {
        if (wizardFrameId !== 0) {
            window.cancelAnimationFrame(wizardFrameId);
            wizardFrameId = 0;
        }
        return;
    }

    if (resetTiming) {
        lastWizardLoopAt = 0;
    }

    if (wizardFrameId === 0) {
        wizardFrameId = window.requestAnimationFrame(wizardLoop);
    }
}

function wizardLoop(time: number) {
    wizardFrameId = 0;
    if (!isWizardVisible()) return;

    if (time - lastWizardLoopAt < WIZARD_LOOP_INTERVAL_MS) {
        ensureWizardLoop();
        return;
    }
    lastWizardLoopAt = time;

    const gp = getFirstConnectedGamepad();
    if (gp) {
        if (stepBaselineAxes.length !== gp.axes.length) {
            stepBaselineAxes = gp.axes.map((value) => value ?? 0);
            stepLastAxes = gp.axes.map((value) => value ?? 0);
            stepAxisStats = gp.axes.map(() => ({
                maxDelta: 0,
                travel: 0,
                activitySamples: 0
            }));
        }

        if (!showingSummary) {
            sampleCurrentStep(gp);
        }
    }

    if (!showingSummary) {
        channelValues = gp ? readChannelValues(gp) : {};
        updateRadio(gp);
        trackAutoAdvance(performance.now());
        renderWizardState(false);
    }

    ensureWizardLoop();
}

/** Live values for every channel: the flight channels from the inputs found so far (or the likeliest while one is being asked). */
function readChannelValues(gp: Gamepad): Partial<Record<ChannelKey, number>> {
    const values: Partial<Record<ChannelKey, number>> = {};
    for (const channel of ['throttle', 'yaw', 'pitch', 'roll'] as PrimaryChannelKey[]) {
        const ref = getPreviewRef(channel);
        values[channel] = ref ? readRefNormalizedValue(gp, ref, channel, getChannelInversion(channel)) : 0;
    }
    for (const channel of Object.keys(AUX_SWITCHES) as WizardAuxChannelKey[]) {
        const rc = readAuxRc(gp, channel);
        values[channel] = rc === null ? 0 : (rc - 1500) / 500;
    }
    return values;
}

/** RC value of a switch channel: from its found input, or from the likeliest input while it is being asked. */
function readAuxRc(gp: Gamepad, channel: WizardAuxChannelKey): number | null {
    let ref = getDetectedRef(channel);
    const step = getCurrentStep();
    if (!ref && step.channel === channel) {
        ref = getBestAuxCandidate({
            gp,
            step,
            requireResolved: false,
            detectedMapping,
            stepObservedStats,
            stepSwitchTransitions
        })?.ref ?? null;
    }
    return ref ? readRefRcValue(gp, ref, channel, getChannelInversion(channel)) : null;
}

/** The few words the transmitter's screen shows for a step. */
function screenCaption(step: WizardStep): string {
    return step.type === 'aux' ? 'Переключите тумблер' : 'Двигайте стик';
}

/** How far the asked channel is deflected, 0..1, for the bar on the screen. */
function screenLevel(step: WizardStep): number {
    const value = channelValues[step.channel] ?? 0;
    return step.channel === 'throttle' ? Math.max(0, Math.min(1, value)) : Math.min(1, Math.abs(value));
}

function updateRadio(gp: Gamepad | null) {
    if (!radioView) return;
    const values = channelValues;
    radioView.update({
        connected: gp !== null,
        target: describeTarget(getCurrentStep(), getPrimaryChannelStickSlot),
        phase: isCurrentStepResolved() ? 'found' : 'waiting',
        values: { throttle: values.throttle ?? 0, yaw: values.yaw ?? 0, pitch: values.pitch ?? 0, roll: values.roll ?? 0 },
        caption: isCurrentStepResolved() ? 'Найдено' : screenCaption(getCurrentStep()),
        level: screenLevel(getCurrentStep()),
        offsets: stickOffsets(
            { throttle: values.throttle ?? 0, yaw: values.yaw ?? 0, pitch: values.pitch ?? 0, roll: values.roll ?? 0 },
            getPrimaryChannelStickSlot
        ),
        levers: {
            mode: gp ? readAuxRc(gp, 'mode') : null,
            arm: gp ? readAuxRc(gp, 'arm') : null,
            magnet: gp ? readAuxRc(gp, 'magnet') : null
        }
    });
}

/** A found channel is shown for a moment and the wizard moves on, unless the student asked for time. */
function trackAutoAdvance(now: number) {
    if (!isCurrentStepResolved()) {
        resolvedAt = null;
        return;
    }
    if (resolvedAt === null) resolvedAt = now;
    if (!advanceCancelled && now - resolvedAt >= AUTO_ADVANCE_MS) goNext();
}

function sampleCurrentStep(gp: Gamepad) {
    const step = getCurrentStep();
    if (step.type === 'primary') {
        detectPrimaryInput(gp, step.channel as PrimaryChannelKey);
        if (currentStepIdx === STEPS.length - 1 && isCurrentStepResolved()) {
            showingSummary = true;
        }
        return;
    }

    detectAuxInput(gp, step);
    if (currentStepIdx === STEPS.length - 1 && isCurrentStepResolved()) {
        showingSummary = true;
    }
}

function detectPrimaryInput(gp: Gamepad, channel: PrimaryChannelKey) {
    const bestRef = detectPrimaryAxis({
        gp,
        stepBaselineAxes,
        stepLastAxes,
        stepAxisStats,
        usedRefs: getUsedRefs(detectedMapping, channel)
    });
    if (bestRef) {
        detectedMapping[channel] = bestRef;
        skippedChannels.delete(channel);
    }
}

function detectAuxInput(gp: Gamepad, step: WizardStep) {
    const channel = step.channel as WizardAuxChannelKey;
    const isInverted = getChannelInversion(channel);

    for (let index = 0; index < gp.axes.length; index += 1) {
        const ref = `a${index}` as GamepadInputRef;
        const rcValue = getAuxStepRcValue(gp, ref, channel, isInverted);
        rememberObservedInputValue(stepObservedStats, ref, rcValue);
        rememberSwitchTransition(stepLastSwitchValues, stepSwitchTransitions, ref, rcValue);
    }

    for (let index = 0; index < gp.buttons.length; index += 1) {
        const ref = `b${index}` as GamepadInputRef;
        const rcValue = getAuxStepRcValue(gp, ref, channel, isInverted);
        rememberObservedInputValue(stepObservedStats, ref, rcValue);
        rememberSwitchTransition(stepLastSwitchValues, stepSwitchTransitions, ref, rcValue);
    }

    const bestResult = getBestAuxCandidate({
        gp,
        step,
        requireResolved: true,
        detectedMapping,
        stepObservedStats,
        stepSwitchTransitions
    });
    if (!bestResult) return;

    detectedMapping[channel] = bestResult.ref;
    auxResults[channel] = bestResult;
    skippedChannels.delete(channel);
}

function finishWizard() {
    finishWizardSession({ detectedMapping, auxResults, wizardDraftInversion, stopWizard });
}
