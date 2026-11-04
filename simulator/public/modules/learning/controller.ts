/**
 * Стартовый экран и режим обучения: DOM-слой поверх симулятора.
 *
 * Свободный режим — прежний симулятор. В режиме обучения поверх сцены лежат: карточка текущего задания (цель,
 * шаги, нужные блоки, подсказка), полоса прогресса, карта заданий и экран успеха. Проверка — настоящий полёт:
 * программа запускается в симуляторе, а `runTextLessonCheck` сверяет траекторию и подсветку с ожиданием урока.
 * Окно «Учебник» в обучении закрыто: кнопка скрыта стилем, а вызовы openMissionGuideModal() игнорируются.
 */
import { currentScriptLanguage, setCurrentScriptLanguage } from '../core/state.js';
import { restartAndRunSimulation } from '../app/simulation-controls.js';
import {
    getEditorValue, getMainBlocklyWorkspace, isBlocklyEditorEnabled, loadMainBlocklyJson, loadMainBlocklyXml,
    serializeWorkspaceXml, setBlocklyEditorEnabled, setEditorLanguage, setEditorValue, syncScriptLanguageSelect
} from '../editor/index.js';
import { runTextLessonCheck } from '../ui/mission-guide/evaluation/text/index.js';
import { getAppMode, loadLastMode, onAppModeChange, setAppMode, type AppMode } from './mode.js';
import {
    buildQuests, completeQuest, countDone, currentQuest, emptyProgress, loadProgress, nextQuest, QUEST_DRAFT_STORAGE_PREFIX,
    QUEST_GROUP_LABELS, QUEST_GROUP_ORDER, questStatus, requiredBlockChecklist, saveProgress, selectQuest,
    type Quest, type QuestProgress
} from './quests.js';

const quests = buildQuests();
const EMPTY_PROGRAM = JSON.stringify({ blocks: { languageVersion: 0, blocks: [{ type: 'pioneer_start', x: 40, y: 40 }] } });

function storage(): Storage | null {
    try { return window.localStorage; } catch { return null; }
}

let progress: QuestProgress = emptyProgress();
let activeQuest: Quest | null = null;
let hintOpen = false;
let hudCollapsed = false;
let checking = false;
let checkToken = 0;
let feedback: { kind: 'info' | 'error'; title: string; lines: string[] } | null = null;
let checklistTimer = 0;
let originalOpenGuide: (() => void) | undefined;

/** Чем ученик пишет программы: блоками или текстом. Задания одни и те же, проверка — по полёту. */
export type LearningTrack = 'blocks' | 'lua' | 'python';
const TRACK_STORAGE_KEY = 'pioneer:learning:track:v1';
const HUD_POS_STORAGE_KEY = 'pioneer:learning:hud-pos:v1';
const TRACK_LABELS: Record<LearningTrack, string> = { blocks: 'Blockly', lua: 'Lua', python: 'Python' };
let track: LearningTrack = 'blocks';

const el = {} as {
    start: HTMLElement; hud: HTMLElement; map: HTMLElement; success: HTMLElement; menu: HTMLButtonElement;
};

const ICON = {
    free: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l3 7 7 2-7 2-3 7-3-7-7-2 7-2z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    map: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>'
};

function esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Текст уроков размечает код обратными кавычками. */
function rich(text: string): string {
    return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function persist(): void {
    saveProgress(storage(), progress);
}

/* ---------- Стартовый экран ---------- */

function renderStart(): void {
    const last = loadLastMode(storage());
    const done = countDone(quests, progress);
    const learnNote = done > 0 ? `Продолжить: пройдено ${done} из ${quests.length}` : `${quests.length} заданий: от взлёта до итоговой миссии`;
    const card = (mode: 'free' | 'learning', icon: string, title: string, text: string, note: string) => `
        <button type="button" class="start-card${last === mode ? ' is-last' : ''}" data-start-mode="${mode}">
            <span class="start-card__icon">${icon}</span>
            <span class="start-card__title">${title}</span>
            <span class="start-card__text">${text}</span>
            <span class="start-card__note">${last === mode ? 'Вы выбирали в прошлый раз · ' : ''}${note}</span>
        </button>`;
    el.start.innerHTML = `
        <div class="start-screen__inner">
            <div class="start-screen__brand">Pioneer Simulator</div>
            <h1 class="start-screen__title">С чего начнём?</h1>
            <div class="start-screen__choices">
                ${card('free', ICON.free, 'Свободный режим', 'Весь симулятор без ограничений: сцена, редактор, учебник и справочник. Пишите и запускайте что угодно.', 'Как раньше')}
                ${card('learning', ICON.learn, 'Режим обучения', 'Тот же симулятор, но с заданиями на экране. Соберите программу из блоков — дрон выполнит её, а проверка засчитает полёт.', learnNote)}
            </div>
        </div>`;
    el.start.querySelectorAll<HTMLButtonElement>('[data-start-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.startMode === 'learning') renderTrackStep();
            else setAppMode('free', storage());
        });
    });
}

