import { createContextMenuDom } from './dom.js';
import { renderContextMenuContents } from './menu-builder.js';
import type { MenuCallbacks } from './types.js';

let callbacks: MenuCallbacks = {
    onTransform: () => {},
    onDelete: () => {},
    onDuplicate: () => {}
};

export function initContextMenu() {
    const prevMenu = document.getElementById('object-context-menu');
    if (prevMenu) prevMenu.remove();
    const prevStyle = document.getElementById('ctx-menu-style');
    if (prevStyle) prevStyle.remove();

    const { style, menu, header } = createContextMenuDom();
    document.head.appendChild(style);

    const renderButtons = () => {
        renderContextMenuContents(menu, header, callbacks, hide);
    };

    const hide = () => {
        menu.classList.remove('visible');
    };

    const show = (x: number, y: number) => {
        renderButtons();
        menu.style.left = `${Math.max(0, x)}px`;
        menu.style.top = `${Math.max(0, y)}px`;
        menu.classList.add('visible');
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${Math.max(0, window.innerWidth - rect.width - 6)}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${Math.max(0, window.innerHeight - rect.height - 6)}px`;
        }
    };

    menu.addEventListener('pointerdown', (e) => e.stopPropagation());
    menu.addEventListener('mousedown', (e) => e.stopPropagation());
    menu.addEventListener('click', (e) => e.stopPropagation());
    menu.addEventListener('contextmenu', (e) => e.preventDefault());

    document.body.appendChild(menu);

    window.showContextMenu = (
        x: number,
        y: number,
        onTransform: (mode: string) => void,
        onDelete: () => void,
        onDuplicate: () => void,
        onShowCoords?: () => void,
        onResetOrigin?: () => void,
        objectInfoTitle?: string,
        objectInfoItems?: { title?: string; text: string }[],
        objectActionsTitle?: string,
        objectActions?: { label: string; icon: string; action: () => void; active?: boolean; danger?: boolean }[]
    ) => {
        callbacks = {
            onTransform,
            onDelete,
            onDuplicate,
            onShowCoords,
            onResetOrigin,
            objectInfoTitle,
            objectInfoItems,
            objectActionsTitle,
            objectActions
        };
        show(x, y);
    };

    window.hideContextMenu = hide;

    document.addEventListener('pointerdown', (e: PointerEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (!menu.classList.contains('visible')) return;
        if (menu.contains(target)) return;
        hide();
    }, true);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') hide();
    });
}
