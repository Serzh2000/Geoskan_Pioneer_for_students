const ACTIVE_PANEL_STORAGE_KEY = 'geoskan_sidebar_active_panel_v1';

/*
 * Единственная точка входа на чистом первом экране. Ключ активной панели
 * пуст ровно до тех пор, пока пользователь не открыл ни одной панели, —
 * отдельного флага «первый запуск» не нужно.
 */
export function initSceneOnboarding(): void {
    const card = document.getElementById('scene-onboarding');
    const panelsHost = document.querySelector('.sidebar-panels');
    if (!card || !panelsHost) return;
    if (localStorage.getItem(ACTIVE_PANEL_STORAGE_KEY) !== null) return;

    card.hidden = false;

    // Открыть панель можно с рельса, переключателем в шапке или самой
    // карточкой, поэтому смотрим на результат, а не на конкретную кнопку.
    const observer = new MutationObserver(() => {
        if (!document.querySelector('.sidebar-panel.active')) return;
        card.hidden = true;
        observer.disconnect();
    });

    observer.observe(panelsHost, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}
