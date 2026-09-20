/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./global.d.ts" />
/// <reference path="./shims.d.ts" />
import { resetState, resetRuntimeStatePreservePose, drones, currentDroneId, currentScriptLanguage } from './modules/core/state.js';
import { init3D, updateDrone3D, is3DActive, addObject, appendPointToSelectedLinearObject, clearSceneSelection, deleteSelectedObject, finishSelectedLinearObjectEditing, getSelectedSceneObjectId, isSelectedLinearObjectEditingActive, listSceneObjects, focusSceneObjectById, resetDroneToOrigin, resetSelectedSceneObjectTransform, rotateSelectedSceneObjectByDegrees, selectSceneObjectById, setSceneObjectTransformMode, setSelectedObjectTransform, startSelectedLinearObjectEditing, updateSelectedSceneObject, deleteSceneObjectById } from './modules/drone/index.js';
import { runLuaScript, stopLuaScript } from './modules/lua/index.js';
import { setLocalFrameOrigin } from './modules/lua/autopilot.js';
import { runPythonScript, stopPythonScript } from './modules/python/index.js';
/**
 * Main browser entry point for the simulator.
 * Wires together the 3D scene, editor, UI controls, and script runtimes.
 */
import { initEditor, getEditorValue, layoutEditor, setEditorValue } from './modules/editor/index.js';
import { initUI } from './modules/ui/index.js';
import { log } from './modules/shared/logging/logger.js';
import type { MarkerMapOptions } from './modules/environment/obstacles.js';
import { resetScriptExecutionNoticeState, showScenarioValidationNotice, showScriptFailureNotice, validateScenarioBeforeLaunch, wireMissionNotices } from './modules/app/script-execution-notice.js';
import { configureSimulationControls } from './modules/app/simulation-controls.js';
import { initScriptLanguageSelector } from './modules/app/language-selector.js';
import { initThemeToggle } from './modules/app/theme-toggle.js';
import { registerGlobalErrorHandler } from './modules/app/global-error.js';
import { startAnimationLoop } from './modules/app/animation-loop.js';

// Global Loop

function init() {
    log('Инициализация симулятора...', 'info');
    registerGlobalErrorHandler();
    wireMissionNotices();
    initThemeToggle();

    configureSimulationControls({
        start: startSimulation,
        stop: stopSimulation,
        reset: resetSimulation
    });

    // Initialize UI with callbacks
    initUI({
        onRun: startSimulation,
        onStop: stopSimulation,
        onRestart: resetSimulation,
        onFileSelect: loadFileContent,
        onLocalFileLoad: (name, content) => {
            setEditorValue(content);
            log(`Локальный файл загружен: ${name}`, 'success');
        },
        onEditorResize: layoutEditor,
        onSceneAction: (action) => {
            if (action === 'delete') deleteSelectedObject();
            else addObject(action);
        },
        sceneManager: {
            list: () => listSceneObjects(),
            select: (id: string) => selectSceneObjectById(id),
            focus: (id: string) => focusSceneObjectById(id),
            remove: (id: string) => deleteSceneObjectById(id),
            add: (
                type: string,
                options?: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number; markerMap?: MarkerMapOptions }
            ) => addObject(type, options),
            setTransform: (
                position: { x: number; y: number; z: number },
                rotation: { x: number; y: number; z: number },
                scale: { x: number; y: number; z: number }
            ) => setSelectedObjectTransform(position, rotation, scale),
            updateSelected: (params: { value?: string; markerDictionary?: string; pointsText?: string; floors?: number }) => updateSelectedSceneObject(params),
            appendPoint: () => appendPointToSelectedLinearObject(),
            startLinearEditing: () => startSelectedLinearObjectEditing(),
            finishLinearEditing: (commit = true) => finishSelectedLinearObjectEditing(commit),
            isLinearEditingActive: (id?: string) => isSelectedLinearObjectEditingActive(id),
            setMode: (mode: 'translate' | 'rotate' | 'scale', id?: string) => setSceneObjectTransformMode(mode, id),
            rotateByDegrees: (axis: 'x' | 'y' | 'z', angle: number) => rotateSelectedSceneObjectByDegrees(axis, angle),
            resetRotation: () => resetSelectedSceneObjectTransform(),
            resetDroneOrigin: () => resetDroneToOrigin(),
            clearSelection: () => clearSceneSelection(),
            getSelectedId: () => getSelectedSceneObjectId()
        }
    });

    // Initialize Editor
    initEditor();
    initScriptLanguageSelector();

    // Initialize 3D Scene
    const container = document.getElementById('canvas-container');
    if (container) init3D(container);

    // Start Loop
    startAnimationLoop({
        updateDrone3D,
        is3DActive: () => is3DActive
    });
}

