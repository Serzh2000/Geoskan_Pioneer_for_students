import { escapeHtml, getLocalizedRoleLabel } from '../rendering-helpers.js';
import type { ChannelRole, ChannelMapping, RcRuntimeSnapshot } from '../types.js';
import { PRIMARY_CHANNELS } from './panel-core.js';
import { getResolvedStickMode, getSourceSummary } from './wizard-display.js';

const GUIDED_PRIMARY_ROLE_ORDER: Array<'throttle' | 'pitch' | 'roll' | 'yaw'> = ['throttle', 'pitch', 'roll', 'yaw'];

type GuidedStickTask = {
    role: 'throttle' | 'pitch' | 'roll' | 'yaw';
    channel: number;
    stepLabel: string;
    title: string;
    instruction: string;
    stickId: 'left' | 'right';
    axis: 'x' | 'y';
    mapping: ChannelMapping;
};

function getListenPrompt(mapping: ChannelMapping): string {
    return `Пошевелите стиком ${getLocalizedRoleLabel(mapping.role)} на пульте...`;
}

function renderStickModeChoiceCards(snapshot: RcRuntimeSnapshot): string {
    const activeMode = getResolvedStickMode(snapshot);
    return `
        <div class="rc-mode-card-grid">
            <button type="button" class="rc-mode-card ${activeMode === 2 ? 'rc-mode-card--active' : ''}" data-action="stick-mode-toggle" data-mode="2" aria-pressed="${activeMode === 2 ? 'true' : 'false'}"><span class="rc-mode-card__step">Шаг 2.1</span><strong>Mode 2</strong><span>Газ слева, крен/тангаж справа</span></button>
            <button type="button" class="rc-mode-card ${activeMode === 1 ? 'rc-mode-card--active' : ''}" data-action="stick-mode-toggle" data-mode="1" aria-pressed="${activeMode === 1 ? 'true' : 'false'}"><span class="rc-mode-card__step">Шаг 2.1</span><strong>Mode 1</strong><span>Газ справа, тангаж/рыскание слева</span></button>
        </div>
    `;
}

function getGuidedStickTask(snapshot: RcRuntimeSnapshot, role: GuidedStickTask['role']): GuidedStickTask | null {
    const mapping = snapshot.activeProfile.channelMappings.find((item) => item.role === role);
    if (!mapping) return null;
    const mode = getResolvedStickMode(snapshot);
    const descriptors: Record<GuidedStickTask['role'], Omit<GuidedStickTask, 'role' | 'channel' | 'mapping'>> = {
        throttle: mode === 2 ? { stepLabel: 'Шаг 2.2', title: 'Настройка Газа', instruction: 'Переместите ЛЕВЫЙ стик вашего RadioMaster вверх и вниз.', stickId: 'left', axis: 'y' } : { stepLabel: 'Шаг 2.2', title: 'Настройка Газа', instruction: 'Переместите ПРАВЫЙ стик вашего RadioMaster вверх и вниз.', stickId: 'right', axis: 'y' },
        pitch: mode === 2 ? { stepLabel: 'Шаг 2.3', title: 'Настройка Тангажа', instruction: 'Переместите ПРАВЫЙ стик вашего RadioMaster вверх и вниз.', stickId: 'right', axis: 'y' } : { stepLabel: 'Шаг 2.3', title: 'Настройка Тангажа', instruction: 'Переместите ЛЕВЫЙ стик вашего RadioMaster вверх и вниз.', stickId: 'left', axis: 'y' },
        roll: { stepLabel: 'Шаг 2.4', title: 'Настройка Крена', instruction: 'Переместите ПРАВЫЙ стик вашего RadioMaster влево и вправо.', stickId: 'right', axis: 'x' },
        yaw: { stepLabel: 'Шаг 2.5', title: 'Настройка Рыскания', instruction: 'Переместите ЛЕВЫЙ стик вашего RadioMaster влево и вправо.', stickId: 'left', axis: 'x' }
    };
    return { role, channel: mapping.channel, mapping, ...descriptors[role] };
}

function getGuidedStickTasks(snapshot: RcRuntimeSnapshot): GuidedStickTask[] {
    return GUIDED_PRIMARY_ROLE_ORDER.map((role) => getGuidedStickTask(snapshot, role)).filter((task): task is GuidedStickTask => Boolean(task));
}

