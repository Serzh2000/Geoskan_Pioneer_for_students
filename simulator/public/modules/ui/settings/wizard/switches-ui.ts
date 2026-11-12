import { saveGamepadSettings, simSettings, matchesAuxRange, type AuxChannelRange, type GamepadInputRef } from '../../../core/state.js';
import { SETTINGS_CHANGED_EVENT } from './config.js';
import { getChannelInversionIndex } from '../constants.js';
import { readRefRcValue } from '../input/values.js';
import { formatRefLabel } from './summary.js';
import { FUNCTIONS, type FunctionSpec, type RangeSpec } from './switches-spec.js';
import type { ChannelKey } from '../types.js';

/*
 * The switches screen: what each switch of the transmitter does, set the way a flight controller's modes page does it.
 * Every function (arm, flight mode, magnet) listens to one input, and is "on" while that input is inside a range of
 * 1000-2000. The range is taken from the switch itself: put it where the function should be on and press "Take position".
 * The live bar shows the switch, the ranges and which one is active, so the setting can be checked by flipping the switch.
 */

const PRIMARY: Array<{ channel: ChannelKey; label: string; ref(): GamepadInputRef }> = [
    { channel: 'throttle', label: 'газ', ref: () => simSettings.gamepadMapping.throttle },
    { channel: 'yaw', label: 'рыскание', ref: () => simSettings.gamepadMapping.yaw },
    { channel: 'pitch', label: 'тангаж', ref: () => simSettings.gamepadMapping.pitch },
    { channel: 'roll', label: 'крен', ref: () => simSettings.gamepadMapping.roll }
];

const LISTEN_MS = 10000;
/** How far a switch must travel (of 1000 RC units) to be taken as the one the student flipped. */
const LISTEN_TRAVEL = 400;
const RC_MIN = 900;
const RC_MAX = 2100;

/** The range a switch position stands for: the usual thirds of a three-position switch, else a window around it. */
export function rangeAround(value: number): AuxChannelRange {
    if (Math.abs(value - 1000) <= 120) return { min: 900, max: 1250, center: 1000 };
    if (Math.abs(value - 1500) <= 120) return { min: 1251, max: 1750, center: 1500 };
    if (Math.abs(value - 2000) <= 120) return { min: 1751, max: 2100, center: 2000 };
    return { min: Math.max(RC_MIN, Math.round(value - 200)), max: Math.min(RC_MAX, Math.round(value + 200)), center: Math.round(value) };
}

const clampRange = (min: number, max: number): AuxChannelRange => {
    const a = Math.max(RC_MIN, Math.min(RC_MAX, Math.round(Math.min(min, max))));
    const b = Math.max(RC_MIN, Math.min(RC_MAX, Math.round(Math.max(min, max))));
    return { min: a, max: b, center: Math.round((a + b) / 2) };
};

export interface SwitchesPanel {
    /** Every frame: the live bar, the active range and the search for the flipped switch. */
    update(gp: Gamepad | null): void;
    /** Re-reads the settings into the fields (when the screen is opened). */
    sync(): void;
}

interface Card {
    spec: FunctionSpec;
    root: HTMLElement;
    select: HTMLSelectElement;
    note: HTMLElement;
    state: HTMLElement;
    live: HTMLElement;
    listenButton: HTMLButtonElement;
    invert: HTMLInputElement;
    bands: HTMLElement[];
    rows: Array<{ spec: RangeSpec; root: HTMLElement; min: HTMLInputElement; max: HTMLInputElement; take: HTMLButtonElement }>;
    optionsKey: string;
    lastRc: number | null;
    message: string;
}

const position = (rc: number) => Math.max(0, Math.min(100, ((rc - 1000) / 1000) * 100));

