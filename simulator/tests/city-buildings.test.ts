import * as THREE from 'three';
import { createTrainingTerrain } from '../public/modules/environment/training/mesh.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import type { TrainingLayout, TrainingProfile } from '../public/modules/environment/training/layout.js';
import { createCityBlockMesh, createCityHouseMesh } from '../public/modules/environment/obstacles/buildings/city-blocks.js';
import { BLOCK_SPECS, HOUSE_SPECS } from '../public/modules/environment/obstacles/buildings/city-specs.js';
import { obstacleHasCollision } from '../public/modules/physics/collisions.js';

beforeAll(() => {
    (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
});

type Pt = { x: number; y: number };
const BUILDINGS = new Set(['building', 'house', 'warehouse', 'station', 'barn', 'hangar', 'church', 'gas-station', 'fire-station', 'police-station', 'school',
    'hospital', 'restaurant', 'mall', 'office', 'greenhouse', 'water-tower', 'silo', 'containers', 'gantry-crane', 'solar']);

/** Контур здания на земле в мировых координатах: локальный габарит по мешам (без дальней коробки), повёрнутый и промасштабированный. */
function footprint(object: THREE.Object3D): { poly: Pt[]; zmin: number; zmax: number } {
    object.updateWorldMatrix(true, true);
    const inverse = object.matrixWorld.clone().invert(), box = new THREE.Box3(), part = new THREE.Box3();
    object.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || mesh.userData.lodProxy) return;
        mesh.geometry.computeBoundingBox();
        part.copy(mesh.geometry.boundingBox!).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
        box.union(part);
    });
    const c = Math.cos(object.rotation.z), s = Math.sin(object.rotation.z), k = object.scale.x;
    const at = (lx: number, ly: number): Pt => ({ x: object.position.x + (lx * c - ly * s) * k, y: object.position.y + (lx * s + ly * c) * k });
    return { poly: [at(box.min.x, box.min.y), at(box.max.x, box.min.y), at(box.max.x, box.max.y), at(box.min.x, box.max.y)], zmin: box.min.z * k, zmax: box.max.z * k };
}

function separated(a: Pt[], b: Pt[]): boolean {
    for (const poly of [a, b]) for (let i = 0; i < 4; i++) {
        const p = poly[i], q = poly[(i + 1) % 4], nx = -(q.y - p.y), ny = q.x - p.x;
        const range = (pts: Pt[]) => { let lo = Infinity, hi = -Infinity; for (const t of pts) { const d = t.x * nx + t.y * ny; lo = Math.min(lo, d); hi = Math.max(hi, d); } return [lo, hi]; };
        const [a0, a1] = range(a), [b0, b1] = range(b);
        if (a1 <= b0 || b1 <= a0) return true;
    }
    return false;
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
    const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function inside(pt: Pt, poly: Pt[]): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        if ((poly[i].y > pt.y) !== (poly[j].y > pt.y) && pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) hit = !hit;
    }
    return hit;
}
function distanceToPath(poly: Pt[], path: Pt[]): number {
    let best = Infinity;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        for (let k = 0; k < 4; k++) {
            const e0 = poly[k], e1 = poly[(k + 1) % 4];
            if (segmentsCross(a, b, e0, e1)) return 0;
            best = Math.min(best, distanceToSegment(e0, a, b), distanceToSegment(a, e0, e1), distanceToSegment(b, e0, e1));
        }
        if (inside(a, poly)) return 0;
    }
    return best;
}

