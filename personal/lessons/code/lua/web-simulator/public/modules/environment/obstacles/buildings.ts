import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SceneObjectOptions } from './types.js';
import { setCommonMeta, applyShadows, clearGeneratedChildren } from './utils.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';
import { addIncidentEffect } from './buildings/effects.js';
import { getWindowSlots, parseWindowIncidents, summarizeWindowIncidents } from './buildings/incidents.js';
import {
    BUILDING_BASE_HEIGHT,
    BUILDING_DEPTH,
    BUILDING_FLOOR_HEIGHT,
    BUILDING_WIDTH,
    BuildingConfig,
    BuildingWindowSlot,
    clampBuildingFloors,
    normalizeBuildingConfig
} from './buildings/shared.js';
import { populateWindowsAndEntrance } from './buildings/modules.js';
import { createMarkerMeshForMap } from './markers/object.js';
import { SHEET_SIZE, SHEET_THICKNESS } from './markers/shared.js';

export type { BuildingConfig, BuildingRoofMarker } from './buildings/shared.js';
export { normalizeBuildingConfig, MIN_BUILDING_FLOORS, MAX_BUILDING_FLOORS, BUILDING_FLOOR_HEIGHT, BUILDING_BASE_HEIGHT } from './buildings/shared.js';
export { parseWindowIncidents } from './buildings/incidents.js';

const ROOF_MARKER_NAME = 'building-roof-marker';

/** Window slots of a building with this many floors, in its local space. */
export function getBuildingWindowSlots(floors: number) {
    return getWindowSlots(clampBuildingFloors(floors), BUILDING_DEPTH, BUILDING_FLOOR_HEIGHT);
}

/** Does this node sit inside a subtree that must keep its own objects (the roof marker)? */
function isKeptSeparate(node: THREE.Object3D, root: THREE.Object3D) {
    for (let current: THREE.Object3D | null = node; current && current !== root; current = current.parent) {
        if (current.userData?.keepSeparate) return true;
    }
    return false;
}

/** Bake only static opaque architecture. Incident effects keep their own objects. */
function mergeBuildingShell(group: THREE.Group) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    group.traverse(node => {
        if (!(node instanceof THREE.Mesh) || Array.isArray(node.material) || node.material.transparent) return;
        // A marker sheet merged into the shell would lose its name, and with it
        // detection (cv2.aruco looks for the sheet itself).
        if (isKeptSeparate(node, group)) return;
        const batch = batches.get(node.material) ?? [];
        batch.push(node); batches.set(node.material, batch);
    });
    for (const [material, parts] of batches) {
        if (parts.length < 2) continue;
        const geometries = parts.map(part => part.geometry.clone().applyMatrix4(
            new THREE.Matrix4().multiplyMatrices(inverse, part.matrixWorld)
        ));
        const geometry = mergeGeometries(geometries);
        geometries.forEach(item => item.dispose());
        if (!geometry) continue;
        for (const part of parts) { part.removeFromParent(); part.geometry.dispose(); }
        group.add(new THREE.Mesh(geometry, material));
    }
}

/** Top of the roof under its centre, in the building's local space. */
function measureRoofTop(group: THREE.Group, fallback: number) {
    group.updateWorldMatrix(true, true);
    const targets: THREE.Object3D[] = [];
    group.traverse((node) => {
        if ((node as THREE.Mesh).isMesh && !isKeptSeparate(node, group) && !node.userData?.isIncidentEffect) targets.push(node);
    });
    const origin = group.localToWorld(new THREE.Vector3(0, 0, fallback + 20));
    const below = group.localToWorld(new THREE.Vector3(0, 0, fallback + 19)).sub(origin).normalize();
    const hit = new THREE.Raycaster(origin, below).intersectObjects(targets, false)[0];
    return hit ? group.worldToLocal(hit.point.clone()).z : fallback;
}

/** (Re)places the configured roof marker lying flat at `roofTop`. */
function placeRoofMarker(group: THREE.Group, roofTop: number) {
    const previous = group.getObjectByName(ROOF_MARKER_NAME);
    if (previous) {
        previous.removeFromParent();
        previous.traverse((node) => (node as THREE.Mesh).geometry?.dispose?.());
    }
    const config = group.userData.building as BuildingConfig;
    if (!config.roofMarker.enabled) return;

    const marker = config.roofMarker;
    const sheet = createMarkerMeshForMap(marker.kind, marker.id, marker.dictionary);
    const scale = marker.size / SHEET_SIZE;
    sheet.scale.setScalar(scale);
    sheet.position.set(0, 0, roofTop + (SHEET_THICKNESS * scale) / 2 + 0.003);
    sheet.name = ROOF_MARKER_NAME;
    // Part of the building, not a scene object of its own.
    sheet.userData = { ...sheet.userData, draggable: false, keepSeparate: true, isBuildingRoofMarker: true };
    // What the settings popover reports back (dictionary/id after normalisation).
    marker.dictionary = sheet.userData.markerDictionary;
    marker.id = String(sheet.userData.value);
    group.add(sheet);
}

