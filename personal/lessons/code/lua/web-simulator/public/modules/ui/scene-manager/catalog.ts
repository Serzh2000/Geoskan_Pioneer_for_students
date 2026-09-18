export type CatalogCategory = 'all' | 'flight' | 'markers' | 'landscape' | 'equipment';

export function getCatalogCategory(type: string): CatalogCategory {
    if (['aruco', 'aruco-map', 'apriltag', 'apriltag-map'].includes(type)) return 'markers';
    if (['gate', 'pylon', 'flag', 'start-position', 'heliport', 'pad-h', 'pad-charge', 'charge-station'].includes(type)) return 'flight';
    if (['building', 'road', 'rail', 'hill', 'arena-hills', 'tree', 'forest-patch', 'settlement', 'transport'].includes(type)) return 'landscape';
    return 'equipment';
}

export function matchesCatalogFilter(type: string, label: string, query: string, category: string): boolean {
    const aliases: Record<string, string> = { tree: 'дерево хвойное елка', 'forest-patch': 'деревья лес', building: 'дом здание', gate: 'кольцо рамка', 'pad-h': 'вертолетная площадка', 'pad-charge': 'зарядка' };
    const normalize = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
    return (category === 'all' || getCatalogCategory(type) === category)
        && normalize(label + ' ' + type + ' ' + (aliases[type] || '')).includes(normalize(query));
}
