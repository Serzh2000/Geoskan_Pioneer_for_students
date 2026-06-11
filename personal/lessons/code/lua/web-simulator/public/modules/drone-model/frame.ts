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
    BATTERY_COMPONENTS_Z_OFFSET,
    CAD_MM_TO_SCENE_SCALE,
    CAD_PART_PLACEMENTS,
    FRAME_COMPONENTS_Z_OFFSET,
    GUARD_Z,
    GUARD_ARC_INNER_Y,
    GUARD_ARC_MID_X,
    GUARD_ARC_TARGETS,
    GUARD_BRACE_PLACEMENTS,
    GUARD_BRIDGE_PLACEMENTS,
    LANDING_GEAR_PART_PLACEMENTS,
    PlacementConfig,
    Vec3Tuple
} from './layout.js';

const cadLoader = new STLLoader();
const cadGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

type Placement = {
    position: THREE.Vector3;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
};


export function createFrame(carbonMat: THREE.Material, pcbMat: THREE.Material, plasticMat: THREE.Material) {
    const frameGroup = new THREE.Group();
    const fallbackStructure = createFallbackStructure(carbonMat);
    const fallbackLegs = createLegs(carbonMat);
    const fallbackGuard = createGuard();

    frameGroup.add(fallbackStructure);
    frameGroup.add(createElectronicsStack(pcbMat));
    frameGroup.add(createBatteryVolume());
    frameGroup.add(fallbackLegs);
    frameGroup.add(fallbackGuard);

    void attachCadAssembly(frameGroup, fallbackStructure, fallbackLegs, fallbackGuard, carbonMat, plasticMat);
    return frameGroup;
}

async function attachCadAssembly(
    frameGroup: THREE.Group,
    fallbackStructure: THREE.Group,
    fallbackLegs: THREE.Group,
    fallbackGuard: THREE.Group,
    carbonMat: THREE.Material,
    plasticMat: THREE.Material
) {
    try {
        const cadAssembly = await buildCadAssembly(carbonMat, plasticMat);
        fallbackStructure.visible = false;
        fallbackLegs.visible = false;
        fallbackGuard.visible = false;
        frameGroup.add(cadAssembly);
    } catch (error) {
        console.warn('[DroneModel] Failed to assemble Pioneer CAD frame from STL assets.', error);
    }
}

