import * as THREE from 'three';
import { setCommonMeta, applyShadows } from './utils.js';

function createGrassClump(material: THREE.Material) {
    const group = new THREE.Group();
    
    // Генерируем 5-8 травинок в одном пучке для густоты
    const numBlades = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numBlades; i++) {
        // Разнообразные размеры: высота 0.12-0.25, ширина основания 0.01-0.025
        const height = 0.12 + Math.random() * 0.13;
        const radius = 0.01 + Math.random() * 0.015;
        
        // 3 грани для классического low-poly вида травы
        const bladeGeom = new THREE.ConeGeometry(radius, height, 3);
        // Сдвигаем геометрию так, чтобы точка вращения (pivot) была у основания
        bladeGeom.translate(0, height / 2, 0);
        
        const blade = new THREE.Mesh(bladeGeom, material);
        
        // Распределяем травинки по небольшому радиусу от центра
        const angle = (i / numBlades) * Math.PI * 2 + (Math.random() - 0.5);
        const dist = Math.random() * 0.04;
        blade.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
        
        // Оставляем травинки статичными, без дополнительного вращения вокруг осей.
        blade.rotation.order = 'ZYX';
        blade.rotation.z = 0;
        
        const lean = 0.1 + Math.random() * 0.35; // Угол отклонения
        blade.rotation.x = Math.PI / 2 + lean; // Поднимаем вертикально (+Z) и наклоняем
        blade.rotation.y = 0;

        group.add(blade);
    }

    return group;
}

export function createBushMesh(scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5d9732, roughness: 0.95 });
    const geom = new THREE.SphereGeometry(0.3 * scale, 8, 8);
    
    const p1 = new THREE.Mesh(geom, mat);
    p1.position.set(0, 0, 0.15 * scale);
    p1.scale.set(1, 1, 0.8);
    group.add(p1);
    
    const p2 = new THREE.Mesh(geom, mat);
    p2.scale.set(0.7, 0.7, 0.56);
    p2.position.set(0.18 * scale, 0.15 * scale, 0.1 * scale);
    group.add(p2);
    
    const p3 = new THREE.Mesh(geom, mat);
    p3.scale.set(0.8, 0.8, 0.64);
    p3.position.set(-0.15 * scale, -0.18 * scale, 0.08 * scale);
    group.add(p3);
    
    applyShadows(group);
    return group;
}

