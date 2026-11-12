/**
 * Окно «Что будем изучать?»: шесть карточек, дрон и способ программирования на каждой. Открывается при входе в обучение
 * и кнопкой «Сменить» в окне миссии. Только здесь меняется дрон и язык обучения, поэтому выбор виден сразу и понятен.
 */
import { renderDronePreview } from '../drone-model/preview.js';
import { CHOICES, type Choice, type ChoiceId } from './track-choice.js';

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Какая модель на карточке: Базовый, Базовый с модулем Radxa (SDK 2) или Мини 2. Картинки рисуются из настоящих GLB дрона. */
type PreviewKind = 'basic' | 'basic-radxa' | 'mini2';
const previewKind = (choice: Choice): PreviewKind => choice.model === 'pioneer-mini2' ? 'mini2' : 'basic';

/** Значок языка в круге: показывает, чем пишем программу. */
const BADGE: Record<ChoiceId, string> = {
    'basic-blocks': `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="7" width="15" height="9" rx="2.500" fill="currentColor"/><rect x="14" y="16.500" width="15" height="9" rx="2.500" fill="currentColor" opacity=".75"/><rect x="9" y="26" width="15" height="9" rx="2.500" fill="currentColor" opacity=".5"/></svg>`,
    'basic-lua': `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M26 9a12 12 0 1 0 5 20 10 10 0 0 1-5-20z" fill="currentColor"/><circle cx="29" cy="11" r="3.200" fill="currentColor" opacity=".7"/></svg>`,
    'basic-sdk1': `<svg viewBox="0 0 40 40" aria-hidden="true"><text x="20" y="19" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor">Py</text><text x="20" y="34" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor" opacity=".8">SDK1</text></svg>`,
    'basic-sdk2': `<svg viewBox="0 0 40 40" aria-hidden="true"><text x="20" y="19" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor">Py</text><text x="20" y="34" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor" opacity=".8">SDK2</text></svg>`,
    'mini2-python': `<svg viewBox="0 0 40 40" aria-hidden="true"><text x="20" y="19" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor">Py</text><text x="20" y="34" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor" opacity=".8">SDK2</text></svg>`,
    'mini2-bricks': `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="8" width="12" height="12" rx="2.500" fill="currentColor"/><rect x="21" y="8" width="12" height="12" rx="2.500" fill="currentColor" opacity=".7"/><rect x="7" y="22" width="12" height="12" rx="2.500" fill="currentColor" opacity=".7"/><rect x="21" y="22" width="12" height="12" rx="2.500" fill="currentColor" opacity=".45"/></svg>`
};

/** Подпись модуля под значком: какая плата на дроне запускает программу. Без подписи программа идёт в самом симуляторе или в Геоскане. */
const MODULE_LABEL: Partial<Record<ChoiceId, string>> = {
    'basic-sdk1': '+ ESP32',
    'basic-sdk2': '+ Radxa Zero 3W'
};

export type PickerProgress = Partial<Record<ChoiceId, { done: number; total: number }>>;

type PickerOptions = {
    /** Выбранное сейчас (подсвечивается, на нём фокус). */
    current: ChoiceId | null;
    /** Сколько миссий пройдено на каждом варианте. */
    progress?: PickerProgress;
    /** Первый вход в обучение: вместо «Закрыть» окно предлагает вернуться в свободный режим. */
    entering?: boolean;
};

function card(choice: Choice, options: PickerOptions): string {
    const mini = choice.model === 'pioneer-mini2';
    const current = options.current === choice.id;
    const stat = options.progress?.[choice.id];
    const percent = stat && stat.total ? Math.round((stat.done / stat.total) * 100) : 0;
    return `<button type="button" class="tp-card${current ? ' is-current' : ''}" data-choice="${choice.id}" data-model="${mini ? 'mini2' : 'basic'}" aria-pressed="${current}">
        <span class="tp-card__art"><img class="tp-drone" data-preview="${previewKind(choice)}" alt="" width="480" height="300" hidden><span class="tp-card__badge">${BADGE[choice.id]}</span>${MODULE_LABEL[choice.id] ? `<span class="tp-card__module">${MODULE_LABEL[choice.id]}</span>` : ''}</span>
        <span class="tp-card__title">${esc(choice.title)}</span>
        <span class="tp-card__text">${esc(choice.text)}</span>
        ${stat ? `<span class="tp-card__progress"><span class="tp-card__bar"><i style="width:${percent}%"></i></span><span>${stat.done} из ${stat.total}</span></span>` : ''}
        ${current ? '<span class="tp-card__now">Сейчас</span>' : ''}
    </button>`;
}

/** Показывает окно выбора. Возвращает выбранный вариант или null, если окно закрыли. */
export function showTrackPicker(options: PickerOptions): Promise<Choice | null> {
    return new Promise((resolve) => {
        const previous = document.activeElement as HTMLElement | null;
        const back = document.createElement('div');
        back.className = 'tp-back';
        const basic = CHOICES.filter((choice) => choice.model === 'pioneer-basic');
        const mini = CHOICES.filter((choice) => choice.model === 'pioneer-mini2');
        back.innerHTML = `<div class="tp" role="dialog" aria-modal="true" aria-labelledby="tp-title">
            <header class="tp__head">
                <div><h2 id="tp-title">Что будем изучать?</h2>
                <p>Выберите дрона и способ программирования. Поменять выбор можно здесь же: кнопка «Сменить» есть в окне миссии.</p></div>
                <button type="button" class="tp__close" data-tp-close aria-label="${options.entering ? 'Вернуться в симулятор' : 'Закрыть окно'}" title="${options.entering ? 'Вернуться в симулятор' : 'Закрыть'}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
            </header>
            <section class="tp__row" aria-label="Пионер Базовый"><h3>Пионер Базовый</h3><div class="tp__cards tp__cards--4">${basic.map((choice) => card(choice, options)).join('')}</div></section>
            <section class="tp__row" aria-label="Пионер Мини 2"><h3>Пионер Мини 2</h3><div class="tp__cards tp__cards--2">${mini.map((choice) => card(choice, options)).join('')}</div></section>
        </div>`;
        const finish = (choice: Choice | null) => {
            document.removeEventListener('keydown', onKey, true);
            back.remove();
            previous?.focus?.({ preventScroll: true });
            resolve(choice);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(null); return; }
            if (event.key !== 'Tab') return;
            const items = [...back.querySelectorAll<HTMLElement>('button')];
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        back.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-tp-close]') || target === back) { finish(null); return; }
            const button = target.closest<HTMLElement>('[data-choice]');
            const picked = CHOICES.find((choice) => choice.id === button?.dataset.choice);
            if (picked) finish(picked);
        });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(back);
        // Картинки появляются по мере готовности: окно открывается сразу, а модели грузятся в фоне.
        for (const kind of ['basic', 'mini2'] as const) {
            void renderDronePreview({ model: kind === 'mini2' ? 'pioneer-mini2' : 'pioneer-basic', radxa: false }).then((url) => {
                if (!url) return;
                back.querySelectorAll<HTMLImageElement>(`img[data-preview="${kind}"]`).forEach((image) => { image.src = url; image.hidden = false; });
            });
        }
        (back.querySelector<HTMLElement>('.tp-card.is-current') ?? back.querySelector<HTMLElement>('.tp-card'))?.focus({ preventScroll: true });
    });
}
