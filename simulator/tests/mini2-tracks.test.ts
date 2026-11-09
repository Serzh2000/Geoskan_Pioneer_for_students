/** Реестр треков обучения: клиент и сервер знают одни и те же способы обучения, миссии каждого трека найдены и не пересекаются. */
import { ACCOUNT_TRACKS, TRACK_NAMES } from '../public/modules/learning/account.js';
import { TRACKS } from '../server/accounts.js';
import { buildTrackQuests, createQuestCache, isMini2Track, trackTotals } from '../public/modules/learning/tracks.js';
import { completeQuest, emptyProgress, questStatus } from '../public/modules/learning/quests.js';
import { SDK2_MISSIONS } from '../public/modules/ui/mission-guide/mini2/sdk2-missions.js';
import { isSdk2Mission } from '../public/modules/ui/mission-guide/mini2/sdk2-missions.js';
import { BRICKS_MISSIONS, isBricksMission } from '../public/modules/ui/mission-guide/mini2/bricks-missions.js';

describe('реестр треков', () => {
    test('клиент и сервер перечисляют одни и те же треки, у каждого есть название', () => {
        expect([...ACCOUNT_TRACKS]).toEqual([...TRACKS]);
        expect(ACCOUNT_TRACKS).toEqual(expect.arrayContaining(['blocks', 'lua', 'python', 'sdk2', 'bricks']));
        ACCOUNT_TRACKS.forEach((track) => expect(TRACK_NAMES[track]).toBeTruthy());
        expect(TRACK_NAMES.sdk2).toBe('Мини 2 · SDK2');
        expect(TRACK_NAMES.bricks).toBe('Мини 2 · Bricks');
    });

    test('миссии каждого трека построены, у существующих треков они прежние', () => {
        const totals = trackTotals(createQuestCache());
        ACCOUNT_TRACKS.forEach((track) => expect(totals[track]).toBeGreaterThan(0));
        expect(totals.sdk2).toBe(SDK2_MISSIONS.length);
        expect(totals.bricks).toBe(BRICKS_MISSIONS.length);
        expect(buildTrackQuests('blocks')[0].source).toBe('blocks');
        expect(buildTrackQuests('lua')[0].source).toBe('academy');
        expect(buildTrackQuests('python')[0].source).toBe('academy');
    });

    test('идентификаторы миссий не пересекаются между треками, а для проверки находятся по id', () => {
        const seen = new Map<string, string>();
        for (const track of ACCOUNT_TRACKS) {
            for (const quest of buildTrackQuests(track)) {
                // Миссии Lua и Python в Академии делят id (academy-NNN) — это разные треки; новые треки с ними не пересекаются.
                if (track === 'sdk2' || track === 'bricks') expect({ id: quest.id, other: seen.get(quest.id) }).toEqual({ id: quest.id, other: undefined });
                seen.set(quest.id, track);
            }
        }
        expect(buildTrackQuests('sdk2').every((quest) => isSdk2Mission(quest.id) && !isBricksMission(quest.id))).toBe(true);
        expect(buildTrackQuests('bricks').every((quest) => isBricksMission(quest.id) && !isSdk2Mission(quest.id))).toBe(true);
    });

    test('только sdk2 и bricks идут на Мини 2', () => {
        expect(ACCOUNT_TRACKS.filter(isMini2Track)).toEqual(['sdk2', 'bricks']);
    });

    test('миссии новых треков открываются по цепочке и сохраняются в прогрессе как у других треков', () => {
        for (const track of ['sdk2', 'bricks'] as const) {
            const quests = buildTrackQuests(track);
            let progress = emptyProgress();
            expect(questStatus(quests, progress, quests[1].id)).toBe('locked');
            progress = completeQuest(quests, progress, quests[0].id);
            expect(questStatus(quests, progress, quests[1].id)).toBe('available');
        }
    });
});

describe('журнал запуска для длинных миссий Мини 2', () => {
    test('по умолчанию 512 событий, а запуск миссии Мини 2 хранит больше', async () => {
        const { beginLearningCapture, finishLearningCapture, recordLearningEvent } = await import('../public/modules/core/learning-journal.js');
        const run = (limit?: number) => {
            const token = beginLearningCapture('mini2-journal', limit);
            recordLearningEvent('mini2-journal', { kind: 'arm', time: 0, accepted: true });
            for (let i = 0; i < 1000; i += 1) recordLearningEvent('mini2-journal', { kind: 'print', time: i, text: String(i) });
            return finishLearningCapture('mini2-journal', token);
        };
        expect(run()).toHaveLength(512);
        const long = run(4096);
        expect(long).toHaveLength(1001);
        expect(long[0].kind).toBe('arm');
    });
});
