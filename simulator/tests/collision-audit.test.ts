import * as fs from 'node:fs';
import * as path from 'node:path';
import * as THREE from 'three';
import { NON_COLLIDABLE_TYPES, DRONE_COLLISION_RADIUS } from '../public/modules/physics/constants.js';

/*
 * Аудит коллизий: создаёт каждый объект каталога сцены и описывает область, по которой его видит физика
 * (physics/collisions.ts): что не твёрдое, какие коробки/меши считаются, насколько осевая коробка меша
 * (Box3.setFromObject) раздута по сравнению с его истинной ориентированной коробкой.
 * Отчёт пишется в docs/collision-audit.md; тест падает только если объект не удалось создать.
 */

const SLUGS = [
    'gate', 'fpv-cube', 'pylon', 'flag', 'building', 'aruco', 'apriltag', 'aruco-map', 'apriltag-map', 'road', 'rail',
    'hill', 'arena-hills', 'tree', 'forest-patch', 'settlement', 'transport', 'car', 'train', 'cargo', 'start-position',
    'heliport', 'charge-station', 'locus-beacon', 'light-tower', 'video-tower', 'control-station', 'arena-space',
    'pad-h', 'pad-charge', 'preset-race-track', 'preset-residential', 'preset-geoskan-arena'
];
const FLAT_SURFACE_MAX_TOP = 0.08;

let create: (type: string) => THREE.Object3D | null;

beforeAll(async () => {
    const g = globalThis as Record<string, any>;
    g.document = {
        createElement: () => ({ width: 0, height: 0, getContext: () => null, style: {}, append: () => {}, appendChild: () => {} }),
        documentElement: { dataset: {}, getAttribute: () => null },
        body: { dataset: {}, classList: { contains: () => false } }
    };
    g.window ??= {};
    g.window.addEventListener ??= () => {};
    g.window.removeEventListener ??= () => {};
    g.window.dispatchEvent ??= () => true;
    const env = await import('../public/modules/environment/index.js');
    create = (type) => env.createSceneObjectByType(type);
}, 120_000);

const f = (n: number) => n.toFixed(2);
const fmt = (b: THREE.Box3) => {
    const s = b.getSize(new THREE.Vector3());
    return `${f(s.x)}×${f(s.y)}×${f(s.z)} (z ${f(b.min.z)}…${f(b.max.z)})`;
};

type Row = { slug: string; type: string; mode: string; notes: string[] };

function describe_(slug: string, root: THREE.Object3D): Row {
    root.updateWorldMatrix(true, true);
    const type = String(root.userData?.type || root.name);
    const notes: string[] = [];
    let mode: string;

    if (type === 'Ворота') mode = 'своя форма: 2 стойки-капсулы + тор кольца';
    else if (type === 'FPV-куб') mode = 'своя форма: 4 рамки с проёмом + 4 ноги';
    else if (root.userData?.collidable === false || NON_COLLIDABLE_TYPES.has(type)) mode = 'НЕ твёрдый (пролёт насквозь)';
    else if (root.userData?.collisionBoxes) {
        const boxes = root.userData.collisionBoxes as number[][];
        mode = `collisionBoxes: ${boxes.length} шт.`;
        const u = new THREE.Box3();
        for (const b of boxes) u.union(new THREE.Box3(new THREE.Vector3(b[0], b[1], b[2]), new THREE.Vector3(b[3], b[4], b[5])));
        notes.push(`объединение коробок (локально): ${fmt(u)}`);
    } else mode = 'меши: осевая коробка каждого меша + 0.18 м';

    // Дети, которых физика пропускает или проверяет отдельно.
    const skippedKids = new Set<string>();
    const customKids = new Set<string>();
    let meshCount = 0, solidCount = 0, thinCount = 0, flatCount = 0, inflatedCount = 0;
    const solidBoxes = new THREE.Box3();
    const worst: { name: string; ratio: number; box: THREE.Box3 }[] = [];
    const visit = (node: THREE.Object3D, skipped: boolean) => {
        const t = String(node.userData?.type || '');
        const nodeSkipped = skipped || node.userData?.collidable === false || (node !== root && NON_COLLIDABLE_TYPES.has(t));
        if (node !== root && nodeSkipped && !skipped) skippedKids.add(t || node.name || 'без имени');
        if (node !== root && (t === 'Ворота' || t === 'FPV-куб')) customKids.add(t);
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && !mesh.userData.lodProxy) {
            meshCount++;
            const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const box = new THREE.Box3().setFromObject(mesh);
            if (nodeSkipped) { /* пропущен */ }
            else if (mat && 'opacity' in mat && (mat as any).opacity < 0.2) thinCount++;
            else if (box.isEmpty() || box.max.z <= FLAT_SURFACE_MAX_TOP) flatCount++;
            else {
                solidCount++;
                solidBoxes.union(box);
                mesh.geometry.computeBoundingBox();
                const gs = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
                const ws = mesh.getWorldScale(new THREE.Vector3());
                const obbVol = Math.max(1e-6, gs.x * ws.x * gs.y * ws.y * gs.z * ws.z);
                const bs = box.getSize(new THREE.Vector3());
                const ratio = (bs.x * bs.y * bs.z) / obbVol;
                if (ratio > 2 && bs.x * bs.y * bs.z > 0.05) { inflatedCount++; worst.push({ name: mesh.name || mesh.geometry.type, ratio, box }); }
            }
        }
        for (const child of node.children) visit(child, nodeSkipped);
    };
    if (!root.userData?.collisionBoxes) visit(root, false);

    if (mode.startsWith('меши')) {
        notes.push(`мешей: ${meshCount}; твёрдых: ${solidCount}; прозрачных (<0.2, пролёт): ${thinCount}; плоских (≤8 см, посадка): ${flatCount}`);
        if (solidCount) notes.push(`итоговая область столкновения: ${fmt(solidBoxes.clone().expandByScalar(DRONE_COLLISION_RADIUS))}`);
        else notes.push('твёрдых мешей нет → объект ПУСТОЙ для физики');
        if (inflatedCount) {
            worst.sort((a, b) => b.ratio - a.ratio);
            notes.push(`раздутых осевых коробок (×>2 к истинной): ${inflatedCount}; худшие: ${worst.slice(0, 3).map(w => `${w.name} ×${w.ratio.toFixed(1)} ${fmt(w.box)}`).join('; ')}`);
        }
    }
    if (skippedKids.size) notes.push(`пропущенные части: ${[...skippedKids].join(', ')}`);
    if (customKids.size) notes.push(`части со своей формой: ${[...customKids].join(', ')}`);
    const whole = new THREE.Box3().setFromObject(root);
    if (!whole.isEmpty()) notes.push(`видимый габарит: ${fmt(whole)}`);
    return { slug, type, mode, notes };
}

