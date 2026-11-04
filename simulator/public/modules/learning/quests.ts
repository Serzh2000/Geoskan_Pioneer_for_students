/**
 * Режим обучения: задания (квесты) и прогресс.
 *
 * Задания — это уроки практикума на блоках pioneer_* (`mission-guide/lessons/pioneer`), без изменений: у каждого
 * есть цель, рецепт, подсказка, обязательные блоки и ожидаемый полёт, по которому его проверяет `gradePioneerLesson`.
 * Здесь только игровая оболочка: порядок, открытие по цепочке, сохранение прогресса. Модуль не трогает DOM,
 * хранилище передаётся снаружи, поэтому он проверяется обычными тестами.
 */
import { PIONEER_GROUP_TITLES, PIONEER_LESSONS } from '../ui/mission-guide/lessons/pioneer/catalog.js';
import type { PioneerGroup, PioneerLessonSpec } from '../ui/mission-guide/lessons/pioneer/types.js';

export const QUEST_GROUP_ORDER: readonly PioneerGroup[] = ['flight', 'light', 'logic', 'projects'];

/** Короткие названия глав для карты заданий. */
export const QUEST_GROUP_LABELS: Record<PioneerGroup, string> = {
    flight: 'Полёт',
    light: 'Подсветка',
    logic: 'Логика',
    projects: 'Проекты'
};

export type QuestStatus = 'done' | 'available' | 'locked';

export type Quest = {
    id: string;
    /** Порядковый номер задания, с единицы. */
    number: number;
    group: PioneerGroup;
    groupTitle: string;
    spec: PioneerLessonSpec;
};

export type QuestProgress = {
    completed: string[];
    /** Задание, на котором остановились; пусто — первое открытое. */
    currentId: string;
};

export const QUEST_PROGRESS_STORAGE_KEY = 'pioneer:learning:progress:v1';
export const QUEST_DRAFT_STORAGE_PREFIX = 'pioneer:learning:draft:v1:';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Задания в порядке прохождения: главы flight → light → logic → projects, внутри главы — как в каталоге. */
export function buildQuests(specs: readonly PioneerLessonSpec[] = PIONEER_LESSONS): Quest[] {
    const ordered = QUEST_GROUP_ORDER.flatMap((group) => specs.filter((spec) => spec.group === group));
    return ordered.map((spec, index) => ({
        id: spec.topic,
        number: index + 1,
        group: spec.group,
        groupTitle: PIONEER_GROUP_TITLES[spec.group],
        spec
    }));
}

export function emptyProgress(): QuestProgress {
    return { completed: [], currentId: '' };
}

export function loadProgress(storage: StorageLike | null, quests: Quest[]): QuestProgress {
    if (!storage) return emptyProgress();
    try {
        const raw = JSON.parse(storage.getItem(QUEST_PROGRESS_STORAGE_KEY) || 'null');
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

export function saveProgress(storage: StorageLike | null, progress: QuestProgress): void {
    try {
        storage?.setItem(QUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
        // Хранилище может быть закрыто (приватное окно) — прогресс тогда живёт до перезагрузки.
    }
}

export function questStatus(quests: Quest[], progress: QuestProgress, id: string): QuestStatus {
    if (progress.completed.includes(id)) return 'done';
    const index = quests.findIndex((quest) => quest.id === id);
    if (index < 0) return 'locked';
    // Задание открыто, когда пройдено предыдущее.
    return index === 0 || progress.completed.includes(quests[index - 1].id) ? 'available' : 'locked';
}

/** Первое непройденное открытое задание; null — все пройдены. */
export function firstOpenQuest(quests: Quest[], progress: QuestProgress): Quest | null {
    return quests.find((quest) => questStatus(quests, progress, quest.id) === 'available') ?? null;
}

/** Задание, которое показать сейчас: сохранённое (если оно ещё доступно), иначе первое открытое, иначе последнее. */
export function currentQuest(quests: Quest[], progress: QuestProgress): Quest | null {
    const saved = quests.find((quest) => quest.id === progress.currentId);
    if (saved && questStatus(quests, progress, saved.id) !== 'locked') return saved;
    return firstOpenQuest(quests, progress) ?? quests[quests.length - 1] ?? null;
}

/** Переход к заданию: закрытые недоступны, состояние не меняется. */
export function selectQuest(quests: Quest[], progress: QuestProgress, id: string): QuestProgress {
    return questStatus(quests, progress, id) === 'locked' ? progress : { ...progress, currentId: id };
}

/** Засчитывает задание: оно остаётся в списке один раз, следующее открывается и становится текущим. */
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

/** Какие обязательные блоки задания уже стоят в рабочей области: для живого чеклиста. */
export function requiredBlockChecklist(quest: Quest, usedBlockTypes: Iterable<string>): Array<{ label: string; done: boolean }> {
    const used = new Set(usedBlockTypes);
    return quest.spec.requires.map(([type, label]) => ({ label, done: used.has(type) }));
}
