// Агрегированную editor.main.css подключает editor/index.ts — второй импорт
// той же таблицы здесь тянул бы ~100 КБ дубля поверх стилей, которые
// editor.all.js и так подключает помодульно.
import './script-problem-highlight.css';
import './overflow-widgets.css';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import type { ScriptLanguage } from '../core/state.js';
import { setupCompletionProvider } from './monaco/completion.js';
import { setupHoverProvider } from './monaco/hover.js';
import { setupSyntaxHighlighting } from './monaco/syntax.js';
import type { AppTheme } from '../app/theme-toggle.js';

const SCRIPT_PROBLEM_MARKER_OWNER = 'script-run-problem';
let scriptProblemDecorationIds: string[] = [];

const EDITOR_FONT_SIZE = 14;
const EDITOR_FONT_FAMILY = "'Fira Code', monospace";
// Начертания, которыми редактор реально рисует текст (обычное и полужирное для
// токенов подсветки). Ждём именно их, а не весь document.fonts.ready, чтобы не
// зависеть от посторонних шрифтов интерфейса.
const EDITOR_FONT_FACES = [
    `${EDITOR_FONT_SIZE}px 'Fira Code'`,
    `500 ${EDITOR_FONT_SIZE}px 'Fira Code'`
];

const OVERFLOW_WIDGETS_CONTAINER_ID = 'monaco-overflow-widgets';

// Единственная точка создания живого редактора — здесь же запоминаем инстанс,
// чтобы оконные обработчики подсветки ошибок (см. syncEditorProblemHandlers)
// работали с реальным редактором, а не с отдельным состоянием.
let liveEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null;

let editorFontRemeasureScheduled = false;

export type TextEditorCreateOptions = {
    root: HTMLElement;
    initialValue: string;
    initialLanguage: ScriptLanguage;
    onDidChangeModelContent?: (value: string) => void;
};

type MaybeEditor = monaco.editor.IStandaloneCodeEditor | null;

// 'preserve' — тот же документ обновили инкрементально (перегенерация текста из
// Blockly): курсор и скролл надо сохранить.
// 'reset' — в редактор загрузили другой скрипт (смена дрона, смена языка,
// открытие файла): восстанавливать позицию от прошлого текста нельзя.
export type TextEditorValueMode = 'preserve' | 'reset';

export function initializeMonacoEnvironment(): void {
    (self as typeof globalThis & {
        MonacoEnvironment?: { getWorker: () => Worker };
    }).MonacoEnvironment = {
        getWorker() {
            return new editorWorker();
        }
    };
}

function getFallbackEditorElement(): HTMLTextAreaElement | null {
    return document.getElementById('fallback-editor') as HTMLTextAreaElement | null;
}

function clearFallbackEditorProblemHighlight(): void {
    const fallbackEditorElement = getFallbackEditorElement();
    if (!fallbackEditorElement) return;
    fallbackEditorElement.style.borderColor = 'rgba(9,9,11,0.1)';
    fallbackEditorElement.style.boxShadow = '';
  }

function highlightFallbackEditorProblem(line: number): void {
    const fallbackEditorElement = getFallbackEditorElement();
    if (!fallbackEditorElement) return;

    const lines = fallbackEditorElement.value.split('\n');
    const safeLine = Math.max(1, Math.min(line || 1, Math.max(lines.length, 1)));
    let startOffset = 0;
    for (let index = 0; index < safeLine - 1; index += 1) {
        startOffset += (lines[index]?.length || 0) + 1;
    }
    const endOffset = startOffset + (lines[safeLine - 1]?.length || 0);

    fallbackEditorElement.focus();
    fallbackEditorElement.setSelectionRange(startOffset, endOffset);
    fallbackEditorElement.style.borderColor = '#d13b2e';
    fallbackEditorElement.style.boxShadow = '0 0 0 3px rgba(209, 59, 46, 0.18)';
}

function syncEditorProblemHandlers(): void {
    (window as any).highlightEditorProblem = highlightTextEditorProblem;
    (window as any).clearEditorProblemHighlight = clearTextEditorProblemHighlight;
}

