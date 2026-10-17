import { drones } from '../core/state.js';
import { log } from '../shared/logging/logger.js';
import type { UICallbacks } from '../ui/index.js';
import { applySceneImport, buildSceneExport } from '../ui/scene-manager/scene-io.js';
import { dronePoseForRestore, parseSceneSession, SCENE_SESSION_KEY, SESSION_VERSION, type DronePose, type SceneSession } from './scene-session-data.js';

/*
 * The scene survives a page reload: the objects the student placed and where the drone stands are written to
 * localStorage as they change and put back on the next load. The only thing that starts over is the restart button in
 * the lower right corner, which returns the drone to its start and clears the program state (and flushes the result
 * here, so a reload right after it does not bring the old pose back).
 */

const AUTOSAVE_INTERVAL_MS = 4000;
const SAVE_DEBOUNCE_MS = 400;

function readDronePoses(): Record<string, DronePose> {
    const poses: Record<string, DronePose> = {};
    for (const id in drones) {
        const drone = drones[id];
        poses[id] = {
            x: drone.pos.x,
            y: drone.pos.y,
            z: drone.pos.z,
            pitch: drone.orientation.pitch,
            roll: drone.orientation.roll,
            yaw: drone.orientation.yaw
        };
    }
    return poses;
}

export function buildSceneSession(callbacks: UICallbacks, now = Date.now()): SceneSession {
    return { version: SESSION_VERSION, savedAt: now, objects: buildSceneExport(callbacks).objects, drones: readDronePoses() };
}

let lastSaved = '';

function writeSession(session: SceneSession): void {
    // savedAt changes on every call; compare the content alone so an idle scene does not rewrite storage.
    const content = JSON.stringify({ ...session, savedAt: 0 });
    if (content === lastSaved) return;
    try {
        localStorage.setItem(SCENE_SESSION_KEY, JSON.stringify(session));
        lastSaved = content;
    } catch {
        // Storage is full or blocked (private window): the scene simply will not survive a reload.
    }
}

/** Puts the saved objects and drone poses back. Returns how many objects came back. */
export function restoreSceneSession(callbacks: UICallbacks): number {
    let session: SceneSession | null;
    try {
        session = parseSceneSession(localStorage.getItem(SCENE_SESSION_KEY));
    } catch {
        return 0;
    }
    if (!session) return 0;
    lastSaved = JSON.stringify({ ...session, savedAt: 0 });

    let restored = 0;
    if (session.objects.length) {
        try {
            restored = applySceneImport(callbacks, { format: 'pioneer-scene', version: 2, objects: session.objects }).added;
        } catch (error) {
            log(`Не удалось восстановить объекты сцены: ${(error as Error).message}`, 'warn');
        }
        callbacks.sceneManager?.clearSelection();
    }

    for (const [id, saved] of Object.entries(session.drones)) {
        const drone = drones[id];
        if (!drone) continue;
        const pose = dronePoseForRestore(saved);
        drone.pos = { x: pose.x, y: pose.y, z: pose.z };
        drone.orientation = { roll: pose.roll, pitch: pose.pitch, yaw: pose.yaw };
        drone.target_pos = { ...drone.pos };
        drone.target_alt = pose.z;
        drone.target_yaw = pose.yaw;
    }
    if (restored) log(`Сцена восстановлена: ${restored} объект(ов)`, 'info');
    return restored;
}

let activeCallbacks: UICallbacks | null = null;

/** Writes the scene now. The restart button calls it so the reset pose is what a reload finds. */
export function saveSceneSessionNow(): void {
    if (activeCallbacks) writeSession(buildSceneSession(activeCallbacks));
}

/** Saves after the student lets go of the mouse or presses a key, every few seconds, and when the page goes away. */
export function startSceneSessionAutosave(callbacks: UICallbacks): void {
    activeCallbacks = callbacks;
    let timer: number | undefined;
    const soon = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(saveSceneSessionNow, SAVE_DEBOUNCE_MS);
    };
    document.addEventListener('pointerup', soon, true);
    document.addEventListener('keyup', soon, true);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveSceneSessionNow();
    });
    window.addEventListener('pagehide', saveSceneSessionNow);
    window.setInterval(saveSceneSessionNow, AUTOSAVE_INTERVAL_MS);
}
