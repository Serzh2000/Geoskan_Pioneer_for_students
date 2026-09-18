import { currentDroneId, currentScriptLanguage, drones, setCurrentScriptLanguage, type ScriptLanguage } from '../core/state.js';
import { renderMissionGuidePanel } from '../ui/mission-guide/panel.js';
import { renderApiDocs } from '../ui/api-docs/index.js';
import { log } from '../shared/logging/logger.js';
import {
    getEditorValue,
    getSavedEditorDraft,
    isBlocklyEditorEnabled,
    setBlocklyEditorEnabled,
    setEditorLanguage,
    setEditorValue,
    syncScriptLanguageSelect
} from '../editor/index.js';

const SCRIPT_LANGUAGE_STORAGE_KEY = 'geoskan_script_language_v1';

function getSavedScriptLanguage(): ScriptLanguage | null {
    if (typeof window === 'undefined') return null;

    const saved = window.localStorage.getItem(SCRIPT_LANGUAGE_STORAGE_KEY);
    return saved === 'lua' || saved === 'python' ? saved : null;
}

export function initScriptLanguageSelector(): void {
    const langSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (!langSelect) return;

    const savedLanguage = getSavedScriptLanguage();
    if (savedLanguage && savedLanguage !== currentScriptLanguage) {
        setCurrentScriptLanguage(savedLanguage);
    }

    // Blockly — третье значение этого же списка, а не отдельный переключатель.
    // Включённость режима восстанавливает initEditor() из сессии редактора
    // (blocklyEnabled) ещё до этого вызова, поэтому отдельного ключа хранения
    // для UI-состояния списка не заводим — источник правды один.
    syncScriptLanguageSelect();

    const drone = drones[currentDroneId];
    if (drone) {
        setEditorLanguage(currentScriptLanguage);
        const initialCode =
            getSavedEditorDraft(currentScriptLanguage) ||
            (currentScriptLanguage === 'lua' ? drone.script : drone.pythonScript);
        setEditorValue(initialCode);
        renderApiDocs(currentScriptLanguage);
        renderMissionGuidePanel(currentScriptLanguage);
    }

    langSelect.addEventListener('change', () => {
        const selectedDrone = drones[currentDroneId];
        if (!selectedDrone) return;

        if (langSelect.value === 'blockly') {
            if (!isBlocklyEditorEnabled()) {
                // Таргет компиляции — текущий currentScriptLanguage: он не
                // сбрасывается при входе в Blockly и выходе из него.
                setBlocklyEditorEnabled(true);
                log(`Режим Blockly, таргет: ${currentScriptLanguage.toUpperCase()}`, 'info');
            }
            return;
        }

        const lang = langSelect.value as ScriptLanguage;

        if (isBlocklyEditorEnabled()) {
            // Выход из Blockly компилирует workspace в текстовый черновик
            // currentScriptLanguage, поэтому выбранный язык выставляем ДО
            // выключения режима: блоки попадают сразу в тот язык, который
            // пользователь только что выбрал в списке.
            setCurrentScriptLanguage(lang);
            setBlocklyEditorEnabled(false);
        } else {
            const currentCode = getEditorValue();
            if (currentScriptLanguage === 'lua') {
                selectedDrone.script = currentCode;
            } else {
                selectedDrone.pythonScript = currentCode;
            }
            setCurrentScriptLanguage(lang);
        }

        window.localStorage.setItem(SCRIPT_LANGUAGE_STORAGE_KEY, lang);
        setEditorLanguage(lang);
        const code = getSavedEditorDraft(lang) || (lang === 'lua' ? selectedDrone.script : selectedDrone.pythonScript);
        setEditorValue(code);
        renderApiDocs(lang);
        renderMissionGuidePanel(lang);
        log(`Язык скрипта: ${lang.toUpperCase()}`, 'info');
    });
}
