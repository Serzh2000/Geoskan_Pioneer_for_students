import * as THREE from 'three';
import { MAX_PATH_POINTS, pathPoints, simSettings } from '../core/state.js';
import { scene, droneTrails, is3DActive } from '../scene/core/scene-init.js';
import { log } from '../shared/logging/logger.js';

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

    const linePositions = new Float32Array(MAX_PATH_POINTS * 3);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setDrawRange(0, 0);

    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PATH_POINTS * 3);
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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
    path.frustumCulled = false;
    path.renderOrder = 9000;
    path.visible = false;

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
}

function writePositions(target: Float32Array, pts: typeof pathPoints[string]) {
    for (let i = 0; i < pts.length; i++) {
        target[i * 3] = pts[i].x;
        target[i * 3 + 1] = pts[i].y;
        target[i * 3 + 2] = pts[i].z;
    }
}

export function updateTrailForDrone(id: string) {
    if (!is3DActive || !droneTrails[id]) return;

    const pts = pathPoints[id] || [];
    const trail = droneTrails[id];

    if (simSettings.showTracer && pts.length > 1) {
        const linePositions = trail.lineGeometry.attributes.position.array as Float32Array;
        const pointPositions = trail.pointsGeometry.attributes.position.array as Float32Array;
        writePositions(linePositions, pts);
        writePositions(pointPositions, pts);
        trail.lineGeometry.setDrawRange(0, pts.length);
        trail.lineGeometry.attributes.position.needsUpdate = true;
        trail.lineGeometry.computeBoundingSphere();

        trail.pointsGeometry.setDrawRange(0, pts.length);
        trail.pointsGeometry.attributes.position.needsUpdate = true;

        const pathMat = trail.path.material as THREE.LineBasicMaterial;
        const particleMat = trail.particles.material as THREE.PointsMaterial;
        const colorHex = getTracerColorHex();
        pathMat.color.setHex(colorHex);
        pathMat.needsUpdate = true;
        particleMat.color.setHex(colorHex);
        particleMat.size = getTracerPointSize();
        particleMat.needsUpdate = true;

        trail.path.visible = shouldShowTracerLine();
        trail.particles.visible = shouldShowTracerPoints();
        trail.pointsGeometry.computeBoundingSphere();
        trail.path.updateMatrixWorld(true);
        trail.particles.updateMatrixWorld(true);
        return;
    }

    trail.path.visible = false;
    trail.particles.visible = false;
    trail.lineGeometry.setDrawRange(0, 0);
    trail.pointsGeometry.setDrawRange(0, 0);
}
