/**
 * Стартовый экран и режим обучения: DOM-слой поверх симулятора.
 *
 * Свободный режим — прежний симулятор. В режиме обучения поверх экрана лежит одна карточка миссии, и она показывает
 * один шаг за раз: вводная → шаг 1 → … → шаг N → проверка полёта. Сделанный шаг уходит, на его месте появляется
 * следующий. Проверка — настоящий полёт: программа запускается в симуляторе, а `runTextLessonCheck` сверяет результат
 * с ожиданием урока. Из свободного режима в миссию ведёт `window.openLearningMission(номер?)`: кнопка в боковой панели
 * и кнопки уведомлений об ошибках («Разобрать в уроке 3»).
 *
 * Чем писать, выбирает ученик: Blockly (практикум на блоках) или Lua / Python (уроки Академии).
 */
import { currentDroneId, currentScriptLanguage, setCurrentScriptLanguage } from '../core/state.js';
import { restartAndRunSimulation } from '../app/simulation-controls.js';
import {
    getEditorValue, getMainBlocklyWorkspace, isBlocklyEditorEnabled, loadMainBlocklyJson, loadMainBlocklyXml,
    serializeWorkspaceXml, setBlocklyEditorEnabled, setEditorLanguage, setEditorValue, syncScriptLanguageSelect
} from '../editor/index.js';
import { renderApiDocs } from '../ui/api-docs/index.js';
import { beginLearningCapture, finishLearningCapture } from '../core/learning-journal.js';
import { runTextLessonCheck } from '../ui/mission-guide/evaluation/text/index.js';
import { getAcademySceneEvidence, prepareAcademyScene, restoreAcademyScene, academySceneProfile } from '../ui/mission-guide/academy/scene.js';
import { ACCOUNT_TRACKS, fetchProgress, getLastAuthKind, getUser, onUserChange, reportCompleted, restoreSession } from './account.js';
import { initAccountUi } from './account-ui.js';
import { openTeacherPanel } from './teacher-panel.js';
import { getAppMode, loadLastMode, onAppModeChange, setAppMode, type AppMode } from './mode.js';
import {
    buildAcademyQuests, buildQuests, clampStep, completeQuest, countDone, currentQuest, emptyProgress, INTRO_STEP, lastStepIndex,
    loadProgress, nextQuest, QUEST_DRAFT_STORAGE_PREFIX, QUEST_PROGRESS_STORAGE_KEY, questGroups, questStatus,
    requiredBlockChecklist, saveProgress, selectQuest,
    type Quest, type QuestProgress
} from './quests.js';

/** Чем ученик пишет программы. Blockly — практикум на блоках, Lua и Python — уроки Академии. */
export type LearningTrack = 'blocks' | 'lua' | 'python';
const TRACK_STORAGE_KEY = 'pioneer:learning:track:v1';
const HUD_POS_STORAGE_KEY = 'pioneer:learning:hud-pos:v1';
const TRACK_LABELS: Record<LearningTrack, string> = { blocks: 'Blockly', lua: 'Lua', python: 'Python' };
const EMPTY_PROGRAM = JSON.stringify({ blocks: { languageVersion: 0, blocks: [{ type: 'pioneer_start', x: 40, y: 40 }] } });

function storage(): Storage | null {
    try { return window.localStorage; } catch { return null; }
}

let track: LearningTrack = 'blocks';
const questsByTrack: Partial<Record<LearningTrack, Quest[]>> = {};
let quests: Quest[] = [];
let progress: QuestProgress = emptyProgress();
let activeQuest: Quest | null = null;
let step = INTRO_STEP;
let hintOpen = false;
let hudCollapsed = false;
let checking = false;
let checkToken = 0;
let feedback: { kind: 'info' | 'error'; title: string; lines: string[] } | null = null;
let checklistTimer = 0;
/** Шаг с подсветкой засчитывается сам только после того, как ученик дошёл до него. */
let guideArmed = false;
/** Повторные запуски и частные опыты Академии: часть уроков засчитывается только после нескольких запусков. */
const experimentTrials = new Map<string, Set<string>>();
const repeatedExperiments = new Map<string, string>();
let academyParts: { lift?: string; vision?: string } = {};

