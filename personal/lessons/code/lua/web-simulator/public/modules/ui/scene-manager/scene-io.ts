import type { UICallbacks } from '../index.js';
import type { MarkerMapOptions, VehicleConfig } from '../../environment/obstacles.js';

export type SceneExportEntry = {
    sceneType: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    value?: string;
    markerDictionary?: string;
    floors?: number;
    pointsText?: string;
    closed?: boolean;
    /** Marker maps: their exact grid (rows, columns, IDs, spacing...). */
    markerMap?: MarkerMapOptions;
    /**
     * Cars/trains: their settings, with the route they drive on stored as
     * the index of that road/railway in this same objects list.
     */
    vehicle?: Omit<VehicleConfig, 'routeId'> & { routeIndex: number | null };
};

export type SceneExportFile = {
    format: 'pioneer-scene';
    version: 1;
    objects: SceneExportEntry[];
};

// listSceneObjects() reports each object's Russian display label as its
// sceneType (that's what `Object3D.userData.type` holds - see
// shared/object-types.ts), but addObject()/createSceneObjectByType() key off
// the catalog's slug (the <option value="..."> in the add-object dropdown).
// This is the only place that translates between the two, so a saved scene
// file stores the slug directly and re-adding it on import is a direct call.
const SCENE_TYPE_TO_CATALOG_SLUG: Record<string, string> = {
    'Ворота': 'gate',
    'Пилон': 'pylon',
    'Флаг': 'flag',
    'Многоэтажка': 'building',
    'ArUco маркер': 'aruco',
    'ArUco карта': 'aruco-map',
    'AprilTag маркер': 'apriltag',
    'AprilTag карта': 'apriltag-map',
    'Дорога': 'road',
    'Железнодорожные пути': 'rail',
    'Холм': 'hill',
    'Группа холмов': 'arena-hills',
    'Ель': 'tree',
    'Лесной массив': 'forest-patch',
    'Макет поселения': 'settlement',
    'Транспорт': 'transport',
    'Автомобиль': 'car',
    'Поезд': 'train',
    'Грузик': 'cargo',
    'Стартовая позиция': 'start-position',
    'Хелипорт': 'heliport',
    'Станция заряда': 'charge-station',
    'Локус-маяк': 'locus-beacon',
    'Световая мачта': 'light-tower',
    'Видеомачта': 'video-tower',
    'Пульт полигона': 'control-station',
    'Арена с сеткой': 'arena-space',
    'Площадка H': 'pad-h',
    'Площадка ⚡': 'pad-charge',
    'Пресет: гоночная трасса': 'preset-race-track',
    'Пресет: спальный район': 'preset-residential',
    'Пресет: Геоскан Арена': 'preset-geoskan-arena'
};

// Only top-level, user-placed objects are portable: the ground/boundary/drone
// are recreated by the simulator itself on every load, and groups have no
// catalog slug of their own to re-add them by (their members export as
// independent objects instead, since members are nested at depth > 0 and
// already skipped here). Vehicles go last, so the route each one references
// by index is always already in the file (and re-created first on import).
export function buildSceneExport(callbacks: UICallbacks): SceneExportFile {
    const all = (callbacks.sceneManager?.list() || []).filter((entry) => !entry.vehicle);
    const vehicles = (callbacks.sceneManager?.list() || []).filter((entry) => !!entry.vehicle);
    const entries = [...all, ...vehicles];
    const objects: SceneExportEntry[] = [];
    const indexById = new Map<string, number>();
    for (const entry of entries) {
        if (!entry.draggable || entry.isDrone || (entry.depth ?? 0) !== 0) continue;
        const slug = SCENE_TYPE_TO_CATALOG_SLUG[entry.sceneType];
        if (!slug) {
            console.warn(`[scene-io] Skipping "${entry.sceneType}" - no catalog slug to recreate it from on import.`);
            continue;
        }
        objects.push({
            sceneType: slug,
            position: entry.position,
            rotation: entry.rotation,
            scale: entry.scale,
            value: entry.value || undefined,
            markerDictionary: entry.markerDictionary || undefined,
            floors: entry.floors,
            pointsText: entry.pointsText || undefined,
            closed: entry.closed || undefined,
            markerMap: entry.markerMap,
            vehicle: entry.vehicle ? (({ routeId, ...rest }) => ({
                ...rest,
                routeIndex: routeId && indexById.has(routeId) ? indexById.get(routeId)! : null
            }))(entry.vehicle) : undefined
        });
        indexById.set(entry.id, objects.length - 1);
    }
    return { format: 'pioneer-scene', version: 1, objects };
}

export function parseSceneImport(raw: string): SceneExportFile {
    const data = JSON.parse(raw);
    if (!data || data.format !== 'pioneer-scene' || !Array.isArray(data.objects)) {
        throw new Error('Файл не похож на экспорт сцены Pioneer');
    }
    return data;
}

export function applySceneImport(callbacks: UICallbacks, data: SceneExportFile): { added: number; failed: number } {
    const sceneManager = callbacks.sceneManager;
    if (!sceneManager) return { added: 0, failed: 0 };

    let added = 0;
    let failed = 0;
    // Index in the file -> id of the object re-created from it, so vehicles
    // can find their route again.
    const newIds: Array<string | null> = [];
    for (const entry of data.objects) {
        if (!entry || typeof entry.sceneType !== 'string') {
            failed++;
            newIds.push(null);
            continue;
        }

        const vehicle = entry.vehicle
            ? (({ routeIndex, ...rest }) => ({
                ...rest,
                routeId: routeIndex !== null && routeIndex !== undefined ? newIds[routeIndex] ?? null : null
            }))(entry.vehicle)
            : undefined;
        const id = sceneManager.add(entry.sceneType, {
            value: entry.value,
            markerDictionary: entry.markerDictionary,
            pointsText: entry.pointsText,
            closed: entry.closed,
            floors: entry.floors,
            markerMap: entry.markerMap,
            vehicle
        });
        newIds.push(id);
        if (!id) {
            failed++;
            continue;
        }
        if (vehicle) {
            // Placed by the vehicle engine on its route, not by a transform.
            added++;
            continue;
        }

        sceneManager.select(id);
        const placed = sceneManager.setTransform(
            entry.position || { x: 0, y: 0, z: 0 },
            entry.rotation || { x: 0, y: 0, z: 0 },
            entry.scale || { x: 1, y: 1, z: 1 }
        );
        if (placed) added++; else failed++;
    }
    return { added, failed };
}
