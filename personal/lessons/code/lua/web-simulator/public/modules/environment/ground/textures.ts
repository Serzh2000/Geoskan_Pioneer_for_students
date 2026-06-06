/**
 * Генерация и безопасная замена канвас-текстур для поверхности арены.
 * Содержит только работу с canvas/texture, без сборки сцены.
 */
import * as THREE from 'three';
import { getFloorPalette, getGroundTheme, type GroundTheme } from './theme.js';

export function createFloorTexture(textureSize = 1024, theme: GroundTheme = getGroundTheme()) {
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

export function createLandingPadTexture(theme: GroundTheme): THREE.CanvasTexture {
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

export function replaceMaterialTexture(
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
