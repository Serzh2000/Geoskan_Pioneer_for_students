import * as THREE from 'three';
import { MAX_PATH_POINTS, pathPoints, pathPointsVersion, simSettings } from '../core/state.js';
import { scene, droneTrails, is3DActive } from '../scene/core/scene-init.js';
import { log } from '../shared/logging/logger.js';

// Буфер вдвое больше видимого окна: новые точки дописываются в конец, и лишь
// когда места совсем не остаётся, последние MAX_PATH_POINTS точек одним
// copyWithin переезжают в начало буфера. Это раз в MAX_PATH_POINTS точек,
// а не на каждый кадр — амортизированная O(1)-запись на точку.
const RING_CAPACITY = MAX_PATH_POINTS * 2;

type TrailRingState = {
    sourceRef: typeof pathPoints[string] | null;
    lastVersion: number;
    writeIndex: number;
    visibleCount: number;
    lastColorHex: number;
    lastPointSize: number;
};

const ringStates: Record<string, TrailRingState> = {};

function getTracerColorHex() {
    const color = new THREE.Color(simSettings.tracerColor || '#38bdf8');
    return color.getHex();
}

function getTracerWidthPx() {
    return Math.max(1, Number(simSettings.tracerWidth) || 1);
}

function getTracerPointSize() {
    return Math.max(0.08, getTracerWidthPx() * 0.08);
}

function shouldShowTracerLine() {
    return simSettings.tracerShape === 'line' || simSettings.tracerShape === 'both';
}

function shouldShowTracerPoints() {
    return simSettings.tracerShape === 'points' || simSettings.tracerShape === 'both';
}

export function initTrailForDrone(id: string) {
    const lineGeometry = new THREE.BufferGeometry();
    log(`[3D-INIT] Инициализация трейла для ${id}`, 'info');

    const linePositions = new Float32Array(RING_CAPACITY * 3);
    const lineAttribute = new THREE.BufferAttribute(linePositions, 3);
    lineAttribute.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute('position', lineAttribute);
    lineGeometry.setDrawRange(0, 0);

    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(RING_CAPACITY * 3);
    const pointsAttribute = new THREE.BufferAttribute(positions, 3);
    pointsAttribute.setUsage(THREE.DynamicDrawUsage);
    pointsGeometry.setAttribute('position', pointsAttribute);
    pointsGeometry.setDrawRange(0, 0);

    const colorHex = getTracerColorHex();
    const pathMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
    });
    const path = new THREE.Line(lineGeometry, pathMat);
    // Трейл — чисто декоративная линия, никогда не выделяется и не кликается,
    // поэтому её bounding sphere никому не нужен: выключаем и фрустум-куллинг
    // (сфера для него не считается), и не вызываем computeBoundingSphere() в апдейте.
    path.frustumCulled = false;
    path.renderOrder = 9000;
    path.visible = false;
    path.matrixAutoUpdate = false;

    const particleMat = new THREE.PointsMaterial({
        color: colorHex,
        size: getTracerPointSize(),
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false
    });
    const particles = new THREE.Points(pointsGeometry, particleMat);
    particles.frustumCulled = false;
    particles.visible = false;
    particles.renderOrder = 8999;
    particles.matrixAutoUpdate = false;

    scene.add(path);
    scene.add(particles);

    droneTrails[id] = { path, particles, lineGeometry, pointsGeometry };
    log(`[3D-INIT] Трейл для ${id} готов`, 'info');
}

export function disposeTrailForDrone(id: string) {
    if (!droneTrails[id]) return;
    scene.remove(droneTrails[id].path);
    scene.remove(droneTrails[id].particles);
    droneTrails[id].lineGeometry.dispose();
    droneTrails[id].pointsGeometry.dispose();
    (droneTrails[id].path.material as THREE.LineBasicMaterial).dispose();
    (droneTrails[id].particles.material as THREE.PointsMaterial).dispose();
    delete droneTrails[id];
    delete ringStates[id];
}

function writePositions(target: Float32Array, pts: typeof pathPoints[string], srcOffset: number, destOffset: number, count: number) {
    for (let i = 0; i < count; i++) {
        const p = pts[srcOffset + i];
        const o = (destOffset + i) * 3;
        target[o] = p.x;
        target[o + 1] = p.y;
        target[o + 2] = p.z;
    }
}

