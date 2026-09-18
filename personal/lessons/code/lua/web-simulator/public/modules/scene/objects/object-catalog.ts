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
    for (const root of getSceneTopLevelObjects()) {
        if (root.uuid === id) return root;
        let match: THREE.Object3D | null = null;
        root.traverse((node) => {
            if (!match && node.uuid === id) match = node;
        });
        if (match) return match;
    }
    return null;
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

// Container objects (user groups, scene presets) nest real scene entities. A child counts as one
// only when it carries its own `userData.type`, which is what the `create*Mesh` factories stamp on
// the root of each prop - the decorative sub-meshes below that level stay out of the tree.
const MAX_TREE_DEPTH = 3;

function listChildEntities(obj: THREE.Object3D): THREE.Object3D[] {
    return obj.children.filter((child) => typeof child.userData?.type === 'string' && !!child.userData.type);
}

export function listSceneObjects(): any[] {
    const entries: any[] = [];
    const visit = (obj: THREE.Object3D, depth: number, parentId: string) => {
        const children = depth < MAX_TREE_DEPTH ? listChildEntities(obj) : [];
        entries.push(buildSceneEntry(obj, depth, parentId, children.length));
        for (const child of children) visit(child, depth + 1, obj.uuid);
    };
    for (const obj of getSceneTopLevelObjects()) visit(obj, 0, '');
    return entries;
}

function buildSceneEntry(obj: THREE.Object3D, depth: number, parentId: string, childCount: number): any {
    const selectedId = selectedObject ? selectedObject.uuid : '';
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
        label: obj.userData?.label ? String(obj.userData.label) : '',
        presetName: obj.userData?.presetName ? String(obj.userData.presetName) : '',
        depth,
        parentId,
        childCount,
        pointCount: points.length,
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
}
