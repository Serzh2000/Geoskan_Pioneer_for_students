import type { GamepadInputRef } from '../../core/state.js';
import type {
    ActionAuxChannelKey,
    AuxiliaryChannelKey,
    BindingAction,
    ChannelKey,
    ChannelMapping,
    ChannelRole,
    ControlBinding,
    DeviceProfile,
    PrimaryChannelKey,
    RcWizardModalState,
    RcWizardState,
    WizardStepId,
    WizardStepState
} from './types.js';

export const PRIMARY_CHANNELS: PrimaryChannelKey[] = ['roll', 'pitch', 'throttle', 'yaw'];
export const AUXILIARY_CHANNELS: AuxiliaryChannelKey[] = ['mode', 'arm', 'magnet'];
export const ACTION_AUX_CHANNELS: ActionAuxChannelKey[] = ['arm', 'magnet'];
export const ALL_CHANNELS: ChannelKey[] = [...PRIMARY_CHANNELS, ...AUXILIARY_CHANNELS];
export const INVERTIBLE_CHANNELS: ChannelKey[] = [...ALL_CHANNELS];

export const CENTER_DEADBAND = 0.03;
export const THROTTLE_IDLE_DEADBAND = 0.02;
export const CALIBRATION_DURATION_MS = 10000;
export const AUTO_DETECT_AXIS_THRESHOLD = 0.35;
export const AUTO_DETECT_AUX_AXIS_THRESHOLD = 0.3;
export const AUTO_DETECT_BUTTON_THRESHOLD = 0.45;
export const AUTO_DETECT_TIMEOUT_MS = 10000;
export const AUTO_DETECT_INPUT_SETTLE_MS = 250;
export const AUTO_DETECT_CONFIRM_MS = 120;
export const POSITION_CLUSTER_THRESHOLD = 90;
export const MIN_POSITION_SAMPLES = 6;
export const MAX_PRESET_POSITIONS = 5;
export const RC_CHANNEL_COUNT = 12;
export const RC_VISIBLE_CHANNELS_DEFAULT = 8;
export const RC_STORAGE_KEY = 'geoskan_rc_setup_state';
export const VIRTUAL_DEVICE_ID = 'virtual-radiomaster';
export const DEFAULT_PWM_MIN = 1000;
export const DEFAULT_PWM_CENTER = 1500;
export const DEFAULT_PWM_MAX = 2000;

export const BINDING_ACTIONS: BindingAction[] = [
    'Arm',
    'Flight Mode',
    'Camera',
    'Magnet',
    'Gear',
    'Return Home',
    'Pit Mode'
];

export const DEFAULT_WIZARD_SESSION: RcWizardState = {
    currentStepId: 'device',
    skippedSteps: [],
    autoDetectChannel: null,
    calibrationActive: false
};

export const DEFAULT_WIZARD_MODAL_STATE: RcWizardModalState = {
    isOpen: false,
    mode: null,
    stepId: 'mode',
    currentAuxRole: 'flightMode',
    primaryAssignments: {
        throttle: null,
        yaw: null,
        pitch: null,
        roll: null
    },
    auxAssignments: {
        flightMode: null,
        arm: null,
        magnet: null
    },
    captureSourceId: null,
    captureTicks: 0,
    statusText: 'Выберите раскладку стиков, чтобы начать мастер.',
    errorText: null
};

export const axisRef = (index: number): GamepadInputRef => `a${index}` as GamepadInputRef;
export const buttonRef = (index: number): GamepadInputRef => `b${index}` as GamepadInputRef;
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const clampRc = (value: number): number => Math.round(clamp(value, 1000, 2000));

export function getChannelInversionIndex(channel: ChannelKey): number {
    return INVERTIBLE_CHANNELS.indexOf(channel);
}

