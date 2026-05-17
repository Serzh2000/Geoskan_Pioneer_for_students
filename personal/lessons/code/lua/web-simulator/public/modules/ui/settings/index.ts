/**
 * Модуль общих настроек симулятора.
 * Инициализирует вкладку "Настройки" и связывает ее поля
 * с глобальным состоянием `simSettings`.
 */
import { bindGeneralSettingsControls } from './bindings.js';
import { collectSettingsDomRefs } from './dom.js';
import { initRcSetupPanel } from './rendering.js';

export function initSettingsUI() {
    const dom = collectSettingsDomRefs();
    bindGeneralSettingsControls(dom);
    initRcSetupPanel(dom.rcSetupRoot);
}
