import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import frameMainUrl from '../../assets/models/pioneer/reference/frame-full.stl?url';
import batteryPlateUrl from '../../assets/models/pioneer/reference/battery-bottom.stl?url';
import batteryEndPlateUrl from '../../assets/models/pioneer/reference/battery-end.stl?url';
import motorClampUrl from '../../assets/models/pioneer/reference/motor-clamp-ref.stl?url';
import guardArcUrl from '../../assets/models/pioneer/reference/guard-arc.stl?url';
import guardBraceUrl from '../../assets/models/pioneer/reference/guard-brace.stl?url';
import guardBridgeUrl from '../../assets/models/pioneer/reference/guard-bridge.stl?url';

const CAD_MM_TO_SCENE_SCALE = 0.002;
const MOTOR_ARM_OFFSET = 79.675 * CAD_MM_TO_SCENE_SCALE;
const MOTOR_CLAMP_CENTER_TO_MOUNT_OFFSET = (15.491 - 12.5) * CAD_MM_TO_SCENE_SCALE;
const MOTOR_CLAMP_Z = 0;
const GUARD_Z = 0.04;
const GUARD_ARC_MID_X = 62.815 * CAD_MM_TO_SCENE_SCALE;
const GUARD_ARC_INNER_Y = 37.183 * CAD_MM_TO_SCENE_SCALE;
const MOTOR_OFFSETS = [
    [MOTOR_ARM_OFFSET, -MOTOR_ARM_OFFSET],
    [-MOTOR_ARM_OFFSET, MOTOR_ARM_OFFSET],
    [MOTOR_ARM_OFFSET, MOTOR_ARM_OFFSET],
    [-MOTOR_ARM_OFFSET, -MOTOR_ARM_OFFSET]
] as const;

const cadLoader = new STLLoader();
const cadGeometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

export function createFrame(carbonMat: THREE.Material, pcbMat: THREE.Material, plasticMat: THREE.Material) {
    const frameGroup = new THREE.Group();
    const fallbackStructure = createFallbackStructure(carbonMat);
    const fallbackGuard = createGuard();

    frameGroup.add(fallbackStructure);
    frameGroup.add(createElectronicsStack(pcbMat));
    frameGroup.add(createBatteryVolume());
    frameGroup.add(createLegs(carbonMat));
    frameGroup.add(fallbackGuard);

    void attachCadAssembly(frameGroup, fallbackStructure, fallbackGuard, carbonMat, plasticMat);
    return frameGroup;
}

async function attachCadAssembly(
    frameGroup: THREE.Group,
    fallbackStructure: THREE.Group,
    fallbackGuard: THREE.Group,
    carbonMat: THREE.Material,
    plasticMat: THREE.Material
) {
    try {
        const cadAssembly = await buildCadAssembly(carbonMat, plasticMat);
        fallbackStructure.visible = false;
        fallbackGuard.visible = false;
        frameGroup.add(cadAssembly);
    } catch (error) {
        console.warn('[DroneModel] Failed to assemble Pioneer CAD frame from STL assets.', error);
    }
}

