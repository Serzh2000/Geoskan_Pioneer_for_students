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
import { initHudControls } from './controls/hud-controls.js';
import { initSidebar } from './panels/sidebar.js';
import { initCameraModeUI } from './controls/camera-mode.js';
import { initFileControls } from './controls/file-controls.js';
import type { MarkerMapOptions } from '../environment/obstacles.js';

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
        }>;
        select: (id: string) => boolean;
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
        resetDroneOrigin: () => boolean;
        getSelectedId: () => string | null;
    };
}

export function initUI(callbacks: UICallbacks) {
    initContextMenu();
    initSceneManager(callbacks);
    initDroneManager(callbacks.onSceneUpdate);
    renderApiDocs();
    initMissionGuideModal();
    renderMissionGuidePanel();
    initChannelMonitor();
    initLEDMatrixUI();
    initSettingsUI();
    initSimulationNotice();
    initHudControls();

    // Scene Object List logic (handled by scene manager)
    const updateObjectList = (objects: any[], selectedId: string | null, onSelect: (id: string) => void) => {
        const objList = document.getElementById('scene-object-list');
        if (objList) {
            objList.innerHTML = '';
            objects.forEach(obj => {
                const item = document.createElement('div');
                item.className = 'scene-object-item' + (selectedId === obj.id ? ' selected' : '');
                
                // Icon based on type
                let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
                if (obj.type === 'gate') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V3h18v18M3 7h18"/></svg>';
                if (obj.type === 'pylon') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22h20L12 2z"/></svg>';
                if (obj.type === 'aruco' || obj.type === 'apriltag') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M7 7h10v10H7z"/></svg>';
                
                item.innerHTML = `${icon} <span>${obj.name || obj.type}</span>`;
                item.onclick = () => onSelect(obj.id);
                objList.appendChild(item);
            });
        }
    };

    initSidebar(callbacks);
    initCameraModeUI();

    const runBtn = document.getElementById('run-btn');
    const stopBtn = document.getElementById('stop-btn');
    const restartBtn = document.getElementById('restart-btn');

    // Button Event Listeners
    if (runBtn) runBtn.addEventListener('click', callbacks.onRun);
    if (stopBtn) stopBtn.addEventListener('click', callbacks.onStop);
    if (restartBtn) restartBtn.addEventListener('click', callbacks.onRestart);

    initFileControls(callbacks);
}

export function updateSceneObjectDetails(obj: any | null) {
    const detailsEl = document.getElementById('scene-object-details');
    const valInput = document.getElementById('scene-selected-value') as HTMLInputElement;
    const ptsInput = document.getElementById('scene-selected-points') as HTMLTextAreaElement;
    const appendBtn = document.getElementById('scene-append-point-btn') as HTMLButtonElement;

    if (!obj) {
        if (detailsEl) detailsEl.innerHTML = 'Выберите объект в списке';
        if (valInput) valInput.style.display = 'none';
        if (ptsInput) ptsInput.style.display = 'none';
        if (appendBtn) appendBtn.style.display = 'none';
        return;
    }

    if (detailsEl) {
        detailsEl.innerHTML = `Тип: ${obj.type}
Имя: ${obj.name || 'Нет'}
Перемещаемый: ${obj.isStatic ? 'нет' : 'да'}
Позиция: ${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)}
Поворот: ${obj.rotation.x.toFixed(2)}, ${obj.rotation.y.toFixed(2)}, ${obj.rotation.z.toFixed(2)}
Масштаб: ${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)}`;
    }

    // Dynamic fields for selected object
    if (obj.type === 'aruco' || obj.type === 'apriltag') {
        if (valInput) {
            valInput.style.display = 'block';
            valInput.value = obj.meta?.value !== undefined ? obj.meta.value : '';
            valInput.placeholder = 'ID маркера';
        }
    } else {
        if (valInput) valInput.style.display = 'none';
    }

    if (obj.type === 'road' || obj.type === 'rail') {
        if (ptsInput) {
            ptsInput.style.display = 'block';
            ptsInput.value = obj.meta?.points ? obj.meta.points.map((p: any) => `${p.x},${p.y},${p.z}`).join('\n') : '';
        }
        if (appendBtn) appendBtn.style.display = 'block';
    } else {
        if (ptsInput) ptsInput.style.display = 'none';
        if (appendBtn) appendBtn.style.display = 'none';
    }
}
