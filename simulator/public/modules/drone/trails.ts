import * as THREE from 'three';
import { MAX_PATH_POINTS, pathPoints, pathPointsVersion, simSettings } from '../core/state.js';
import { scene, droneTrails, is3DActive } from '../scene/core/scene-init.js';
import { markEditorOnly } from '../scene/core/editor-overlays.js';
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
    /** The dotted trail: a dot only every few decimetres of flown path, kept apart from the dense line samples. */
    dots: Array<{ x: number; y: number; z: number }>;
    dotSpacing: number;
};

const MAX_DOTS = 1500;

const ringStates: Record<string, TrailRingState> = {};

function getTracerColorHex() {
    const color = new THREE.Color(simSettings.tracerColor || '#38bdf8');
    return color.getHex();
}

function getTracerWidthPx() {
    return Math.max(1, Number(simSettings.tracerWidth) || 1);
}

/** Dot diameter in metres. */
function getTracerPointSize() {
    return Math.max(0.05, getTracerWidthPx() * 0.04);
}

/**
 * Distance between dots. The path is sampled every 0.05 s of simulated flight, i.e. a few centimetres apart, which
 * closes any dot into a solid line; a dotted trail needs a gap of several dot widths.
 */
function getTracerDotSpacing() {
    return Math.max(0.2, getTracerPointSize() * 4);
}

let dotTexture: THREE.CanvasTexture | null = null;
/** A soft-edged white disc: points are squares unless they carry a round sprite. */
function getDotTexture() {
    if (dotTexture) return dotTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    dotTexture = new THREE.CanvasTexture(canvas);
    return dotTexture;
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
        map: getDotTexture(),
        alphaTest: 0.5,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        toneMapped: false
    });
    const particles = new THREE.Points(pointsGeometry, particleMat);
    particles.frustumCulled = false;
    particles.visible = false;
    particles.renderOrder = 8999;
    particles.matrixAutoUpdate = false;

    // След полёта — подсказка редактора, камера дрона его не видит.
    scene.add(markEditorOnly(path));
    scene.add(markEditorOnly(particles));

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
        state = { sourceRef: null, lastVersion: 0, writeIndex: 0, visibleCount: 0, lastColorHex: -1, lastPointSize: -1, dots: [], dotSpacing: 0 };
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
    // Points scheduled for the dotted trail by this update: everything on a rebuild, only the new samples otherwise.
    let dotCandidates: typeof pts = [];

    if (state.sourceRef !== pts || version < state.lastVersion) {
        // Первый кадр для этого дрона или сброс pathPoints[id] (новый массив) —
        // окно ещё не строилось, дешёво перестраиваем целиком.
        const count = Math.min(pts.length, RING_CAPACITY);
        writePositions(linePos.array as Float32Array, pts, pts.length - count, 0, count);
        linePos.addUpdateRange(0, count * 3);
        linePos.needsUpdate = true;
        state.dots = [];
        dotCandidates = pts;

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
                state.writeIndex = keep;
                linePos.addUpdateRange(0, keep * 3);
                linePos.needsUpdate = true;
            }

            writePositions(linePos.array as Float32Array, pts, pts.length - newCount, state.writeIndex, newCount);
            linePos.addUpdateRange(state.writeIndex * 3, newCount * 3);
            linePos.needsUpdate = true;
            dotCandidates = pts.slice(pts.length - newCount);

            state.writeIndex += newCount;
            state.visibleCount = Math.min(state.visibleCount + newCount, MAX_PATH_POINTS);
            state.lastVersion = version;
        }
    }

    const drawStart = state.writeIndex - state.visibleCount;
    trail.lineGeometry.setDrawRange(drawStart, state.visibleCount);

    // Dots: a new one only after the drone has flown `spacing` metres from the last; a changed size rebuilds them all.
    const spacing = getTracerDotSpacing();
    if (spacing !== state.dotSpacing) {
        state.dotSpacing = spacing;
        state.dots = [];
        dotCandidates = pts;
    }
    if (dotCandidates.length) {
        let added = false;
        for (const point of dotCandidates) {
            const last = state.dots[state.dots.length - 1];
            if (last && Math.hypot(point.x - last.x, point.y - last.y, point.z - last.z) < spacing) continue;
            state.dots.push({ x: point.x, y: point.y, z: point.z });
            added = true;
        }
        if (state.dots.length > MAX_DOTS) state.dots.splice(0, state.dots.length - MAX_DOTS);
        if (added || state.dots.length !== trail.pointsGeometry.drawRange.count) {
            const array = pointPos.array as Float32Array;
            for (let i = 0; i < state.dots.length; i += 1) {
                array[i * 3] = state.dots[i].x;
                array[i * 3 + 1] = state.dots[i].y;
                array[i * 3 + 2] = state.dots[i].z;
            }
            pointPos.addUpdateRange(0, state.dots.length * 3);
            pointPos.needsUpdate = true;
            trail.pointsGeometry.setDrawRange(0, state.dots.length);
        }
    }

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
