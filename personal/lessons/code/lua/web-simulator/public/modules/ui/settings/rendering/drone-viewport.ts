import { escapeHtml, getLocalizedRoleLabel, localizeSourceLabel } from '../rendering-helpers.js';
import type { ChannelRole, RcRuntimeSnapshot } from '../types.js';
import { getRcPreviewValues, getRcSignalStatus } from '../viewport-bridge.js';

export type MonitorFocus = {
    role: ChannelRole | null;
    stickId: 'left' | 'right' | null;
    axis: 'x' | 'y' | null;
    title?: string;
} | null;

export function renderDroneViewport(snapshot: RcRuntimeSnapshot, focus: MonitorFocus = null): string {
    const preview = getRcPreviewValues(snapshot);
    const signalStatus = getRcSignalStatus(snapshot);
    const summaryCards = [
        {
            label: 'Сигнал HID',
            value: signalStatus.hasRecentActivity ? 'Есть активность' : 'Ожидание',
            note: signalStatus.hasRecentActivity ? 'Raw Input меняется в реальном времени' : 'Пошевелите стики или тумблеры'
        },
        {
            label: 'Главные оси',
            value: signalStatus.hasMappedPreview ? 'Назначены' : 'Не все назначены',
            note: signalStatus.hasMappedPreview ? 'Roll, Pitch, Yaw и Throttle готовы к preview' : 'Вернитесь на шаг "Стики" и завершите привязку'
        },
        {
            label: 'Стабильность сцены',
            value: 'Основной viewport сохранен',
            note: 'Панель RC больше не перемонтирует главную Three.js сцену и не ломает загрузку окружения'
        }
    ];
    const telemetry = [
        { key: 'roll', label: 'Roll', value: preview.roll.toFixed(2), caption: 'rotation.x' },
        { key: 'pitch', label: 'Pitch', value: preview.pitch.toFixed(2), caption: 'rotation.z' },
        { key: 'yaw', label: 'Yaw', value: preview.yaw.toFixed(2), caption: 'rotation.y' },
        { key: 'throttle', label: 'Throttle', value: preview.throttle.toFixed(2), caption: `${Math.round(preview.throttle * 100)}%` }
    ];
    const previewBindings = [
        { role: 'roll' as const, target: 'rotation.x' },
        { role: 'pitch' as const, target: 'rotation.z' },
        { role: 'yaw' as const, target: 'rotation.y' },
        { role: 'throttle' as const, target: 'rotor_0..3.rotation.z' }
    ];
    return `
        <section class="settings-group rc-drone-viewport">
            <div class="rc-drone-viewport__header">
                <div>
                    <div class="settings-label">Viewport</div>
                    <div class="rc-drone-viewport__title">Геоскан Пионер</div>
                </div>
                <div class="rc-drone-viewport__status rc-drone-viewport__status--${signalStatus.kind}" data-rc-signal-status data-status-kind="${signalStatus.kind}">
                    ${escapeHtml(signalStatus.label)}
                </div>
            </div>
            ${focus?.title ? `<div class="rc-drone-viewport__focus">${escapeHtml(focus.title)}</div>` : ''}
            <div class="rc-drone-stage">
                <div class="rc-live-viewport">
                    <div class="rc-live-viewport__header">
                        <div>
                            <div class="rc-live-viewport__eyebrow">VIEWPORT</div>
                            <div class="rc-live-viewport__title">Связь с основной сценой Геоскан Пионер</div>
                        </div>
                        <div class="rc-live-viewport__badge">Stable scene bridge</div>
                    </div>
                    <div class="rc-live-viewport__host">
                        <div class="rc-viewport-bridge">
                            <div class="rc-viewport-bridge__eyebrow">Стабильная визуализация</div>
                            <div class="rc-viewport-bridge__title">Основная сцена больше не перемещается внутрь панели настроек</div>
                            <p class="rc-viewport-bridge__description">Реальная Three.js сцена остается в основном canvas, а эта панель показывает ее состояние, текущий сигнал и назначения осей без повторного монтирования DOM.</p>
                            <div class="rc-viewport-bridge__grid">
                                ${summaryCards.map((item) => `
                                    <div class="rc-viewport-bridge__card">
                                        <span>${escapeHtml(item.label)}</span>
                                        <strong>${escapeHtml(item.value)}</strong>
                                        <small>${escapeHtml(item.note)}</small>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="rc-viewport-bridge__footer">
                                ${signalStatus.kind === 'live'
                                    ? 'Сигнал активен: модель в основной сцене получает preview override и реагирует на текущие стики.'
                                    : 'Если preview не двигается, проверьте сопоставление стиков и активность raw input во вкладке "Монитор".'}
                            </div>
                        </div>
                    </div>
                    <div class="rc-live-viewport__legend">
                        ${previewBindings.map((binding) => {
                            const mapping = snapshot.activeProfile.channelMappings.find((item) => item.role === binding.role);
                            const source = mapping?.sourceId
                                ? snapshot.activeProfile.inputSources.find((item) => item.id === mapping.sourceId)
                                : null;
                            return `
                                <div class="rc-live-viewport__card">
                                    <span>${escapeHtml(getLocalizedRoleLabel(binding.role, true))}</span>
                                    <strong>${escapeHtml(source ? localizeSourceLabel(source.label) : 'Не назначено')}</strong>
                                    <small>${escapeHtml(`${binding.target} <- ${mapping?.sourceId ?? 'нет sourceId'}`)}</small>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="rc-live-viewport__footer">
                        ${signalStatus.kind === 'live'
                            ? 'Preview влияет на модель в основном viewport: наклоны и роторы обновляются без дублирования сцены.'
                            : 'При нулевых значениях или конфликте осей модель плавно возвращается в горизонтальный уровень.'}
                    </div>
                </div>
            </div>
            <div class="rc-drone-telemetry">
                ${telemetry.map((item) => `
                    <div class="rc-drone-telemetry__chip">
                        ${item.label}
                        <strong data-rc-drone-readout="${item.key}">${escapeHtml(item.value)}</strong>
                        <span data-rc-drone-caption="${item.key}">${escapeHtml(item.caption)}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}
