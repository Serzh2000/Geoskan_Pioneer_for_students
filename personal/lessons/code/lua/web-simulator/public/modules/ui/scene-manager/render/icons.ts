import type { SceneManagerEntry } from '../types.js';
import { tablerIcon, type TablerIconName } from '../../icons/tabler.js';
import { findSceneTypeIcon } from '../support/type-preview-config.js';

function hasSceneToken(value: string, tokens: string[]) {
    return tokens.some((token) => value.includes(token));
}

// Name-based fallbacks for entries whose sceneType isn't a catalog type
// (e.g. children created by a preset scene).
const KEYWORD_ICONS: Array<[string[], TablerIconName]> = [
    [['поезд'], 'train'],
    [['автомобиль'], 'car-suv'],
    [['building', 'многоэтаж'], 'building-skyscraper'],
    [['settlement', 'посел'], 'building-community'],
    [['aruco', 'apriltag', 'marker', 'маркер', 'map', 'карта'], 'qrcode'],
    [['rail', 'пут'], 'track'],
    [['road', 'дорог', 'route'], 'road'],
    [['cargo', 'груз'], 'package'],
    [['heliport', 'pad', 'хелипорт', 'площадк'], 'helicopter-landing'],
    [['charge', 'заряд'], 'charging-pile'],
    [['start-position', 'старт'], 'map-pin'],
    [['gate', 'ворота'], 'frame'],
    [['pylon', 'пилон'], 'traffic-cone'],
    [['flag', 'флаг'], 'flag'],
    [['beacon', 'маяк'], 'antenna'],
    [['tower', 'мачт'], 'lamp-2'],
    [['station', 'пульт'], 'device-desktop'],
    [['arena', 'арена'], 'fence'],
    [['forest', 'лес'], 'trees'],
    [['tree', 'ель'], 'christmas-tree'],
    [['hill', 'холм'], 'mountain'],
    [['transport', 'транспорт'], 'car']
];

/*
 * Same icon a type has in the catalog and the viewport hotbar
 * (support/type-preview-config.ts), so an object looks the same wherever it
 * appears. All icons are verbatim Tabler (icons/tabler.ts).
 */
export function getSceneObjectIcon(entry: SceneManagerEntry): string {
    const sceneType = String(entry.sceneType || '').trim().toLowerCase();
    const objectName = String(entry.name || '').trim().toLowerCase();

    if (entry.isDrone) return tablerIcon('drone');
    if (sceneType === 'ground' || objectName === 'ground') return tablerIcon('grid-pattern');
    if (sceneType === 'group' || objectName === 'group') return tablerIcon('stack-2');

    const catalogIcon = findSceneTypeIcon(sceneType);
    if (catalogIcon) return catalogIcon;

    const sceneKey = `${sceneType} ${objectName}`;
    const match = KEYWORD_ICONS.find(([tokens]) => hasSceneToken(sceneKey, tokens));
    return tablerIcon(match ? match[1] : 'box');
}
