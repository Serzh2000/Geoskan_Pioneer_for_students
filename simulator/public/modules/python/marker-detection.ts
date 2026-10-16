import * as THREE from 'three';
import { envGroup } from '../environment/index.js';
import { MARKER_DICTIONARIES, type MarkerDictionaryId } from '../environment/obstacles/marker-dictionaries.js';
import { MARKER_CANVAS_SIZE, MARKER_SHEET_NAME, SHEET_SIZE, SHEET_THICKNESS } from '../environment/obstacles/markers/shared.js';

/*
 * ArUco / AprilTag detection for the in-browser cv2.aruco (see
 * pioneer-sdk-cv-prelude.ts). Real OpenCV isn't available in the browser,
 * but the simulator knows where every marker is: when a camera frame is
 * captured, each marker sheet in the scene is projected into that frame,
 * and it counts as detected if it's fully in view, facing the camera, big
 * enough in pixels and not hidden behind something - roughly the
 * conditions under which real detection succeeds. Corners come in OpenCV's
 * order (top-left, top-right, bottom-right, bottom-left of the printed
 * marker) with a little pixel noise, so pose estimation code behaves like
 * on real images. Markers on moving cars and trains are included.
 */

export type DetectedMarker = {
    id: number;
    dictionary: MarkerDictionaryId;
    corners: Array<[number, number]>;
};

const MIN_SIDE_PX = 10;
const MIN_FACING = 0.12;
const CORNER_NOISE_PX = 0.35;

const detectionsByDrone = new Map<string, DetectedMarker[]>();
let lastCapturedDroneId: string | null = null;
let frameSerial = 0;
const markerFrames = new Map<number, { droneId: string; markers: DetectedMarker[] }>();
const lastFrameByDrone = new Map<string, number>();

export function sealMarkerFrame(droneId: string): number {
    const token = ++frameSerial;
    markerFrames.set(token, { droneId, markers: ((detectionsByDrone.get(droneId)) || []).map(marker => ({ ...marker, corners: marker.corners.map(point => [...point] as [number, number]) })) });
    lastFrameByDrone.set(droneId, token);
    if (markerFrames.size > 64) markerFrames.delete(markerFrames.keys().next().value!);
    return token;
}
export function lastMarkerFrame(droneId: string): number { return lastFrameByDrone.get(droneId) || 0; }
export function markersInFrame(token: number, dictionary: string, droneId: string): DetectedMarker[] {
    const frame = markerFrames.get(token);
    if (!frame || frame.droneId !== droneId) return [];
    return frame.markers.filter(marker => marker.dictionary === dictionary).map(marker => ({ ...marker, corners: marker.corners.map(point => [...point] as [number, number]) }));
}

function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Half-side of the black marker square inside the white sheet, sheet-local units. */
function blackSquareHalf(dictionary: MarkerDictionaryId) {
    // Same layout as markers/texture.ts: quiet zone, then cells incl. a 1-cell border.
    const outer = MARKER_CANVAS_SIZE - 104 * 2;
    const cells = MARKER_DICTIONARIES[dictionary].markerSize + 2;
    const markerPx = Math.floor(outer / cells) * cells;
    return (markerPx / MARKER_CANVAS_SIZE) * SHEET_SIZE / 2;
}

function isHidden(node: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = node; current; current = current.parent) {
        if (!current.visible) return true;
    }
    return false;
}

const raycaster = new THREE.Raycaster();

type PixelPoint = [number, number];

/** A marker that a camera sees, with what a pose estimator would give: the image corners, the marker's own axes, and where it is. */
export type ProjectedMarker = {
    id: number;
    dictionary: MarkerDictionaryId;
    /** Clean image corners (top-left, top-right, bottom-right, bottom-left of the printed marker), px. */
    corners: PixelPoint[];
    /** The marker's coordinate frame as cv2.drawFrameAxes draws it: X right along the top edge, Y up the marker, Z out of its face. */
    axes: { origin: PixelPoint; x: PixelPoint; y: PixelPoint; z: PixelPoint } | null;
    /** Centre of the marker in the camera frame like OpenCV's tvec: X right, Y down, Z forward, metres. */
    position: [number, number, number];
    /** Straight-line distance from the camera to the marker centre, metres. */
    distance: number;
};

/** The marker sheets of the environment. Walking the whole scene every frame is wasteful: a camera window rescans often. */
let sheetCache: { at: number; list: THREE.Mesh[] } | null = null;
function markerSheets(maxAgeMs: number): THREE.Mesh[] {
    const now = performance.now();
    if (sheetCache && now - sheetCache.at < maxAgeMs) return sheetCache.list.filter(sheet => !isHidden(sheet));
    const list: THREE.Mesh[] = [];
    envGroup?.traverse((node) => {
        if (node.name === MARKER_SHEET_NAME && (node as THREE.Mesh).isMesh) list.push(node as THREE.Mesh);
    });
    sheetCache = { at: now, list };
    return list.filter(sheet => !isHidden(sheet));
}

const toPixels = (point: THREE.Vector3, camera: THREE.PerspectiveCamera, width: number, height: number): PixelPoint | null => {
    const ndc = point.clone().project(camera);
    if (ndc.z > 1) return null;
    return [(ndc.x + 1) / 2 * width, (1 - ndc.y) / 2 * height];
};

