import { escapeHtml, localizeSourceGroup, localizeSourceLabel } from '../rendering-helpers.js';
import type { ChannelRole, RcRuntimeSnapshot, RcWizardPrimaryRole, StickMode } from '../types.js';
import { renderDroneViewport } from './drone-viewport.js';

type ViewportFocus = {
    role: ChannelRole | null;
    stickId: 'left' | 'right' | null;
    axis: 'x' | 'y' | null;
    title?: string;
} | null;

function getWizardModalStepLabel(stepId: RcRuntimeSnapshot['wizardModal']['stepId']): string {
    return {
        mode: 'Шаг 1 из 6',
        throttle: 'Шаг 2 из 6',
        yaw: 'Шаг 3 из 6',
        pitch: 'Шаг 4 из 6',
        roll: 'Шаг 5 из 6',
        aux: 'Шаг 6 из 6',
        review: 'Финал'
    }[stepId];
}

function getWizardModalRoleLabel(stepId: RcRuntimeSnapshot['wizardModal']['stepId']): string {
    return ({ throttle: 'Газ', roll: 'Крен', pitch: 'Тангаж', yaw: 'Рыскание' } as const)[stepId as 'throttle' | 'roll' | 'pitch' | 'yaw'] ?? '';
}

function getModeDescription(mode: StickMode): { title: string; details: string } {
    return {
        1: { title: 'Газ справа', details: 'Правый стик: газ/крен. Левый стик: тангаж/рыскание.' },
        2: { title: 'Газ слева', details: 'Левый стик: газ/рыскание. Правый стик: крен/тангаж.' },
        3: { title: 'Газ справа', details: 'Правый стик: газ/рыскание. Левый стик: крен/тангаж.' },
        4: { title: 'Газ слева', details: 'Левый стик: газ/крен. Правый стик: рыскание/тангаж.' }
    }[mode];
}

function getWizardStickTarget(mode: StickMode, role: RcWizardPrimaryRole): { stickId: 'left' | 'right'; axis: 'x' | 'y' } {
    const layouts: Record<StickMode, Record<RcWizardPrimaryRole, { stickId: 'left' | 'right'; axis: 'x' | 'y' }>> = {
        1: {
            throttle: { stickId: 'right', axis: 'y' },
            yaw: { stickId: 'left', axis: 'x' },
            pitch: { stickId: 'left', axis: 'y' },
            roll: { stickId: 'right', axis: 'x' }
        },
        2: {
            throttle: { stickId: 'left', axis: 'y' },
            yaw: { stickId: 'left', axis: 'x' },
            pitch: { stickId: 'right', axis: 'y' },
            roll: { stickId: 'right', axis: 'x' }
        },
        3: {
            throttle: { stickId: 'right', axis: 'y' },
            yaw: { stickId: 'right', axis: 'x' },
            pitch: { stickId: 'left', axis: 'y' },
            roll: { stickId: 'left', axis: 'x' }
        },
        4: {
            throttle: { stickId: 'left', axis: 'y' },
            yaw: { stickId: 'right', axis: 'x' },
            pitch: { stickId: 'right', axis: 'y' },
            roll: { stickId: 'left', axis: 'x' }
        }
    };
    return layouts[mode][role];
}

function getWizardModalCaptureSourceLabel(snapshot: RcRuntimeSnapshot, role: RcWizardPrimaryRole): string {
    const sourceId = snapshot.wizardModal.primaryAssignments[role]
        ?? (snapshot.wizardModal.stepId === role ? snapshot.wizardModal.captureSourceId : null);
    return getWizardModalSourceLabel(snapshot, sourceId ?? undefined);
}

function getWizardModalStepTitle(snapshot: RcRuntimeSnapshot): string {
    const modeLabel = snapshot.wizardModal.mode ? `Mode ${snapshot.wizardModal.mode}` : 'раскладки';
    return {
        mode: 'Выберите раскладку стиков',
        throttle: `Калибровка газа для ${modeLabel}`,
        yaw: 'Калибровка рыскания',
        pitch: 'Калибровка тангажа',
        roll: 'Калибровка крена',
        aux: 'Назначение AUX-тумблеров',
        review: 'Проверьте и примените настройки'
    }[snapshot.wizardModal.stepId];
}

