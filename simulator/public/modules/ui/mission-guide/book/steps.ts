/** The three parts of every lesson in the book, in reading order. */
export type BookStep = 'theory' | 'demo' | 'practice';

export const BOOK_STEPS: readonly BookStep[] = ['theory', 'demo', 'practice'];
export const STEP_LABELS: Record<BookStep, string> = { theory: 'Теория', demo: 'Демонстрация', practice: 'Практика' };

const STORAGE_KEY = 'pioneer:mission-guide:book-step:v1';
const steps = new Map<string, BookStep>();
let loaded = false;

function load(): void {
    if (loaded) return;
    loaded = true;
    try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
        for (const [key, value] of Object.entries(saved)) if (BOOK_STEPS.includes(value as BookStep)) steps.set(key, value as BookStep);
    } catch { /* Storage can be unavailable in embedded/private contexts. */ }
}

/** The part a lesson was left on; a lesson never opened starts with its theory. */
export function getBookStep(key: string): BookStep {
    load();
    return steps.get(key) ?? 'theory';
}

export function setBookStep(key: string, step: BookStep): void {
    load();
    steps.set(key, step);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(steps))); }
    catch { /* Keep working in memory when storage is unavailable. */ }
}

/** The part a page turn leads to, or null at the ends of a lesson. */
export function neighbourStep(step: BookStep, direction: 1 | -1): BookStep | null {
    return BOOK_STEPS[BOOK_STEPS.indexOf(step) + direction] ?? null;
}

/** The `data-walkthrough-step` the guide's panel reads: it opens the scene for the parts that show one. */
export function panelStep(step: BookStep): string {
    return step === 'theory' ? 'device' : 'build';
}
