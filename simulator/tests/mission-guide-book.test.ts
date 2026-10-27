import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';
import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import { buildBookLesson } from '../public/modules/ui/mission-guide/book/data.js';
import { blocklySource, courseSource, practiceSource } from '../public/modules/ui/mission-guide/book/source.js';
import { spreadOfStep, spreadPages } from '../public/modules/ui/mission-guide/book/context.js';
import { spreadCurls } from '../public/modules/ui/mission-guide/book/curls.js';
import { channelMax, ledbarColor, ledbarColorName, ledbarCommand } from '../public/modules/ui/mission-guide/book/ledbar.js';

const textStates = { lua: getLuaTextLessonState(), python: getPythonTextLessonState() };
const blocklyStates = { lua: getLuaLessonState(), python: getPythonLessonState() };
const course = (track: 'lua' | 'python') => textStates[track].lessons.filter(lesson => lesson.academy);
const extras = (track: 'lua' | 'python') => textStates[track].lessons.filter(lesson => !lesson.academy);

describe('book lessons', () => {
    it('covers the whole numbered course and every extra task of both text tracks', () => {
        expect(course('lua')).toHaveLength(72);
        expect(course('python')).toHaveLength(108);
        for (const track of ['lua', 'python'] as const) {
            expect(extras(track)).toHaveLength(10);
            extras(track).forEach((lesson, index) => {
                const source = practiceSource(textStates[track], lesson, track);
                expect(source.number).toBe(index + 1);
                expect(source.kind).toBe('practice');
            });
        }
    });

    it('gives each course lesson a reading, key words and a figure, and a framed construction wherever the lesson has code', () => {
        for (const track of ['lua', 'python'] as const) {
            for (const lesson of course(track)) {
                const book = buildBookLesson(courseSource(lesson, track));
                if (lesson.academy!.mode === 'code') expect(book.key.code).not.toBe('');
                expect(book.key.code).not.toMatch(/^local leds = |^from pioneer_sdk|^import |^pioneer\s*=\s*Pioneer\(/);
                // The frame shows what the student writes, not a helper every program of the chapter carries.
                expect(book.key.code).not.toMatch(/^def wait_for|___/);
                expect(book.paragraphs.join('').length).toBeGreaterThan(20);
                expect(book.words.length).toBeGreaterThan(0);
                expect(book.figure).toBe(lesson.chapterId === 'lights' ? 'ledbar' : 'drone');
            }
        }
    });

    it('builds the extra tasks and the Blockly assignments from their API rows and blocks', () => {
        for (const track of ['lua', 'python'] as const) {
            for (const lesson of extras(track)) {
                const book = buildBookLesson(practiceSource(textStates[track], lesson, track));
                expect(book.key.code).not.toBe('');
                expect(book.paragraphs.join('')).not.toBe('');
                expect(book.words.length).toBeGreaterThan(0);
            }
            const state = blocklyStates[track];
            expect(state.lessons).toHaveLength(10);
            for (const lesson of state.lessons) {
                const source = blocklySource(state, lesson, track);
                const book = buildBookLesson(source);
                expect(source.mode).toBe('blocks');
                expect(book.key.code).not.toBe('');
                expect(book.paragraphs.join('')).not.toBe('');
                expect(book.words.length).toBeGreaterThan(0);
                expect(book.figure).toBe(lesson.id.includes('led') ? 'ledbar' : 'drone');
            }
        }
    });

    it('writes the first lighting lesson by hand for each language', () => {
        const luaFirst = course('lua').find(lesson => lesson.academy!.number === 10)!;
        const pythonFirst = course('python').find(lesson => lesson.academy!.number === 10)!;
        expect(buildBookLesson(courseSource(luaFirst, 'lua')).key.code).toBe('leds:set(0, 1, 0, 0)');
        expect(buildBookLesson(courseSource(pythonFirst, 'python')).key.code).toBe('pioneer.led_control(0, 255, 0, 0)');
    });

    it('numbers the pages so the extra tasks follow the course without sharing a page', () => {
        const lastCourse = courseSource(course('lua')[71], 'lua');
        const firstExtra = practiceSource(textStates.lua, extras('lua')[0], 'lua');
        expect(spreadPages(lastCourse, 3)[1]).toBe(72 * 6);
        expect(spreadPages(firstExtra, 1)[0]).toBe(72 * 6 + 1);
        expect([spreadOfStep('device'), spreadOfStep('predict'), spreadOfStep('build'), spreadOfStep('check'), spreadOfStep('reflect')]).toEqual([1, 1, 2, 2, 3]);
    });
});

describe('LED strip figure', () => {
    it('prints the command in the language of the lesson', () => {
        expect(ledbarCommand('lua', { index: 3, r: 1, g: 0.5, b: 0 })).toBe('leds:set(3, 1, 0.5, 0)');
        expect(ledbarCommand('python', { index: 3, r: 255, g: 128, b: 0 })).toBe('pioneer.led_control(3, 255, 128, 0)');
        expect(channelMax('lua')).toBe(1);
        expect(channelMax('python')).toBe(255);
    });

    it('keeps the glass unlit while every channel is off and names the mixes', () => {
        expect(ledbarColor('lua', { index: 0, r: 0, g: 0, b: 0 })).toBe('');
        expect(ledbarColor('lua', { index: 0, r: 1, g: 0, b: 0 })).toBe('rgb(255, 0, 0)');
        expect(ledbarColor('python', { index: 0, r: 128, g: 128, b: 128 })).toBe('rgb(128, 128, 128)');
        expect(ledbarColorName('lua', { index: 0, r: 0, g: 0, b: 0 })).toBe('выключено');
        expect(ledbarColorName('lua', { index: 0, r: 1, g: 0, b: 0 })).toBe('красный');
        expect(ledbarColorName('lua', { index: 0, r: 1, g: 1, b: 1 })).toBe('белый');
        expect(ledbarColorName('lua', { index: 0, r: 0.5, g: 0.5, b: 0.5 })).toBe('белый, тусклее');
        expect(ledbarColorName('lua', { index: 0, r: 1, g: 1, b: 0 })).toBe('жёлтый');
        expect(ledbarColorName('lua', { index: 0, r: 0, g: 1, b: 1 })).toBe('бирюзовый');
    });
});

describe('page corners', () => {
    const ctx = (spread: 1 | 2 | 3, nextAttr = 'data-guide-nav="next"', hasPrevious = true) =>
        ({ spread, nav: { note: '', hasPrevious, next: '', nextAttr } }) as unknown as Parameters<typeof spreadCurls>[0];
    const state = { ready: false, hasChecked: false, solved: false, pending: false, completed: false };

    it('lift a corner only on the pages that can be turned now', () => {
        expect(spreadCurls(ctx(1), state).next).toBeNull();
        expect(spreadCurls(ctx(1), { ...state, ready: true }).next?.attr).toBe('data-walkthrough-step="build"');
        expect(spreadCurls(ctx(1, undefined, false), state).back).toBeNull();
        expect(spreadCurls(ctx(2), state).back?.attr).toBe('data-walkthrough-step="predict"');
        expect(spreadCurls(ctx(2), { ...state, hasChecked: true, solved: true }).next?.attr).toBe('data-walkthrough-step="reflect"');
        expect(spreadCurls(ctx(2), { ...state, hasChecked: true, solved: true, pending: true }).next).toBeNull();
    });

    it('lead the review spread on: finish the lesson, then the next one', () => {
        expect(spreadCurls(ctx(3), state).next).toBeNull();
        expect(spreadCurls(ctx(3), { ...state, solved: true }).next?.attr).toBe('data-walkthrough-finish');
        expect(spreadCurls(ctx(3), { ...state, solved: true, completed: true }).next?.attr).toBe('data-guide-nav="next"');
        expect(spreadCurls(ctx(3, ''), { ...state, completed: true }).next).toBeNull();
        expect(spreadCurls(ctx(3), state).back?.attr).toBe('data-walkthrough-step="check"');
    });
});
