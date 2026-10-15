import {
    allowedWeather, formatHour, SEASONS, SEASON_LABELS, WEATHER_LABELS, type Season, type Weather
} from '../world/atmosphere-model.js';
import { getAtmosphere, initAtmosphere, setAtmosphere, subscribeAtmosphere } from '../world/atmosphere.js';

/*
 * "Окружение": one secondary button in the viewport's bottom camera-control row and a small popover with the time of day, the season and the
 * weather. Lighting defaults to the laboratory look; the day cycle is opt-in so existing lessons look as before.
 */

function segmented<T extends string>(name: string, options: Array<{ value: T; label: string }>): string {
    return `<div class="env-segment" role="radiogroup" aria-label="${name}">${options.map(o =>
        `<button type="button" role="radio" class="env-segment__btn" data-value="${o.value}" aria-checked="false">${o.label}</button>`).join('')}</div>`;
}

export function initEnvironmentControl(): void {
    const row = document.getElementById('viewport-scene-actions');
    const container = document.querySelector('.scene-container');
    if (!row || !container || document.getElementById('environment-btn')) return;
    initAtmosphere();

    const button = document.createElement('button');
    button.type = 'button'; button.id = 'environment-btn'; button.className = 'pk-seg__btn scene-hotbar-toggle-btn environment-btn';
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false');
    button.title = 'Время суток, сезон и погода';
    button.textContent = 'Окружение';
    row.appendChild(button);

    const popover = document.createElement('div');
    popover.id = 'environment-popover'; popover.className = 'environment-popover'; popover.hidden = true;
    popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', 'Окружение');
    popover.innerHTML = `
        <div class="environment-popover__head"><strong>Окружение</strong><span id="env-clock" class="environment-popover__clock"></span></div>
        <div class="env-field"><span class="env-field__label">Освещение</span>${segmented('Освещение', [{ value: 'theme', label: 'Как в лаборатории' }, { value: 'clock', label: 'Смена суток' }])}</div>
        <div class="env-field" id="env-time-field">
            <div class="env-field__row"><label class="env-field__label" for="env-hour">Время суток</label>
                <button type="button" id="env-auto" class="env-toggle" aria-pressed="false">Идёт время</button></div>
            <input id="env-hour" class="env-slider" type="range" min="0" max="24" step="0.25" aria-describedby="env-clock">
            <div class="env-slider__scale" aria-hidden="true"><span>Ночь</span><span>Утро</span><span>День</span><span>Вечер</span><span>Ночь</span></div>
        </div>
        <div class="env-field"><span class="env-field__label">Сезон</span>${segmented('Сезон', SEASONS.map(s => ({ value: s, label: SEASON_LABELS[s] })))}</div>
        <div class="env-field"><span class="env-field__label">Погода</span><div id="env-weather"></div></div>`;
    container.appendChild(popover);

    const query = <T extends HTMLElement>(selector: string) => popover.querySelector(selector) as T;
    const slider = query<HTMLInputElement>('#env-hour');
    const autoBtn = query<HTMLButtonElement>('#env-auto');
    const weatherHost = query<HTMLElement>('#env-weather');

    const renderWeather = (season: Season) => {
        const options = allowedWeather(season).map(w => ({ value: w, label: WEATHER_LABELS[w] }));
        weatherHost.innerHTML = segmented('Погода', options);
    };

    let renderedSeason: Season | null = null;
    const render = () => {
        const s = getAtmosphere();
        if (renderedSeason !== s.season) { renderWeather(s.season); renderedSeason = s.season; }
        query('#env-clock').textContent = s.mode === 'clock' ? formatHour(s.hour) : 'свет по теме';
        if (document.activeElement !== slider) slider.value = String(s.hour);
        const clock = s.mode === 'clock';
        slider.disabled = !clock; autoBtn.disabled = !clock;
        autoBtn.setAttribute('aria-pressed', String(s.auto && clock));
        autoBtn.textContent = s.auto && clock ? 'Остановить время' : 'Идёт время';
        popover.querySelectorAll<HTMLButtonElement>('.env-segment__btn').forEach(btn => {
            const group = btn.closest('.env-segment')!.getAttribute('aria-label');
            const value = group === 'Освещение' ? s.mode : group === 'Сезон' ? s.season : s.weather;
            btn.setAttribute('aria-checked', String(btn.dataset.value === value));
        });
        popover.querySelector('#env-time-field')?.classList.toggle('is-off', !clock);
    };

    popover.addEventListener('click', event => {
        const btn = (event.target as HTMLElement).closest('.env-segment__btn') as HTMLButtonElement | null;
        if (btn) {
            const group = btn.closest('.env-segment')!.getAttribute('aria-label');
            const value = btn.dataset.value!;
            if (group === 'Освещение') setAtmosphere({ mode: value as 'theme' | 'clock' });
            else if (group === 'Сезон') setAtmosphere({ season: value as Season });
            else setAtmosphere({ weather: value as Weather });
            return;
        }
        if ((event.target as HTMLElement).closest('#env-auto')) setAtmosphere({ auto: !getAtmosphere().auto });
    });
    slider.addEventListener('input', () => setAtmosphere({ hour: Number(slider.value), auto: false }));

    const positionPopover = () => {
        const bounds = container.getBoundingClientRect();
        const controls = row.closest('.viewport-camera-controls-row')?.getBoundingClientRect();
        if (!controls || !bounds.height) return;
        const bottom = Math.max(14, bounds.bottom - controls.top + 10);
        popover.style.bottom = `${bottom}px`;
        popover.style.maxHeight = `${Math.max(100, bounds.height - bottom - 14)}px`;
    };
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => { if (!popover.hidden) positionPopover(); });
        observer.observe(container);
        if (row.parentElement) observer.observe(row.parentElement);
    }
    const setOpen = (open: boolean) => {
        if (open) positionPopover();
        popover.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        button.classList.toggle('is-active', open);
        if (open) render();
    };
    button.addEventListener('click', () => setOpen(popover.hidden));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !popover.hidden) { setOpen(false); button.focus(); } });
    document.addEventListener('pointerdown', event => {
        if (popover.hidden) return;
        const target = event.target as Node;
        if (!popover.contains(target) && !button.contains(target)) setOpen(false);
    });

    subscribeAtmosphere(() => { if (!popover.hidden) render(); });
}
