import type { ChannelTuning, TunedChannel } from '../../../core/state.js';
import { TUNING_LIMITS, applyCenteredTuning, applyRates, applyThrottleTuning, clampTuning, trimLimits } from '../input/tuning.js';
import { CHANNEL_LABELS } from './config.js';

/*
 * The fine-tuning screen, the last step of the wizard (like "fine tune" in a drone simulator): for each of the four flight
 * channels a live meter, the direction switch, the zero point and the dead zone. The meter shows what the stick reads
 * (the dot), where its zero is set (the line) and the dead zone around it (the shaded part): while the dot is inside the
 * shade the drone sees zero. The window behind shows the same sticks and the drone answering them.
 */

export const TUNING_CHANNELS: TunedChannel[] = ['throttle', 'yaw', 'pitch', 'roll'];

export interface TuningHandlers {
    getTuning(channel: TunedChannel): ChannelTuning;
    setTuning(channel: TunedChannel, tuning: ChannelTuning): void;
    resetTuning(channel: TunedChannel): void;
    getInverted(channel: TunedChannel): boolean;
    setInverted(channel: TunedChannel, inverted: boolean): void;
}

export interface TuningFrame {
    /** What each stick reads now, inverted as chosen but without trim and dead zone: -1..1, the throttle 0..1. Null while the channel has no input. */
    raw: Partial<Record<TunedChannel, number | null>>;
}

export interface TuningPanel {
    /** Every frame: moves the dots and shows the tuned value. */
    update(frame: TuningFrame): void;
    /** Re-reads the settings into the sliders and switches (after a reset, or when the screen is opened). */
    sync(): void;
}

interface Row {
    root: HTMLElement;
    invert: HTMLInputElement;
    value: HTMLElement;
    zero: HTMLElement;
    dots: HTMLElement;
    bands: HTMLElement[];
    trim: HTMLInputElement;
    trimOut: HTMLElement;
    dead: HTMLInputElement;
    deadOut: HTMLElement;
    expo: HTMLInputElement | null;
    expoOut: HTMLElement | null;
    rate: HTMLInputElement | null;
    rateOut: HTMLElement | null;
    curve: SVGPathElement | null;
    curveDot: SVGCircleElement | null;
    centerButton: HTMLButtonElement;
}

const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`;
const signedPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value * 100).toFixed(1)}%`;

