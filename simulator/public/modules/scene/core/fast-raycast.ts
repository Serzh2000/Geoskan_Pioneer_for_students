import * as THREE from 'three';

/*
 * three.js tests a ray against EVERY triangle of a mesh whose bounding box it touches. The maps are made of a few big
 * merged meshes (a city block shell is 100 000 triangles, the ground 18 000, a railway 90 000), so a single ray -
 * the rangefinder, the optical-flow height, a marker visibility check, a click in the editor - cost 30-70 ms.
 *
 * This replaces the triangle loop for big static meshes: the triangles are sorted once into a grid over the mesh's
 * local XY plane and a ray visits only the cells it crosses (a 2D DDA walk), testing the triangles of those cells.
 * The result is the same list of intersections three.js returns (distance, point, face, faceIndex, uv), so nothing
 * that raycasts has to change. Small meshes, skinned/morphing meshes, multi-material meshes and meshes with a partial
 * draw range keep the stock loop.
 */

/** Meshes with fewer triangles than this are cheaper to test directly. */
export const MIN_ACCELERATED_TRIANGLES = 1500;
/** Target number of triangles per grid cell. */
const TRIANGLES_PER_CELL = 6;
const MAX_CELLS_PER_AXIS = 256;

export interface TriangleGrid {
    nx: number; ny: number;
    minX: number; minY: number;
    cellX: number; cellY: number;
    /** CSR layout: the triangles of cell c are triangles[offsets[c] .. offsets[c + 1]). */
    offsets: Uint32Array;
    triangles: Uint32Array;
    /** Last query that visited each triangle, to test a triangle spanning several cells once. */
    visited: Uint32Array;
    positionVersion: number;
    indexVersion: number;
}

type Accelerated = THREE.Mesh & { geometry: THREE.BufferGeometry; material: THREE.Material };

/** Version counter of an attribute (an interleaved one keeps it on its buffer). */
const versionOf = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): number =>
    (attribute as THREE.BufferAttribute).version ?? (attribute as THREE.InterleavedBufferAttribute).data.version;

const grids = new WeakMap<THREE.BufferGeometry, TriangleGrid>();
let queryStamp = 0;

const triangleCount = (geometry: THREE.BufferGeometry) =>
    (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

/** Can this mesh use the grid? Anything that moves its vertices after loading, or splits its triangles by material, cannot. */
export function canAccelerate(mesh: THREE.Mesh): mesh is Accelerated {
    const geometry = mesh.geometry;
    if (!geometry || !geometry.attributes.position || Array.isArray(mesh.material) || !mesh.material) return false;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return false;
    if (geometry.morphAttributes.position || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return false;
    return triangleCount(geometry) >= MIN_ACCELERATED_TRIANGLES;
}

export function buildGrid(geometry: THREE.BufferGeometry): TriangleGrid {
    const position = geometry.attributes.position;
    const index = geometry.index;
    const count = triangleCount(geometry);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const extentX = Math.max(box.max.x - box.min.x, 1e-3), extentY = Math.max(box.max.y - box.min.y, 1e-3);
    const cells = Math.max(1, count / TRIANGLES_PER_CELL);
    const nx = THREE.MathUtils.clamp(Math.round(Math.sqrt(cells * extentX / extentY)), 1, MAX_CELLS_PER_AXIS);
    const ny = THREE.MathUtils.clamp(Math.round(Math.sqrt(cells * extentY / extentX)), 1, MAX_CELLS_PER_AXIS);
    const cellX = extentX / nx, cellY = extentY / ny;

    const corner = (triangle: number, k: number) => (index ? index.getX(triangle * 3 + k) : triangle * 3 + k);
    const range = new Int32Array(count * 4);                     // x0, x1, y0, y1 (cell range) per triangle
    const counts = new Uint32Array(nx * ny + 1);
    const clampCell = (value: number, size: number) => Math.max(0, Math.min(size - 1, value));
    for (let t = 0; t < count; t++) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let k = 0; k < 3; k++) {
            const v = corner(t, k), x = position.getX(v), y = position.getY(v);
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        const cx0 = clampCell(Math.floor((x0 - box.min.x) / cellX), nx), cx1 = clampCell(Math.floor((x1 - box.min.x) / cellX), nx);
        const cy0 = clampCell(Math.floor((y0 - box.min.y) / cellY), ny), cy1 = clampCell(Math.floor((y1 - box.min.y) / cellY), ny);
        range[t * 4] = cx0; range[t * 4 + 1] = cx1; range[t * 4 + 2] = cy0; range[t * 4 + 3] = cy1;
        for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) counts[cy * nx + cx + 1]++;
    }
    for (let c = 0; c < nx * ny; c++) counts[c + 1] += counts[c];
    const offsets = counts;
    const fill = offsets.slice(0, nx * ny);
    const triangles = new Uint32Array(offsets[nx * ny]);
    for (let t = 0; t < count; t++) {
        for (let cy = range[t * 4 + 2]; cy <= range[t * 4 + 3]; cy++) {
            for (let cx = range[t * 4]; cx <= range[t * 4 + 1]; cx++) triangles[fill[cy * nx + cx]++] = t;
        }
    }
    return {
        nx, ny, minX: box.min.x, minY: box.min.y, cellX, cellY, offsets, triangles,
        visited: new Uint32Array(count), positionVersion: versionOf(position), indexVersion: index ? index.version : 0
    };
}

