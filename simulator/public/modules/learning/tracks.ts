/**
 * Список миссий каждого трека в одном месте: контроллер обучения, кабинет ученика и кабинет учителя берут их отсюда.
 * blocks — практикум на блоках; lua, python — Академия; sdk2 и bricks — треки для Пионера Мини 2.
 */
import { ACCOUNT_TRACKS, type AccountTrack } from './account.js';
import { buildAcademyQuests, buildQuests, type Quest } from './quests.js';
import { buildSdk2Quests } from './sdk2-quests.js';
import { buildBricksQuests } from './bricks-quests.js';

/** Треки, которые идут на дроне Пионер Мини 2. */
export const MINI2_TRACKS: readonly AccountTrack[] = ['sdk2', 'bricks'];
export const isMini2Track = (track: AccountTrack): boolean => MINI2_TRACKS.includes(track);

export function buildTrackQuests(track: AccountTrack): Quest[] {
    switch (track) {
        case 'blocks': return buildQuests();
        case 'sdk2': return buildSdk2Quests();
        case 'bricks': return buildBricksQuests();
        default: return buildAcademyQuests(track);
    }
}

/** Кэш на страницу: списки строятся один раз. */
export function createQuestCache(): (track: AccountTrack) => Quest[] {
    const cache: Partial<Record<AccountTrack, Quest[]>> = {};
    return (track) => (cache[track] ??= buildTrackQuests(track));
}

export function trackTotals(questsFor: (track: AccountTrack) => Quest[]): Record<AccountTrack, number> {
    return Object.fromEntries(ACCOUNT_TRACKS.map((track) => [track, questsFor(track).length])) as Record<AccountTrack, number>;
}