// Monaco замеряет ширину символа синхронно в момент monaco.editor.create() и
// кэширует её на всё время сессии. 'Fira Code' приезжает с Google Fonts через
// @import с display=swap, поэтому в момент создания редактора шрифта может ещё
// не быть — тогда в кэш попадает ширина запасного monospace (7.70px), а текст
// уже рисуется Fira Code (8.40px). Ошибка ~9% на символ копится вдоль строки:
// клик попадает в верную колонку (её считает сам DOM), но каретка рисуется на
// несколько символов левее, и текст «появляется не там, где стоит курсор».
// Сбросить этот кэш можно только публичным remeasureFonts().
function scheduleEditorFontRemeasure(): void {
    if (editorFontRemeasureScheduled) return;

    const fontFaceSet = document.fonts;
    if (!fontFaceSet) return;

    editorFontRemeasureScheduled = true;

    const remeasure = (): void => {
        monaco.editor.remeasureFonts();
    };

    void Promise.all(
        EDITOR_FONT_FACES.map((face) => fontFaceSet.load(face).catch(() => undefined))
    ).then(remeasure, () => undefined);

    // Подстраховка: ready дожидается конца всей загрузки шрифтов — на случай,
    // если подмена глифов произошла уже после резолва load() выше.
    void fontFaceSet.ready.then(remeasure, () => undefined);

    // Главный случай: таблица с @font-face (она приезжает по @import с
    // fonts.googleapis.com) на момент create() могла ещё не разобраться. Тогда
    // load() выше резолвится вхолостую — подходящего начертания просто нет, —
    // а шрифт доедет позже. loadingdone стреляет на каждую дозагруженную
    // партию шрифтов, в том числе из поздних таблиц, и ловит этот случай.
    fontFaceSet.addEventListener('loadingdone', remeasure);
}

// fixedOverflowWidgets сам по себе не спасает: у панели редактора есть
// transform и overflow:hidden, а transform делает предка содержащим блоком для
// position:fixed — всплывающие виджеты обрезались бы по границе панели.
// Поэтому отдаём Monaco отдельный контейнер в body, вне трансформаций.
function ensureOverflowWidgetsContainer(): HTMLElement {
    const existing = document.getElementById(OVERFLOW_WIDGETS_CONTAINER_ID);
    if (existing) return existing;

    const container = document.createElement('div');
    container.id = OVERFLOW_WIDGETS_CONTAINER_ID;
    // Переменные темы Monaco объявляет на .monaco-editor — без этого класса
    // виджеты в контейнере остались бы нестилизованными.
    container.className = 'monaco-editor';
    document.body.appendChild(container);
    return container;
}

function getMonacoLanguage(language: ScriptLanguage): 'lua' | 'python' {
    return language === 'lua' ? 'lua' : 'python';
}

function getMonacoThemeName(theme: AppTheme): 'pioneer-light' | 'pioneer-dark' {
    return theme === 'dark' ? 'pioneer-dark' : 'pioneer-light';
}

function getCurrentAppTheme(): AppTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function createTextEditorInstance(options: TextEditorCreateOptions): monaco.editor.IStandaloneCodeEditor {
    setupSyntaxHighlighting(monaco);
    setupHoverProvider(monaco);
    setupCompletionProvider(monaco);

    const editorInstance = monaco.editor.create(options.root, {
        value: options.initialValue,
        language: getMonacoLanguage(options.initialLanguage),
        theme: getMonacoThemeName(getCurrentAppTheme()),
        automaticLayout: true,
        wordBasedSuggestions: 'off',
        quickSuggestions: {
            other: true,
            comments: false,
            strings: false
        },
        suggestOnTriggerCharacters: true,
        parameterHints: {
            enabled: true
        },
        hover: {
            enabled: true,
            delay: 200,
            sticky: true
        },
        fontSize: EDITOR_FONT_SIZE,
        fontFamily: EDITOR_FONT_FAMILY,
        minimap: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        fixedOverflowWidgets: true,
        overflowWidgetsDomNode: ensureOverflowWidgetsContainer(),
        suggest: {
            snippetsPreventQuickSuggestions: false,
            showWords: false
        }
    });

    liveEditorInstance = editorInstance;
    scheduleEditorFontRemeasure();

    if (options.onDidChangeModelContent) {
        editorInstance.onDidChangeModelContent(() => {
            clearTextEditorProblemHighlight();
            options.onDidChangeModelContent?.(editorInstance.getValue());
        });
    }

    return editorInstance;
}

// Инстанс мог не доинициализироваться (ошибка после create) — тогда его DOM
// затрут пересозданием оболочки, а сам редактор остался бы жить со своими
// слушателями и воркерами. Гасим явно.
export function disposeTextEditorInstance(editorInstance: monaco.editor.IStandaloneCodeEditor | null): void {
    const target = editorInstance ?? liveEditorInstance;
    if (!target) return;

    if (liveEditorInstance === target) {
        liveEditorInstance = null;
    }

    try {
        target.dispose();
    } catch (error) {
        console.error('[Editor] Failed to dispose Monaco instance', error);
    }
}