export function createSwitchesPanel(root: HTMLElement): SwitchesPanel {
    root.replaceChildren();
    const cards: Card[] = [];
    let listening: { card: Card; base: Map<GamepadInputRef, number>; until: number } | null = null;

    const changed = () => {
        saveGamepadSettings();
        window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
    };

    for (const spec of FUNCTIONS) {
        const section = document.createElement('section');
        section.className = 'gp-sw';
        section.dataset.fn = spec.id;
        section.innerHTML = `
            <header class="gp-sw__head">
                <div class="gp-sw__title"><b>${spec.title}</b><small>${spec.about}</small></div>
                <span class="gp-sw__state" data-on="false">—</span>
            </header>
            <div class="gp-sw__source">
                <select aria-label="Вход для функции «${spec.title}»"></select>
                <button type="button" class="gp-tune__button" data-act="listen" title="Нажмите и переключите тумблер, который хотите использовать">Определить</button>
            </div>
            <p class="gp-sw__note" role="status"></p>
            <div class="gp-sw__bar" aria-hidden="true">
                ${spec.ranges.map((_, i) => `<i class="gp-sw__band" data-i="${i}"></i>`).join('')}
                <span class="gp-sw__live"></span>
            </div>
            <div class="gp-sw__ranges">
                ${spec.ranges.map((range, i) => `
                    <div class="gp-sw__range" data-i="${i}" data-range="${range.id}" data-active="false">
                        <span class="gp-sw__dot" aria-hidden="true"></span>
                        <span class="gp-sw__label">${range.label}${range.hint ? ` <small>${range.hint}</small>` : ''}</span>
                        <span class="gp-sw__edges">
                            <input type="number" data-edge="min" min="${RC_MIN}" max="${RC_MAX}" step="10" aria-label="${range.label}: от">
                            <span aria-hidden="true">–</span>
                            <input type="number" data-edge="max" min="${RC_MIN}" max="${RC_MAX}" step="10" aria-label="${range.label}: до">
                        </span>
                        <button type="button" class="gp-tune__button" data-act="take" title="Поставьте тумблер в нужное положение и нажмите">Взять положение</button>
                    </div>`).join('')}
            </div>
            <label class="gp-wizard-invert gp-tune__invert">
                <input type="checkbox" aria-label="Перевернуть направление: ${spec.title}">
                <span class="gp-wizard-invert__switch" aria-hidden="true"></span>
                <span class="gp-wizard-invert__text">Перевернуть направление тумблера</span>
            </label>`;
        root.append(section);

        const card: Card = {
            spec,
            root: section,
            select: section.querySelector('select')!,
            note: section.querySelector('.gp-sw__note')!,
            state: section.querySelector('.gp-sw__state')!,
            live: section.querySelector('.gp-sw__live')!,
            listenButton: section.querySelector('[data-act="listen"]')!,
            invert: section.querySelector('.gp-tune__invert input')!,
            bands: [...section.querySelectorAll<HTMLElement>('.gp-sw__band')],
            rows: spec.ranges.map((range, i) => {
                const row = section.querySelector<HTMLElement>(`.gp-sw__range[data-i="${i}"]`)!;
                return {
                    spec: range,
                    root: row,
                    min: row.querySelector<HTMLInputElement>('[data-edge="min"]')!,
                    max: row.querySelector<HTMLInputElement>('[data-edge="max"]')!,
                    take: row.querySelector<HTMLButtonElement>('[data-act="take"]')!
                };
            }),
            optionsKey: '',
            lastRc: null,
            message: ''
        };
        cards.push(card);

        card.select.addEventListener('change', () => {
            simSettings.gamepadMapping[spec.mapKey] = card.select.value as GamepadInputRef;
            card.message = '';
            changed();
        });
        card.invert.addEventListener('change', () => {
            const index = getChannelInversionIndex(spec.id);
            if (index >= 0) simSettings.gamepadInversion[index] = card.invert.checked;
            changed();
        });
        card.listenButton.addEventListener('click', () => {
            listening = { card, base: new Map(), until: performance.now() + LISTEN_MS };
            card.message = '';
        });
        for (const row of card.rows) {
            const edit = () => {
                row.spec.set(clampRange(Number(row.min.value), Number(row.max.value)));
                layout(card);
                changed();
            };
            row.min.addEventListener('change', edit);
            row.max.addEventListener('change', edit);
            row.take.addEventListener('click', () => {
                if (card.lastRc === null) {
                    card.message = 'Пульт не виден: подключите его и подвигайте тумблер.';
                    return;
                }
                row.spec.set(rangeAround(card.lastRc));
                card.message = '';
                layout(card);
                changed();
            });
        }
    }

    /** Who else uses an input: the flight sticks (not allowed for a switch) or another function (allowed, but said). */
    const usedBy = (ref: GamepadInputRef, except: FunctionSpec) => {
        const stick = PRIMARY.find((item) => item.ref() === ref);
        if (stick) return { kind: 'stick' as const, label: stick.label };
        const other = FUNCTIONS.find((fn) => fn !== except && simSettings.gamepadMapping[fn.mapKey] === ref);
        return other ? { kind: 'function' as const, label: other.title.toLowerCase() } : null;
    };

    function layout(card: Card): void {
        for (const [i, row] of card.rows.entries()) {
            const range = row.spec.get();
            if (document.activeElement !== row.min) row.min.value = String(range.min);
            if (document.activeElement !== row.max) row.max.value = String(range.max);
            const low = position(Math.min(range.min, range.max));
            const high = position(Math.max(range.min, range.max));
            card.bands[i].style.left = `${low}%`;
            card.bands[i].style.width = `${Math.max(1.5, high - low)}%`;
        }
    }

    function renderOptions(card: Card, gp: Gamepad | null): void {
        const refs: GamepadInputRef[] = gp
            ? [...gp.axes.map((_, i) => `a${i}` as GamepadInputRef), ...gp.buttons.map((_, i) => `b${i}` as GamepadInputRef)]
            : [];
        const current = simSettings.gamepadMapping[card.spec.mapKey];
        if (!refs.includes(current)) refs.unshift(current);
        const items = refs.map((ref) => ({ ref, use: usedBy(ref, card.spec) }));
        const key = `${current}|${items.map((item) => `${item.ref}${item.use?.kind ?? ''}${item.use?.label ?? ''}`).join(',')}`;
        if (key === card.optionsKey) return;
        card.optionsKey = key;
        card.select.replaceChildren(...items.map(({ ref, use }) => {
            const option = document.createElement('option');
            option.value = ref;
            option.textContent = formatRefLabel(ref) + (use ? (use.kind === 'stick' ? ` — стик «${use.label}»` : ` — тоже «${use.label}»`) : '');
            option.disabled = use?.kind === 'stick' && ref !== current;
            return option;
        }));
        card.select.value = current;
    }

    function sync(): void {
        listening = null;
        for (const card of cards) {
            card.message = '';
            card.optionsKey = '';
            const index = getChannelInversionIndex(card.spec.id);
            card.invert.checked = index >= 0 && !!simSettings.gamepadInversion[index];
            layout(card);
        }
    }

    function update(gp: Gamepad | null): void {
        const now = performance.now();

        // Looking for the flipped switch: whichever input travels furthest, but never a flight stick.
        if (listening && (!gp || now > listening.until)) {
            listening.card.message = gp ? 'Не заметил переключения. Нажмите «Определить» и переключите тумблер.' : 'Пульт не виден: подключите его и подвигайте тумблер.';
            listening = null;
        }
        if (listening && gp) {
            const { card, base } = listening;
            let best: { ref: GamepadInputRef; travel: number } | null = null;
            let stickTouched: string | null = null;
            const refs: GamepadInputRef[] = [...gp.axes.map((_, i) => `a${i}` as GamepadInputRef), ...gp.buttons.map((_, i) => `b${i}` as GamepadInputRef)];
            for (const ref of refs) {
                const rc = readRefRcValue(gp, ref, card.spec.id);
                if (!base.has(ref)) { base.set(ref, rc); continue; }
                const travel = Math.abs(rc - (base.get(ref) ?? rc));
                if (travel < LISTEN_TRAVEL) continue;
                const use = usedBy(ref, card.spec);
                if (use?.kind === 'stick') { stickTouched = use.label; continue; }
                if (!best || travel > best.travel) best = { ref, travel };
            }
            if (best) {
                simSettings.gamepadMapping[card.spec.mapKey] = best.ref;
                const use = usedBy(best.ref, card.spec);
                card.message = `Назначено: ${formatRefLabel(best.ref)}.${use ? ` Он же отвечает за «${use.label}»: у функций будут разные положения.` : ''} Теперь поставьте тумблер туда, где функция должна работать, и нажмите «Взять положение».`;
                listening = null;
                changed();
            } else if (stickTouched) {
                card.message = `Это стик «${stickTouched}», он занят полётом. Переключите тумблер.`;
            }
        }

        for (const card of cards) {
            renderOptions(card, gp);
            const isListening = listening?.card === card;
            card.listenButton.dataset.listening = String(isListening);
            if (card.listenButton.textContent !== (isListening ? 'Переключите тумблер…' : 'Определить')) card.listenButton.textContent = isListening ? 'Переключите тумблер…' : 'Определить';

            const ref = simSettings.gamepadMapping[card.spec.mapKey];
            const rc = gp ? readRefRcValue(gp, ref, card.spec.id) : null;
            card.lastRc = rc;
            card.live.style.opacity = rc === null ? '0' : '1';
            if (rc !== null) card.live.style.left = `${position(rc).toFixed(1)}%`;

            let active: RangeSpec | null = null;
            for (const row of card.rows) {
                const on = rc !== null && matchesAuxRange(rc, row.spec.get());
                if (on && !active) active = row.spec;
                const flag = String(on);
                if (row.root.dataset.active !== flag) row.root.dataset.active = flag;
                row.take.disabled = rc === null;
            }
            const text = rc === null ? '—' : `${card.spec.stateOn(active)} · ${Math.round(rc)}`;
            if (card.state.textContent !== text) card.state.textContent = text;
            card.state.dataset.on = String(rc !== null && active !== null);

            // The note: the search first, then what the student last did, then a warning about the ranges themselves.
            const overlap = card.rows.length > 1 && card.rows.some((a, i) => card.rows.some((b, j) => j > i && Math.max(a.spec.get().min, b.spec.get().min) < Math.min(a.spec.get().max, b.spec.get().max)));
            // While searching, a warning (a flight stick was touched) is shown instead of the invitation to flip the switch.
            const note = isListening
                ? card.message || 'Переключите тумблер, который хотите использовать…'
                : card.message || (overlap ? 'Положения режимов пересекаются: дрон выберет первый подходящий. Поправьте границы.' : '');
            if (card.note.textContent !== note) card.note.textContent = note;
            card.note.dataset.tone = isListening && !card.message ? 'listening' : card.message.startsWith('Назначено') ? 'ok' : note ? 'warn' : '';
        }
    }

    sync();
    return { update, sync };
}
