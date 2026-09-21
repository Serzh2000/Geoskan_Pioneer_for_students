import { Blockly, isBlocklyLoaded, type BlocklyNS } from './blockly-mode/loader.js';
import type { AppTheme } from '../app/theme-toggle.js';

let blocklyTheme: BlocklyNS.Theme | undefined;
let blocklyThemeDark: BlocklyNS.Theme | undefined;

// Темы зависят от класса Blockly.Theme, поэтому строятся лениво, при первом
// обращении уже после того, как пакет `blockly` фактически загружен
// (см. ensureBlocklyLoaded() в blockly-mode/loader.ts) — иначе этот модуль,
// импортируемый при каждой загрузке страницы, тянул бы весь Blockly за собой.
function ensureBlocklyThemesBuilt(): boolean {
    if (!isBlocklyLoaded()) return false;
    if (blocklyTheme && blocklyThemeDark) return true;

    blocklyTheme = Blockly.Theme.defineTheme('pioneer-main-blockly', {
        name: 'pioneer-main-blockly',
        base: Blockly.Themes.Classic,
        fontStyle: {
            family: 'Inter, Segoe UI, sans-serif',
            weight: '600',
            size: 12
        },
        componentStyles: {
            workspaceBackgroundColour: '#f8f9fb',
            toolboxBackgroundColour: '#ffffff',
            toolboxForegroundColour: '#151515',
            flyoutBackgroundColour: '#f4f5f7',
            flyoutForegroundColour: '#151515',
            scrollbarColour: '#cbd5e1',
            insertionMarkerColour: '#ff6b00',
            insertionMarkerOpacity: 0.32,
            markerColour: '#ff6b00',
            cursorColour: '#ff6b00'
        }
    });

    blocklyThemeDark = Blockly.Theme.defineTheme('pioneer-main-blockly-dark', {
        name: 'pioneer-main-blockly-dark',
        base: Blockly.Themes.Classic,
        fontStyle: {
            family: 'Inter, Segoe UI, sans-serif',
            weight: '600',
            size: 12
        },
        componentStyles: {
            workspaceBackgroundColour: '#0a0a0a',
            toolboxBackgroundColour: '#0a0a0a',
            toolboxForegroundColour: '#e2e8f0',
            flyoutBackgroundColour: '#0a0a0a',
            flyoutForegroundColour: '#e2e8f0',
            scrollbarColour: '#3a3a3a',
            insertionMarkerColour: '#7dd3fc',
            insertionMarkerOpacity: 0.32,
            markerColour: '#7dd3fc',
            cursorColour: '#7dd3fc'
        }
    });

    return true;
}

export function getBlocklyTheme(): BlocklyNS.Theme | undefined {
    if (!ensureBlocklyThemesBuilt()) return undefined;
    return document.documentElement.dataset.theme === 'dark' ? blocklyThemeDark : blocklyTheme;
}

export function getBlocklyThemeByName(themeName: AppTheme): BlocklyNS.Theme | undefined {
    if (!ensureBlocklyThemesBuilt()) return undefined;
    return themeName === 'dark' ? blocklyThemeDark : blocklyTheme;
}

