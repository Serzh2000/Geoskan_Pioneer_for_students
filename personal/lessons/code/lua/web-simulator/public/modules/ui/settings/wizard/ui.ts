import type { GamepadInputRef } from '../../../core/state.js';
import { getPrimaryChannelStickSlot } from '../input/values.js';
import { CHANNEL_LABELS, STEPS } from './config.js';
import { getBestAuxCandidate } from './detection.js';
import { buildSummaryHtml, formatRefLabel } from './summary.js';
import type { ChannelKey, ObservedInputStats, PrimaryChannelKey } from '../types.js';
import type {
    AuxDetectionResult,
    WizardAuxChannelKey,
    WizardChannelState,
    WizardStep
} from './types.js';

type WizardDomRefs = {
    instruction: HTMLElement | null;
    status: HTMLElement | null;
    nextBtn: HTMLButtonElement | null;
    prevBtn: HTMLButtonElement | null;
    stepContainer: HTMLElement | null;
    summaryContainer: HTMLElement | null;
    summaryContent: HTMLElement | null;
    axisLabel: HTMLElement | null;
    axisHint: HTMLElement | null;
    primaryControls: HTMLElement | null;
    invertCheckbox: HTMLInputElement | null;
    leftStickCard: HTMLElement | null;
    rightStickCard: HTMLElement | null;
    leftStickShell: HTMLElement | null;
    rightStickShell: HTMLElement | null;
    leftStickLegend: HTMLElement | null;
    rightStickLegend: HTMLElement | null;
    leftStickStatus: HTMLElement | null;
    rightStickStatus: HTMLElement | null;
};

let wizardDomRefs: WizardDomRefs | null = null;

type WizardRenderParams = {
    currentStepIdx: number;
    showingSummary: boolean;
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    stepObservedStats: Map<GamepadInputRef, ObservedInputStats>;
    stepSwitchTransitions: Map<GamepadInputRef, number>;
    getCurrentStep: () => WizardStep;
    getDetectedRef: (channel: ChannelKey) => GamepadInputRef | null;
    getCurrentChannelState: () => WizardChannelState | null;
    getChannelInversion: (channel: ChannelKey) => boolean;
    getFirstConnectedGamepad: () => Gamepad | null;
    getResolvedPrimaryRef: (channel: PrimaryChannelKey) => GamepadInputRef | null;
    isCurrentStepResolved: () => boolean;
};

function getWizardDomRefs(): WizardDomRefs {
    if (wizardDomRefs?.instruction?.isConnected) {
        return wizardDomRefs;
    }

    wizardDomRefs = {
        instruction: document.getElementById('gp-wizard-instruction'),
        status: document.getElementById('gp-wizard-status'),
        nextBtn: document.getElementById('gp-wizard-next') as HTMLButtonElement | null,
        prevBtn: document.getElementById('gp-wizard-prev') as HTMLButtonElement | null,
        stepContainer: document.getElementById('gp-wizard-step-container'),
        summaryContainer: document.getElementById('gp-wizard-summary'),
        summaryContent: document.getElementById('gp-wizard-summary-content'),
        axisLabel: document.getElementById('gp-wizard-axis-label'),
        axisHint: document.getElementById('gp-wizard-axis-hint'),
        primaryControls: document.getElementById('gp-wizard-primary-controls'),
        invertCheckbox: document.getElementById('gp-wizard-invert') as HTMLInputElement | null,
        leftStickCard: document.getElementById('gp-wizard-stick-card-left'),
        rightStickCard: document.getElementById('gp-wizard-stick-card-right'),
        leftStickShell: document.getElementById('gp-wizard-stick-shell-left'),
        rightStickShell: document.getElementById('gp-wizard-stick-shell-right'),
        leftStickLegend: document.getElementById('gp-wizard-stick-legend-left'),
        rightStickLegend: document.getElementById('gp-wizard-stick-legend-right'),
        leftStickStatus: document.getElementById('gp-wizard-stick-status-left'),
        rightStickStatus: document.getElementById('gp-wizard-stick-status-right')
    };

    return wizardDomRefs;
}

