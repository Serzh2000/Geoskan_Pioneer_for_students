import * as THREE from 'three';

type Compute = (raycaster: THREE.Raycaster, intersects: THREE.Intersection[], ray: THREE.Ray) => void;
const proto = THREE.Mesh.prototype as unknown as { _computeIntersections: Compute };
// The stock loop, captured before the module under test replaces it.
const stock = proto._computeIntersections;
const { installFastRaycast, buildGrid, MIN_ACCELERATED_TRIANGLES } = await import('../public/modules/scene/core/fast-raycast.js');
const fast = proto._computeIntersections;

function seeded(seed: number) {
    let state = seed >>> 0;
    return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

function castBoth(mesh: THREE.Mesh, raycaster: THREE.Raycaster) {
    proto._computeIntersections = stock;
    const expected = raycaster.intersectObject(mesh, false);
    proto._computeIntersections = fast;
    const actual = raycaster.intersectObject(mesh, false);
    return { expected, actual };
}

function terrain(side: THREE.Side, size = 90) {
    const geometry = new THREE.PlaneGeometry(200, 200, size, size);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * .13) * 3 + Math.cos(position.getY(i) * .09) * 2);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side }));
}

function boxes(count: number, rand: () => number) {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
        const box = new THREE.BoxGeometry(1 + rand() * 6, 1 + rand() * 6, 1 + rand() * 12);
        box.translate((rand() - .5) * 180, (rand() - .5) * 180, rand() * 10);
        parts.push(box.toNonIndexed());
    }
    const merged = new THREE.BufferGeometry();
    const total = parts.reduce((sum, part) => sum + part.attributes.position.count, 0);
    const positions = new Float32Array(total * 3);
    let offset = 0;
    for (const part of parts) { positions.set(part.attributes.position.array as Float32Array, offset); offset += part.attributes.position.count * 3; }
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ side: THREE.FrontSide }));
}

const sameHits = (expected: THREE.Intersection[], actual: THREE.Intersection[]) => {
    expect(actual.map(hit => hit.faceIndex)).toEqual(expected.map(hit => hit.faceIndex));
    actual.forEach((hit, i) => {
        expect(hit.distance).toBeCloseTo(expected[i].distance, 6);
        expect(hit.point.distanceTo(expected[i].point)).toBeLessThan(1e-6);
        expect(hit.object).toBe(expected[i].object);
        expect(hit.face!.normal.distanceTo(expected[i].face!.normal)).toBeLessThan(1e-9);
    });
};

function fire(mesh: THREE.Mesh, rays: number, rand: () => number, near = 0, far = Infinity) {
    mesh.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    raycaster.near = near; raycaster.far = far;
    let hits = 0;
    for (let i = 0; i < rays; i++) {
        const origin = new THREE.Vector3((rand() - .5) * 260, (rand() - .5) * 260, rand() * 40 - 5);
        const direction = i % 3 === 0
            ? new THREE.Vector3(0, 0, -1)                                            // like the rangefinder
            : new THREE.Vector3(rand() - .5, rand() - .5, rand() - .7).normalize();
        raycaster.set(origin, direction);
        const { expected, actual } = castBoth(mesh, raycaster);
        sameHits(expected, actual);
        hits += expected.length;
    }
    return hits;
}