function getWizardModalInstruction(snapshot: RcRuntimeSnapshot): string {
    const mode = snapshot.wizardModal.mode ?? 2;
    const throttleTarget = getWizardStickTarget(mode, 'throttle');
    const yawTarget = getWizardStickTarget(mode, 'yaw');
    const pitchTarget = getWizardStickTarget(mode, 'pitch');
    const rollTarget = getWizardStickTarget(mode, 'roll');
    const describeAxis = (target: { stickId: 'left' | 'right'; axis: 'x' | 'y' }, label: string) => {
        const stickText = target.stickId === 'left' ? 'левый стик' : 'правый стик';
        const axisText = target.axis === 'x' ? 'влево и вправо' : 'вверх и вниз';
        return `${label}: переместите ${stickText} ${axisText} до упора.`;
    };
    return {
        mode: 'Выберите привычную раскладку RadioMaster. После клика мастер сразу начнет поиск нужной оси.',
        throttle: `${describeAxis(throttleTarget, 'Сначала определяем канал газа')} Мастер слушает сырой поток HID и сразу покажет реакцию дрона.`,
        yaw: `${describeAxis(yawTarget, 'Теперь определяем рыскание')} В этот момент дрон должен начать реагировать на поворот вокруг вертикальной оси.`,
        pitch: `${describeAxis(pitchTarget, 'Теперь определяем тангаж')} После захвата мастер автоматически перейдет к крену.`,
        roll: `${describeAxis(rollTarget, 'Последним определяем крен')} После захвата начнется поиск AUX-тумблеров.`,
        aux: 'Переключайте физические тумблеры по очереди. Мастер назначит Flight Mode, Arm и Magnet без дублей.',
        review: 'Конфигурация собрана с нуля. Проверьте найденные оси и примените настройки к активному профилю.'
    }[snapshot.wizardModal.stepId];
}

function getWizardModalFocus(snapshot: RcRuntimeSnapshot): ViewportFocus {
    const title = getWizardModalStepTitle(snapshot);
    if (snapshot.wizardModal.stepId === 'throttle' || snapshot.wizardModal.stepId === 'roll' || snapshot.wizardModal.stepId === 'pitch' || snapshot.wizardModal.stepId === 'yaw') {
        const target = getWizardStickTarget(snapshot.wizardModal.mode ?? 2, snapshot.wizardModal.stepId);
        return { role: snapshot.wizardModal.stepId, stickId: target.stickId, axis: target.axis, title };
    }
    return { role: null, stickId: null, axis: null, title };
}

function getWizardModalSourceLabel(snapshot: RcRuntimeSnapshot, sourceId: string | undefined): string {
    if (!sourceId) return 'Ожидает захвата';
    const source = snapshot.activeProfile.inputSources.find((item) => item.id === sourceId);
    return source ? `${localizeSourceLabel(source.label)} · ${localizeSourceGroup(source.group)}` : sourceId;
}

function renderWizardModalProgress(snapshot: RcRuntimeSnapshot): string {
    const items = [
        { label: 'Газ', sourceId: snapshot.wizardModal.primaryAssignments.throttle ?? (snapshot.wizardModal.stepId === 'throttle' ? snapshot.wizardModal.captureSourceId : null) },
        { label: 'Рыскание', sourceId: snapshot.wizardModal.primaryAssignments.yaw ?? (snapshot.wizardModal.stepId === 'yaw' ? snapshot.wizardModal.captureSourceId : null) },
        { label: 'Тангаж', sourceId: snapshot.wizardModal.primaryAssignments.pitch ?? (snapshot.wizardModal.stepId === 'pitch' ? snapshot.wizardModal.captureSourceId : null) },
        { label: 'Крен', sourceId: snapshot.wizardModal.primaryAssignments.roll ?? (snapshot.wizardModal.stepId === 'roll' ? snapshot.wizardModal.captureSourceId : null) },
        { label: 'Flight Mode', sourceId: snapshot.wizardModal.auxAssignments.flightMode },
        { label: 'Arm', sourceId: snapshot.wizardModal.auxAssignments.arm },
        { label: 'Magnet', sourceId: snapshot.wizardModal.auxAssignments.magnet }
    ];
    return `<div class="rc-wizard-modal__progress">${items.map((item) => `<div class="rc-wizard-modal__progress-item ${item.sourceId ? 'rc-wizard-modal__progress-item--done' : ''}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(getWizardModalSourceLabel(snapshot, item.sourceId))}</strong></div>`).join('')}</div>`;
}