/** Второй шаг стартового экрана: чем писать программы. */
function renderTrackStep(): void {
    const info: Record<LearningTrack, [string, string]> = {
        blocks: ['Blockly', 'Программа собирается из блоков. Самый мягкий старт: блоки подсказывают, что можно сделать.'],
        lua: ['Lua', 'Текстовый код в редакторе, как в прошивке дрона. Шаги заданий даны блоками, вы записываете их кодом.'],
        python: ['Python', 'Текстовый код с pioneer_sdk. Шаги заданий даны блоками, вы записываете их кодом.']
    };
    el.start.innerHTML = `
        <div class="start-screen__inner">
            <div class="start-screen__brand">Режим обучения</div>
            <h1 class="start-screen__title">Чем будете писать программы?</h1>
            <div class="start-screen__choices start-screen__choices--three">
                ${(Object.keys(info) as LearningTrack[]).map((key) => `
                <button type="button" class="start-card${track === key ? ' is-last' : ''}" data-start-track="${key}">
                    <span class="start-card__title">${info[key][0]}</span>
                    <span class="start-card__text">${info[key][1]}</span>
                    <span class="start-card__note">${track === key ? 'Выбрано в прошлый раз' : 'Можно сменить прямо в задании'}</span>
                </button>`).join('')}
            </div>
            <button type="button" class="btn-secondary start-screen__back" data-start-back>← К выбору режима</button>
        </div>`;
    el.start.querySelectorAll<HTMLButtonElement>('[data-start-track]').forEach((button) => {
        button.addEventListener('click', () => {
            track = button.dataset.startTrack as LearningTrack;
            try { storage()?.setItem(TRACK_STORAGE_KEY, track); } catch { /* ignore */ }
            setAppMode('learning', storage());
        });
    });
    el.start.querySelector('[data-start-back]')?.addEventListener('click', renderStart);
    el.start.querySelector<HTMLElement>('.start-card.is-last, .start-card')?.focus();
}

function showStart(): void {
    renderStart();
    el.start.hidden = false;
    document.body.classList.add('has-start-screen');
    const focusTarget = el.start.querySelector<HTMLElement>('.start-card.is-last') ?? el.start.querySelector<HTMLElement>('.start-card');
    window.requestAnimationFrame(() => focusTarget?.focus());
}

function hideStart(): void {
    el.start.hidden = true;
    document.body.classList.remove('has-start-screen');
}

/* ---------- Задание ---------- */

function loadTrack(): LearningTrack {
    try {
        const value = storage()?.getItem(TRACK_STORAGE_KEY);
        return value === 'lua' || value === 'python' ? value : 'blocks';
    } catch { return 'blocks'; }
}

function draftKey(quest: Quest): string {
    return QUEST_DRAFT_STORAGE_PREFIX + (track === 'blocks' ? '' : `${track}:`) + quest.id;
}

/** Урок проходится выбранным способом: «Каждые N сек» в браузерном Python не держит ритм. */
function trackSupported(quest: Quest): boolean {
    return track === 'blocks' || !quest.spec.languages || quest.spec.languages.includes(track);
}

function saveDraft(): void {
    if (!activeQuest) return;
    try {
        if (track !== 'blocks') {
            const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
            if (code.trim()) storage()?.setItem(draftKey(activeQuest), code);
            else storage()?.removeItem(draftKey(activeQuest));
            return;
        }
        const workspace = getMainBlocklyWorkspace();
        if (!workspace) return;
        const xml = serializeWorkspaceXml(workspace);
        if (workspace.getAllBlocks(false).length > 1) storage()?.setItem(draftKey(activeQuest), xml);
        else storage()?.removeItem(draftKey(activeQuest));
    } catch {
        // Черновик — удобство, не обязанность.
    }
}

