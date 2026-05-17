import { buildDeviceSummaries, getRawInputMap } from './runtime-devices.js';
import {
    autoDetectInput,
    computeChannelValues,
    createSamples,
    ensureProfilesHaveSources,
    getActiveDeviceSummary,
    getActiveProfile,
    refreshWizardSteps,
    replaceActiveProfile,
    sampleCalibrationStep,
    syncActiveProfileToDevice
} from './runtime-profile.js';
import {
    RuntimeListener,
    getPollFrameId,
    getLatestSnapshot,
    isRuntimeInitialized,
    listeners,
    markRuntimeInitialized,
    persistIfNeeded,
    persistedState,
    rawCache,
    setPollFrameId,
    setLatestSnapshot,
    setWizardModalState,
    wizardModalState
} from './runtime-store.js';
import { syncLegacyState } from './runtime-sync.js';
import { detectMappingConflicts } from './mapping.js';
import type { InputSource, RcRuntimeSnapshot, RcWizardAuxRole, RcWizardModalState, RcWizardModalStepId } from './types.js';

const RC_POLL_INTERVAL_MS = 50;
const WIZARD_CAPTURE_MIN_TICKS = 2;
const WIZARD_AXIS_CAPTURE_THRESHOLD = 0.55;
const WIZARD_AUX_CAPTURE_THRESHOLD = 0.6;

function formatConnectionStatus(snapshotDevice: RcRuntimeSnapshot['devices'][number] | null): string {
    if (!snapshotDevice?.connected) {
        return 'Radiomaster USB HID: не обнаружен';
    }
    const transportLabel = snapshotDevice.transport === 'gamepad-api' ? 'USB' : snapshotDevice.transport.toUpperCase();
    return `${snapshotDevice.name} (${transportLabel}): подключено`;
}

function emitSnapshot(snapshot: RcRuntimeSnapshot): void {
    setLatestSnapshot(snapshot);
    listeners.forEach((listener) => listener(snapshot));
}

function getWizardStepRole(stepId: RcWizardModalStepId): 'throttle' | 'roll' | 'pitch' | 'yaw' | null {
    if (stepId === 'throttle' || stepId === 'roll' || stepId === 'pitch' || stepId === 'yaw') return stepId;
    return null;
}

const WIZARD_PRIMARY_STEP_ORDER: Array<'throttle' | 'yaw' | 'pitch' | 'roll'> = ['throttle', 'yaw', 'pitch', 'roll'];

function getNextAuxRole(role: RcWizardAuxRole): RcWizardAuxRole | null {
    const roles: RcWizardAuxRole[] = ['flightMode', 'arm', 'magnet'];
    const currentIndex = roles.indexOf(role);
    return roles[currentIndex + 1] ?? null;
}

function computeWizardSourceScore(source: InputSource, rawValue: number, previousRawValue: number, stepId: RcWizardModalStepId): number {
    const delta = Math.abs(rawValue - previousRawValue);
    if (stepId === 'aux') {
        return source.signalType === 'button'
            ? Math.max(delta * 2, rawValue)
            : Math.max(delta * 1.5, Math.abs(rawValue) * 0.8);
    }
    return Math.max(delta * 1.6, Math.abs(rawValue));
}

function captureWizardInput(rawInputs: Record<string, number>, profile: RcRuntimeSnapshot['activeProfile']): RcWizardModalState {
    if (!wizardModalState.isOpen || !wizardModalState.mode || wizardModalState.stepId === 'mode' || wizardModalState.stepId === 'review') {
        return wizardModalState;
    }

    const usedSourceIds = new Set<string>([
        ...Object.values(wizardModalState.primaryAssignments),
        ...Object.values(wizardModalState.auxAssignments)
    ].filter((value): value is string => Boolean(value)));

    let bestSource: InputSource | null = null;
    let bestScore = 0;

    for (const source of profile.inputSources) {
        const rawValue = rawInputs[source.id] ?? 0;
        const previousRawValue = rawCache.get(`wizard:${source.id}`) ?? rawValue;
        rawCache.set(`wizard:${source.id}`, rawValue);

        if (usedSourceIds.has(source.id)) continue;

        const isAxisStep = wizardModalState.stepId !== 'aux';
        if (isAxisStep && source.signalType !== 'axis') continue;
        if (!isAxisStep && !['button', 'switch-2pos', 'switch-3pos', 'momentary', 'selector-6pos'].includes(source.controlType) && source.signalType !== 'button') continue;

        const score = computeWizardSourceScore(source, rawValue, previousRawValue, wizardModalState.stepId);
        if (score > bestScore) {
            bestScore = score;
            bestSource = source;
        }
    }

    const captureThreshold = wizardModalState.stepId === 'aux' ? WIZARD_AUX_CAPTURE_THRESHOLD : WIZARD_AXIS_CAPTURE_THRESHOLD;
    if (!bestSource || bestScore < captureThreshold) {
        return {
            ...wizardModalState,
            captureSourceId: null,
            captureTicks: 0,
            errorText: null
        };
    }

    const captureTicks = wizardModalState.captureSourceId === bestSource.id
        ? wizardModalState.captureTicks + 1
        : 1;

    if (captureTicks < WIZARD_CAPTURE_MIN_TICKS) {
        return {
            ...wizardModalState,
            captureSourceId: bestSource.id,
            captureTicks,
            statusText: `Фиксируем ${bestSource.label}. Продолжайте движение до завершения захвата.`,
            errorText: null
        };
    }

    if (wizardModalState.stepId === 'aux') {
        const nextAuxRole = getNextAuxRole(wizardModalState.currentAuxRole);
        return {
            ...wizardModalState,
            auxAssignments: {
                ...wizardModalState.auxAssignments,
                [wizardModalState.currentAuxRole]: bestSource.id
            },
            currentAuxRole: nextAuxRole ?? wizardModalState.currentAuxRole,
            stepId: nextAuxRole ? 'aux' : 'review',
            captureSourceId: null,
            captureTicks: 0,
            statusText: nextAuxRole
                ? `Назначен ${bestSource.label}. Переключите следующий AUX.`
                : 'Все обязательные действия захвачены. Примените настройки.',
            errorText: null
        };
    }

    const capturedRole = getWizardStepRole(wizardModalState.stepId);
    const currentStepIndex = capturedRole ? WIZARD_PRIMARY_STEP_ORDER.indexOf(capturedRole) : -1;
    const nextPrimaryRole = currentStepIndex >= 0 ? WIZARD_PRIMARY_STEP_ORDER[currentStepIndex + 1] ?? null : null;
    const nextStepId = nextPrimaryRole ?? 'aux';

    return {
        ...wizardModalState,
        primaryAssignments: capturedRole
            ? {
                ...wizardModalState.primaryAssignments,
                [capturedRole]: bestSource.id
            }
            : wizardModalState.primaryAssignments,
        stepId: nextStepId,
        captureSourceId: null,
        captureTicks: 0,
        statusText: `Назначен ${bestSource.label}. Переходим к следующему шагу.`,
        errorText: null
    };
}

