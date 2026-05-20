import type { SceneManagerEntry } from '../types.js';

function hasSceneToken(value: string, tokens: string[]) {
    return tokens.some((token) => value.includes(token));
}

export function getSceneObjectIcon(entry: SceneManagerEntry): string {
    const sceneType = String(entry.sceneType || '').trim().toLowerCase();
    const objectName = String(entry.name || '').trim().toLowerCase();
    const sceneKey = `${sceneType} ${objectName}`;

    if (entry.isDrone) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="2.05"></circle><circle cx="17" cy="7" r="2.05"></circle><circle cx="7" cy="17" r="2.05"></circle><circle cx="17" cy="17" r="2.05"></circle><rect x="9.5" y="9.5" width="5" height="5" rx="1.5"></rect><path d="M8.6 8.6 10 10"></path><path d="M15.4 8.6 14 10"></path><path d="M8.6 15.4 10 14"></path><path d="M15.4 15.4 14 14"></path></svg>';
    }
    if (sceneType === 'ground' || objectName === 'ground') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h18"></path><path d="M5 17l2.5-5 3 2.5 3.5-6 5 8.5"></path></svg>';
    }
    if (sceneType === 'group' || objectName === 'group') {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 8.5 12 4.5l7.5 4-7.5 4-7.5-4Z"></path><path d="M4.5 12.5 12 16.5l7.5-4"></path><path d="M4.5 16 12 20l7.5-4"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['building', 'многоэтаж', 'settlement', 'посел'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20V7.5A1.5 1.5 0 0 1 7.5 6H14v14"></path><path d="M14 20V4.5A1.5 1.5 0 0 1 15.5 3H18a1.5 1.5 0 0 1 1.5 1.5V20"></path><path d="M9 9.5h2"></path><path d="M9 13h2"></path><path d="M16.5 8h1"></path><path d="M16.5 11.5h1"></path><path d="M4 20h16"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['aruco', 'apriltag', 'marker', 'маркер', 'map', 'карта'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M8.5 8.5h2v2h-2z"></path><path d="M13.5 8.5h2v2h-2z"></path><path d="M8.5 13.5h2v2h-2z"></path><path d="M13.5 13.5h2v2h-2z"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['road', 'rail', 'дорог', 'пут', 'route'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20 10 4"></path><path d="M17 20 14 4"></path><path d="M8.7 11h6.6"></path><path d="M8 16h8"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['cargo', 'груз'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5 18.5 8v8L12 19.5 5.5 16V8L12 4.5Z"></path><path d="M5.5 8 12 11.5 18.5 8"></path><path d="M12 11.5v8"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['start-position', 'heliport', 'charge', 'pad', 'старт', 'хелипорт', 'площадк', 'заряд'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><path d="M9 9v6"></path><path d="M15 9v6"></path><path d="M9 12h6"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['gate', 'pylon', 'flag', 'beacon', 'tower', 'station', 'arena', 'ворота', 'пилон', 'флаг', 'маяк', 'мачт', 'пульт'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20V8"></path><path d="M18 20V8"></path><path d="M6 8h12"></path><path d="M9.5 8V5.5l5 2.2-5 2.3"></path></svg>';
    }
    if (hasSceneToken(sceneKey, ['tree', 'forest', 'hill', 'ель', 'лес', 'холм', 'transport', 'транспорт'])) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 4 4 5h-2.5l3 4h-3l2.5 4H8l2.5-4h-3l3-4H8L12 4Z"></path><path d="M12 17v3"></path></svg>';
    }

    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5 18.5 8 12 11.5 5.5 8 12 4.5Z"></path><path d="M5.5 8v8L12 19.5l6.5-3.5V8"></path><path d="M12 11.5v8"></path></svg>';
}