function setTextIfChanged(element: HTMLElement | null, value: string): void {
    if (element && element.textContent !== value) {
        element.textContent = value;
    }
}

function setHtmlIfChanged(element: HTMLElement | null, value: string): void {
    if (element && element.innerHTML !== value) {
        element.innerHTML = value;
    }
}

function setDisplayIfChanged(element: HTMLElement | null, value: string): void {
    if (element && element.style.display !== value) {
        element.style.display = value;
    }
}

function setDisabledIfChanged(element: HTMLButtonElement | null, disabled: boolean): void {
    if (element && element.disabled !== disabled) {
        element.disabled = disabled;
    }
}

function setHiddenIfChanged(element: HTMLElement | null, hidden: boolean): void {
    if (element && element.hidden !== hidden) {
        element.hidden = hidden;
    }
}

function setCheckedIfChanged(element: HTMLInputElement | null, checked: boolean): void {
    if (element && element.checked !== checked) {
        element.checked = checked;
    }
}

function setClassPresence(element: HTMLElement | null, className: string, enabled: boolean): void {
    if (!element) return;
    const hasClass = element.classList.contains(className);
    if (hasClass !== enabled) {
        element.classList.toggle(className, enabled);
    }
}

function setDatasetIfChanged(element: HTMLElement | null, key: 'activeAxis', value: string): void {
    if (element && element.dataset[key] !== value) {
        element.dataset[key] = value;
    }
}

