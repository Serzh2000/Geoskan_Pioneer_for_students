import { currentDroneId } from '../../core/state.js';
import { clearRcPreviewOverride, setRcPreviewOverride } from '../../drone/index.js';
import { getDuplicateSourceConflicts } from './mapping.js';
import type { ChannelRole, RcRuntimeSnapshot, RcWizardPrimaryRole } from './types.js';

const PREVIEW_ROLL_LIMIT_RAD = 0.46;
const PREVIEW_PITCH_LIMIT_RAD = 0.42;
const PREVIEW_YAW_LIMIT_RAD = 0.7;
const PREVIEW_ROTOR_SPEED_MAX = 38;
const RAW_ACTIVITY_DELTA = 0.02;
const RAW_ACTIVITY_LINGER_MS = 900;

type SignalStatusKind = 'live' | 'caution' | 'offline';

export type RcSignalStatus = {
    kind: SignalStatusKind;
    label: string;
    hasRecentActivity: boolean;
    hasMappedPreview: boolean;
    hasVisiblePreviewValues: boolean;
    blockedByConflict: boolean;
};

export type RcPreviewValues = {
    roll: number;
    pitch: number;
    yaw: number;
    throttle: number;
    blockedByConflict: boolean;
};

let lastRawInputs = new Map<string, number>();
let lastActivityAt = 0;

