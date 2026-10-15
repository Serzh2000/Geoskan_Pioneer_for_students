import type { TrainingLayout, TrainingProp } from './layout.js';
import type { District } from './world-plan.js';

type PropType = TrainingProp['type'];
type RepeatRule = { cap: number; separation: number };

/** Conservative XY envelopes measured from the vendored meshes, centred on their actual origin. */
export const MODEL_FOOTPRINTS: Partial<Record<PropType, number>> = {
    building: 3.47, house: 4.55, station: 7.66, warehouse: 8.62, 'water-tower': 3.19,
    barn: 7.79, silo: 3.68, 'radio-mast': 2.83, containers: 4.16, solar: 6.25,
    greenhouse: 6.8, 'bus-stop': 2.79, hay: 3.66, rocks: 4.59, 'power-pylon': 5.72,
    hangar: 13.73, windsock: 2.7, church: 7.99, 'gas-station': 10.90,
    'gantry-crane': 11.21, 'fire-station': 14.16, school: 18.77, hospital: 21.64,
    restaurant: 10.64, mall: 31.71, office: 13.0, 'police-station': 14.43,
    bench: .97, 'cafe-table': 2.41, 'wind-turbine': 10.26
};

export function reserveFootprint(prop: TrainingProp): void {
    prop.radius = Math.max(prop.radius, (MODEL_FOOTPRINTS[prop.type] ?? 0) * prop.scale);
}

/** Landmarks serve a settlement; they do not multiply with the area of its surrounding woods. */
export const LANDMARK_RULES: Partial<Record<PropType, RepeatRule>> = {
    church: { cap: 3, separation: 110 }, hospital: { cap: 2, separation: 150 },
    school: { cap: 4, separation: 80 }, mall: { cap: 1, separation: 180 },
    'fire-station': { cap: 1, separation: 150 }, 'police-station': { cap: 1, separation: 150 },
    station: { cap: 1, separation: 180 }, 'water-tower': { cap: 2, separation: 100 },
    'radio-mast': { cap: 2, separation: 140 }, 'gas-station': { cap: 4, separation: 90 },
    'gantry-crane': { cap: 2, separation: 35 }, hangar: { cap: 1, separation: 100 },
    windsock: { cap: 1, separation: 100 }, office: { cap: 10, separation: 22 },
    restaurant: { cap: 16, separation: 30 }, 'bus-stop': { cap: 24, separation: 30 },
    barn: { cap: 6, separation: 25 }, greenhouse: { cap: 8, separation: 18 },
    silo: { cap: 8, separation: 12 }, solar: { cap: 8, separation: 20 },
    containers: { cap: 24, separation: 8 }, 'wind-turbine': { cap: 12, separation: 32 }
};

export function modelLimit(layout: TrainingLayout, type: PropType): number {
    const rule = LANDMARK_RULES[type];
    if (!rule) return Infinity;
    const districts = (kinds: District['kind'][]) => layout.districts.filter(d => kinds.includes(d.kind)).length;
    const homes = layout.objects.filter(p => p.type === 'house' || p.type === 'building').length;
    switch (type) {
        case 'school': return Math.min(rule.cap, Math.ceil(homes / 70));
        case 'hospital': return homes >= 8 ? (homes >= 250 ? rule.cap : 1) : 0;
        case 'restaurant': return Math.min(rule.cap, Math.ceil(homes / 10));
        case 'church': return homes >= 4 ? rule.cap : 0;
        case 'barn': return Math.min(rule.cap, districts(['farmland']) * 2);
        case 'greenhouse': return Math.min(rule.cap, districts(['farmland', 'village']) * 2);
        case 'containers': return Math.min(rule.cap, districts(['industry']) * 14);
        case 'gantry-crane': return Math.min(rule.cap, districts(['industry']));
        case 'silo': return Math.min(rule.cap, districts(['farmland', 'industry']) * 3);
        case 'gas-station': return layout.size < 300 ? 1 : rule.cap;
        case 'radio-mast': return layout.profile === 'hills' && layout.size >= 300 ? 2 : 1;
        default: return rule.cap;
    }
}

const SENSITIVE: PropType[] = ['school', 'hospital', 'church'];
const HEAVY: PropType[] = ['warehouse', 'containers', 'gantry-crane', 'gas-station', 'wind-turbine', 'power-pylon'];
const homes = (p: TrainingProp) => p.type === 'building' || p.type === 'house';

/** Check a reserved city landmark before houses are built, or a populated settlement afterward. */
export function canPlaceModel(layout: TrainingLayout, prop: TrainingProp, reserved = false): boolean {
    const rule = LANDMARK_RULES[prop.type];
    if (rule) {
        const existing = layout.objects.filter(p => p.type === prop.type);
        const cap = reserved && ['school', 'hospital', 'church', 'restaurant', 'barn'].includes(prop.type) ? rule.cap : modelLimit(layout, prop.type);
        if (existing.length >= cap || existing.some(p => Math.hypot(p.x - prop.x, p.y - prop.y) < rule.separation)) return false;
    }
    if (SENSITIVE.includes(prop.type) || HEAVY.includes(prop.type)) {
        const conflicts = SENSITIVE.includes(prop.type) ? HEAVY : SENSITIVE;
        if (layout.objects.some(p => conflicts.includes(p.type) && Math.hypot(p.x - prop.x, p.y - prop.y) < p.radius + prop.radius + 24)) return false;
    }
    return true;
}

/** Walking catchments, measured from building centres (in world metres). */
export function residentialNeighbors(layout: TrainingLayout, point: { x: number; y: number }, reach = 75): number {
    return layout.objects.filter(p => homes(p) && Math.hypot(p.x - point.x, p.y - point.y) <= reach).length;
}

export function districtAt(layout: TrainingLayout, point: { x: number; y: number }): District | undefined {
    // More specific districts (parks, freight yards, residential blocks) override the city envelope.
    return [...layout.districts].reverse().find(d => Math.abs(point.x - d.x) <= d.width / 2 && Math.abs(point.y - d.y) <= d.depth / 2);
}
