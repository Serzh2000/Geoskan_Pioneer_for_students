import { getAcademySceneEvidence } from '../academy/scene.js';
import type { GuideTextLesson } from '../types.js';

/** Lessons from this number on run on a prepared practice field. */
const FIRST_FIELD_LESSON = 37;

/** The seed field and the prepare/restore buttons of a field lesson; empty for the lessons that fly on the plain apron. */
export function renderTerrainPrep(lesson: GuideTextLesson): string {
    const academy = lesson.academy;
    if (!academy || academy.number < FIRST_FIELD_LESSON) return '';
    const scene = getAcademySceneEvidence();
    const ownScene = scene?.number === academy.number ? scene : undefined;
    return `<div class="guide-academy-terrain"><p>Подготовьте учебную сцену перед опытом. Ваши объекты вернутся кнопкой ниже или при закрытии учебника.</p>
        <label class="pk-field"><span class="pk-field__label">Seed</span><input aria-label="Seed учебной сцены" aria-describedby="guide-scene-status" type="number" min="0" max="4294967295" step="1" value="${ownScene?.seed ?? 20261009}" data-academy-lesson-seed></label>
        <div class="pk-btn-row"><button type="button" class="btn-secondary btn--sm" data-academy-prepare="${academy.number}">Подготовить полигон</button><button type="button" class="btn-secondary btn--sm" data-academy-restore>Вернуть мою сцену</button></div>
        <p id="guide-scene-status" role="status" data-academy-prepare-status>${ownScene?.intact ? `Полигон готов · seed ${ownScene.seed}` : 'Перед запуском подготовьте полигон этого урока.'}</p></div>`;
}
