import type { SceneManagerEntry } from '../types.js';

export function pluralizeRu(count: number, one: string, few: string, many: string): string {
    const mod100 = Math.abs(count) % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    const mod10 = mod100 % 10;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

export function formatObjectCount(count: number): string {
    return `${count} ${pluralizeRu(count, 'объект', 'объекта', 'объектов')}`;
}

export function isGroundEntry(entry: SceneManagerEntry): boolean {
    const sceneType = String(entry.sceneType || '').toLowerCase();
    return sceneType === 'ground' || String(entry.name || '').toLowerCase() === 'ground';
}

export function isGroupEntry(entry: SceneManagerEntry): boolean {
    const sceneType = String(entry.sceneType || '').toLowerCase();
    return sceneType === 'group' || String(entry.name || '').toLowerCase() === 'group';
}

export function isPresetEntry(entry: SceneManagerEntry): boolean {
    return !!entry.presetName || String(entry.sceneType || '').startsWith('Пресет');
}

export function isProtectedEntry(entry: SceneManagerEntry): boolean {
    return !!entry.isDrone || isGroundEntry(entry);
}

/** Short chip shown on the right of a row. Empty for ordinary props, whose type is already the title. */
export function getEntryKind(entry: SceneManagerEntry): string {
    if (entry.isDrone) return 'Дрон';
    if (isGroundEntry(entry)) return 'Сцена';
    if (isPresetEntry(entry)) return 'Пресет';
    if (isGroupEntry(entry)) return 'Группа';
    return '';
}

export function getEntryTitle(entry: SceneManagerEntry): string {
    if (entry.isDrone) return 'Дрон';
    if (isGroundEntry(entry)) return 'Земля';

    const name = String(entry.name || '').trim();
    if (isPresetEntry(entry)) {
        const stripped = name.replace(/^Пресет:\s*/i, '').trim();
        return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : 'Пресет сцены';
    }
    if (isGroupEntry(entry)) {
        return name && name.toLowerCase() !== 'group' ? name : 'Группа';
    }

    const label = String(entry.label || '').trim();
    const sceneType = String(entry.sceneType || '').trim();
    return label || name || sceneType || 'Объект';
}

/**
 * Secondary line. It must never restate the title - the previous build printed the type twice
 * ("Земля / Земля"), which cost a whole row of vertical space and told the reader nothing.
 */
export function getEntryMeta(entry: SceneManagerEntry): string {
    if (entry.isDrone) return 'Управляемый аппарат';
    if (isGroundEntry(entry)) return 'Плоскость полигона';

    const childCount = Number(entry.childCount || 0);
    if (childCount > 0) {
        return `${childCount} ${pluralizeRu(childCount, 'вложенный объект', 'вложенных объекта', 'вложенных объектов')}`;
    }

    const details: string[] = [];
    const title = getEntryTitle(entry);
    const sceneType = String(entry.sceneType || '').trim();
    // "Ворота 1" already says it is a gate - repeating the type wastes the only secondary line.
    if (sceneType && !title.startsWith(sceneType) && !isGroupEntry(entry)) details.push(sceneType);
    if (entry.value) details.push(`знач. ${entry.value}`);
    if (entry.floors !== undefined) {
        details.push(`${entry.floors} ${pluralizeRu(entry.floors, 'этаж', 'этажа', 'этажей')}`);
    }
    const pointCount = Number(entry.pointCount || 0);
    if (pointCount > 0) {
        details.push(`${pointCount} ${pluralizeRu(pointCount, 'точка', 'точки', 'точек')}`);
    }
    if (details.length) return details.join(' · ');

    const { x, y, z } = entry.position;
    return `X ${x.toFixed(1)} · Y ${y.toFixed(1)} · Z ${z.toFixed(1)}`;
}

export function matchesQuery(entry: SceneManagerEntry, query: string): boolean {
    if (!query) return true;
    const haystack = [
        getEntryTitle(entry),
        getEntryMeta(entry),
        getEntryKind(entry),
        entry.sceneType,
        entry.name,
        entry.label,
        entry.value
    ].join(' ').toLowerCase();
    return haystack.includes(query);
}
