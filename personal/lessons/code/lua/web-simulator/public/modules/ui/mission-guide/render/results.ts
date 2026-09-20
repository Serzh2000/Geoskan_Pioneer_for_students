export function renderCheckVerdict(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-result-hero guide-result-hero--idle">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Пока не проверено</div>
                <div class="guide-result-hero__text">Соберите цепочку и запустите проверку. Сцена откроется автоматически.</div>
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-result-hero guide-result-hero--success">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Решение принято</div>
                <div class="guide-result-hero__text">Решение принято. Сценарий уже запущен.</div>
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
