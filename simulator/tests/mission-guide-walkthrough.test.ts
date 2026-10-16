import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';
import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import { getWalkthroughContent } from '../public/modules/ui/mission-guide/walkthrough/content.js';
import { ACADEMY_LESSONS, ACADEMY_MODULES } from '../public/modules/ui/mission-guide/academy/catalog.js';
import { renderWalkthrough } from '../public/modules/ui/mission-guide/render/walkthrough.js';
import { renderCheckVerdict } from '../public/modules/ui/mission-guide/render/results.js';
import {
    answerWalkthrough, beginWalkthroughCheck, canCompleteWalkthrough, finishWalkthroughCheck,
    getWalkthroughProgress, getWalkthroughResult, moveWalkthrough, parseWalkthroughProgress,
    resetWalkthroughResult, syncWalkthroughSession
} from '../public/modules/ui/mission-guide/walkthrough/state.js';

const passed = { solved: true, complete: true, diagnostics: [] };
function practice(key: string): void {
    expect(moveWalkthrough(key, 'predict', 1, 'code')).toBe(true);
    answerWalkthrough(key, 1, 1);
    expect(moveWalkthrough(key, 'build', 1, 'code')).toBe(true);
}

describe('Sequential learning', () => {
    test('navigation explains prediction and runtime gates, including a stale program', () => {
        const lesson = { ...getLuaTextLessonState().lessons[0], id: 'test-readable-gates' };
        const content = getWalkthroughContent(lesson);
        const key = `lua:${lesson.id}`;
        const render = (source = 'code') => renderWalkthrough(lesson, 'lua', source, { build: 'practice', check: 'result', completed: false });
        expect(moveWalkthrough(key, 'predict', content.correct, 'code')).toBe(true);
        expect(render()).toContain('Выберите верный прогноз');
        expect(render()).toContain('aria-labelledby="guide-walkthrough-stage"');
        answerWalkthrough(key, content.correct, content.correct);
        expect(moveWalkthrough(key, 'build', content.correct, 'code')).toBe(true);
        expect(render()).toContain('Запустите проверку в практике');
        const token = beginWalkthroughCheck(key, content.correct);
        expect(render()).toContain('Дождитесь результата или остановите проверку');
        expect(finishWalkthroughCheck(key, token, 'code', passed)).toBe(true);
        expect(render()).not.toContain('Вернитесь к практике и выполните условия');
        expect(render('edited code')).toContain('Вернитесь к практике и выполните условия');
        expect(render('edited code')).toContain('После успешной проверки'.toLowerCase());
        resetWalkthroughResult(key);
    });

    test('all four lesson catalogs have authored device explanations and a valid prediction', () => {
        for (const catalog of [getLuaLessonState(), getPythonLessonState(), getLuaTextLessonState(), getPythonTextLessonState()]) {
            for (const lesson of catalog.lessons) {
                const content = getWalkthroughContent(lesson);
                expect(content.device.length).toBeGreaterThan(80);
                expect(content.choices[content.correct]).toBeDefined();
                expect(content.choices.every(choice => choice.feedback.length > 20)).toBe(true);
                const html = renderWalkthrough(lesson, lesson.id.startsWith('lua') ? 'lua' : 'python', '', { build: '', check: '', completed: false });
                expect(html).toContain('data-walkthrough-step="device"');
                expect(html.match(/guide-walkthrough__step /g)).toHaveLength(5);
                expect(html).toMatch(/data-walkthrough-step="predict"\s+disabled/);
            }
        }
    });

    test('the correct prediction does not alternate with lesson parity', () => {
        const positions = getLuaTextLessonState().lessons.slice(0, 40).map(lesson => getWalkthroughContent(lesson).correct);
        expect(new Set(positions).size).toBeGreaterThan(1);
        const alternating = positions.every((value, index) => value === index % 2) || positions.every((value, index) => value === (index + 1) % 2);
        expect(alternating).toBe(false);
    });

    test('cannot skip the idea, a prediction or a real check', () => {
        const key = 'test:gates';
        expect(moveWalkthrough(key, 'build', 1, 'code')).toBe(false);
        expect(moveWalkthrough(key, 'predict', 1, 'code')).toBe(true);
        answerWalkthrough(key, 0, 1);
        expect(moveWalkthrough(key, 'build', 1, 'code')).toBe(false);
        answerWalkthrough(key, 1, 1);
        expect(moveWalkthrough(key, 'build', 1, 'code')).toBe(true);
        expect(moveWalkthrough(key, 'check', 1, 'code')).toBe(false);
        expect(moveWalkthrough(key, 'reflect', 1, 'code')).toBe(false);
    });

    test('completion needs reflection and the same program that passed', () => {
        const key = 'test:completion';
        practice(key);
        const token = beginWalkthroughCheck(key, 1);
        expect(finishWalkthroughCheck(key, token, 'code', passed)).toBe(true);
        expect(canCompleteWalkthrough(key, 1, 'code')).toBe(false);
        expect(moveWalkthrough(key, 'reflect', 1, 'code')).toBe(true);
        expect(canCompleteWalkthrough(key, 1, 'code')).toBe(true);
        expect(canCompleteWalkthrough(key, 1, 'edited code')).toBe(false);
        expect(getWalkthroughResult(key, 'edited code')).toBeNull();
        resetWalkthroughResult(key);
        expect(canCompleteWalkthrough(key, 1, 'code')).toBe(false);
    });

    test('a newer run or another lesson invalidates an asynchronous result', () => {
        const key = 'test:race';
        practice(key);
        const first = beginWalkthroughCheck(key, 1);
        const second = beginWalkthroughCheck(key, 1);
        expect(finishWalkthroughCheck(key, first, 'old', passed)).toBe(false);
        expect(finishWalkthroughCheck(key, second, 'code', passed)).toBe(true);
        const third = beginWalkthroughCheck(key, 1);
        syncWalkthroughSession('test:different-lesson');
        expect(finishWalkthroughCheck(key, third, 'code', passed)).toBe(false);
    });

    test('the last verdict survives closing the textbook and reopening the same lesson', () => {
        const key = 'test:reopen';
        practice(key);
        const token = beginWalkthroughCheck(key, 1);
        const failed = { solved: false, complete: false, diagnostics: [{ kind: 'warning' as const, title: 't', reason: 'r', fix: 'f' }] };
        expect(finishWalkthroughCheck(key, token, 'code', failed)).toBe(true);
        syncWalkthroughSession('closed');
        syncWalkthroughSession(key);
        expect(getWalkthroughResult(key, 'code')).toEqual(failed);
        expect(getWalkthroughProgress(key, 1).step).toBe('check');
        resetWalkthroughResult(key);
    });

    test('closing during a check drops the unfinished run instead of publishing it later', () => {
        const key = 'test:close-mid-check';
        practice(key);
        const token = beginWalkthroughCheck(key, 1);
        syncWalkthroughSession('closed');
        expect(finishWalkthroughCheck(key, token, 'code', passed)).toBe(false);
        expect(getWalkthroughResult(key, 'code')).toBeNull();
    });

    test('headings go h1 (lesson) -> h2 (step sections) without skipping a level', () => {
        const lesson = { ...getLuaTextLessonState().lessons[0], id: 'test-headings' };
        const idea = renderWalkthrough(lesson, 'lua', 'code', { build: '', check: '', completed: false });
        expect(idea).toContain('<h2>Сегодня попробуем</h2>');
        expect(idea).not.toMatch(/<h3/);
        const verdict = renderCheckVerdict(true, true, 0, false);
        expect(verdict).toContain('<h2 class="guide-verdict__title">');
        expect(verdict).not.toMatch(/<h3|<strong>/);
    });

    test('a failed verdict starts by normalising the failure, and a passed one does not', () => {
        const failed = renderCheckVerdict(true, false, 2, false, { hasErrors: true });
        expect(failed).toContain('Так бывает у большинства первых запусков. Исправьте замечание ниже и запустите снова.');
        expect(failed.indexOf('Так бывает')).toBeLessThan(failed.indexOf('Замечаний: 2'));
        expect(renderCheckVerdict(true, false, 1, true)).toContain('Так бывает');
        expect(renderCheckVerdict(true, true, 0, false)).not.toContain('Так бывает');
        expect(renderCheckVerdict(false, false, 0, false)).not.toContain('Так бывает');
    });

    test('saved navigation never restores runtime success or bypasses a wrong answer', () => {
        expect(parseWalkthroughProgress({ step: 'reflect', furthest: 5, answer: 1 })).toEqual({ step: 'check', furthest: 3, answer: 1 });
        expect(parseWalkthroughProgress({ step: 'unknown', furthest: Infinity, answer: -1 })).toEqual({ step: 'device', furthest: 0, answer: null });
        const key = 'test:wrong-later';
        practice(key);
        answerWalkthrough(key, 0, 1);
        expect(getWalkthroughProgress(key, 1).step).toBe('predict');
    });
});

