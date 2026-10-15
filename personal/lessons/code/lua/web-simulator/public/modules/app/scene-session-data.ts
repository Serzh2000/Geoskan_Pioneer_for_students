import type { SceneExportEntry } from '../ui/scene-manager/scene-io.js';

/* What the saved scene looks like and how it is read back; the part that needs no browser (see scene-session.ts). */

export const SCENE_SESSION_KEY = 'pioneer_scene_session_v1';
export const SESSION_VERSION = 1;
/** A drone this high was in the air when the page closed: it is put down at the same spot instead of hanging there. */
export const GROUND_TOLERANCE = 0.05;

export interface DronePose {
    x: number;
    y: number;
    z: number;
    pitch: number;
    roll: number;
    yaw: number;
}

export interface SceneSession {
    version: number;
    savedAt: number;
    objects: SceneExportEntry[];
    drones: Record<string, DronePose>;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function isPose(value: unknown): value is DronePose {
    const pose = value as Partial<DronePose> | null;
    return Boolean(pose) && ['x', 'y', 'z', 'pitch', 'roll', 'yaw'].every((key) => isFiniteNumber((pose as Record<string, unknown>)[key]));
}

/** Reads a saved session; anything that is not a session of this version (or is damaged) is ignored. */
export function parseSceneSession(raw: string | null): SceneSession | null {
    if (!raw) return null;
    try {
        const data = JSON.parse(raw) as Partial<SceneSession> | null;
        if (!data || data.version !== SESSION_VERSION || !Array.isArray(data.objects) || typeof data.drones !== 'object' || !data.drones) return null;
        const savedDrones: Record<string, DronePose> = {};
        for (const [id, pose] of Object.entries(data.drones)) {
            if (isPose(pose)) savedDrones[id] = pose;
        }
        return { version: SESSION_VERSION, savedAt: Number(data.savedAt) || 0, objects: data.objects as SceneExportEntry[], drones: savedDrones };
    } catch {
        return null;
    }
}

/** A drone that was airborne when the page closed comes back standing on the ground, level, facing the same way. */
export function dronePoseForRestore(saved: DronePose): DronePose {
    const airborne = saved.z > GROUND_TOLERANCE;
    return { x: saved.x, y: saved.y, z: airborne ? 0 : saved.z, pitch: 0, roll: 0, yaw: saved.yaw };
}
