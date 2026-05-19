export type ContextMenuUiRefs = {
    style: HTMLStyleElement;
    menu: HTMLDivElement;
    header: HTMLDivElement;
};

const CONTEXT_MENU_STYLES = `
    #object-context-menu {
        position: fixed;
        min-width: 170px;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 6px;
        display: none;
        flex-direction: column;
        gap: 4px;
        z-index: 2000;
        box-shadow: 0 12px 28px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
    }
    #object-context-menu.visible {
        display: flex;
    }
    #object-context-menu .ctx-header {
        font-size: 11px;
        color: #94a3b8;
        padding: 6px 10px;
        border-bottom: 1px solid #334155;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    #object-context-menu .ctx-section-label {
        font-size: 11px;
        color: #94a3b8;
        padding: 8px 10px 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    #object-context-menu .ctx-info-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 2px 4px 4px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(30, 41, 59, 0.72);
        border: 1px solid rgba(71, 85, 105, 0.6);
    }
    #object-context-menu .ctx-info-title {
        font-size: 12px;
        font-weight: 600;
        color: #e2e8f0;
    }
    #object-context-menu .ctx-info-text {
        font-size: 12px;
        line-height: 1.45;
        color: #cbd5e1;
        white-space: pre-line;
    }
    #object-context-menu .ctx-separator {
        height: 1px;
        margin: 4px 2px;
        background: rgba(51, 65, 85, 0.9);
    }
    #object-context-menu .ctx-btn {
        background: transparent;
        border: none;
        color: #e2e8f0;
        text-align: left;
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    #object-context-menu .ctx-btn:hover,
    #object-context-menu .ctx-btn:focus {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        outline: none;
    }
    #object-context-menu .ctx-btn.active {
        background: rgba(56, 189, 248, 0.16);
        color: #38bdf8;
        box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.18);
    }
    #object-context-menu .ctx-btn.danger {
        color: #f87171;
    }
    #object-context-menu .ctx-btn.cancel {
        color: #94a3b8;
        border-top: 1px solid #334155;
        margin-top: 4px;
    }
`;

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
