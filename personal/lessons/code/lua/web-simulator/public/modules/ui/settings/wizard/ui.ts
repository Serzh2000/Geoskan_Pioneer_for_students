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

    const instruction = document.getElementById('gp-wizard-instruction');
    const status = document.getElementById('gp-wizard-status');
    const nextBtn = document.getElementById('gp-wizard-next') as HTMLButtonElement | null;
    const prevBtn = document.getElementById('gp-wizard-prev') as HTMLButtonElement | null;
    const stepContainer = document.getElementById('gp-wizard-step-container');
    const summaryContainer = document.getElementById('gp-wizard-summary');
    const summaryContent = document.getElementById('gp-wizard-summary-content');
    const axisLabel = document.getElementById('gp-wizard-axis-label');
    const axisHint = document.getElementById('gp-wizard-axis-hint');
    const primaryControls = document.getElementById('gp-wizard-primary-controls');
    const invertCheckbox = document.getElementById('gp-wizard-invert') as HTMLInputElement | null;
    const leftStickCard = document.getElementById('gp-wizard-stick-card-left');
    const rightStickCard = document.getElementById('gp-wizard-stick-card-right');
    const leftStickShell = document.getElementById('gp-wizard-stick-shell-left');
    const rightStickShell = document.getElementById('gp-wizard-stick-shell-right');
    const leftStickLegend = document.getElementById('gp-wizard-stick-legend-left');
    const rightStickLegend = document.getElementById('gp-wizard-stick-legend-right');
    const leftStickStatus = document.getElementById('gp-wizard-stick-status-left');
    const rightStickStatus = document.getElementById('gp-wizard-stick-status-right');

    if (
        !instruction || !status || !nextBtn || !prevBtn || !stepContainer || !summaryContainer || !summaryContent
        || !axisLabel || !axisHint || !primaryControls || !invertCheckbox || !leftStickCard || !rightStickCard
        || !leftStickShell || !rightStickShell || !leftStickLegend || !rightStickLegend || !leftStickStatus || !rightStickStatus
    ) return;

    leftStickLegend.textContent = getStickLegend('left', getResolvedPrimaryRef);
    rightStickLegend.textContent = getStickLegend('right', getResolvedPrimaryRef);
    leftStickStatus.textContent = getStickStatus('left', getCurrentStep, getResolvedPrimaryRef);
    rightStickStatus.textContent = getStickStatus('right', getCurrentStep, getResolvedPrimaryRef);

    if (showingSummary) {
        stepContainer.style.display = 'none';
        summaryContainer.style.display = 'block';
        summaryContent.innerHTML = buildSummaryHtml({
            detectedMapping,
            auxResults,
            getChannelInversion
        });
        instruction.textContent = 'Сводка по найденным каналам';
        status.textContent = 'Проверьте найденные каналы и нажмите "Применить".';
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        nextBtn.textContent = 'Применить';
        axisLabel.textContent = 'Проверка каналов';
        axisHint.textContent = 'Итоговые инверсии и сопоставления будут сохранены и сразу применены к управлению.';
        primaryControls.hidden = true;
        leftStickCard.classList.remove('is-active');
        rightStickCard.classList.remove('is-active');
        leftStickShell.dataset.activeAxis = 'none';
        rightStickShell.dataset.activeAxis = 'none';
        return;
    }

    stepContainer.style.display = 'block';
    summaryContainer.style.display = 'none';

    const step = getCurrentStep();
    const channelState = getCurrentChannelState();
    instruction.textContent = step.instruction;
    status.textContent = getStepStatusText({
        step,
        getDetectedRef,
        getFirstConnectedGamepad,
        detectedMapping,
        stepObservedStats,
        stepSwitchTransitions,
        auxResults
    });
    prevBtn.disabled = currentStepIdx === 0;
    nextBtn.disabled = !isCurrentStepResolved();
    nextBtn.textContent = currentStepIdx === STEPS.length - 1 ? 'Показать сводку' : 'Далее';
    axisLabel.textContent = CHANNEL_LABELS[step.channel];
    axisHint.textContent = step.type === 'primary'
        ? `Если ${CHANNEL_LABELS[step.channel].toLowerCase()} на модели и на стиках движется наоборот, включите инверсию канала.`
        : `Если положения канала ${CHANNEL_LABELS[step.channel].toLowerCase()} идут в обратном порядке, включите инверсию до перехода дальше.`;
    primaryControls.hidden = false;
    invertCheckbox.checked = channelState?.inverted ?? false;
    const targetStick = getCurrentStepTargetStick(getCurrentStep, getResolvedPrimaryRef);
    const targetAxis = getCurrentStepTargetAxis(getCurrentStep, getResolvedPrimaryRef);
    leftStickCard.classList.toggle('is-active', targetStick === 'L' || targetStick === 'both');
    rightStickCard.classList.toggle('is-active', targetStick === 'R' || targetStick === 'both');
    leftStickShell.dataset.activeAxis = targetStick === 'L' ? targetAxis : 'none';
    rightStickShell.dataset.activeAxis = targetStick === 'R' ? targetAxis : 'none';
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
