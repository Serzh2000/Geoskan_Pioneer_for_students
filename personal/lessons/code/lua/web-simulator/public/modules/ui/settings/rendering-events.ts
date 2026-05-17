import {
    applyWizardModalConfig,
    autoAssignPrimaryChannels,
    closeWizardModal,
    createProfileFromCurrentDevice,
    deleteActiveProfile,
    duplicateActiveProfile,
    getRcRuntimeSnapshot,
    openWizardModal,
    renameActiveProfile,
    resetCalibration,
    resetWizardSession,
    resolveDuplicateSourceConflicts,
    setActiveProfile,
    setBinding,
    setCalibrationField,
    setChannelControlType,
    setChannelInvert,
    setChannelRole,
    setChannelSource,
    setExpandedChannels,
    setPreferredDevice,
    setStickMode,
    setWizardModalMode,
    setWorkspaceView,
    setVirtualAxis,
    setVirtualButton,
    setWizardStep,
    skipWizardModalAuxRole,
    skipWizardStep,
    startAutoDetect,
    startCalibration,
    stopCalibration
} from './runtime.js';
import type { BindingAction, ChannelRole, InputControlType, WizardStepId } from './types.js';

export function bindRcSetupPanelEvents(root: HTMLElement): void {
    root.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const actionEl = target?.closest<HTMLElement>('[data-action]');
        if (actionEl) {
            const action = actionEl.dataset.action;
            if (action === 'create-profile') createProfileFromCurrentDevice();
            if (action === 'duplicate-profile') duplicateActiveProfile();
            if (action === 'delete-profile') deleteActiveProfile();
            if (action === 'reset-wizard') resetWizardSession();
            if (action === 'open-wizard-modal') openWizardModal();
            if (action === 'wizard-modal-close') closeWizardModal();
            if (action === 'wizard-modal-apply') applyWizardModalConfig();
            if (action === 'wizard-modal-skip-aux') skipWizardModalAuxRole();
            if (action === 'wizard-modal-mode' && actionEl.dataset.mode) setWizardModalMode(Number(actionEl.dataset.mode) as 1 | 2);
            if (action === 'auto-assign') autoAssignPrimaryChannels();
            if (action === 'resolve-conflicts-auto') resolveDuplicateSourceConflicts();
            if (action === 'start-calibration') startCalibration();
            if (action === 'stop-calibration') stopCalibration();
            if (action === 'reset-calibration') resetCalibration();
            if (action === 'toggle-channels') setExpandedChannels(!getRcRuntimeSnapshot().expandedChannels);
            if (action === 'workspace-view' && actionEl.dataset.view) {
                const nextView = actionEl.dataset.view;
                setWorkspaceView(nextView === 'advanced' || nextView === 'monitor' ? nextView : 'wizard');
            }
            if (action === 'wizard-step' && actionEl.dataset.stepId) setWizardStep(actionEl.dataset.stepId as WizardStepId);
            if (action === 'wizard-skip' && actionEl.dataset.stepId) skipWizardStep(actionEl.dataset.stepId as WizardStepId);
            if (action === 'goto-conflict-channel' && actionEl.dataset.channel) {
                const channel = Number(actionEl.dataset.channel);
                setWorkspaceView('wizard');
                setWizardStep(channel <= 4 ? 'sticks' : channel <= 8 ? 'switches' : 'bindings');
            }
            if (action === 'complete-setup') {
                const closePanel = (window as unknown as { closePanel?: () => void }).closePanel;
                closePanel?.();
            }
            if (action === 'channel-autodetect' && actionEl.dataset.channel) startAutoDetect(Number(actionEl.dataset.channel));
            if (action === 'stick-mode-toggle' && actionEl.dataset.mode) setStickMode(Number(actionEl.dataset.mode));
            return;
        }

        const buttonEl = target?.closest<HTMLElement>('[data-virtual-button]');
        if (buttonEl) {
            const index = Number(buttonEl.dataset.virtualButton);
            const isPressed = buttonEl.getAttribute('aria-pressed') !== 'true';
            setVirtualButton(index, isPressed);
        }
    });

    root.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement | null;
        if (!target) return;

        if (target.id === 'rc-device-select') {
            setPreferredDevice(target.value);
            return;
        }
        if (target.id === 'rc-profile-select') {
            setActiveProfile(target.value);
            return;
        }
        if (target.id === 'rc-stick-mode') {
            setStickMode(target.value === 'auto' ? 'auto' : Number(target.value));
            return;
        }
        if (target.id === 'rc-profile-name') {
            renameActiveProfile(target.value);
            return;
        }
        if (target.dataset.channelSource) {
            setChannelSource(Number(target.dataset.channelSource), target.value || null);
            return;
        }
        if (target.dataset.channelType) {
            setChannelControlType(Number(target.dataset.channelType), target.value as InputControlType);
            return;
        }
        if (target.dataset.channelRole) {
            setChannelRole(Number(target.dataset.channelRole), target.value as ChannelRole);
            return;
        }
        if (target.dataset.channelInvert) {
            setChannelInvert(Number(target.dataset.channelInvert), (target as HTMLInputElement).checked);
            return;
        }
        if (target.dataset.bindingAction) {
            setBinding(target.dataset.bindingAction as BindingAction, target.value ? Number(target.value) : null);
            return;
        }
        if (target.dataset.virtualAxis) {
            setVirtualAxis(Number(target.dataset.virtualAxis), Number(target.value));
        }
    });

    root.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement | null;
        if (!target) return;
        if (target.dataset.calibration && target.dataset.field) {
            setCalibrationField(target.dataset.calibration, target.dataset.field as 'deadzone' | 'trim', Number(target.value));
            return;
        }
        if (target.dataset.virtualAxis) {
            setVirtualAxis(Number(target.dataset.virtualAxis), Number(target.value));
        }
    });
}