function ensureRcRuntimePolling(): void {
    if (typeof window === 'undefined' || getPollFrameId()) return;
    let lastTick = 0;
    const tick = (time: number) => {
        setPollFrameId(window.requestAnimationFrame(tick));
        if (time - lastTick < RC_POLL_INTERVAL_MS) return;
        lastTick = time;
        if (!listeners.size) return;
        updateRcInputRuntime();
    };
    setPollFrameId(window.requestAnimationFrame(tick));
}

export function initRcSetupRuntime(): void {
    if (isRuntimeInitialized()) return;
    markRuntimeInitialized();
    ensureRcRuntimePolling();

    if (typeof window !== 'undefined') {
        window.addEventListener('gamepadconnected', () => {
            updateRcInputRuntime();
        });
        window.addEventListener('gamepaddisconnected', () => {
            updateRcInputRuntime();
        });
    }
}

export function subscribeRcRuntime(listener: RuntimeListener): () => void {
    listeners.add(listener);
    const snapshot = getLatestSnapshot();
    if (snapshot) {
        listener(snapshot);
    }
    return () => listeners.delete(listener);
}

export function getRcRuntimeSnapshot(): RcRuntimeSnapshot {
    let snapshot = getLatestSnapshot();
    if (!snapshot) {
        updateRcInputRuntime();
        snapshot = getLatestSnapshot();
    }
    return snapshot!;
}

export function updateRcInputRuntime(): void {
    initRcSetupRuntime();
    const devices = buildDeviceSummaries();
    ensureProfilesHaveSources(devices);

    let profile = getActiveProfile();
    const device = getActiveDeviceSummary(devices, profile);
    if (device) {
        persistedState.preferredDeviceId = device.id;
        profile = syncActiveProfileToDevice(profile, device);
    }

    const rawInputs = getRawInputMap(device?.id ?? null);
    profile = autoDetectInput(rawInputs, profile);
    profile = sampleCalibrationStep(rawInputs, profile);
    profile = refreshWizardSteps(profile);
    replaceActiveProfile(profile);
    const nextWizardModalState = captureWizardInput(rawInputs, profile);
    if (JSON.stringify(nextWizardModalState) !== JSON.stringify(wizardModalState)) {
        setWizardModalState(nextWizardModalState);
    }

    const samples = createSamples(profile, rawInputs);
    const channelValues = computeChannelValues(profile, rawInputs);
    const warnings: string[] = [];
    if (!device || !device.connected) {
        warnings.push('Активное устройство не найдено или отключено.');
    }
    const connectedDevices = devices.filter((item) => item.connected);
    if (connectedDevices.length > 1) {
        warnings.push('Обнаружено несколько физических устройств. Проверьте, что выбран нужный профиль.');
    }
    warnings.push(...(device?.warnings ?? []));

    emitSnapshot({
        devices,
        profiles: persistedState.profiles.map((item) => ({ id: item.id, name: item.name })),
        activeProfile: profile,
        activeDeviceId: device?.id ?? null,
        preferredDeviceId: persistedState.preferredDeviceId,
        expandedChannels: persistedState.expandedChannels,
        workspaceView: persistedState.workspaceView,
        wizard: { ...persistedState.wizard },
        rawInputs,
        samples,
        channelValues,
        warnings,
        conflicts: detectMappingConflicts(profile),
        connectionStatus: formatConnectionStatus(device ?? null),
        wizardModal: nextWizardModalState
    });

    syncLegacyState(profile, device, channelValues);
    persistIfNeeded();
}
