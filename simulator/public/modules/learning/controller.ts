/**
 * Режим обучения: DOM-слой поверх симулятора.
 *
 * Симулятор открывается свободным; в обучение ведёт кнопка «Обучение» в боковой панели (`openLearningMission`). В режиме обучения поверх экрана лежит одна карточка миссии, и она показывает
 * один шаг за раз: вводная → шаг 1 → … → шаг N → проверка полёта. Сделанный шаг уходит, на его месте появляется
 * следующий. Проверка — настоящий полёт: программа запускается в симуляторе, а `runTextLessonCheck` сверяет результат
 * с ожиданием урока. Из свободного режима в миссию ведёт `window.openLearningMission(номер?)`: кнопка в боковой панели
 * и кнопки уведомлений об ошибках («Разобрать в уроке 3»).
 *
 * Чем писать, выбирает ученик: Blockly (практикум на блоках) или Lua / Python (уроки Академии).
 */
import { currentDroneId, currentScriptLanguage, setCurrentScriptLanguage } from '../core/state.js';
import { restartAndRunSimulation, setBeforeStartHook } from '../app/simulation-controls.js';
import {
    exportMainBricksProject, getEditorValue, getMainBlocklyWorkspace, isBlocklyEditorEnabled, loadMainBlocklyJson, loadMainBlocklyXml, loadMainBricksProject,
    serializeWorkspaceXml, setBlocklyEditorEnabled, setEditorLanguage, setEditorValue, syncScriptLanguageSelect
} from '../editor/index.js';
import { renderApiDocs } from '../ui/api-docs/index.js';
import { beginLearningCapture, finishLearningCapture } from '../core/learning-journal.js';
import { runTextLessonCheck } from '../ui/mission-guide/evaluation/text/index.js';
import { ACADEMY_LESSONS } from '../ui/mission-guide/academy/catalog.js';
import { getAcademySceneEvidence, prepareAcademyScene, restoreAcademyScene, academySceneProfile } from '../ui/mission-guide/academy/scene.js';
import { ACCOUNT_TRACKS, TRACK_NAMES, type AccountTrack, ApiError, fetchProgress, getLastAuthKind, getUser, isSessionExpired, onUserChange, reportAttempt, reportCompleted, restoreSession, startKeepAlive, trackEvent } from './account.js';
import { initAccountUi, openAccountPanel } from './account-ui.js';
import { shouldShowAuthNudge, showAuthNudge } from './auth-nudge.js';
import { handleInviteLink, watchPendingJoin } from './invite-link.js';
import { countUnfilledBlanks, unfilledBlanksMessage } from './blanks.js';
import { openTeacherPanel } from './teacher-panel.js';
import { openStudentCabinet } from './student-cabinet.js';
import { getAppMode, onAppModeChange, setAppMode, type AppMode } from './mode.js';
import { buildTrackQuests } from './tracks.js';
import { applyLearningDrone, ensureMini2Drone } from './mini2-drone.js';
import { startNeighbourPrograms, syncSwarmNeighbours } from './swarm-scene.js';
import { CHOICE_BY_ID, choiceForTrack, loadStoredChoice, saveStoredChoice, type Choice } from './track-choice.js';
import { showTrackPicker, type PickerProgress } from './track-picker.js';
import { ensurePyodide, isPyodideReady } from '../python/pyodide-loader.js';
import { missingBricksBlocks } from '../ui/mission-guide/mini2/bricks-missions.js';
import {
    clampStep, completeQuest, countDone, currentQuest, emptyProgress, INTRO_STEP, lastStepIndex,
    loadProgress, nextQuest, QUEST_DRAFT_STORAGE_PREFIX, QUEST_PROGRESS_STORAGE_KEY, questGroups, questStatus,
    requiredBlockChecklist, saveProgress, selectQuest,
    type Quest, type QuestProgress
} from './quests.js';