function clampSigned(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

function clampUnsigned(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function getWizardModalPreviewSourceId(snapshot: RcRuntimeSnapshot, role: RcWizardPrimaryRole): string | null {
    if (!snapshot.wizardModal.isOpen || !snapshot.wizardModal.mode) return null;
    const assignedSourceId = snapshot.wizardModal.primaryAssignments[role];
    if (assignedSourceId) return assignedSourceId;
    const activeCaptureRole = snapshot.wizardModal.stepId === role ? role : null;
    if (activeCaptureRole && snapshot.wizardModal.captureSourceId) {
        return snapshot.wizardModal.captureSourceId;
    }
    return null;
}

function isRcSettingsPanelActive(): boolean {
    return document.getElementById('rc-settings-panel')?.classList.contains('active') ?? false;
}

export function restoreRcSettingsViewport(): void {
    clearRcPreviewOverride();
}

function getRoleMapping(snapshot: RcRuntimeSnapshot, role: ChannelRole) {
    return snapshot.activeProfile.channelMappings.find((mapping) => mapping.role === role) ?? null;
}

function getRoleSample(snapshot: RcRuntimeSnapshot, role: ChannelRole) {
    if (role === 'roll' || role === 'pitch' || role === 'yaw' || role === 'throttle') {
        const wizardSourceId = getWizardModalPreviewSourceId(snapshot, role);
        if (wizardSourceId) return snapshot.samples[wizardSourceId] ?? null;
    }
    const mapping = getRoleMapping(snapshot, role);
    return mapping?.sourceId ? snapshot.samples[mapping.sourceId] ?? null : null;
}

function updateRawActivity(snapshot: RcRuntimeSnapshot): boolean {
    const now = performance.now();
    let changed = false;
    for (const [sourceId, rawValue] of Object.entries(snapshot.rawInputs)) {
        const previous = lastRawInputs.get(sourceId);
        if (previous === undefined || Math.abs(previous - rawValue) >= RAW_ACTIVITY_DELTA) {
            changed = true;
        }
        lastRawInputs.set(sourceId, rawValue);
    }
    if (changed) {
        lastActivityAt = now;
    }
    return now - lastActivityAt <= RAW_ACTIVITY_LINGER_MS;
}

function getBlockedPrimarySourceIds(snapshot: RcRuntimeSnapshot): Set<string> {
    const blocked = new Set<string>();
    for (const conflict of getDuplicateSourceConflicts(snapshot.activeProfile)) {
        for (const role of ['roll', 'pitch', 'throttle', 'yaw'] as const) {
            const mapping = getRoleMapping(snapshot, role);
            if (mapping?.sourceId === conflict.sourceId) {
                blocked.add(conflict.sourceId);
            }
        }
    }
    return blocked;
}

export function getRcPreviewValues(snapshot: RcRuntimeSnapshot): RcPreviewValues {
    const blockedSourceIds = getBlockedPrimarySourceIds(snapshot);
    const rollSource = getRoleMapping(snapshot, 'roll')?.sourceId ?? null;
    const pitchSource = getRoleMapping(snapshot, 'pitch')?.sourceId ?? null;
    const yawSource = getRoleMapping(snapshot, 'yaw')?.sourceId ?? null;
    const throttleSource = getRoleMapping(snapshot, 'throttle')?.sourceId ?? null;
    const blockedByConflict = [rollSource, pitchSource, yawSource, throttleSource].some((sourceId) => Boolean(sourceId && blockedSourceIds.has(sourceId)));

    if (blockedByConflict) {
        return {
            roll: 0,
            pitch: 0,
            yaw: 0,
            throttle: 0,
            blockedByConflict: true
        };
    }

    return {
        roll: clampSigned(getRoleSample(snapshot, 'roll')?.normalizedValue ?? 0),
        pitch: clampSigned(getRoleSample(snapshot, 'pitch')?.normalizedValue ?? 0),
        yaw: clampSigned(getRoleSample(snapshot, 'yaw')?.normalizedValue ?? 0),
        throttle: clampUnsigned(getRoleSample(snapshot, 'throttle')?.normalizedValue ?? 0),
        blockedByConflict: false
    };
}

function hasMappedPreviewChannels(snapshot: RcRuntimeSnapshot): boolean {
    return ['roll', 'pitch', 'yaw', 'throttle'].every((role) => Boolean(getRoleSample(snapshot, role as ChannelRole)));
}

export function getRcSignalStatus(snapshot: RcRuntimeSnapshot): RcSignalStatus {
    const values = getRcPreviewValues(snapshot);
    const hasRecentActivity = updateRawActivity(snapshot);
    const hasMappedPreview = hasMappedPreviewChannels(snapshot);
    const hasVisiblePreviewValues = Math.abs(values.roll) > 0.02
        || Math.abs(values.pitch) > 0.02
        || Math.abs(values.yaw) > 0.02
        || values.throttle > 0.02;

    if (!snapshot.activeDeviceId) {
        return {
            kind: 'offline',
            label: '❌ Нет сигнала от RadioMaster.',
            hasRecentActivity,
            hasMappedPreview,
            hasVisiblePreviewValues,
            blockedByConflict: false
        };
    }

    if (values.blockedByConflict) {
        return {
            kind: 'caution',
            label: '⚠️ Конфликт осей блокирует preview. Проверьте дублирующуюся Axis в Raw Input.',
            hasRecentActivity,
            hasMappedPreview,
            hasVisiblePreviewValues: false,
            blockedByConflict: true
        };
    }

    if (hasRecentActivity && (!getRoleMapping(snapshot, 'roll')?.sourceId || !getRoleMapping(snapshot, 'pitch')?.sourceId)) {
        return {
            kind: 'caution',
            label: "⚠️ Сигнал с пульта идет, но оси Крена/Тангажа не сопоставлены. Вернитесь на шаг 'Стики'.",
            hasRecentActivity,
            hasMappedPreview,
            hasVisiblePreviewValues,
            blockedByConflict: false
        };
    }

    if (hasMappedPreview && hasVisiblePreviewValues) {
        return {
            kind: 'live',
            label: 'Сигнал HID активен: Геоскан Пионер реагирует в реальном Viewport.',
            hasRecentActivity,
            hasMappedPreview,
            hasVisiblePreviewValues,
            blockedByConflict: false
        };
    }

    return {
        kind: 'caution',
        label: '⚠️ Пульт подключен. Пошевелите стики, чтобы проверить реакцию модели.',
        hasRecentActivity,
        hasMappedPreview,
        hasVisiblePreviewValues,
        blockedByConflict: false
    };
}

function shouldUseRcViewport(snapshot: RcRuntimeSnapshot): boolean {
    return isRcSettingsPanelActive()
        && (snapshot.workspaceView === 'wizard' || snapshot.workspaceView === 'monitor' || snapshot.wizardModal.isOpen);
}

export function syncRcSettingsViewport(snapshot: RcRuntimeSnapshot): void {
    if (!shouldUseRcViewport(snapshot)) {
        restoreRcSettingsViewport();
        return;
    }

    const values = getRcPreviewValues(snapshot);
    const hasPrimarySignal = Math.abs(values.roll) > 0.01 || Math.abs(values.pitch) > 0.01 || Math.abs(values.yaw) > 0.01 || values.throttle > 0.01;
    const shouldLevel = values.blockedByConflict || !hasPrimarySignal;

    setRcPreviewOverride({
        active: true,
        droneId: currentDroneId,
        rotation: {
            x: shouldLevel ? 0 : values.roll * PREVIEW_ROLL_LIMIT_RAD,
            y: shouldLevel ? 0 : values.yaw * PREVIEW_YAW_LIMIT_RAD,
            z: shouldLevel ? 0 : values.pitch * PREVIEW_PITCH_LIMIT_RAD
        },
        rotorSpeed: shouldLevel ? 0 : values.throttle * PREVIEW_ROTOR_SPEED_MAX
    });
}
