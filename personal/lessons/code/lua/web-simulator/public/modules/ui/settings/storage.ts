import { RC_STORAGE_KEY, RC_VISIBLE_CHANNELS_DEFAULT, VIRTUAL_DEVICE_ID, DEFAULT_WIZARD_SESSION, createDefaultProfile } from './constants.js';
import { ensureProfileShape } from './mapping.js';
import type { DeviceProfile, RcSetupPersistedState } from './types.js';

function isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
}

function normalizeWorkspaceView(view: unknown): RcSetupPersistedState['workspaceView'] {
    if (view === 'advanced' || view === 'monitor') return view;
    return 'wizard';
}

function createInitialState(): RcSetupPersistedState {
    const hardwareProfile = createDefaultProfile({
        name: 'Radiomaster USB Profile',
        detectedModel: 'Radiomaster USB HID',
        deviceKind: 'rc-transmitter',
        transport: 'gamepad-api',
        notes: ['Подключите пульт Radiomaster по USB, чтобы начать привязку осей.']
    });
    return {
        profiles: [hardwareProfile],
        activeProfileId: hardwareProfile.id,
        preferredDeviceId: null,
        expandedChannels: false,
        workspaceView: 'wizard',
        wizard: { ...DEFAULT_WIZARD_SESSION }
    };
}

export function loadRcSetupState(): RcSetupPersistedState {
    if (!isStorageAvailable()) return createInitialState();
    try {
        const raw = localStorage.getItem(RC_STORAGE_KEY);
        if (!raw) return createInitialState();
        const parsed = JSON.parse(raw) as Partial<RcSetupPersistedState>;
        const profiles = (parsed.profiles ?? [])
            .map((profile) => ensureProfileShape(profile as DeviceProfile))
            .filter((profile) => profile.deviceId !== VIRTUAL_DEVICE_ID && profile.deviceKind !== 'virtual');
        if (!profiles.length) return createInitialState();
        return {
            profiles,
            activeProfileId: parsed.activeProfileId ?? profiles[0].id,
            preferredDeviceId: parsed.preferredDeviceId && parsed.preferredDeviceId !== VIRTUAL_DEVICE_ID
                ? parsed.preferredDeviceId
                : (profiles[0].deviceId || null),
            expandedChannels: Boolean(parsed.expandedChannels ?? false),
            workspaceView: normalizeWorkspaceView(parsed.workspaceView),
            wizard: {
                ...DEFAULT_WIZARD_SESSION,
                ...(parsed.wizard ?? {})
            }
        };
    } catch (error) {
        console.warn('[RC Setup] Failed to load settings:', error);
        return createInitialState();
    }
}

export function saveRcSetupState(state: RcSetupPersistedState): void {
    if (!isStorageAvailable()) return;
    const safeState: RcSetupPersistedState = {
        profiles: state.profiles.map((profile) => ensureProfileShape({
            ...profile,
            visibleChannelCount: profile.visibleChannelCount || RC_VISIBLE_CHANNELS_DEFAULT
        })),
        activeProfileId: state.activeProfileId,
        preferredDeviceId: state.preferredDeviceId,
        expandedChannels: state.expandedChannels,
        workspaceView: state.workspaceView,
        wizard: { ...state.wizard }
    };
    localStorage.setItem(RC_STORAGE_KEY, JSON.stringify(safeState));
}