async function buildCadAssembly(carbonMat: THREE.Material, plasticMat: THREE.Material) {
    const [frameMain, batteryPlate, batteryEndPlate, motorClamp, guardArc, guardBrace, guardBridge] = await Promise.all([
        loadCadGeometry(frameMainUrl),
        loadCadGeometry(batteryPlateUrl),
        loadCadGeometry(batteryEndPlateUrl),
        loadCadGeometry(motorClampUrl),
        loadCadGeometry(guardArcUrl, false),
        loadCadGeometry(guardBraceUrl, false),
        loadCadGeometry(guardBridgeUrl)
    ]);

    const assembly = new THREE.Group();
    assembly.name = 'pioneer_cad_frame';

    const mainFrame = createCadMesh(frameMain, carbonMat, {
        position: new THREE.Vector3(0, 0, 0.004),
        rotationX: Math.PI / 2
    });
    assembly.add(mainFrame);

    const lowerBatteryPlate = createCadMesh(batteryPlate, carbonMat, {
        position: new THREE.Vector3(0, 0, -0.031),
        rotationX: Math.PI / 2
    });
    assembly.add(lowerBatteryPlate);

    const batteryBackPlate = createCadMesh(batteryEndPlate, carbonMat, {
        position: new THREE.Vector3(0, -0.056, -0.03)
    });
    assembly.add(batteryBackPlate);

    MOTOR_OFFSETS.forEach(([x, y]) => {
        const clampRotation = Math.atan2(y, x) + Math.PI / 2;
        const clampPosition = new THREE.Vector3(
            x - Math.sin(clampRotation) * MOTOR_CLAMP_CENTER_TO_MOUNT_OFFSET,
            y + Math.cos(clampRotation) * MOTOR_CLAMP_CENTER_TO_MOUNT_OFFSET,
            MOTOR_CLAMP_Z
        );
        const clamp = createCadMesh(motorClamp, plasticMat, {
            position: clampPosition,
            rotationZ: clampRotation
        });
        assembly.add(clamp);
    });

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

    MOTOR_OFFSETS.forEach(([x, y]) => {
        const rowRotation = Math.atan2(y, x);

        const brace = createCadMesh(guardBrace, guardMat, {
            position: new THREE.Vector3(x, y, GUARD_Z),
            rotationZ: rowRotation
        });
        guardGroup.add(brace);
    });

    const arcConfigs = [
        { midpoint: new THREE.Vector3(0, MOTOR_ARM_OFFSET, GUARD_Z), rotationZ: 0 },
        { midpoint: new THREE.Vector3(MOTOR_ARM_OFFSET, 0, GUARD_Z), rotationZ: -Math.PI / 2 },
        { midpoint: new THREE.Vector3(0, -MOTOR_ARM_OFFSET, GUARD_Z), rotationZ: Math.PI },
        { midpoint: new THREE.Vector3(-MOTOR_ARM_OFFSET, 0, GUARD_Z), rotationZ: Math.PI / 2 }
    ];

    arcConfigs.forEach(({ midpoint, rotationZ }) => {
        const rotation = new THREE.Euler(0, 0, rotationZ);
        const localAnchor = new THREE.Vector3(GUARD_ARC_MID_X, GUARD_ARC_INNER_Y, 0);
        const worldOffset = localAnchor.clone().applyEuler(rotation);
        const arc = createCadMesh(guardArc, guardMat, {
            position: midpoint.clone().sub(worldOffset),
            rotationZ
        });
        guardGroup.add(arc);
    });

    const bridgeConfigs = [
        { position: new THREE.Vector3(0, MOTOR_ARM_OFFSET, GUARD_Z), rotationZ: Math.PI / 2 },
        { position: new THREE.Vector3(MOTOR_ARM_OFFSET, 0, GUARD_Z), rotationZ: 0 },
        { position: new THREE.Vector3(0, -MOTOR_ARM_OFFSET, GUARD_Z), rotationZ: Math.PI / 2 },
        { position: new THREE.Vector3(-MOTOR_ARM_OFFSET, 0, GUARD_Z), rotationZ: 0 }
    ];

    bridgeConfigs.forEach(({ position, rotationZ }) => {
        const bridge = createCadMesh(guardBridge, guardMat, {
            position,
            rotationX: Math.PI / 2,
            rotationZ
        });
        guardGroup.add(bridge);
    });

    return guardGroup;
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
    bottomPlate.position.z = -0.015;
    bottomPlate.castShadow = true;
    group.add(bottomPlate);

    const topPlate = new THREE.Mesh(plateGeom, carbonMat);
    topPlate.position.z = 0.035;
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
    pcb1.position.z = 0.005;
    pcb1.castShadow = true;
    stackGroup.add(pcb1);

    const pcb2 = new THREE.Mesh(pcbGeom, pcbMat);
    pcb2.position.z = 0.025;
    pcb2.castShadow = true;
    stackGroup.add(pcb2);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const chipGeom = new THREE.BoxGeometry(0.02, 0.02, 0.005);
    const chip = new THREE.Mesh(chipGeom, blackMat);
    chip.position.z = 0.028;
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
        component.position.set(position[0], position[1], position[2]);
        stackGroup.add(component);
    });

    return stackGroup;
}

function createBatteryVolume() {
    const batGeom = new THREE.BoxGeometry(0.08, 0.035, 0.02);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const battery = new THREE.Mesh(batGeom, batMat);
    battery.position.z = -0.026;
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
        pivot.position.set(offset[0], offset[1], -0.015);
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
    const offsets = [
        [armLen, -armLen],
        [-armLen, armLen],
        [armLen, armLen],
        [-armLen, -armLen]
    ];

    offsets.forEach(offset => {
        const ring = new THREE.Mesh(ringGeom, guardMat);
        ring.position.set(offset[0], offset[1], 0.04);
        guardGroup.add(ring);

        // Add 4 spokes (ribs) per ring
        for(let i=0; i<4; i++) {
            const spokeGeom = new THREE.BoxGeometry(ringRadius, 0.002, 0.002);
            const spoke = new THREE.Mesh(spokeGeom, guardMat);
            const angle = i * Math.PI / 2;
            spoke.position.set(
                offset[0] + Math.cos(angle) * ringRadius/2,
                offset[1] + Math.sin(angle) * ringRadius/2,
                0.04
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
                0.02
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
        bridge.position.set(b.x, b.y, 0.04);
        bridge.rotation.z = b.rot;
        guardGroup.add(bridge);
    });

    return guardGroup;
}
