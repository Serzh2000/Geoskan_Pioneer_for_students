import * as THREE from 'three';
import { MARKER_DICTIONARIES, MarkerDictionaryId } from '../marker-dictionaries.js';
import { MARKER_CANVAS_SIZE, MarkerKind, normalizeMarkerValue } from './shared.js';

function parseMarkerId(value: string) {
    const parsed = Number.parseInt(value || '0', 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function bytesToBitMatrix(bytes: number[], markerSize: number) {
    const matrix = Array.from({ length: markerSize }, () => Array<number>(markerSize).fill(0));
    const totalBits = markerSize * markerSize;
    let bitIndex = 0;
    for (const byte of bytes) {
        for (let mask = 1 << 7; mask !== 0 && bitIndex < totalBits; mask >>= 1) {
            const row = Math.floor(bitIndex / markerSize);
            const column = bitIndex % markerSize;
            matrix[row][column] = byte & mask ? 1 : 0;
            bitIndex++;
        }
    }
    return matrix;
}

function getMarkerMatrix(kind: MarkerKind, dictionaryId: MarkerDictionaryId, value: string) {
    const definition = MARKER_DICTIONARIES[dictionaryId];
    const markerId = parseMarkerId(normalizeMarkerValue(kind, dictionaryId, value));
    return {
        matrix: bytesToBitMatrix(definition.firstRotationBytes[markerId], definition.markerSize),
        definition
    };
}

export function createMarkerTexture(kind: MarkerKind, dictionaryId: MarkerDictionaryId, value: string) {
    const canvas = document.createElement('canvas');
    canvas.width = MARKER_CANVAS_SIZE;
    canvas.height = MARKER_CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const { matrix, definition } = getMarkerMatrix(kind, dictionaryId, value);
    const size = MARKER_CANVAS_SIZE;
    const quietZone = 104;
    const outerMarkerSize = size - quietZone * 2;
    const borderCells = 1;
    const payloadSize = definition.markerSize;
    const totalCells = payloadSize + borderCells * 2;
    const cellSize = Math.floor(outerMarkerSize / totalCells);
    const markerSize = cellSize * totalCells;
    const offset = Math.floor((size - markerSize) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(offset, offset, markerSize, markerSize);

    for (let y = 0; y < payloadSize; y++) {
        for (let x = 0; x < payloadSize; x++) {
            ctx.fillStyle = matrix[y][x] ? '#ffffff' : '#0a0a0a';
            ctx.fillRect(
                offset + (x + borderCells) * cellSize,
                offset + (y + borderCells) * cellSize,
                cellSize,
                cellSize
            );
        }
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d4d4d8';
    ctx.strokeRect(1, 1, size - 2, size - 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
}