export function createHillMesh() {
    const group = setCommonMeta(new THREE.Group(), 'Холм', { collidableRadius: 2.2 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x73ab35, roughness: 0.98 });
    const grassLightMat = new THREE.MeshStandardMaterial({ color: 0xa8d652, roughness: 0.95 });
    const grassDarkMat = new THREE.MeshStandardMaterial({ color: 0x4f8127, roughness: 0.99 });

    const radius = 2.4;
    const height = 1.3;
    const points = [];
    
    // Создаем плавный профиль холма (S-образная кривая)
    for (let i = 24; i >= 0; i--) {
        const t = i / 24;
        const x = t * radius;
        const y = height * (Math.cos(t * Math.PI) + 1) / 2;
        points.push(new THREE.Vector2(x, y));
    }

    const hillGeometry = new THREE.LatheGeometry(points, 48);
    
    // Добавляем легкую органичную неровность, чтобы холм не был идеальным конусом
    const position = hillGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const vx = position.getX(i);
        const vy = position.getY(i);
        const vz = position.getZ(i);

        const angle = Math.atan2(vz, vx);
        const radiusDistortion = 1 + 0.06 * Math.cos(3 * angle) + 0.04 * Math.sin(5 * angle);

        position.setX(i, vx * radiusDistortion);
        position.setZ(i, vz * radiusDistortion);
    }
    
    hillGeometry.computeVertexNormals();

    const mound = new THREE.Mesh(hillGeometry, grassMat);
    mound.rotation.x = Math.PI / 2; // Поворачиваем, чтобы Y стал осью Z (вверх)
    group.add(mound);

    // Функция для расчета высоты холма в точке (x, y) локальной системы координат группы (где Z - верх)
    const getHillHeightAt = (x: number, y: number): number => {
        const angle = Math.atan2(y, x);
        const r_distorted = Math.hypot(x, y);
        const radiusDistortion = 1 + 0.06 * Math.cos(3 * angle) + 0.04 * Math.sin(5 * angle);
        const r_original = r_distorted / radiusDistortion;
        const t = r_original / radius;
        
        if (t > 1) return 0;
        return height * (Math.cos(t * Math.PI) + 1) / 2;
    };

    // Простая псевдослучайная функция
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    // 1. Процедурно высаживаем пучки травы (с более равномерным распределением)
    for (let i = 0; i < 45; i++) {
        const r = Math.sqrt(seededRandom(i * 10)) * radius * 0.95;
        const theta = seededRandom(i * 10 + 1) * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        const z = getHillHeightAt(x, y);

        const mat = seededRandom(i * 10 + 2) > 0.5 ? grassDarkMat : grassLightMat;
        const scale = 0.4 + seededRandom(i * 10 + 3) * 0.4;

        const clump = createGrassClump(mat);
        clump.position.set(x, y, z);
        clump.scale.setScalar(scale);
        clump.rotation.z = 0;
        
        group.add(clump);
    }

    // 2. Добавляем несколько кустов на склонах (вручную для лучшей композиции)
    const bushes = [
        { x: -0.8, y: -1.2, scale: 1.2 },
        { x: 1.2, y: 0.5, scale: 0.9 },
        { x: -0.3, y: 1.4, scale: 1.0 },
        { x: 0.4, y: -0.6, scale: 0.8 },
        { x: -1.5, y: 0.2, scale: 0.7 }
    ];
    
    bushes.forEach((b, i) => {
        const z = getHillHeightAt(b.x, b.y);
        const bush = createBushMesh(b.scale);
        bush.position.set(b.x, b.y, z - 0.05 * b.scale);
        bush.rotation.z = seededRandom(i * 20) * Math.PI * 2;
        group.add(bush);
    });

    // 3. Добавляем деревья у подножья или на нижнем склоне
    const trees = [
        { x: -1.3, y: 0.8, scale: 0.5, type: 'tree' },
        { x: 1.5, y: -0.7, scale: 0.6, type: 'fir' },
        { x: 0.9, y: 1.3, scale: 0.7, type: 'tree' }
    ];

    trees.forEach((t, i) => {
        const z = getHillHeightAt(t.x, t.y);
        const tree = t.type === 'tree' ? createTreeMesh(t.scale) : createFirTreeMesh();
        if (t.type === 'fir') tree.scale.setScalar(t.scale * 1.5);
        
        tree.position.set(t.x, t.y, z);
        tree.rotation.z = seededRandom(i * 30) * Math.PI * 2;
        group.add(tree);
    });

    applyShadows(group);
    return group;
}

export function createFirTreeMesh() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5b4636 })
    );
    trunk.position.z = 0.2;
    trunk.rotation.x = Math.PI / 2;
    group.add(trunk);

    for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.4 - i * 0.1, 0.6, 12),
            new THREE.MeshStandardMaterial({ color: 0x3a5f2b })
        );
        cone.position.z = 0.5 + i * 0.4;
        cone.rotation.x = Math.PI / 2;
        group.add(cone);
    }
    setCommonMeta(group, 'Ель', { collidableRadius: 0.4 });
    applyShadows(group);
    return group;
}

export function createTreeMesh(scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.9 * scale, 10),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 })
    );
    trunk.position.z = 0.45 * scale;
    trunk.rotation.x = Math.PI / 2;
    group.add(trunk);

    const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * scale, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 })
    );
    crown.position.z = 1.15 * scale;
    group.add(crown);

    setCommonMeta(group, 'Дерево', { collidableRadius: 0.5 * scale });
    applyShadows(group);
    return group;
}

export function createParkPatch(width: number, depth: number) {
    const group = new THREE.Group();
    const patch = new THREE.Mesh(
        new THREE.BoxGeometry(width, depth, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x9ad17b, roughness: 0.98 })
    );
    patch.position.z = 0.025;
    group.add(patch);
    return group;
}
