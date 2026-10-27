import { BLOCK_HELP } from '../render/blockly-copy.js';
import { BLOCK_LABELS } from '../render/shared.js';
import { getWalkthroughTopic } from '../walkthrough/content.js';
import type { GuideLesson, GuideTextLesson } from '../types.js';
import type { BookSource } from './source.js';

export type BookFigureKind = 'ledbar' | 'drone';

/** What a lesson adds to its two pages of the book beyond the course data it already has. */
export type BookLesson = {
    chapter: string;
    kicker: string;
    paragraphs: string[];
    key: { code: string; caption: string };
    words: Array<{ term: string; meaning: string }>;
    figure: BookFigureKind;
    figureCaption: string;
    figureHint: string;
    margin: string;
};

type Reading = Pick<BookLesson, 'paragraphs' | 'key' | 'words'>;

const SCAFFOLD = [/^local leds = Ledbar\.new\(29\)$/, /^function callback\(event\)$/, /^end$/, /^from pioneer_sdk import /, /^import /, /^pioneer\s*=\s*Pioneer\(/];
const MAX_BLOCK_WORDS = 4;
const MIN_CAPTION = 14;

function sentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g)?.map(item => item.trim()) ?? [text.trim()];
}

/**
 * The line of the reference solution the student has to write: the first one the starter does not already have,
 * without the lines every program starts with.
 */
function keyLine(lesson: GuideTextLesson): string {
    const starter = lesson.starterCode.split('\n').map(line => line.trim()).filter(Boolean);
    const solution = lesson.solutionCode.split('\n').map(line => line.trim()).filter(Boolean);
    // A starter with blanks keeps the shape of the solution: the first line that differs is the one to write.
    const written = starter.length === solution.length ? solution[starter.findIndex((line, index) => line !== solution[index])] : undefined;
    if (written && !SCAFFOLD.some(rule => rule.test(written)) && !/^(--|#)/.test(written)) return written;
    const given = new Set(starter);
    const lines = lesson.solutionCode.split('\n').map(line => line.trim()).filter(line => line && !SCAFFOLD.some(rule => rule.test(line)));
    const code = lines.filter(line => !/^(--|#)/.test(line));
    // A lesson about editing a comment has nothing but the comment to frame.
    return code.find(line => !given.has(line)) ?? code[0] ?? lines[0] ?? '';
}

/** A one-word hint is no caption for a frame. */
function caption(text: string | undefined): string {
    return text && text.length >= MIN_CAPTION ? text : '';
}

/** The first lighting lesson, written by hand; the others take their pages from the course data. */
function lightingIntro(track: 'lua' | 'python'): Reading {
    return track === 'lua'
        ? {
            paragraphs: [
                'Светодиодная лента дрона — это 29 маленьких лампочек. Программа сначала создаёт объект ленты, `Ledbar.new(29)`, а затем командой `leds:set` просит одну лампочку засветиться нужным цветом.',
                'Цвет складывается из трёх каналов: красного, зелёного и синего. Каждый канал — число от 0 до 1. Ноль выключает канал, единица включает его на полную.'
            ],
            key: { code: 'leds:set(0, 1, 0, 0)', caption: 'лампочка 0 — красный на максимум, зелёный и синий выключены' },
            words: [
                { term: 'Ledbar', meaning: 'лента из светодиодов; её создают один раз в начале программы' },
                { term: 'индекс', meaning: 'номер лампочки в ленте; первая лампочка имеет номер 0' },
                { term: 'RGB', meaning: 'три канала света: красный, зелёный, синий' }
            ]
        }
        : {
            paragraphs: [
                'Светодиоды дрона управляются командой `pioneer.led_control`: сначала номер лампочки, потом три числа — красный, зелёный и синий каналы.',
                'Каждый канал — число от 0 до 255. Ноль выключает канал, 255 включает его на полную.'
            ],
            key: { code: 'pioneer.led_control(0, 255, 0, 0)', caption: 'лампочка 0 — красный на максимум, зелёный и синий выключены' },
            words: [
                { term: 'led_control', meaning: 'команда, которая задаёт цвет одной лампочки' },
                { term: 'индекс', meaning: 'номер лампочки; первая лампочка имеет номер 0' },
                { term: 'RGB', meaning: 'три канала света: красный, зелёный, синий' }
            ]
        };
}

/** A numbered course lesson reads from its explanation and the solution's main line. */
function courseReading(lesson: GuideTextLesson, source: BookSource): Reading {
    if (lesson.academy?.number === 10) return lightingIntro(source.language);
    const parts = sentences(lesson.summary);
    return {
        paragraphs: parts.length > 1 ? parts.slice(1) : parts,
        key: { code: keyLine(lesson), caption: caption(sentences(lesson.builderHint)[0]) },
        words: [{ term: lesson.apiFocus[0]?.title ?? 'Тема', meaning: parts[0] }]
    };
}

/** An extra task reads from its introduction; its API rows are the construction and the key words. */
function practiceReading(lesson: GuideTextLesson): Reading {
    const [first, ...rest] = lesson.apiFocus;
    return {
        paragraphs: [lesson.lessonIntro],
        key: { code: first?.example ?? first?.title ?? keyLine(lesson), caption: first?.summary ?? '' },
        words: rest.length ? rest.map(item => ({ term: item.title, meaning: item.summary })) : [{ term: 'Цель', meaning: lesson.expectedOutcome }]
    };
}

/** A Blockly assignment reads from its introduction; the blocks it uses are the construction and the key words. */
function blocksReading(lesson: GuideLesson): Reading {
    const ids = [...new Set(lesson.targetBlockIds)];
    const word = (id: string) => ({ term: BLOCK_LABELS[id] ?? id, meaning: BLOCK_HELP[id] ?? 'Настройте блок по условию задания.' });
    const rest = ids.slice(1, 1 + MAX_BLOCK_WORDS).map(word);
    return {
        paragraphs: [lesson.lessonIntro],
        key: { code: BLOCK_LABELS[ids[0]] ?? ids[0] ?? '', caption: BLOCK_HELP[ids[0]] ?? '' },
        words: rest.length ? rest : [{ term: 'Цель', meaning: lesson.expectedOutcome }]
    };
}

export function buildBookLesson(source: BookSource): BookLesson {
    const { lesson } = source;
    const reading = source.kind === 'course'
        ? courseReading(lesson as GuideTextLesson, source)
        : source.kind === 'practice' ? practiceReading(lesson as GuideTextLesson) : blocksReading(lesson as GuideLesson);
    const lighting = source.kind === 'course'
        ? (lesson as GuideTextLesson).chapterId === 'lights'
        : getWalkthroughTopic(lesson).startsWith('led');
    return {
        ...reading,
        chapter: source.chapter,
        kicker: `${source.label} · ${source.chapter}`,
        figure: lighting ? 'ledbar' : 'drone',
        figureCaption: lighting ? 'Лента из 29 светодиодов' : lesson.title,
        figureHint: lighting ? 'Двигайте ползунки: так выглядит команда и такого цвета будет лампочка.' : 'Схема дрона сверху. На развороте «Практика» здесь откроется сцена симулятора.',
        margin: source.experiment ? `Попробуйте: ${source.experiment}` : ''
    };
}
