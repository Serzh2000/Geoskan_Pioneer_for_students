import * as THREE from 'three';
import { createTrussArena } from './truss-arena.js';
import { GROUND_PHYSICS_MATERIAL } from '../physics/materials.js';

type GroundTheme = 'light' | 'dark';

type FloorPalette = {
    baseColor: string;
    lightSquare: string;
    darkSquare: string;
    seamColor: string;
    accentColor: string;
    speckleBaseTone: number;
    speckleLightAlpha: number;
    speckleDarkAlpha: number;
    scuffColor: string;
    scuffLightAlpha: number;
    scuffDarkAlpha: number;
};

let groundTexture: THREE.CanvasTexture | null = null;
let groundMaterial: THREE.MeshStandardMaterial | null = null;
let arenaAccentMaterial: THREE.MeshStandardMaterial | null = null;
let ringMaterial: THREE.MeshStandardMaterial | null = null;
let landingPadTexture: THREE.CanvasTexture | null = null;
let landingPadMaterial: THREE.MeshStandardMaterial | null = null;
let borderMaterial: THREE.MeshStandardMaterial | null = null;
let cornerMaterial: THREE.MeshStandardMaterial | null = null;
let groundThemeListenerAttached = false;

function getGroundTheme(): GroundTheme {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function getFloorPalette(theme: GroundTheme): FloorPalette {
    if (theme === 'dark') {
        return {
            baseColor: '#0f172a',
            lightSquare: '#162033',
            darkSquare: '#0b1220',
            seamColor: 'rgba(148, 163, 184, 0.16)',
            accentColor: '#ff8f3a',
            speckleBaseTone: 180,
            speckleLightAlpha: 0.03,
            speckleDarkAlpha: 0.022,
            scuffColor: '255, 255, 255',
            scuffLightAlpha: 0.024,
            scuffDarkAlpha: 0.016
        };
    }

    return {
        baseColor: '#f5f7fa',
        lightSquare: '#fbfcfd',
        darkSquare: '#edf1f5',
        seamColor: 'rgba(148, 163, 184, 0.24)',
        accentColor: '#ff6b00',
        speckleBaseTone: 24,
        speckleLightAlpha: 0.018,
        speckleDarkAlpha: 0.016,
        scuffColor: '255, 255, 255',
        scuffLightAlpha: 0.02,
        scuffDarkAlpha: 0.016
    };
}

function createFloorTexture(textureSize = 1024, theme: GroundTheme = getGroundTheme()) {
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return new THREE.CanvasTexture(canvas);

    const palette = getFloorPalette(theme);
    const squaresPerSide = 8;
    const tileSize = textureSize / squaresPerSide;
    const seamSize = Math.max(2, Math.round(tileSize * 0.025));

    const hash = (x: number, y: number) => {
        const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
        return value - Math.floor(value);
    };

    ctx.fillStyle = palette.baseColor;
    ctx.fillRect(0, 0, textureSize, textureSize);

    for (let row = 0; row < squaresPerSide; row++) {
        for (let col = 0; col < squaresPerSide; col++) {
            const x = col * tileSize;
            const y = row * tileSize;
            const innerX = x + seamSize;
            const innerY = y + seamSize;
            const innerSize = tileSize - seamSize * 2;
            const isLight = (row + col) % 2 === 0;
            const squareColor = isLight ? palette.lightSquare : palette.darkSquare;

            ctx.fillStyle = squareColor;
            ctx.fillRect(innerX, innerY, innerSize, innerSize);

            ctx.strokeStyle = palette.seamColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerSize - 1, innerSize - 1);

            for (let localY = seamSize + 10; localY < tileSize - seamSize - 10; localY += 18) {
                for (let localX = seamSize + 10; localX < tileSize - seamSize - 10; localX += 18) {
                    const n = hash(localX / 18, localY / 18);
                    const tone = isLight ? palette.speckleBaseTone : palette.speckleBaseTone + 16;
                    const alpha = isLight
                        ? palette.speckleLightAlpha + n * 0.012
                        : palette.speckleDarkAlpha + n * 0.012;
                    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha.toFixed(3)})`;
                    ctx.fillRect(x + localX, y + localY, 2, 2);
                }
            }

            for (let i = 0; i < 8; i++) {
                const scuffSeed = hash(col * 10 + i, row * 10 + i * 3);
                const scuffX = innerX + 8 + ((innerSize - 24) * hash(col * 21 + i, row * 17 + i));
                const scuffY = innerY + 8 + ((innerSize - 24) * hash(col * 13 + i, row * 29 + i));
                const scuffLength = 8 + scuffSeed * 10;
                const scuffAlpha = isLight ? palette.scuffLightAlpha : palette.scuffDarkAlpha;
                ctx.strokeStyle = `rgba(${palette.scuffColor}, ${scuffAlpha.toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(scuffX, scuffY);
                ctx.lineTo(scuffX + scuffLength, scuffY + scuffLength * 0.18);
                ctx.stroke();
            }

            if (row % 2 === 0 && col % 2 === 0) {
                const markerInset = seamSize + 8;
                const markerSize = Math.max(8, Math.round(tileSize * 0.06));
                ctx.fillStyle = palette.accentColor;
                ctx.fillRect(x + markerInset, y + markerInset, markerSize * 2, 2);
                ctx.fillRect(x + markerInset, y + markerInset, 2, markerSize * 2);
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createLandingPadTexture(theme: GroundTheme): THREE.CanvasTexture {
    const padCanvas = document.createElement('canvas');
    padCanvas.width = 256;
    padCanvas.height = 256;
    const ctx = padCanvas.getContext('2d');

    if (ctx) {
        const background = theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)';
        const border = theme === 'dark' ? '#e2e8f0' : '#111111';
        const letter = theme === 'dark' ? '#ff8f3a' : '#ff6b00';

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = border;
        ctx.lineWidth = 15;
        ctx.strokeRect(10, 10, 236, 236);
        ctx.fillStyle = letter;
        ctx.font = 'bold 160px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', 128, 128);
    }

    const texture = new THREE.CanvasTexture(padCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function replaceMaterialTexture(
    material: THREE.MeshStandardMaterial | null,
    nextTexture: THREE.CanvasTexture,
    previousTexture: THREE.CanvasTexture | null,
    preserveRepeatFrom?: THREE.Texture | null
): THREE.CanvasTexture {
    if (preserveRepeatFrom) {
        nextTexture.repeat.copy(preserveRepeatFrom.repeat);
    }

    if (material) {
        material.map = nextTexture;
        material.needsUpdate = true;
    }

    if (previousTexture && previousTexture !== nextTexture) {
        previousTexture.dispose();
    }

    return nextTexture;
}

function applyGroundTheme(theme: GroundTheme = getGroundTheme()): void {
    if (groundMaterial) {
        const nextTexture = createFloorTexture(1024, theme);
        groundTexture = replaceMaterialTexture(groundMaterial, nextTexture, groundTexture, groundTexture);
        groundMaterial.color.setHex(0xffffff);
    }

    if (arenaAccentMaterial) {
        arenaAccentMaterial.color.setHex(theme === 'dark' ? 0x94a3b8 : 0xffffff);
        arenaAccentMaterial.opacity = theme === 'dark' ? 0.16 : 0.3;
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
    const groundSize = 200;
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
        type: 'ground',
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
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.9, 64), ringMaterial);
    centerRing.position.z = 0.012;
    ground.add(centerRing);

    // Add the H landing pad marker at the origin.
    const padGeom = new THREE.PlaneGeometry(2, 2);
    landingPadTexture = createLandingPadTexture(groundTheme);
    landingPadMaterial = new THREE.MeshStandardMaterial({
        map: landingPadTexture,
        transparent: true,
        opacity: 0.95
    });
    const landingPad = new THREE.Mesh(padGeom, landingPadMaterial);
    landingPad.position.set(0, 0, 0.015);
    ground.add(landingPad);

    const nextBorderMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.82, metalness: 0.02 });
    const nextCornerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.45, metalness: 0.04 });
    borderMaterial = nextBorderMaterial;
    cornerMaterial = nextCornerMaterial;
    const borderSegments = [
        { x: 0, y: 8.4, w: 17.6, h: 0.34 },
        { x: 0, y: -8.4, w: 17.6, h: 0.34 },
        { x: 8.4, y: 0, w: 0.34, h: 17.6 },
        { x: -8.4, y: 0, w: 0.34, h: 17.6 }
    ];
    borderSegments.forEach(({ x, y, w, h }) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), nextBorderMaterial);
        strip.position.set(x, y, 0.045);
        strip.receiveShadow = true;
        ground.add(strip);
    });

    [
        [7.95, 7.95],
        [-7.95, 7.95],
        [7.95, -7.95],
        [-7.95, -7.95]
    ].forEach(([x, y]) => {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.085), nextCornerMaterial);
        corner.position.set(x, y, 0.048);
        corner.receiveShadow = true;
        ground.add(corner);
    });

    applyGroundTheme(groundTheme);
    ensureGroundThemeListener();
    envGroup.add(ground);

    // Add the truss arena structure above the base floor.
    createTrussArena(envGroup);
}

export function createAxesLabels(scene: THREE.Scene) {
    const makeLabel = (text: string, pos: THREE.Vector3, color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = color;
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(text, 32, 48);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.scale.set(0.5, 0.5, 0.5);
        scene.add(sprite);
    };
    makeLabel('X', new THREE.Vector3(2.2, 0, 0.2), '#f87171');
    makeLabel('Y', new THREE.Vector3(0, 2.2, 0.2), '#4ade80');
    makeLabel('Z', new THREE.Vector3(0, 0, 2.2), '#38bdf8');
}