test('аудит областей коллизии всех объектов каталога', () => {
    const rows: Row[] = [];
    const failed: string[] = [];
    for (const slug of SLUGS) {
        try {
            const obj = create(slug);
            if (!obj) { failed.push(slug); continue; }
            rows.push(describe_(slug, obj));
        } catch (e) {
            failed.push(`${slug}: ${(e as Error).message}`);
        }
    }
    const lines = ['# Аудит коллизий объектов сцены', '',
        'Сгенерировано тестом `tests/collision-audit.test.ts`. Радиус дрона для коллизий: ' + DRONE_COLLISION_RADIUS + ' м.', ''];
    for (const r of rows) {
        lines.push(`## ${r.type} (\`${r.slug}\`)`, `- Режим: ${r.mode}`, ...r.notes.map(n => `- ${n}`), '');
    }
    // Учебные карты: из чего состоят и как каждый тип реквизита виден физике.
    for (const profile of ['field', 'forest', 'hills', 'urban', 'industrial', 'markers', 'mixed', 'city']) {
        try {
            const map = create(`training-${profile}`);
            if (!map) continue;
            map.updateWorldMatrix(true, true);
            const byType = new Map<string, { n: number; mode: string; size: THREE.Box3 }>();
            let treeBatches = 0;
            for (const child of map.children) {
                if (child.userData?.trainingTrees) treeBatches++;
                const t = String(child.userData?.type || child.name || 'без имени');
                const mode = child.userData?.collidable === false ? 'не твёрдый'
                    : child.userData?.trainingGround ? 'рельеф (высота по карте, склон = стена)'
                    : child.userData?.trainingTrees ? 'деревья: вертикальные цилиндры'
                    : child.userData?.collisionBoxes ? `collisionBoxes (${(child.userData.collisionBoxes as unknown[]).length})`
                    : NON_COLLIDABLE_TYPES.has(t) ? 'не твёрдый (тип)' : 'меши (осевые коробки)';
                const e = byType.get(t) ?? { n: 0, mode, size: new THREE.Box3() };
                e.n++;
                if (child.children.length || (child as THREE.Mesh).isMesh) {
                    const b = new THREE.Box3().setFromObject(child);
                    if (!b.isEmpty() && b.getSize(new THREE.Vector3()).length() < 80) e.size.union(b);
                }
                byType.set(t, e);
            }
            lines.push(`## Учебная карта «${profile}»`, `- прямых потомков: ${map.children.length}; батчей деревьев: ${treeBatches}`);
            for (const [t, e] of byType) lines.push(`- ${t} ×${e.n}: ${e.mode}`);
            lines.push('');
        } catch (e) {
            failed.push(`training-${profile}: ${(e as Error).message}`);
        }
    }
    if (failed.length) lines.push('## Не удалось создать', ...failed.map(x => `- ${x}`));
    fs.writeFileSync(path.join(process.cwd(), 'docs', 'collision-audit.md'), lines.join('\n'));
    expect(failed).toEqual([]);
}, 120_000);