function getCurrentGuidedStickTask(snapshot: RcRuntimeSnapshot): GuidedStickTask | null {
    const listeningChannel = snapshot.wizard.autoDetectChannel;
    const tasks = getGuidedStickTasks(snapshot);
    if (listeningChannel) return tasks.find((task) => task.channel === listeningChannel) ?? null;
    return tasks.find((task) => PRIMARY_CHANNELS.includes(task.channel) && !task.mapping.sourceId) ?? null;
}

function renderGuidedStickProgress(snapshot: RcRuntimeSnapshot): string {
    return `<div class="rc-guided-progress">${getGuidedStickTasks(snapshot).map((task) => {
        const isListening = snapshot.wizard.autoDetectChannel === task.channel;
        const isDone = Boolean(task.mapping.sourceId);
        return `<div class="rc-guided-progress__item ${isDone ? 'rc-guided-progress__item--done' : ''} ${isListening ? 'rc-guided-progress__item--active' : ''}"><strong>${escapeHtml(getLocalizedRoleLabel(task.role, true))}</strong><span>${isDone ? escapeHtml(getSourceSummary(snapshot, task.mapping)) : 'Ожидает захвата'}</span></div>`;
    }).join('')}</div>`;
}

export function getMonitorFocus(snapshot: RcRuntimeSnapshot): { role: ChannelRole | null; stickId: 'left' | 'right' | null; axis: 'x' | 'y' | null; title?: string } | null {
    if (snapshot.wizard.currentStepId !== 'sticks') return null;
    const task = getCurrentGuidedStickTask(snapshot);
    if (!task) return null;
    return { role: task.role, stickId: task.stickId, axis: task.axis, title: `${task.stepLabel}: ${task.title}` };
}

export function renderGuidedStickStep(snapshot: RcRuntimeSnapshot): string {
    const currentTask = getCurrentGuidedStickTask(snapshot);
    if (!currentTask) {
        return `<div class="settings-group"><div class="settings-label">Стики</div>${renderStickModeChoiceCards(snapshot)}${renderGuidedStickProgress(snapshot)}<div class="rc-setup-note"><strong>Все главные оси уже назначены</strong><span>Проверьте отклик модели и переходите к следующему шагу мастера.</span></div></div>`;
    }
    const isListening = snapshot.wizard.autoDetectChannel === currentTask.channel;
    const hasDevice = Boolean(snapshot.activeDeviceId);
    return `
        <div class="settings-group rc-guided-step">
            <div class="settings-label">Пошаговая настройка стиков</div>
            ${renderStickModeChoiceCards(snapshot)}
            <div class="rc-guided-step__hero"><span class="rc-guided-step__eyebrow">${escapeHtml(currentTask.stepLabel)}</span><strong>${escapeHtml(currentTask.title)}</strong><p>${escapeHtml(currentTask.instruction)}</p></div>
            <div class="rc-guided-step__focus ${isListening ? 'rc-guided-step__focus--active' : ''}">
                <span class="rc-guided-step__focus-stick">${currentTask.stickId === 'left' ? 'Левый стик' : 'Правый стик'}</span>
                <span class="rc-guided-step__focus-axis">${currentTask.axis === 'y' ? 'Вертикальная ось' : 'Горизонтальная ось'}</span>
                <strong>${isListening ? 'Сканируем все Axis 0-7 и ждем движение.' : 'Готово к захвату.'}</strong>
            </div>
            <div class="rc-guided-step__actions">
                <button type="button" class="rc-action-btn ${isListening ? 'rc-action-btn--active' : ''}" data-action="channel-autodetect" data-channel="${currentTask.channel}" ${hasDevice ? '' : 'disabled'}>${isListening ? escapeHtml(getListenPrompt(currentTask.mapping)) : 'Начать захват оси'}</button>
                <button type="button" class="rc-action-btn" data-action="auto-assign">Заполнить автоматически</button>
            </div>
            ${!hasDevice ? `<div class="rc-setup-note rc-setup-note--warning"><strong>Пульт не активен</strong><span>Подключите RadioMaster через USB HID. Без живого устройства мастер не сможет определить ось.</span></div>` : ''}
            ${currentTask.mapping.sourceId ? `<div class="rc-setup-note"><strong>Текущий источник</strong><span>${escapeHtml(getSourceSummary(snapshot, currentTask.mapping))}</span></div>` : ''}
            ${renderGuidedStickProgress(snapshot)}
        </div>
    `;
}
