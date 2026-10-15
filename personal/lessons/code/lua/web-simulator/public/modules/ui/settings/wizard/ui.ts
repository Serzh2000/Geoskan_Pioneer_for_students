import type { GamepadInputRef } from '../../../core/state.js';
import { getPrimaryChannelStickSlot } from '../input/values.js';
import { CHANNEL_LABELS, STEPS } from './config.js';
import { getBestAuxCandidate } from './detection.js';
import { buildChannelRows, describeTarget, type ChannelRow } from './radio-model.js';
import { buildSummaryHtml, formatRefLabel } from './summary.js';
import type { ChannelKey, ObservedInputStats, PrimaryChannelKey } from '../types.js';
import type {
    AuxDetectionResult,
    WizardAuxChannelKey,
    WizardChannelState,
    WizardStep
} from './types.js';

/*
 * The wizard's text side: the question of the step, what to do, the status line, the buttons and the channel rows that
 * fill in one by one as channels are found. The drawn transmitter (radio-view.ts) is updated by wizard.ts.
 */

type WizardDomRefs = {
    instruction: HTMLElement | null;
    hint: HTMLElement | null;
    status: HTMLElement | null;
    nextBtn: HTMLButtonElement | null;
    nextLabel: HTMLElement | null;
    prevBtn: HTMLButtonElement | null;
    skipBtn: HTMLButtonElement | null;
    stepContainer: HTMLElement | null;
    summaryContainer: HTMLElement | null;
    summaryContent: HTMLElement | null;
    channels: HTMLElement | null;
    primaryControls: HTMLElement | null;
    stepDots: HTMLElement | null;
    invertCheckbox: HTMLInputElement | null;
};

let wizardDomRefs: WizardDomRefs | null = null;

type WizardRenderParams = {
    currentStepIdx: number;
    showingSummary: boolean;
    detectedMapping: Partial<Record<ChannelKey, GamepadInputRef>>;
    auxResults: Partial<Record<WizardAuxChannelKey, AuxDetectionResult>>;
    stepObservedStats: Map<GamepadInputRef, ObservedInputStats>;
    stepSwitchTransitions: Map<GamepadInputRef, number>;
    /** Channels the student chose to skip. */
    skipped: ReadonlySet<ChannelKey>;
    /** Live values of the channels (flight channels centred -1..1, throttle 0..1, switches -1..1). */
    channelValues: Partial<Record<ChannelKey, number>>;
    connected: boolean;
    /** The channel is found and the wizard is about to move on by itself. */
    advancing: boolean;
    getCurrentStep: () => WizardStep;
    getDetectedRef: (channel: ChannelKey) => GamepadInputRef | null;
    getCurrentChannelState: () => WizardChannelState | null;
    getChannelInversion: (channel: ChannelKey) => boolean;
    getFirstConnectedGamepad: () => Gamepad | null;
    isCurrentStepResolved: () => boolean;
};

