/** Режим обучения: порядок заданий, открытие по цепочке, прогресс и режим приложения. */
import {
    buildAcademyQuests, buildQuests, clampStep, completeQuest, INTRO_STEP, lastStepIndex, questGroups, countDone, currentQuest, emptyProgress, firstOpenQuest, loadProgress, nextQuest,
    QUEST_GROUP_ORDER, QUEST_PROGRESS_STORAGE_KEY, questStatus, requiredBlockChecklist, saveProgress, selectQuest,
    type StorageLike
} from '../public/modules/learning/quests.js';
import { PIONEER_LESSONS } from '../public/modules/ui/mission-guide/lessons/pioneer/catalog.js';
import { APP_MODE_STORAGE_KEY, loadLastMode, saveLastMode } from '../public/modules/learning/mode.js';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value); },
        removeItem: (key) => { delete data[key]; }
    };
}

describe('задания режима обучения', () => {
    const quests = buildQuests();

    it('берёт все уроки практикума, главы идут flight → light → logic → projects', () => {
        expect(quests).toHaveLength(PIONEER_LESSONS.length);
        expect(quests.map((quest) => quest.number)).toEqual(quests.map((_, i) => i + 1));
        const groupIndexes = quests.map((quest) => QUEST_GROUP_ORDER.indexOf(quest.groupId as never));
        expect(groupIndexes).toEqual([...groupIndexes].sort((a, b) => a - b));
        expect(new Set(quests.map((quest) => quest.id)).size).toBe(quests.length);
    });

    it('в начале открыто только первое задание', () => {
        const progress = emptyProgress();
        expect(questStatus(quests, progress, quests[0].id)).toBe('available');
        expect(questStatus(quests, progress, quests[1].id)).toBe('locked');
        expect(firstOpenQuest(quests, progress)?.id).toBe(quests[0].id);
        expect(currentQuest(quests, progress)?.id).toBe(quests[0].id);
    });

    it('закрытое задание выбрать нельзя', () => {
        const progress = emptyProgress();
        expect(selectQuest(quests, progress, quests[3].id)).toBe(progress);
    });

    it('прохождение открывает следующее и делает его текущим', () => {
        let progress = completeQuest(quests, emptyProgress(), quests[0].id);
        expect(questStatus(quests, progress, quests[0].id)).toBe('done');
        expect(questStatus(quests, progress, quests[1].id)).toBe('available');
        expect(progress.currentId).toBe(quests[1].id);
        expect(countDone(quests, progress)).toBe(1);
        // Повторное прохождение не дублирует запись.
        progress = completeQuest(quests, progress, quests[0].id);
        expect(countDone(quests, progress)).toBe(1);
        // Пройденное можно открыть снова.
        expect(selectQuest(quests, progress, quests[0].id).currentId).toBe(quests[0].id);
    });

    it('нельзя засчитать закрытое задание', () => {
        const progress = emptyProgress();
        expect(completeQuest(quests, progress, quests[5].id)).toBe(progress);
    });

    it('после последнего задания все пройдены и остаётся последнее', () => {
        let progress = emptyProgress();
        quests.forEach((quest) => { progress = completeQuest(quests, progress, quest.id); });
        expect(countDone(quests, progress)).toBe(quests.length);
        expect(firstOpenQuest(quests, progress)).toBeNull();
        expect(currentQuest(quests, progress)?.id).toBe(quests[quests.length - 1].id);
        expect(nextQuest(quests, quests[quests.length - 1].id)).toBeNull();
    });

    it('прогресс сохраняется и читается, лишнее из хранилища отбрасывается', () => {
        const storage = memoryStorage();
        const progress = completeQuest(quests, emptyProgress(), quests[0].id);
        saveProgress(storage, progress);
        expect(loadProgress(storage, quests)).toEqual(progress);

        storage.data[QUEST_PROGRESS_STORAGE_KEY] = JSON.stringify({ completed: [quests[0].id, 'нет-такого', quests[0].id], currentId: 'нет-такого' });
        expect(loadProgress(storage, quests)).toEqual({ completed: [quests[0].id], currentId: '' });

        storage.data[QUEST_PROGRESS_STORAGE_KEY] = '{сломано';
        expect(loadProgress(storage, quests)).toEqual(emptyProgress());
        expect(loadProgress(null, quests)).toEqual(emptyProgress());
    });

    it('сохранённое текущее задание, ставшее закрытым, заменяется первым открытым', () => {
        expect(currentQuest(quests, { completed: [], currentId: quests[4].id })?.id).toBe(quests[0].id);
    });

    it('чеклист обязательных блоков отмечает поставленные', () => {
        const quest = quests.find((item) => item.requires.length > 0)!;
        const [firstType] = quest.requires[0];
        const list = requiredBlockChecklist(quest, [firstType]);
        expect(list).toHaveLength(quest.requires.length);
        expect(list[0].done).toBe(true);
        expect(requiredBlockChecklist(quest, []).every((item) => !item.done)).toBe(true);
    });
});

describe('режим приложения', () => {
    it('запоминает последний выбор и игнорирует мусор', () => {
        const storage = memoryStorage();
        expect(loadLastMode(storage)).toBeNull();
        saveLastMode(storage, 'learning');
        expect(loadLastMode(storage)).toBe('learning');
        storage.data[APP_MODE_STORAGE_KEY] = 'start';
        expect(loadLastMode(storage)).toBeNull();
        expect(loadLastMode(null)).toBeNull();
    });
});

describe('миссии Академии', () => {
    it('Lua и Python берут уроки Академии по порядку с шагами и главами', () => {
        const lua = buildAcademyQuests('lua');
        const python = buildAcademyQuests('python');
        expect(lua.length).toBeGreaterThan(0);
        expect(python.length).toBeGreaterThanOrEqual(lua.length);
        expect(lua.map((quest) => quest.number)).toEqual(lua.map((_, i) => i + 1));
        expect(new Set(lua.map((quest) => quest.id)).size).toBe(lua.length);
        expect(lua.every((quest) => quest.steps.length >= 1 && quest.title && quest.source === 'academy')).toBe(true);
        const groups = questGroups(lua);
        expect(groups.length).toBeGreaterThan(1);
        expect(groups.reduce((sum, group) => sum + group.quests.length, 0)).toBe(lua.length);
        expect(questStatus(lua, emptyProgress(), lua[1].id)).toBe('locked');
    });
});

describe('карточки миссии по шагам', () => {
    it('индекс карточки ограничен вводной и проверкой', () => {
        const quest = buildQuests()[0];
        expect(INTRO_STEP).toBe(-1);
        expect(lastStepIndex(quest)).toBe(quest.steps.length);
        expect(clampStep(quest, -5)).toBe(INTRO_STEP);
        expect(clampStep(quest, 99)).toBe(quest.steps.length);
        expect(clampStep(quest, 1)).toBe(1);
    });
});