function gridOf(geometry: THREE.BufferGeometry): TriangleGrid {
    let grid = grids.get(geometry);
    const indexVersion = geometry.index ? geometry.index.version : 0;
    if (!grid || grid.positionVersion !== versionOf(geometry.attributes.position) || grid.indexVersion !== indexVersion) {
        grid = buildGrid(geometry);
        grids.set(geometry, grid);
    }
    return grid;
}

const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
const point = new THREE.Vector3(), world = new THREE.Vector3(), localHit = new THREE.Vector3();
const barycoord = new THREE.Vector3();
const uvA = new THREE.Vector2(), uvB = new THREE.Vector2(), uvC = new THREE.Vector2();

/** Tests triangle `t` like three.js does and appends the intersection to `intersects`. */
function testTriangle(mesh: Accelerated, raycaster: THREE.Raycaster, ray: THREE.Ray, t: number, intersects: THREE.Intersection[]) {
    const geometry = mesh.geometry;
    const index = geometry.index;
    const a = index ? index.getX(t * 3) : t * 3, b = index ? index.getX(t * 3 + 1) : t * 3 + 1, c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    mesh.getVertexPosition(a, vA); mesh.getVertexPosition(b, vB); mesh.getVertexPosition(c, vC);
    const side = mesh.material.side;
    const hit = side === THREE.BackSide ? ray.intersectTriangle(vC, vB, vA, true, point) : ray.intersectTriangle(vA, vB, vC, side === THREE.FrontSide, point);
    if (hit === null) return;
    world.copy(point).applyMatrix4(mesh.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(world);
    if (distance < raycaster.near || distance > raycaster.far) return;

    const face = { a, b, c, normal: new THREE.Vector3(), materialIndex: 0 };
    THREE.Triangle.getNormal(vA, vB, vC, face.normal);
    const intersection: THREE.Intersection = { distance, point: world.clone(), object: mesh, face, faceIndex: t };
    const uv = geometry.attributes.uv;
    if (uv) {
        THREE.Triangle.getBarycoord(point, vA, vB, vC, barycoord);
        uvA.fromBufferAttribute(uv as THREE.BufferAttribute, a); uvB.fromBufferAttribute(uv as THREE.BufferAttribute, b); uvC.fromBufferAttribute(uv as THREE.BufferAttribute, c);
        intersection.uv = new THREE.Vector2().addScaledVector(uvA, barycoord.x).addScaledVector(uvB, barycoord.y).addScaledVector(uvC, barycoord.z);
    }
    intersects.push(intersection);
}

/** Parameter range [t0, t1] of the ray inside `box` (slab test), clipped to [0, maxT]; null when it misses. */
function clipRay(ray: THREE.Ray, box: THREE.Box3, maxT: number): [number, number] | null {
    let t0 = 0, t1 = maxT;
    for (const axis of ['x', 'y', 'z'] as const) {
        const o = ray.origin[axis], d = ray.direction[axis], lo = box.min[axis], hi = box.max[axis];
        if (Math.abs(d) < 1e-12) {
            if (o < lo || o > hi) return null;
            continue;
        }
        let a = (lo - o) / d, b = (hi - o) / d;
        if (a > b) { const swap = a; a = b; b = swap; }
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) return null;
    }
    return [t0, t1];
}