function getWizardDomRefs(): WizardDomRefs {
    if (wizardDomRefs?.instruction?.isConnected) {
        return wizardDomRefs;
    }

    wizardDomRefs = {
        instruction: document.getElementById('gp-wizard-instruction'),
        hint: document.getElementById('gp-wizard-hint'),
        status: document.getElementById('gp-wizard-status'),
        nextBtn: document.getElementById('gp-wizard-next') as HTMLButtonElement | null,
        nextLabel: document.querySelector('#gp-wizard-next .gp-wizard-next__label'),
        prevBtn: document.getElementById('gp-wizard-prev') as HTMLButtonElement | null,
        skipBtn: document.getElementById('gp-wizard-skip') as HTMLButtonElement | null,
        stepContainer: document.getElementById('gp-wizard-step-container'),
        summaryContainer: document.getElementById('gp-wizard-summary'),
        summaryContent: document.getElementById('gp-wizard-summary-content'),
        channels: document.getElementById('gp-wizard-channels'),
        primaryControls: document.getElementById('gp-wizard-primary-controls'),
        stepDots: document.getElementById('gp-wizard-steps'),
        invertCheckbox: document.getElementById('gp-wizard-invert') as HTMLInputElement | null
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

function setDataIfChanged(element: HTMLElement | null, key: string, value: string): void {
    if (element && element.dataset[key] !== value) {
        element.dataset[key] = value;
    }
}

const STATE_LABELS: Record<ChannelRow['state'], string> = {
    pending: 'ждёт',
    current: 'сейчас',
    done: 'найден',
    skipped: 'пропущен'
};

/** One row per channel: the row is made once and then only its state, fill and source change. */
function renderChannelRows(list: HTMLElement, rows: ChannelRow[]): void {
    if (list.children.length !== rows.length) {
        list.replaceChildren(...rows.map((row) => {
            const item = document.createElement('li');
            item.className = 'gp-ch-row';
            item.dataset.channel = row.channel;
            item.innerHTML = '<span class="gp-ch-row__name"></span><span class="gp-ch-row__bar"><i></i></span><span class="gp-ch-row__source"></span>';
            return item;
        }));
    }
    rows.forEach((row, index) => {
        const item = list.children[index] as HTMLElement;
        setDataIfChanged(item, 'state', row.state);
        setTextIfChanged(item.querySelector<HTMLElement>('.gp-ch-row__name'), row.label);
        // A throttle fills from the left, a centred channel from the middle towards the side it is pushed.
        const bar = item.querySelector<HTMLElement>('.gp-ch-row__bar i');
        if (bar) {
            const from = row.channel === 'throttle' ? 0 : Math.min(50, (row.value + 1) * 50);
            const width = row.channel === 'throttle' ? Math.max(0, Math.min(1, row.value)) * 100 : Math.abs(row.value) * 50;
            const left = `${from.toFixed(1)}%`;
            const size = `${width.toFixed(1)}%`;
            if (bar.style.left !== left) bar.style.left = left;
            if (bar.style.width !== size) bar.style.width = size;
        }
        setTextIfChanged(item.querySelector<HTMLElement>('.gp-ch-row__source'), row.source ?? STATE_LABELS[row.state]);
    });
}

/** What to do, in words that match the picture: which stick and which way, or which switch and how many positions. */
function describeAsk(step: WizardStep): string {
    const target = describeTarget(step, getPrimaryChannelStickSlot);
    if (target.kind === 'stick') {
        const side = target.side === 'left' ? 'левый' : 'правый';
        const move = target.axis === 'y' ? 'вверх и вниз' : 'влево и вправо';
        return `Двигайте ${side} стик ${move} до упора, как показывает пульт на схеме.`;
    }
    const channel = CHANNEL_LABELS[step.channel].toLowerCase();
    return target.positions === 3
        ? `Переключите тумблер по всем трём положениям, как на схеме. Подойдёт любой, которым вы хотите управлять каналом «${channel}».`
        : `Переключите тумблер туда и обратно, как на схеме. Подойдёт любой, которым вы хотите управлять каналом «${channel}».`;
}

/** The line of steps along the bottom: done, the current one, and those still to come. */
function renderStepDots(list: HTMLElement, current: number): void {
    if (list.children.length !== STEPS.length + 1) {
        list.replaceChildren(...Array.from({ length: STEPS.length + 1 }, () => document.createElement('li')));
    }
    Array.from(list.children).forEach((dot, index) => {
        setDataIfChanged(dot as HTMLElement, 'state', index < current ? 'done' : index === current ? 'current' : 'todo');
    });
}

export function renderWizardState(params: WizardRenderParams): void {
    const {
        currentStepIdx,
        showingSummary,
        detectedMapping,
        auxResults,
        stepObservedStats,
        stepSwitchTransitions,
        skipped,
        channelValues,
        connected,
        advancing,
        getCurrentStep,
        getDetectedRef,
        getCurrentChannelState,
        getChannelInversion,
        getFirstConnectedGamepad,
        isCurrentStepResolved
    } = params;

    const {
        instruction,
        hint,
        status,
        nextBtn,
        nextLabel,
        prevBtn,
        skipBtn,
        stepContainer,
        summaryContainer,
        summaryContent,
        channels,
        primaryControls,
        stepDots,
        invertCheckbox
    } = getWizardDomRefs();

    if (stepDots) renderStepDots(stepDots, showingSummary ? STEPS.length : currentStepIdx);

    if (
        !instruction || !hint || !status || !nextBtn || !nextLabel || !prevBtn || !skipBtn || !stepContainer
        || !summaryContainer || !summaryContent || !channels || !primaryControls || !invertCheckbox
    ) return;

    if (showingSummary) {
        setDisplayIfChanged(stepContainer, 'none');
        setDisplayIfChanged(summaryContainer, 'block');
        setHtmlIfChanged(summaryContent, buildSummaryHtml({
            detectedMapping,
            auxResults,
            getChannelInversion
        }));
        setDisabledIfChanged(prevBtn, false);
        setDisabledIfChanged(nextBtn, false);
        setHiddenIfChanged(skipBtn, true);
        setTextIfChanged(nextLabel, 'Применить');
        setDataIfChanged(nextBtn, 'advancing', 'false');
        return;
    }

    setDisplayIfChanged(stepContainer, 'block');
    setDisplayIfChanged(summaryContainer, 'none');

    const step = getCurrentStep();
    const channelState = getCurrentChannelState();
    const resolved = isCurrentStepResolved();
    const label = CHANNEL_LABELS[step.channel];

    setTextIfChanged(instruction, resolved ? `${label}: найден` : step.instruction);
    setTextIfChanged(hint, resolved
        ? (advancing ? 'Отлично, переходим к следующему шагу. Нажмите «Назад», если нужно что-то поправить.' : 'Канал найден. Если направление перепутано, включите инверсию, затем нажмите «Далее».')
        : describeAsk(step));
    setTextIfChanged(status, connected ? getStepStatusText({
        step,
        getDetectedRef,
        getFirstConnectedGamepad,
        detectedMapping,
        stepObservedStats,
        stepSwitchTransitions,
        auxResults
    }) : 'Пульт не виден. Подключите его по USB и подвигайте любой стик.');
    setDisabledIfChanged(prevBtn, currentStepIdx === 0);
    setDisabledIfChanged(nextBtn, !resolved);
    setTextIfChanged(nextLabel, currentStepIdx === STEPS.length - 1 ? 'Показать сводку' : 'Далее');
    setDataIfChanged(nextBtn, 'advancing', String(advancing));
    // Only the switches may be left out: without the four flight channels the controller cannot fly the drone.
    setHiddenIfChanged(skipBtn, step.type !== 'aux' || resolved);
    setHiddenIfChanged(primaryControls, false);
    setCheckedIfChanged(invertCheckbox, channelState?.inverted ?? false);

    renderChannelRows(channels, buildChannelRows({
        current: step.channel,
        detected: detectedMapping,
        skipped,
        values: channelValues,
        labels: CHANNEL_LABELS,
        formatRef: formatRefLabel
    }));
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
        return `Обнаружено: ${formatRefLabel(ref)}. Переходим к следующему шагу.`;
    }

    const auxResult = auxResults[step.channel as WizardAuxChannelKey];
    const positionsText = auxResult?.positions.map((position) => position.centerRc).join(' / ') ?? 'нет данных';
    return `Обнаружено: ${formatRefLabel(ref)}. Положения: ${positionsText}.`;
}
