import type { BindingOptions } from './bindings/shared.js';

const PRESETS: Record<string, { text: string; shape: string }> = {
    'preset-race-track': { text: 'Кольцевой маршрут, пролётные ворота и стартовые площадки.', shape: '<ellipse cx="46" cy="30" rx="35" ry="20"/><ellipse cx="46" cy="30" rx="24" ry="11"/><path d="M11 25v10M81 25v10M42 10h8M42 50h8"/>' },
    'preset-residential': { text: 'Жилые кварталы, дороги и парк для городских миссий.', shape: '<path d="M8 48V18h20v30M35 48V8h22v40M65 48V24h18v24M4 50h85M14 24h8M14 32h8M41 16h10M41 25h10M41 34h10M70 31h8M70 39h8"/>' },
    'preset-geoskan-arena': { text: 'Учебный полигон с рельефом, маркерами и оборудованием.', shape: '<path d="M8 48V12h76v36ZM8 12l15 9h47l14-9M23 21v18h47V21M8 48l15-9M84 48l-14-9M30 35l9-9 9 9 8-6 8 6"/>' }
};

export function registerSceneExperience({ elements, callbacks }: BindingOptions) {
    const summary = document.getElementById('scene-preset-summary');
    const syncPreset = () => {
        const preset = PRESETS[elements.presetTypeEl?.value || ''];
        if (summary && preset) summary.innerHTML = `<svg viewBox="0 0 92 60" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${preset.shape}</svg><span>${preset.text}</span>`;
    };
    elements.presetTypeEl?.addEventListener('change', syncPreset);
    syncPreset();
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