function renderWizardModalBody(snapshot: RcRuntimeSnapshot): string {
    if (snapshot.wizardModal.stepId === 'mode') {
        return `
            <div class="rc-wizard-modal__choice-grid">
                ${([1, 2, 3, 4] as StickMode[]).map((mode) => {
                    const modeDescription = getModeDescription(mode);
                    return `<button type="button" class="rc-wizard-modal__choice" data-action="wizard-modal-mode" data-mode="${mode}"><span>Mode ${mode}</span><strong>${escapeHtml(modeDescription.title)}</strong><small>${escapeHtml(modeDescription.details)}</small></button>`;
                }).join('')}
            </div>
        `;
    }
    if (snapshot.wizardModal.stepId === 'review') {
        const rows = [
            { label: 'Mode', value: snapshot.wizardModal.mode ? `Mode ${snapshot.wizardModal.mode}` : 'Не выбран' },
            { label: 'Throttle', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.primaryAssignments.throttle) },
            { label: 'Yaw', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.primaryAssignments.yaw) },
            { label: 'Pitch', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.primaryAssignments.pitch) },
            { label: 'Roll', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.primaryAssignments.roll) },
            { label: 'Flight Mode', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.auxAssignments.flightMode) },
            { label: 'Arm', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.auxAssignments.arm) },
            { label: 'Magnet', value: getWizardModalSourceLabel(snapshot, snapshot.wizardModal.auxAssignments.magnet) }
        ];
        return `
            <div class="rc-wizard-modal__review">${rows.map((row) => `<div class="rc-wizard-modal__review-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join('')}</div>
            <div class="rc-setup-note"><strong>Конфигурация готова к применению</strong><span>После подтверждения конфликты источников будут сняты за счет полной перезаписи основных каналов и AUX-привязок.</span></div>
        `;
    }
    if (snapshot.wizardModal.stepId === 'aux') {
        const roleLabel = snapshot.wizardModal.currentAuxRole === 'flightMode' ? 'Flight Mode' : snapshot.wizardModal.currentAuxRole === 'arm' ? 'Arm' : 'Magnet';
        return `
            <div class="rc-wizard-modal__capture">
                <div class="rc-wizard-modal__capture-chip">Сейчас назначаем: ${escapeHtml(roleLabel)}</div>
                <strong>Переключите следующий физический тумблер на RadioMaster</strong>
                <span>${escapeHtml(snapshot.wizardModal.statusText || 'Мастер слушает наиболее активный AUX-вход.')}</span>
            </div>
            <div class="rc-wizard-modal__actions"><button type="button" class="rc-action-btn" data-action="wizard-modal-skip-aux">Пропустить этот AUX</button></div>
        `;
    }
    return `
        <div class="rc-wizard-modal__capture">
            <div class="rc-wizard-modal__capture-chip">${escapeHtml(getWizardModalRoleLabel(snapshot.wizardModal.stepId))}</div>
            <strong>${escapeHtml(getWizardModalInstruction(snapshot))}</strong>
            <span>${escapeHtml(snapshot.wizardModal.statusText || 'Мастер анализирует живой поток HID.')}</span>
            ${snapshot.wizardModal.stepId === 'throttle' || snapshot.wizardModal.stepId === 'yaw' || snapshot.wizardModal.stepId === 'pitch' || snapshot.wizardModal.stepId === 'roll'
                ? `<div class="rc-setup-note"><strong>Текущий захват</strong><span>${escapeHtml(getWizardModalCaptureSourceLabel(snapshot, snapshot.wizardModal.stepId))}</span></div>`
                : ''}
        </div>
    `;
}

export function renderWizardModal(snapshot: RcRuntimeSnapshot): string {
    if (!snapshot.wizardModal.isOpen) return '';
    const focus = getWizardModalFocus(snapshot);
    const canApply = Boolean(snapshot.wizardModal.mode && snapshot.wizardModal.primaryAssignments.throttle && snapshot.wizardModal.primaryAssignments.roll && snapshot.wizardModal.primaryAssignments.pitch && snapshot.wizardModal.primaryAssignments.yaw);
    return `
        <div class="rc-wizard-modal" data-state="open" role="dialog" aria-modal="true" aria-label="Мастер настройки пульта">
            <button type="button" class="rc-wizard-modal__backdrop" data-action="wizard-modal-close" aria-label="Закрыть мастер"></button>
            <div class="rc-wizard-modal__dialog">
                <div class="rc-wizard-modal__header">
                    <div>
                        <div class="settings-label">Мастер настройки пульта</div>
                        <div class="rc-wizard-modal__title">${escapeHtml(getWizardModalStepTitle(snapshot))}</div>
                        <div class="rc-wizard-modal__subtitle">${escapeHtml(getWizardModalStepLabel(snapshot.wizardModal.stepId))}</div>
                    </div>
                    <button type="button" class="rc-action-btn" data-action="wizard-modal-close">Закрыть</button>
                </div>
                <div class="rc-wizard-modal__layout">
                    <section class="rc-wizard-modal__panel rc-wizard-modal__panel--story">
                        <div class="rc-wizard-modal__instruction">${escapeHtml(getWizardModalInstruction(snapshot))}</div>
                        ${renderWizardModalBody(snapshot)}
                        ${snapshot.wizardModal.errorText ? `<div class="rc-setup-note rc-setup-note--error"><strong>Нужна корректировка</strong><span>${escapeHtml(snapshot.wizardModal.errorText)}</span></div>` : ''}
                        ${renderWizardModalProgress(snapshot)}
                    </section>
                    <section class="rc-wizard-modal__panel rc-wizard-modal__panel--viewport">
                        ${renderDroneViewport(snapshot, focus)}
                    </section>
                </div>
                <div class="rc-wizard-modal__footer">
                    <div class="rc-wizard-modal__status">${escapeHtml(snapshot.wizardModal.statusText || 'Ожидаем действие на пульте.')}</div>
                    ${snapshot.wizardModal.stepId === 'review'
                        ? `<button type="button" class="rc-nav-btn rc-nav-btn--primary" data-action="wizard-modal-apply" ${canApply ? '' : 'disabled'}>Применить настройки</button>`
                        : '<div class="rc-wizard-modal__footer-placeholder"></div>'}
                </div>
            </div>
        </div>
    `;
}