/** Чем ученик пишет программы. Blockly — практикум на блоках, Lua и Python — уроки Академии. */
export type LearningTrack = AccountTrack;
const TRACK_STORAGE_KEY = 'pioneer:learning:track:v1';
/** Сколько событий запуска хранит журнал для миссий Мини 2: длинные программы с подсветкой дают больше пятисот. */
const MINI2_EVENT_LIMIT = 4096;
/** Пустой проект Bricks: только «Начало программы». */
const BRICKS_EMPTY_PROJECT = '<xml xmlns="https://developers.google.com/blockly/xml"><project name="mission" /><variables></variables><block type="start_block" deletable="false" movable="false" x="10" y="10"></block></xml>';
const HUD_POS_STORAGE_KEY = 'pioneer:learning:hud-pos:v1';
/** Треки, где программа собирается из блоков (редактор Blockly): практикум Базового и Bricks Мини 2. */
const isBlockTrack = (value: LearningTrack): boolean => value === 'blocks' || value === 'bricks';
/** Язык текстового редактора трека: Lua только у трека Lua, остальные треки пишут на Python. */
const textLanguage = (): 'lua' | 'python' => (track === 'lua' ? 'lua' : 'python');
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
/** Когда открыта текущая миссия: для анонимной метрики (сколько времени ушло, где ушли). */
let questOpenedAt = 0;
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
    hud: HTMLElement; map: HTMLElement; success: HTMLElement; menu: HTMLButtonElement; spot: HTMLElement;
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

/**
 * Зачёты, которые не дошли до сервера (вход закончился, нет связи). Они лежат в очереди у своего ученика и уходят при
 * следующей синхронизации: иначе список сервера при входе затёр бы то, что ученик успел пройти без связи.
 */
const PENDING_KEY = 'pioneer:learning:pending:v1';
type PendingReport = { track: LearningTrack; id: string };

function loadPending(): PendingReport[] {
    try {
        const raw = JSON.parse(storage()?.getItem(PENDING_KEY + scope()) || '[]');
        return Array.isArray(raw) ? raw.filter((item): item is PendingReport => typeof item?.id === 'string' && ACCOUNT_TRACKS.includes(item.track)) : [];
    } catch { return []; }
}

function savePending(list: PendingReport[]): void {
    try {
        if (list.length) storage()?.setItem(PENDING_KEY + scope(), JSON.stringify(list));
        else storage()?.removeItem(PENDING_KEY + scope());
    } catch { /* без хранилища очередь живёт до перезагрузки */ }
}

/** Отправляет зачёт ученика на сервер; не вышло (нет связи, вход закончился) — зачёт ждёт в очереди. */
async function reportCompletion(forTrack: LearningTrack, id: string): Promise<void> {
    try {
        await reportCompleted(forTrack, id);
    } catch (error) {
        if (error instanceof ApiError && [400, 403, 404].includes(error.status)) return;   // сервер такую миссию не примет
        const queue = loadPending();
        if (!queue.some((item) => item.track === forTrack && item.id === id)) savePending([...queue, { track: forTrack, id }]);
    }
}

async function flushPending(): Promise<void> {
    if (isSessionExpired()) return;
    for (const item of loadPending()) {
        try {
            await reportCompleted(item.track, item.id);
        } catch (error) {
            if (!(error instanceof ApiError && [400, 403, 404].includes(error.status))) return;   // связи нет: попробуем в следующий раз
        }
        savePending(loadPending().filter((other) => !(other.track === item.track && other.id === item.id)));
    }
}

/** Зачёт, который выставил сервер (в том числе учитель вручную), главнее локального прогресса. */
async function syncFromServer(): Promise<void> {
    const user = getUser();
    if (user?.role !== 'student') return;
    try {
        await flushPending();
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
        // Нет связи или вход закончился: остаётся локальный прогресс, неотправленные зачёты ждут в очереди.
    }
}

/** После регистрации то, что ученик успел пройти гостем, переходит в его аккаунт. */
async function adoptGuestProgress(): Promise<void> {
    for (const key of ACCOUNT_TRACKS) {
        const guest = loadProgress(storage(), questsFor(key), progressKey(key, ''));
        for (const id of guest.completed) await reportCompletion(key, id);
    }
}

async function handleUserChange(): Promise<void> {
    if (getUser() && getLastAuthKind() === 'register') await adoptGuestProgress();
    useTrack(track);
    await syncFromServer();
    if (getAppMode() === 'learning') {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
    }
}

