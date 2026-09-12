import type { GamepadInputRef } from '../../core/state.js';
import { getChannelInversionIndex } from './constants.js';
import {
    rememberObservedInputValue,
    resetObservedInputStats
} from './input/observed.js';
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
import { WizardPreviewController } from './wizard/preview.js';
import { computePreviewRef } from './wizard/preview-ref.js';
import { renderWizardState as renderWizardUi } from './wizard/ui.js';
import {
    finishWizardSession,
    getFirstConnectedGamepad,
    getResolvedPrimaryRef as getResolvedPrimaryWizardRef
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

const previewController = new WizardPreviewController({
    getCurrentStep,
    getDetectedRef,
    getPreviewRef,
    getChannelInversion
});

export function initWizard() {
    const btn = document.getElementById('gp-btn-wizard');
    const overlay = document.getElementById('gp-wizard-overlay');
    const closeBtn = document.getElementById('gp-wizard-close');
    const nextBtn = document.getElementById('gp-wizard-next') as HTMLButtonElement | null;
    const prevBtn = document.getElementById('gp-wizard-prev') as HTMLButtonElement | null;
    const invertCheckbox = document.getElementById('gp-wizard-invert') as HTMLInputElement | null;

    if (!btn || !overlay || !closeBtn || !nextBtn || !prevBtn || !invertCheckbox) return;
    wizardOverlayEl = overlay;

    btn.onclick = () => {
        overlay.style.display = 'flex';
        startWizard();
    };

    closeBtn.onclick = () => {
        overlay.style.display = 'none';
        stopWizard();
    };

    nextBtn.onclick = () => {
        if (showingSummary) {
            finishWizard();
            return;
        }

        if (!isCurrentStepResolved()) return;

        if (currentStepIdx < STEPS.length - 1) {
            currentStepIdx += 1;
            prepareCurrentStep();
            renderWizardState();
            return;
        }

        showingSummary = true;
        renderWizardState();
    };

    prevBtn.onclick = () => {
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

    invertCheckbox.onchange = () => {
        const channelState = getCurrentChannelState();
        const inversionIndex = channelState ? getChannelInversionIndex(channelState.channel) : -1;
        if (inversionIndex < 0) return;
        wizardDraftInversion[inversionIndex] = invertCheckbox.checked;
        renderWizardState();
    };

    window.addEventListener('resize', () => previewController.syncSize());
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
    previewController.ensureScene();
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

function prepareCurrentStep() {
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
        getCurrentStep,
        getDetectedRef,
        getCurrentChannelState,
        getChannelInversion,
        getFirstConnectedGamepad,
        getResolvedPrimaryRef,
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

function getResolvedPrimaryRef(channel: PrimaryChannelKey): GamepadInputRef | null {
    return getResolvedPrimaryWizardRef(channel, detectedMapping);
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
            renderWizardState(false);
        }

        previewController.update(gp);
    }

    ensureWizardLoop();
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
}

function finishWizard() {
    finishWizardSession({ detectedMapping, auxResults, wizardDraftInversion, stopWizard });
}
