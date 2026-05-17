import type { SceneManagerDomRefs } from '../support.js';

function normalizeIncidentEntries(value: string | undefined) {
    return (value || '')
        .split(/\r?\n|;/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function serializeIncidentEntries(entries: string[]) {
    return entries.join('\n');
}

function getIncidentKey(entry: string) {
    const match = entry.match(/^(\d+)\s*:\s*(front|back|перед|зад)\s*:\s*(\d+)/i);
    if (!match) return entry.trim().toLowerCase();
    const faceRaw = match[2].toLowerCase();
    const face = faceRaw === 'перед' ? 'front' : faceRaw === 'зад' ? 'back' : faceRaw;
    return `${match[1]}:${face}:${match[3]}`;
}

export function syncIncidentValue(targetEl: HTMLInputElement | null, sourceEl: HTMLTextAreaElement | null) {
    if (!targetEl || !sourceEl) return;
    targetEl.value = serializeIncidentEntries(normalizeIncidentEntries(sourceEl.value));
}

export function syncFloorLimit(floorsEl: HTMLInputElement | null, floorEl: HTMLInputElement | null, clampFloors: (value: string | undefined, fallback?: number) => number, clampWindowFloor: (value: string | undefined, maxFloor: number) => number) {
    if (!floorsEl || !floorEl) return;
    const maxFloor = clampFloors(floorsEl.value, 9);
    floorsEl.value = String(maxFloor);
    floorEl.max = String(maxFloor);
    floorEl.value = String(clampWindowFloor(floorEl.value, maxFloor));
}

export function clearIncidentEntries(incidentsEl: HTMLTextAreaElement | null, valueEl: HTMLInputElement | null) {
    if (!incidentsEl) return;
    incidentsEl.value = '';
    syncIncidentValue(valueEl, incidentsEl);
}

export function setBuildingControlsVisible(
    visible: boolean,
    floorsWrapEl: HTMLLabelElement | null,
    floorsEl: HTMLInputElement | null,
    settingsEl: HTMLDivElement | null
) {
    if (floorsWrapEl) floorsWrapEl.style.display = visible ? 'flex' : 'none';
    if (floorsEl) floorsEl.disabled = !visible;
    if (settingsEl) settingsEl.classList.toggle('visible', visible);
}

export function appendIncidentEntry(
    incidentsEl: HTMLTextAreaElement | null,
    floorsEl: HTMLInputElement | null,
    floorEl: HTMLInputElement | null,
    faceEl: HTMLSelectElement | null,
    windowEl: HTMLSelectElement | null,
    kindEl: HTMLSelectElement | null,
    valueEl: HTMLInputElement | null,
    clampFloors: (value: string | undefined, fallback?: number) => number,
    clampWindowFloor: (value: string | undefined, maxFloor: number) => number,
    clampInt: (value: string | undefined, fallback: number, min: number, max: number) => number
) {
    if (!incidentsEl || !floorEl || !faceEl || !windowEl || !kindEl) return;
    const maxFloor = clampFloors(floorsEl?.value, 9);
    const floor = clampWindowFloor(floorEl.value, maxFloor);
    const face = faceEl.value === 'back' ? 'back' : 'front';
    const windowIndex = clampInt(windowEl.value, 1, 1, 3);
    const kind = kindEl.value === 'fire' || kindEl.value === 'thief' ? kindEl.value : 'smoke';
    floorEl.value = String(floor);
    const entry = `${floor}:${face}:${windowIndex}=${kind}`;
    const entries = normalizeIncidentEntries(incidentsEl.value).filter((item) => getIncidentKey(item) !== getIncidentKey(entry));
    entries.push(entry);
    incidentsEl.value = serializeIncidentEntries(entries);
    syncIncidentValue(valueEl, incidentsEl);
}