async function buildCadAssembly(carbonMat: THREE.Material, landingGearMat: THREE.Material) {
    const [frameMain, batteryPlate, batteryEndPlate, chassisTop, chassisBottom, guardArc, guardBrace, guardBridge] = await Promise.all([
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

    // Placement algorithm for the CAD assembly:
    // 1. Read coordinates from the config block at the top of the file.
    // 2. Place standalone parts directly by their world position and rotation.
    // 3. Place guard parts from their own explicit config arrays.
    const standaloneParts = [
        { geometry: frameMain, config: CAD_PART_PLACEMENTS.mainFrame },
        { geometry: batteryPlate, config: CAD_PART_PLACEMENTS.lowerBatteryPlate },
        { geometry: batteryEndPlate, config: CAD_PART_PLACEMENTS.batteryBackPlate }
    ] satisfies Array<{ geometry: THREE.BufferGeometry; config: PlacementConfig }>;

    standaloneParts.forEach(({ geometry, config }) => {
        assembly.add(createCadMesh(geometry, carbonMat, toPlacement(config)));
    });

    // The landing gear STLs are thin plates that should stay vertical.
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
        const brace = createCadMesh(guardBrace, guardMat, toPlacement(config));
        guardGroup.add(brace);
    });

    GUARD_ARC_TARGETS.forEach((config) => {
        const arc = createCadMesh(guardArc, guardMat, createArcPlacement(config));
        guardGroup.add(arc);
    });

    GUARD_BRIDGE_PLACEMENTS.forEach((config) => {
        const bridge = createCadMesh(guardBridge, guardMat, toPlacement(config));
        guardGroup.add(bridge);
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
    // `guardArc` STL uses its own local anchor, so we rotate that anchor first
    // and then subtract it from the target midpoint in world space.
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
    options: {
        position: THREE.Vector3;
        rotationX?: number;
        rotationY?: number;
        rotationZ?: number;
    }
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

function createFallbackStructure(carbonMat: THREE.Material) {
    const group = new THREE.Group();
    group.name = 'pioneer_fallback_structure';

    const plateGeom = new THREE.BoxGeometry(0.14, 0.14, 0.002);
    const bottomPlate = new THREE.Mesh(plateGeom, carbonMat);
    bottomPlate.position.z = -0.015 + FRAME_COMPONENTS_Z_OFFSET;
    bottomPlate.castShadow = true;
    group.add(bottomPlate);

    const topPlate = new THREE.Mesh(plateGeom, carbonMat);
    topPlate.position.z = 0.035 + FRAME_COMPONENTS_Z_OFFSET;
    topPlate.castShadow = true;
    group.add(topPlate);

    const armGeom = new THREE.BoxGeometry(0.45, 0.03, 0.005);
    const arm1 = new THREE.Mesh(armGeom, carbonMat);
    arm1.rotation.z = Math.PI / 4;
    arm1.castShadow = true;
    group.add(arm1);

    const arm2 = new THREE.Mesh(armGeom, carbonMat);
    arm2.rotation.z = -Math.PI / 4;
    arm2.castShadow = true;
    group.add(arm2);

    return group;
}

function createElectronicsStack(pcbMat: THREE.Material) {
    const stackGroup = new THREE.Group();
    const pcbGeom = new THREE.BoxGeometry(0.06, 0.06, 0.002);
    const pcb1 = new THREE.Mesh(pcbGeom, pcbMat);
    pcb1.position.z = 0.005 + FRAME_COMPONENTS_Z_OFFSET;
    pcb1.castShadow = true;
    stackGroup.add(pcb1);

    const pcb2 = new THREE.Mesh(pcbGeom, pcbMat);
    pcb2.position.z = 0.025 + FRAME_COMPONENTS_Z_OFFSET;
    pcb2.castShadow = true;
    stackGroup.add(pcb2);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const chipGeom = new THREE.BoxGeometry(0.02, 0.02, 0.005);
    const chip = new THREE.Mesh(chipGeom, blackMat);
    chip.position.z = 0.028 + FRAME_COMPONENTS_Z_OFFSET;
    stackGroup.add(chip);

    const redCompGeom = new THREE.BoxGeometry(0.015, 0.008, 0.008);
    const redPositions = [
        [0.02, 0.01, 0.03],
        [0.02, -0.01, 0.03],
        [-0.02, 0.01, 0.03],
        [-0.02, -0.01, 0.03]
    ];
    redPositions.forEach((position) => {
        const component = new THREE.Mesh(redCompGeom, redMat);
        component.position.set(position[0], position[1], position[2] + FRAME_COMPONENTS_Z_OFFSET);
        stackGroup.add(component);
    });

    return stackGroup;
}

function createBatteryVolume() {
    const batGeom = new THREE.BoxGeometry(0.08, 0.035, 0.02);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const battery = new THREE.Mesh(batGeom, batMat);
    battery.position.z = -0.026 + BATTERY_COMPONENTS_Z_OFFSET;
    battery.castShadow = true;
    return battery;
}

function createLegs(mat: THREE.Material) {
    const legGroup = new THREE.Group();
    
    // Blade-like leg geometry
    const legGeom = new THREE.BoxGeometry(0.12, 0.015, 0.002);
    
    const offsets = [
        [0.05, 0.05], [0.05, -0.05], [-0.05, 0.05], [-0.05, -0.05]
    ];

    offsets.forEach(offset => {
        const pivot = new THREE.Group();
        pivot.position.set(offset[0], offset[1], -0.015 + FRAME_COMPONENTS_Z_OFFSET);
        pivot.rotation.z = Math.atan2(offset[1], offset[0]);

        const mesh = new THREE.Mesh(legGeom, mat);
        // Pivot point at one end, mesh extends down and out
        mesh.position.set(0.045, 0, -0.05);
        mesh.rotation.y = 1.0; // About 57 degrees
        
        pivot.add(mesh);
        legGroup.add(pivot);
    });

    return legGroup;
}

function createGuard() {
    const guardGroup = new THREE.Group();
    const guardMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.2, 
        roughness: 0, 
        metalness: 0.2,
        side: THREE.DoubleSide
    });

    const armLen = 0.16;
    const ringRadius = 0.12;
    
    // We'll use 4 overlapping rings to form the clover shape.
    const ringGeom = new THREE.TorusGeometry(ringRadius, 0.005, 8, 32);
    const guardColumnCenterZ = GUARD_Z - 0.02;
    const offsets = [
        [armLen, -armLen],
        [-armLen, armLen],
        [armLen, armLen],
        [-armLen, -armLen]
    ];

    offsets.forEach(offset => {
        const ring = new THREE.Mesh(ringGeom, guardMat);
        ring.position.set(offset[0], offset[1], GUARD_Z);
        guardGroup.add(ring);

        // Add 4 spokes (ribs) per ring
        for(let i=0; i<4; i++) {
            const spokeGeom = new THREE.BoxGeometry(ringRadius, 0.002, 0.002);
            const spoke = new THREE.Mesh(spokeGeom, guardMat);
            const angle = i * Math.PI / 2;
            spoke.position.set(
                offset[0] + Math.cos(angle) * ringRadius/2,
                offset[1] + Math.sin(angle) * ringRadius/2,
                GUARD_Z
            );
            spoke.rotation.z = angle;
            guardGroup.add(spoke);
        }
        
        // Vertical support columns
        const colGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8);
        [0, Math.PI/2, Math.PI, 3*Math.PI/2].forEach(angle => {
            const col = new THREE.Mesh(colGeom, guardMat);
            col.position.set(
                offset[0] + Math.cos(angle) * ringRadius * 0.9,
                offset[1] + Math.sin(angle) * ringRadius * 0.9,
                guardColumnCenterZ
            );
            col.rotation.x = Math.PI / 2;
            guardGroup.add(col);
        });
    });

    // Connecting bridges between the clover leaves
    const bridgeGeom = new THREE.BoxGeometry(0.08, 0.01, 0.005);
    const bridges = [
        { x: armLen, y: 0, rot: Math.PI/2 },
        { x: -armLen, y: 0, rot: Math.PI/2 },
        { x: 0, y: armLen, rot: 0 },
        { x: 0, y: -armLen, rot: 0 }
    ];
    bridges.forEach(b => {
        const bridge = new THREE.Mesh(bridgeGeom, guardMat);
        bridge.position.set(b.x, b.y, GUARD_Z);
        bridge.rotation.z = b.rot;
        guardGroup.add(bridge);
    });

    return guardGroup;
}
