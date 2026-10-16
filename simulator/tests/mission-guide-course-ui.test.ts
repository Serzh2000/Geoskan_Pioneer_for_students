import { academyCompletedCount, switchGuideTrack } from '../public/modules/ui/mission-guide/course-navigation.js';
import { renderCourseOutline } from '../public/modules/ui/mission-guide/render/course-outline.js';
import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import { getActiveTextLesson, getActivePracticeTrack, setActiveLessonId, setActivePracticeTrack, setLessonCompleted } from '../public/modules/ui/mission-guide/state.js';

afterEach(() => {
    setLessonCompleted('lua', 'lua-academy-001', false);
    setLessonCompleted('python', 'python-academy-001', false);
    setActiveLessonId('lua', 'lua-academy-001');
    setActiveLessonId('python', 'python-academy-001');
    setActivePracticeTrack('lua');
});

test('switching a supported topic keeps the lesson but not its language-specific identity', () => {
    setLessonCompleted('python', 'python-academy-001', true);
    setActivePracticeTrack('python');
    setActiveLessonId('python', 'python-academy-002');
    expect(switchGuideTrack('lua')).toBe('');
    expect(getActivePracticeTrack()).toBe('lua');
    expect(getActiveTextLesson(getLuaTextLessonState(), 'lua').id).toBe('lua-academy-002');
    expect(switchGuideTrack('python')).toBe('');
    expect(getActiveTextLesson(getPythonTextLessonState(), 'python').id).toBe('python-academy-002');
});

test('Python-only topics preserve the last Lua destination and explain the limitation', () => {
    setActivePracticeTrack('python');
    setActiveLessonId('python', 'python-academy-090');
    setActiveLessonId('lua', 'lua-academy-001');
    expect(switchGuideTrack('lua')).toContain('Камера и ArUco');
    expect(getActiveTextLesson(getLuaTextLessonState(), 'lua').id).toBe('lua-academy-001');
});

test('global progress counts a completed lesson once and excludes additional practice', () => {
    setLessonCompleted('lua', 'lua-academy-001', true);
    setLessonCompleted('python', 'python-academy-001', true);
    expect(academyCompletedCount()).toBe(1);
    const html = renderCourseOutline('python', 'python', 'python-academy-002');
    expect(html).toContain('1 из 108');
    expect(html).not.toContain('118');
    expect(html).toContain('Дополнительная практика');
});

test('outline exposes current topic, prerequisites and Python-only lessons', () => {
    const html = renderCourseOutline('lua', 'lua', 'lua-academy-001');
    expect(html).toMatch(/data-academy-open="academy-001"\s+aria-current="page"/);
    expect(html).toMatch(/data-academy-open="academy-002" disabled/);
    expect(html).toContain('Откроется после урока 1');
    expect(html).toContain('data-academy-open="academy-108"');
    expect(html).toContain('<small>Python</small>');
});

test('Blockly has a distinct ten-exercise outline and never inherits the 108 denominator', () => {
    const html = renderCourseOutline('blockly', 'lua', '');
    expect(html).toContain('0 из 10');
    expect(html).not.toContain('data-academy-open');
    expect(html.match(/data-guide-open-lesson=/g)).toHaveLength(10);
});
