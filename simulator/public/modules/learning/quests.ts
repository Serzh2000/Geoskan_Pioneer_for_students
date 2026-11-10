/**
 * Режим обучения: миссии (квесты) и прогресс.
 *
 * Миссии берутся из уроков, которые уже есть в проекте, без изменений:
 *  - Blockly: практикум на блоках pioneer_* (`mission-guide/lessons/pioneer`), проверка по полёту `gradePioneerLesson`;
 *  - Lua / Python: уроки Академии (`mission-guide/academy`), у каждого свой грейдер в `evaluation/text`.
 * Здесь только игровая оболочка: порядок, открытие по цепочке, сохранение прогресса. Модуль не трогает DOM,
 * хранилище передаётся снаружи, поэтому он проверяется обычными тестами.
 */
import { PIONEER_GROUP_TITLES, PIONEER_LESSONS } from '../ui/mission-guide/lessons/pioneer/catalog.js';
import type { PioneerGroup, PioneerLessonSpec } from '../ui/mission-guide/lessons/pioneer/types.js';
import { ACADEMY_MODULES } from '../ui/mission-guide/academy/catalog.js';
import { getAcademyTextPractices } from '../ui/mission-guide/academy/practices/index.js';
import type { GuideTextLesson } from '../ui/mission-guide/types.js';
import { GUIDED_STEPS, type GuidedStep } from './guides.js';
import { localize } from '../ui/mission-guide/book/localize.js';

export const QUEST_GROUP_ORDER: readonly PioneerGroup[] = ['flight', 'light', 'logic', 'projects'];

/** Короткие названия глав блочного практикума для карты заданий. */
export const QUEST_GROUP_LABELS: Record<PioneerGroup, string> = {
    flight: 'Полёт',
    light: 'Подсветка',
    logic: 'Логика',
    projects: 'Проекты'
};

export type QuestStatus = 'done' | 'available' | 'locked';

export type Quest = {
    id: string;
    /** Порядковый номер миссии в её списке, с единицы. */
    number: number;
    groupId: string;
    /** Название главы целиком и короткое — для карты и подписи в карточке. */
    groupTitle: string;
    groupLabel: string;
    title: string;
    /** Зачем эта миссия: показывается на вводной карточке. */
    goal: string;
    /** Шаги по порядку: на экране показывается один шаг за раз. */
    steps: string[];
    hint: string;
    /** Что должно получиться: показывается на экране успеха. */
    outcome: string;
    /** Блоки, без которых блочная миссия не засчитывается: [тип блока, имя для ученика]. */
    requires: Array<[string, string]>;
    source: 'blocks' | 'academy' | 'sdk2' | 'bricks';
    /** Трек «Мини 2 · SDK2»: Python на pioneer_sdk2, дрон Пионер Мини 2. */
    sdk2?: { waitMs: number; doneMessage: string; scene?: 'markers'; swarm?: { neighbours: Array<{ code?: string }> } };
    /** Трек «Мини 2 · Bricks»: блоки Pioneer Bricks, дрон Пионер Мини 2. */
    bricks?: import('./bricks-quests.js').BricksQuestInfo;
    spec?: PioneerLessonSpec;
    lesson?: GuideTextLesson;
    /** Шаги с подсветкой интерфейса: по одному на шаг из `steps`, если миссию нужно провести за руку. */
    guides?: GuidedStep[];
    /**
     * Номера шагов (с нуля), на которых ученика просят запустить проверку, не дожидаясь последней карточки: миссии из
     * нескольких опытов («сначала зелёный, затем синий»). На такой карточке есть своя кнопка «Проверить полёт».
     */
    checkSteps?: number[];
};

export type QuestProgress = {
    completed: string[];
    /** Миссия, на которой остановились; пусто — первая открытая. */
    currentId: string;
};

