import type { GamepadInputRef } from '../../core/state.js';

export type PrimaryChannelKey = 'roll' | 'pitch' | 'throttle' | 'yaw';
export type AuxiliaryChannelKey = 'mode' | 'arm' | 'magnet';
export type ActionAuxChannelKey = 'arm' | 'magnet';
export type ChannelKey = PrimaryChannelKey | AuxiliaryChannelKey;
export type StickMode = 1 | 2 | 3 | 4;

export type ObservedInputPosition = {
    centerRc: number;
    minRc: number;
    maxRc: number;
    samples: number;
};

export type ObservedInputStats = {
    minRc: number;
    maxRc: number;
    lastRc: number;
    samples: number;
    positions: ObservedInputPosition[];
};

export type ChannelRole =
    | 'roll'
    | 'pitch'
    | 'throttle'
    | 'yaw'
    | 'flightMode'
    | 'arm'
    | 'camera'
    | 'magnet'
    | 'gear'
    | 'returnHome'
    | 'pitMode'
    | 'aux';

export type InputControlType =
    | 'stick'
    | 'throttle'
    | 'switch-2pos'
    | 'switch-3pos'
    | 'momentary'
    | 'knob'
    | 'selector-6pos'
    | 'button'
    | 'unknown';

export type InputSignalType = 'axis' | 'button';
export type BindingAction = 'Arm' | 'Flight Mode' | 'Camera' | 'Magnet' | 'Gear' | 'Return Home' | 'Pit Mode';
export type WizardStepId = 'device' | 'sticks' | 'switches' | 'calibration' | 'bindings' | 'review';
export type WorkspaceView = 'wizard' | 'monitor' | 'advanced';
export type DeviceKind = 'rc-transmitter' | 'gamepad' | 'virtual';
export type DeviceTransport = 'gamepad-api' | 'virtual';
export type RcWizardAuxRole = 'flightMode' | 'arm' | 'magnet';
export type RcWizardPrimaryRole = 'throttle' | 'yaw' | 'pitch' | 'roll';
export type RcWizardModalStepId = 'mode' | 'throttle' | 'yaw' | 'pitch' | 'roll' | 'aux' | 'review';

export type CalibrationData = {
    min: number;
    center: number;
    max: number;
    deadzone: number;
    trim: number;
    invert: boolean;
};

export type InputSource = {
    id: string;
    label: string;
    group: string;
    signalType: InputSignalType;
    controlType: InputControlType;
    channelHint?: number | null;
    ref?: GamepadInputRef | null;
};

export type ChannelMapping = {
    channel: number;
    role: ChannelRole;
    label: string;
    sourceId: string | null;
    controlType: InputControlType;
    invert: boolean;
    discretePositions?: number;
};

export type ControlBinding = {
    action: BindingAction;
    channel: number | null;
    sourceId: string | null;
};

export type WizardStepStateStatus = 'pending' | 'active' | 'completed' | 'skipped';

export type WizardStepState = {
    id: WizardStepId;
    title: string;
    status: WizardStepStateStatus;
    optional?: boolean;
};

export type DeviceSummary = {
    id: string;
    name: string;
    kind: DeviceKind;
    transport: DeviceTransport;
    connected: boolean;
    axes: number;
    buttons: number;
    likelyRadio: boolean;
    warnings: string[];
};

export type DeviceProfile = {
    id: string;
    name: string;
    deviceId: string | null;
    deviceKind: DeviceKind;
    transport: DeviceTransport;
    detectedModel: string;
    inputSources: InputSource[];
    channelMappings: ChannelMapping[];
    calibration: Record<string, CalibrationData>;
    controlBindings: ControlBinding[];
    wizardSteps: WizardStepState[];
    notes: string[];
    stickMode: StickMode;
    autoStickMode: boolean;
    visibleChannelCount: number;
    createdAt: string;
    updatedAt: string;
};

export type InputSample = {
    source: InputSource;
    rawValue: number;
    normalizedValue: number;
    pwmValue: number;
    active: boolean;
    discreteLevel?: number;
};

export type RcWizardState = {
    currentStepId: WizardStepId;
    skippedSteps: WizardStepId[];
    autoDetectChannel: number | null;
    calibrationActive: boolean;
};

export type RcWizardModalState = {
    isOpen: boolean;
    mode: StickMode | null;
    stepId: RcWizardModalStepId;
    currentAuxRole: RcWizardAuxRole;
    primaryAssignments: Record<RcWizardPrimaryRole, string | null>;
    auxAssignments: Record<RcWizardAuxRole, string | null>;
    captureSourceId: string | null;
    captureTicks: number;
    statusText: string;
    errorText: string | null;
};

export type RcRuntimeSnapshot = {
    devices: DeviceSummary[];
    profiles: Array<{ id: string; name: string }>;
    activeProfile: DeviceProfile;
    activeDeviceId: string | null;
    preferredDeviceId: string | null;
    expandedChannels: boolean;
    workspaceView: WorkspaceView;
    wizard: RcWizardState;
    rawInputs: Record<string, number>;
    samples: Record<string, InputSample>;
    channelValues: number[];
    warnings: string[];
    conflicts: string[];
    connectionStatus: string;
    wizardModal: RcWizardModalState;
};

export type RcSetupPersistedState = {
    profiles: DeviceProfile[];
    activeProfileId: string | null;
    preferredDeviceId: string | null;
    expandedChannels: boolean;
    workspaceView: WorkspaceView;
    wizard: RcWizardState;
};
