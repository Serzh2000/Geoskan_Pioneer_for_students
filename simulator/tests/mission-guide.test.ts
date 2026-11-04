import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';
import {
    getActiveChapter,
    getActiveTab,
    getLessonsForChapter,
    setActiveChapterId,
    setActiveLessonId,
    setActiveTab
} from '../public/modules/ui/mission-guide/state.js';

describe('Mission Guide Curriculum', () => {
    test('provides structured chapters for Lua and Python', () => {
        const luaState = getLuaLessonState();
        const pythonState = getPythonLessonState();

        // Три главы старых заданий и четыре главы практикума на блоках pioneer_*.
        expect(luaState.chapters).toHaveLength(7);
        expect(pythonState.chapters).toHaveLength(7);
        expect(luaState.lessons.filter((lesson) => !lesson.pioneer)).toHaveLength(10);
        expect(pythonState.lessons.filter((lesson) => !lesson.pioneer)).toHaveLength(10);
        expect(luaState.lessons.filter((lesson) => lesson.pioneer).length).toBeGreaterThanOrEqual(15);
        for (const state of [luaState, pythonState]) {
            const chapterIds = new Set(state.chapters.map((chapter) => chapter.id));
            expect(state.lessons.every((lesson) => chapterIds.has(lesson.chapterId))).toBe(true);
        }
        expect(luaState.chapters.every((chapter) => chapter.practiceTasks.length > 0)).toBe(true);
        expect(pythonState.chapters.every((chapter) => chapter.theorySections.length > 0)).toBe(true);
    });

    test('filters lessons by chapter and resolves active chapter from active lesson', () => {
        const luaState = getLuaLessonState();

        setActiveLessonId('lua', 'lua-takeoff');
        const activeChapter = getActiveChapter(luaState, 'lua');
        const chapterLessons = getLessonsForChapter(luaState, activeChapter.id);

        expect(activeChapter.id).toBe('flight');
        expect(chapterLessons.map((lesson) => lesson.id)).toEqual([
            'lua-preflight',
            'lua-takeoff',
            'lua-route',
            'lua-point-confirm'
        ]);
    });

    test('stores top-level guide tab state per language', () => {
        expect(getActiveTab('python')).toBe('tutorial');
        setActiveTab('python', 'trainer');
        expect(getActiveTab('python')).toBe('trainer');
        setActiveTab('python', 'tutorial');
    });

    test('allows explicit chapter switching independent from lesson storage', () => {
        const pythonState = getPythonLessonState();

        setActiveChapterId('python', 'mission');
        expect(getActiveChapter(pythonState, 'python').id).toBe('mission');
        setActiveChapterId('python', '');
    });
});
