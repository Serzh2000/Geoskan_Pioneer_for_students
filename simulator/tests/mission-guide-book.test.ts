import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';
import { getLuaTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python-text.js';
import { buildBookLesson } from '../public/modules/ui/mission-guide/book/data.js';
import { blocklySource, courseSource, practiceSource } from '../public/modules/ui/mission-guide/book/source.js';
import { spreadPages } from '../public/modules/ui/mission-guide/book/context.js';
import { spreadCurls } from '../public/modules/ui/mission-guide/book/curls.js';
import { BOOK_STEPS, neighbourStep, panelStep } from '../public/modules/ui/mission-guide/book/steps.js';
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

    it('gives every lesson of every list a theory, a program to demonstrate and what to watch', () => {
        const sources = [
            ...(['lua', 'python'] as const).flatMap(track => [
                ...course(track).map(lesson => courseSource(lesson, track)),
                ...extras(track).map(lesson => practiceSource(textStates[track], lesson, track)),
                ...blocklyStates[track].lessons.map(lesson => blocklySource(blocklyStates[track], lesson, track))
            ])
        ];
        for (const source of sources) {
            const book = buildBookLesson(source);
            expect(book.theory.join('')).not.toBe('');
            expect(book.code).not.toBe('');
            expect(book.watch).not.toBe('');
            expect(book.figure).toBe(
                source.kind === 'course' ? (source.lesson as { chapterId: string }).chapterId === 'lights' ? 'ledbar' : 'drone'
                    : source.lesson.id.includes('led') ? 'ledbar' : 'drone'
            );
        }
    });

    it('numbers the pages so the extra tasks follow the course without sharing a page', () => {
        const lastCourse = courseSource(course('lua')[71], 'lua');
        const firstExtra = practiceSource(textStates.lua, extras('lua')[0], 'lua');
        expect(spreadPages(lastCourse, 'practice')[1]).toBe(72 * 6);
        expect(spreadPages(firstExtra, 'theory')[0]).toBe(72 * 6 + 1);
    });
});

describe('the three parts of a lesson', () => {
    it('go theory, demonstration, practice, and the practice opens the scene like the demonstration', () => {
        expect(BOOK_STEPS).toEqual(['theory', 'demo', 'practice']);
        expect(neighbourStep('theory', -1)).toBeNull();
        expect(neighbourStep('theory', 1)).toBe('demo');
        expect(neighbourStep('demo', 1)).toBe('practice');
        expect(neighbourStep('practice', 1)).toBeNull();
        expect(BOOK_STEPS.map(panelStep)).toEqual(['device', 'build', 'build']);
    });

    const ctx = (step: 'theory' | 'demo' | 'practice', nextAttr = 'data-guide-nav="next"', hasPrevious = true) =>
        ({ step, nav: { note: '', hasPrevious, next: '', nextAttr } }) as unknown as Parameters<typeof spreadCurls>[0];

    it('lift a corner on every page that can be turned', () => {
        expect(spreadCurls(ctx('theory'), { completed: false })).toEqual({
            back: { attr: 'data-guide-nav="prev"', label: 'Предыдущий урок' },
            next: { attr: 'data-book-step="demo"', label: 'Демонстрация' }
        });
        expect(spreadCurls(ctx('theory', undefined, false), { completed: false }).back).toBeNull();
        expect(spreadCurls(ctx('demo'), { completed: false })).toEqual({
            back: { attr: 'data-book-step="theory"', label: 'Теория' },
            next: { attr: 'data-book-step="practice"', label: 'Практика' }
        });
    });

    it('lead on from the practice only once the lesson is passed', () => {
        expect(spreadCurls(ctx('practice'), { completed: false }).next).toBeNull();
        expect(spreadCurls(ctx('practice'), { completed: true }).next?.attr).toBe('data-guide-nav="next"');
        expect(spreadCurls(ctx('practice', ''), { completed: true }).next).toBeNull();
        expect(spreadCurls(ctx('practice'), { completed: false }).back?.attr).toBe('data-book-step="demo"');
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
