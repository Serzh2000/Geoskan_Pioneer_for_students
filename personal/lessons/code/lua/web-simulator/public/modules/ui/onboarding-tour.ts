/*
 * First-run guided tour. Shown once, the very first time someone opens the
 * simulator (nothing stored under TOUR_STORAGE_KEY yet); skippable from the
 * first screen and at every step, and restartable from Settings.
 *
 * Each step spotlights one real element (a cut-out in a dimmed overlay) and
 * explains it in a card placed beside it. Steps whose element isn't on
 * screen (e.g. the rail on a phone layout) are skipped. The app underneath
 * is inert while the tour runs; keyboard: Enter/→ next, ← back, Esc skip.
 */

const TOUR_STORAGE_KEY = 'geoskan_onboarding_tour_v1';

type TourStep = {
    /** CSS selector of the element to spotlight; omitted = centered card. */
    target?: string;
    title: string;
    text: string;
    nextLabel?: string;
    /** Extra action on the last step, besides closing. */
    onNext?: () => void;
};

const STEPS: TourStep[] = [
    {
        title: 'Добро пожаловать в симулятор Pioneer',
        text: 'Здесь вы программируете квадрокоптер и сразу видите его полёт в 3D. Покажем главное — это меньше минуты.',
        nextLabel: 'Показать'
    },
    {
        target: '.scene-viewport-card',
        title: '3D-полигон',
        text: 'Здесь летает дрон. Левая кнопка мыши вращает камеру, правая — сдвигает, колесо — приближает.'
    },
    {
        target: '.viewport-camera-controls-row',
        title: 'Камеры',
        text: 'Смотрите на полёт с земли, следом за дроном, от первого лица (FPV) или свободно.'
    },
    {
        target: '.viewport-run-controls',
        title: 'Запуск программы',
        text: 'Запустите код, остановите его или верните дрон на старт.'
    },
    {
        target: '.sidebar-tab-btn[onclick*="editor-panel"]',
        title: 'Код',
        text: 'Редактор: пишите программу на Lua или Python либо собирайте её из блоков. Там же — примеры и справочник API.'
    },
    {
        target: '.sidebar-tab-btn[onclick*="telemetry-panel"]',
        title: 'Телеметрия',
        text: 'Высота, скорость, заряд батареи и LED-матрица дрона — в реальном времени.'
    },
    {
        target: '.sidebar-tab-btn[onclick*="manager-panel"]',
        title: 'Сцена',
        text: 'Все объекты полигона: ворота, маркеры, здания. Выбирайте, двигайте и настраивайте их.'
    },
    {
        target: '#scene-hotbar-toggle-btn',
        title: 'Объекты',
        text: 'Отсюда новые предметы расставляются прямо на сцене.'
    },
    {
        target: '#sidebar-guide-btn',
        title: 'Руководство',
        text: 'Уроки и миссии по шагам — лучший способ начать.'
    },
    {
        title: 'Всё готово',
        text: 'Повторить тур можно в «Настройках». Откроем первый урок?',
        nextLabel: 'Открыть руководство',
        onNext: () => (window as any).openMissionGuideModal?.()
    }
];

const SPOTLIGHT_PADDING = 6;
const CARD_GAP = 14;
const EDGE = 12;

function isVisible(el: Element | null): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/*
 * The rail can be tucked away until hovered (zero width, animating open), so
 * its buttons count as available whenever the rail is part of the layout at
 * all; the tour slides it out for those steps.
 */
function isAvailable(el: Element | null): boolean {
    if (!el) return false;
    const rail = el.closest('.sidebar-tabs');
    if (rail) return getComputedStyle(rail).display !== 'none' && getComputedStyle(el).display !== 'none';
    return isVisible(el);
}

let activeTour: { end: (result: 'done' | 'skipped') => void } | null = null;

