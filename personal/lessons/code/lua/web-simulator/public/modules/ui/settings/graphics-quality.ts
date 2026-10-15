import { bindWorkspaceControls } from './workspace.js';
import { getQualitySetting, getQualityTier, onQualityChange, parseQualitySetting, setQualitySetting } from '../../scene/core/quality.js';

const TIER_LABELS = ['Высокое', 'Среднее', 'Среднее', 'Низкое'];

/** "Качество графики": Авто / Высокое / Среднее / Низкое. The choice is stored by the quality module. */
export function bindGraphicsQualityControl(): void {
    // "Рабочее место" lives in the same Settings column and shares this single init hook.
    bindWorkspaceControls();
    const select = document.getElementById('setting-graphics-quality') as HTMLSelectElement | null;
    if (!select) return;
    const status = document.getElementById('graphics-quality-status');
    const refresh = () => {
        select.value = getQualitySetting();
        if (!status) return;
        status.textContent = getQualitySetting() === 'auto'
            ? `Сейчас выбрано автоматически: ${TIER_LABELS[getQualityTier()].toLowerCase()}.`
            : 'Авто сам снижает качество, если кадров мало.';
    };
    select.addEventListener('change', () => setQualitySetting(parseQualitySetting(select.value)));
    onQualityChange(refresh);
    refresh();
}
