import { getLuaLessonState } from '../public/modules/ui/mission-guide/lua-lessons.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/python-lessons.js';
import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import { getLearningNote, renderLearningNote } from '../public/modules/ui/mission-guide/render/learning.js';
import { renderTargetRoute } from '../public/modules/ui/mission-guide/render/shared.js';
import { renderLessonSteps } from '../public/modules/ui/mission-guide/render/navigation.js';
import { getFirstUnlockedLesson, isTextLessonUnlocked, setLessonCompleted } from '../public/modules/ui/mission-guide/state.js';

describe('Learning support across the curriculum', () => {
    test.each([
        getLuaLessonState(), getPythonLessonState(), getLuaTextLessonState(), getPythonTextLessonState()
    ])('every lesson has a conceptual explanation, self-check and transfer exercise', (state) => {
        for (const lesson of state.lessons) {
            const note = getLearningNote(lesson);
            expect(note).toBeDefined();
            expect(note?.question).toMatch(/\?/);
            expect(note?.answer.length).toBeGreaterThan(30);
            expect(note?.experiment.length).toBeGreaterThan(30);
            const html = renderLearningNote(lesson);
            expect(html.match(/data-guide-quiz-answer="correct"/g)).toHaveLength(1);
            expect(html.match(/data-guide-quiz-answer="retry"/g)).toHaveLength(1);
        }
    });

    test('all Blockly routes use readable names instead of internal block types', () => {
        for (const state of [getLuaLessonState(), getPythonLessonState()]) {
            for (const lesson of state.lessons) {
                const html = renderTargetRoute(lesson);
                for (const id of lesson.targetBlockIds) expect(html).not.toContain(id);
                expect(html).not.toContain('>Действие<');
            }
        }
    });

    test('color experiments use the scale of the chosen language', () => {
        expect(renderLearningNote(getLuaLessonState().lessons[0])).toContain('data-guide-color-max="1"');
        expect(renderLearningNote(getPythonTextLessonState().lessons[0])).toContain('data-guide-color-max="255"');
    });

    test('a matching but unchecked workspace is not presented as a passed check', () => {
        expect(renderLessonSteps('build', false, true)).not.toContain('is-solved');
        expect(renderLessonSteps('check', true, true)).toContain('is-solved');
        expect(renderLessonSteps('build', false, false, 'Написать код')).toContain('Написать код');
    });

    test('continue selects the first unfinished lesson', () => {
        const state = getLuaLessonState();
        setLessonCompleted('lua', state.lessons[0].id, true);
        try {
            expect(getFirstUnlockedLesson(state, 'lua').id).toBe(state.lessons[1].id);
        } finally {
            setLessonCompleted('lua', state.lessons[0].id, false);
        }
    });

    test('text course navigation unlocks the next lesson only after completion', () => {
        const state = getPythonTextLessonState();
        expect(isTextLessonUnlocked(state, 'python', 'missing')).toBe(false);
        expect(isTextLessonUnlocked(state, 'python', state.lessons[0].id)).toBe(true);
        expect(isTextLessonUnlocked(state, 'python', state.lessons[1].id)).toBe(false);
        setLessonCompleted('python', state.lessons[0].id, true);
        try {
            expect(isTextLessonUnlocked(state, 'python', state.lessons[1].id)).toBe(true);
            expect(isTextLessonUnlocked(state, 'python', state.lessons[2].id)).toBe(false);
        } finally {
            setLessonCompleted('python', state.lessons[0].id, false);
        }
    });
});
