import * as THREE from 'three';
import { createTrussArena } from './truss-arena.js';
import { GROUND_PHYSICS_MATERIAL } from '../physics/materials.js';
import { OBJECT_TYPE } from '../shared/object-types.js';
import { createAxesLabels } from './ground/axes-labels.js';
import { createFloorTexture, createLandingPadTexture, replaceMaterialTexture } from './ground/textures.js';
import { getGroundTheme, type GroundTheme } from './ground/theme.js';

let groundTexture: THREE.CanvasTexture | null = null;
let groundMaterial: THREE.MeshStandardMaterial | null = null;
let arenaAccentMaterial: THREE.MeshStandardMaterial | null = null;
let ringMaterial: THREE.MeshStandardMaterial | null = null;
let landingPadTexture: THREE.CanvasTexture | null = null;
let landingPadMaterial: THREE.MeshStandardMaterial | null = null;
let borderMaterial: THREE.MeshStandardMaterial | null = null;
let cornerMaterial: THREE.MeshStandardMaterial | null = null;
let groundThemeListenerAttached = false;


function applyGroundTheme(theme: GroundTheme = getGroundTheme()): void {
    if (groundMaterial) {
        const nextTexture = createFloorTexture(1024, theme);
        groundTexture = replaceMaterialTexture(groundMaterial, nextTexture, groundTexture, groundTexture);
        groundMaterial.color.setHex(0xffffff);
    }

    if (arenaAccentMaterial) {
        arenaAccentMaterial.color.setHex(theme === 'dark' ? 0x94a3b8 : 0xffffff);
        arenaAccentMaterial.opacity = theme === 'dark' ? 0.035 : 0.06;
        arenaAccentMaterial.needsUpdate = true;
    }

    if (ringMaterial) {
        ringMaterial.color.setHex(theme === 'dark' ? 0xff8f3a : 0xff6b00);
        ringMaterial.needsUpdate = true;
    }

    if (landingPadMaterial) {
        const nextPadTexture = createLandingPadTexture(theme);
        landingPadTexture = replaceMaterialTexture(landingPadMaterial, nextPadTexture, landingPadTexture);
        landingPadMaterial.opacity = theme === 'dark' ? 0.92 : 0.95;
    }

    if (borderMaterial) {
        borderMaterial.color.setHex(theme === 'dark' ? 0x475569 : 0xd1d5db);
        borderMaterial.needsUpdate = true;
    }

    if (cornerMaterial) {
        cornerMaterial.color.setHex(theme === 'dark' ? 0xff8f3a : 0xff6b00);
        cornerMaterial.needsUpdate = true;
    }
}

function ensureGroundThemeListener(): void {
    if (groundThemeListenerAttached || typeof window === 'undefined') {
        return;
    }

    window.addEventListener('app-theme-change', () => {
        applyGroundTheme();
    });
    groundThemeListenerAttached = true;
}

export function createGround(_scene: THREE.Scene, envGroup: THREE.Group) {
    const groundSize = 600;
    const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundTheme = getGroundTheme();
    groundTexture = createFloorTexture(1024, groundTheme);
    groundTexture.repeat.set(groundSize / 8, groundSize / 8);

    groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: 0.96,
        metalness: 0.02,
        color: 0xffffff
    });
    const ground = new THREE.Mesh(groundGeom, groundMaterial);
    ground.receiveShadow = true;
    ground.name = 'Ground';
    ground.userData = {
        type: OBJECT_TYPE.GROUND,
        physicsMaterial: { ...GROUND_PHYSICS_MATERIAL }
    };

    arenaAccentMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.65,
        metalness: 0.02
    });
    const arenaAccent = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), arenaAccentMaterial);
    arenaAccent.receiveShadow = true;
    arenaAccent.position.z = 0.01;
    ground.add(arenaAccent);

    ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.8,
        roughness: 0.35,
        metalness: 0.08,
        side: THREE.DoubleSide
    });
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.24, 128), ringMaterial);
    centerRing.position.z = 0.012;
    ground.add(centerRing);

    // Add the H landing pad marker at the origin.
    const padGeom = new THREE.PlaneGeometry(2.2, 2.2);
    landingPadTexture = createLandingPadTexture(groundTheme);
    landingPadMaterial = new THREE.MeshStandardMaterial({
        map: landingPadTexture,
        transparent: true,
        opacity: 1,
        roughness: 0.9,
        depthWrite: false
    });
    const landingPad = new THREE.Mesh(padGeom, landingPadMaterial);
    landingPad.receiveShadow = true;
    landingPad.position.set(0, 0, 0.015);
    ground.add(landingPad);

    const nextBorderMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.82, metalness: 0.02 });
    const nextCornerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.45, metalness: 0.04 });
    borderMaterial = nextBorderMaterial;
    cornerMaterial = nextCornerMaterial;
    const borderSegments = [
        { x: 0, y: 8.4, w: 16.85, h: 0.045 },
        { x: 0, y: -8.4, w: 16.85, h: 0.045 },
        { x: 8.4, y: 0, w: 0.045, h: 16.85 },
        { x: -8.4, y: 0, w: 0.045, h: 16.85 }
    ];
    borderSegments.forEach(({ x, y, w, h }) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.005), nextBorderMaterial);
        strip.position.set(x, y, 0.018);
        strip.receiveShadow = true;
        ground.add(strip);
    });

    [
        [7.95, 7.95],
        [-7.95, 7.95],
        [7.95, -7.95],
        [-7.95, -7.95]
    ].forEach(([x, y]) => {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.008), nextCornerMaterial);
        corner.position.set(x, y, 0.02);
        corner.receiveShadow = true;
        ground.add(corner);
    });

    applyGroundTheme(groundTheme);
    ensureGroundThemeListener();
    envGroup.add(ground);

    // Add the truss arena structure above the base floor.
    createTrussArena(envGroup);
}
