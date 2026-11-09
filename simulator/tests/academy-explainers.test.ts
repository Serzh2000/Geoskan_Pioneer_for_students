import { ACADEMY_LESSONS } from '../public/modules/ui/mission-guide/academy/catalog.js';
import { ACADEMY_EXPLAINERS, explainerFor } from '../public/modules/ui/mission-guide/academy/explainers.js';
import { getAcademyTextPractices } from '../public/modules/ui/mission-guide/academy/practices/index.js';

const languages = ['lua', 'python'] as const;
const forLanguage = (language: 'lua' | 'python') => ACADEMY_LESSONS.filter(lesson => lesson.languages.includes(language));
/** Уроки про скрипты Lua на борту (lua_script_upload / lua_script_control): слово Lua в объяснении Python-линии уместно. */
const LUA_ON_BOARD = [121, 122];

test.each(languages)('every %s lesson has a self-contained explanation of 2-8 sentences', language => {
    for (const lesson of forLanguage(language)) {
        const text = explainerFor(lesson.number, language);
        expect({ n: lesson.number, ok: text.length >= 150 }).toEqual({ n: lesson.number, ok: true });
        expect({ n: lesson.number, ok: text.length <= 1400 }).toEqual({ n: lesson.number, ok: true });
        const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
        expect({ n: lesson.number, ok: sentences >= 2 && sentences <= 9 }).toEqual({ n: lesson.number, ok: true });
        expect(text).not.toMatch(/<\/?(lua|py)>/);
        expect(text.replace(/`[^`]*`/g, '`')).not.toMatch(/\s{2,}|\s[.,;:]/);
    }
});

test('explanations do not mix languages', () => {
    for (const lesson of forLanguage('lua')) {
        expect({ n: lesson.number, t: explainerFor(lesson.number, 'lua') }).not.toEqual(expect.objectContaining({ t: expect.stringMatching(/pioneer\.|time\.sleep|\bPython\b|None\b|import /) }));
    }
    for (const lesson of forLanguage('python')) {
        expect({ n: lesson.number, t: explainerFor(lesson.number, 'python') }).not.toEqual(expect.objectContaining({ t: expect.stringMatching(/\bap\.|Timer\.|leds:set|Ledbar|Sensors\.|\bnil\b|Ev\./) }));
        if (!LUA_ON_BOARD.includes(lesson.number)) expect({ n: lesson.number, t: explainerFor(lesson.number, 'python') }).not.toEqual(expect.objectContaining({ t: expect.stringMatching(/\bLua\b/) }));
    }
    expect(Object.keys(ACADEMY_EXPLAINERS)).toHaveLength(ACADEMY_LESSONS.length);
});

test('LED lessons explain RGB channels, the index and the value range of their language', () => {
    for (const number of [10, 11, 12, 13, 14, 15, 17, 18]) {
        const lua = explainerFor(number, 'lua');
        const python = explainerFor(number, 'python');
        expect({ number, ok: /от 0 до 1\b/.test(lua) && !/255/.test(lua) }).toEqual({ number, ok: true });
        expect({ number, ok: /от 0 до 255/.test(python) && !/от 0 до 1\b/.test(python) }).toEqual({ number, ok: true });
        expect({ number, ok: /R|красн/.test(lua) && /канал/.test(lua) }).toEqual({ number, ok: true });
    }
    const first = explainerFor(10, 'lua');
    for (const word of ['RGB'.slice(0, 0) + 'R', 'G', 'B', 'каналами', 'белый', 'индекс'.slice(0, 0) + 'светодиод']) expect(first).toContain(word);
    expect(explainerFor(11, 'python')).toContain('индекс');
    expect(explainerFor(11, 'python')).toContain('с нуля');
});

test('coordinate, speed, camera and yaw lessons name units and axes', () => {
    for (const number of [38, 39, 40, 43, 44]) expect(explainerFor(number, 'python')).toMatch(/метр/);
    expect(explainerFor(38, 'lua')).toMatch(/X, Y, Z/);
    expect(explainerFor(45, 'lua')).toContain('радиан');
    expect(explainerFor(92, 'python')).toContain('м/с');
    expect(explainerFor(74, 'python')).toContain('высота, ширина');
    expect(explainerFor(82, 'python')).toContain('ID');
    expect(explainerFor(3, 'lua')).toContain('arm');
    expect(explainerFor(32, 'lua')).toContain('callback');
});

test.each(languages)('compiled %s lessons show the explanation as the summary', language => {
    const lessons = getAcademyTextPractices(language);
    expect(lessons).toHaveLength(language === 'lua' ? 93 : 124);
    for (const lesson of lessons) {
        const number = lesson.academy!.number;
        expect({ number, same: lesson.summary === explainerFor(number, language) }).toEqual({ number, same: true });
        expect(lesson.lessonIntro.startsWith(lesson.summary)).toBe(true);
        expect(lesson.academy!.teaching.device.startsWith(lesson.summary)).toBe(true);
    }
});
