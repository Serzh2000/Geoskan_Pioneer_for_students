export function renderCheckSummary(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-check-status guide-check-status--info">
                Соберите цепочку и запустите проверку. Сцена откроется автоматически.
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-check-status guide-check-status--success">
                Решение принято. Сценарий уже запущен.
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-check-status guide-check-status--warning">
                Замечаний: ${diagnosticsCount}. Сцена уже показывает текущую версию.
            </div>
        `;
    }

    return `
        <div class="guide-check-status guide-check-status--warning">
            Проверка завершена: есть замечания.
        </div>
    `;
}

export function renderResultHero(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-result-hero guide-result-hero--idle">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Пока не проверено</div>
                <div class="guide-result-hero__text">Проверка покажет вердикт и сразу откроет сцену.</div>
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-result-hero guide-result-hero--success">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Решение принято</div>
                <div class="guide-result-hero__text">Урок засчитан. Сравните сцену с ожидаемым результатом.</div>
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-result-hero guide-result-hero--warning">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Есть замечания</div>
                <div class="guide-result-hero__text">Сценарий уже запущен, но решение пока не совпадает с целью задания.</div>
            </div>
        `;
    }

    return `
        <div class="guide-result-hero guide-result-hero--warning">
            <div class="guide-result-hero__label">Статус</div>
            <div class="guide-result-hero__title">Нужно исправить</div>
            <div class="guide-result-hero__text">Проверка показала проблемы в логике. Исправьте замечания ниже.</div>
        </div>
    `;
}
