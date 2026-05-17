export const CONTEXT_MENU_STYLES = `
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
    #transform-toolbar {
        position: fixed;
        left: 20px;
        top: 20px;
        width: auto;
        min-width: 0;
        padding: 8px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.75);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(12px);
        display: none;
        flex-direction: column;
        gap: 8px;
        z-index: 2100;
        opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #transform-toolbar.visible {
        display: flex;
        opacity: 1;
    }
    #transform-toolbar .transform-toolbar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 4px;
    }
    #transform-toolbar .transform-toolbar-title {
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    #transform-toolbar .transform-toolbar-hint {
        display: none;
    }
    #transform-toolbar .transform-toolbar-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding: 0 2px 2px;
    }
    #transform-toolbar .transform-toolbar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }
    #transform-toolbar .transform-toolbar-mode-row {
        padding-right: 28px;
    }
    #transform-toolbar .transform-btn {
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #64748b;
        border-radius: 8px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 0;
    }
    #transform-toolbar .transform-mode-btn {
        flex: 0 0 36px;
    }
    #transform-toolbar .transform-btn:hover {
        border-color: #FF8C00;
        color: #FF8C00;
        background: #fffaf5;
    }
    #transform-toolbar .transform-btn.active {
        border-color: #FF8C00;
        background: #FF8C00;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(255, 140, 0, 0.25);
    }
    #transform-toolbar .transform-btn.exit {
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 16px;
        min-width: 0;
        min-height: 0;
        position: absolute;
        right: 6px;
        top: 6px;
    }
    #transform-toolbar .transform-btn.exit:hover {
        color: #ef4444;
    }
    #transform-toolbar .transform-step-group {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 10px;
        background: #f1f5f9;
        border-radius: 8px;
    }
    #transform-toolbar .transform-step-label {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        margin-right: 4px;
    }
    #transform-toolbar .transform-step-btn {
        width: auto;
        height: 30px;
        min-width: 38px;
        padding: 0 6px;
        font-size: 11px;
        border: none;
        background: transparent;
    }
    #transform-toolbar .transform-step-btn.active {
        background: #ffffff;
        color: #FF8C00;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    #transform-toolbar .transform-axis-btn {
        width: 100%;
        height: 32px;
        font-size: 11px;
        font-weight: 700;
    }
    #transform-toolbar .transform-axis-group {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding: 8px 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    #transform-toolbar .transform-toolbar-subtitle {
        font-size: 11px;
        color: #475569;
        text-align: left;
        line-height: 1.3;
    }
    #transform-toolbar .transform-axis-buttons {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
    }
    #transform-toolbar .transform-reset-btn {
        width: 100%;
        height: 30px;
        font-size: 11px;
    }
    @media (max-width: 680px) {
        #transform-toolbar {
            max-width: calc(100vw - 24px);
        }
        #transform-toolbar .transform-axis-buttons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
`;