describe('fast raycast', () => {
    afterEach(() => { proto._computeIntersections = fast; });

    it('installs once and keeps the stock loop for small meshes', () => {
        const before = proto._computeIntersections;
        installFastRaycast();
        expect(proto._computeIntersections).toBe(before);
        const small = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial());
        expect(small.geometry.index!.count / 3).toBeLessThan(MIN_ACCELERATED_TRIANGLES);
        const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
        const { expected, actual } = castBoth(small, raycaster);
        expect(expected.length).toBeGreaterThan(0);
        sameHits(expected, actual);
    });

    it.each([['front', THREE.FrontSide], ['double', THREE.DoubleSide], ['back', THREE.BackSide]] as const)(
        'matches three.js on a displaced %s-sided terrain, moved, rotated and scaled', (_name, side) => {
            const mesh = terrain(side);
            mesh.position.set(12, -7, 3); mesh.rotation.set(.3, -.2, 1.1); mesh.scale.set(1.5, .8, 2);
            expect(fire(mesh, 600, seeded(11))).toBeGreaterThan(10);
        });

    it('matches three.js on merged boxes, with a near/far range', () => {
        const mesh = boxes(700, seeded(5));
        expect(fire(mesh, 600, seeded(21))).toBeGreaterThan(50);
        expect(fire(mesh, 400, seeded(22), 1, 25)).toBeGreaterThanOrEqual(0);
    });

    it('matches three.js for a ray that starts inside the mesh and for rays along an axis', () => {
        const mesh = boxes(300, seeded(9));
        mesh.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();
        for (const direction of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)]) {
            for (let k = 0; k < 40; k++) {
                raycaster.set(new THREE.Vector3(-90 + k * 4.5, -90 + k * 4.5, 3), direction);
                const { expected, actual } = castBoth(mesh, raycaster);
                sameHits(expected, actual);
            }
        }
    });

    it('rebuilds its grid when the vertices change', () => {
        const mesh = terrain(THREE.DoubleSide, 60);
        const raycaster = new THREE.Raycaster(new THREE.Vector3(10, 10, 100), new THREE.Vector3(0, 0, -1));
        const first = castBoth(mesh, raycaster);
        sameHits(first.expected, first.actual);
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) position.setZ(i, position.getZ(i) + 40);
        position.needsUpdate = true;
        mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
        const second = castBoth(mesh, raycaster);
        sameHits(second.expected, second.actual);
        expect(second.actual[0].point.z).toBeCloseTo(first.actual[0].point.z + 40, 4);
    });

    it('does not accelerate what it cannot: several materials and a partial draw range', () => {
        const multi = terrain(THREE.DoubleSide, 60);
        (multi as THREE.Mesh).material = [multi.material as THREE.Material];
        multi.geometry.addGroup(0, Infinity, 0);
        const raycaster = new THREE.Raycaster(new THREE.Vector3(5, 5, 50), new THREE.Vector3(0, 0, -1));
        const { expected, actual } = castBoth(multi, raycaster);
        sameHits(expected, actual);
        const partial = terrain(THREE.DoubleSide, 60);
        partial.geometry.setDrawRange(0, 600);
        sameHits(...Object.values(castBoth(partial, raycaster)) as [THREE.Intersection[], THREE.Intersection[]]);
    });

    it('is much faster than three.js on a mesh with a hundred thousand triangles', () => {
        const mesh = terrain(THREE.DoubleSide, 220);                                 // ~97 000 triangles
        mesh.updateMatrixWorld(true);
        expect(mesh.geometry.index!.count / 3).toBeGreaterThan(90000);
        const raycaster = new THREE.Raycaster();
        const run = (compute: Compute) => {
            proto._computeIntersections = compute;
            const rand = seeded(3);
            const start = performance.now();
            for (let i = 0; i < 30; i++) {
                raycaster.set(new THREE.Vector3((rand() - .5) * 150, (rand() - .5) * 150, 30), new THREE.Vector3(0, 0, -1));
                raycaster.far = 40;
                raycaster.intersectObject(mesh, false);
            }
            return performance.now() - start;
        };
        run(fast);                                                                    // builds the grid
        const slow = run(stock), quick = run(fast);
        expect(quick).toBeLessThan(slow / 4);
    });

    it('builds a grid whose cells cover every triangle', () => {
        const geometry = terrain(THREE.FrontSide, 70).geometry;
        const grid = buildGrid(geometry);
        const seen = new Set<number>();
        grid.triangles.forEach(t => seen.add(t));
        expect(seen.size).toBe(geometry.index!.count / 3);
        expect(grid.offsets[grid.nx * grid.ny]).toBe(grid.triangles.length);
    });
});
