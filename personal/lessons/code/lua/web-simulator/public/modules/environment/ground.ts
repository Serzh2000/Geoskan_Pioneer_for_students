import * as THREE from 'three';
import { createTrussArena } from './truss-arena.js';
import { GROUND_PHYSICS_MATERIAL } from '../physics/materials.js';

function createFloorTexture(textureSize = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return new THREE.CanvasTexture(canvas);

    const squaresPerSide = 8;
    const tileSize = textureSize / squaresPerSide;
    const seamSize = Math.max(2, Math.round(tileSize * 0.025));
    const baseColor = '#f5f7fa';
    const whiteSquare = '#fbfcfd';
    const graySquare = '#edf1f5';
    const seamColor = 'rgba(148, 163, 184, 0.24)';
    const accentColor = '#ff6b00';

    const hash = (x: number, y: number) => {
        const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
        return value - Math.floor(value);
    };

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, textureSize, textureSize);

    for (let row = 0; row < squaresPerSide; row++) {
        for (let col = 0; col < squaresPerSide; col++) {
            const x = col * tileSize;
            const y = row * tileSize;
            const innerX = x + seamSize;
            const innerY = y + seamSize;
            const innerSize = tileSize - seamSize * 2;
            const isLight = (row + col) % 2 === 0;
            const squareColor = isLight ? whiteSquare : graySquare;

            ctx.fillStyle = squareColor;
            ctx.fillRect(innerX, innerY, innerSize, innerSize);

            ctx.strokeStyle = seamColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerSize - 1, innerSize - 1);

            for (let localY = seamSize + 10; localY < tileSize - seamSize - 10; localY += 18) {
                for (let localX = seamSize + 10; localX < tileSize - seamSize - 10; localX += 18) {
                    const n = hash(localX / 18, localY / 18);
                    const tone = isLight ? 24 : 40;
                    const alpha = isLight ? 0.018 + n * 0.012 : 0.016 + n * 0.012;
                    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha.toFixed(3)})`;
                    ctx.fillRect(x + localX, y + localY, 2, 2);
                }
            }

            for (let i = 0; i < 8; i++) {
                const scuffSeed = hash(col * 10 + i, row * 10 + i * 3);
                const scuffX = innerX + 8 + ((innerSize - 24) * hash(col * 21 + i, row * 17 + i));
                const scuffY = innerY + 8 + ((innerSize - 24) * hash(col * 13 + i, row * 29 + i));
                const scuffLength = 8 + scuffSeed * 10;
                const scuffAlpha = isLight ? 0.02 : 0.016;
                ctx.strokeStyle = `rgba(255, 255, 255, ${scuffAlpha.toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(scuffX, scuffY);
                ctx.lineTo(scuffX + scuffLength, scuffY + scuffLength * 0.18);
                ctx.stroke();
            }

            if (row % 2 === 0 && col % 2 === 0) {
                const markerInset = seamSize + 8;
                const markerSize = Math.max(8, Math.round(tileSize * 0.06));
                ctx.fillStyle = accentColor;
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

export function createGround(scene: THREE.Scene, envGroup: THREE.Group) {
    const groundSize = 200;
    const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize);
    const gridTex = createFloorTexture();
    gridTex.repeat.set(groundSize / 8, groundSize / 8);

    const groundMat = new THREE.MeshStandardMaterial({ 
        map: gridTex,
        roughness: 0.96,
        metalness: 0.02,
        color: 0xffffff
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.receiveShadow = true;
    ground.name = 'Ground';
    ground.userData = {
        type: 'ground',
        physicsMaterial: { ...GROUND_PHYSICS_MATERIAL }
    };
    scene.add(ground); // Explicitly add to scene for easier raycasting

    const arenaAccentMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.65,
        metalness: 0.02
    });
    const arenaAccent = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), arenaAccentMat);
    arenaAccent.position.z = 0.01;
    ground.add(arenaAccent);

    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.8,
        roughness: 0.35,
        metalness: 0.08,
        side: THREE.DoubleSide
    });
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.9, 64), ringMat);
    centerRing.position.z = 0.012;
    ground.add(centerRing);

    // Добавляем площадку H (Landing Pad) под дроном (0,0)
    const padGeom = new THREE.PlaneGeometry(2, 2);
    const padCanvas = document.createElement('canvas');
    padCanvas.width = 256; padCanvas.height = 256;
    const pctx = padCanvas.getContext('2d');
    if (pctx) {
        pctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        pctx.fillRect(0, 0, 256, 256);
        pctx.strokeStyle = '#111111';
        pctx.lineWidth = 15;
        pctx.strokeRect(10, 10, 236, 236);
        pctx.fillStyle = '#ff6b00';
        pctx.font = 'bold 160px sans-serif';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText('H', 128, 128);
    }
    const padTex = new THREE.CanvasTexture(padCanvas);
    const padMat = new THREE.MeshStandardMaterial({ map: padTex, transparent: true, opacity: 0.95 });
    const landingPad = new THREE.Mesh(padGeom, padMat);
    landingPad.position.set(0, 0, 0.015);
    ground.add(landingPad);

    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.82, metalness: 0.02 });
    const cornerMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.45, metalness: 0.04 });
    const borderSegments = [
        { x: 0, y: 8.4, w: 17.6, h: 0.34 },
        { x: 0, y: -8.4, w: 17.6, h: 0.34 },
        { x: 8.4, y: 0, w: 0.34, h: 17.6 },
        { x: -8.4, y: 0, w: 0.34, h: 17.6 }
    ];
    borderSegments.forEach(({ x, y, w, h }) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), borderMat);
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
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.085), cornerMat);
        corner.position.set(x, y, 0.048);
        corner.receiveShadow = true;
        ground.add(corner);
    });

    envGroup.add(ground);

    // Добавляем фермовую конструкцию (Truss Arena) и сетку как на фото
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
