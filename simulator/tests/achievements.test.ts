/** Достижения: правила начисления и рисунки медалей. */
import type { CabinetData } from '../public/modules/learning/account.js';
import { RANKS, rankFor, renderMedal, renderRankBadge } from '../public/modules/learning/achievement-art.js';
import { completedChapters, computeAchievements } from '../public/modules/learning/cabinet-kit.js';
import { buildAcademyQuests, questGroups } from '../public/modules/learning/quests.js';
import { buildTrackQuests } from '../public/modules/learning/tracks.js';

const totals = { blocks: 16, lua: 93, python: 124, sdk2: 37, bricks: 16 };
const cabinet = (patch: Partial<CabinetData> = {}, done: Record<string, number> = {}): CabinetData => {
    const progress: CabinetData['progress'] = { blocks: {}, lua: {}, python: {}, sdk2: {}, bricks: {} };
    for (const [track, count] of Object.entries(done)) for (let i = 1; i <= count; i += 1) (progress as any)[track][`academy-${String(i).padStart(3, '0')}`] = { at: 1, by: 'student' };
    return {
        user: { id: 'u', role: 'student', fullName: 'Иванов Иван', login: 'ivanov' }, classGroup: null, progress,
        activity: { days: {}, today: '2026-11-08', current: 0, best: 0 },
        stats: { attempts: 0, solvedChecks: 0, firstTrySolved: 0, lastAttemptAt: null }, recent: [], ...patch
    } as CabinetData;
};
const earnedIds = (data: CabinetData, chapters = 0) => computeAchievements(data, totals, chapters).filter((item) => item.earned).map((item) => item.id);

describe('правила достижений', () => {
    test('у нового ученика наград нет, и у каждой есть рисунок', () => {
        const list = computeAchievements(cabinet(), totals);
        expect(list.filter((item) => item.earned)).toEqual([]);
        expect(list.length).toBeGreaterThanOrEqual(15);
        for (const item of list) expect({ id: item.id, tier: item.tier, glyph: item.glyph, fraction: item.fraction }).toEqual({ id: item.id, tier: expect.stringMatching(/bronze|silver|gold|brand/), glyph: expect.any(String), fraction: 0 });
        expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
    });
    test('первая миссия, десять и сто миссий', () => {
        expect(earnedIds(cabinet({}, { python: 1 }))).toEqual(['first']);
        expect(earnedIds(cabinet({}, { python: 10 }))).toEqual(expect.arrayContaining(['first', 'ten']));
        expect(earnedIds(cabinet({}, { python: 100 }))).toEqual(expect.arrayContaining(['fifty', 'hundred']));
    });
    test('серии дней, меткость, главы, полиглот и рабочий день', () => {
        const data = cabinet({ activity: { days: { '2026-11-07': 12 }, today: '2026-11-08', current: 3, best: 7 }, stats: { attempts: 9, solvedChecks: 9, firstTrySolved: 5, lastAttemptAt: 1 } }, { blocks: 1, lua: 1, python: 1 });
        const ids = earnedIds(data, 1);
        expect(ids).toEqual(expect.arrayContaining(['streak3', 'streak7', 'clean', 'chapter-1', 'polyglot', 'busy']));
        expect(ids).not.toContain('streak14');
    });
    test('награда за язык только когда пройден весь язык', () => {
        expect(earnedIds(cabinet({}, { lua: 92 }))).not.toContain('track-lua');
        expect(earnedIds(cabinet({}, { lua: 93 }))).toContain('track-lua');
    });
    test('треки Мини 2: награда за трек и полиглот считают их наравне с остальными', () => {
        expect(earnedIds(cabinet({}, { sdk2: 36 }))).not.toContain('track-sdk2');
        expect(earnedIds(cabinet({}, { sdk2: 37 }))).toContain('track-sdk2');
        expect(earnedIds(cabinet({}, { bricks: 16 }))).toContain('track-bricks');
        expect(earnedIds(cabinet({}, { sdk2: 1, bricks: 1, python: 1 }))).toContain('polyglot');
    });
    test('закрытые главы считаются по настоящему списку миссий', () => {
        const first = questGroups(buildAcademyQuests('python'))[0];
        const data = cabinet();
        for (const quest of first.quests) data.progress.python[quest.id] = { at: 1, by: 'student' };
        const questsFor = buildTrackQuests;
        expect(completedChapters(data, questsFor)).toBe(1);
        expect(completedChapters(cabinet(), questsFor)).toBe(0);
    });
});

describe('рисунки медалей', () => {
    test('у каждой медали свои идентификаторы градиентов (иначе медали на странице красят друг друга)', () => {
        const ids = [...(renderMedal({ tier: 'gold', glyph: 'flame', earned: true, label: 'a' }) + renderMedal({ tier: 'gold', glyph: 'flame', earned: true, label: 'b' })).matchAll(/id="(m\d+[fg])"/g)].map((match) => match[1]);
        expect(new Set(ids).size).toBe(ids.length);
    });
    test('полученная и закрытая медали отличаются, у закрытой есть кольцо прогресса', () => {
        const got = renderMedal({ tier: 'silver', glyph: 'target', earned: true, label: 'x' });
        const locked = renderMedal({ tier: 'silver', glyph: 'target', earned: false, fraction: .4, label: 'x' });
        expect(got).toContain('is-earned');
        expect(locked).toContain('is-locked');
        expect(locked).toContain('stroke-dasharray');
    });
    test('название в aria-label экранируется', () => {
        expect(renderMedal({ tier: 'bronze', glyph: 'drone', earned: true, label: 'a"b' })).toContain('aria-label="a&quot;b"');
    });
    test('все значки рисуются', () => {
        for (const glyph of ['drone', 'num10', 'num25', 'num50', 'num100', 'flame', 'target', 'book', 'globe', 'bolt', 'blocks', 'moon', 'code'] as const) {
            expect({ glyph, svg: renderMedal({ tier: 'gold', glyph, earned: true, label: glyph }).length > 800 }).toEqual({ glyph, svg: true });
        }
    });
});

describe('звания', () => {
    test('звание растёт с числом миссий', () => {
        expect(rankFor(0)).toMatchObject({ index: 0, title: 'Новичок' });
        expect(rankFor(5).title).toBe('Курсант');
        expect(rankFor(59).title).toBe('Пилот');
        expect(rankFor(60).title).toBe('Штурман');
        expect(rankFor(500)).toMatchObject({ index: RANKS.length - 1, next: null });
        expect(rankFor(4).next).toEqual({ title: 'Курсант', need: 1 });
    });
    test('эмблема звания рисуется для всех ступеней', () => {
        for (let index = 0; index < RANKS.length; index += 1) expect(renderRankBadge(index)).toContain('<svg');
    });
});
