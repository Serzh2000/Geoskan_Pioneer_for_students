import { currentDroneId, currentScriptLanguage, drones, setCurrentScriptLanguage, type ScriptLanguage } from '../core/state.js';
import { renderApiDocs } from '../ui/api-docs/index.js';
import { refreshFileList } from '../ui/controls/file-controls.js';
import { log } from '../shared/logging/logger.js';
import {
    getEditorValue,
    getSavedEditorDraft,
    isBlocklyEditorEnabled,
    setBlocklyEditorEnabled,
    setEditorLanguage,
    setEditorValue,
    syncBlocklyWithDroneModel,
    syncScriptLanguageSelect
} from '../editor/index.js';

import { droneModelProfile, supportsLanguage } from '../core/drone-models.js';

const SCRIPT_LANGUAGE_STORAGE_KEY = 'geoskan_script_language_v1';

function getSavedScriptLanguage(): ScriptLanguage | null {
    if (typeof window === 'undefined') return null;

    const saved = window.localStorage.getItem(SCRIPT_LANGUAGE_STORAGE_KEY);
    return saved === 'lua' || saved === 'python' ? saved : null;
}

/** Переключает редактор на язык без сохранения кода: вызывающий уже сохранил его. */
function applyScriptLanguage(lang: ScriptLanguage): void {
    const drone = drones[currentDroneId];
    if (!drone) return;
    if (isBlocklyEditorEnabled()) {
        setCurrentScriptLanguage(lang);
        setBlocklyEditorEnabled(false);
    } else {
        setCurrentScriptLanguage(lang);
    }
    setEditorLanguage(lang);
    setEditorValue(getSavedEditorDraft(lang) || (lang === 'lua' ? drone.script : drone.pythonScript));
    renderApiDocs(lang);
    refreshFileList(lang);
    syncScriptLanguageSelect();
}

/**
 * Пионер Мини 2 программируется на Python (pioneer_sdk2) и блоками Bricks, которые тоже собирают
 * Python; Lua у него нет. Blockly у Мини 2 - собственный набор блоков (editor/blockly-mode/bricks).
 */
function syncLanguageOptionsForDrone(langSelect: HTMLSelectElement): void {
    const model = drones[currentDroneId]?.model;
    const pythonOnly = !supportsLanguage(model, 'lua');
    for (const option of Array.from(langSelect.options)) {
        const blocked = pythonOnly && option.value !== 'python' && option.value !== 'blockly';
        // У Мини 2 блоки называются Bricks (как в программе Geoscan), у Базового - Blockly.
        if (option.value === 'blockly') option.textContent = pythonOnly ? 'Bricks' : 'Blockly';
        option.disabled = blocked;
        option.title = blocked ? `${droneModelProfile(model).title} программируется на Python и блоками, без Lua` : '';
    }
}

/** После смены дрона: язык, которого нет у его модели, меняется на язык модели, а блоки - на набор модели. */
export function enforceDroneScriptLanguage(): void {
    const langSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (langSelect) syncLanguageOptionsForDrone(langSelect);
    const drone = drones[currentDroneId];
    if (!drone) return;
    const profile = droneModelProfile(drone.model);
    const blocklyOn = isBlocklyEditorEnabled();
    // Редактор блоков остаётся открытым: у Базового на поле блоки pioneer_*, у Мини 2 - Bricks,
    // у каждой модели свои, сохранённые отдельно.
    if (blocklyOn) syncBlocklyWithDroneModel();
    if (supportsLanguage(drone.model, currentScriptLanguage)) {
        // Справочник и примеры Python у Мини 2 свои (pioneer_sdk2).
        renderApiDocs(currentScriptLanguage);
        refreshFileList(currentScriptLanguage);
        return;
    }
    if (blocklyOn) {
        // Таргет блоков - язык модели; сами блоки не пересоздаются.
        const language = profile.languages[0];
        setCurrentScriptLanguage(language);
        setEditorLanguage(language);
        renderApiDocs(language);
        refreshFileList(language);
        syncScriptLanguageSelect();
    } else {
        applyScriptLanguage(profile.languages[0]);
    }
    log(`${profile.title}: язык программы - ${profile.languages[0] === 'python' ? 'Python (pioneer_sdk2)' : profile.languages[0]}`, 'info');
}

export function initScriptLanguageSelector(): void {
    const langSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (!langSelect) return;

    const savedLanguage = getSavedScriptLanguage();
    if (savedLanguage && savedLanguage !== currentScriptLanguage) {
        setCurrentScriptLanguage(savedLanguage);
    }
    // initUI() already populated the file list, but too early to know about a
    // language restored from storage just above — correct it here.
    refreshFileList(currentScriptLanguage);

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
    }

    window.addEventListener('drone-selection-changed', () => enforceDroneScriptLanguage());
    enforceDroneScriptLanguage();

    langSelect.addEventListener('change', () => {
        const selectedDrone = drones[currentDroneId];
        if (!selectedDrone) return;
        const profile = droneModelProfile(selectedDrone.model);
        if (!supportsLanguage(selectedDrone.model, 'lua') && langSelect.value !== 'python' && langSelect.value !== 'blockly') {
            log(`${profile.title} программируется на Python (pioneer_sdk2) и блоками Bricks, без Lua.`, 'warn');
            syncScriptLanguageSelect();
            return;
        }

        if (langSelect.value === 'blockly') {
            if (!isBlocklyEditorEnabled()) {
                // Таргет компиляции — текущий currentScriptLanguage: он не
                // сбрасывается при входе в Blockly и выходе из него.
                setBlocklyEditorEnabled(true);
                refreshFileList(currentScriptLanguage);
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
            refreshFileList(lang);
        log(`Язык скрипта: ${lang.toUpperCase()}`, 'info');
    });
}
