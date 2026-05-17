import type {
    BindingAction,
    CalibrationData,
    ChannelMapping,
    ChannelRole,
    DeviceProfile,
    RcWizardModalState,
    StickMode,
    WizardSessionState,
    WizardStepState
} from './types.js';

export const RC_STORAGE_KEY = 'geoskan_sim_rc_profiles_v1';
export const RC_CHANNEL_COUNT = 16;
export const RC_VISIBLE_CHANNELS_DEFAULT = 8;
export const VIRTUAL_DEVICE_ID = 'virtual-tx15';
export const DEFAULT_PWM_CENTER = 1500;
export const DEFAULT_PWM_MIN = 1000;
export const DEFAULT_PWM_MAX = 2000;
export const INPUT_ACTIVITY_THRESHOLD = 0.18;

export const BINDING_ACTIONS: BindingAction[] = [
    'Arm',
    'Flight Mode',
    'Camera',
    'Magnet',
    'Gear',
    'Return Home',
    'Pit Mode'
];

export const PRIMARY_ROLE_LABELS: Record<ChannelRole, string> = {
    roll: 'Roll',
    pitch: 'Pitch',
    throttle: 'Throttle',
    yaw: 'Yaw',
    flightMode: 'Flight Mode',
    arm: 'Arm',
    camera: 'Camera',
    magnet: 'Magnet',
    gear: 'Gear',
    returnHome: 'Return Home',
    pitMode: 'Pit Mode',
    aux: 'AUX'
};

export const DEFAULT_WIZARD_STEPS: WizardStepState[] = [
    {
        id: 'device',
        title: '1. Device',
        description: 'Выберите активное устройство и профиль для передатчика, gamepad или виртуального пульта.',
        status: 'active',
        optional: false
    },
    {
        id: 'sticks',
        title: '2. Sticks',
        description: 'Назначьте оси Roll, Pitch, Throttle и Yaw или используйте автоопределение.',
        status: 'pending',
        optional: false
    },
    {
        id: 'switches',
        title: '3. Switches',
        description: 'Назначьте AUX, переключатели режимов, кнопки и 6-позиционный селектор.',
        status: 'pending',
        optional: true
    },
    {
        id: 'calibration',
        title: '4. Calibration',
        description: 'Снимите center, min/max, deadzone, trim и invert для основных каналов.',
        status: 'pending',
        optional: false
    },
    {
        id: 'bindings',
        title: '5. Bindings',
        description: 'Привяжите Arm, Flight Mode, Camera, Magnet, Gear, Return Home и Pit Mode.',
        status: 'pending',
        optional: true
    },
    {
        id: 'review',
        title: '6. Review',
        description: 'Проверьте конфликты, live monitor и сохраните профиль.',
        status: 'pending',
        optional: false
    }
];

export const DEFAULT_WIZARD_SESSION: WizardSessionState = {
    currentStepId: 'device',
    autoDetectChannel: null,
    awaitingStepInput: null,
    calibrationActive: false,
    calibrationSourceId: null,
    skippedSteps: []
};

export const DEFAULT_WIZARD_MODAL_STATE: RcWizardModalState = {
    isOpen: false,
    stepId: 'mode',
    mode: null,
    primaryAssignments: {},
    auxAssignments: {},
    currentAuxRole: 'flightMode',
    captureSourceId: null,
    captureTicks: 0,
    statusText: '',
    errorText: null
};

export function createDefaultCalibration(): CalibrationData {
    return {
        min: -1,
        max: 1,
        center: 0,
        deadzone: 0.04,
        trim: 0,
        invert: false
    };
}

function createDefaultMappings(): ChannelMapping[] {
    const defaults: Array<{ role: ChannelRole; label: string; controlType: ChannelMapping['controlType']; sourceId: string | null }> = [
        { role: 'roll', label: 'Roll', controlType: 'stick', sourceId: null },
        { role: 'pitch', label: 'Pitch', controlType: 'stick', sourceId: null },
        { role: 'throttle', label: 'Throttle', controlType: 'throttle', sourceId: null },
        { role: 'yaw', label: 'Yaw', controlType: 'stick', sourceId: null },
        { role: 'flightMode', label: 'Flight Mode', controlType: 'switch-3pos', sourceId: null },
        { role: 'arm', label: 'Arm', controlType: 'switch-2pos', sourceId: null },
        { role: 'magnet', label: 'Magnet', controlType: 'button', sourceId: null },
        { role: 'camera', label: 'Camera', controlType: 'switch-2pos', sourceId: null }
    ];

    return Array.from({ length: RC_CHANNEL_COUNT }, (_, index) => {
        const preset = defaults[index];
        return {
            channel: index + 1,
            role: preset?.role ?? 'aux',
            sourceId: preset?.sourceId ?? null,
            controlType: preset?.controlType ?? 'unknown',
            label: preset?.label ?? `AUX ${index - 7}`,
            invert: false,
            visible: index < RC_VISIBLE_CHANNELS_DEFAULT,
            discretePositions: preset?.controlType === 'switch-3pos' ? 3 : preset?.controlType === 'switch-2pos' ? 2 : preset?.controlType === 'selector-6pos' ? 6 : undefined
        };
    });
}

export function createDefaultProfile(overrides: Partial<DeviceProfile> = {}): DeviceProfile {
    const now = new Date().toISOString();
    return {
        id: overrides.id ?? `profile-${Date.now()}`,
        name: overrides.name ?? 'Radiomaster Profile',
        deviceId: overrides.deviceId ?? '',
        deviceKind: overrides.deviceKind ?? 'rc-transmitter',
        transport: overrides.transport ?? 'gamepad-api',
        detectedModel: overrides.detectedModel ?? 'Radiomaster USB HID',
        channelCount: overrides.channelCount ?? RC_CHANNEL_COUNT,
        visibleChannelCount: overrides.visibleChannelCount ?? RC_VISIBLE_CHANNELS_DEFAULT,
        stickMode: overrides.stickMode ?? 2,
        autoStickMode: overrides.autoStickMode ?? false,
        inputSources: overrides.inputSources ?? [],
        channelMappings: overrides.channelMappings ?? createDefaultMappings(),
        calibration: overrides.calibration ?? {},
        controlBindings: overrides.controlBindings ?? BINDING_ACTIONS.map((action) => ({
            action,
            channel: null,
            sourceId: null,
            label: action
        })),
        wizardSteps: overrides.wizardSteps ?? DEFAULT_WIZARD_STEPS.map((step) => ({ ...step })),
        notes: overrides.notes ?? [],
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now
    };
}

export function getStickModeLabel(mode: StickMode): string {
    return `Mode ${mode}`;
}