export function clearTextEditorProblemHighlight(): void {
    clearFallbackEditorProblemHighlight();

    const editorInstance = liveEditorInstance;
    const model = editorInstance?.getModel() ?? null;
    if (!editorInstance || !model) return;

    monaco.editor.setModelMarkers(model, SCRIPT_PROBLEM_MARKER_OWNER, []);
    if (scriptProblemDecorationIds.length) {
        scriptProblemDecorationIds = editorInstance.deltaDecorations(scriptProblemDecorationIds, []);
    }
}

export function highlightTextEditorProblem(options: {
    line: number;
    column?: number | null;
    endColumn?: number | null;
    message: string;
}): void {
    const safeLine = Math.max(1, options.line || 1);
    const editorInstance = liveEditorInstance;
    const model = editorInstance?.getModel() ?? null;

    if (!editorInstance || !model) {
        highlightFallbackEditorProblem(safeLine);
        return;
    }

    const boundedLine = Math.min(safeLine, model.getLineCount());
    const lineMaxColumn = model.getLineMaxColumn(boundedLine);
    const startColumn = Math.max(1, Math.min(options.column || 1, lineMaxColumn));
    const endColumn = Math.max(
        startColumn + 1,
        Math.min(options.endColumn || lineMaxColumn, lineMaxColumn)
    );

    monaco.editor.setModelMarkers(model, SCRIPT_PROBLEM_MARKER_OWNER, [{
        severity: monaco.MarkerSeverity.Error,
        message: options.message,
        startLineNumber: boundedLine,
        startColumn,
        endLineNumber: boundedLine,
        endColumn
    }]);

    scriptProblemDecorationIds = editorInstance.deltaDecorations(scriptProblemDecorationIds, [{
        range: new monaco.Range(boundedLine, 1, boundedLine, lineMaxColumn),
        options: {
            isWholeLine: true,
            className: 'editor-script-problem-line',
            linesDecorationsClassName: 'editor-script-problem-gutter',
            overviewRuler: {
                color: 'rgba(209, 59, 46, 0.95)',
                position: monaco.editor.OverviewRulerLane.Full
            }
        }
    }]);

    editorInstance.revealLineInCenter(boundedLine);
    editorInstance.setPosition({ lineNumber: boundedLine, column: startColumn });
    editorInstance.focus();
}

syncEditorProblemHandlers();

export function getTextEditorValueFromInstance(editorInstance: MaybeEditor): string {
    return editorInstance ? editorInstance.getValue() : '';
}

function normalizeEditorText(value: string): string {
    return value.replace(/\r\n?/g, '\n');
}

export function setTextEditorValueOnInstance(
    editorInstance: MaybeEditor,
    value: string,
    mode: TextEditorValueMode = 'reset'
): boolean {
    if (!editorInstance) {
        return false;
    }

    const model = editorInstance.getModel();
    if (!model) {
        editorInstance.setValue(value);
        return true;
    }

    // Значение не изменилось — не трогаем редактор, чтобы не сбрасывать курсор, скролл и undo.
    if (normalizeEditorText(model.getValue()) === normalizeEditorText(value)) {
        return true;
    }

    // Заменяем содержимое правкой вместо setValue, чтобы не терять позицию курсора и скролл.
    const previousViewState = mode === 'preserve' ? editorInstance.saveViewState() : null;
    model.pushEditOperations(
        // Выделение до правки: по нему undo вернёт курсор туда, где он стоял,
        // вместо схлопывания в начало файла.
        editorInstance.getSelections(),
        [{ range: model.getFullModelRange(), text: value, forceMoveMarkers: true }],
        () => null
    );

    if (previousViewState) {
        editorInstance.restoreViewState(previousViewState);
        return true;
    }

    // В редактор загрузили другой скрипт — старая позиция курсора относится к
    // прежнему тексту, навязывать её новому нельзя (курсор «прыгал» бы в
    // случайное место). Встаём в начало.
    editorInstance.setPosition({ lineNumber: 1, column: 1 });
    editorInstance.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
    return true;
}

export function setTextEditorLanguageOnInstance(editorInstance: MaybeEditor, language: ScriptLanguage): boolean {
    const model = editorInstance?.getModel() ?? null;
    if (!model) {
        return false;
    }

    monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
    return true;
}

export function layoutTextEditorInstance(editorInstance: MaybeEditor): void {
    if (editorInstance) {
        editorInstance.layout();
    }
}

export function setTextEditorTheme(theme: AppTheme): void {
    setupSyntaxHighlighting(monaco);
    monaco.editor.setTheme(getMonacoThemeName(theme));
}
