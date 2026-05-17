export type RcDeviceKind = 'rc-transmitter' | 'gamepad' | 'virtual';
export type RcTransport = 'gamepad-api' | 'virtual';
export type StickMode = 1 | 2 | 3 | 4;
export type WorkspaceView = 'wizard' | 'advanced' | 'monitor';
export type WizardStepId = 'device' | 'sticks' | 'switches' | 'calibration' | 'bindings' | 'review';
export type WizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped';
export type InputSignalType = 'axis' | 'button';
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
export type BindingAction =
    | 'Arm'
    | 'Flight Mode'
    | 'Camera'
    | 'Magnet'
    | 'Gear'
    | 'Return Home'
    | 'Pit Mode';
export type RcWizardModalStepId = 'mode' | 'throttle' | 'roll' | 'pitch' | 'yaw' | 'aux' | 'review';
export type RcWizardPrimaryRole = 'throttle' | 'roll' | 'pitch' | 'yaw';
export type RcWizardAuxRole = 'flightMode' | 'arm' | 'magnet';

export interface InputSource {
    id: string;
    deviceId: string;
    deviceKind: RcDeviceKind;
    transport: RcTransport;
    signalType: InputSignalType;
    controlType: InputControlType;
    index: number;
    label: string;
    group: string;
}

export interface CalibrationData {
    min: number;
    max: number;
    center: number;
    deadzone: number;
    trim: number;
    invert: boolean;
}

export interface ChannelMapping {
    channel: number;
    role: ChannelRole;
    sourceId: string | null;
    controlType: InputControlType;
    label: string;
    invert: boolean;
    visible: boolean;
    discretePositions?: number;
}

export interface ControlBinding {
    action: BindingAction;
    channel: number | null;
    sourceId: string | null;
    label: string;
}

export interface WizardStepState {
    id: WizardStepId;
    title: string;
    description: string;
    status: WizardStepStatus;
    optional: boolean;
}

export interface DeviceProfile {
    id: string;
    name: string;
    deviceId: string;
    deviceKind: RcDeviceKind;
    transport: RcTransport;
    detectedModel: string;
    channelCount: number;
    visibleChannelCount: number;
    stickMode: StickMode;
    autoStickMode: boolean;
    inputSources: InputSource[];
    channelMappings: ChannelMapping[];
    calibration: Record<string, CalibrationData>;
    controlBindings: ControlBinding[];
    wizardSteps: WizardStepState[];
    notes: string[];
    createdAt: string;
    updatedAt: string;
}

export interface DeviceSummary {
    id: string;
    name: string;
    kind: RcDeviceKind;
    transport: RcTransport;
    connected: boolean;
    axes: number;
    buttons: number;
    likelyRadio: boolean;
    warnings: string[];
}

export interface InputSample {
    source: InputSource;
    rawValue: number;
    normalizedValue: number;
    pwmValue: number;
    active: boolean;
    discreteLevel: number | null;
}

export interface WizardSessionState {
    currentStepId: WizardStepId;
    autoDetectChannel: number | null;
    awaitingStepInput: WizardStepId | null;
    calibrationActive: boolean;
    calibrationSourceId: string | null;
    skippedSteps: WizardStepId[];
}

export interface RcWizardModalState {
    isOpen: boolean;
    stepId: RcWizardModalStepId;
    mode: StickMode | null;
    primaryAssignments: Partial<Record<RcWizardPrimaryRole, string>>;
    auxAssignments: Partial<Record<RcWizardAuxRole, string>>;
    currentAuxRole: RcWizardAuxRole;
    captureSourceId: string | null;
    captureTicks: number;
    statusText: string;
    errorText: string | null;
}

export interface RcSetupPersistedState {
    profiles: DeviceProfile[];
    activeProfileId: string | null;
    preferredDeviceId: string | null;
    expandedChannels: boolean;
    workspaceView: WorkspaceView;
    wizard: WizardSessionState;
}

export interface RcRuntimeSnapshot {
    devices: DeviceSummary[];
    profiles: Array<{ id: string; name: string }>;
    activeProfile: DeviceProfile;
    activeDeviceId: string | null;
    preferredDeviceId: string | null;
    expandedChannels: boolean;
    workspaceView: WorkspaceView;
    wizard: WizardSessionState;
    rawInputs: Record<string, number>;
    samples: Record<string, InputSample>;
    channelValues: number[];
    warnings: string[];
    conflicts: string[];
    connectionStatus: string;
    wizardModal: RcWizardModalState;
}
