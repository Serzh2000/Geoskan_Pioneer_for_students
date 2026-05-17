import { loadRcSetupState, saveRcSetupState } from './storage.js';
import { DEFAULT_WIZARD_MODAL_STATE } from './constants.js';
import type { RcRuntimeSnapshot, RcWizardModalState } from './types.js';

export type RuntimeListener = (snapshot: RcRuntimeSnapshot) => void;

export const listeners = new Set<RuntimeListener>();
export const persistedState = loadRcSetupState();
export const rawCache = new Map<string, number>();
export const virtualAxes = [-1, -1, 0, 0, 0, 0, -1];
export const virtualButtons = [0, 0, 0, 0, 0, 0];
export let wizardModalState: RcWizardModalState = { ...DEFAULT_WIZARD_MODAL_STATE };

let initialized = false;
let latestSnapshot: RcRuntimeSnapshot | null = null;
let lastPersistSignature = '';
let pollFrameId = 0;

export function isRuntimeInitialized(): boolean {
    return initialized;
}

export function markRuntimeInitialized(): void {
    initialized = true;
}

export function getLatestSnapshot(): RcRuntimeSnapshot | null {
    return latestSnapshot;
}

export function setLatestSnapshot(snapshot: RcRuntimeSnapshot): void {
    latestSnapshot = snapshot;
}

export function setWizardModalState(nextState: RcWizardModalState): void {
    wizardModalState = nextState;
}

function getPersistSignature(): string {
    return JSON.stringify({
        profiles: persistedState.profiles,
        activeProfileId: persistedState.activeProfileId,
        preferredDeviceId: persistedState.preferredDeviceId,
        expandedChannels: persistedState.expandedChannels,
        workspaceView: persistedState.workspaceView,
        wizard: persistedState.wizard
    });
}

export function persistIfNeeded(): void {
    const signature = getPersistSignature();
    if (signature === lastPersistSignature) return;
    lastPersistSignature = signature;
    saveRcSetupState(persistedState);
}

export function getPollFrameId(): number {
    return pollFrameId;
}

export function setPollFrameId(frameId: number): void {
    pollFrameId = frameId;
}
