import { log } from '../../shared/logging/logger.js';

export function initInfoModal() {
    let overlay = document.getElementById('app-info-overlay') as HTMLDivElement | null;
    const infoButton = document.getElementById('header-info-btn') as HTMLButtonElement | null;

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'app-info-overlay';
        overlay.className = 'modal-overlay info-modal-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="modal-content info-modal" role="dialog" aria-modal="true" aria-labelledby="app-info-title">
                <div class="info-modal__header">
                    <div class="info-modal__title-wrap">
                        <div class="info-modal__eyebrow">О проекте</div>
                        <div id="app-info-title" class="info-modal__title">Geoscan Simulator</div>
                        <div class="info-modal__subtitle">Краткая справка о среде и авторе проекта</div>
                    </div>
                    <button type="button" id="app-info-close" class="modal-close-btn info-modal__close" aria-label="Закрыть">&times;</button>
                </div>
                <div class="info-modal__body">
                    <p class="info-modal__lead">
                        Это веб-симулятор для обучения и практики с экосистемой Geoscan Pioneer:
                        здесь можно писать сценарии на Lua и Python, запускать их в сцене,
                        работать с Blockly, управлять дроном и разбирать логи симуляции.
                    </p>
                    <div class="info-modal__facts">
                        <div class="info-modal__fact">
                            <span class="info-modal__fact-label">Что это</span>
                            <div class="info-modal__fact-value">
                                Учебная инженерная среда для отработки полетных сценариев, логики миссий и взаимодействия с объектами сцены.
                            </div>
                        </div>
                        <div class="info-modal__fact">
                            <span class="info-modal__fact-label">Для кого</span>
                            <div class="info-modal__fact-value">
                                Для учеников, преподавателей и разработчиков, которым нужна быстрая безопасная практика без реального запуска дрона.
                            </div>
                        </div>
                        <div class="info-modal__fact">
                            <span class="info-modal__fact-label">Кем сделан</span>
                            <div class="info-modal__fact-value">
                                Сергей Андреевич Корягин, аспирант СПбГЭТУ «ЛЭТИ» и педагог дополнительного образования.
                            </div>
                        </div>
                        <div class="info-modal__fact">
                            <span class="info-modal__fact-label">Профиль автора</span>
                            <div class="info-modal__fact-value">
                                Практико-ориентированные курсы и практикумы по встраиваемым системам, беспилотным технологиям и программированию.
                            </div>
                        </div>
                        <div class="info-modal__fact">
                            <span class="info-modal__fact-label">Компетенции</span>
                            <div class="info-modal__fact-value">
                                БПЛА, автономные миссии, микроконтроллеры, ПЛИС, электроника, C/C++, Python, Lua, анализ телеметрии и методические материалы.
                            </div>
                        </div>
                    </div>
                    <div class="info-modal__footnote">
                        Информация в этом окне собрана по материалам сайта автора и помогает быстро понять, что это за симулятор и кто его подготовил.
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const syncButtonState = (isOpen: boolean) => {
        infoButton?.setAttribute('aria-pressed', String(isOpen));
        infoButton?.classList.toggle('is-active', isOpen);
    };

    const hide = () => {
        if (!overlay) return;
        overlay.style.display = 'none';
        syncButtonState(false);
    };

    const show = () => {
        if (!overlay) return;
        overlay.style.display = 'flex';
        syncButtonState(true);
        log('[SYSTEM] Открыто окно информации о симуляторе', 'info');
    };

    infoButton?.addEventListener('click', () => {
        if (overlay?.style.display === 'flex') {
            hide();
            return;
        }
        show();
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) hide();
    });

    overlay.querySelector('#app-info-close')?.addEventListener('click', hide);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay?.style.display !== 'none') {
            hide();
        }
    });
}
