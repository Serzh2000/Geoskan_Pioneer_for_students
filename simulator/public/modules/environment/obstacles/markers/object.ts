import * as THREE from 'three';
import { MARKER_DICTIONARIES, MarkerDictionaryId } from '../marker-dictionaries.js';
import { applyShadows, setCommonMeta } from '../utils.js';
import { createMarkerTexture } from './texture.js';
import {
    getDictionaryDefinition,
    MARKER_SHEET_NAME,
    MarkerKind,
    normalizeMarkerValue,
    SHEET_SIZE,
    SHEET_THICKNESS
} from './shared.js';

function applyMarkerMetadata(group: THREE.Group, kind: MarkerKind, dictionaryId: MarkerDictionaryId, value: string) {
    const definition = MARKER_DICTIONARIES[dictionaryId];
    const normalizedValue = normalizeMarkerValue(kind, dictionaryId, value);
    group.userData.value = normalizedValue;
    group.userData.markerDictionary = dictionaryId;
    group.userData.markerDictionaryLabel = definition.label;
    group.userData.markerKind = kind;
    group.userData.supportsMarkerDictionary = true;
    group.userData.surfaceAttached = true;
    group.name = `${group.userData.type} ${definition.label} #${normalizedValue}`;
}

export function createMarkerMeshForMap(kind: MarkerKind, value = '0', dictionaryId?: string) {
    const { dictionaryId: normalizedDictionaryId } = getDictionaryDefinition(kind, dictionaryId);
    const group = setCommonMeta(new THREE.Group(), kind === 'ArUco' ? 'ArUco маркер' : 'AprilTag маркер', {
        supportsValue: true,
        supportsMarkerDictionary: true,
        value,
        collidableRadius: 0.42,
        markerKind: kind
    });

    applyMarkerMetadata(group, kind, normalizedDictionaryId, value);

    const texture = createMarkerTexture(kind, normalizedDictionaryId, group.userData.value as string);
    const frontMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.94,
        metalness: 0.01
    });
    const backMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.96,
        metalness: 0.01
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.98,
        metalness: 0
    });

    const sheet = new THREE.Mesh(
        new THREE.BoxGeometry(SHEET_SIZE, SHEET_SIZE, SHEET_THICKNESS),
        [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, frontMaterial, backMaterial]
    );
    sheet.name = MARKER_SHEET_NAME;
    group.add(sheet);

    applyShadows(group);
    return group;
}

export function createArucoMarkerMesh(value = '0', dictionaryId?: string) {
    return createMarkerMeshForMap('ArUco', value, dictionaryId);
}

export function createAprilTagMarkerMesh(value = '0', dictionaryId?: string) {
    return createMarkerMeshForMap('AprilTag', value, dictionaryId);
}

export function isMarkerObject(object: THREE.Object3D) {
    return object.userData?.markerKind === 'ArUco' || object.userData?.markerKind === 'AprilTag';
}

function updateMarkerMaterials(sheet: THREE.Mesh, kind: MarkerKind, dictionaryId: MarkerDictionaryId, value: string) {
    if (!Array.isArray(sheet.material)) return;
    const texturedMaterials = sheet.material.filter(
        (material, index) => (index === 4 || index === 5) && material instanceof THREE.MeshStandardMaterial
    ) as THREE.MeshStandardMaterial[];
    const mapsToDispose = new Set<THREE.Texture>();
    texturedMaterials.forEach((material) => {
        if (material.map) mapsToDispose.add(material.map);
    });
    mapsToDispose.forEach((map) => map.dispose());

    const texture = createMarkerTexture(kind, dictionaryId, value);
    texturedMaterials.forEach((material) => {
        material.map = texture;
        material.needsUpdate = true;
    });
}

export function updateMarkerValue(
    object: THREE.Object3D,
    params: { value?: string; dictionaryId?: string }
) {
    const group = object as THREE.Group;
    if (!group.userData.supportsValue || !isMarkerObject(group)) return false;

    const kind = group.userData.markerKind === 'AprilTag' ? 'AprilTag' : 'ArUco';
    const { dictionaryId } = getDictionaryDefinition(kind, params.dictionaryId || String(group.userData.markerDictionary || ''));
    const normalizedValue = normalizeMarkerValue(kind, dictionaryId, params.value ?? String(group.userData.value ?? '0'));
    applyMarkerMetadata(group, kind, dictionaryId, normalizedValue);

    const sheet = group.children.find((child) => child.name === MARKER_SHEET_NAME) as THREE.Mesh | undefined;
    if (sheet) {
        updateMarkerMaterials(sheet, kind, dictionaryId, normalizedValue);
    }
    return true;
}
