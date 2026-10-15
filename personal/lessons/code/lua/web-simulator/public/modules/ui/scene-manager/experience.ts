import type { BindingOptions } from './bindings/shared.js';

const PRESETS: Record<string, { text: string; shape: string }> = {
    'preset-race-track': { text: '8 ворот, слалом и поиск двух контрольных меток.', shape: '<ellipse cx="46" cy="30" rx="35" ry="20"/><ellipse cx="46" cy="30" rx="24" ry="11"/><path d="M11 25v10M81 25v10M42 10h8M42 50h8"/>' },
    'preset-residential': { text: 'Осмотр домов, крышные метки и доставка груза во двор.', shape: '<path d="M8 48V18h20v30M35 48V8h22v40M65 48V24h18v24M4 50h85M14 24h8M14 32h8M41 16h10M41 25h10M41 34h10M70 31h8M70 39h8"/>' },
    'preset-geoskan-arena': { text: 'Две карты маркеров, развозка грузов и точный коридор.', shape: '<path d="M8 48V12h76v36ZM8 12l15 9h47l14-9M23 21v18h47V21M8 48l15-9M84 48l-14-9M30 35l9-9 9 9 8-6 8 6"/>' },
    'training-city': { text: 'Целый город: кольцевая, проспект и эстакада, школа, больница, ТЦ, рестораны, парки и грузовой двор.', shape: '<path d="M6 50V26h10v24M20 50V10h12v40M36 50V22h10v28M50 50V14h14v36M68 50V28h12v22M4 52h86M10 14h76v6M24 20h4M24 28h4M54 22h6M54 30h6"/>' },
    'training-field': { text: 'Открытая местность 600 × 600 м: старт, четыре метки ArUco и спокойные камни, сено и деревья.', shape: '<rect x="8" y="8" width="76" height="44" rx="4"/><circle cx="46" cy="30" r="7"/><path d="M42 30h8M46 26v8M16 16h6v6h-6zM70 16h6v6h-6zM16 38h6v6h-6zM70 38h6v6h-6z"/>' },
    'training-forest': { text: 'Лес и посёлки с рекой: полёт по свободному коридору.', shape: '<path d="M10 46l9-18 9 18zM32 48l11-24 11 24zM58 46l9-18 9 18zM4 50h84"/>' },
    'training-hills': { text: 'Холмы, ЛЭП и ветряки: учит держать запас по высоте.', shape: '<path d="M4 48c9-26 21-26 30 0M26 48c13-34 27-34 40 0M54 48c9-20 23-20 34 0M74 14v14M68 18h12"/>' },
    'training-urban': { text: 'Микрорайоны, улицы, остановки и АЗС: обход зданий.', shape: '<path d="M8 48V24h14v24M26 48V10h16v38M46 48V28h14v26M64 48V16h18v32M4 50h84M13 30h4M31 18h6M31 28h6M69 24h8"/>' },
    'training-industrial': { text: 'Склады, контейнеры и кран: узкие проходы между постройками.', shape: '<path d="M6 48V28l14-8 14 8v20M40 48V32h20v16M68 48V12M62 18h12M63 26h10M4 50h86"/>' },
    'training-markers': { text: 'Открытая местность 600 × 600 м с метками для камеры и наведения.', shape: '<rect x="12" y="10" width="28" height="28" rx="2"/><path d="M19 17h6v6h-6zM28 17h6v6h-6zM19 26h6v6h-6zM29 29h6v6h-6zM52 22h24v24H52zM58 28h5v5h-5zM66 36h5v5h-5z"/>' },
    'training-mixed': { text: 'Река, озеро, станция, аэродром и ферма на карте 600 × 600 м.', shape: '<rect x="6" y="8" width="80" height="44" rx="4"/><path d="M30 8c10 14-8 22 4 44M50 22h28M50 34h20M64 22v18"/><circle cx="18" cy="38" r="5"/>' }
};

// The collapsible library uses radio cards; the hidden select remains the
// source of truth for the existing scene construction bindings.
function registerPresetOptions(select: HTMLSelectElement | null) {
    const group = document.getElementById('scene-preset-options');
    if (!group || !select) return;

    const cards = Array.from(select.options).map((option) => {
        const preset = PRESETS[option.value];
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pk-row scene-preset-card';
        card.dataset.value = option.value;
        card.setAttribute('role', 'radio');
        card.innerHTML = `
            <span class="pk-row__icon scene-preset-card__preview"><svg class="scene-preset-card__art" viewBox="0 0 92 60" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${preset?.shape ?? ''}</svg></span>
            <span class="pk-row__text">
                <span class="pk-row__name">${option.textContent?.trim() ?? option.value}</span>
                <span class="pk-row__meta">${preset?.text ?? ''}</span>
            </span>
            <span class="pk-row__end scene-preset-card__check" aria-hidden="true">✓</span>`;
        card.addEventListener('click', () => choose(option.value));
        group.appendChild(card);
        return card;
    });

    const sync = () => {
        const addButton = document.getElementById('scene-preset-btn');
        const current = document.getElementById('scene-preset-current');
        if (current) current.textContent = select.selectedOptions[0]?.textContent?.trim() ?? 'Выберите полигон';
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
    document.querySelectorAll<HTMLTextAreaElement>('#manager-panel .scene-textarea').forEach(field => {
        const fit = () => {
            if (!field.getClientRects().length) return;
            field.style.height = 'auto';
            field.style.height = `${Math.min(240, Math.max(88, field.scrollHeight + 2))}px`;
        };
        field.addEventListener('input', fit);
        field.addEventListener('focus', fit);
    });
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