async function enterTextEditor(language: 'lua' | 'python', code: string): Promise<void> {
    setCurrentScriptLanguage(language);
    const select = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (select) select.value = language;
    setBlocklyEditorEnabled(false);
    await setEditorLanguage(language);
    await setEditorValue(code);
    syncScriptLanguageSelect();
}

async function loadQuestWorkspace(quest: Quest): Promise<void> {
    if (track !== 'blocks') {
        let draft: string | null = null;
        try { draft = storage()?.getItem(draftKey(quest)) ?? null; } catch { draft = null; }
        const comment = track === 'lua' ? '--' : '#';
        await enterTextEditor(track, draft ?? `${comment} ${quest.spec.title}: запишите программу здесь\n`);
        return;
    }
    setBlocklyEditorEnabled(true);
    let draft: string | null = null;
    try { draft = storage()?.getItem(draftKey(quest)) ?? null; } catch { draft = null; }
    if (draft) {
        try { await loadMainBlocklyXml(draft); return; } catch { /* битый черновик — начинаем с пустой программы */ }
    }
    await loadMainBlocklyJson(EMPTY_PROGRAM);
}

/** Редактор на весь экран закрывает сцену, поэтому «Блоки» и «Сцена» переключают вид: проверка полёта идёт на сцене. */
function showScene(): void {
    const open = document.getElementById('editor-panel')?.classList.contains('active');
    if (open) (window as any).closePanel?.();
}

function isEditorVisible(): boolean {
    return Boolean(document.getElementById('editor-panel')?.classList.contains('active'));
}

/** Редактор должен быть виден рядом со сценой; openPanel — переключатель, поэтому открываем только закрытый. */
function showEditorPanel(): void {
    const panel = document.getElementById('editor-panel');
    const panels = document.querySelector<HTMLElement>('.sidebar-panels');
    const open = panel?.classList.contains('active') && panels && panels.getBoundingClientRect().width > 8;
    if (!open) (window as any).openPanel?.('editor-panel');
}

async function openQuest(quest: Quest, options: { keepWork?: boolean } = {}): Promise<void> {
    saveDraft();
    checkToken++;
    checking = false;
    activeQuest = quest;
    hintOpen = false;
    feedback = null;
    progress = selectQuest(quests, progress, quest.id);
    persist();
    hideSuccess();
    renderHud();
    showEditorPanel();
    if (!options.keepWork) await loadQuestWorkspace(quest);
    startChecklistTimer();
    window.setTimeout(renderHud, 500);
}

function usedBlockTypes(): string[] {
    const workspace = getMainBlocklyWorkspace();
    return workspace ? workspace.getAllBlocks(false).map((block) => block.type) : [];
}

/** Чеклист нужных блоков обновляется по мере сборки программы. */
function startChecklistTimer(): void {
    window.clearInterval(checklistTimer);
    checklistTimer = window.setInterval(refreshChecklist, 600);
}

function stopChecklistTimer(): void {
    window.clearInterval(checklistTimer);
    checklistTimer = 0;
}

function refreshChecklist(): void {
    if (!activeQuest || getAppMode() !== 'learning' || track !== 'blocks') return;
    const list = requiredBlockChecklist(activeQuest, usedBlockTypes());
    el.hud.querySelectorAll<HTMLElement>('[data-need]').forEach((item, index) => {
        item.classList.toggle('is-done', Boolean(list[index]?.done));
    });
}