export function renderWizardState(params: WizardRenderParams): void {
    const {
        currentStepIdx,
        showingSummary,
        detectedMapping,
        auxResults,
        stepObservedStats,
        stepSwitchTransitions,
        getCurrentStep,
        getDetectedRef,
        getCurrentChannelState,
        getChannelInversion,
        getFirstConnectedGamepad,
        getResolvedPrimaryRef,
        isCurrentStepResolved
    } = params;

    const {
        instruction,
        status,
        nextBtn,
        prevBtn,
        stepContainer,
        summaryContainer,
        summaryContent,
        axisLabel,
        axisHint,
        primaryControls,
        invertCheckbox,
        leftStickCard,
        rightStickCard,
        leftStickShell,
        rightStickShell,
        leftStickLegend,
        rightStickLegend,
        leftStickStatus,
        rightStickStatus
    } = getWizardDomRefs();

    if (
        !instruction || !status || !nextBtn || !prevBtn || !stepContainer || !summaryContainer || !summaryContent
        || !axisLabel || !axisHint || !primaryControls || !invertCheckbox || !leftStickCard || !rightStickCard
        || !leftStickShell || !rightStickShell || !leftStickLegend || !rightStickLegend || !leftStickStatus || !rightStickStatus
    ) return;

    setTextIfChanged(leftStickLegend, getStickLegend('left', getResolvedPrimaryRef));
    setTextIfChanged(rightStickLegend, getStickLegend('right', getResolvedPrimaryRef));
    setTextIfChanged(leftStickStatus, getStickStatus('left', getCurrentStep, getResolvedPrimaryRef));
    setTextIfChanged(rightStickStatus, getStickStatus('right', getCurrentStep, getResolvedPrimaryRef));

    if (showingSummary) {
        setDisplayIfChanged(stepContainer, 'none');
        setDisplayIfChanged(summaryContainer, 'block');
        setHtmlIfChanged(summaryContent, buildSummaryHtml({
            detectedMapping,
            auxResults,
            getChannelInversion
        }));
        setTextIfChanged(instruction, 'Сводка по найденным каналам');
        setTextIfChanged(status, 'Проверьте найденные каналы и нажмите "Применить".');
        setDisabledIfChanged(prevBtn, false);
        setDisabledIfChanged(nextBtn, false);
        setTextIfChanged(nextBtn, 'Применить');
        setTextIfChanged(axisLabel, 'Проверка каналов');
        setTextIfChanged(axisHint, 'Итоговые инверсии и сопоставления будут сохранены и сразу применены к управлению.');
        setHiddenIfChanged(primaryControls, true);
        setClassPresence(leftStickCard, 'is-active', false);
        setClassPresence(rightStickCard, 'is-active', false);
        setDatasetIfChanged(leftStickShell, 'activeAxis', 'none');
        setDatasetIfChanged(rightStickShell, 'activeAxis', 'none');
        return;
    }

    setDisplayIfChanged(stepContainer, 'block');
    setDisplayIfChanged(summaryContainer, 'none');

    const step = getCurrentStep();
    const channelState = getCurrentChannelState();
    setTextIfChanged(instruction, step.instruction);
    setTextIfChanged(status, getStepStatusText({
        step,
        getDetectedRef,
        getFirstConnectedGamepad,
        detectedMapping,
        stepObservedStats,
        stepSwitchTransitions,
        auxResults
    }));
    setDisabledIfChanged(prevBtn, currentStepIdx === 0);
    setDisabledIfChanged(nextBtn, !isCurrentStepResolved());
    setTextIfChanged(nextBtn, currentStepIdx === STEPS.length - 1 ? 'Показать сводку' : 'Далее');
    setTextIfChanged(axisLabel, CHANNEL_LABELS[step.channel]);
    setTextIfChanged(axisHint, step.type === 'primary'
        ? `Если ${CHANNEL_LABELS[step.channel].toLowerCase()} на модели и на стиках движется наоборот, включите инверсию канала.`
        : `Если положения канала ${CHANNEL_LABELS[step.channel].toLowerCase()} идут в обратном порядке, включите инверсию до перехода дальше.`);
    setHiddenIfChanged(primaryControls, false);
    setCheckedIfChanged(invertCheckbox, channelState?.inverted ?? false);
    const targetStick = getCurrentStepTargetStick(getCurrentStep, getResolvedPrimaryRef);
    const targetAxis = getCurrentStepTargetAxis(getCurrentStep, getResolvedPrimaryRef);
    setClassPresence(leftStickCard, 'is-active', targetStick === 'L' || targetStick === 'both');
    setClassPresence(rightStickCard, 'is-active', targetStick === 'R' || targetStick === 'both');
    setDatasetIfChanged(leftStickShell, 'activeAxis', targetStick === 'L' ? targetAxis : 'none');
    setDatasetIfChanged(rightStickShell, 'activeAxis', targetStick === 'R' ? targetAxis : 'none');
}

function getCurrentStepTargetStick(
    getCurrentStep: () => WizardStep,
    getResolvedPrimaryRef: (channel: PrimaryChannelKey) => GamepadInputRef | null
): 'L' | 'R' | 'both' {
    const step = getCurrentStep();
    if (step.type !== 'primary') return 'both';
    const slot = getPrimaryChannelStickSlot(step.channel as PrimaryChannelKey, getResolvedPrimaryRef(step.channel as PrimaryChannelKey));
    if (slot.startsWith('left')) return 'L';
    if (slot.startsWith('right')) return 'R';
    return 'both';
}

function getCurrentStepTargetAxis(
    getCurrentStep: () => WizardStep,
    getResolvedPrimaryRef: (channel: PrimaryChannelKey) => GamepadInputRef | null
): 'x' | 'y' | 'none' {
    const step = getCurrentStep();
    if (step.type !== 'primary') return 'none';
    const slot = getPrimaryChannelStickSlot(step.channel as PrimaryChannelKey, getResolvedPrimaryRef(step.channel as PrimaryChannelKey));
    if (slot.endsWith('-x')) return 'x';
    if (slot.endsWith('-y')) return 'y';
    return 'none';
}

