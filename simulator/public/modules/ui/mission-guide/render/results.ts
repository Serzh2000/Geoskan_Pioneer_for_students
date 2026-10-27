import type { FlightTimeline } from '../evaluation/text/timeline.js';
import { escapeHtml, renderInline } from './shared.js';

export function renderScenePlaceholder(): string {
    return `<div class="guide-scene-preview__placeholder">
        <span class="guide-scene-preview__icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m24 5 17 10v18L24 43 7 33V15Z M7 15l17 10 17-10 M24 25v18"/></svg></span>
        <strong>Здесь появится ваш результат</strong>
        <p>Выполните задание и нажмите «Проверить и запустить».</p>
    </div>`;
}

/** A failed first run is normal; the verdict says so before it lists what to fix. */
export const RETRY_NORMALIZER = 'Так бывает у большинства первых запусков. Исправьте замечание ниже и запустите снова.';

type VerdictOptions = { expected?: string; hasErrors?: boolean; next?: string; idleText?: string };

/** One verdict for the whole step: tone by fill, the expected behaviour as its last line. */
export function renderCheckVerdict(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean, options: VerdictOptions = {}): string {
    const verdict = (tone: string, title: string, text: string, normalize = false): string => `
        <div class="guide-verdict guide-verdict--${tone}" role="status">
            <span class="guide-verdict__icon" aria-hidden="true">${tone === 'success' ? '✓' : tone === 'idle' ? '·' : '!'}</span>
            <div class="guide-verdict__text">
                <h2 class="guide-verdict__title">${title}</h2>
                ${normalize ? `<p>${RETRY_NORMALIZER}</p>` : ''}
                <p>${text}</p>
                ${options.next && tone === 'success' ? `<p class="guide-verdict__next">${renderInline(options.next)}</p>` : ''}
                ${options.expected ? `<p class="guide-verdict__expected"><span>Цель урока</span>${renderInline(options.expected)}</p>` : ''}
            </div>
        </div>
    `;
    if (!hasChecked) return verdict('idle', 'Пока не проверено', options.idleText ?? 'Выполните задание на шаге практики и запустите проверку.');
    if (solved) return verdict('success', 'Решение принято', 'Автопроверка пройдена: поведение сцены совпало с целью урока.');
    if (launchedWithWarnings) return verdict('warning', 'Есть замечания', `Сцена уже показывает текущую версию, но решение пока не совпадает с целью задания. Замечаний: ${diagnosticsCount}.`, true);
    return verdict(options.hasErrors ? 'danger' : 'warning', 'Нужно исправить', `Проверка показала проблемы в логике. Замечаний: ${diagnosticsCount}.`, true);
}

const pct = (value: number, total: number): string => `${Math.max(0, Math.min(100, (value / Math.max(total, 1)) * 100)).toFixed(2)}%`;
const seconds = (ms: number): string => `${(ms / 1000).toFixed(1).replace('.', ',')} с`;

function renderPoints(points: FlightTimeline['messages'], total: number): string {
    return points.map(point => `<span class="flight-record__tick" style="left:${pct(point.at, total)}" title="${escapeHtml(`${seconds(point.at)}: ${point.label}`)}"></span>`).join('');
}

function renderSegments(items: FlightTimeline['states'], total: number): string {
    return items.map(item => `<span class="flight-record__segment" style="left:${pct(item.from, total)};width:${pct(Math.max(item.to - item.from, total * .015), total)}${item.rgb ? `;--segment:${item.rgb}` : ''}" title="${escapeHtml(`${seconds(item.from)}–${seconds(item.to)}: ${item.label}`)}">${item.rgb || (item.to - item.from) / Math.max(total, 1) < 0.12 ? '' : escapeHtml(item.label)}</span>`).join('');
}

function renderAltitude(points: FlightTimeline['altitude'], total: number): string {
    const top = Math.max(1, ...points.map(point => point.z));
    const path = points.map(point => `${((point.at / Math.max(total, 1)) * 100).toFixed(2)},${(100 - (Math.max(point.z, 0) / top) * 90).toFixed(2)}`).join(' ');
    return `<svg class="flight-record__altitude" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Высота: максимум ${top.toFixed(1).replace('.', ',')} м"><polyline points="${path}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

/** The flight recorder: what the code did, what the autopilot reported and what the drone did, on one time axis. */
export function renderFlightRecord(timeline: FlightTimeline): string {
    const total = timeline.durationMs;
    const marks = Array.from({ length: Math.min(Math.floor(total / 1000), 12) + 1 }, (_, i) => i);
    const step = Math.max(1, Math.ceil(marks.length / 8));
    const maxZ = Math.max(...timeline.altitude.map(point => point.z));
    const lanes: Array<[string, string, string?]> = [
        ...(timeline.commands.length ? [['Команды', renderPoints(timeline.commands, total)] as [string, string]] : []),
        ['Автопилот', renderSegments(timeline.states, total), 'flight-record__track--states'],
        ...(timeline.light.length ? [['Свет', renderSegments(timeline.light, total)] as [string, string]] : []),
        ...(maxZ > 0.05 ? [['Высота', renderAltitude(timeline.altitude, total), 'flight-record__track--altitude'] as [string, string, string]] : []),
        ...(timeline.messages.length ? [['Сообщения', renderPoints(timeline.messages, total)] as [string, string]] : [])
    ];
    const events = [
        ...timeline.commands.map(item => ({ at: item.at, text: `команда ${item.label}` })),
        ...timeline.states.map(item => ({ at: item.from, text: `автопилот: ${item.label}` })),
        ...timeline.light.map(item => ({ at: item.from, text: `свет: ${item.label}` })),
        ...timeline.messages.map(item => ({ at: item.at, text: `сообщение «${item.label}»` }))
    ].sort((a, b) => a.at - b.at);
    return `<section class="flight-record" aria-label="Запись полёта">
        <div class="flight-record__head"><h2 class="flight-record__title">Что произошло в полёте</h2><small>всего ${seconds(total)}</small></div>
        <div class="flight-record__grid">
            <div class="flight-record__axis" aria-hidden="true">${marks.filter(mark => mark % step === 0).map(mark => `<span style="left:${pct(mark * 1000, total)}">${mark} с</span>`).join('')}</div>
            ${lanes.map(([label, track, extra]) => `<div class="flight-record__lane"><span class="flight-record__label">${label}</span><div class="flight-record__track ${extra || ''}">${track}</div></div>`).join('')}
        </div>
        <details class="pk-disclosure"><summary>События по порядку</summary><ol class="flight-record__events">${events.map(event => `<li><time>${seconds(event.at)}</time> ${escapeHtml(event.text)}</li>`).join('')}</ol></details>
    </section>`;
}