function renderHud(): void {
    const quest = activeQuest;
    if (!quest) { el.hud.hidden = true; return; }
    const done = countDone(quests, progress);
    const percent = Math.round((done / quests.length) * 100);
    const solved = progress.completed.includes(quest.id);
    const needs = track === 'blocks' ? requiredBlockChecklist(quest, usedBlockTypes()) : [];
    const spec = quest.spec;
    el.hud.hidden = false;
    el.hud.classList.toggle('is-collapsed', hudCollapsed);
    el.hud.innerHTML = `
        <div class="quest-hud__top">
            <div class="quest-hud__where">Задание ${quest.number} из ${quests.length} · ${esc(QUEST_GROUP_LABELS[quest.group])}</div>
            <button type="button" class="quest-hud__icon" data-quest-collapse aria-label="${hudCollapsed ? 'Развернуть задание' : 'Свернуть задание'}" title="${hudCollapsed ? 'Развернуть' : 'Свернуть'}">${hudCollapsed ? '+' : '−'}</button>
        </div>
        <div class="quest-hud__track pk-seg" role="group" aria-label="Чем писать программу">
            ${(Object.keys(TRACK_LABELS) as LearningTrack[]).map((key) => `<button type="button" class="pk-seg__btn${key === track ? ' is-active' : ''}" data-quest-track="${key}">${TRACK_LABELS[key]}</button>`).join('')}
        </div>
        <div class="quest-hud__view pk-seg" role="group" aria-label="Что показать">
            <button type="button" class="pk-seg__btn${isEditorVisible() ? ' is-active' : ''}" data-quest-view="blocks">${track === 'blocks' ? 'Блоки' : 'Код'}</button>
            <button type="button" class="pk-seg__btn${isEditorVisible() ? '' : ' is-active'}" data-quest-view="scene">Сцена</button>
        </div>
        <div class="quest-hud__progress" role="progressbar" aria-valuemin="0" aria-valuemax="${quests.length}" aria-valuenow="${done}" aria-label="Пройдено заданий">
            <span class="quest-hud__bar"><span style="width:${percent}%"></span></span>
            <span class="quest-hud__count">${done}/${quests.length}</span>
        </div>
        <div class="quest-hud__body">
            <h2 class="quest-hud__title">${esc(spec.title)}${solved ? `<span class="quest-hud__badge">${ICON.check} пройдено</span>` : ''}</h2>
            <p class="quest-hud__goal">${rich(spec.goal)}</p>
            <div class="quest-hud__label">Что сделать</div>
            <ol class="quest-hud__steps">${spec.recipe.map((step) => `<li>${rich(step)}</li>`).join('')}</ol>
            ${needs.length ? `
            <div class="quest-hud__label">Нужные блоки</div>
            <ul class="quest-hud__needs">${needs.map((need) => `<li data-need class="${need.done ? 'is-done' : ''}"><span class="quest-hud__tick">${ICON.check}</span>${esc(need.label)}</li>`).join('')}</ul>` : ''}
            ${track !== 'blocks' ? `<div class="quest-hud__note">Шаги даны блоками. Запишите то же самое на ${TRACK_LABELS[track]}: проверяется полёт, а не вид кода.${trackSupported(quest) ? '' : ' <strong>Этот урок только для Lua: блок «Каждые N сек» в браузерном Python не держит ритм.</strong>'}</div>` : ''}
            ${hintOpen ? `<div class="quest-hud__hint"><strong>Подсказка.</strong> ${rich(spec.hint)}</div>` : ''}
            ${feedback ? `<div class="quest-hud__feedback quest-hud__feedback--${feedback.kind}" role="status"><strong>${esc(feedback.title)}</strong>${feedback.lines.map((line) => `<div>${rich(line)}</div>`).join('')}</div>` : ''}
            <div class="quest-hud__actions">
                <button type="button" class="btn-primary" data-quest-check ${checking ? 'disabled' : ''}>${checking ? 'Проверяем полёт…' : 'Проверить полёт'}</button>
                <button type="button" class="btn-secondary" data-quest-hint>${hintOpen ? 'Скрыть подсказку' : 'Подсказка'}</button>
                ${hintOpen ? '<button type="button" class="btn-secondary" data-quest-solution>Показать решение</button>' : ''}
            </div>
        </div>
        <button type="button" class="quest-hud__map-btn" data-quest-map>${ICON.map} Карта заданий</button>`;
    el.hud.querySelectorAll<HTMLElement>('[data-quest-track]').forEach((button) => {
        button.addEventListener('click', () => { void changeTrack(button.dataset.questTrack as LearningTrack); });
    });
    el.hud.querySelectorAll<HTMLElement>('[data-quest-view]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.questView === 'blocks') showEditorPanel(); else showScene();
            window.setTimeout(renderHud, 120);
        });
    });
    el.hud.querySelector('[data-quest-collapse]')?.addEventListener('click', () => { hudCollapsed = !hudCollapsed; renderHud(); });
    el.hud.querySelector('[data-quest-hint]')?.addEventListener('click', () => { hintOpen = !hintOpen; renderHud(); });
    el.hud.querySelector('[data-quest-map]')?.addEventListener('click', showMap);
    el.hud.querySelector('[data-quest-check]')?.addEventListener('click', () => { void checkQuest(); });
    el.hud.querySelector('[data-quest-solution]')?.addEventListener('click', () => {
        void showSolution(quest).then(() => {
            feedback = { kind: 'info', title: 'Решение загружено в редактор', lines: ['Разберите блоки сверху вниз и нажмите «Проверить полёт».'] };
            renderHud();
        });
    });
}

