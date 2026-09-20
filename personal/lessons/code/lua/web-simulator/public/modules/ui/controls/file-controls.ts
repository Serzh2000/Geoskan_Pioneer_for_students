import type { ScriptLanguage } from '../../core/state.js';
import type { UICallbacks } from '../index.js';

// Human-readable labels for the lesson example folders served alongside this
// project's own `examples/`. An unrecognised top-level folder still gets a
// group of its own, just labelled with its raw name, so a new lesson folder
// shows up without needing a matching code change here. Lua and Python each
// have their own folder names, so one shared map covers both languages.
const LESSON_GROUP_LABELS: Record<string, string> = {
    '02_sensors': '02 — Датчики',
    '03_rc_control': '03 — Пульт управления',
    '04_language': '04 — Язык программирования',
    '05_leds': '05 — Светодиоды',
    '06_missions': '06 — Миссии',
    '01_python_basics': '01 — Основы Python',
    '02_pioneer_sdk': '02 — Pioneer SDK',
    '03_flight_control': '03 — Управление полётом'
};

function populateFileOptions(fileSelector: HTMLSelectElement, files: string[]): void {
    const topLevel: string[] = [];
    const groups = new Map<string, string[]>();

    for (const file of files) {
        const slashIndex = file.indexOf('/');
        if (slashIndex === -1) {
            topLevel.push(file);
            continue;
        }
        const groupKey = file.slice(0, slashIndex);
        const list = groups.get(groupKey) ?? [];
        list.push(file);
        groups.set(groupKey, list);
    }

    for (const file of topLevel) {
        const opt = document.createElement('option');
        opt.value = file;
        opt.textContent = file;
        fileSelector.appendChild(opt);
    }

    for (const [groupKey, groupFiles] of groups) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = LESSON_GROUP_LABELS[groupKey] ?? groupKey;
        for (const file of groupFiles) {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file.slice(groupKey.length + 1);
            optgroup.appendChild(opt);
        }
        fileSelector.appendChild(optgroup);
    }
}

// Guards against a stale response winning a race if the language is switched
// again before the previous fetch has returned.
let pendingListLanguage: ScriptLanguage | null = null;

// Reloads the file-selector's options for the given language. Exported so
// the language switcher can call it every time the editor's language
// changes — Lua's list must never linger (or vice versa) once the user
// switches, since a script from the wrong language can't run there.
export function refreshFileList(language: ScriptLanguage): void {
    const fileSelector = document.getElementById('file-selector') as HTMLSelectElement | null;
    if (!fileSelector) return;

    pendingListLanguage = language;
    fileSelector.title = 'Выберите файл скрипта или используйте локальную загрузку';
    fetch(`/api/files?lang=${language}`)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then((files) => {
            if (pendingListLanguage !== language) return;
            fileSelector.innerHTML = '<option value="">Выберите файл...</option>';
            fileSelector.title = 'Выберите файл скрипта';
            if (Array.isArray(files)) {
                populateFileOptions(fileSelector, files);
            }
        })
        .catch((err) => {
            if (pendingListLanguage !== language) return;
            console.error('Failed to load file list:', err);
            fileSelector.innerHTML = '<option value="">API недоступно</option>';
            fileSelector.title = 'Ошибка загрузки списка файлов: API недоступно';
        });
}

export function initFileControls(callbacks: UICallbacks, language: ScriptLanguage) {
    refreshFileList(language);

    const fileSelector = document.getElementById('file-selector') as HTMLSelectElement | null;
    if (fileSelector) {
        fileSelector.addEventListener('change', async (e: Event) => {
            const target = e.target as HTMLSelectElement;
            const path = target.value;
            if (!path || path.includes('Загрузка')) return;
            callbacks.onFileSelect(path);
        });
    }

    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    if (fileInput) {
        fileInput.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    callbacks.onLocalFileLoad(file.name, evt.target.result as string);
                }
            };
            reader.readAsText(file);
        });
    }
}
