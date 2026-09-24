export function renderScenePlaceholder(): string {
    return `<div class="guide-scene-preview__placeholder">
        <span class="guide-scene-preview__icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m24 5 17 10v18L24 43 7 33V15Z M7 15l17 10 17-10 M24 25v18"/><path d="m19 18 11 6-11 6Z" fill="currentColor" stroke="none"/></svg></span>
        <strong>Здесь появится ваш результат</strong>
        <p>Выполните задание и нажмите «Проверить и запустить» на шаге практики.</p>
        <span class="guide-scene-preview__hint">Сцена откроется автоматически</span>
    </div>`;
}

export function renderCheckVerdict(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-result-hero guide-result-hero--idle">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Пока не проверено</div>
                <div class="guide-result-hero__text">Выполните задание на шаге практики и запустите проверку. Сцена откроется автоматически.</div>
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-result-hero guide-result-hero--success">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Решение принято</div>
                <div class="guide-result-hero__text">Автопроверка пройдена. Сравните поведение сцены с ожидаемым результатом.</div>
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-result-hero guide-result-hero--warning">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Есть замечания</div>
                <div class="guide-result-hero__text">Сцена уже показывает текущую версию, но решение пока не совпадает с целью задания. Замечаний: ${diagnosticsCount}.</div>
            </div>
        `;
    }

    return `
        <div class="guide-result-hero guide-result-hero--warning">
            <div class="guide-result-hero__label">Статус</div>
            <div class="guide-result-hero__title">Нужно исправить</div>
            <div class="guide-result-hero__text">Проверка показала проблемы в логике. Исправьте замечания ниже. Замечаний: ${diagnosticsCount}.</div>
        </div>
    `;
}
