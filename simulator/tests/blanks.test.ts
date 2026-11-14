/** Пропуски ___ в заготовках: ловятся до запуска, в решениях их нет, комментарии не мешают. */
import { countUnfilledBlanks, unfilledBlanksMessage } from '../public/modules/learning/blanks.js';
import { buildTrackQuests } from '../public/modules/learning/tracks.js';

describe('пропуски в коде', () => {
    test('считаются отдельные ___, а не части имён и не комментарии', () => {
        expect(countUnfilledBlanks('leds:set(0, ___)')).toBe(1);
        expect(countUnfilledBlanks('pioneer.led_control(0, ___, ___, ___)')).toBe(3);
        expect(countUnfilledBlanks('x = ___')).toBe(1);
        expect(countUnfilledBlanks('local a___b = 1\n__init__ = 2\n_x___ = 3')).toBe(0);
        expect(countUnfilledBlanks('-- вместо ___ впишите число\nleds:set(0, 1, 0, 0)')).toBe(0);
        expect(countUnfilledBlanks('# вместо ___ впишите число\nprint(1)')).toBe(0);
        expect(countUnfilledBlanks('print(1) # потом ___\nprint(2)')).toBe(0);
        expect(countUnfilledBlanks('')).toBe(0);
    });

    test('сообщение называет число пропусков и говорит, что делать', () => {
        expect(unfilledBlanksMessage(1).title).toContain('пропуск ___');
        expect(unfilledBlanksMessage(3).title).toContain('(3)');
        expect(unfilledBlanksMessage(2).lines.join(' ')).toMatch(/Проверить полёт/);
    });

    test.each(['lua', 'python'] as const)('уроки %s: в решении пропусков нет, а в заготовках они есть там, где ученик их заполняет', (track) => {
        const quests = buildTrackQuests(track);
        let withBlanks = 0;
        for (const quest of quests) {
            const lesson = quest.lesson;
            if (!lesson) continue;
            expect({ id: quest.id, blanks: countUnfilledBlanks(lesson.solutionCode) }).toEqual({ id: quest.id, blanks: 0 });
            if (countUnfilledBlanks(lesson.starterCode) > 0) withBlanks++;
        }
        // Первые разделы построены на заготовках с ___: если их стало ноль, проверка пропусков ничего не ловит.
        expect(withBlanks).toBeGreaterThan(5);
    });
});