describe('Large curriculum', () => {
    test('108 distinct lessons form twelve ordered modules with only earlier prerequisites', () => {
        expect(ACADEMY_LESSONS).toHaveLength(108);
        expect(ACADEMY_MODULES).toHaveLength(12);
        expect(new Set(ACADEMY_LESSONS.map(lesson => lesson.title)).size).toBe(108);
        const previous = new Set<string>();
        for (const lesson of ACADEMY_LESSONS) {
            expect(lesson.prerequisites.every(id => previous.has(id))).toBe(true);
            expect(lesson.concept.length).toBeGreaterThan(1);
            for (const text of [lesson.explanation, lesson.task, lesson.observation]) expect(text.length).toBeGreaterThan(20);
            previous.add(lesson.id);
        }
        expect(ACADEMY_MODULES.every(module => module.lessons.length === 9)).toBe(true);
    });
    test('camera comes before detection, geometry before feedback, and missions last', () => {
        const index = (id: string) => ACADEMY_MODULES.findIndex(module => module.id === id);
        expect(index('coordinates')).toBeLessThan(index('terrain'));
        expect(index('camera')).toBeLessThan(index('aruco'));
        expect(index('aruco')).toBeLessThan(index('visual-navigation'));
        expect(index('visual-navigation')).toBeLessThan(index('missions'));
        expect(ACADEMY_MODULES[index('aruco')].lessons.every(lesson => lesson.languages.join() === 'python')).toBe(true);
    });
});