function rebuildApartmentBuilding(group: THREE.Group) {
    clearGeneratedChildren(group);

    const floors = clampBuildingFloors(group.userData.floors);
    group.userData.floors = floors;
    const config = normalizeBuildingConfig(group.userData.building);
    group.userData.building = config;
    group.userData.bodyColor = config.bodyColor;
    const bodyColor = config.bodyColor;
    const windowIncidents = parseWindowIncidents(group.userData.value, floors);
    group.userData.windowIncidentsSummaryLines = summarizeWindowIncidents(windowIncidents);

    const width = BUILDING_WIDTH;
    const depth = BUILDING_DEPTH;
    const floorHeight = BUILDING_FLOOR_HEIGHT;
    const proxyRoofTop = BUILDING_BASE_HEIGHT + floors * floorHeight + 0.22;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.96 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.92, metalness: 0.02 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78, metalness: 0.08 });
    const balconyGlassMat = new THREE.MeshStandardMaterial({
        color: 0x718b91,
        roughness: 0.18,
        metalness: 0.12,
        transparent: false,
        opacity: 1
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, depth + 0.16, 0.65), baseMat);
    base.position.z = 0.325; group.add(base);

    // Keep a compact, proportionate shell while the authored Blender modules load.
    // This also makes the object usable in non-browser previews where asset URLs are absent.
    const proxy = new THREE.Group();
    proxy.name = '__apartment_proxy';
    const proxyBody = new THREE.Mesh(new THREE.BoxGeometry(width, depth, floors * floorHeight), bodyMat);
    proxyBody.position.z = 0.65 + floors * floorHeight / 2;
    const proxyRoof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, depth + 0.12, 0.22), roofMat);
    proxyRoof.position.z = 0.65 + floors * floorHeight + 0.11;
    proxy.add(proxyBody, proxyRoof); group.add(proxy);

    // Merge+shadow the shell now so it stays a handful of draw calls even before the
    // async window/entrance modules (below) arrive; the merge runs again once they land.
    mergeBuildingShell(group);
    placeRoofMarker(group, proxyRoofTop);
    applyShadows(group);

    const windowSlots = getWindowSlots(floors, depth, floorHeight);

    const normalWindowMat = new THREE.MeshStandardMaterial({
        color: 0x243b43, roughness: 0.3, metalness: 0.35
    });
    const fireWindowMat = new THREE.MeshStandardMaterial({
        color: 0x2b1208, emissive: 0xff7a18, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.35
    });
    const entranceDoorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.22, metalness: 0.25 });
    const hasFireAt = (slot: BuildingWindowSlot) => windowIncidents.some((incident) =>
        incident.kind === 'fire'
        && incident.floor === slot.floor
        && incident.face === slot.face
        && incident.window === slot.window
    );

    // Rebuilds are re-entrant (floors/incidents can change while a previous GLB clone pass is
    // still in flight); only the most recent generation is allowed to populate this group.
    const generation = ((group.userData.rebuildGeneration as number | undefined) ?? 0) + 1;
    group.userData.rebuildGeneration = generation;

    void populateWindowsAndEntrance(
        group,
        windowSlots,
        (slot) => (hasFireAt(slot) ? fireWindowMat : normalWindowMat),
        {
            Niche: darkTrimMat,
            Frame: accentMat,
            MullionV: accentMat,
            MullionH: accentMat,
            TopFrame: concreteMat,
            Sill: concreteMat,
            BalconyFloor: balconyMat,
            BalconyUnderside: darkTrimMat,
            BalconyFront: balconyGlassMat,
            SideRailL: balconyGlassMat,
            SideRailR: balconyGlassMat,
            TopRail: accentMat,
            Baluster0: accentMat,
            Baluster1: accentMat,
            Baluster2: accentMat
        },
        {
            EntranceFrame: darkTrimMat,
            EntranceDoor: entranceDoorMat,
            EntranceCanopy: roofMat,
            EntranceStep: concreteMat,
            EntranceHandleL: accentMat,
            EntranceHandleR: accentMat,
            EntranceCanopyPostL: darkTrimMat,
            EntranceCanopyPostR: darkTrimMat
        }
    ).catch((error) => {
        console.error('[Buildings] Failed to load window/entrance modules', error);
        return false;
    }).then((loaded) => {
        if (group.userData.rebuildGeneration !== generation) return;
        if (!loaded) return;
        const loadingProxy = group.getObjectByName('__apartment_proxy');
        loadingProxy?.removeFromParent();
        loadingProxy?.traverse((item) => {
            if (item instanceof THREE.Mesh) item.geometry.dispose();
        });

        mergeBuildingShell(group);
        // The authored roof has its own height (parapet, slab): put the marker on it.
        placeRoofMarker(group, measureRoofTop(group, proxyRoofTop));
        if (!windowIncidents.some(incident => incident.kind === 'fire')) fireWindowMat.dispose();
        for (const incident of windowIncidents) {
            const slot = windowSlots.find((candidate) =>
                candidate.floor === incident.floor
                && candidate.face === incident.face
                && candidate.window === incident.window
            );
            if (slot) addIncidentEffect(group, slot, incident);
        }

        applyShadows(group);
    });
}

export function createApartmentBuildingMesh(options: SceneObjectOptions = {}) {
    const building = normalizeBuildingConfig(options.building);
    const group = setCommonMeta(new THREE.Group(), OBJECT_TYPE.BUILDING, {
        floors: clampBuildingFloors(options.floors ?? 9),
        collidableRadius: 2.6,
        supportsValue: true,
        value: options.value || '',
        building,
        bodyColor: building.bodyColor,
        valueLabel: 'Сценарии в окнах'
    });
    rebuildApartmentBuilding(group);
    return group;
}

export function updateApartmentBuildingMetadata(
    object: THREE.Object3D,
    params: { value?: string; floors?: number; building?: Partial<BuildingConfig> }
) {
    const group = object as THREE.Group;
    if (group.userData?.type !== OBJECT_TYPE.BUILDING) return false;
    if (params.value !== undefined) group.userData.value = params.value || '';
    if (params.floors !== undefined) group.userData.floors = clampBuildingFloors(params.floors);
    if (params.building !== undefined) {
        group.userData.building = normalizeBuildingConfig({ ...group.userData.building, ...params.building });
    }
    rebuildApartmentBuilding(group);
    return true;
}
