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
    #transform-toolbar {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%) translateY(12px);
        min-width: 320px;
        max-width: min(92vw, 560px);
        padding: 10px 12px;
        border: 1px solid rgba(255, 122, 26, 0.2);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(38, 38, 38, 0.96), rgba(38, 38, 38, 0.9));
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(14px);
        display: none;
        flex-direction: column;
        gap: 10px;
        z-index: 2100;
        opacity: 0;
        transition: opacity 0.18s ease, transform 0.18s ease;
    }
    #transform-toolbar.visible {
        display: flex;
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    #transform-toolbar .transform-toolbar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    #transform-toolbar .transform-toolbar-title {
        font-size: 13px;
        font-weight: 600;
        color: #e7e7e7;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    #transform-toolbar .transform-toolbar-hint {
        font-size: 11px;
        color: #a2a2a2;
        white-space: nowrap;
    }
    #transform-toolbar .transform-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    #transform-toolbar .transform-btn {
        border: 1px solid rgba(162, 162, 162, 0.28);
        background: rgba(51, 51, 51, 0.9);
        color: #d4d4d4;
        border-radius: 12px;
        padding: 9px 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }
    #transform-toolbar .transform-btn:hover,
    #transform-toolbar .transform-btn:focus {
        outline: none;
        border-color: rgba(255, 122, 26, 0.55);
        color: #f8fafc;
        background: rgba(51, 51, 51, 1);
        transform: translateY(-1px);
    }
    #transform-toolbar .transform-btn.active {
        border-color: rgba(255, 122, 26, 0.65);
        background: rgba(255, 122, 26, 0.16);
        color: #ffb067;
        box-shadow: inset 0 0 0 1px rgba(255, 122, 26, 0.12);
    }
    #transform-toolbar .transform-btn.exit {
        margin-left: auto;
        color: #fca5a5;
        border-color: rgba(248, 113, 113, 0.28);
        background: rgba(69, 10, 10, 0.22);
    }
    #transform-toolbar .transform-toolbar-subtitle {
        width: 100%;
        font-size: 11px;
        color: #a2a2a2;
        margin-top: 2px;
    }
    #transform-toolbar .transform-toolbar-separator {
        width: 1px;
        align-self: stretch;
        background: rgba(162, 162, 162, 0.2);
        margin: 0 2px;
    }
    #transform-toolbar .transform-step-group {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 12px;
        background: rgba(38, 38, 38, 0.42);
        border: 1px solid rgba(162, 162, 162, 0.18);
    }
    #transform-toolbar .transform-step-label {
        font-size: 11px;
        color: #a2a2a2;
        margin-right: 2px;
    }
    #transform-toolbar .transform-step-btn {
        min-width: 44px;
        padding: 7px 9px;
        font-size: 12px;
    }
    #transform-toolbar .transform-axis-btn {
        min-width: 58px;
        padding: 8px 10px;
    }
    #transform-toolbar .transform-reset-btn {
        width: 100%;
        justify-content: center;
    }
`;
