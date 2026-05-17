import { DEFAULT_WIZARD_MODAL_STATE, createDefaultCalibration } from '../../constants.js';
import { getDuplicateSourceConflicts } from '../../mapping.js';
import { setWizardModalState, wizardModalState } from '../../runtime-store.js';
import { updateRcInputRuntime } from '../../runtime-core.js';
import type { BindingAction, ChannelMapping, InputControlType, RcWizardAuxRole, StickMode } from '../../types.js';
import { mutateActiveProfile } from './shared.js';

export function openWizardModal(): void {
    setWizardModalState({
        ...DEFAULT_WIZARD_MODAL_STATE,
        isOpen: true,
        statusText: 'Выберите раскладку стиков перед началом пошаговой калибровки.'
    });
    updateRcInputRuntime();
}

export function closeWizardModal(): void {
    setWizardModalState({ ...DEFAULT_WIZARD_MODAL_STATE });
    updateRcInputRuntime();
}

export function setWizardModalMode(mode: StickMode): void {
    setWizardModalState({
        ...wizardModalState,
        isOpen: true,
        mode,
        stepId: 'throttle',
        captureSourceId: null,
        captureTicks: 0,
        errorText: null,
        statusText: 'Перемещайте стик газа по всей амплитуде. Мастер ищет наиболее активную ось.'
    });
    updateRcInputRuntime();
}

export function skipWizardModalAuxRole(): void {
    const currentIndex = ['flightMode', 'arm', 'magnet'].indexOf(wizardModalState.currentAuxRole);
    const nextRole = (['flightMode', 'arm', 'magnet'][currentIndex + 1] ?? null) as RcWizardAuxRole | null;
    setWizardModalState({
        ...wizardModalState,
        currentAuxRole: nextRole ?? 'magnet',
        stepId: nextRole ? 'aux' : 'review',
        captureSourceId: null,
        captureTicks: 0,
        errorText: null,
        statusText: nextRole
            ? 'Переключите следующий тумблер для продолжения.'
            : 'Проверьте найденные оси и примените конфигурацию.'
    });
    updateRcInputRuntime();
}

export function applyWizardModalConfig(): void {
    const modal = wizardModalState;
    if (!modal.mode || !modal.primaryAssignments.throttle || !modal.primaryAssignments.roll || !modal.primaryAssignments.pitch || !modal.primaryAssignments.yaw) {
        return;
    }
    const mode = modal.mode;

    mutateActiveProfile((profile) => {
        profile.stickMode = mode;
        profile.autoStickMode = false;

        for (const mapping of profile.channelMappings) {
            mapping.sourceId = null;
            if (mapping.channel <= 4) {
                mapping.controlType = mapping.role === 'throttle' ? 'throttle' : 'stick';
            }
        }

        for (const binding of profile.controlBindings) {
            binding.channel = null;
            binding.sourceId = null;
        }

        const assignRole = (role: ChannelMapping['role'], sourceId: string | undefined, controlType: InputControlType, channel: number) => {
            if (!sourceId) return;
            const mapping = profile.channelMappings.find((item) => item.channel === channel && item.role === role);
            if (!mapping) return;
            mapping.sourceId = sourceId;
            mapping.controlType = controlType;
            profile.calibration[sourceId] = profile.calibration[sourceId] ?? createDefaultCalibration();
        };

        assignRole('roll', modal.primaryAssignments.roll, 'stick', 1);
        assignRole('pitch', modal.primaryAssignments.pitch, 'stick', 2);
        assignRole('throttle', modal.primaryAssignments.throttle, 'throttle', 3);
        assignRole('yaw', modal.primaryAssignments.yaw, 'stick', 4);
        assignRole('flightMode', modal.auxAssignments.flightMode, 'switch-3pos', 5);
        assignRole('arm', modal.auxAssignments.arm, 'switch-2pos', 6);
        assignRole('magnet', modal.auxAssignments.magnet, 'button', 7);

        const setBindingToChannel = (action: BindingAction, channel: number | null) => {
            const binding = profile.controlBindings.find((item) => item.action === action);
            const mapping = channel ? profile.channelMappings.find((item) => item.channel === channel) : null;
            if (!binding) return;
            binding.channel = channel;
            binding.sourceId = mapping?.sourceId ?? null;
        };

        setBindingToChannel('Flight Mode', modal.auxAssignments.flightMode ? 5 : null);
        setBindingToChannel('Arm', modal.auxAssignments.arm ? 6 : null);
        setBindingToChannel('Magnet', modal.auxAssignments.magnet ? 7 : null);
    });

    setWizardModalState({ ...DEFAULT_WIZARD_MODAL_STATE });
    updateRcInputRuntime();
}

export function resolveDuplicateSourceConflicts(): void {
    mutateActiveProfile((profile) => {
        const duplicates = getDuplicateSourceConflicts(profile);
        for (const conflict of duplicates) {
            const [, ...channelsToClear] = conflict.channels;
            for (const channel of channelsToClear) {
                const mapping = profile.channelMappings.find((item) => item.channel === channel);
                if (!mapping) continue;
                mapping.sourceId = null;
            }
        }

        for (const binding of profile.controlBindings) {
            if (binding.channel === null) continue;
            const mapping = profile.channelMappings.find((item) => item.channel === binding.channel);
            binding.sourceId = mapping?.sourceId ?? null;
        }
    });
}
