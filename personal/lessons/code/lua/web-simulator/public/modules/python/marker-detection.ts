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

export function detectVisibleMarkers(droneId: string, camera: THREE.PerspectiveCamera, width: number, height: number) {
    const found: DetectedMarker[] = [];
    if (!envGroup) {
        detectionsByDrone.set(droneId, found);
        lastCapturedDroneId = droneId;
        return found;
    }

    camera.updateMatrixWorld(true);
    const cameraPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);

    const sheets: THREE.Mesh[] = [];
    envGroup.traverse((node) => {
        if (node.name === MARKER_SHEET_NAME && (node as THREE.Mesh).isMesh && !isHidden(node)) sheets.push(node as THREE.Mesh);
    });

    for (const sheet of sheets) {
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

        const pixels: Array<[number, number]> = [];
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
        raycaster.set(cameraPosition, center.clone().sub(cameraPosition).normalize());
        raycaster.far = distance + 0.05;
        const firstHit = raycaster.intersectObjects(envGroup.children, true)
            .find((hit) => (hit.object as THREE.Mesh).isMesh && !isHidden(hit.object));
        if (firstHit && firstHit.object !== sheet && firstHit.distance < distance - 0.03) continue;

        found.push({
            id: Number(marker.userData.value) || 0,
            dictionary,
            corners: pixels.map(([x, y]) => [x + gaussian() * CORNER_NOISE_PX, y + gaussian() * CORNER_NOISE_PX])
        });
    }

    detectionsByDrone.set(droneId, found);
    lastCapturedDroneId = droneId;
    return found;
}

/** Markers seen in the most recently captured camera frame. */
export function latestMarkerDetections(dictionary?: string): DetectedMarker[] {
    const list = (lastCapturedDroneId && detectionsByDrone.get(lastCapturedDroneId)) || [];
    return dictionary ? list.filter((marker) => marker.dictionary === dictionary) : list;
}