/**
 * Every marker sheet that `camera` sees in a `width` x `height` image, by the same rules the cv2 emulation uses: fully in
 * view, facing the camera, big enough, not hidden. Pure: it keeps no state, so a camera window can call it freely.
 */
export type ScanOptions = {
    /** Reuse the list of marker sheets found this recently instead of walking the scene again. */
    maxSheetAgeMs?: number;
    /** Reuse "this marker is not hidden" from a test this recent instead of casting a ray again. */
    maxOcclusionAgeMs?: number;
};

const occlusionCache = new WeakMap<THREE.Object3D, { at: number; visible: boolean }>();

export function scanMarkers(camera: THREE.PerspectiveCamera, width: number, height: number, options: ScanOptions = {}): ProjectedMarker[] {
    const { maxSheetAgeMs = 0, maxOcclusionAgeMs = 0 } = options;
    const found: ProjectedMarker[] = [];
    if (!envGroup) return found;

    camera.updateMatrixWorld(true);
    const cameraPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const toCameraSpace = camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    for (const sheet of markerSheets(maxSheetAgeMs)) {
        const marker = sheet.parent;
        if (!marker) continue;
        const dictionary = marker.userData.markerDictionary as MarkerDictionaryId;
        if (!MARKER_DICTIONARIES[dictionary]) continue;

        sheet.updateWorldMatrix(true, false);
        const half = blackSquareHalf(dictionary);
        const z = SHEET_THICKNESS / 2;
        // Printed on the sheet's +Z face; image top is local +Y.
        const local = [[-half, half], [half, half], [half, -half], [-half, -half]];
        const world = local.map(([x, y]) => new THREE.Vector3(x, y, z).applyMatrix4(sheet.matrixWorld));
        const center = new THREE.Vector3(0, 0, z).applyMatrix4(sheet.matrixWorld);

        const normal = new THREE.Vector3(0, 0, 1).transformDirection(sheet.matrixWorld);
        const toCamera = cameraPosition.clone().sub(center);
        const distance = toCamera.length();
        if (normal.dot(toCamera.normalize()) < MIN_FACING) continue;

        const pixels: PixelPoint[] = [];
        let inView = true;
        for (const point of world) {
            const ndc = point.clone().project(camera);
            if (ndc.z > 1 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) {
                inView = false;
                break;
            }
            pixels.push([(ndc.x + 1) / 2 * width, (1 - ndc.y) / 2 * height]);
        }
        if (!inView) continue;

        const side = Math.min(...pixels.map((p, i) => Math.hypot(p[0] - pixels[(i + 1) % 4][0], p[1] - pixels[(i + 1) % 4][1])));
        if (side < MIN_SIDE_PX) continue;

        // Something between the camera and the marker's centre hides it.
        const now = performance.now();
        const cached = maxOcclusionAgeMs > 0 ? occlusionCache.get(sheet) : undefined;
        let visible: boolean;
        if (cached && now - cached.at < maxOcclusionAgeMs) visible = cached.visible;
        else {
            raycaster.set(cameraPosition, center.clone().sub(cameraPosition).normalize());
            raycaster.far = distance + 0.05;
            const firstHit = raycaster.intersectObjects(envGroup.children, true)
                .find((hit) => (hit.object as THREE.Mesh).isMesh && !isHidden(hit.object));
            visible = !(firstHit && firstHit.object !== sheet && firstHit.distance < distance - 0.03);
            occlusionCache.set(sheet, { at: now, visible });
        }
        if (!visible) continue;

        const axisLength = half;
        const axisEnd = (x: number, y: number, depth: number) => toPixels(new THREE.Vector3(x, y, z + depth).applyMatrix4(sheet.matrixWorld), camera, width, height);
        const origin = toPixels(center, camera, width, height);
        const ends = { x: axisEnd(axisLength, 0, 0), y: axisEnd(0, axisLength, 0), z: axisEnd(0, 0, axisLength) };
        const inCamera = center.clone().applyMatrix4(toCameraSpace);

        found.push({
            id: Number(marker.userData.value) || 0,
            dictionary,
            corners: pixels,
            axes: origin && ends.x && ends.y && ends.z ? { origin, ...ends as { x: PixelPoint; y: PixelPoint; z: PixelPoint } } : null,
            position: [inCamera.x, -inCamera.y, -inCamera.z],
            distance
        });
    }
    return found;
}

export function detectVisibleMarkers(droneId: string, camera: THREE.PerspectiveCamera, width: number, height: number) {
    const found: DetectedMarker[] = scanMarkers(camera, width, height).map(marker => ({
        id: marker.id,
        dictionary: marker.dictionary,
        corners: marker.corners.map(([x, y]) => [x + gaussian() * CORNER_NOISE_PX, y + gaussian() * CORNER_NOISE_PX] as [number, number])
    }));
    detectionsByDrone.set(droneId, found);
    lastCapturedDroneId = droneId;
    return found;
}

/** Markers seen in the most recently captured camera frame. */
export function latestMarkerDetections(dictionary?: string): DetectedMarker[] {
    const list = (lastCapturedDroneId && detectionsByDrone.get(lastCapturedDroneId)) || [];
    return dictionary ? list.filter((marker) => marker.dictionary === dictionary) : list;
}