function getStickLegend(
    side: 'left' | 'right',
    getResolvedPrimaryRef: (channel: PrimaryChannelKey) => GamepadInputRef | null
): string {
    const verticalSlot = side === 'left' ? 'left-y' : 'right-y';
    const horizontalSlot = side === 'left' ? 'left-x' : 'right-x';
    const verticalChannel = (['throttle', 'pitch'] as PrimaryChannelKey[]).find((channel) => getPrimaryChannelStickSlot(channel, getResolvedPrimaryRef(channel)) === verticalSlot);
    const horizontalChannel = (['yaw', 'roll'] as PrimaryChannelKey[]).find((channel) => getPrimaryChannelStickSlot(channel, getResolvedPrimaryRef(channel)) === horizontalSlot);
    const verticalLabel = verticalChannel ? CHANNEL_LABELS[verticalChannel] : 'Вертикаль';
    const horizontalLabel = horizontalChannel ? CHANNEL_LABELS[horizontalChannel] : 'Горизонталь';
    return `${verticalLabel} / ${horizontalLabel}`;
}

function getStickStatus(
    side: 'left' | 'right',
    getCurrentStep: () => WizardStep,
    getResolvedPrimaryRef: (channel: PrimaryChannelKey) => GamepadInputRef | null
): string {
    const step = getCurrentStep();
    if (step.type !== 'primary') {
        return 'Виртуальные стики показывают только основные каналы';
    }

    const targetStick = getCurrentStepTargetStick(getCurrentStep, getResolvedPrimaryRef);
    if ((side === 'left' && targetStick !== 'L') || (side === 'right' && targetStick !== 'R')) {
        return 'Ожидание движения на другом стике';
    }

    return `Активный канал: ${CHANNEL_LABELS[step.channel]}`;
}

function getStepStatusText(params: {
    step: WizardStep;
    getDetectedRef: (channel: ChannelKey) => GamepadInputRef | null;
    getFirstConnectedGamepad: () => Gamepad | null;
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    stepObservedStats: Map<GamepadInputRef, ObservedInputStats>;
    stepSwitchTransitions: Map<GamepadInputRef, number>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
}): string {
    const {
        step,
        getDetectedRef,
        getFirstConnectedGamepad,
        detectedMapping,
        stepObservedStats,
        stepSwitchTransitions,
        auxResults
    } = params;

    const ref = getDetectedRef(step.channel);
    if (!ref) {
        if (step.type === 'aux') {
            const requiredPositions = step.minPositions ?? 2;
            const candidate = getBestAuxCandidate({
                gp: getFirstConnectedGamepad(),
                step,
                requireResolved: false,
                detectedMapping,
                stepObservedStats,
                stepSwitchTransitions
            });
            if (!candidate) {
                return `Ожидание переключений... Нужно зафиксировать минимум ${requiredPositions} положения.`;
            }
            const positionsText = candidate.positions.length > 0
                ? candidate.positions.map((position) => position.centerRc).join(' / ')
                : 'нет данных';
            if (step.preferThreePositions && !candidate.hasMiddlePosition) {
                return `Ожидание переключений... Пока видны только крайние положения ${positionsText}. Нужно среднее положение около 1500.`;
            }
            return `Ожидание переключений... Зафиксировано положений ${candidate.positions.length}/${requiredPositions}, переключений ${candidate.transitions}/${candidate.requiredTransitions}. Кандидат: ${formatRefLabel(candidate.ref)}. Положения: ${positionsText}.`;
        }
        return 'Ожидание движения...';
    }

    if (step.type === 'primary') {
        return `Обнаружено: ${formatRefLabel(ref)}. Можно переходить дальше.`;
    }

    const auxResult = auxResults[step.channel as WizardAuxChannelKey];
    const positionsText = auxResult?.positions.map((position) => position.centerRc).join(' / ') ?? 'нет данных';
    return `Обнаружено: ${formatRefLabel(ref)}. Положения: ${positionsText}.`;
}
