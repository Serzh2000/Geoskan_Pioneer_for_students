import { solutionOf, type Sdk2Mission } from './sdk2-mission-kit.js';
import { FLIGHT_MISSIONS } from './sdk2-missions-flight.js';
import { SYSTEM_MISSIONS } from './sdk2-missions-systems.js';
import { VISION_MISSIONS } from './sdk2-missions-vision.js';
import { Sdk2Grader } from './sdk2-grade.js';
import type { GuideEvaluation } from '../types.js';
import type { LearningEvent } from '../../../core/learning-journal.js';
import type { DroneSample } from '../evaluation/text/trace.js';

/** Миссии трека «Мини 2 · SDK2» по порядку прохождения: 13 глав учебника `python-onboard`. */
export const SDK2_MISSIONS: Sdk2Mission[] = [...FLIGHT_MISSIONS, ...SYSTEM_MISSIONS, ...VISION_MISSIONS];
export const SDK2_MISSION_BY_ID: Record<string, Sdk2Mission> = Object.fromEntries(SDK2_MISSIONS.map((mission) => [mission.id, mission]));
export { solutionOf };

export function isSdk2Mission(id: string): boolean {
    return id in SDK2_MISSION_BY_ID;
}

/** Проверка миссии трека SDK2 по наблюдениям запуска. */
export function gradeSdk2Mission(id: string, samples: DroneSample[], events: LearningEvent[]): GuideEvaluation {
    const mission = SDK2_MISSION_BY_ID[id];
    const grader = new Sdk2Grader(samples, events);
    if (!mission) {
        grader.fail('Проверка для этой миссии не найдена', `Нет миссии «${id}».`, 'Сообщите разработчикам урока.');
        return grader.result();
    }
    mission.check(grader);
    return grader.result();
}
