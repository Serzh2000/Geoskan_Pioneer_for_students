import type { GuideEvaluation } from '../types.js';

export const WALKTHROUGH_STEPS = ['device', 'predict', 'build', 'check', 'reflect'] as const;
/** Positions the gates depend on. */
const PREDICT = 1, BUILD = 2, CHECK = 3, REFLECT = 4;
export type WalkthroughStep = typeof WALKTHROUGH_STEPS[number];
export type WalkthroughProgress = { step: WalkthroughStep; furthest: number; answer: number | null };
const STORAGE_KEY = 'pioneer-guide-walkthrough-v2';
const progress = new Map<string, WalkthroughProgress>();
const results = new Map<string, { source: string; evaluation: GuideEvaluation }>();
let loaded = false;
let generation = 0;
let running: { key: string; token: number } | null = null;
let sessionKey: string | null = null;

export function parseWalkthroughProgress(raw: unknown): WalkthroughProgress {
    const fresh: WalkthroughProgress = { step: 'device', furthest: 0, answer: null };
    if (!raw || typeof raw !== 'object') return fresh;
    const value = raw as Partial<WalkthroughProgress>;
    const furthest = Number.isInteger(value.furthest) ? Math.max(0, Math.min(CHECK, value.furthest!)) : 0;
    const index = WALKTHROUGH_STEPS.indexOf(value.step as WalkthroughStep);
    return {
        step: WALKTHROUGH_STEPS[Math.max(0, Math.min(index, furthest))],
        furthest,
        answer: Number.isInteger(value.answer) && value.answer! >= 0 && value.answer! < 3 ? value.answer! : null
    };
}

function load(): void {
    if (loaded) return;
    loaded = true;
    try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            for (const [key, value] of Object.entries(saved)) progress.set(key, parseWalkthroughProgress(value));
        }
    } catch { /* Storage can be unavailable in embedded/private contexts. */ }
}

function save(): void {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(progress))); }
    catch { /* Keep working in memory when storage is unavailable. */ }
}

export function walkthroughKey(language: string, lessonId: string): string { return `${language}:${lessonId}`; }

export function getWalkthroughProgress(key: string, correctAnswer: number): WalkthroughProgress {
    load();
    const state = progress.get(key) || { step: 'device', furthest: 0, answer: null };
    // Revalidate saved gates against authored content, not a saved "passed" boolean.
    if (state.answer !== correctAnswer && state.furthest > PREDICT) {
        state.furthest = PREDICT;
        if (WALKTHROUGH_STEPS.indexOf(state.step) > PREDICT) state.step = 'predict';
    }
    if (state.step === 'reflect' && !results.has(key)) state.step = 'check';
    progress.set(key, state);
    return { ...state };
}

export function answerWalkthrough(key: string, answer: number, correctAnswer: number): void {
    if (!Number.isInteger(answer) || answer < 0 || answer > 2) return;
    const state = getWalkthroughProgress(key, correctAnswer);
    state.answer = answer;
    if (answer !== correctAnswer) {
        state.furthest = PREDICT;
        if (WALKTHROUGH_STEPS.indexOf(state.step) > PREDICT) state.step = 'predict';
        results.delete(key);
    }
    progress.set(key, state);
    save();
}

export function moveWalkthrough(key: string, target: WalkthroughStep, correctAnswer: number, source: string): boolean {
    const state = getWalkthroughProgress(key, correctAnswer);
    if (running?.key === key) return false;
    const current = WALKTHROUGH_STEPS.indexOf(state.step);
    const next = WALKTHROUGH_STEPS.indexOf(target);
    if (next < 0 || next > Math.max(state.furthest, current + 1)) return false;
    if (next >= BUILD && state.answer !== correctAnswer) return false;
    if (next === REFLECT && !getWalkthroughResult(key, source)?.solved) return false;
    // The result is entered by an actual run, or revisited after one.
    if (next === CHECK && state.furthest < CHECK) return false;
    state.step = target;
    state.furthest = Math.max(state.furthest, next);
    progress.set(key, state);
    save();
    return true;
}

export function getWalkthroughResult(key: string, source: string): GuideEvaluation | null {
    const result = results.get(key);
    return result?.source === source ? result.evaluation : null;
}

export function syncWalkthroughSession(key: string): void {
    if (sessionKey !== key) { running = null; generation++; sessionKey = key; }
}

export function beginWalkthroughCheck(key: string, correctAnswer: number): number {
    const token = ++generation;
    running = { key, token };
    results.delete(key);
    const state = getWalkthroughProgress(key, correctAnswer);
    progress.set(key, { ...state, step: 'check', furthest: Math.max(CHECK, state.furthest) });
    save();
    return token;
}

export function isWalkthroughCheckCurrent(key: string, token: number): boolean {
    return running?.key === key && running.token === token && token === generation;
}

export function finishWalkthroughCheck(key: string, token: number, source: string, evaluation: GuideEvaluation): boolean {
    if (!isWalkthroughCheckCurrent(key, token)) return false;
    results.set(key, { source, evaluation });
    running = null;
    return true;
}

export function isWalkthroughBusy(key: string): boolean { return running?.key === key; }

export function resetWalkthroughResult(key: string): void {
    if (running?.key === key) { generation++; running = null; }
    results.delete(key);
}

export function canCompleteWalkthrough(key: string, correctAnswer: number, source: string): boolean {
    const state = getWalkthroughProgress(key, correctAnswer);
    return state.step === 'reflect' && state.answer === correctAnswer && Boolean(getWalkthroughResult(key, source)?.solved);
}
