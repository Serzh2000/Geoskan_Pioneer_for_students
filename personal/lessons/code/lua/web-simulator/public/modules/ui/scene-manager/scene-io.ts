import type { UICallbacks } from '../index.js';
import type { BuildingConfig, MarkerMapOptions, VehicleConfig } from '../../environment/obstacles.js';
import { updateMarkerMapSettings } from '../../environment/obstacles.js';
import { updateSceneObjectPoints, updateSceneObjectValue } from '../../environment/index.js';
import { findSceneObjectById, parsePointsText } from '../../scene/objects/object-catalog.js';
import type { Object3D } from 'three';
import { TRAINING_PROFILES, TRAINING_PROFILE_LABELS } from '../../environment/training/layout.js';

export type SceneExportComponent = {
    slot: number;
    position: SceneExportEntry['position'];
    rotation: SceneExportEntry['rotation'];
    scale: SceneExportEntry['scale'];
    value?: string;
    markerDictionary?: string;
    floors?: number;
    pointsText?: string;
    markerMap?: MarkerMapOptions;
    building?: BuildingConfig;
    children?: SceneExportComponent[];
};

export type SceneExportEntry = {
    trainingSeed?: number;
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
    /** Apartment buildings: facade colour and roof marker (floors/incidents are above). */
    building?: BuildingConfig;
    /** Direct children of a preset. Missing slots represent deleted components. */
    components?: SceneExportComponent[];
};

export type SceneExportFile = {
    format: 'pioneer-scene';
    version: 1 | 2;
    objects: SceneExportEntry[];
};

// listSceneObjects() reports each object's Russian display label as its
// sceneType (that's what `Object3D.userData.type` holds - see
// shared/object-types.ts), but addObject()/createSceneObjectByType() key off
// the catalog's slug (the <option value="..."> in the add-object dropdown).
// This is the only place that translates between the two, so a saved scene
// file stores the slug directly and re-adding it on import is a direct call.
const SCENE_TYPE_TO_CATALOG_SLUG: Record<string, string> = {
    ...Object.fromEntries(TRAINING_PROFILES.map(profile => [`Учебный полигон: ${TRAINING_PROFILE_LABELS[profile]}`, `training-${profile}`])),
    'Ворота': 'gate',
    'FPV-куб': 'fpv-cube',
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
    const exportComponents = (parentId: string): SceneExportComponent[] => entries
        .filter(child => child.parentId === parentId && child.draggable && child.presetSlot !== undefined)
        .map(child => ({
            slot: child.presetSlot!,
            position: child.position,
            rotation: child.rotation,
            scale: child.scale,
            value: child.value,
            markerDictionary: child.markerDictionary,
            floors: child.floors,
            pointsText: child.pointsText,
            markerMap: child.markerMap,
            building: child.building,
            children: exportComponents(child.id)
        }));
    for (const entry of entries) {
        if (!entry.draggable || entry.isDrone || (entry.depth ?? 0) !== 0) continue;
        const slug = SCENE_TYPE_TO_CATALOG_SLUG[entry.sceneType];
        if (!slug) {
            console.warn(`[scene-io] Skipping "${entry.sceneType}" - no catalog slug to recreate it from on import.`);
            continue;
        }
        objects.push({
            trainingSeed: findSceneObjectById(entry.id)?.userData.trainingLayout?.seed,
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
            building: entry.building,
            components: entry.presetName ? exportComponents(entry.id) : undefined,
            vehicle: entry.vehicle ? (({ routeId, ...rest }) => ({
                ...rest,
                routeIndex: routeId && indexById.has(routeId) ? indexById.get(routeId)! : null
            }))(entry.vehicle) : undefined
        });
        indexById.set(entry.id, objects.length - 1);
    }
    return { format: 'pioneer-scene', version: 2, objects };
}

export function parseSceneImport(raw: string): SceneExportFile {
    const data = JSON.parse(raw);
    if (!data || data.format !== 'pioneer-scene' || !Array.isArray(data.objects)) {
        throw new Error('Файл не похож на экспорт сцены Pioneer');
    }
    return data;
}

function restorePresetComponents(parent: Object3D, components: SceneExportComponent[]) {
    const saved = new Map(components.map(component => [component.slot, component]));
    for (const child of [...parent.children]) {
        // Mesh details and fixed map cells are generated by their parent and
        // do not correspond to independently editable scene objects.
        if (!child.userData.type || !child.userData.draggable || !Number.isInteger(child.userData.presetSlot)) continue;
        const component = saved.get(Number(child.userData.presetSlot));
        if (!component) {
            child.removeFromParent();
            continue;
        }
        child.position.set(component.position.x, component.position.y, component.position.z);
        child.rotation.set(component.rotation.x, component.rotation.y, component.rotation.z);
        child.scale.set(component.scale.x, component.scale.y, component.scale.z);
        if (child.userData.isMarkerMap && component.markerMap) {
            updateMarkerMapSettings(child, {
                dictionaryId: component.markerDictionary,
                options: component.markerMap
            });
        } else if (child.userData.supportsValue || component.floors !== undefined) {
            updateSceneObjectValue(child, {
                value: component.value,
                markerDictionary: component.markerDictionary,
                floors: component.floors,
                building: component.building
            });
        }
        if (child.userData.supportsPoints && component.pointsText) {
            updateSceneObjectPoints(child, parsePointsText(component.pointsText));
        }
        if (Array.isArray(component.children)) restorePresetComponents(child, component.children);
        child.updateMatrixWorld(true);
    }
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
            trainingSeed: entry.trainingSeed,
            value: entry.value,
            markerDictionary: entry.markerDictionary,
            pointsText: entry.pointsText,
            closed: entry.closed,
            floors: entry.floors,
            markerMap: entry.markerMap,
            building: entry.building,
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
        if (placed && Array.isArray(entry.components)) {
            const preset = findSceneObjectById(id);
            if (preset?.userData.presetName) {
                restorePresetComponents(preset, entry.components);
            }
        }
        if (placed) added++; else failed++;
    }
    return { added, failed };
}
