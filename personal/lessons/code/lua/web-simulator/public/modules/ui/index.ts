/**
 * Главный модуль пользовательского интерфейса (UI).
 * Отвечает за инициализацию всех компонентов интерфейса, привязку обработчиков
 * событий к кнопкам (запуск, остановка, перезапуск), управление переключением
 * вкладок (редактор, справочник API, настройки и др.), а также настройку
 * загрузки файлов с сервера и локально.
 */
import { initContextMenu } from './context-menu/index.js';
import { initSceneManager } from './scene-manager/index.js';
import { initDroneManager } from './managers/drone-manager.js';
import { renderApiDocs } from './api-docs/index.js';
import { renderMissionGuidePanel } from './mission-guide/panel.js';
import { initChannelMonitor } from './panels/channel-monitor.js';
import { initLEDMatrixUI } from './panels/led-matrix.js';
import { initSettingsUI } from './settings/index.js';
import { initSimulationNotice } from './panels/simulation-notice.js';
import { initMissionGuideModal } from './mission-guide/modal.js';
import { initInfoModal } from './info/modal.js';
import { initSidebar } from './panels/sidebar.js';
import { initRailVisibility } from './panels/rail-visibility.js';
import { initSceneOnboarding } from './scene-onboarding.js';
import { initCameraModeUI } from './controls/camera-mode.js';
import { initFileControls } from './controls/file-controls.js';
import { initWorkspaceView } from './workspace-view.js';
import { initMobileEditorViewport } from './mobile-editor-viewport.js';
import type { MarkerMapOptions } from '../environment/obstacles.js';
import { currentScriptLanguage } from '../core/state.js';

export interface UICallbacks {
    onEditorResize?: () => void;
    onRun: () => void;
    onStop: () => void;
    onRestart: () => void;
    onFileSelect: (path: string) => void;
    onLocalFileLoad: (name: string, content: string) => void;
    onSceneAction?: (type: string) => void;
    onSceneUpdate?: () => void;
    sceneManager?: {
        list: () => Array<{
            id: string;
            name: string;
            sceneType: string;
            draggable: boolean;
            isDrone: boolean;
            selected: boolean;
            position: { x: number; y: number; z: number };
            rotation: { x: number; y: number; z: number };
            scale: { x: number; y: number; z: number };
            supportsValue?: boolean;
            supportsMarkerDictionary?: boolean;
            supportsPoints?: boolean;
            floors?: number;
            markerKind?: string;
            markerDictionary?: string;
            value?: string;
            pointsText?: string;
            metaLines?: string[];
            label?: string;
            presetName?: string;
            depth?: number;
            parentId?: string;
            childCount?: number;
            pointCount?: number;
        }>;
        select: (id: string) => boolean;
        focus: (id: string) => boolean;
        remove: (id: string) => boolean;
        add: (
            type: string,
            options?: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number; markerMap?: MarkerMapOptions }
        ) => void;
        updateSelected: (params: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number }) => boolean;
        appendPoint: () => boolean;
        startLinearEditing: () => boolean;
        finishLinearEditing: (commit?: boolean) => boolean;
        isLinearEditingActive: (id?: string) => boolean;
        setMode: (mode: 'translate' | 'rotate' | 'scale', id?: string) => boolean;
        rotateByDegrees: (axis: 'x' | 'y' | 'z', angle: number) => boolean;
        resetRotation: () => boolean;
        resetDroneOrigin: () => boolean;
        clearSelection: () => void;
        getSelectedId: () => string | null;
    };
}

export function initUI(callbacks: UICallbacks) {
    initContextMenu();
    initSceneManager(callbacks);
    initDroneManager(callbacks.onSceneUpdate);
    renderApiDocs();
    initMissionGuideModal();
    initInfoModal();
    renderMissionGuidePanel();
    initChannelMonitor();
    initLEDMatrixUI();
    initSettingsUI();
    initSimulationNotice();

    initSidebar(callbacks);
    initRailVisibility();
    initSceneOnboarding();
    initCameraModeUI();
    initMobileEditorViewport({ onEditorResize: callbacks.onEditorResize });
    initWorkspaceView();

    const runBtn = document.getElementById('run-btn');
    const stopBtn = document.getElementById('stop-btn');
    const restartBtn = document.getElementById('restart-btn');

    // Button Event Listeners
    if (runBtn) runBtn.addEventListener('click', callbacks.onRun);
    if (stopBtn) stopBtn.addEventListener('click', callbacks.onStop);
    if (restartBtn) restartBtn.addEventListener('click', callbacks.onRestart);

    initFileControls(callbacks, currentScriptLanguage);
}
