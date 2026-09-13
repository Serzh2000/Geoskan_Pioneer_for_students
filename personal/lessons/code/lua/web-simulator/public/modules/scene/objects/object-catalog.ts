import * as THREE from 'three';
import { droneMeshes, selectedObject } from '../core/scene-init.js';
import { envGroup } from '../../environment/index.js';
import { type ScenePathPoint } from '../../environment/obstacles.js';
import { OBJECT_TYPE } from '../../shared/object-types.js';

export function formatPoints(points: ScenePathPoint[]) {
    return points.map((point) => `${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`).join('\n');
}

export function normalizePoints(points: unknown): ScenePathPoint[] {
    if (!Array.isArray(points)) return [];
    return points
        .map((point: any) => ({
            x: Number(point?.x),
            y: Number(point?.y),
            z: Number(point?.z ?? 0)
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
}

export function parsePointsText(pointsText: string) {
    const points = pointsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const values = line
                .split(/[;, ]+/)
                .map((value) => value.trim())
                .filter(Boolean)
                .map(Number);
            return {
                x: values[0],
                y: values[1],
                z: Number.isFinite(values[2]) ? values[2] : 0
            };
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    return points;
}

export function getSceneTopLevelObjects() {
    const objects: THREE.Object3D[] = [];
    for (const id in droneMeshes) {
        if (droneMeshes[id]) objects.push(droneMeshes[id]);
    }
    if (envGroup) objects.push(...envGroup.children);
    return objects;
}

export function findSceneObjectById(id: string) {
    return getSceneTopLevelObjects().find((obj) => obj.uuid === id) || null;
}

export function isTransformableObject(target: THREE.Object3D | null | undefined) {
    if (!target || !target.parent) return false;
    if (target.name === 'Ground' || target.userData?.type === OBJECT_TYPE.GROUND) return false;

    for (const id in droneMeshes) {
        if (target === droneMeshes[id]) return true;
    }

    if (target.userData?.isMarkerMap) return true;
    return !!target.userData?.draggable;
}

export function listSceneObjects(): any[] {
    const selectedId = selectedObject ? selectedObject.uuid : '';
    return getSceneTopLevelObjects().map((obj) => {
        let isDrone = false;
        for (const id in droneMeshes) {
            if (obj === droneMeshes[id]) isDrone = true;
        }
        const metaLines: string[] = [];
        if (obj.userData?.value !== undefined) metaLines.push(`Значение: ${obj.userData.value}`);
        if (obj.userData?.markerDictionaryLabel && !obj.userData?.isMarkerMap) {
            metaLines.push(`Словарь: ${obj.userData.markerDictionaryLabel}`);
        }
        if (obj.userData?.floors !== undefined) metaLines.push(`Этажей: ${obj.userData.floors}`);
        if (obj.userData?.featureKind === 'road') metaLines.push('Редактируемый маршрут: дорога');
        if (obj.userData?.featureKind === 'rail') metaLines.push('Редактируемый маршрут: железная дорога');
        if (obj.userData?.presetName) metaLines.push(`Пресет: ${obj.userData.presetName}`);
        if (Array.isArray(obj.userData?.windowIncidentsSummaryLines)) metaLines.push(...obj.userData.windowIncidentsSummaryLines);
        if (Array.isArray(obj.userData?.markerMapSummaryLines)) metaLines.push(...obj.userData.markerMapSummaryLines);

        const points = normalizePoints(obj.userData?.points);
        return {
            id: obj.uuid,
            name: obj.name || (obj.userData?.type || obj.type),
            sceneType: obj.userData?.type || obj.type,
            objectType: obj.type,
            draggable: !!obj.userData?.draggable,
            isDrone,
            selected: obj.uuid === selectedId,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            supportsValue: !!obj.userData?.supportsValue,
            supportsMarkerDictionary: !!obj.userData?.supportsMarkerDictionary,
            supportsPoints: !!obj.userData?.supportsPoints,
            floors: obj.userData?.floors !== undefined ? Number(obj.userData.floors) : undefined,
            markerKind: obj.userData?.markerKind ? String(obj.userData.markerKind) : '',
            markerDictionary: obj.userData?.markerDictionary ? String(obj.userData.markerDictionary) : '',
            value: obj.userData?.value !== undefined ? String(obj.userData.value) : '',
            pointsText: points.length ? formatPoints(points) : '',
            metaLines
        };
    });
}