/** Решение лежит блоками: для Lua и Python оно собирается в код и кладётся в текстовый редактор. */
async function showSolution(quest: Quest): Promise<void> {
    await loadMainBlocklyJson(JSON.stringify(quest.spec.solution));
    if (track === 'blocks') return;
    setCurrentScriptLanguage(track);
    await setEditorLanguage(track);
    const code = getEditorValue();
    await enterTextEditor(track, code);
}

async function changeTrack(next: LearningTrack): Promise<void> {
    if (next === track || !activeQuest) return;
    saveDraft();
    track = next;
    try { storage()?.setItem(TRACK_STORAGE_KEY, track); } catch { /* ignore */ }
    feedback = null;
    await loadQuestWorkspace(activeQuest);
    renderHud();
}

async function ensureLanguage(quest: Quest): Promise<'lua' | 'python'> {
    if (track !== 'blocks') return track;
    const allowed = quest.spec.languages;
    if (allowed && !allowed.includes(currentScriptLanguage)) {
        const language = allowed[0];
        setCurrentScriptLanguage(language);
        const select = document.getElementById('script-language-select') as HTMLSelectElement | null;
        if (select) select.value = language;
        await setEditorLanguage(language);
    }
    return currentScriptLanguage === 'python' ? 'python' : 'lua';
}