function questsFor(forTrack: LearningTrack): Quest[] {
    return questsByTrack[forTrack] ??= buildTrackQuests(forTrack);
}

function persist(): void {
    saveProgress(storage(), progress, progressKey());
}

function loadTrack(): LearningTrack {
    try {
        const value = storage()?.getItem(TRACK_STORAGE_KEY);
        return (ACCOUNT_TRACKS as readonly string[]).includes(value ?? '') ? value as LearningTrack : 'blocks';
    } catch { return 'blocks'; }
}

/** Вариант «дрон + язык» текущей линии миссий; меняется только в окне выбора (или ссылкой из кабинета на другую линию). */
let choice: Choice = choiceForTrack('blocks', null);

function useTrack(next: LearningTrack): void {
    track = next;
    choice = choiceForTrack(next, choice.track === next ? choice.id : loadStoredChoice(storage()));
    saveStoredChoice(storage(), choice.id);
    quests = questsFor(next);
    progress = loadProgress(storage(), quests, progressKey());
    try { storage()?.setItem(TRACK_STORAGE_KEY, next); } catch { /* ignore */ }
}

/* ---------- Редактор и черновики ---------- */

function draftKey(quest: Quest): string {
    return QUEST_DRAFT_STORAGE_PREFIX + scope().slice(1) + (track === 'blocks' ? '' : `${track}:`) + quest.id;
}

