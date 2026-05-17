export type ContextMenuUiRefs = {
    style: HTMLStyleElement;
    menu: HTMLDivElement;
    header: HTMLDivElement;
    toolbar: HTMLDivElement;
    toolbarTitle: HTMLDivElement;
    toolbarActions: HTMLDivElement;
};
import { CONTEXT_MENU_STYLES } from './styles.js';

export function createContextMenuDom(): ContextMenuUiRefs {
    const style = document.createElement('style');
    style.id = 'ctx-menu-style';
    style.textContent = CONTEXT_MENU_STYLES;

    const menu = document.createElement('div');
    menu.id = 'object-context-menu';
    menu.setAttribute('role', 'menu');

    const toolbar = document.createElement('div');
    toolbar.id = 'transform-toolbar';
    toolbar.setAttribute('role', 'toolbar');

    const toolbarTop = document.createElement('div');
    toolbarTop.className = 'transform-toolbar-top';

    const toolbarTitle = document.createElement('div');
    toolbarTitle.className = 'transform-toolbar-title';

    const toolbarHint = document.createElement('div');
    toolbarHint.className = 'transform-toolbar-hint';
    toolbarHint.textContent = 'Esc: снять выделение';

    toolbarTop.appendChild(toolbarTitle);
    toolbarTop.appendChild(toolbarHint);

    const toolbarActions = document.createElement('div');
    toolbarActions.className = 'transform-toolbar-actions';

    toolbar.appendChild(toolbarTop);
    toolbar.appendChild(toolbarActions);

    const header = document.createElement('div');
    header.className = 'ctx-header';
    header.textContent = 'Действия над объектом';
    menu.appendChild(header);

    return {
        style,
        menu,
        header,
        toolbar,
        toolbarTitle,
        toolbarActions
    };
}