async function checkQuest(): Promise<void> {
    const quest = activeQuest;
    if (!quest || checking) return;
    if (track !== 'blocks') {
        const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
        if (!trackSupported(quest)) {
            feedback = { kind: 'error', title: 'Этот урок только для Lua', lines: ['Переключитесь на Lua или Blockly: в браузерном Python блок «Каждые N сек» не держит ритм.'] };
            renderHud();
            return;
        }
        if (!code.split('\n').some((line) => line.trim() && !/^\s*(--|#)/.test(line))) {
            feedback = { kind: 'error', title: 'Программа пока пустая', lines: [`Запишите программу на ${TRACK_LABELS[track]} в редакторе: команды дрона, как в шагах задания.`] };
            renderHud();
            return;
        }
        await runFlightCheck(quest);
        return;
    }
    const used = usedBlockTypes();
    const body = used.filter((type) => type !== 'pioneer_start');
    if (!used.includes('pioneer_start') || body.length === 0) {
        feedback = { kind: 'error', title: 'Программа пока пустая', lines: ['Прикрепите команды под блок «Начало программы» по шагам задания.'] };
        renderHud();
        return;
    }
    const missing = requiredBlockChecklist(quest, used).filter((item) => !item.done);
    if (missing.length) {
        feedback = { kind: 'error', title: 'Не хватает блоков', lines: missing.map((item) => `Добавьте блок «${item.label}».`) };
        renderHud();
        return;
    }
    await runFlightCheck(quest);
}

async function runFlightCheck(quest: Quest): Promise<void> {
    showScene();
    const token = ++checkToken;
    checking = true;
    feedback = null;
    renderHud();
    try {
        const language = await ensureLanguage(quest);
        await restartAndRunSimulation();
        const result = await runTextLessonCheck(quest.id, {
            waitMs: quest.spec.expect.waitMs, language, isCurrent: () => token === checkToken
        });
        if (token !== checkToken) return;
        checking = false;
        if (result.solved) {
            progress = completeQuest(quests, progress, quest.id);
            persist();
            try { storage()?.removeItem(draftKey(quest)); } catch { /* ignore */ }
            renderHud();
            showSuccess(quest);
            return;
        }
        const errors = result.diagnostics.filter((item) => item.kind === 'error');
        feedback = {
            kind: 'error',
            title: 'Пока не получилось',
            lines: (errors.length ? errors : result.diagnostics).slice(0, 3).map((item) => `${item.title}. ${item.fix}`)
        };
    } catch {
        if (token !== checkToken) return;
        checking = false;
        feedback = { kind: 'error', title: 'Проверка прервалась', lines: ['Запуск или чтение состояния дрона не удались. Попробуйте ещё раз.'] };
    }
    renderHud();
}

/* ---------- Успех и карта ---------- */

function showSuccess(quest: Quest): void {
    const next = nextQuest(quests, quest.id);
    const done = countDone(quests, progress);
    const finished = done === quests.length;
    el.success.hidden = false;
    el.success.innerHTML = `
        <div class="quest-success__card" role="dialog" aria-modal="false" aria-labelledby="quest-success-title">
            <div class="quest-success__seal">${ICON.check}</div>
            <div class="quest-success__kicker">${finished ? 'Все задания пройдены' : 'Задание выполнено'}</div>
            <h2 id="quest-success-title" class="quest-success__title">${esc(quest.spec.title)}</h2>
            <p class="quest-success__text">${rich(quest.spec.outcome)}</p>
            <div class="quest-success__score">Пройдено ${done} из ${quests.length}${next ? ` · открыто: ${esc(next.spec.title)}` : ''}</div>
            <div class="quest-success__actions">
                ${next ? '<button type="button" class="btn-primary" data-success-next>Следующее задание</button>' : ''}
                <button type="button" class="btn-secondary" data-success-close>${next ? 'Остаться здесь' : 'Закрыть'}</button>
                <button type="button" class="btn-secondary" data-success-map>Карта заданий</button>
            </div>
        </div>`;
    el.success.querySelector('[data-success-next]')?.addEventListener('click', () => { if (next) void openQuest(next); });
    el.success.querySelector('[data-success-close]')?.addEventListener('click', hideSuccess);
    el.success.querySelector('[data-success-map]')?.addEventListener('click', () => { hideSuccess(); showMap(); });
    el.success.querySelector<HTMLElement>('[data-success-next], [data-success-close]')?.focus();
}

function hideSuccess(): void {
    el.success.hidden = true;
    el.success.innerHTML = '';
}

function showMap(): void {
    const done = countDone(quests, progress);
    const groups = QUEST_GROUP_ORDER.map((group) => {
        const items = quests.filter((quest) => quest.group === group);
        const tiles = items.map((quest) => {
            const status = questStatus(quests, progress, quest.id);
            const current = activeQuest?.id === quest.id;
            const mark = status === 'done' ? ICON.check : status === 'locked' ? ICON.lock : String(quest.number);
            const label = status === 'done' ? 'пройдено' : status === 'locked' ? 'закрыто' : 'доступно';
            return `<li><button type="button" class="quest-tile quest-tile--${status}${current ? ' is-current' : ''}" data-map-quest="${esc(quest.id)}" ${status === 'locked' ? 'disabled' : ''}>
                <span class="quest-tile__mark">${mark}</span>
                <span class="quest-tile__name">${esc(quest.spec.title)}</span>
                <span class="quest-tile__status">${label}</span></button></li>`;
        }).join('');
        const groupDone = items.filter((quest) => progress.completed.includes(quest.id)).length;
        return `<section class="quest-map__group"><h3>${esc(QUEST_GROUP_LABELS[group])} <small>${groupDone}/${items.length}</small></h3><ol class="quest-map__list">${tiles}</ol></section>`;
    }).join('');
    el.map.hidden = false;
    el.map.innerHTML = `
        <div class="quest-map__card" role="dialog" aria-modal="true" aria-labelledby="quest-map-title">
            <div class="quest-map__head">
                <div><h2 id="quest-map-title">Карта заданий</h2><div class="quest-map__sub">Пройдено ${done} из ${quests.length}. Следующее задание открывается, когда пройдено предыдущее.</div></div>
                <button type="button" class="quest-hud__icon" data-map-close aria-label="Закрыть карту">${ICON.close}</button>
            </div>
            <div class="quest-map__groups">${groups}</div>
            <div class="quest-map__foot"><button type="button" class="btn-secondary btn--sm" data-map-reset>Сбросить прогресс</button></div>
        </div>`;
    el.map.querySelector('[data-map-close]')?.addEventListener('click', hideMap);
    el.map.addEventListener('click', (event) => { if (event.target === el.map) hideMap(); }, { once: true });
    el.map.querySelectorAll<HTMLButtonElement>('[data-map-quest]').forEach((button) => {
        button.addEventListener('click', () => {
            const quest = quests.find((item) => item.id === button.dataset.mapQuest);
            hideMap();
            if (quest) void openQuest(quest);
        });
    });
    el.map.querySelector('[data-map-reset]')?.addEventListener('click', () => {
        if (!window.confirm('Сбросить весь прогресс заданий? Это нельзя отменить.')) return;
        progress = emptyProgress();
        quests.forEach((quest) => { try { storage()?.removeItem(draftKey(quest)); } catch { /* ignore */ } });
        persist();
        hideMap();
        const first = currentQuest(quests, progress);
        if (first) void openQuest(first);
    });
    el.map.querySelector<HTMLElement>('.quest-tile.is-current, .quest-tile--available')?.focus();
}

function hideMap(): void {
    el.map.hidden = true;
    el.map.innerHTML = '';
}

/* ---------- Режимы ---------- */

function applyMode(mode: AppMode, previous: AppMode): void {
    if (previous === 'learning') {
        saveDraft();
        checkToken++;
        checking = false;
        stopChecklistTimer();
        hideSuccess();
        hideMap();
    }
    el.hud.hidden = true;
    el.menu.hidden = mode === 'start';
    el.menu.innerHTML = `${ICON.home}<span>Меню</span>`;
    el.menu.title = mode === 'learning' ? 'Вернуться на стартовый экран' : 'Вернуться на стартовый экран и выбрать режим';
    if (mode === 'start') { showStart(); return; }
    hideStart();
    if (mode === 'free') return;
    (window as any).closeMissionGuideModal?.();
    const quest = currentQuest(quests, progress);
    if (quest) void openQuest(quest);
}

function buildDom(): void {
    const make = (tag: string, id: string, className: string, hidden = true) => {
        const node = document.createElement(tag);
        node.id = id;
        node.className = className;
        node.hidden = hidden;
        return node;
    };
    el.start = make('div', 'start-screen', 'start-screen', false);
    el.start.setAttribute('role', 'dialog');
    el.start.setAttribute('aria-label', 'Выбор режима');
    el.hud = make('aside', 'quest-hud', 'quest-hud');
    el.hud.setAttribute('aria-label', 'Текущее задание');
    el.map = make('div', 'quest-map', 'quest-map');
    el.success = make('div', 'quest-success', 'quest-success');
    el.menu = make('button', 'mode-menu-btn', 'mode-menu-btn') as HTMLButtonElement;
    el.menu.type = 'button';
    el.menu.setAttribute('aria-label', 'Вернуться на стартовый экран');
    el.menu.addEventListener('click', () => setAppMode('start', storage()));
    document.body.append(el.hud, el.success, el.map, el.menu, el.start);
}

/** Карточку можно перетащить за заголовок; место запоминается. */
function enableHudDrag(): void {
    const place = (left: number, top: number) => {
        el.hud.style.left = `${Math.min(Math.max(0, left), Math.max(0, window.innerWidth - 80))}px`;
        el.hud.style.top = `${Math.min(Math.max(0, top), Math.max(0, window.innerHeight - 48))}px`;
        el.hud.style.right = 'auto';
    };
    try {
        const saved = JSON.parse(storage()?.getItem(HUD_POS_STORAGE_KEY) || 'null');
        if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) place(saved.left, saved.top);
    } catch { /* ignore */ }
    el.hud.addEventListener('pointerdown', (event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.quest-hud__top') || target.closest('button')) return;
        const box = el.hud.getBoundingClientRect();
        const dx = event.clientX - box.left;
        const dy = event.clientY - box.top;
        el.hud.classList.add('is-dragging');
        const move = (e: PointerEvent) => place(e.clientX - dx, e.clientY - dy);
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            el.hud.classList.remove('is-dragging');
            const now = el.hud.getBoundingClientRect();
            try { storage()?.setItem(HUD_POS_STORAGE_KEY, JSON.stringify({ left: now.left, top: now.top })); } catch { /* ignore */ }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        event.preventDefault();
    });
    window.addEventListener('resize', () => {
        if (el.hud.style.left) { const b = el.hud.getBoundingClientRect(); place(b.left, b.top); }
    });
}

/** Подключается один раз при запуске, после initUI: учебник уже повесил openMissionGuideModal. */
export function initLearningMode(): void {
    buildDom();
    progress = loadProgress(storage(), quests);
    track = loadTrack();
    enableHudDrag();
    originalOpenGuide = (window as any).openMissionGuideModal;
    (window as any).openMissionGuideModal = (...args: unknown[]) => {
        if (getAppMode() === 'learning') return;
        (originalOpenGuide as ((...a: unknown[]) => void) | undefined)?.(...args);
    };
    onAppModeChange(applyMode);
    document.body.dataset.appMode = 'start';
    el.menu.hidden = true;
    showStart();
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!el.map.hidden) hideMap();
        else if (!el.success.hidden) hideSuccess();
    });
}
