/**
 * Миссии трека «Мини 2 · Bricks»: блоки Pioneer Bricks на дроне Пионер Мини 2.
 * Тексты, шаблоны, эталонные проекты и проверки лежат в `ui/mission-guide/mini2/bricks-missions.ts`; здесь они
 * превращаются в обычные миссии режима обучения (`Quest`).
 */
import { BRICKS_DONE_MESSAGE, BRICKS_MISSIONS } from '../ui/mission-guide/mini2/bricks-missions.js';
import type { Quest } from './quests.js';

export type BricksQuestInfo = {
    waitMs: number;
    doneMessage: string;
    scene?: 'markers';
    /** Проект Bricks, с которого начинается миссия, и эталон. */
    starterXml: string;
    solutionXml: string;
    /** Сколько блоков каждого типа нужно как минимум. */
    minCounts: Record<string, number>;
    /** Миссия с полётом: проверка заканчивается, когда программа дошла до конца. */
    flight: boolean;
    /** Имя проекта (файл .xml при сохранении). */
    name: string;
};

export function buildBricksQuests(): Quest[] {
    return BRICKS_MISSIONS.map((mission, index) => ({
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
        requires: mission.requires,
        source: 'bricks' as const,
        bricks: {
            waitMs: mission.waitMs, doneMessage: BRICKS_DONE_MESSAGE, scene: mission.scene, starterXml: mission.starterXml,
            solutionXml: mission.solutionXml, minCounts: mission.minCounts ?? {}, flight: mission.flight, name: mission.id.replace(/-/g, '_')
        }
    }));
}