async function startSimulation() {
    resetScriptExecutionNoticeState();
    (window as any).clearEditorProblemHighlight?.();
    
    // Run all drones
    let anyAttempted = false;

    // First save current editor code to the currently selected drone
    if (drones[currentDroneId]) {
        const editorCode = getEditorValue();
        if (currentScriptLanguage === 'lua') drones[currentDroneId].script = editorCode;
        else drones[currentDroneId].pythonScript = editorCode;
    } else {
        log('Не удалось получить текущий дрон: код из редактора не сохранён', 'error');
    }

    // Python is launched only for the selected drone. Lua still runs for all drones.
    if (currentScriptLanguage === 'python') {
        const id = currentDroneId;
        const drone = drones[id];
        if (!drone) {
            log(`Python: дрон '${id}' не найден`, 'error');
            return;
        }

        const code = drone.pythonScript;
        if (!code || !code.trim()) {
            log('Python: скрипт пустой. Нечего запускать.', 'warn');
            return;
        }
        showScenarioValidationNotice('python', code);

        // Stop any previous runtime before starting the new one.
        stopLuaScript(id);
        stopPythonScript(id);

        resetRuntimeStatePreservePose(id);
        drone.running = true;
        drone.status = 'РАБОТАЕТ';

        try {
            await runPythonScript(id, code);
            log(`Python-скрипт запущен для ${drone.name}`, 'success');
        } catch (e: any) {
            drone.running = false;
            drone.status = 'ОШИБКА';
            const errMsg = e instanceof Error ? e.message : String(e);
            showScriptFailureNotice('python', e, 'syntax');
            log(`Ошибка запуска Python для ${drone.name}: ${errMsg}`, 'error');
        }

        return;
    }

    for (const id in drones) {
        const drone = drones[id];
        
        // Always try to run, even if it was running before (stop it first)
        const code = drone.script;
        if (!code || !code.trim()) continue;
        anyAttempted = true;
        const validation = validateScenarioBeforeLaunch('lua', code);
        if (id === currentDroneId) {
            showScenarioValidationNotice('lua', code);
        }
        if (validation.shouldBlock) {
            log(`Запуск скрипта ${drone.name} заблокирован: ${validation.blockingIssues[0]}`, 'error');
            continue;
        }

        stopLuaScript(id);
        resetRuntimeStatePreservePose(id);
        setLocalFrameOrigin(drone.pos.x, drone.pos.y, drone.pos.z);
        drone.running = true;
        drone.status = 'РАБОТАЕТ';
        
        try {
            runLuaScript(id, code);
            log(`Скрипт запущен для ${drone.name}`, 'success');

            // MCE_PREFLIGHT (1) — это команда ap.push, а не входящее событие от AP.
            // Для запуска сценария достаточно, что скрипт уже выполнил ap.push(Ev.MCE_PREFLIGHT).
            // Входящие события (ENGINES_STARTED=11, TAKEOFF_COMPLETE=6, POINT_REACHED=10)
            // triggerятся только симуляцией при смене состояний дрона.
        } catch (e: any) {
            drone.running = false;
            drone.status = 'ОШИБКА';
            const errMsg = e instanceof Error ? e.message : String(e);
            showScriptFailureNotice('lua', e, 'syntax');
            log(`Ошибка запуска скрипта для ${drone.name}: ${errMsg}`, 'error');
            console.error(`[Main] Error running script for ${id}:`, e);
        }
    }
    
    if (!anyAttempted) {
        log('Нет сценариев для запуска', 'warn');
    }
}

function stopSimulation() {
    for (const id in drones) {
        const drone = drones[id];
        if (drone.running) {
            stopLuaScript(id);
            stopPythonScript(id);
            drone.running = false;
            drone.status = 'ОСТАНОВЛЕН';
            log(`Остановлен: ${drone.name}`, 'warn');
        }
    }
}

function resetSimulation() {
    stopSimulation();
    for (const id in drones) {
        resetState(id);

        // Keep reset deterministic: return every drone transform to the origin.
        const drone = drones[id];
        drone.pos = { x: 0, y: 0, z: 0 };
        drone.orientation = { roll: 0, pitch: 0, yaw: 0 };
        drone.target_alt = 0;
        drone.target_pos = { x: 0, y: 0, z: 0 };
        drone.target_yaw = 0;
    }

    // Force one frame update so the UI immediately reflects the reset state.
    if (is3DActive) updateDrone3D(0);
    log('Симуляция сброшена', 'info');
}

async function loadFileContent(path: string) {
    try {
        const res = await fetch(`/api/file-content?path=${encodeURIComponent(path)}&lang=${currentScriptLanguage}`);
        const data = await res.json();
        setEditorValue(data.content);
        log(`Файл загружен: ${path}`, 'success');
    } catch (e) {
        log('Ошибка загрузки файла', 'error');
    }
}

// Make sure global functions are accessible for HTML events
declare global {
    interface Window {
        init: () => void;
    }
}
window.init = init;

// Start everything
window.addEventListener('DOMContentLoaded', init);
