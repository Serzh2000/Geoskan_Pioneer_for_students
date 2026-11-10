/**
 * Миссии трека «Мини 2 · SDK2»: Python на pioneer_sdk2 для Пионера Мини 2.
 * Тексты, шаблоны, эталоны и проверки лежат в `ui/mission-guide/mini2`; здесь они превращаются в обычные миссии
 * режима обучения (`Quest`), чтобы карта, кабинеты и сохранение прогресса работали так же, как у других треков.
 */
import type { GuideTextLesson } from '../ui/mission-guide/types.js';
import { SDK2_MISSIONS, solutionOf } from '../ui/mission-guide/mini2/sdk2-missions.js';
import { SDK2_DONE_MESSAGE } from '../ui/mission-guide/mini2/sdk2-grade.js';
import type { Quest } from './quests.js';

export function buildSdk2Quests(): Quest[] {
    return SDK2_MISSIONS.map((mission, index) => {
        const lesson: GuideTextLesson = {
            id: mission.id, topicId: mission.id, chapterId: mission.group, badge: `Миссия ${index + 1}`, title: mission.title,
            goal: mission.goal, taskSteps: mission.steps, summary: mission.goal, lessonIntro: mission.goal,
            expectedOutcome: mission.outcome, builderHint: mission.hint, apiFocus: [], links: [],
            starterCode: mission.starter, solutionCode: solutionOf(mission)
        };
        return {
            id: mission.id,
            number: index + 1,
            groupId: mission.group,
            groupTitle: mission.groupTitle,
            groupLabel: mission.groupTitle.replace(/^\d+\.\s*/, ''),
            title: mission.title,
            goal: mission.goal,
            steps: mission.steps,
            checkSteps: [],
            hint: mission.hint,
            outcome: mission.outcome,
            requires: [],
            source: 'sdk2' as const,
            lesson,
            sdk2: { waitMs: mission.waitMs, doneMessage: SDK2_DONE_MESSAGE, scene: mission.scene, swarm: mission.swarm }
        };
    });
}