function getRingState(id: string): TrailRingState {
    let state = ringStates[id];
    if (!state) {
        state = { sourceRef: null, lastVersion: 0, writeIndex: 0, visibleCount: 0, lastColorHex: -1, lastPointSize: -1 };
        ringStates[id] = state;
    }
    return state;
}

export function updateTrailForDrone(id: string) {
    if (!is3DActive || !droneTrails[id]) return;

    const trail = droneTrails[id];
    const pts = pathPoints[id] || [];

    if (!simSettings.showTracer || pts.length < 2) {
        trail.path.visible = false;
        trail.particles.visible = false;
        trail.lineGeometry.setDrawRange(0, 0);
        trail.pointsGeometry.setDrawRange(0, 0);
        return;
    }

    const state = getRingState(id);
    const version = pathPointsVersion[id] || 0;
    const linePos = trail.lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    const pointPos = trail.pointsGeometry.getAttribute('position') as THREE.BufferAttribute;

    if (state.sourceRef !== pts || version < state.lastVersion) {
        // Первый кадр для этого дрона или сброс pathPoints[id] (новый массив) —
        // окно ещё не строилось, дешёво перестраиваем целиком.
        const count = Math.min(pts.length, RING_CAPACITY);
        writePositions(linePos.array as Float32Array, pts, pts.length - count, 0, count);
        writePositions(pointPos.array as Float32Array, pts, pts.length - count, 0, count);
        linePos.addUpdateRange(0, count * 3);
        pointPos.addUpdateRange(0, count * 3);
        linePos.needsUpdate = true;
        pointPos.needsUpdate = true;

        state.sourceRef = pts;
        state.writeIndex = count;
        state.visibleCount = count;
        state.lastVersion = version;
    } else {
        const newCount = Math.min(version - state.lastVersion, pts.length);
        if (newCount > 0) {
            if (state.writeIndex + newCount > RING_CAPACITY) {
                const keep = state.visibleCount;
                const srcStart = (state.writeIndex - keep) * 3;
                (linePos.array as Float32Array).copyWithin(0, srcStart, state.writeIndex * 3);
                (pointPos.array as Float32Array).copyWithin(0, srcStart, state.writeIndex * 3);
                state.writeIndex = keep;
                linePos.addUpdateRange(0, keep * 3);
                pointPos.addUpdateRange(0, keep * 3);
                linePos.needsUpdate = true;
                pointPos.needsUpdate = true;
            }

            writePositions(linePos.array as Float32Array, pts, pts.length - newCount, state.writeIndex, newCount);
            writePositions(pointPos.array as Float32Array, pts, pts.length - newCount, state.writeIndex, newCount);
            linePos.addUpdateRange(state.writeIndex * 3, newCount * 3);
            pointPos.addUpdateRange(state.writeIndex * 3, newCount * 3);
            linePos.needsUpdate = true;
            pointPos.needsUpdate = true;

            state.writeIndex += newCount;
            state.visibleCount = Math.min(state.visibleCount + newCount, MAX_PATH_POINTS);
            state.lastVersion = version;
        }
    }

    const drawStart = state.writeIndex - state.visibleCount;
    trail.lineGeometry.setDrawRange(drawStart, state.visibleCount);
    trail.pointsGeometry.setDrawRange(drawStart, state.visibleCount);

    // Цвет/размер материала трогаем, только когда настройки трейсера реально
    // поменялись — .color.setHex() уже обновляет юниформ сам по себе,
    // needsUpdate тут не нужен (это флаг пересборки шейдерной программы).
    const colorHex = getTracerColorHex();
    if (colorHex !== state.lastColorHex) {
        (trail.path.material as THREE.LineBasicMaterial).color.setHex(colorHex);
        (trail.particles.material as THREE.PointsMaterial).color.setHex(colorHex);
        state.lastColorHex = colorHex;
    }

    const pointSize = getTracerPointSize();
    if (pointSize !== state.lastPointSize) {
        (trail.particles.material as THREE.PointsMaterial).size = pointSize;
        state.lastPointSize = pointSize;
    }

    trail.path.visible = shouldShowTracerLine();
    trail.particles.visible = shouldShowTracerPoints();
}