const el = {} as {
    start: HTMLElement; hud: HTMLElement; map: HTMLElement; success: HTMLElement; menu: HTMLButtonElement; spot: HTMLElement;
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

/** Текст уроков размечает код обратными кавычками и выделение двойными звёздочками. */
function rich(text: string): string {
    return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/**
 * Прогресс ученика с аккаунтом хранится отдельно от гостевого и от других учеников этого же браузера (школьный
 * компьютер один на всех). Гость и учитель пользуются общим локальным прогрессом.
 */
function scope(): string {
    const user = getUser();
    return user?.role === 'student' ? `:u:${user.id}` : '';
}

function progressKey(forTrack: LearningTrack = track, forScope: string = scope()): string {
    return (forTrack === 'blocks' ? QUEST_PROGRESS_STORAGE_KEY : `${QUEST_PROGRESS_STORAGE_KEY}:${forTrack}`) + forScope;
}

/** Зачёт, который выставил сервер (в том числе учитель вручную), главнее локального прогресса. */
async function syncFromServer(): Promise<void> {
    const user = getUser();
    if (user?.role !== 'student') return;
    try {
        const server = await fetchProgress();
        for (const key of ACCOUNT_TRACKS) {
            const list = questsFor(key);
            const local = loadProgress(storage(), list, progressKey(key));
            const completed = server[key].filter((id) => list.some((quest) => quest.id === id));
            saveProgress(storage(), { completed, currentId: local.currentId }, progressKey(key));
        }
        progress = loadProgress(storage(), quests, progressKey());
        if (activeQuest && getAppMode() === 'learning') renderHud();
    } catch {
        // Нет связи с сервером: остаётся локальный прогресс, он отправится при следующей пройденной миссии.
    }
}

/** После регистрации то, что ученик успел пройти гостем, переходит в его аккаунт. */
async function adoptGuestProgress(): Promise<void> {
    for (const key of ACCOUNT_TRACKS) {
        const guest = loadProgress(storage(), questsFor(key), progressKey(key, ''));
        for (const id of guest.completed) await reportCompleted(key, id).catch(() => undefined);
    }
}

async function handleUserChange(): Promise<void> {
    if (getUser() && getLastAuthKind() === 'register') await adoptGuestProgress();
    useTrack(track);
    await syncFromServer();
    if (getAppMode() === 'start') renderStart();
    else if (getAppMode() === 'learning') {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
    }
}

function questsFor(forTrack: LearningTrack): Quest[] {
    return questsByTrack[forTrack] ??= forTrack === 'blocks' ? buildQuests() : buildAcademyQuests(forTrack);
}

function persist(): void {
    saveProgress(storage(), progress, progressKey());
}

function loadTrack(): LearningTrack {
    try {
        const value = storage()?.getItem(TRACK_STORAGE_KEY);
        return value === 'lua' || value === 'python' ? value : 'blocks';
    } catch { return 'blocks'; }
}

function useTrack(next: LearningTrack): void {
    track = next;
    quests = questsFor(next);
    progress = loadProgress(storage(), quests, progressKey());
    try { storage()?.setItem(TRACK_STORAGE_KEY, next); } catch { /* ignore */ }
}

/* ---------- Стартовый экран ---------- */

function renderStart(): void {
    const last = loadLastMode(storage());
    const done = countDone(questsFor(track), loadProgress(storage(), questsFor(track), progressKey()));
    const total = questsFor(track).length;
    const learnNote = done > 0 ? `Продолжить: пройдено ${done} из ${total}` : 'Миссии по шагам: от первой команды до полётных заданий';
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
                ${card('free', ICON.free, 'Свободный режим', 'Весь симулятор без ограничений: сцена, редактор и справочник. Пишите и запускайте что угодно.', 'Как раньше')}
                ${card('learning', ICON.learn, 'Режим обучения', 'Тот же симулятор, но с миссиями на экране. Один шаг за раз: сделали шаг, появился следующий, в конце проверка полёта.', learnNote)}
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
        lua: ['Lua', 'Текстовый код в редакторе, как в прошивке дрона. Миссии Академии: дрон, сигналы, программы, время, полёт.'],
        python: ['Python', 'Текстовый код с pioneer_sdk. Те же миссии Академии, плюс камера и метки ArUco.']
    };
    el.start.innerHTML = `
        <div class="start-screen__inner">
            <div class="start-screen__brand">Режим обучения</div>
            <h1 class="start-screen__title">Чем будете писать программы?</h1>
            <div class="start-screen__choices start-screen__choices--three">
                ${(Object.keys(info) as LearningTrack[]).map((key) => {
                    const total = questsFor(key).length;
                    const done = countDone(questsFor(key), loadProgress(storage(), questsFor(key), progressKey(key)));
                    return `
                <button type="button" class="start-card${track === key ? ' is-last' : ''}" data-start-track="${key}">
                    <span class="start-card__title">${info[key][0]}</span>
                    <span class="start-card__text">${info[key][1]}</span>
                    <span class="start-card__note">${track === key ? 'Выбрано в прошлый раз · ' : ''}пройдено ${done} из ${total}</span>
                </button>`;
                }).join('')}
            </div>
            <button type="button" class="btn-secondary start-screen__back" data-start-back>← К выбору режима</button>
        </div>`;
    el.start.querySelectorAll<HTMLButtonElement>('[data-start-track]').forEach((button) => {
        button.addEventListener('click', () => {
            useTrack(button.dataset.startTrack as LearningTrack);
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

/* ---------- Редактор и черновики ---------- */

function draftKey(quest: Quest): string {
    return QUEST_DRAFT_STORAGE_PREFIX + scope().slice(1) + (track === 'blocks' ? '' : `${track}:`) + quest.id;
}

function saveDraft(): void {
    if (!activeQuest) return;
    try {
        if (track !== 'blocks') {
            const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
            if (code.trim() && code !== activeQuest.lesson?.starterCode) storage()?.setItem(draftKey(activeQuest), code);
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

function readDraft(quest: Quest): string | null {
    try { return storage()?.getItem(draftKey(quest)) ?? null; } catch { return null; }
}

async function enterTextEditor(language: 'lua' | 'python', code: string): Promise<void> {
    setCurrentScriptLanguage(language);
    const select = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (select) select.value = language;
    setBlocklyEditorEnabled(false);
    await setEditorLanguage(language);
    await setEditorValue(code);
    syncScriptLanguageSelect();
    // The reference follows the language of the track, otherwise a Python mission would search the Lua catalog.
    renderApiDocs(language);
}

async function loadQuestWorkspace(quest: Quest): Promise<void> {
    if (track !== 'blocks') {
        await enterTextEditor(track, readDraft(quest) ?? quest.lesson?.starterCode ?? '');
        return;
    }
    setBlocklyEditorEnabled(true);
    const draft = readDraft(quest);
    if (draft) {
        try { await loadMainBlocklyXml(draft); return; } catch { /* битый черновик — начинаем с пустой программы */ }
    }
    await loadMainBlocklyJson(EMPTY_PROGRAM);
}

/** Часть уроков Академии идёт на своей местности; ученик не должен готовить её сам. */
function prepareQuestScene(quest: Quest): void {
    restoreAcademyScene();
    const number = quest.lesson?.academy?.number;
    // Проверка полёта (миссии с 37) требует учебную сцену, в том числе ровное поле; в ранних миссиях сцену не трогаем.
    if (!number || (number < 37 && academySceneProfile(number) === 'field')) return;
    prepareAcademyScene(number, 1000 + number);
}

/** Редактор на весь экран закрывает сцену, поэтому «Код» и «Сцена» переключают вид: проверка полёта идёт на сцене. */
function showScene(): void {
    if (document.getElementById('editor-panel')?.classList.contains('active')) (window as any).closePanel?.();
}

function isEditorVisible(): boolean {
    return Boolean(document.getElementById('editor-panel')?.classList.contains('active'));
}

/** openPanel — переключатель, поэтому редактор открываем, только если он закрыт. */
function showEditorPanel(): void {
    const panel = document.getElementById('editor-panel');
    const panels = document.querySelector<HTMLElement>('.sidebar-panels');
    const open = panel?.classList.contains('active') && panels && panels.getBoundingClientRect().width > 8;
    if (!open) (window as any).openPanel?.('editor-panel');
}

async function openQuest(quest: Quest): Promise<void> {
    saveDraft();
    checkToken++;
    checking = false;
    activeQuest = quest;
    step = INTRO_STEP;
    hintOpen = false;
    feedback = null;
    academyParts = {};
    progress = selectQuest(quests, progress, quest.id);
    persist();
    hideSuccess();
    renderHud('forward');
    showEditorPanel();
    prepareQuestScene(quest);
    try { await loadQuestWorkspace(quest); } catch (error) { console.error("[learning] workspace", error); }
    startChecklistTimer();
    window.setTimeout(() => renderHud(), 500);
}

function usedBlockTypes(): string[] {
    const workspace = getMainBlocklyWorkspace();
    return workspace ? workspace.getAllBlocks(false).map((block) => block.type) : [];
}

/** Чеклист нужных блоков и подсветка интерфейса обновляются, пока ученик работает. */
function startChecklistTimer(): void {
    window.clearInterval(checklistTimer);
    checklistTimer = window.setInterval(() => { refreshChecklist(); syncGuide(); }, 300);
}

function stopChecklistTimer(): void {
    window.clearInterval(checklistTimer);
    checklistTimer = 0;
    hideSpot();
}

function hideSpot(): void {
    el.spot.hidden = true;
}

/**
 * Шаг с подсветкой: рамка вокруг нужной кнопки и подпись. Карточка отодвигается, если закрывает цель.
 * Когда ученик сделал нужное, шаг засчитывается сам и появляется следующая карточка.
 */
function syncGuide(): void {
    const quest = activeQuest;
    const guide = quest && step >= 0 && step < lastStepIndex(quest) ? quest.guides?.[step] : undefined;
    if (!quest || !guide || getAppMode() !== 'learning' || el.success.hidden === false) { hideSpot(); return; }
    const target = guide.target ? document.querySelector<HTMLElement>(guide.target) : null;
    const rect = target && !target.hidden && target.getClientRects().length ? target.getBoundingClientRect() : null;
    if (rect && rect.width > 0) {
        el.spot.hidden = false;
        el.spot.style.left = `${rect.left - 5}px`;
        el.spot.style.top = `${rect.top - 5}px`;
        el.spot.style.width = `${rect.width + 10}px`;
        el.spot.style.height = `${rect.height + 10}px`;
        el.spot.dataset.label = guide.label ?? '';
        el.spot.classList.toggle('is-below', rect.top < 40);
        const hud = el.hud.getBoundingClientRect();
        const overlaps = hud.left < rect.right && hud.right > rect.left && hud.top < rect.bottom && hud.bottom > rect.top;
        if (overlaps && !el.hud.classList.contains('is-dragging')) {
            el.hud.style.left = `${Math.max(8, rect.left - hud.width - 24)}px`;
            el.hud.style.right = 'auto';
        }
    } else {
        hideSpot();
    }
    if (guide.until && guideArmed && guide.until()) {
        guideArmed = false;
        window.setTimeout(() => { if (activeQuest === quest && step < lastStepIndex(quest)) goToStep(step + 1); }, 500);
    }
}

function refreshChecklist(): void {
    if (!activeQuest || getAppMode() !== 'learning' || track !== 'blocks') return;
    const list = requiredBlockChecklist(activeQuest, usedBlockTypes());
    el.hud.querySelectorAll<HTMLElement>('[data-need]').forEach((item, index) => {
        item.classList.toggle('is-done', Boolean(list[index]?.done));
    });
}

/* ---------- Карточка миссии ---------- */

/** Один шаг за раз: уходящая карточка гаснет, новая выезжает на её место. */
function goToStep(next: number): void {
    if (!activeQuest) return;
    const target = clampStep(activeQuest, next);
    if (target === step) return;
    const direction = target > step ? 'forward' : 'back';
    const card = el.hud.querySelector<HTMLElement>('.quest-card');
    const apply = () => {
        step = target;
        hintOpen = false;
        feedback = null;
        guideArmed = direction === 'forward';
        if (activeQuest?.guides?.[step]?.inEditor) showEditorPanel();
        renderHud(direction);
    };
    if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        card.classList.add(direction === 'forward' ? 'is-leaving' : 'is-leaving-back');
        window.setTimeout(apply, 160);
    } else {
        apply();
    }
}

function stepDots(quest: Quest): string {
    return `<span class="quest-dots" aria-hidden="true">${quest.steps.map((_, index) =>
        `<i class="${index < step ? 'is-done' : index === step ? 'is-current' : ''}"></i>`).join('')}<i class="${step === lastStepIndex(quest) ? 'is-current' : ''}"></i></span>`;
}

function renderCard(quest: Quest): string {
    const hint = hintOpen ? `<div class="quest-hud__hint"><strong>Подсказка.</strong> ${rich(quest.hint)}</div>` : '';
    const hintButton = `<button type="button" class="btn-secondary" data-quest-hint>${hintOpen ? 'Скрыть подсказку' : 'Подсказка'}</button>`;
    const solved = progress.completed.includes(quest.id);
    if (step === INTRO_STEP) {
        return `
            <div class="quest-card__label">Миссия ${quest.number} · ${esc(quest.groupLabel)}${solved ? `<span class="quest-hud__badge">${ICON.check} пройдена</span>` : ''}</div>
            <h2 class="quest-card__title">${esc(quest.title)}</h2>
            <p class="quest-card__text">${rich(quest.goal)}</p>
            <div class="quest-card__meta">${quest.steps.length} ${stepsWord(quest.steps.length)} и проверка полёта</div>
            <div class="quest-hud__actions"><button type="button" class="btn-primary" data-quest-next>Начать миссию</button></div>`;
    }
    if (step < lastStepIndex(quest)) {
        const final = step === lastStepIndex(quest) - 1;
        return `
            <div class="quest-card__label">Шаг ${step + 1} из ${quest.steps.length}${stepDots(quest)}</div>
            <p class="quest-card__step">${rich(quest.steps[step])}</p>
            ${hint}
            <div class="quest-hud__actions">
                <button type="button" class="btn-primary" data-quest-next>${final ? 'Готово, к проверке' : 'Сделал, дальше'}</button>
                ${hintButton}
                <button type="button" class="btn-secondary quest-hud__back" data-quest-prev aria-label="Назад">←</button>
            </div>`;
    }
    const needs = track === 'blocks' ? requiredBlockChecklist(quest, usedBlockTypes()) : [];
    return `
        <div class="quest-card__label">Проверка полёта${stepDots(quest)}</div>
        <p class="quest-card__step">Запустите программу: дрон выполнит её, а проверка посмотрит результат на сцене.</p>
        ${needs.length ? `<ul class="quest-hud__needs">${needs.map((need) => `<li data-need class="${need.done ? 'is-done' : ''}"><span class="quest-hud__tick">${ICON.check}</span>Блок «${esc(need.label)}»</li>`).join('')}</ul>` : ''}
        ${quest.lesson?.academy?.number === 1 ? academyQuestions() : ''}
        ${hint}
        ${feedback ? `<div class="quest-hud__feedback quest-hud__feedback--${feedback.kind}" role="status"><strong>${esc(feedback.title)}</strong>${feedback.lines.map((line) => `<div>${rich(line)}</div>`).join('')}</div>` : ''}
        <div class="quest-hud__actions">
            <button type="button" class="btn-primary" data-quest-check ${checking ? 'disabled' : ''}>${checking ? 'Проверяем полёт…' : 'Проверить полёт'}</button>
            ${hintButton}
            ${hintOpen ? '<button type="button" class="btn-secondary" data-quest-solution>Показать решение</button>' : ''}
            <button type="button" class="btn-secondary quest-hud__back" data-quest-prev aria-label="К шагам">←</button>
        </div>`;
}

function stepsWord(count: number): string {
    const last = count % 10;
    if (count % 100 >= 11 && count % 100 <= 14) return 'шагов';
    return last === 1 ? 'шаг' : last >= 2 && last <= 4 ? 'шага' : 'шагов';
}

/** Первый урок Академии — осмотр аппарата: вместо кода два вопроса. */
function academyQuestions(): string {
    const group = (part: 'lift' | 'vision', title: string, options: Array<[string, string]>) => `
        <fieldset class="quest-q"><legend>${title}</legend>${options.map(([value, label]) =>
            `<label><input type="radio" name="quest-${part}" value="${value}" data-quest-part="${part}"${academyParts[part] === value ? ' checked' : ''}> ${label}</label>`).join('')}</fieldset>`;
    return group('lift', 'Что создаёт тягу?', [['rotors', 'Винты'], ['camera', 'Камера']])
        + group('vision', 'Что получает изображение?', [['camera', 'Камера'], ['rotors', 'Винты']]);
}

function renderHud(direction: 'forward' | 'back' = 'forward'): void {
    const quest = activeQuest;
    if (!quest) { el.hud.hidden = true; return; }
    const done = countDone(quests, progress);
    const percent = Math.round((done / quests.length) * 100);
    el.hud.hidden = false;
    el.hud.classList.toggle('is-collapsed', hudCollapsed);
    el.hud.innerHTML = `
        <div class="quest-hud__top">
            <div class="quest-hud__where">Миссия ${quest.number} из ${quests.length} · ${esc(quest.groupLabel)}</div>
            <button type="button" class="quest-hud__icon" data-quest-collapse aria-label="${hudCollapsed ? 'Развернуть' : 'Свернуть'}" title="${hudCollapsed ? 'Развернуть' : 'Свернуть'}">${hudCollapsed ? '+' : '−'}</button>
        </div>
        <div class="quest-hud__progress" role="progressbar" aria-valuemin="0" aria-valuemax="${quests.length}" aria-valuenow="${done}" aria-label="Пройдено миссий">
            <span class="quest-hud__bar"><span style="width:${percent}%"></span></span>
            <span class="quest-hud__count">${done}/${quests.length}</span>
        </div>
        <div class="quest-hud__body">
            <div class="quest-hud__switches">
                <div class="quest-hud__track pk-seg" role="group" aria-label="Чем писать программу">
                    ${(Object.keys(TRACK_LABELS) as LearningTrack[]).map((key) => `<button type="button" class="pk-seg__btn${key === track ? ' is-active' : ''}" data-quest-track="${key}">${TRACK_LABELS[key]}</button>`).join('')}
                </div>
                <div class="quest-hud__view pk-seg" role="group" aria-label="Что показать">
                    <button type="button" class="pk-seg__btn${isEditorVisible() ? ' is-active' : ''}" data-quest-view="code">${track === 'blocks' ? 'Блоки' : 'Код'}</button>
                    <button type="button" class="pk-seg__btn${isEditorVisible() ? '' : ' is-active'}" data-quest-view="scene">Сцена</button>
                </div>
            </div>
            <div class="quest-card quest-card--${direction === 'forward' ? 'in' : 'in-back'}" data-card="${step}">${renderCard(quest)}</div>
        </div>
        <button type="button" class="quest-hud__map-btn" data-quest-map>${ICON.map} Карта миссий</button>`;
    const on = (selector: string, handler: (target: HTMLElement) => void) => {
        el.hud.querySelectorAll<HTMLElement>(selector).forEach((node) => node.addEventListener('click', () => handler(node)));
    };
    on('[data-quest-collapse]', () => { hudCollapsed = !hudCollapsed; renderHud(); });
    on('[data-quest-track]', (node) => { void changeTrack(node.dataset.questTrack as LearningTrack); });
    on('[data-quest-view]', (node) => {
        if (node.dataset.questView === 'code') showEditorPanel(); else showScene();
        window.setTimeout(() => renderHud(), 120);
    });
    on('[data-quest-map]', showMap);
    on('[data-quest-next]', () => goToStep(step + 1));
    on('[data-quest-prev]', () => goToStep(step - 1));
    on('[data-quest-hint]', () => { hintOpen = !hintOpen; renderHud(); });
    on('[data-quest-check]', () => { void checkQuest(); });
    on('[data-quest-solution]', () => {
        void showSolution(quest).then(() => {
            feedback = { kind: 'info', title: 'Решение загружено в редактор', lines: ['Разберите его и нажмите «Проверить полёт».'] };
            renderHud();
        });
    });
    el.hud.querySelectorAll<HTMLInputElement>('[data-quest-part]').forEach((input) => {
        input.addEventListener('change', () => { academyParts = { ...academyParts, [input.dataset.questPart as 'lift' | 'vision']: input.value }; });
    });
}

async function showSolution(quest: Quest): Promise<void> {
    if (track === 'blocks') { await loadMainBlocklyJson(JSON.stringify(quest.spec?.solution)); return; }
    await enterTextEditor(track, quest.lesson?.solutionCode ?? '');
}

async function changeTrack(next: LearningTrack): Promise<void> {
    if (next === track || !activeQuest) return;
    saveDraft();
    checkToken++;
    checking = false;
    useTrack(next);
    const quest = currentQuest(quests, progress);
    if (quest) await openQuest(quest);
}

/* ---------- Проверка ---------- */

async function ensureLanguage(quest: Quest): Promise<'lua' | 'python'> {
    if (track !== 'blocks') return track;
    const allowed = quest.spec?.languages;
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
    if (track === 'blocks') {
        const used = usedBlockTypes();
        if (!used.includes('pioneer_start') || used.every((type) => type === 'pioneer_start')) {
            feedback = { kind: 'error', title: 'Программа пока пустая', lines: ['Прикрепите команды под блок «Начало программы» по шагам миссии.'] };
            renderHud();
            return;
        }
        const missing = requiredBlockChecklist(quest, used).filter((item) => !item.done);
        if (missing.length) {
            feedback = { kind: 'error', title: 'Не хватает блоков', lines: missing.map((item) => `Добавьте блок «${item.label}».`) };
            renderHud();
            return;
        }
    } else {
        const academy = quest.lesson?.academy;
        const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
        if (academy?.mode !== 'inspect' && !code.trim()) {
            feedback = { kind: 'error', title: 'Редактор пуст', lines: ['Напишите программу по шагам миссии и проверьте ещё раз.'] };
            renderHud();
            return;
        }
    }
    await runFlightCheck(quest);
}

async function runFlightCheck(quest: Quest): Promise<void> {
    showScene();
    const token = ++checkToken;
    checking = true;
    feedback = null;
    renderHud();
    const academy = quest.lesson?.academy;
    const capture = academy ? { droneId: currentDroneId, token: beginLearningCapture(currentDroneId) } : undefined;
    try {
        const language = await ensureLanguage(quest);
        if (academy?.mode === 'inspect') await setEditorValue(quest.lesson?.starterCode ?? '');
        const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
        const trialKey = `${currentDroneId}:${track}:${quest.id}`;
        if ([54, 107].includes(academy?.number || 0) && repeatedExperiments.get(trialKey) !== code) experimentTrials.delete(trialKey);
        await restartAndRunSimulation();
        const waitMs = academy ? academy.waitMs ?? (academy.number === 4 ? 1800 : 1200) : quest.spec!.expect.waitMs;
        const result = await runTextLessonCheck(quest.id, {
            waitMs, language, capture, doneMessage: academy?.doneMessage, isCurrent: () => token === checkToken,
            activity: academy ? {
                code, lift: academyParts.lift, vision: academyParts.vision,
                previousRun: repeatedExperiments.get(trialKey) === code,
                trials: [...(experimentTrials.get(trialKey) || [])], scene: getAcademySceneEvidence()
            } : undefined
        });
        if (capture) finishLearningCapture(capture.droneId, capture.token);
        if (token !== checkToken) return;
        checking = false;
        if (academy && [5, 54, 107].includes(academy.number) && !result.diagnostics.some((item) => item.kind === 'error')) repeatedExperiments.set(trialKey, code);
        if (result.academyTrial) {
            const trials = experimentTrials.get(trialKey) || new Set<string>();
            trials.add(result.academyTrial);
            experimentTrials.set(trialKey, trials);
        }
        if (result.solved) {
            progress = completeQuest(quests, progress, quest.id);
            persist();
            if (getUser()?.role === 'student') void reportCompleted(track, quest.id).catch(() => undefined);
            try { storage()?.removeItem(draftKey(quest)); } catch { /* ignore */ }
            renderHud();
            showSuccess(quest);
            return;
        }
        const errors = result.diagnostics.filter((item) => item.kind === 'error');
        feedback = {
            kind: 'error',
            title: errors.length ? 'Пока не получилось' : 'Почти',
            lines: (errors.length ? errors : result.diagnostics).slice(0, 3).map((item) => `${item.title}. ${item.fix}`)
        };
    } catch {
        if (capture) finishLearningCapture(capture.droneId, capture.token);
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
            <div class="quest-success__kicker">${finished ? 'Все миссии пройдены' : 'Миссия выполнена'}</div>
            <h2 id="quest-success-title" class="quest-success__title">${esc(quest.title)}</h2>
            <p class="quest-success__text">${rich(quest.outcome)}</p>
            <div class="quest-success__score">Пройдено ${done} из ${quests.length}${next ? ` · открыто: ${esc(next.title)}` : ''}</div>
            <div class="quest-success__actions">
                ${next ? '<button type="button" class="btn-primary" data-success-next>Следующая миссия</button>' : ''}
                <button type="button" class="btn-secondary" data-success-close>${next ? 'Остаться здесь' : 'Закрыть'}</button>
                <button type="button" class="btn-secondary" data-success-map>Карта миссий</button>
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
    const groups = questGroups(quests).map((group) => {
        const tiles = group.quests.map((quest) => {
            const status = questStatus(quests, progress, quest.id);
            const current = activeQuest?.id === quest.id;
            const mark = status === 'done' ? ICON.check : status === 'locked' ? ICON.lock : String(quest.number);
            const label = status === 'done' ? 'пройдена' : status === 'locked' ? 'закрыта' : 'доступна';
            return `<li><button type="button" class="quest-tile quest-tile--${status}${current ? ' is-current' : ''}" data-map-quest="${esc(quest.id)}" ${status === 'locked' ? 'disabled' : ''}>
                <span class="quest-tile__mark">${mark}</span>
                <span class="quest-tile__name">${esc(quest.title)}</span>
                <span class="quest-tile__status">${label}</span></button></li>`;
        }).join('');
        const groupDone = group.quests.filter((quest) => progress.completed.includes(quest.id)).length;
        return `<section class="quest-map__group"><h3>${esc(group.label)} <small>${groupDone}/${group.quests.length}</small></h3><ol class="quest-map__list">${tiles}</ol></section>`;
    }).join('');
    el.map.hidden = false;
    el.map.innerHTML = `
        <div class="quest-map__card" role="dialog" aria-modal="true" aria-labelledby="quest-map-title">
            <div class="quest-map__head">
                <div><h2 id="quest-map-title">Карта миссий · ${TRACK_LABELS[track]}</h2><div class="quest-map__sub">Пройдено ${done} из ${quests.length}. Следующая миссия открывается, когда пройдена предыдущая.</div></div>
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
        if (!window.confirm(`Сбросить весь прогресс миссий (${TRACK_LABELS[track]})? Это нельзя отменить.`)) return;
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
        restoreAcademyScene();
    }
    el.hud.hidden = true;
    el.menu.hidden = mode === 'start';
    el.menu.innerHTML = `${ICON.home}<span>Меню</span>`;
    el.menu.title = 'Вернуться на стартовый экран';
    if (mode === 'start') { showStart(); return; }
    hideStart();
    if (mode === 'free') return;
    void syncFromServer().finally(() => {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
    });
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
    el.hud.setAttribute('aria-label', 'Текущая миссия');
    el.map = make('div', 'quest-map', 'quest-map');
    el.success = make('div', 'quest-success', 'quest-success');
    el.menu = make('button', 'mode-menu-btn', 'mode-menu-btn') as HTMLButtonElement;
    el.menu.type = 'button';
    el.menu.setAttribute('aria-label', 'Вернуться на стартовый экран');
    el.menu.addEventListener('click', () => setAppMode('start', storage()));
    el.spot = make('div', 'quest-spot', 'quest-spot');
    el.spot.setAttribute('aria-hidden', 'true');
    document.body.append(el.hud, el.spot, el.success, el.map, el.menu, el.start);
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

/**
 * Открывает режим обучения, из свободного режима или с карточки уведомления. С номером урока Академии открывает именно
 * его на текущем языке скрипта (уроки с камерой есть только в Python); если миссия ещё закрыта, открывается ближайшая доступная.
 */
export function openLearningMission(lesson?: number): void {
    if (lesson !== undefined) {
        const language: LearningTrack = lesson > 72 ? 'python' : currentScriptLanguage === 'lua' ? 'lua' : track === 'blocks' ? 'python' : track;
        useTrack(language);
        const target = questsFor(language)[lesson - 1];
        if (target) { progress = selectQuest(quests, progress, target.id); persist(); }
    }
    if (getAppMode() === 'learning') {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
        return;
    }
    setAppMode('learning', storage());
}

/** Подключается один раз при запуске, после initUI. */
export function initLearningMode(): void {
    buildDom();
    useTrack(loadTrack());
    enableHudDrag();
    initAccountUi(document.body, { openTeacher: () => { void openTeacherPanel(); } });
    onUserChange(() => { void handleUserChange(); });
    void restoreSession();
    (window as any).openLearningMission = openLearningMission;
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