export const QUEST_PROGRESS_STORAGE_KEY = 'pioneer:learning:progress:v1';
export const QUEST_DRAFT_STORAGE_PREFIX = 'pioneer:learning:draft:v1:';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Задания блочного практикума в порядке прохождения: flight → light → logic → projects. */
export function buildQuests(specs: readonly PioneerLessonSpec[] = PIONEER_LESSONS): Quest[] {
    const ordered = QUEST_GROUP_ORDER.flatMap((group) => specs.filter((spec) => spec.group === group));
    return ordered.map((spec, index) => ({
        id: spec.topic,
        number: index + 1,
        groupId: spec.group,
        groupTitle: PIONEER_GROUP_TITLES[spec.group],
        groupLabel: QUEST_GROUP_LABELS[spec.group],
        title: spec.title,
        goal: spec.goal,
        steps: spec.recipe,
        hint: spec.hint,
        outcome: spec.outcome,
        requires: spec.requires,
        source: 'blocks',
        spec
    }));
}

/**
 * Задание без заготовленных шагов делится по предложениям: на карточке один шаг — одно действие.
 * Точка внутри числа (0.3) или кода в обратных кавычках предложение не разрывает.
 */
export function splitIntoSteps(text: string): string[] {
    const hidden = text.replace(/`[^`]*`/g, (code) => code.replace(/\./g, '\u0001'));
    const parts = hidden.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«])/).map((part) => part.split('\u0001').join('.').trim()).filter(Boolean);
    // Совсем короткая фраза («Сцена — гоночная трасса.») не шаг: она присоединяется к соседней.
    const steps: string[] = [];
    let carry = '';
    for (const part of parts) {
        const joined = carry ? `${carry} ${part}` : part;
        if (joined.length < 40) { carry = joined; continue; }
        steps.push(joined);
        carry = '';
    }
    if (carry) {
        if (steps.length) steps[steps.length - 1] += ` ${carry}`;
        else steps.push(carry);
    }
    return steps.length ? steps : [text];
}

/** Миссии Академии для одного языка: главы по порядку, шаги — из задания урока (если шагов нет, шаг один). */
/** Шаг, который сам просит запустить проверку: на его карточке должна быть кнопка, а не только на последней. */
const RUN_CHECK_STEP = /Проверить полёт|Проверить наблюдение|запустите проверку|запустите её ещё раз|нажмите «Проверить/i;

/** Шаги, кроме последнего (за ним и так идёт карточка проверки), в которых сказано запустить проверку. */
export function findCheckSteps(steps: string[]): number[] {
    return steps.flatMap((step, index) => (index < steps.length - 1 && RUN_CHECK_STEP.test(step) ? [index] : []));
}

export function buildAcademyQuests(language: 'lua' | 'python'): Quest[] {
    const modules = new Map(ACADEMY_MODULES.map((module) => [module.id, module.title]));
    return getAcademyTextPractices(language).map((lesson, index) => {
        const title = modules.get(lesson.chapterId) ?? lesson.chapterId;
        const guides = GUIDED_STEPS[lesson.topicId]?.(language);
        const steps = guides ? guides.map((guide) => guide.text) : lesson.taskSteps?.length ? lesson.taskSteps.map((step) => localize(step, language)) : splitIntoSteps(localize(lesson.goal, language));
        return {
            id: lesson.topicId,
            number: index + 1,
            groupId: lesson.chapterId,
            groupTitle: title,
            groupLabel: title.replace(/^\d+\.\s*/, ''),
            title: lesson.title,
            goal: lesson.summary,
            guides,
            steps,
            checkSteps: findCheckSteps(steps),
            hint: lesson.builderHint,
            outcome: lesson.expectedOutcome,
            requires: [],
            source: 'academy' as const,
            lesson
        };
    });
}

export function emptyProgress(): QuestProgress {
    return { completed: [], currentId: '' };
}

export function loadProgress(storage: StorageLike | null, quests: Quest[], key: string = QUEST_PROGRESS_STORAGE_KEY): QuestProgress {
    if (!storage) return emptyProgress();
    try {
        const raw = JSON.parse(storage.getItem(key) || 'null');
        const known = new Set(quests.map((quest) => quest.id));
        const completed = Array.isArray(raw?.completed)
            ? raw.completed.filter((id: unknown): id is string => typeof id === 'string' && known.has(id))
            : [];
        const currentId = typeof raw?.currentId === 'string' && known.has(raw.currentId) ? raw.currentId : '';
        return { completed: [...new Set<string>(completed)], currentId };
    } catch {
        return emptyProgress();
    }
}

export function saveProgress(storage: StorageLike | null, progress: QuestProgress, key: string = QUEST_PROGRESS_STORAGE_KEY): void {
    try {
        storage?.setItem(key, JSON.stringify(progress));
    } catch {
        // Хранилище может быть закрыто (приватное окно) — прогресс тогда живёт до перезагрузки.
    }
}

export function questStatus(quests: Quest[], progress: QuestProgress, id: string): QuestStatus {
    if (progress.completed.includes(id)) return 'done';
    const index = quests.findIndex((quest) => quest.id === id);
    if (index < 0) return 'locked';
    // Миссия открыта, когда пройдена предыдущая.
    return index === 0 || progress.completed.includes(quests[index - 1].id) ? 'available' : 'locked';
}

/** Первая непройденная открытая миссия; null — все пройдены. */
export function firstOpenQuest(quests: Quest[], progress: QuestProgress): Quest | null {
    return quests.find((quest) => questStatus(quests, progress, quest.id) === 'available') ?? null;
}

/** Миссия, которую показать сейчас: сохранённая (если она ещё доступна), иначе первая открытая, иначе последняя. */
export function currentQuest(quests: Quest[], progress: QuestProgress): Quest | null {
    const saved = quests.find((quest) => quest.id === progress.currentId);
    if (saved && questStatus(quests, progress, saved.id) !== 'locked') return saved;
    return firstOpenQuest(quests, progress) ?? quests[quests.length - 1] ?? null;
}

/** Переход к миссии: закрытые недоступны, состояние не меняется. */
export function selectQuest(quests: Quest[], progress: QuestProgress, id: string): QuestProgress {
    return questStatus(quests, progress, id) === 'locked' ? progress : { ...progress, currentId: id };
}

/** Засчитывает миссию: она остаётся в списке один раз, следующая открывается и становится текущей. */
export function completeQuest(quests: Quest[], progress: QuestProgress, id: string): QuestProgress {
    if (questStatus(quests, progress, id) === 'locked') return progress;
    const completed = progress.completed.includes(id) ? progress.completed : [...progress.completed, id];
    const next = nextQuest(quests, id);
    return { completed, currentId: next ? next.id : id };
}

export function nextQuest(quests: Quest[], id: string): Quest | null {
    const index = quests.findIndex((quest) => quest.id === id);
    return index >= 0 ? quests[index + 1] ?? null : null;
}

export function countDone(quests: Quest[], progress: QuestProgress): number {
    return quests.filter((quest) => progress.completed.includes(quest.id)).length;
}

/** Какие обязательные блоки миссии уже стоят в рабочей области: для живого чеклиста. */
export function requiredBlockChecklist(quest: Quest, usedBlockTypes: Iterable<string>): Array<{ label: string; done: boolean }> {
    const used = new Set(usedBlockTypes);
    return quest.requires.map(([type, label]) => ({ label, done: used.has(type) }));
}

/** Главы миссий в порядке появления: для карты. */
export function questGroups(quests: Quest[]): Array<{ id: string; label: string; title: string; quests: Quest[] }> {
    const groups: Array<{ id: string; label: string; title: string; quests: Quest[] }> = [];
    quests.forEach((quest) => {
        let group = groups.find((item) => item.id === quest.groupId);
        if (!group) {
            group = { id: quest.groupId, label: quest.groupLabel, title: quest.groupTitle, quests: [] };
            groups.push(group);
        }
        group.quests.push(quest);
    });
    return groups;
}

/** Карточки миссии по порядку: вводная, по одной на шаг, проверка. Индекс -1 — вводная, steps.length — проверка. */
export const INTRO_STEP = -1;
export function lastStepIndex(quest: Quest): number {
    return quest.steps.length;
}
export function clampStep(quest: Quest, index: number): number {
    return Math.min(Math.max(index, INTRO_STEP), lastStepIndex(quest));
}
