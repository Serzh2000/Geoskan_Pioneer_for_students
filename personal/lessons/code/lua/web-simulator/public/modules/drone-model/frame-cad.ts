import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import frameMainUrl from '../../assets/models/pioneer/reference/frame-full.stl?url';
import batteryPlateUrl from '../../assets/models/pioneer/reference/battery-bottom.stl?url';
import batteryEndPlateUrl from '../../assets/models/pioneer/reference/battery-end.stl?url';
import chassisTopUrl from '../../assets/models/pioneer/reference/chassis-top.stl?url';
import chassisBottomUrl from '../../assets/models/pioneer/reference/chassis-bottom.stl?url';
import guardArcUrl from '../../assets/models/pioneer/reference/guard-arc.stl?url';
import guardBraceUrl from '../../assets/models/pioneer/reference/guard-brace.stl?url';
import guardBridgeUrl from '../../assets/models/pioneer/reference/guard-bridge.stl?url';
import {
    CAD_MM_TO_SCENE_SCALE,
    CAD_PART_PLACEMENTS,
    GUARD_ARC_INNER_Y,
    GUARD_ARC_MID_X,
    GUARD_ARC_TARGETS,
    GUARD_BRACE_PLACEMENTS,
    GUARD_BRIDGE_PLACEMENTS,
    LANDING_GEAR_PART_PLACEMENTS,
    PlacementConfig,
    Vec3Tuple
} from './layout.js';

type Placement = {
    position: THREE.Vector3;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
};

const cadLoader = new STLLoader();
const cadGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

export async function buildCadAssembly(
    carbonMat: THREE.Material,
    landingGearMat: THREE.Material
) {
    const [
        frameMain,
        batteryPlate,
        batteryEndPlate,
        chassisTop,
        chassisBottom,
        guardArc,
        guardBrace,
        guardBridge
    ] = await Promise.all([
        loadCadGeometry(frameMainUrl),
        loadCadGeometry(batteryPlateUrl),
        loadCadGeometry(batteryEndPlateUrl),
        loadCadGeometry(chassisTopUrl),
        loadCadGeometry(chassisBottomUrl),
        loadCadGeometry(guardArcUrl, false),
        loadCadGeometry(guardBraceUrl, false),
        loadCadGeometry(guardBridgeUrl)
    ]);

    const assembly = new THREE.Group();
    assembly.name = 'pioneer_cad_frame';

    const standaloneParts = [
        { geometry: frameMain, config: CAD_PART_PLACEMENTS.mainFrame },
        { geometry: batteryPlate, config: CAD_PART_PLACEMENTS.lowerBatteryPlate },
        { geometry: batteryEndPlate, config: CAD_PART_PLACEMENTS.batteryBackPlate }
    ] satisfies Array<{ geometry: THREE.BufferGeometry; config: PlacementConfig }>;

    standaloneParts.forEach(({ geometry, config }) => {
        assembly.add(createCadMesh(geometry, carbonMat, toPlacement(config)));
    });

    assembly.add(createCadMesh(chassisTop, landingGearMat, toPlacement(LANDING_GEAR_PART_PLACEMENTS.top)));
    assembly.add(createCadMesh(chassisBottom, landingGearMat, toPlacement(LANDING_GEAR_PART_PLACEMENTS.bottom)));

    const guardMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        roughness: 0,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    assembly.add(buildCadGuardAssembly(guardArc, guardBrace, guardBridge, guardMat));

    return assembly;
}

function buildCadGuardAssembly(
    guardArc: THREE.BufferGeometry,
    guardBrace: THREE.BufferGeometry,
    guardBridge: THREE.BufferGeometry,
    guardMat: THREE.Material
) {
    const guardGroup = new THREE.Group();
    guardGroup.name = 'pioneer_cad_guard';

    GUARD_BRACE_PLACEMENTS.forEach((config) => {
        guardGroup.add(createCadMesh(guardBrace, guardMat, toPlacement(config)));
    });

    GUARD_ARC_TARGETS.forEach((config) => {
        guardGroup.add(createCadMesh(guardArc, guardMat, createArcPlacement(config)));
    });

    GUARD_BRIDGE_PLACEMENTS.forEach((config) => {
        guardGroup.add(createCadMesh(guardBridge, guardMat, toPlacement(config)));
    });

    return guardGroup;
}

function toPlacement(config: PlacementConfig): Placement {
    const rotation = config.rotation || [0, 0, 0];

    return {
        position: vec3(config.position),
        rotationX: rotation[0],
        rotationY: rotation[1],
        rotationZ: rotation[2]
    };
}

function createArcPlacement(config: PlacementConfig): Placement {
    const midpoint = vec3(config.position);
    const rotationZ = config.rotation?.[2] || 0;
    const localAnchor = new THREE.Vector3(GUARD_ARC_MID_X, GUARD_ARC_INNER_Y, 0);
    const worldOffset = localAnchor.clone().applyEuler(new THREE.Euler(0, 0, rotationZ));

    return {
        position: midpoint.clone().sub(worldOffset),
        rotationZ
    };
}

function vec3([x, y, z]: Vec3Tuple) {
    return new THREE.Vector3(x, y, z);
}

function createCadMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: Placement
) {
    const mesh = new THREE.Mesh(geometry.clone(), material);
    mesh.scale.setScalar(CAD_MM_TO_SCENE_SCALE);
    mesh.position.copy(options.position);
    mesh.rotation.x = options.rotationX || 0;
    mesh.rotation.y = options.rotationY || 0;
    mesh.rotation.z = options.rotationZ || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function loadCadGeometry(url: string, centerGeometry = true): Promise<THREE.BufferGeometry> {
    const cacheKey = `${url}|${centerGeometry ? 'center' : 'raw'}`;
    const cached = cadGeometryCache.get(cacheKey);
    if (cached) return cached;

    const next = fetch(url)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch CAD asset: ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then((buffer) => {
            const geometry = cadLoader.parse(buffer);
            geometry.computeVertexNormals();
            return centerGeometry ? centerCadGeometry(geometry) : geometry;
        });

    cadGeometryCache.set(cacheKey, next);
    return next;
}

function centerCadGeometry(source: THREE.BufferGeometry) {
    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return geometry;

    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.computeBoundingBox();
    return geometry;
}
