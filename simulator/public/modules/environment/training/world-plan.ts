import { distanceToPath, distanceToWaterBodies, type Point2 } from './geography.js';
import type { TrainingLayout } from './layout.js';
import { buildWorld } from './world-builder.js';

/** Road classes, for the runtime's traffic and lamp spacing: `arterial` (avenue) > `collector` > `street` > `lane`; `link` joins separate places. */
export type RoadHierarchy = 'arterial' | 'collector' | 'street' | 'lane' | 'link';
export type WorldPath = { id: string; label: string; kind: 'road' | 'rail' | 'footpath' | 'runway'; width: number; points: Point2[]; hierarchy?: RoadHierarchy };
export type WaterBody = { id: string; kind: 'river' | 'lake'; points: Point2[]; width: number };
export type District = Point2 & { id: string; kind: 'neighborhood' | 'village' | 'industry' | 'park' | 'farmland' | 'airfield' | 'center' | 'suburb'; width: number; depth: number; roadId: string };
export type Landform = Point2 & { radius: number; height: number };
export type WorldFeatures = { paths: WorldPath[]; water: WaterBody[]; districts: District[]; landforms: Landform[];
    bridges: Array<Point2 & { pathId: string; length: number; width: number; rotation: number; /** 'overpass' lifts a road over a railway; a river bridge keeps its low deck. */ kind?: 'river' | 'overpass'; height?: number }>;
    /** -1 puts the river on the east and the railway station on the west; 1 is the original arrangement. */
    mirror?: 1 | -1;
    /** Turning areas at the loose ends of streets: an asphalt disc a lorry can turn on; houses keep clear of it. */
    turnarounds?: Array<Point2 & { r: number; roadId: string }> };

export function distanceToWater(layout: Pick<WorldFeatures, 'water'>, p: Point2): number {
    return distanceToWaterBodies(layout, p);
}

/** The lesson corridor, developed areas and route verges (3 m each side of a road, so the 4 m grid of the mesh cannot lift a slope over the asphalt) stay level. */
export function trainingHeightAt(layout: TrainingLayout, x: number, y: number): number {
    // The hills are summed first: nearly every point of a map is outside all of them, and 0 needs none of the clearance maths below.
    const hills = layout.landforms.reduce((height, hill) => {
        const t = Math.hypot(x - hill.x, y - hill.y) / hill.radius;
        return height + (t < 1 ? hill.height * (1 + Math.cos(t * Math.PI)) / 2 : 0);
    }, 0);
    if (hills === 0) return 0;
    const p = {x,y};
    const clearance = Math.min(Math.abs(x) - layout.corridorHalfWidth - 1, Math.hypot(x,y) - 11, distanceToWater(layout,p) - 2,
        ...layout.paths.map(route => distanceToPath(p,route.points) - route.width/2 - 3),
        ...layout.districts.map(d => Math.max(Math.abs(x-d.x)-d.width/2,Math.abs(y-d.y)-d.depth/2)-2));
    if (clearance <= 0) return 0;
    const t = Math.min(1,clearance/4), blend = t*t*(3-2*t);
    // Hills fade out over the last 30 m before the map edge: the relief meets the flat land beyond it without a step.
    const e = Math.min(1, Math.max(0, (layout.size / 2 - Math.max(Math.abs(x), Math.abs(y))) / 30)), edge = e * e * (3 - 2 * e);
    return edge * blend * hills;
}

/** Towns, villages, farms, industry, an airfield, a power line and woods around one connected road network (see world-builder.ts). */
export function populateWorld(layout: TrainingLayout, density: number): TrainingLayout {
    return buildWorld(layout, density);
}
