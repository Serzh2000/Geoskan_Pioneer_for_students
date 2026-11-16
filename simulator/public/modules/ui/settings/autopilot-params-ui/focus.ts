/** Поле, в котором печатали, до перерисовки окна: чтобы вернуть в него фокус и курсор. */
export type FocusSnapshot = { id: string; start: number | null; end: number | null } | null;

export function captureFocus(body: HTMLElement): FocusSnapshot {
    const active = document.activeElement as HTMLInputElement | null;
    return active && active.id && body.contains(active) ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
}

/** Окно перерисовывается целиком, поэтому поле (поиск, автор) возвращается в фокус с тем же курсором. true, если вернули. */
export function restoreFocus(body: HTMLElement, snapshot: FocusSnapshot): boolean {
    if (!snapshot) return false;
    const field = body.querySelector(`#${snapshot.id}`) as HTMLInputElement | null;
    if (!field) return false;
    field.focus({ preventScroll: true });
    try {
        if (snapshot.start !== null) field.setSelectionRange(snapshot.start, snapshot.end ?? snapshot.start);
    } catch {
        // Не у всех типов полей есть выделение: фокус вернулся, этого достаточно.
    }
    return true;
}
