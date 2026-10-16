import { jest } from '@jest/globals';
import * as THREE from 'three';
import { createArucoMarkerMesh } from '../public/modules/environment/obstacles/markers/object.js';

const environment = new THREE.Group();
jest.unstable_mockModule('../public/modules/environment/index.js', () => ({ envGroup: environment }));
const { scanMarkers, detectVisibleMarkers } = await import('../public/modules/python/marker-detection.js');

beforeAll(() => {
    // No pixels are needed for geometry: the marker factory only needs a canvas that does not draw.
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => null }) } });
});
afterAll(() => { delete (globalThis as { document?: unknown }).document; });
afterEach(() => { environment.clear(); });

const WIDTH = 640, HEIGHT = 360;

/** A downward camera like the drone's: image top is +Y of the world, `height` metres above the point (x, y). */
function downCamera(x: number, y: number, height: number) {
    const camera = new THREE.PerspectiveCamera(72, WIDTH / HEIGHT, .01, 200);
    camera.up.set(0, 1, 0);
    camera.position.set(x, y, height);
    camera.lookAt(x, y, 0);
    camera.updateMatrixWorld(true);
    return camera;
}

function place(id: number, dictionary: string, options: { x?: number; y?: number; yaw?: number; flip?: boolean } = {}) {
    const marker = createArucoMarkerMesh(String(id), dictionary);
    marker.position.set(options.x ?? 0, options.y ?? 0, .03);
    marker.rotation.z = options.yaw ?? 0;
    if (options.flip) marker.rotation.x = Math.PI;                    // face down
    environment.add(marker);
    environment.updateMatrixWorld(true);
    return marker;
}

describe('marker scan for a camera window', () => {
    it('reports the id, the dictionary, the corners in OpenCV order and the marker\'s own axes', () => {
        place(10, 'DICT_6X6_250');
        const [marker] = scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT);
        expect(marker.id).toBe(10);
        expect(marker.dictionary).toBe('DICT_6X6_250');
        const [tl, tr, br, bl] = marker.corners;
        expect(tl[0]).toBeLessThan(tr[0]); expect(tl[1]).toBeLessThan(bl[1]);          // top-left, top-right, bottom-right, bottom-left
        expect(br[0]).toBeGreaterThan(bl[0]); expect(br[1]).toBeGreaterThan(tr[1]);
        const axes = marker.axes!;
        // Marker upright: X runs right along its top edge, Y runs up the image, Z comes out towards the camera.
        expect(axes.x[0]).toBeGreaterThan(axes.origin[0] + 5);
        expect(Math.abs(axes.x[1] - axes.origin[1])).toBeLessThan(1);
        expect(axes.y[1]).toBeLessThan(axes.origin[1] - 5);
        expect(Math.abs(axes.y[0] - axes.origin[0])).toBeLessThan(1);
        expect(Math.hypot(axes.z[0] - axes.origin[0], axes.z[1] - axes.origin[1])).toBeLessThan(2);   // straight down the optical axis
        expect(axes.origin[0]).toBeCloseTo(WIDTH / 2, 0);
        expect(axes.origin[1]).toBeCloseTo(HEIGHT / 2, 0);
    });

    it('turns the axes with the marker', () => {
        place(11, 'DICT_6X6_250', { yaw: Math.PI / 2 });                                // counter-clockwise from above
        const [marker] = scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT);
        const axes = marker.axes!;
        // Its X now points up the image and its Y to the left.
        expect(axes.x[1]).toBeLessThan(axes.origin[1] - 5);
        expect(axes.y[0]).toBeLessThan(axes.origin[0] - 5);
    });

    it('gives the position like OpenCV\'s tvec: X right, Y down, Z forward, metres', () => {
        place(12, 'DICT_6X6_250', { x: .3, y: .2 });
        const [marker] = scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT);
        const [x, y, z] = marker.position;
        expect(x).toBeCloseTo(.3, 2);                                                   // to the right of the camera
        expect(y).toBeCloseTo(-.2, 2);                                                  // above the centre of the image: negative, y is down
        expect(z).toBeCloseTo(1.5 - .03 - 0.0004, 1);                                   // in front: the height above the printed face
        expect(marker.distance).toBeCloseTo(Math.hypot(.3, .2, z), 2);
    });

    it('sees several markers at once, each with its own dictionary', () => {
        place(1, 'DICT_4X4_50', { x: -.4 });
        place(2, 'DICT_6X6_250', { x: .4 });
        const found = scanMarkers(downCamera(0, 0, 1.6), WIDTH, HEIGHT);
        expect(found.map(m => `${m.dictionary}:${m.id}`).sort()).toEqual(['DICT_4X4_50:1', 'DICT_6X6_250:2']);
    });

    it('does not report a marker that is not entirely in view, too small, facing away, or hidden', () => {
        place(10, 'DICT_6X6_250');
        expect(scanMarkers(downCamera(0, 0, .15), WIDTH, HEIGHT)).toHaveLength(0);      // fills more than the frame
        expect(scanMarkers(downCamera(0, 0, 60), WIDTH, HEIGHT)).toHaveLength(0);       // a few pixels
        expect(scanMarkers(downCamera(5, 0, 1.5), WIDTH, HEIGHT)).toHaveLength(0);      // off to the side
        environment.clear();
        place(10, 'DICT_6X6_250', { flip: true });
        expect(scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT)).toHaveLength(0);      // printed face down
        environment.clear();
        const marker = place(10, 'DICT_6X6_250');
        marker.visible = false;
        expect(scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT)).toHaveLength(0);
        marker.visible = true;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 2, .05), new THREE.MeshBasicMaterial());
        roof.position.z = 1;                                                            // between the camera and the marker
        environment.add(roof); environment.updateMatrixWorld(true);
        expect(scanMarkers(downCamera(0, 0, 1.5), WIDTH, HEIGHT)).toHaveLength(0);
    });

    it('can reuse the occlusion test for a moment, and notices a new marker once the list expires', () => {
        const marker = place(10, 'DICT_6X6_250');
        const camera = downCamera(0, 0, 1.5);
        expect(scanMarkers(camera, WIDTH, HEIGHT, { maxSheetAgeMs: 0, maxOcclusionAgeMs: 10_000 })).toHaveLength(1);
        // Hidden by a roof, but the cached "visible" is still trusted within its age...
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 2, .05), new THREE.MeshBasicMaterial());
        roof.position.z = 1; environment.add(roof); environment.updateMatrixWorld(true);
        expect(scanMarkers(camera, WIDTH, HEIGHT, { maxOcclusionAgeMs: 10_000 })).toHaveLength(1);
        // ...and not when the caller wants it fresh.
        expect(scanMarkers(camera, WIDTH, HEIGHT)).toHaveLength(0);
        expect(marker.parent).toBe(environment);
    });

    it('leaves the cv2 emulation as it was: detections keep their pixel noise and are stored for the drone', () => {
        place(10, 'DICT_6X6_250');
        const camera = downCamera(0, 0, 1.5);
        const detected = detectVisibleMarkers('drone-x', camera, WIDTH, HEIGHT);
        const clean = scanMarkers(camera, WIDTH, HEIGHT)[0].corners;
        expect(detected).toHaveLength(1);
        detected[0].corners.forEach((corner, i) => {
            expect(Math.hypot(corner[0] - clean[i][0], corner[1] - clean[i][1])).toBeLessThan(3);   // noise is sub-pixel
        });
        expect(detected[0].corners.some((corner, i) => corner[0] !== clean[i][0] || corner[1] !== clean[i][1])).toBe(true);
    });
});
