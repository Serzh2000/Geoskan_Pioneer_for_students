import { escapeHtml } from '../render/shared.js';

/** The drawing of the LED strip with three knobs: the "live figure" of the lighting lessons. */
export type LedbarState = { index: number; r: number; g: number; b: number };
type Track = 'lua' | 'python';

export const LEDBAR_SIZE = 29;
const CHANNELS = [['r', 'Красный'], ['g', 'Зелёный'], ['b', 'Синий']] as const;
const CELL_PITCH = 15.5;
const CELL_X0 = 22;

const states = new Map<string, LedbarState>();

export function getLedbarState(lessonId: string): LedbarState {
    return { ...(states.get(lessonId) ?? { index: 0, r: 0, g: 0, b: 0 }) };
}

export function setLedbarState(lessonId: string, state: LedbarState): void {
    states.set(lessonId, { ...state });
}

/** Lua gives a channel as 0..1, Python as 0..255. */
export function channelMax(track: Track): number {
    return track === 'lua' ? 1 : 255;
}

function format(value: number, track: Track): string {
    return track === 'lua' ? String(Number(value.toFixed(2))) : String(Math.round(value));
}

export function ledbarCommand(track: Track, state: LedbarState): string {
    const args = [String(state.index), ...[state.r, state.g, state.b].map(value => format(value, track))].join(', ');
    return track === 'lua' ? `leds:set(${args})` : `pioneer.led_control(${args})`;
}

/** The lit colour of the lamp, or an empty string while every channel is off (the glass then stays unlit). */
export function ledbarColor(track: Track, state: LedbarState): string {
    if (state.r <= 0 && state.g <= 0 && state.b <= 0) return '';
    const max = channelMax(track);
    const level = (value: number) => Math.round(255 * Math.min(1, Math.max(0, value / max)));
    return `rgb(${level(state.r)}, ${level(state.g)}, ${level(state.b)})`;
}

/** What the mix is called, so the reader links three numbers to a colour. */
export function ledbarColorName(track: Track, state: LedbarState): string {
    const max = channelMax(track);
    const on = [state.r > 0, state.g > 0, state.b > 0];
    const count = on.filter(Boolean).length;
    if (count === 0) return 'выключено';
    const dim = [state.r, state.g, state.b].some((value, i) => on[i] && value < max * 0.999);
    const suffix = dim ? ', тусклее' : '';
    if (count === 3) return (state.r === state.g && state.g === state.b ? 'белый' : 'светлый оттенок') + suffix;
    if (count === 1) return (on[0] ? 'красный' : on[1] ? 'зелёный' : 'синий') + suffix;
    return (on[0] && on[1] ? 'жёлтый' : on[0] ? 'пурпурный' : 'бирюзовый') + suffix;
}

function cellX(index: number): number {
    return CELL_X0 + index * CELL_PITCH;
}

function lampStyle(track: Track, state: LedbarState, index: number): string {
    const color = ledbarColor(track, state);
    return index === state.index && color ? ` style="fill:${color}"` : '';
}

/** Markup of the figure; `syncLedbarFigure` keeps it in step with the knobs afterwards. */
export function renderLedbarFigure(track: Track, lessonId: string): string {
    const state = getLedbarState(lessonId);
    const max = channelMax(track);
    const step = track === 'lua' ? 0.05 : 1;
    const cells = Array.from({ length: LEDBAR_SIZE }, (_, index) => `<g transform="translate(${cellX(index)} 0)">
        <rect class="lb-body" x="-6.5" y="24" width="13" height="22" rx="3"/>
        <rect class="lb-lamp" data-lb-lamp="${index}" x="-4.5" y="26" width="9" height="18" rx="2"${lampStyle(track, state, index)}/>
        ${index % 5 === 0 || index === LEDBAR_SIZE - 1 ? `<text class="lb-tick" x="0" y="64">${index}</text>` : ''}
    </g>`).join('');
    const knobs = CHANNELS.map(([channel, label]) => `<label class="lb-knob"><span>${label}</span>
        <input type="range" data-lb="${channel}" min="0" max="${max}" step="${step}" value="${state[channel]}" aria-label="${label}: от 0 до ${max}">
        <output data-lb-out="${channel}">${format(state[channel], track)}</output></label>`).join('');
    return `<div class="lb" data-lb-figure data-lb-track="${track}" data-lb-lesson="${escapeHtml(lessonId)}">
        <svg class="lb__strip" viewBox="0 0 480 80" role="img" aria-label="Лента из ${LEDBAR_SIZE} светодиодов, выбрана лампочка ${state.index}">
            <rect class="lb-board" x="6" y="18" width="468" height="34" rx="7"/>
            ${cells}
            <polygon class="lb-pointer" points="-5,6 5,6 0,16" transform="translate(${cellX(state.index)} 0)"/>
        </svg>
        <div class="lb__panel">
            <div class="lb__swatch" data-lb-swatch ${ledbarColor(track, state) ? `style="background:${ledbarColor(track, state)}" ` : ''}aria-hidden="true"></div>
            <div class="lb__knobs">
                <label class="lb-knob"><span>Лампочка</span>
                    <input type="range" data-lb="index" min="0" max="${LEDBAR_SIZE - 1}" step="1" value="${state.index}" aria-label="Номер лампочки: от 0 до ${LEDBAR_SIZE - 1}">
                    <output data-lb-out="index">${state.index}</output></label>
                ${knobs}
            </div>
        </div>
        <p class="lb__line"><code data-lb-code>${escapeHtml(ledbarCommand(track, state))}</code><span data-lb-name>${ledbarColorName(track, state)}</span></p>
    </div>`;
}

/** Brings the drawing, the numbers and the command line to the state of the knobs. */
export function syncLedbarFigure(root: HTMLElement, track: Track, state: LedbarState): void {
    root.querySelectorAll<SVGRectElement>('[data-lb-lamp]').forEach(lamp => {
        lamp.style.fill = Number(lamp.dataset.lbLamp) === state.index ? ledbarColor(track, state) : '';
    });
    root.querySelector('.lb-pointer')?.setAttribute('transform', `translate(${cellX(state.index)} 0)`);
    root.querySelector('.lb__strip')?.setAttribute('aria-label', `Лента из ${LEDBAR_SIZE} светодиодов, выбрана лампочка ${state.index}`);
    const swatch = root.querySelector<HTMLElement>('[data-lb-swatch]');
    if (swatch) swatch.style.background = ledbarColor(track, state);
    const out = (name: string, text: string) => {
        const node = root.querySelector<HTMLElement>(`[data-lb-out="${name}"]`);
        if (node) node.textContent = text;
    };
    out('index', String(state.index));
    out('r', format(state.r, track));
    out('g', format(state.g, track));
    out('b', format(state.b, track));
    const code = root.querySelector<HTMLElement>('[data-lb-code]');
    if (code) code.textContent = ledbarCommand(track, state);
    const name = root.querySelector<HTMLElement>('[data-lb-name]');
    if (name) name.textContent = ledbarColorName(track, state);
}