/** Replacement for Mesh._computeIntersections on an accelerated mesh. `ray` is already in the mesh's local space. */
export function computeIntersectionsWithGrid(mesh: Accelerated, raycaster: THREE.Raycaster, intersects: THREE.Intersection[], ray: THREE.Ray) {
    const grid = gridOf(mesh.geometry);
    // The part of the ray inside the mesh's bounds, no longer than its reach (the world far in local units).
    const reach = Number.isFinite(raycaster.far) ? raycaster.far / minScale(mesh.matrixWorld) : Infinity;
    const span = clipRay(ray, mesh.geometry.boundingBox!, reach);
    if (!span) return;
    const [tStart, tEnd] = span;

    const stamp = ++queryStamp;
    const { nx, ny, minX, minY, cellX, cellY, offsets, triangles, visited } = grid;
    const dx = ray.direction.x, dy = ray.direction.y;
    const visitCell = (cx: number, cy: number) => {
        const cell = cy * nx + cx;
        for (let k = offsets[cell]; k < offsets[cell + 1]; k++) {
            const t = triangles[k];
            if (visited[t] === stamp) continue;
            visited[t] = stamp;
            testTriangle(mesh, raycaster, ray, t, intersects);
        }
    };

    ray.at(tStart, localHit);
    let cx = Math.max(0, Math.min(nx - 1, Math.floor((localHit.x - minX) / cellX)));
    let cy = Math.max(0, Math.min(ny - 1, Math.floor((localHit.y - minY) / cellY)));
    // A ray with no XY travel (straight along Z) stays in one column.
    if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) { visitCell(cx, cy); return; }

    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const nextX = minX + (dx > 0 ? cx + 1 : cx) * cellX, nextY = minY + (dy > 0 ? cy + 1 : cy) * cellY;
    let tMaxX = Math.abs(dx) < 1e-12 ? Infinity : tStart + (nextX - localHit.x) / dx;
    let tMaxY = Math.abs(dy) < 1e-12 ? Infinity : tStart + (nextY - localHit.y) / dy;
    const tDeltaX = Math.abs(dx) < 1e-12 ? Infinity : cellX / Math.abs(dx), tDeltaY = Math.abs(dy) < 1e-12 ? Infinity : cellY / Math.abs(dy);
    for (let guard = nx + ny + 4; guard > 0; guard--) {
        visitCell(cx, cy);
        if (tMaxX < tMaxY) {
            if (tMaxX > tEnd) break;
            cx += stepX; tMaxX += tDeltaX;
            if (cx < 0 || cx >= nx) break;
        } else {
            if (tMaxY > tEnd) break;
            cy += stepY; tMaxY += tDeltaY;
            if (cy < 0 || cy >= ny) break;
        }
    }
}

const scale = new THREE.Vector3();
/** Smallest axis scale of a matrix: dividing a world distance by it never under-estimates the local one. */
function minScale(matrix: THREE.Matrix4): number {
    matrix.decompose(point, new THREE.Quaternion(), scale);
    return Math.max(1e-6, Math.min(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)));
}

type MeshInternals = { _computeIntersections: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[], ray: THREE.Ray) => void };
let installed = false;

/** Makes every raycast against a big static mesh use its grid. Safe to call more than once. */
export function installFastRaycast(): void {
    if (installed) return;
    installed = true;
    const proto = THREE.Mesh.prototype as unknown as MeshInternals;
    const stock = proto._computeIntersections;
    if (typeof stock !== 'function') return;     // a three.js without this hook keeps its own loop
    proto._computeIntersections = function (this: THREE.Mesh, raycaster, intersects, ray) {
        if (canAccelerate(this)) computeIntersectionsWithGrid(this, raycaster, intersects, ray);
        else stock.call(this, raycaster, intersects, ray);
    };
}

installFastRaycast();
