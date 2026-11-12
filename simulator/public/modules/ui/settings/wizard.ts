import { defaultGamepadTuning, simSettings, type ChannelTuning, type GamepadInputRef, type TunedChannel } from '../../core/state.js';
import { getChannelInversionIndex } from './constants.js';
import {
    rememberObservedInputValue,
    resetObservedInputStats
} from './input/observed.js';
import { getPrimaryChannelStickSlot, readRefNormalizedValue, readRefRcValue } from './input/values.js';
import { restoreSettingsSnapshot, takeSettingsSnapshot, type SettingsSnapshot } from './wizard/snapshot.js';
import { createSwitchesPanel, type SwitchesPanel } from './wizard/switches-ui.js';
import { buildReadyHtml } from './wizard/ready.js';
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
import {
    calibrationFromDraft,
    findDisplacedAxes,
    findOwner,
    firstChannelWithoutInput,
    pickAxisTakeover,
    pickOccupiedTouch,
    SWITCH_CHANNELS,
    resetChannelResult,
    settleReturningAxes
} from './wizard/capture.js';
import { formatRefLabel } from './wizard/summary.js';
import { saveGamepadSettings } from '../../core/state.js';
import { AUTO_ADVANCE_MS, AUX_SWITCHES, describeTarget, stickOffsets } from './wizard/radio-model.js';
import { createRadioView, type RadioView } from './wizard/radio-view.js';
import { TUNING_CHANNELS, createTuningPanel, type TuningPanel } from './wizard/tuning-ui.js';
import { holdSceneRendering } from '../../scene/core/render-gate.js';
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
/** The first screen: two buttons, calibration and fine tuning, with the transmitter and the drone behind. */
let showingMenu = true;
/** The fine-tuning screen: after the last channel is found, before the summary. */
let showingTuning = false;
/** The settings as they were when the current screen opened: Cancel and Back put them back. */
let tuningBackup: SettingsSnapshot | null = null;
/** The settings from before the calibration began: Cancel during the journey puts all of it back. */
let journeyBackup: SettingsSnapshot | null = null;
let tuningPanel: TuningPanel | null = null;
/** The switches screen: which switch does what, set like a flight controller's modes page. */
let showingSwitches = false;
/** The last screen: what was set and how to take off. */
let showingReady = false;
/** The student came through the calibration, so the wizard leads on: tuning, switches, flight. Opened from the menu, a screen closes itself. */
let journey = false;
let switchesPanel: SwitchesPanel | null = null;
/** What the student moved that is already taken by another channel; shown instead of silently ignoring it. */
let stepNotice: string | null = null;
/** A channel lost its input to another one: said on this step, and the wizard goes back for the channel that was left without. */
let reassignNote: string | null = null;
let repairing = false;
/** The range each found stick axis showed during its step: it becomes the calibration of that axis. */
const calibrationDraft = new Map<number, { min: number; max: number; center: number }>();
/** Axes whose stick was not at rest when the step began: it is still coming back from the previous step, which is not an answer. */
let stepReturning = new Set<number>();
let stepStartedAway = new Set<number>();
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
/** The wizard's stage hides the scene, so the scene is not drawn while the wizard is open. */
let releaseSceneRendering: (() => void) | null = null;
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
        openWizard();
    };
    document.getElementById('gp-wizard-menu-calibrate')?.addEventListener('click', startCalibration);
    document.getElementById('gp-wizard-menu-tuning')?.addEventListener('click', () => { journey = false; startTuning(); });
    document.getElementById('gp-wizard-menu-switches')?.addEventListener('click', () => { journey = false; startSwitches(); });
    document.getElementById('gp-wizard-menu-channels')?.addEventListener('click', () => {
        closeBtn.click();
        window.dispatchEvent(new Event('gamepad-dialog:open'));
    });

    closeBtn.onclick = () => {
        // On the last screen everything was applied by the step before, so there is nothing left to take back.
        const backup = showingReady ? null : journey && journeyBackup ? journeyBackup : tuningBackup;
        if (backup) restoreSettingsSnapshot(backup);
        closeWizard();
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
        if (showingReady) {
            startSwitches();
            return;
        }
        if (showingSwitches) {
            // What was changed on this screen is dropped, as with Cancel.
            if (tuningBackup) restoreSettingsSnapshot(tuningBackup);
            if (journey) startTuning(); else openWizard();
            return;
        }
        if (showingTuning) {
            // Back to the menu: the calibration that led here is taken back too.
            const backup = journey && journeyBackup ? journeyBackup : tuningBackup;
            if (backup) restoreSettingsSnapshot(backup);
            openWizard();
            return;
        }

        if (currentStepIdx === 0) {
            openWizard();
            return;
        }
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

/** The menu: nothing is asked yet, the stage only shows the transmitter and the drone. */
function openWizard() {
    isWizardActive = true;
    releaseSceneRendering ??= holdSceneRendering();
    showingMenu = true;
    showingSummary = false;
    showingTuning = false;
    showingSwitches = false;
    showingReady = false;
    journey = false;
    stepNotice = null;
    tuningBackup = takeSettingsSnapshot();
    // Nothing is left over from an earlier pass: a fresh menu, a fresh calibration.
    journeyBackup = null;
    reassignNote = null;
    repairing = false;
    calibrationDraft.clear();
    currentStepIdx = 0;
    resolvedAt = null;
    advanceCancelled = false;
    stepReturning = new Set<number>();
    stepStartedAway = new Set<number>();
    // The menu shows the transmitter and the drone answering the real one as the simulator reads it now, so the student sees what is going on.
    detectedMapping = savedMapping();
    auxResults = {};
    wizardDraftInversion = createWizardDraftInversion();
    skippedChannels.clear();
    channelValues = {};
    lastWizardUiRenderAt = 0;
    lastWizardLoopAt = 0;
    const radioRoot = document.getElementById('gp-wizard-radio');
    if (radioRoot && !radioView) radioView = createRadioView(radioRoot);
    renderWizardState();
    ensureWizardLoop(true);
}

/** The inputs the simulator uses now, in the wizard's terms. */
function savedMapping(): Partial<Record<ChannelKey, GamepadInputRef>> {
    const saved = simSettings.gamepadMapping;
    return { roll: saved.roll, pitch: saved.pitch, throttle: saved.throttle, yaw: saved.yaw, mode: saved.modeSwitch, arm: saved.armSwitch, magnet: saved.magnetBtn };
}

/** Fine tuning on its own: the channels already saved are the ones tuned. */
function startTuning() {
    tuningBackup = takeSettingsSnapshot();
    showingMenu = false;
    showingSummary = false;
    showingSwitches = false;
    showingReady = false;
    showingTuning = true;
    detectedMapping = savedMapping();
    wizardDraftInversion = createWizardDraftInversion();
    const tuningRoot = document.getElementById('gp-wizard-tuning-content');
    if (tuningRoot && !tuningPanel) tuningPanel = createTuningPanel(tuningRoot, tuningHandlers);
    tuningPanel?.sync();
    renderWizardState();
}

/** The switches screen: arm, flight modes and the magnet, each on a switch and a range. */
function startSwitches() {
    tuningBackup = takeSettingsSnapshot();
    showingMenu = false;
    showingSummary = false;
    showingTuning = false;
    showingReady = false;
    showingSwitches = true;
    detectedMapping = savedMapping();
    wizardDraftInversion = createWizardDraftInversion();
    const root = document.getElementById('gp-wizard-switches-content');
    if (root && !switchesPanel) switchesPanel = createSwitchesPanel(root);
    switchesPanel?.sync();
    renderWizardState();
}

function showReady() {
    showingMenu = false;
    showingSummary = false;
    showingTuning = false;
    showingSwitches = false;
    showingReady = true;
    const target = document.getElementById('gp-wizard-ready-content');
    if (target) target.innerHTML = buildReadyHtml();
    renderWizardState();
}

/** Closes the window for good; what was set has been saved by then. */
function closeWizard() {
    tuningBackup = null;
    journeyBackup = null;
    if (wizardOverlayEl) wizardOverlayEl.style.display = 'none';
    stopWizard();
}

function startCalibration() {
    showingMenu = false;
    journey = false;
    showingSwitches = false;
    showingReady = false;
    stepNotice = null;
    reassignNote = null;
    repairing = false;
    calibrationDraft.clear();
    journeyBackup = takeSettingsSnapshot();
    showingSummary = false;
    showingTuning = false;
    currentStepIdx = 0;
    lastWizardUiRenderAt = 0;
    lastWizardLoopAt = 0;
    detectedMapping = {};
    auxResults = {};
    wizardDraftInversion = createWizardDraftInversion();
    skippedChannels.clear();
    channelValues = {};
    advanceCancelled = false;
    prepareCurrentStep();
    renderWizardState();
    ensureWizardLoop(true);
}

function stopWizard() {
    isWizardActive = false;
    releaseSceneRendering?.();
    releaseSceneRendering = null;
    showingMenu = true;
    journey = false;
    showingSummary = false;
    showingTuning = false;
    showingSwitches = false;
    showingReady = false;
    lastWizardUiRenderAt = 0;
    lastWizardLoopAt = 0;
    if (wizardFrameId !== 0) {
        window.cancelAnimationFrame(wizardFrameId);
        wizardFrameId = 0;
    }
}

function goNext() {
    if (showingReady) {
        closeWizard();
        return;
    }
    if (showingSwitches) {
        saveGamepadSettings();
        if (journey) showReady(); else closeWizard();
        return;
    }
    if (showingTuning) {
        // The tuning is applied as it stands: the inversion chosen here goes in with the mapping.
        finishWizardSession({ detectedMapping, auxResults: {}, wizardDraftInversion, stopWizard, keepOpen: true });
        if (journey) startSwitches(); else closeWizard();
        return;
    }
    if (showingSummary) {
        finishWizard();
        return;
    }

    if (!isCurrentStepResolved() && !skippedChannels.has(getCurrentStep().channel)) return;

    advanceCancelled = false;
    resolvedAt = null;
    // After an input changed hands, the wizard goes straight to the channel that was left without one, then on to the end.
    if (repairing) {
        const pending = firstChannelWithoutInput(STEPS.map((item) => item.channel), detectedMapping, skippedChannels);
        if (pending >= 0) {
            // Only a step that is behind us is a repair; one still ahead is just the next step of the calibration.
            const goingBack = pending < currentStepIdx;
            currentStepIdx = pending;
            prepareCurrentStep();
            if (goingBack) reassignNote = `Для этого канала нужен новый вход: его прежнюю ось забрал другой канал.`;
            renderWizardState();
            return;
        }
        repairing = false;
        finishWizard();
        return;
    }
    if (currentStepIdx < STEPS.length - 1) {
        currentStepIdx += 1;
        prepareCurrentStep();
        renderWizardState();
        return;
    }

    // No summary screen: the calibration is applied and the student lands on the fine tuning, where the transmitter keeps
    // answering and each direction can be flipped at once.
    finishWizard();
}

function prepareCurrentStep() {
    resolvedAt = null;
    reassignNote = null;
    stepBaselineAxes = [];
    stepLastAxes = [];
    stepAxisStats = [];
    stepReturning = new Set<number>();
    stepStartedAway = new Set<number>();
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
        showingMenu,
        showingSummary,
        showingTuning,
        showingSwitches,
        showingReady,
        journey,
        notice: stepNotice ?? reassignNote,
        directionNote: describeDirection(),
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

    // Detection and the card run at 20 Hz; the 3D view is redrawn every frame so the sticks and the drone move smoothly.
    const due = time - lastWizardLoopAt >= WIZARD_LOOP_INTERVAL_MS;
    if (due) lastWizardLoopAt = time;

    const gp = getFirstConnectedGamepad();
    const stepping = !showingMenu && !showingSummary && !showingTuning && !showingSwitches && !showingReady;
    if (due && gp && stepping) {
        if (stepBaselineAxes.length !== gp.axes.length) {
            stepBaselineAxes = gp.axes.map((value) => value ?? 0);
            stepLastAxes = gp.axes.map((value) => value ?? 0);
            stepAxisStats = gp.axes.map(() => ({
                maxDelta: 0,
                travel: 0,
                activitySamples: 0,
                firstDirection: 0
            }));
            stepReturning = findDisplacedAxes(stepBaselineAxes, calibrationDraft);
            stepStartedAway = new Set(stepReturning);
        }

        sampleCurrentStep(gp);
    }

    if (!showingSummary) {
        channelValues = gp ? readChannelValues(gp) : {};
        updateRadio(gp);
        if (showingTuning) tuningPanel?.update({ raw: readTuningRaw(gp) });
        if (showingSwitches) switchesPanel?.update(gp);
        if (due) {
            if (stepping) trackAutoAdvance(performance.now());
            renderWizardState(false);
        }
    }

    ensureWizardLoop();
}

/** What each flight stick reads now without trim and dead zone, for the meters of the tuning screen. */
function readTuningRaw(gp: Gamepad | null): Partial<Record<TunedChannel, number | null>> {
    const raw: Partial<Record<TunedChannel, number | null>> = {};
    for (const channel of TUNING_CHANNELS) {
        const ref = getDetectedRef(channel);
        raw[channel] = gp && ref ? readRefNormalizedValue(gp, ref, channel, getChannelInversion(channel), { trim: 0, deadzone: 0, expo: 0, rate: 1 }) : null;
    }
    return raw;
}

/** The tuning screen edits the live settings (so the 3D view answers at once); Cancel restores the copy taken at the start. */
const tuningHandlers = {
    getTuning: (channel: TunedChannel) => simSettings.gamepadTuning[channel],
    setTuning: (channel: TunedChannel, tuning: ChannelTuning) => { simSettings.gamepadTuning[channel] = tuning; },
    resetTuning: (channel: TunedChannel) => { simSettings.gamepadTuning[channel] = defaultGamepadTuning()[channel]; },
    getInverted: (channel: TunedChannel) => getChannelInversion(channel),
    setInverted: (channel: TunedChannel, inverted: boolean) => {
        const index = getChannelInversionIndex(channel);
        if (index >= 0) wizardDraftInversion[index] = inverted;
    }
};

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
    // Off the calibration steps (menu, tuning, switches, the last screen) the transmitter just follows the real one.
    const offStep = showingMenu || showingTuning || showingSwitches || showingReady;
    if (!radioView) return;
    const values = channelValues;
    radioView.update({
        connected: gp !== null,
        target: offStep ? null : describeTarget(getCurrentStep(), getPrimaryChannelStickSlot),
        phase: isCurrentStepResolved() || offStep ? 'found' : 'waiting',
        values: { throttle: values.throttle ?? 0, yaw: values.yaw ?? 0, pitch: values.pitch ?? 0, roll: values.roll ?? 0 },
        caption: showingMenu ? 'Пульт' : showingSwitches ? 'Тумблеры' : showingReady ? 'Готово' : showingTuning ? 'Настройка' : isCurrentStepResolved() ? 'Найдено' : screenCaption(getCurrentStep()),
        level: offStep ? 0 : screenLevel(getCurrentStep()),
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
        return;
    }

    // The last step is shown as found for a moment and then handed to the summary by the auto-advance, like every other
    // step: switching to the summary here froze the window on the old step without drawing anything.
    detectAuxInput(gp, step);
}

function detectPrimaryInput(gp: Gamepad, channel: PrimaryChannelKey) {
    stepNotice = null;
    settleReturningAxes({ axes: gp.axes, baseline: stepBaselineAxes, last: stepLastAxes, stats: stepAxisStats, returning: stepReturning, draft: calibrationDraft });
    const bestRef = detectPrimaryAxis({
        gp,
        stepBaselineAxes,
        stepLastAxes,
        stepAxisStats,
        usedRefs: getUsedRefs(detectedMapping, channel)
    });
    // An axis that is already another channel's can still be pushed harder than anything free: then the student means it,
    // so the axis changes hands and the channel that had it loses its whole result (input, direction, calibration).
    const taken = takeOverUsedAxis(channel, bestRef);
    if (taken) {
        detectedMapping[channel] = taken;
        skippedChannels.delete(channel);
    }
    if (bestRef && !taken) {
        // The step names the direction to push first (up, right, forward), so the first push says which way the channel
        // runs: the direction is set here and the student only has to correct it if they pushed the other way first.
        if (detectedMapping[channel] !== bestRef) {
            const direction = bestRef.startsWith('a') ? stepAxisStats[Number(bestRef.slice(1))]?.firstDirection ?? 0 : 0;
            const index = getChannelInversionIndex(channel);
            if (direction !== 0 && index >= 0) wizardDraftInversion[index] = direction < 0;
        }
        detectedMapping[channel] = bestRef;
        skippedChannels.delete(channel);
        stepNotice = null;
    }
    if (taken) setDraftDirection(channel, taken);
    // A light touch on an axis that is already taken only earns a hint: the student may have brushed the wrong stick.
    if (!detectedMapping[channel]) {
        const touch = pickOccupiedTouch({ channel, mapping: detectedMapping, stats: stepAxisStats });
        if (touch) stepNotice = `Эта ось уже назначена: «${CHANNEL_LABELS[touch.owner]}» (${formatRefLabel(touch.ref)}). Для канала «${CHANNEL_LABELS[channel]}» двигайте другой стик.`;
    }
    // What this axis showed during the step is kept; it is the axis's calibration when the wizard is applied.
    const found = detectedMapping[channel];
    if (found?.startsWith('a')) {
        const index = Number(found.slice(1));
        const value = gp.axes[index] ?? 0;
        // The draft starts at the rest point the step began with, so the quiet end of the travel is part of it.
        const rest = stepBaselineAxes[index] ?? value;
        const kept = calibrationDraft.get(index) ?? { min: Math.min(value, rest), max: Math.max(value, rest), center: rest };
        kept.min = Math.min(kept.min, value);
        kept.max = Math.max(kept.max, value);
        calibrationDraft.set(index, kept);
    }
}

/** The direction of a channel from the way its axis went first (see the step's wording). */
function setDraftDirection(channel: PrimaryChannelKey, ref: GamepadInputRef) {
    const direction = ref.startsWith('a') ? stepAxisStats[Number(ref.slice(1))]?.firstDirection ?? 0 : 0;
    const index = getChannelInversionIndex(channel);
    if (direction !== 0 && index >= 0) wizardDraftInversion[index] = direction < 0;
}

/** Forgets what a channel found: its input, its direction and what its axis showed. */
function clearChannelResult(owner: ChannelKey) {
    resetChannelResult({
        channel: owner,
        mapping: detectedMapping,
        auxResults,
        skipped: skippedChannels,
        draft: calibrationDraft,
        inversion: wizardDraftInversion,
        savedInversion: createWizardDraftInversion()
    });
}

/** The axis of another channel that the student is clearly pushing on this step, if any; the channel it belonged to is reset. */
function takeOverUsedAxis(channel: PrimaryChannelKey, freeBest: GamepadInputRef | null): GamepadInputRef | null {
    const pick = pickAxisTakeover({ channel, mapping: detectedMapping, stats: stepAxisStats, freeBest });
    if (!pick) return null;
    clearChannelResult(pick.owner);
    repairing = true;
    reassignNote = `${formatRefLabel(pick.ref)} теперь «${CHANNEL_LABELS[channel]}». «${CHANNEL_LABELS[pick.owner]}» остался без входа: мастер вернётся к нему.`;
    return pick.ref;
}

/** Says how the wizard read the direction, so the student sees why the channel is or is not reversed. */
function describeDirection(): string | null {
    const step = getCurrentStep();
    if (showingMenu || showingSummary || showingTuning || showingSwitches || showingReady || step.type !== 'primary') return null;
    const ref = getDetectedRef(step.channel);
    if (!ref || !ref.startsWith('a')) return null;
    const direction = stepAxisStats[Number(ref.slice(1))]?.firstDirection ?? 0;
    if (direction === 0) return null;
    const first = step.channel === 'throttle' ? 'вверх' : step.channel === 'pitch' ? 'вперёд' : 'вправо';
    const inverted = getChannelInversion(step.channel);
    const expected = direction < 0;
    const seen = `Вы повели стик ${first}, значение оси ${direction > 0 ? 'выросло' : 'упало'}.`;
    // The direction was changed by hand after the push: say so instead of repeating the automatic reading.
    if (inverted !== expected) return `${seen} Вы переключили инверсию вручную: теперь это движение читается наоборот.`;
    return `Вы повели стик ${first}, значение оси ${direction > 0 ? 'выросло' : 'упало'}. ${inverted ? 'Канал перевёрнут, чтобы это было «' + first + '»' : 'Перевернуть канал не нужно'}.`;
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

    // A switch that is already taken by another channel (a flight stick or an earlier switch) is named, not silently skipped.
    stepNotice = null;
    if (!isCurrentStepResolved()) {
        const used = getUsedRefs(detectedMapping, channel);
        for (const ref of used) {
            const seen = stepObservedStats.get(ref);
            if (!seen || seen.maxRc - seen.minRc < 250) continue;
            // A stick that was still coming back to rest when this step began is not being pushed on purpose.
            if (ref.startsWith('a') && stepStartedAway.has(Number(ref.slice(1)))) continue;
            const owner = findOwner(detectedMapping, ref, channel);
            if (owner) stepNotice = `Это стик «${CHANNEL_LABELS[owner]}», он занят полётом. Переключайте тумблер.`;
        }
    }

    // Another switch's input can be taken over, like a stick's: the student flipped it on purpose, and that switch loses its result.
    const masked = { ...detectedMapping };
    for (const key of SWITCH_CHANNELS) if (key !== channel) delete masked[key];
    const bestResult = getBestAuxCandidate({
        gp,
        step,
        requireResolved: true,
        detectedMapping: masked,
        stepObservedStats,
        stepSwitchTransitions
    });
    if (!bestResult) return;

    const previousOwner = findOwner(detectedMapping, bestResult.ref, channel, SWITCH_CHANNELS);
    if (previousOwner) {
        clearChannelResult(previousOwner);
        repairing = true;
        reassignNote = `${formatRefLabel(bestResult.ref)} теперь «${CHANNEL_LABELS[channel]}». «${CHANNEL_LABELS[previousOwner]}» остался без входа: мастер вернётся к нему.`;
    }
    detectedMapping[channel] = bestResult.ref;
    auxResults[channel] = bestResult;
    skippedChannels.delete(channel);
}

/** The calibration is over: what it found is saved, and the wizard leads straight on to the fine tuning. */
function finishWizard() {
    applyCalibrationDraft();
    finishWizardSession({ detectedMapping, auxResults, wizardDraftInversion, stopWizard, keepOpen: true });
    journey = true;
    startTuning();
}

/** The sticks' ends and rest points seen during the steps become the calibration, so a pad that does not report the full range still reads 0..100%. */
function applyCalibrationDraft() {
    const cal = simSettings.gamepadCalibration;
    for (const [index, seen] of calibrationDraft) {
        if (index >= cal.min.length) continue;
        const result = calibrationFromDraft(seen, detectedMapping.throttle === `a${index}`);
        if (!result) continue;
        cal.min[index] = result.min;
        cal.max[index] = result.max;
        cal.center[index] = result.center;
        cal.isCalibrated = true;
    }
    calibrationDraft.clear();
}
