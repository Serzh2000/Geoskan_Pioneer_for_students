import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { renderPracticum } from '../public/modules/ui/mission-guide/render/walkthrough.js';
import { resumePracticumWork, setPracticumScreen, answerPracticum, beginWalkthroughCheck, finishWalkthroughCheck, getWalkthroughResult } from '../public/modules/ui/mission-guide/walkthrough/state.js';

it('keeps work visible without a prediction and preserves the result after a wrong prediction', () => {
    const lesson = { ...getLuaTextLessonState().lessons[0], id: 'practicum-optional' };
    const key = `lua:${lesson.id}`;
    const views = { build: { brief: 'TASK', work: '<div>WORKSPACE</div>' }, check: '<div>RESULT</div>', completed: false };
    const initial = renderPracticum(lesson, 'lua', 'code', views);
    expect(initial).not.toContain('WORKSPACE');
    expect(initial).toContain('К практике');
    setPracticumScreen(key, 'practice');
    const practice = renderPracticum(lesson, 'lua', 'code', views);
    expect(practice).toContain('WORKSPACE');
    expect(practice).not.toContain('RESULT');
    expect(initial).not.toContain('guide-walkthrough__steps');
    expect(initial).not.toContain('data-practicum-finish');
    const token = beginWalkthroughCheck(key, 1);
    expect(finishWalkthroughCheck(key, token, 'code', { solved: true, complete: true, diagnostics: [] })).toBe(true);
    answerPracticum(key, 0, 1);
    expect(getWalkthroughResult(key, 'code')?.solved).toBe(true);
    expect(renderPracticum(lesson, 'lua', 'code', views)).toContain('RESULT');
    expect(renderPracticum(lesson, 'lua', 'code', views)).toContain('data-practicum-finish');
    expect(renderPracticum(lesson, 'lua', 'code', views)).not.toContain('WORKSPACE');
    resumePracticumWork(key, 'code');
    expect(renderPracticum(lesson, 'lua', 'code', views)).toContain('WORKSPACE');
    const repeatToken = beginWalkthroughCheck(key, 1);
    expect(finishWalkthroughCheck(key, repeatToken, 'code', { solved: true, complete: true, diagnostics: [] })).toBe(true);
    expect(renderPracticum(lesson, 'lua', 'code', views)).not.toContain('WORKSPACE');
    expect(renderPracticum(lesson, 'lua', 'edited', views)).not.toContain('data-practicum-finish');
});

it('remembers each lesson screen and prevents switching during an experiment', () => {
    const lesson = { ...getLuaTextLessonState().lessons[0], id: 'practicum-screen' };
    const key = `lua:${lesson.id}`;
    const views = { build: { brief: 'TASK', work: 'EDITOR' }, check: 'RESULT', completed: false };
    setPracticumScreen(key, 'practice');
    const token = beginWalkthroughCheck(key, 1);
    setPracticumScreen(key, 'learn');
    expect(renderPracticum(lesson, 'lua', 'code', views)).toContain('EDITOR');
    finishWalkthroughCheck(key, token, 'code', { solved: false, complete: false, diagnostics: [] });
    setPracticumScreen(key, 'learn');
    expect(renderPracticum(lesson, 'lua', 'code', views)).not.toContain('EDITOR');
    setPracticumScreen(key, 'practice');
    expect(renderPracticum(lesson, 'lua', 'code', views)).toContain('EDITOR');
});

