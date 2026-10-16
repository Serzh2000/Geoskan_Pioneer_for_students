import * as THREE from 'three';
import {
    BuildingFace,
    BuildingWindowIncident,
    BuildingWindowSlot,
    WINDOW_COUNT_PER_FACE
} from './shared.js';

function parseIncidentKind(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'smoke' || normalized === 'дым') return 'smoke';
    if (normalized === 'fire' || normalized === 'пожар') return 'fire';
    if (normalized === 'thief' || normalized === 'вор') return 'thief';
    return null;
}

export function parseWindowIncidents(rawValue: unknown, floors: number): BuildingWindowIncident[] {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return [];

    const incidents: BuildingWindowIncident[] = [];
    const entries = rawValue
        .split(/\r?\n|;/)
        .map((entry) => entry.trim())
        .filter(Boolean);

    for (const entry of entries) {
        const match = entry.match(/^(\d+)\s*:\s*(?:(front|back|перед|зад)\s*:\s*)?(\d+)\s*=\s*([a-zа-я]+)$/i);
        if (!match) continue;

        const floor = Number(match[1]);
        const faceRaw = (match[2] || 'front').toLowerCase();
        const window = Number(match[3]);
        const kind = parseIncidentKind(match[4]);
        if (!kind) continue;
        if (!Number.isFinite(floor) || floor < 1 || floor > floors) continue;
        if (!Number.isFinite(window) || window < 1 || window > WINDOW_COUNT_PER_FACE) continue;

        const face: BuildingFace = (faceRaw === 'back' || faceRaw === 'зад') ? 'back' : 'front';
        incidents.push({ floor, face, window, kind });
    }

    return incidents;
}

export function getWindowSlots(floors: number, depth: number, floorHeight: number) {
    const slots: BuildingWindowSlot[] = [];
    for (let floor = 0; floor < floors; floor++) {
        const z = 0.65 + floor * floorHeight + 0.45;
        for (let i = -1; i <= 1; i++) {
            const x = i * 1.3;
            slots.push({
                floor: floor + 1,
                face: 'front',
                window: i + 2,
                position: new THREE.Vector3(x, depth * 0.5 + 0.05, z),
                outward: 1
            });
            slots.push({
                floor: floor + 1,
                face: 'back',
                window: i + 2,
                position: new THREE.Vector3(x, -depth * 0.5 - 0.05, z),
                outward: -1
            });
        }
    }
    return slots;
}

export function summarizeWindowIncidents(incidents: BuildingWindowIncident[]) {
    if (!incidents.length) return [];
    return incidents.map((incident) => {
        const kindLabel = incident.kind === 'smoke'
            ? 'дым'
            : incident.kind === 'fire'
                ? 'пожар'
                : 'вор';
        const faceLabel = incident.face === 'front' ? 'перед' : 'зад';
        return `Окно ${incident.floor}:${faceLabel}:${incident.window} -> ${kindLabel}`;
    });
}
