/** Оболочка окна «Параметры автопилота»: шапка (назад, заголовок, подсказка, закрыть) и пустое тело, в которое рисуются экраны. */
export function renderParamsShell() {
    return `
        <div class="modal-content autopilot-params-modal" role="dialog" aria-modal="true" aria-labelledby="autopilot-params-title">
            <div class="autopilot-params-modal__header">
                <div class="autopilot-params-modal__title-wrap">
                    <button type="button" id="autopilot-params-back" class="autopilot-params-modal__back" hidden></button>
                    <h2 id="autopilot-params-title" class="autopilot-params-modal__title">Параметры автопилота Pioneer</h2>
                    <div id="autopilot-params-subtitle" class="autopilot-params-modal__subtitle"></div>
                </div>
                <button type="button" id="autopilot-params-close" class="modal-close-btn autopilot-params-modal__close" aria-label="Закрыть">&times;</button>
            </div>
            <div id="autopilot-params-body" class="autopilot-params-modal__body"></div>
        </div>`;
}