export function startOnboardingTour(): void {
    if (activeTour) return;

    const root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `
        <div class="tour__shade"></div>
        <div class="tour__spotlight" aria-hidden="true"></div>
        <div class="tour__card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
            <div class="tour__progress" aria-hidden="true"></div>
            <h2 class="tour__title" id="tour-title"></h2>
            <p class="tour__text" id="tour-text"></p>
            <div class="tour__actions">
                <button type="button" class="tour__skip">Пропустить тур</button>
                <span class="tour__spacer"></span>
                <button type="button" class="tour__btn tour__back">Назад</button>
                <button type="button" class="tour__btn tour__btn--primary tour__next">Далее</button>
            </div>
        </div>`;
    document.body.appendChild(root);

    const shade = root.querySelector<HTMLElement>('.tour__shade')!;
    const spotlight = root.querySelector<HTMLElement>('.tour__spotlight')!;
    const card = root.querySelector<HTMLElement>('.tour__card')!;
    const progress = root.querySelector<HTMLElement>('.tour__progress')!;
    const title = root.querySelector<HTMLElement>('.tour__title')!;
    const text = root.querySelector<HTMLElement>('.tour__text')!;
    const skipBtn = root.querySelector<HTMLButtonElement>('.tour__skip')!;
    const backBtn = root.querySelector<HTMLButtonElement>('.tour__back')!;
    const nextBtn = root.querySelector<HTMLButtonElement>('.tour__next')!;

    const previousFocus = document.activeElement as HTMLElement | null;
    // Only steps whose element can be shown right now.
    const steps = STEPS.filter((step) => !step.target || isAvailable(document.querySelector(step.target)));
    const spotlightSteps = steps.filter((step) => step.target).length;
    let index = 0;

    const place = () => {
        const step = steps[index];
        const target = step.target ? document.querySelector<HTMLElement>(step.target) : null;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cardRect = card.getBoundingClientRect();

        if (!target || !isVisible(target)) {
            root.classList.add('is-centered');
            card.style.left = `${Math.round((vw - cardRect.width) / 2)}px`;
            card.style.top = `${Math.round((vh - cardRect.height) / 2)}px`;
            return;
        }
        root.classList.remove('is-centered');

        const r = target.getBoundingClientRect();
        const box = {
            left: Math.max(EDGE / 2, r.left - SPOTLIGHT_PADDING),
            top: Math.max(EDGE / 2, r.top - SPOTLIGHT_PADDING),
            right: Math.min(vw - EDGE / 2, r.right + SPOTLIGHT_PADDING),
            bottom: Math.min(vh - EDGE / 2, r.bottom + SPOTLIGHT_PADDING)
        };
        Object.assign(spotlight.style, {
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.right - box.left}px`,
            height: `${box.bottom - box.top}px`
        });

        // Beside the target where there's room: right, left, below, above;
        // a target that fills the screen (the 3D view) gets the card inside it.
        const w = cardRect.width;
        const h = cardRect.height;
        const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - w - EDGE);
        const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - h - EDGE);
        let left: number;
        let top: number;
        if (vw - box.right >= w + CARD_GAP + EDGE) {
            left = box.right + CARD_GAP;
            top = clampY((box.top + box.bottom) / 2 - h / 2);
        } else if (box.left >= w + CARD_GAP + EDGE) {
            left = box.left - CARD_GAP - w;
            top = clampY((box.top + box.bottom) / 2 - h / 2);
        } else if (vh - box.bottom >= h + CARD_GAP + EDGE) {
            left = clampX((box.left + box.right) / 2 - w / 2);
            top = box.bottom + CARD_GAP;
        } else if (box.top >= h + CARD_GAP + EDGE) {
            left = clampX((box.left + box.right) / 2 - w / 2);
            top = box.top - CARD_GAP - h;
        } else {
            left = clampX(box.left + 24);
            top = clampY(box.top + 24);
        }
        card.style.left = `${Math.round(left)}px`;
        card.style.top = `${Math.round(top)}px`;
    };

    const render = () => {
        const step = steps[index];
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;

        // The rail may be tucked away (hover-to-peek); bring it out while
        // one of its buttons is being shown.
        const onRail = !!step.target && !!document.querySelector(step.target)?.closest('.sidebar-tabs');
        document.body.classList.toggle('is-rail-peek', onRail && !document.body.classList.contains('is-rail-docked'));

        const spotIndex = steps.slice(0, index + 1).filter((s) => s.target).length;
        progress.textContent = step.target ? `${spotIndex} из ${spotlightSteps}` : '';
        title.textContent = step.title;
        text.textContent = step.text;
        backBtn.hidden = isFirst || isLast;
        skipBtn.textContent = isLast ? 'Позже' : isFirst ? 'Пропустить' : 'Пропустить тур';
        nextBtn.textContent = step.nextLabel ?? (isLast ? 'Готово' : 'Далее');
        // Measure after the text changed, then place - and once more after the
        // rail's slide-out transition (0.22s) has settled.
        requestAnimationFrame(place);
        window.setTimeout(place, 260);
        nextBtn.focus({ preventScroll: true });
    };

    const end = (result: 'done' | 'skipped') => {
        try {
            localStorage.setItem(TOUR_STORAGE_KEY, result);
        } catch {
            // Storage unavailable (private mode) - the tour just shows again next time.
        }
        document.body.classList.remove('is-rail-peek');
        window.removeEventListener('resize', place);
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        activeTour = null;
        previousFocus?.focus?.({ preventScroll: true });
    };

    const next = () => {
        const step = steps[index];
        if (index === steps.length - 1) {
            end('done');
            step.onNext?.();
            return;
        }
        index += 1;
        render();
    };

    const back = () => {
        if (index === 0) return;
        index -= 1;
        render();
    };

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            end('skipped');
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            back();
        } else if (event.key === 'Tab') {
            // Keep focus inside the card.
            const focusables = [...card.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.hidden);
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    nextBtn.addEventListener('click', next);
    backBtn.addEventListener('click', back);
    skipBtn.addEventListener('click', () => end('skipped'));
    // Clicks on the dimmed page do nothing: the tour ends only by choice.
    shade.addEventListener('pointerdown', (event) => event.preventDefault());
    window.addEventListener('resize', place);
    document.addEventListener('keydown', onKey, true);

    activeTour = { end };
    render();
}

export function initOnboardingTour(): void {
    document.getElementById('restart-onboarding-tour-btn')?.addEventListener('click', () => {
        (window as any).closePanel?.();
        startOnboardingTour();
    });

    let seen: string | null;
    try {
        seen = localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
        return;
    }
    if (seen) return;
    // Let the scene and layout settle so every spotlight lands on its target.
    window.setTimeout(startOnboardingTour, 900);
}
