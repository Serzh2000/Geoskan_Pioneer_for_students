export function renderCheckSummary(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-check-status guide-check-status--info">
                Сначала соберите решение, затем отдельно запустите проверку. Симуляцию можно запускать независимо, когда цепочка уже собрана.
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-check-status guide-check-status--success">
                Решение прошло проверку. Урок засчитан, а сценарий можно безопасно запускать и сравнивать с ожидаемым результатом.
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-check-status guide-check-status--warning">
                Найдено замечаний: ${diagnosticsCount}. Сценарий можно запускать для эксперимента, но урок пока не засчитан.
            </div>
        `;
    }

    return `
        <div class="guide-check-status guide-check-status--warning">
            Проверка завершена: в решении еще есть замечания. Исправьте их или запустите сценарий отдельно, чтобы посмотреть текущее поведение.
        </div>
    `;
}

export function renderResultHero(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-result-hero guide-result-hero--idle">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Пока не проверено</div>
                <div class="guide-result-hero__text">Сначала соберите сценарий. Потом запустите проверку, чтобы понять, засчитывается ли урок, и при желании отдельно откройте живую сцену.</div>
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-result-hero guide-result-hero--success">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Решение принято</div>
                <div class="guide-result-hero__text">Проверка пройдена. Урок засчитан, и теперь можно спокойно смотреть сцену, сравнивать результат и переходить дальше.</div>
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-result-hero guide-result-hero--warning">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Есть замечания</div>
                <div class="guide-result-hero__text">Сценарий исполнимый и его можно смотреть в сцене, но решение пока не совпадает с целью задания.</div>
            </div>
        `;
    }

    return `
        <div class="guide-result-hero guide-result-hero--warning">
            <div class="guide-result-hero__label">Статус</div>
            <div class="guide-result-hero__title">Нужно исправить</div>
            <div class="guide-result-hero__text">Проверка показала проблемы в логике решения. Исправьте замечания или запустите текущую версию отдельно, чтобы увидеть поведение в симуляции.</div>
        </div>
    `;
}