function getRoleLabel(role: ChannelRole): string {
    const labels: Record<ChannelRole, string> = {
        roll: 'Крен (Roll)',
        pitch: 'Тангаж (Pitch)',
        throttle: 'Газ (Throttle)',
        yaw: 'Рыскание (Yaw)',
        flightMode: 'Режим полета',
        arm: 'Arm',
        camera: 'Камера',
        magnet: 'Magnet',
        gear: 'Шасси',
        returnHome: 'Return Home',
        pitMode: 'Pit Mode',
        aux: 'AUX'
    };
    return labels[role];
}

function getDefaultChannelRoles(): ChannelRole[] {
    return [
        'roll',
        'pitch',
        'throttle',
        'yaw',
        'flightMode',
        'arm',
        'magnet',
        'camera',
        'gear',
        'returnHome',
        'pitMode',
        'aux'
    ];
}

function createDefaultChannelMappings(): ChannelMapping[] {
    return getDefaultChannelRoles().slice(0, RC_CHANNEL_COUNT).map((role, index) => ({
        channel: index + 1,
        role,
        label: `CH${index + 1} · ${getRoleLabel(role)}`,
        sourceId: null,
        controlType: role === 'throttle' ? 'throttle' : index < 4 ? 'stick' : 'button',
        invert: false
    }));
}

function createDefaultBindings(): ControlBinding[] {
    return BINDING_ACTIONS.map((action, index) => ({
        action,
        channel: index === 0 ? 6 : index === 1 ? 5 : index === 3 ? 7 : null,
        sourceId: null
    }));
}

function createDefaultWizardSteps(): WizardStepState[] {
    const ids: WizardStepId[] = ['device', 'sticks', 'switches', 'calibration', 'bindings', 'review'];
    const titles: Record<WizardStepId, string> = {
        device: 'Выбор устройства',
        sticks: 'Стики',
        switches: 'Тумблеры',
        calibration: 'Калибровка',
        bindings: 'Команды',
        review: 'Проверка'
    };
    return ids.map((id, index) => ({
        id,
        title: titles[id],
        status: index === 0 ? 'active' : 'pending',
        optional: id === 'switches' || id === 'bindings'
    }));
}

export function createDefaultCalibration() {
    return {
        min: -1,
        center: 0,
        max: 1,
        deadzone: 0.04,
        trim: 0,
        invert: false
    };
}

export function createDefaultProfile(overrides: Partial<DeviceProfile> = {}): DeviceProfile {
    const now = new Date().toISOString();
    const profile: DeviceProfile = {
        id: overrides.id ?? `rc-profile-${Date.now()}`,
        name: overrides.name ?? 'RC Profile',
        deviceId: overrides.deviceId ?? null,
        deviceKind: overrides.deviceKind ?? 'rc-transmitter',
        transport: overrides.transport ?? 'gamepad-api',
        detectedModel: overrides.detectedModel ?? 'Unknown RC Device',
        inputSources: overrides.inputSources?.map((source) => ({ ...source })) ?? [],
        channelMappings: overrides.channelMappings?.map((mapping) => ({ ...mapping })) ?? createDefaultChannelMappings(),
        calibration: Object.fromEntries(
            Object.entries(overrides.calibration ?? {}).map(([key, value]) => [key, { ...createDefaultCalibration(), ...value }])
        ),
        controlBindings: overrides.controlBindings?.map((binding) => ({ ...binding })) ?? createDefaultBindings(),
        wizardSteps: overrides.wizardSteps?.map((step) => ({ ...step })) ?? createDefaultWizardSteps(),
        notes: [...(overrides.notes ?? [])],
        stickMode: overrides.stickMode ?? 2,
        autoStickMode: overrides.autoStickMode ?? true,
        visibleChannelCount: overrides.visibleChannelCount ?? RC_VISIBLE_CHANNELS_DEFAULT,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now
    };

    for (const mapping of profile.channelMappings) {
        mapping.label = mapping.label || `CH${mapping.channel} · ${getRoleLabel(mapping.role)}`;
    }
    return profile;
}