export function createTuningPanel(root: HTMLElement, handlers: TuningHandlers): TuningPanel {
    root.replaceChildren();
    const rows = new Map<TunedChannel, Row>();
    const raws = new Map<TunedChannel, number | null>();

    for (const channel of TUNING_CHANNELS) {
        const throttle = channel === 'throttle';
        const limits = trimLimits(channel);
        const section = document.createElement('section');
        section.className = 'gp-tune';
        section.dataset.channel = channel;
        section.dataset.open = 'false';
        section.innerHTML = `
            <div class="gp-tune__head" role="button" tabindex="0" aria-expanded="false" aria-label="Настроить канал «${CHANNEL_LABELS[channel]}»">
                <span class="gp-tune__name">${CHANNEL_LABELS[channel]}</span>
                <div class="gp-tune__meter" aria-hidden="true">
                    <i class="gp-tune__band"></i><i class="gp-tune__band"></i>
                    <i class="gp-tune__zero"></i>
                    <span class="gp-tune__dots"><i></i></span>
                </div>
                <output class="gp-tune__value">0%</output>
                <svg class="gp-tune__chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>
            </div>
            <div class="gp-tune__details">
                <label class="gp-wizard-invert gp-tune__invert">
                    <input type="checkbox" aria-label="Инвертировать канал «${CHANNEL_LABELS[channel]}»">
                    <span class="gp-wizard-invert__switch" aria-hidden="true"></span>
                    <span class="gp-wizard-invert__text">Инвертировать направление</span>
                </label>
                <label class="gp-tune__slider"><span>Нулевая точка</span>
                    <input type="range" data-key="trim" min="${limits.min}" max="${limits.max}" step="${limits.step}">
                    <output></output></label>
                <label class="gp-tune__slider"><span>Мёртвая зона</span>
                    <input type="range" data-key="deadzone" min="${TUNING_LIMITS.deadzone.min}" max="${TUNING_LIMITS.deadzone.max}" step="${TUNING_LIMITS.deadzone.step}">
                    <output></output></label>
                ${throttle ? '' : `
                <label class="gp-tune__slider"><span>Экспо</span>
                    <input type="range" data-key="expo" min="${TUNING_LIMITS.expo.min}" max="${TUNING_LIMITS.expo.max}" step="${TUNING_LIMITS.expo.step}">
                    <output></output></label>
                <label class="gp-tune__slider"><span>Рейт</span>
                    <input type="range" data-key="rate" min="${TUNING_LIMITS.rate.min}" max="${TUNING_LIMITS.rate.max}" step="${TUNING_LIMITS.rate.step}">
                    <output></output></label>
                <svg class="gp-tune__curve" viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label="Как стик превращается в команду дрону">
                    <path class="gp-tune__curve-axis" d="M-1 0H1M0 -1V1"/>
                    <path class="gp-tune__curve-line" d=""/>
                    <circle class="gp-tune__curve-dot" r="0.07" cx="0" cy="0"/>
                </svg>`}
                <div class="gp-tune__buttons">
                    <button type="button" class="gp-tune__button" data-act="center" title="${throttle ? 'Опустите стик газа вниз, затем нажмите: это положение станет нулём' : 'Отпустите стик, затем нажмите: его положение станет нулём'}">Нуль по стику</button>
                    <button type="button" class="gp-tune__button" data-act="reset" title="Вернуть настройки этого канала">Сброс</button>
                </div>
            </div>`;
        root.append(section);

        const row: Row = {
            root: section,
            invert: section.querySelector<HTMLInputElement>('.gp-tune__invert input')!,
            value: section.querySelector<HTMLElement>('.gp-tune__value')!,
            zero: section.querySelector<HTMLElement>('.gp-tune__zero')!,
            dots: section.querySelector<HTMLElement>('.gp-tune__dots i')!,
            bands: [...section.querySelectorAll<HTMLElement>('.gp-tune__band')],
            trim: section.querySelector<HTMLInputElement>('input[data-key="trim"]')!,
            trimOut: section.querySelectorAll<HTMLElement>('output')[1]!,
            dead: section.querySelector<HTMLInputElement>('input[data-key="deadzone"]')!,
            deadOut: section.querySelectorAll<HTMLElement>('output')[2]!,
            expo: section.querySelector<HTMLInputElement>('input[data-key="expo"]'),
            expoOut: section.querySelectorAll<HTMLElement>('output')[3] ?? null,
            rate: section.querySelector<HTMLInputElement>('input[data-key="rate"]'),
            rateOut: section.querySelectorAll<HTMLElement>('output')[4] ?? null,
            curve: section.querySelector<SVGPathElement>('.gp-tune__curve-line'),
            curveDot: section.querySelector<SVGCircleElement>('.gp-tune__curve-dot'),
            centerButton: section.querySelector<HTMLButtonElement>('[data-act="center"]')!
        };
        rows.set(channel, row);
        raws.set(channel, null);

        // One channel is open at a time: the rest stay a single line, so the screen stays calm and the drone stays visible.
        const head = section.querySelector<HTMLElement>('.gp-tune__head')!;
        const toggle = () => {
            const open = section.dataset.open !== 'true';
            for (const other of root.children) { (other as HTMLElement).dataset.open = 'false'; other.querySelector('.gp-tune__head')?.setAttribute('aria-expanded', 'false'); }
            section.dataset.open = String(open);
            head.setAttribute('aria-expanded', String(open));
        };
        head.addEventListener('click', toggle);
        head.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
        });
        row.invert.addEventListener('change', () => handlers.setInverted(channel, row.invert.checked));
        const edit = () => {
            const current = handlers.getTuning(channel);
            const next = clampTuning(channel, {
                trim: Number(row.trim.value),
                deadzone: Number(row.dead.value),
                expo: row.expo ? Number(row.expo.value) : current.expo,
                rate: row.rate ? Number(row.rate.value) : current.rate
            });
            handlers.setTuning(channel, next);
            layout(channel, row);
        };
        row.trim.addEventListener('input', edit);
        row.dead.addEventListener('input', edit);
        row.expo?.addEventListener('input', edit);
        row.rate?.addEventListener('input', edit);
        section.querySelector('[data-act="reset"]')?.addEventListener('click', () => { handlers.resetTuning(channel); sync(); });
        row.centerButton.addEventListener('click', () => {
            const raw = raws.get(channel);
            if (raw === null || raw === undefined) return;
            const current = handlers.getTuning(channel);
            handlers.setTuning(channel, clampTuning(channel, { ...current, trim: Math.round(raw * 200) / 200 }));
            sync();
        });
    }

    /** Where a value of the stick sits along the meter, 0..100 (%). */
    const position = (channel: TunedChannel, value: number) => (channel === 'throttle' ? value : (value + 1) / 2) * 100;

    /** Draws the zero line and the shaded dead zone from the settings. */
    function layout(channel: TunedChannel, row: Row): void {
        const tuning = handlers.getTuning(channel);
        const throttle = channel === 'throttle';
        const set = (element: HTMLElement, a: number, b: number) => {
            const left = Math.max(0, Math.min(100, Math.min(a, b)));
            const right = Math.max(0, Math.min(100, Math.max(a, b)));
            element.style.left = `${left}%`;
            element.style.width = `${Math.max(0, right - left)}%`;
        };
        row.zero.style.left = `${position(channel, tuning.trim)}%`;
        row.zero.hidden = false;
        if (throttle) {
            // The bottom dead zone ends where the drone starts to feel the stick; the top one is where full throttle begins.
            set(row.bands[0], 0, position(channel, tuning.trim + tuning.deadzone * (1 - tuning.trim)));
            set(row.bands[1], position(channel, tuning.trim + (1 - tuning.deadzone) * (1 - tuning.trim)), 100);
            row.bands[1].hidden = false;
        } else {
            set(row.bands[0], position(channel, tuning.trim - tuning.deadzone * (1 + tuning.trim)), position(channel, tuning.trim + tuning.deadzone * (1 - tuning.trim)));
            row.bands[1].hidden = true;
        }
        row.trimOut.textContent = throttle ? percent(tuning.trim, 1) : signedPercent(tuning.trim);
        row.deadOut.textContent = percent(tuning.deadzone, 1);
        if (row.expo && row.rate && row.expoOut && row.rateOut) {
            row.expoOut.textContent = percent(tuning.expo);
            row.rateOut.textContent = percent(tuning.rate);
            // The response of the stick: what it reads (across) against what the drone is told (up).
            const points: string[] = [];
            for (let i = 0; i <= 40; i += 1) {
                const x = -1 + i / 20;
                points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${(-applyRates(x, tuning.expo, tuning.rate)).toFixed(3)}`);
            }
            row.curve?.setAttribute('d', points.join(' '));
        }
    }

    function sync(): void {
        for (const [channel, row] of rows) {
            const tuning = handlers.getTuning(channel);
            if (document.activeElement !== row.trim) row.trim.value = String(tuning.trim);
            if (document.activeElement !== row.dead) row.dead.value = String(tuning.deadzone);
            if (row.expo && document.activeElement !== row.expo) row.expo.value = String(tuning.expo);
            if (row.rate && document.activeElement !== row.rate) row.rate.value = String(tuning.rate);
            row.invert.checked = handlers.getInverted(channel);
            layout(channel, row);
        }
    }

    return {
        sync,
        update(frame) {
            for (const [channel, row] of rows) {
                const raw = frame.raw[channel] ?? null;
                raws.set(channel, raw);
                row.centerButton.disabled = raw === null;
                row.root.dataset.live = String(raw !== null);
                if (raw === null) {
                    row.value.textContent = '—';
                    row.dots.style.left = `${position(channel, channel === 'throttle' ? 0 : 0)}%`;
                    continue;
                }
                const tuning = handlers.getTuning(channel);
                const tuned = channel === 'throttle' ? applyThrottleTuning(raw, tuning) : applyCenteredTuning(raw, tuning);
                const left = `${position(channel, raw).toFixed(1)}%`;
                if (row.dots.style.left !== left) row.dots.style.left = left;
                row.root.dataset.dead = String(tuned === 0);
                if (row.curveDot) {
                    // The dot of the curve: where the current stick position lands on it.
                    const shapedIn = Math.max(-1, Math.min(1, raw));
                    row.curveDot.setAttribute('cx', shapedIn.toFixed(3));
                    row.curveDot.setAttribute('cy', (-tuned).toFixed(3));
                }
                const shownValue = tuned;
                const text = channel === 'throttle' ? percent(tuned) : (shownValue > 0 ? '+' : shownValue < 0 ? '−' : '') + percent(Math.abs(tuned));
                if (row.value.textContent !== text) row.value.textContent = text;
            }
        }
    };
}
