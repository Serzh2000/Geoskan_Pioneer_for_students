import { setCurrentScriptLanguage } from '../../core/state.js';
import { setEditorLanguage, setEditorValue } from '../../editor/index.js';
import { openApiDocsCatalog, renderApiDocs } from '../api-docs/index.js';
import type { ScriptLanguage } from '../api-docs/sections.js';
import { evaluateLesson, getLessonCode } from './lesson-evaluation.js';
import { getGuideLessonState } from './lessons.js';
import { setMissionGuideScenePreviewActive } from './scene-preview.js';
import {
    clearLessonSequence,
    getActiveLesson,
    getLessonSequence,
    setActiveLessonId,
    setLessonBanner,
    setLessonSequence
} from './state.js';
import type { DragPayload, GuideLesson, RenderMissionGuidePanel } from './types.js';

function parseDragPayload(event: DragEvent): DragPayload | null {
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as DragPayload;
        if (!parsed?.blockId || !parsed?.origin) return null;
        return parsed;
    } catch {
        return null;
    }
}

function updateSequenceFromDrop(
    language: ScriptLanguage,
    lesson: GuideLesson,
    payload: DragPayload,
    dropIndex: number,
    rerender: RenderMissionGuidePanel
): void {
    const sequence = getLessonSequence(language, lesson.id);
    const nextSequence = [...sequence];

    if (payload.origin === 'workspace') {
        if (payload.index < 0 || payload.index >= nextSequence.length) return;
        nextSequence.splice(payload.index, 1);
        if (payload.index < dropIndex) {
            dropIndex -= 1;
        }
    }

    if (payload.origin === 'library' && nextSequence.includes(payload.blockId)) {
        return;
    }

    nextSequence.splice(Math.max(0, Math.min(dropIndex, nextSequence.length)), 0, payload.blockId);
    setLessonSequence(language, lesson.id, nextSequence);
    setLessonBanner(language, lesson.id, null);
    rerender(language);
}

function appendBlockToSequence(language: ScriptLanguage, lesson: GuideLesson, blockId: string, rerender: RenderMissionGuidePanel): void {
    const sequence = getLessonSequence(language, lesson.id);
    if (sequence.includes(blockId)) return;
    sequence.push(blockId);
    setLessonSequence(language, lesson.id, sequence);
    setLessonBanner(language, lesson.id, null);
    rerender(language);
}

function removeBlockFromSequence(language: ScriptLanguage, lesson: GuideLesson, blockId: string, rerender: RenderMissionGuidePanel): void {
    const nextSequence = getLessonSequence(language, lesson.id).filter((item) => item !== blockId);
    setLessonSequence(language, lesson.id, nextSequence);
    setLessonBanner(language, lesson.id, null);
    rerender(language);
}

function launchLesson(language: ScriptLanguage, lesson: GuideLesson, rerender: RenderMissionGuidePanel): void {
    const sequence = getLessonSequence(language, lesson.id);
    if (!sequence.length) return;

    const evaluation = evaluateLesson(lesson, sequence);
    const code = getLessonCode(lesson, sequence);
    const languageSelect = document.getElementById('script-language-select') as HTMLSelectElement | null;

    setCurrentScriptLanguage(language);
    if (languageSelect) languageSelect.value = language;
    setEditorLanguage(language);
    setEditorValue(code);
    renderApiDocs(language);

    setLessonBanner(language, lesson.id, evaluation.solved
        ? {
            kind: 'success',
            message: 'Эталонная последовательность запущена. Живой просмотр сцены открыт прямо в этом окне.'
        }
        : {
            kind: 'warning',
            message: 'Сценарий запущен. Сверьте живую сцену и диагностику: в коде еще есть логические замечания.'
        });

    setMissionGuideScenePreviewActive(true);
    rerender(language);
    (document.getElementById('run-btn') as HTMLButtonElement | null)?.click();
}

export function attachGuideInteractions(
    container: HTMLElement,
    language: ScriptLanguage,
    rerender: RenderMissionGuidePanel
): void {
    const state = getGuideLessonState(language);
    const lesson = getActiveLesson(state, language);

    container.querySelectorAll<HTMLElement>('[data-guide-query]').forEach((element) => {
        element.addEventListener('click', () => {
            const query = element.dataset.guideQuery || '';
            const previewKey = element.dataset.guidePreview || null;
            openApiDocsCatalog({ language, query, previewKey });
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-lesson]').forEach((element) => {
        element.addEventListener('click', () => {
            const lessonId = element.dataset.guideLesson;
            if (!lessonId) return;
            setActiveLessonId(language, lessonId);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-nav]').forEach((element) => {
        element.addEventListener('click', () => {
            const currentIndex = state.lessons.findIndex((item) => item.id === lesson.id);
            if (currentIndex < 0) return;
            const direction = element.dataset.guideNav;
            const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
            const nextLesson = state.lessons[nextIndex];
            if (!nextLesson) return;
            setActiveLessonId(language, nextLesson.id);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-remove]').forEach((element) => {
        element.addEventListener('click', () => {
            const blockId = element.dataset.guideRemove;
            if (!blockId) return;
            removeBlockFromSequence(language, lesson, blockId, rerender);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-reset]').forEach((element) => {
        element.addEventListener('click', () => {
            clearLessonSequence(language, lesson.id);
            setLessonBanner(language, lesson.id, null);
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-fill]').forEach((element) => {
        element.addEventListener('click', () => {
            setLessonSequence(language, lesson.id, lesson.targetBlockIds);
            setLessonBanner(language, lesson.id, {
                kind: 'info',
                message: 'В рабочую область подставлена эталонная последовательность. Ее можно запустить или использовать как образец.'
            });
            rerender(language);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-run]').forEach((element) => {
        element.addEventListener('click', () => {
            launchLesson(language, lesson, rerender);
        });
    });

    container.querySelectorAll<HTMLElement>('[data-guide-block-id]').forEach((element) => {
        element.addEventListener('dragstart', (event) => {
            const blockId = element.dataset.guideBlockId;
            const origin = element.dataset.guideOrigin as 'library' | 'workspace' | undefined;
            const index = Number(element.dataset.guideIndex || '-1');
            if (!blockId || !origin) return;

            const payload: DragPayload = { blockId, origin, index };
            event.dataTransfer?.setData('text/plain', JSON.stringify(payload));
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        if (element.dataset.guideOrigin === 'library') {
            element.addEventListener('click', () => {
                const blockId = element.dataset.guideBlockId;
                if (!blockId) return;
                appendBlockToSequence(language, lesson, blockId, rerender);
            });
        }
    });

    container.querySelectorAll<HTMLElement>('[data-guide-drop-index]').forEach((element) => {
        element.addEventListener('dragover', (event) => {
            event.preventDefault();
            element.classList.add('is-hovered');
        });
        element.addEventListener('dragleave', () => {
            element.classList.remove('is-hovered');
        });
        element.addEventListener('drop', (event) => {
            event.preventDefault();
            element.classList.remove('is-hovered');
            const payload = parseDragPayload(event);
            if (!payload) return;
            const dropIndex = Number(element.dataset.guideDropIndex || '0');
            updateSequenceFromDrop(language, lesson, payload, dropIndex, rerender);
        });
    });
}
