/**
 * DOM-fallback для случаев, когда WebGL-превью недоступно в браузере.
 * Содержит только рендер запасного сообщения.
 */
export const PREVIEW_FALLBACK_MESSAGE =
    '3D-превью недоступно в текущей сессии браузера. Закройте другие вкладки с WebGL или перезагрузите страницу.';

export function renderPreviewFallback(host: HTMLDivElement, message: string) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-type-modal__preview-fallback';

    const title = document.createElement('strong');
    title.textContent = '3D-превью недоступно';

    const text = document.createElement('span');
    text.textContent = message;

    fallback.append(title, text);
    host.replaceChildren(fallback);
}
