const STORAGE_KEY = 'pioneer:mission-guide:book:v1';

let enabled: boolean | null = null;

/** The book is the default view; the choice is kept between visits. */
export function isBookView(): boolean {
    if (enabled === null) {
        try { enabled = window.localStorage.getItem(STORAGE_KEY) !== '0'; }
        catch { enabled = true; }
    }
    return enabled;
}

export function setBookView(on: boolean): void {
    enabled = on;
    try { window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); }
    catch { /* Storage can be unavailable in embedded/private contexts. */ }
}

