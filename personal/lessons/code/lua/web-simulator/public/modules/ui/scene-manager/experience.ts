import type { BindingOptions } from './bindings/shared.js';

const PRESETS: Record<string, { text: string; shape: string }> = {
    'preset-race-track': { text: 'Кольцевой маршрут, пролётные ворота и стартовые площадки.', shape: '<ellipse cx="46" cy="30" rx="35" ry="20"/><ellipse cx="46" cy="30" rx="24" ry="11"/><path d="M11 25v10M81 25v10M42 10h8M42 50h8"/>' },
    'preset-residential': { text: 'Жилые кварталы, дороги и парк для городских миссий.', shape: '<path d="M8 48V18h20v30M35 48V8h22v40M65 48V24h18v24M4 50h85M14 24h8M14 32h8M41 16h10M41 25h10M41 34h10M70 31h8M70 39h8"/>' },
    'preset-geoskan-arena': { text: 'Учебный полигон с рельефом, маркерами и оборудованием.', shape: '<path d="M8 48V12h76v36ZM8 12l15 9h47l14-9M23 21v18h47V21M8 48l15-9M84 48l-14-9M30 35l9-9 9 9 8-6 8 6"/>' }
};

// All three presets shown at once as radio cards (picture + name + what's in
// it) instead of a select that hid two of them behind a dropdown. The hidden
// #scene-preset-type select stays the value the "add" binding reads.
function registerPresetOptions(select: HTMLSelectElement | null) {
    const group = document.getElementById('scene-preset-options');
    if (!group || !select) return;

    const cards = Array.from(select.options).map((option) => {
        const preset = PRESETS[option.value];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'scene-preset-card';
        card.dataset.value = option.value;
        card.setAttribute('role', 'radio');
        card.innerHTML = `
            <span class="scene-preset-card__preview"><svg class="scene-preset-card__art" viewBox="0 0 92 60" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${preset?.shape ?? ''}</svg><span class="scene-preset-card__check" aria-hidden="true">✓</span></span>
            <span class="scene-preset-card__body">
                <span class="scene-preset-card__title">${option.textContent?.trim() ?? option.value}</span>
                <span class="scene-preset-card__text">${preset?.text ?? ''}</span>
            </span>`;
        card.addEventListener('click', () => choose(option.value));
        group.appendChild(card);
        return card;
    });

    const sync = () => {
        const addButton = document.getElementById('scene-preset-btn');
        if (addButton) addButton.textContent = `Добавить «${select.selectedOptions[0]?.textContent?.trim() ?? 'сцену'}»`;
        cards.forEach((card) => {
        const checked = card.dataset.value === select.value;
        card.setAttribute('aria-checked', String(checked));
        card.tabIndex = checked ? 0 : -1;
        });
    };
    select.addEventListener('change', sync);
    const choose = (value: string, focus = false) => {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
        if (focus) cards.find((card) => card.dataset.value === value)?.focus();
    };

    // Radio-group keyboard model: arrows move and select.
    group.addEventListener('keydown', (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const index = cards.findIndex((card) => card.dataset.value === select.value);
        const next = cards[(index + step + cards.length) % cards.length];
        if (next?.dataset.value) choose(next.dataset.value, true);
    });
    sync();
}

// The panel lists objects, so it should also say how to add one: this opens
// the viewport's placement hotbar, where adding actually happens.
function registerAddObjectButton() {
    document.getElementById('scene-add-object-btn')?.addEventListener('click', () => {
        if (!document.body.classList.contains('is-scene-hotbar-active')) {
            document.getElementById('scene-hotbar-toggle-btn')?.click();
        }
    });
}

export function registerSceneExperience({ elements, callbacks }: BindingOptions) {
    registerPresetOptions(elements.presetTypeEl);
    registerAddObjectButton();
    const syncAddLabel = () => {
        const label = elements.addTypeEl?.selectedOptions[0]?.textContent?.trim();
        if (elements.addBtn && label) elements.addBtn.textContent = `+ Добавить: ${label}`;
    };
    elements.addTypeEl?.addEventListener('change', syncAddLabel);
    syncAddLabel();
    let statusTimeout = 0;
    const announce = (text: string) => {
        const status = document.getElementById('scene-operation-status');
        if (!status) return;
        status.textContent = text; status.hidden = false;
        window.clearTimeout(statusTimeout);
        statusTimeout = window.setTimeout(() => { status.hidden = true; }, 5000);
    };
    for (const button of [elements.addBtn, elements.presetBtn]) button?.addEventListener('click', () => {
        const selected = callbacks.sceneManager?.list().find(entry => entry.id === callbacks.sceneManager?.getSelectedId());
        if (selected) announce(`Добавлено: ${selected.name}. Настройки — во вкладке «Свойства».`);
    });
    elements.applyMetaBtn?.addEventListener('click', () => announce('Параметры применены.'));
}