function saveDraft(): void {
    if (!activeQuest) return;
    try {
        if (track === 'bricks') {
            const exported = exportMainBricksProject(activeQuest.bricks?.name ?? activeQuest.id);
            const workspace = getMainBlocklyWorkspace();
            if (exported && workspace && workspace.getAllBlocks(false).length > 1) storage()?.setItem(draftKey(activeQuest), exported.xml);
            else storage()?.removeItem(draftKey(activeQuest));
            return;
        }
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

/** Редактор блоков Bricks на дроне Мини 2: проект загружается из XML (черновик ученика, шаблон миссии или эталон). */
async function enterBricksEditor(xml: string): Promise<void> {
    setCurrentScriptLanguage('python');
    const select = document.getElementById('script-language-select') as HTMLSelectElement | null;
    if (select) select.value = 'python';
    setBlocklyEditorEnabled(true);
    await loadMainBricksProject(xml);
    // Блок «Начало программы» обязателен: если в проекте (старый черновик, пустой шаблон) его нет, ставим пустой проект.
    if (!usedBlockTypes().includes('bricks_start_block')) await loadMainBricksProject(BRICKS_EMPTY_PROJECT);
    syncScriptLanguageSelect();
    renderApiDocs('python');
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
    if (track === 'bricks') {
        const draft = readDraft(quest);
        try { await enterBricksEditor(draft ?? quest.bricks?.starterXml ?? ''); return; } catch (error) {
            console.error('[learning] bricks workspace', error);
            await enterBricksEditor(quest.bricks?.starterXml ?? '');
            return;
        }
    }
    if (track !== 'blocks') {
        await enterTextEditor(textLanguage(), readDraft(quest) ?? quest.lesson?.starterCode ?? '');
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
    // Миссии Мини 2 с метками ArUco идут на учебной сцене с метками на полу (та же, что у уроков про метки в Академии).
    const mini2Scene = quest.sdk2?.scene ?? quest.bricks?.scene;
    if (mini2Scene === 'markers') { prepareAcademyScene(82, 1082); return; }
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

/** Ушли с непройденной миссии: в метрику уходит, сколько секунд на ней провели. */
function noteQuestLeft(): void {
    if (activeQuest && questOpenedAt) trackEvent('quest_leave', { track, questId: activeQuest.id, value: Math.round((Date.now() - questOpenedAt) / 1000) });
    questOpenedAt = 0;
}

/** Выбран Python или Bricks: рантайм Python грузится заранее, пока ученик читает миссию, а не при первой проверке. */
const usesPythonRuntime = (): boolean => choice.language === 'python-sdk1' || choice.language === 'python-sdk2' || choice.track === 'bricks';

function warmPythonRuntime(): void {
    if (usesPythonRuntime() && !isPyodideReady()) void ensurePyodide().catch((error) => console.error('[learning] python runtime', error));
}

async function openQuest(quest: Quest): Promise<void> {
    warmPythonRuntime();
    noteQuestLeft();
    trackEvent('quest_open', { track, questId: quest.id });
    questOpenedAt = Date.now();
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
    // Дрон под трек: треки Мини 2 идут на Пионере Мини 2, остальные на Базовом.
    applyLearningDrone(choice.model, choice.sdk);
    // Миссии роя: рядом с дроном ученика стоят соседи; в остальных миссиях созданные раньше соседи убираются.
    syncSwarmNeighbours(track === 'sdk2' ? quest.sdk2?.swarm?.neighbours.length ?? 0 : 0);
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
    if (!activeQuest || getAppMode() !== 'learning' || !isBlockTrack(track)) return;
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
        // Миссии из нескольких опытов: шаг «Нажмите «Проверить полёт»» должен давать эту кнопку сразу, а результат опыта
        // показываться на этой же карточке. Иначе ученик пройдёт шаг, ничего не запустив, и зачёт увидит только последний опыт.
        const runsCheck = Boolean(quest.checkSteps?.includes(step));
        const result = runsCheck && feedback ? `<div class="quest-hud__feedback quest-hud__feedback--${feedback.kind}" role="status"><strong>${esc(feedback.title)}</strong>${feedback.lines.map((line) => `<div>${rich(line)}</div>`).join('')}</div>` : '';
        return `
            <div class="quest-card__label">Шаг ${step + 1} из ${quest.steps.length}${stepDots(quest)}</div>
            <p class="quest-card__step">${rich(quest.steps[step])}</p>
            ${hint}
            ${result}
            <div class="quest-hud__actions">
                ${runsCheck ? `<button type="button" class="btn-primary" data-quest-check ${checking ? 'disabled' : ''}>${checking ? 'Проверяем полёт…' : 'Проверить полёт'}</button>` : ''}
                <button type="button" class="${runsCheck ? 'btn-secondary' : 'btn-primary'}" data-quest-next>${final ? 'Готово, к проверке' : runsCheck ? 'Дальше' : 'Сделал, дальше'}</button>
                ${hintButton}
                <button type="button" class="btn-secondary quest-hud__back" data-quest-prev aria-label="Назад">←</button>
            </div>`;
    }
    const needs = isBlockTrack(track) ? requiredBlockChecklist(quest, usedBlockTypes()) : [];
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
                <button type="button" class="quest-hud__mode" data-quest-choice title="Выбрать другого дрона или другой язык" aria-label="Сейчас: ${esc(choiceLabel(choice))}. Сменить">
                    <span class="quest-hud__mode-text"><small>Учимся</small><strong>${esc(choiceLabel(choice))}</strong></span>
                    <span class="quest-hud__mode-change">Сменить</span>
                </button>
                <div class="quest-hud__view pk-seg" role="group" aria-label="Что показать">
                    <button type="button" class="pk-seg__btn${isEditorVisible() ? ' is-active' : ''}" data-quest-view="code">${track === 'bricks' ? 'Bricks' : isBlockTrack(track) ? 'Блоки' : 'Код'}</button>
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
    on('[data-quest-choice]', () => { void chooseTrack(false); });
    on('[data-quest-view]', (node) => {
        if (node.dataset.questView === 'code') showEditorPanel(); else showScene();
        window.setTimeout(() => renderHud(), 120);
    });
    on('[data-quest-map]', showMap);
    on('[data-quest-next]', () => goToStep(step + 1));
    on('[data-quest-prev]', () => goToStep(step - 1));
    on('[data-quest-hint]', () => { hintOpen = !hintOpen; if (hintOpen && activeQuest) trackEvent('hint_open', { track, questId: activeQuest.id }); renderHud(); });
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
    if (track === 'bricks') { await enterBricksEditor(quest.bricks?.solutionXml ?? ''); return; }
    await enterTextEditor(textLanguage(), quest.lesson?.solutionCode ?? '');
}

/** «Дрон · язык» одной строкой: «Мини 2 · Bricks», «Базовый · Lua». */
function choiceLabel(value: Choice): string {
    return `${value.model === 'pioneer-mini2' ? 'Мини 2' : 'Базовый'} · ${value.title}`;
}

/** Сколько миссий пройдено на каждом варианте окна выбора (линия одна, поэтому у двух вариантов SDK 2 цифры общие). */
function pickerProgress(): PickerProgress {
    const result: PickerProgress = {};
    for (const key of Object.keys(CHOICE_BY_ID) as Array<keyof typeof CHOICE_BY_ID>) {
        const list = questsFor(CHOICE_BY_ID[key].track);
        result[key] = { done: loadProgress(storage(), list, progressKey(CHOICE_BY_ID[key].track)).completed.length, total: list.length };
    }
    return result;
}

/** Окно выбора. Возвращает false, если окно закрыли, ничего не выбрав. */
async function chooseTrack(entering: boolean): Promise<boolean> {
    const picked = await showTrackPicker({ current: choice.id, progress: pickerProgress(), entering });
    if (!picked) return false;
    if (picked.id !== choice.id) {
        saveDraft();
        checkToken++;
        checking = false;
        trackEvent('track_switch', { detail: picked.id });
        choice = picked;
        useTrack(picked.track);
        const quest = currentQuest(quests, progress);
        if (quest && !entering) await openQuest(quest);
    }
    return true;
}

/* ---------- Проверка ---------- */

async function ensureLanguage(quest: Quest): Promise<'lua' | 'python'> {
    if (track === 'bricks' || track === 'sdk2') return 'python';
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
    if (track === 'bricks') {
        let used = usedBlockTypes();
        if (!used.includes('bricks_start_block')) {
            // В редакторе нет блоков Bricks (другая модель дрона или пустое поле): возвращаем модель и стартовый блок.
            ensureMini2Drone();
            try { await loadMainBricksProject(BRICKS_EMPTY_PROJECT); } catch (error) { console.error('[learning] bricks restore', error); }
            used = usedBlockTypes();
        }
        if (!used.includes('bricks_start_block') || used.every((type) => type === 'bricks_start_block')) {
            feedback = { kind: 'error', title: 'Программа пока пустая', lines: ['Прикрепите команды под блок «Начало программы» по шагам миссии.'] };
            renderHud();
            return;
        }
        const missing = missingBricksBlocks({ requires: quest.requires, minCounts: quest.bricks?.minCounts }, used);
        if (missing.length) {
            feedback = { kind: 'error', title: 'Не хватает блоков', lines: missing };
            renderHud();
            return;
        }
    } else if (track === 'blocks') {
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
        // Пропуски ___ из заготовки: запуск упадёт с ошибкой. Не запускаем и не записываем попытку, а объясняем.
        const blanks = isBlocklyEditorEnabled() ? 0 : countUnfilledBlanks(code);
        if (academy?.mode !== 'inspect' && blanks > 0) {
            const message = unfilledBlanksMessage(blanks);
            feedback = { kind: 'error', title: message.title, lines: message.lines };
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
    // Длинные маршруты идут минуты: счётчик секунд показывает, что проверка не зависла.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
        if (!checking || token !== checkToken) { window.clearInterval(timer); return; }
        const button = el.hud.querySelector<HTMLButtonElement>('[data-quest-check]');
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        if (button && seconds >= 5) button.textContent = usesPythonRuntime() && !isPyodideReady() ? `Загружаем Python, первый запуск до минуты… ${seconds} с` : `Проверяем полёт… ${seconds} с`;
    }, 1000);
    const academy = quest.lesson?.academy;
    const mini2 = quest.sdk2 ?? quest.bricks;
    const capture = academy || mini2 ? { droneId: currentDroneId, token: beginLearningCapture(currentDroneId, mini2 ? MINI2_EVENT_LIMIT : undefined) } : undefined;
    try {
        const language = await ensureLanguage(quest);
        if (academy?.mode === 'inspect') await setEditorValue(quest.lesson?.starterCode ?? '');
        const code = isBlocklyEditorEnabled() ? '' : getEditorValue();
        const trialKey = `${currentDroneId}:${track}:${quest.id}`;
        if ([54, 107].includes(academy?.number || 0) && repeatedExperiments.get(trialKey) !== code) experimentTrials.delete(trialKey);
        await restartAndRunSimulation();
        const waitMs = mini2 ? mini2.waitMs : academy ? academy.waitMs ?? (academy.number === 4 ? 1800 : 1200) : quest.spec!.expect.waitMs;
        const result = await runTextLessonCheck(quest.id, {
            waitMs, language, capture, doneMessage: mini2?.doneMessage ?? academy?.doneMessage, isCurrent: () => token === checkToken,
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
        if (getUser()?.role === 'student') {
            // Правильный промежуточный опыт миссии из нескольких запусков («Опыт записан») не ошибка: в журнал он идёт с пометкой.
            const partial = !result.solved && !result.diagnostics.some((item) => item.kind === 'error') && result.diagnostics.some((item) => item.kind === 'info');
            void reportAttempt({ track, questId: quest.id, solved: result.solved, partial, titles: result.diagnostics.filter((item) => item.kind !== 'success').map((item) => item.title), code });
        }
        if (result.academyTrial) {
            const trials = experimentTrials.get(trialKey) || new Set<string>();
            trials.add(result.academyTrial);
            experimentTrials.set(trialKey, trials);
        }
        if (result.solved) {
            trackEvent('quest_done', { track, questId: quest.id, value: questOpenedAt ? Math.round((Date.now() - questOpenedAt) / 1000) : 0 });
            questOpenedAt = 0;
            progress = completeQuest(quests, progress, quest.id);
            persist();
            if (getUser()?.role === 'student') void reportCompletion(track, quest.id);
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
    trackEvent('map_open');
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
                <div><h2 id="quest-map-title">Карта миссий · ${TRACK_NAMES[track]}</h2><div class="quest-map__sub">Пройдено ${done} из ${quests.length}. Следующая миссия открывается, когда пройдена предыдущая.</div></div>
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
        if (!window.confirm(`Сбросить весь прогресс миссий (${TRACK_NAMES[track]})? Это нельзя отменить.`)) return;
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
        noteQuestLeft();
        saveDraft();
        checkToken++;
        checking = false;
        stopChecklistTimer();
        hideSuccess();
        hideMap();
        restoreAcademyScene();
    }
    trackEvent('mode_enter', { detail: mode });
    el.hud.hidden = true;
    el.menu.hidden = mode !== 'learning';
    el.menu.innerHTML = `${ICON.home}<span>Выйти из обучения</span>`;
    el.menu.title = 'Вернуться в свободный симулятор';
    if (mode === 'free') return;
    void enterLearning();
}

/** Вход в обучение: сначала «Что будем изучать?», потом миссия; закрыли окно без выбора - возвращаемся в симулятор. */
async function enterLearning(): Promise<void> {
    const chosen = await chooseTrack(true);
    if (!chosen) { setAppMode('free'); return; }
    await syncFromServer();
    const quest = currentQuest(quests, progress);
    if (quest) void openQuest(quest);
    void welcomeLearner();
}

/** Проверка входа при запуске: пока она не закончилась, гость и вошедший ученик неразличимы. */
let sessionReady: Promise<unknown> = Promise.resolve();

/**
 * Первое, что видит ученик в обучении: напоминание об аккаунте (гостю, раз в день), затем окно миссии с
 * подсветкой и фокусом на кнопке, чтобы было понятно, с чего начать.
 */
async function welcomeLearner(): Promise<void> {
    await sessionReady;
    if (getAppMode() !== 'learning') return;
    if (!getUser() && shouldShowAuthNudge()) {
        const choice = await showAuthNudge();
        if (choice !== 'skip') { openAccountPanel(choice); return; }
    }
    if (getAppMode() === 'learning') drawAttentionToHud();
}

/** Окно миссии появляется с движением и кольцом, а фокус переходит на кнопку «Начать миссию». */
function drawAttentionToHud(): void {
    el.hud.classList.remove('is-arriving');
    void el.hud.offsetWidth; // перезапуск анимации, если окно уже подсвечивалось
    el.hud.classList.add('is-arriving');
    window.setTimeout(() => el.hud.classList.remove('is-arriving'), 4800);
    // renderHud перерисовывает окно через полсекунды после открытия миссии: фокус ставим после него.
    window.setTimeout(() => el.hud.querySelector<HTMLElement>('[data-quest-next]')?.focus({ preventScroll: true }), 650);
}

function buildDom(): void {
    const make = (tag: string, id: string, className: string, hidden = true) => {
        const node = document.createElement(tag);
        node.id = id;
        node.className = className;
        node.hidden = hidden;
        return node;
    };
    el.hud = make('aside', 'quest-hud', 'quest-hud');
    el.hud.setAttribute('aria-label', 'Текущая миссия');
    el.map = make('div', 'quest-map', 'quest-map');
    el.success = make('div', 'quest-success', 'quest-success');
    el.menu = make('button', 'mode-menu-btn', 'mode-menu-btn') as HTMLButtonElement;
    el.menu.type = 'button';
    el.menu.setAttribute('aria-label', 'Выйти из обучения');
    el.menu.addEventListener('click', () => setAppMode('free'));
    el.spot = make('div', 'quest-spot', 'quest-spot');
    el.spot.setAttribute('aria-hidden', 'true');
    document.body.append(el.hud, el.spot, el.success, el.map, el.menu);
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
        // Язык берётся из каталога: камера и SDK — только Python, датчики/таймеры/связь Lua — только Lua, остальное на обоих.
        const available = ACADEMY_LESSONS[lesson - 1]?.languages ?? ['lua', 'python'];
        const preferred: LearningTrack = currentScriptLanguage === 'lua' ? 'lua' : track === 'blocks' ? 'python' : track;
        const language: LearningTrack = (available as string[]).includes(preferred) ? preferred : available[0] === 'lua' ? 'lua' : 'python';
        useTrack(language);
        // Номер урока глобальный, а в линии одного языка миссии идут подряд без пропусков: ищем по номеру, а не по месту в списке.
        const target = questsFor(language).find(quest => quest.lesson?.academy?.number === lesson);
        if (target) { progress = selectQuest(quests, progress, target.id); persist(); }
    }
    if (getAppMode() === 'learning') {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
        return;
    }
    setAppMode('learning');
}

/** Открывает миссию из личного кабинета: нужный язык, нужная миссия (закрытая заменяется ближайшей доступной). */
export function openQuestById(forTrack: LearningTrack, questId: string): void {
    useTrack(forTrack);
    progress = selectQuest(quests, progress, questId);
    persist();
    if (getAppMode() === 'learning') {
        const quest = currentQuest(quests, progress);
        if (quest) void openQuest(quest);
        return;
    }
    setAppMode('learning');
}

/** Подключается один раз при запуске, после initUI. */
export function initLearningMode(): void {
    buildDom();
    // Любой запуск в обучении (кнопка «Запуск» и «Проверить полёт») сначала запускает программы соседей миссии роя.
    setBeforeStartHook(() => {
        const swarm = getAppMode() === 'learning' && track === 'sdk2' ? activeQuest?.sdk2?.swarm : undefined;
        return swarm ? startNeighbourPrograms(swarm.neighbours) : undefined;
    });
    useTrack(loadTrack());
    enableHudDrag();
    initAccountUi(document.getElementById('account-host') ?? document.body, {
        openTeacher: () => { void openTeacherPanel(); },
        openCabinet: () => { void openStudentCabinet({ openQuest: openQuestById }); }
    });
    onUserChange(() => { void handleUserChange(); });
    sessionReady = restoreSession();
    // Открыли сайт по ссылке-приглашению организации: после проверки входа показываем, кто приглашает.
    watchPendingJoin();
    void sessionReady.then(() => handleInviteLink());
    startKeepAlive();
    (window as any).openLearningMission = openLearningMission;
    onAppModeChange(applyMode);
    document.body.dataset.appMode = 'free';
    el.menu.hidden = true;
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!el.map.hidden) hideMap();
        else if (!el.success.hidden) hideSuccess();
    });
}