describe('city buildings', () => {
    const cases: Array<[TrainingProfile, number]> = [['city', 1], ['city', 7], ['city', 20261009], ['urban', 7], ['mixed', 11], ['hills', 9]];

    it.each(cases)('%s seed %i: buildings do not intersect each other or roads, and stand on the ground', (profile, seed) => {
        const terrain = createTrainingTerrain(profile, seed), layout = terrain.userData.trainingLayout as TrainingLayout;
        terrain.updateMatrixWorld(true);
        const items = terrain.children.filter(o => o.userData.presetSlot !== undefined && BUILDINGS.has(layout.objects[o.userData.presetSlot].type))
            .map(object => ({ object, prop: layout.objects[object.userData.presetSlot], ...footprint(object) }));
        expect(items.length).toBeGreaterThan(20);
        const problems: string[] = [];
        for (let i = 0; i < items.length; i++) {
            const a = items[i];
            for (let j = i + 1; j < items.length; j++) {
                const b = items[j];
                if (Math.hypot(a.prop.x - b.prop.x, a.prop.y - b.prop.y) < 80 && !separated(a.poly, b.poly)) problems.push(`${a.prop.type}~${b.prop.type}`);
            }
            for (const path of layout.paths) {
                if (path.kind !== 'road' && path.kind !== 'rail') continue;
                if (distanceToPath(a.poly, path.points) < path.width / 2 - .01) problems.push(`${a.prop.type} on ${path.id}`);
            }
            // Посадка: начало координат здания на рельефе; уходит ниже только цокольная юбка (до 0.3 м), над землёй ничего не висит.
            const ground = trainingHeightAt(layout, a.prop.x, a.prop.y);
            if (Math.abs(a.object.position.z - ground) > .1) problems.push(`${a.prop.type} z=${a.object.position.z} ground=${ground}`);
            if (a.zmin < -.3 || a.zmin > .05) problems.push(`${a.prop.type} base at ${a.zmin}`);
            const heights = a.poly.map(p => trainingHeightAt(layout, p.x, p.y));
            if (a.prop.type !== 'radio-mast' && Math.max(...heights) - Math.min(...heights) > .6) problems.push(`${a.prop.type} on a slope`);
        }
        expect(problems).toEqual([]);
    });

    it('residential facades are varied, deterministic and not cloned in a row', () => {
        const build = () => {
            const terrain = createTrainingTerrain('city', 7), layout = terrain.userData.trainingLayout as TrainingLayout;
            return layout.objects.filter(p => p.type === 'house' || p.type === 'building').map(p => `${p.type}:${p.variant}:${p.color}:${p.floors ?? 0}`);
        };
        const first = build();
        expect(build()).toEqual(first);
        const styles = new Set(first.map(s => s.split(':').slice(0, 2).join(':')));
        expect(styles.size).toBeGreaterThanOrEqual(6);
        // Соседние (по порядку обхода улицы) дома не бывают одной формы и цвета.
        let identical = 0;
        for (let i = 1; i < first.length; i++) if (first[i] === first[i - 1]) identical++;
        expect(identical).toBeLessThanOrEqual(Math.ceil(first.length * .03));
    });

    it('every type is realistic: floors of 3.0-3.5 m, 2-25 floors, plinth, door at ground level, roof above the walls', () => {
        for (const [variant, spec] of BLOCK_SPECS.entries()) {
            expect(spec.floorHeight).toBeGreaterThanOrEqual(3);
            expect(spec.floorHeight).toBeLessThanOrEqual(3.5);
            for (const floors of [spec.minFloors, spec.maxFloors]) {
                expect(floors).toBeGreaterThanOrEqual(2);
                expect(floors).toBeLessThanOrEqual(25);
                const block = createCityBlockMesh({ variant, floors, seed: 3 });
                const box = new THREE.Box3().setFromObject(block);
                expect(box.max.z).toBeGreaterThan(.45 + floors * spec.floorHeight);
                expect(box.min.z).toBeGreaterThanOrEqual(-.3);
                // Дверь: стена цвета двери от порога (0.45 м, уровень цоколя) до 2.2 м над ним.
                const door = new THREE.Color(0x2c3a45), colors = (block.getObjectByName('Фасад') as THREE.Mesh).geometry.attributes;
                let lo = Infinity, hi = -Infinity;
                for (let i = 0; i < colors.color.count; i++) {
                    if (Math.abs(colors.color.getX(i) - door.r) + Math.abs(colors.color.getY(i) - door.g) + Math.abs(colors.color.getZ(i) - door.b) < 1e-3) { lo = Math.min(lo, colors.position.getZ(i)); hi = Math.max(hi, colors.position.getZ(i)); }
                }
                expect(lo).toBeCloseTo(.45, 2);
                expect(hi - lo).toBeGreaterThan(2.1);
            }
        }
        for (const [variant, spec] of HOUSE_SPECS.entries()) {
            const house = createCityHouseMesh({ variant, seed: 3 });
            const box = new THREE.Box3().setFromObject(house);
            expect(box.max.z).toBeGreaterThan(.45 + spec.floors * 2.8 + .5);
            expect(Math.hypot(box.max.x - box.min.x, box.max.y - box.min.y) / 2).toBeLessThanOrEqual(spec.radius + .5);
        }
    });

    it('far stand-in and draw cost: three meshes per house, shared geometry for equal houses', () => {
        const a = createCityHouseMesh({ variant: 1, seed: 2 }), b = createCityHouseMesh({ variant: 1, seed: 2 });
        const meshes = (g: THREE.Object3D) => { const out: THREE.Mesh[] = []; g.traverse(n => { if ((n as THREE.Mesh).isMesh && !n.userData.lodProxy) out.push(n as THREE.Mesh); }); return out; };
        expect(meshes(a).length).toBeLessThanOrEqual(3);
        expect(meshes(a)[0].geometry).toBe(meshes(b)[0].geometry);
        expect(a.userData.lodProxy).toBeDefined();
    });

    describe('collider matches the visible shape (5 buildings, tolerance 0.2 m)', () => {
        const picks: Array<['block' | 'house', number, number]> = [['block', 0, 9], ['block', 1, 5], ['block', 3, 7], ['house', 0, 0], ['house', 2, 0], ['house', 1, 0], ['block', 4, 14]];
        const make = (kind: string, variant: number, floors: number) => kind === 'block' ? createCityBlockMesh({ variant, floors, seed: 1 }) : createCityHouseMesh({ variant, seed: 1 });

        it.each(picks)('%s %i: every visible vertex lies within 0.2 m of the collider, and the collider hugs the visible surface', (kind, variant, floors) => {
            const group = make(kind, variant, floors), boxes = group.userData.collisionBoxes as number[][];
            const distToBoxes = (p: THREE.Vector3) => Math.min(...boxes.map(b => {
                const dx = Math.max(b[0] - p.x, 0, p.x - b[3]), dy = Math.max(b[1] - p.y, 0, p.y - b[4]), dz = Math.max(b[2] - p.z, 0, p.z - b[5]);
                return Math.hypot(dx, dy, dz);
            }));
            const v = new THREE.Vector3();
            const surface: THREE.Triangle[] = [];
            group.traverse(node => {
                const mesh = node as THREE.Mesh;
                if (!mesh.isMesh || mesh.userData.lodProxy) return;
                const pos = mesh.geometry.attributes.position;
                for (let i = 0; i < pos.count; i += 3) surface.push(new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(pos, i), new THREE.Vector3().fromBufferAttribute(pos, i + 1), new THREE.Vector3().fromBufferAttribute(pos, i + 2)));
                for (let i = 0; i < pos.count; i++) {
                    v.fromBufferAttribute(pos, i);
                    // Тонкая внешняя мелочь (антенны, перекладины) твёрдой не считается; всё остальное обязано быть внутри коллайдера.
                    if (distToBoxes(v) > .2) throw new Error(`${kind} ${variant}: vertex ${v.toArray()} is ${distToBoxes(v)} outside the collider`);
                }
            });
            // Обратное направление: грань коллайдера, обращённая наружу, не уходит от видимой поверхности больше чем на 0.2 м.
            const closest = new THREE.Vector3();
            let worst = 0;
            for (const b of boxes) for (let n = 0; n < 40; n++) {
                const p = new THREE.Vector3(b[0] + (b[3] - b[0]) * Math.random(), b[1] + (b[4] - b[1]) * Math.random(), b[2] + (b[5] - b[2]) * Math.random());
                const face = n % 6, axis = face >> 1, sign = face & 1 ? 1 : -1;
                p.setComponent(axis, sign > 0 ? b[3 + axis] : b[axis]);
                // Грань, за которой сразу другая коробка, внутри дома: к видимой поверхности её не сравнивают.
                const out = p.clone(); out.setComponent(axis, p.getComponent(axis) + sign * 1e-3);
                if (boxes.some(o => out.x > o[0] && out.x < o[3] && out.y > o[1] && out.y < o[4] && out.z > o[2] && out.z < o[5])) continue;
                if (p.z < 0) continue;
                let best = Infinity;
                for (const t of surface) { t.closestPointToPoint(p, closest); best = Math.min(best, closest.distanceTo(p)); if (best < .05) break; }
                worst = Math.max(worst, best);
            }
            expect(worst).toBeLessThanOrEqual(.2);
        });

        it('the drone is stopped by a wall and by the eave of a pitched roof, and flies freely beside and above them', () => {
            const house = createCityHouseMesh({ variant: 0, seed: 1 });
            house.updateMatrixWorld(true);
            const hit = (x: number, y: number, z: number) => obstacleHasCollision(house, [new THREE.Vector3(x, y, z)]);
            const spec = HOUSE_SPECS[0];
            expect(hit(0, 0, 1.2)).toBe(true);                                // внутри стены
            expect(hit(0, -spec.depth / 2 - .1, 1.2)).toBe(true);             // в радиусе дрона от стены
            expect(hit(0, -spec.depth / 2 - .5, 1.2)).toBe(false);            // рядом с домом
            expect(hit(0, 0, .45 + 2.8 + 1.9 + .5)).toBe(false);              // над коньком
            expect(hit(0, -spec.depth / 2 - .1, .45 + 2.8 + 1.2)).toBe(false);   // над карнизом, под "невидимой" стеной коробки по коньку
        });
    });
});
