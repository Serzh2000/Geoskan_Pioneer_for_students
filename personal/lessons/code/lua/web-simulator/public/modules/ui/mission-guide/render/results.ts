export function renderCheckSummary(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-check-status guide-check-status--info">
                Соберите цепочку и нажмите «Проверить и запустить».
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-check-status guide-check-status--success">
                Решение прошло проверку. Сценарий уже запущен, результат виден в живой сцене.
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-check-status guide-check-status--warning">
                Найдено замечаний: ${diagnosticsCount}. Сценарий уже запущен, но решение учебно неверное и требует исправлений.
            </div>
        `;
    }

    return `
        <div class="guide-check-status guide-check-status--warning">
            Запуск не выполнен: рабочая область пуста или из нее не собрана исполнимая цепочка. Добавьте хотя бы одну команду и попробуйте снова.
        </div>
    `;
}

export function renderResultHero(hasChecked: boolean, solved: boolean, diagnosticsCount: number, launchedWithWarnings: boolean): string {
    if (!hasChecked) {
        return `
            <div class="guide-result-hero guide-result-hero--idle">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Пока не проверено</div>
                <div class="guide-result-hero__text">Соберите цепочку и нажмите «Проверить и запустить». После этого здесь сразу будет видно, справились вы или нет.</div>
            </div>
        `;
    }

    if (solved) {
        return `
            <div class="guide-result-hero guide-result-hero--success">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Решение принято</div>
                <div class="guide-result-hero__text">Проверка пройдена, сценарий уже запущен. Смотрите живую сцену справа.</div>
            </div>
        `;
    }

    if (launchedWithWarnings) {
        return `
            <div class="guide-result-hero guide-result-hero--warning">
                <div class="guide-result-hero__label">Статус</div>
                <div class="guide-result-hero__title">Запущено с замечаниями</div>
                <div class="guide-result-hero__text">Сценарий исполнимый, поэтому живая сцена уже открыта. Но решение не совпадает с целью задания.</div>
            </div>
        `;
    }

    return `
        <div class="guide-result-hero guide-result-hero--warning">
            <div class="guide-result-hero__label">Статус</div>
            <div class="guide-result-hero__title">Нужно исправить</div>
            <div class="guide-result-hero__text">Живая сцена не запущена только потому, что в рабочей области пока нет исполнимой цепочки. Учебные замечания сами по себе запуск больше не блокируют.</div>
        </div>
    `;
}
