export type ContextMenuUiRefs = {
    style: HTMLStyleElement;
    menu: HTMLDivElement;
    header: HTMLDivElement;
};
import { CONTEXT_MENU_STYLES } from './styles.js';

export function createContextMenuDom(): ContextMenuUiRefs {
    const style = document.createElement('style');
    style.id = 'ctx-menu-style';
    style.textContent = CONTEXT_MENU_STYLES;

    const menu = document.createElement('div');
    menu.id = 'object-context-menu';
    menu.setAttribute('role', 'menu');

    const header = document.createElement('div');
    header.className = 'ctx-header';
    header.textContent = 'Действия над объектом';
    menu.appendChild(header);

    return {
        style,
        menu,
        header
    };
}
