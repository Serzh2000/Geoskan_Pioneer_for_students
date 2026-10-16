export const CONTEXT_MENU_STYLES = `
    #object-context-menu {
        position: fixed;
        min-width: 170px;
        background: rgba(38, 38, 38, 0.96);
        border: 1px solid #464646;
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
        color: #a2a2a2;
        padding: 6px 10px;
        border-bottom: 1px solid #464646;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    #object-context-menu .ctx-section-label {
        font-size: 11px;
        color: #a2a2a2;
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
        background: rgba(51, 51, 51, 0.72);
        border: 1px solid rgba(86, 86, 86, 0.6);
    }
    #object-context-menu .ctx-info-title {
        font-size: 12px;
        font-weight: 600;
        color: #e7e7e7;
    }
    #object-context-menu .ctx-info-text {
        font-size: 12px;
        line-height: 1.45;
        color: #d4d4d4;
        white-space: pre-line;
    }
    #object-context-menu .ctx-separator {
        height: 1px;
        margin: 4px 2px;
        background: rgba(70, 70, 70, 0.9);
    }
    #object-context-menu .ctx-btn {
        background: transparent;
        border: none;
        color: #e7e7e7;
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
        background: rgba(255, 122, 26, 0.12);
        color: #ffb067;
        outline: none;
    }
    #object-context-menu .ctx-btn.active {
        background: rgba(255, 122, 26, 0.16);
        color: #ffb067;
        box-shadow: inset 0 0 0 1px rgba(255, 122, 26, 0.18);
    }
    #object-context-menu .ctx-btn.danger {
        color: #f87171;
    }
    #object-context-menu .ctx-btn.cancel {
        color: #a2a2a2;
        border-top: 1px solid #464646;
        margin-top: 4px;
    }
`;
