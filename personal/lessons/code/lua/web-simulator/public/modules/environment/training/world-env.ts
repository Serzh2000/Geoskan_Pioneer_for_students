import type { Box, Point2 } from './geography.js';
import type { TrainingLayout } from './layout.js';
import type { Cell } from './patterns.js';
import type { RoadSpec } from './road-network.js';
import type { Ctx } from './world-context.js';
import type { WorldPath } from './world-plan.js';

/** One place on the map: a city, town, village, hamlet or industrial estate, with its streets and the blocks between them. */
export type Settlement = {
    id: string; kind: 'city' | 'town' | 'village' | 'estate'; style: 'urban' | 'rural' | 'industrial'; c: Point2; a: number; b: number; box: Box;
    roads: string[]; cells: Cell[]; main: string; range?: [number, number]; hole?: Box; lessonCell?: Cell; parks: Cell[]; plazas: Cell[];
    sidewalks: Set<string>; hub: boolean;
    /** Several centres of gravity (the city on both sides of the lesson park); the nearest one decides how dense a street is. */
    cores?: Array<{ c: Point2; a: number; b: number }>;
    /** Housing blocks kept free of lanes for a hospital, school or church, which need a plot no street cuts across. */
    civic?: Cell[];
};

/** Everything the town-building passes share: the context, the settlements so far, and a few land-claim helpers. */
export type Env = {
    ctx: Ctx; layout: TrainingLayout; size: number; half: number; f: number; isCity: boolean;
    settlements: Settlement[]; roadOwner: Map<string, Settlement>;
    /** True when `b` (plus a margin) overlaps land that is already spoken for. */
    touches(b: Box, margin?: number): boolean;
    /** True when no water lies within `margin` of the box. */
    dry(b: Box, margin?: number): boolean;
    /** Lay the roads of a pattern for a settlement; returns how many were accepted. */
    adopt(s: Settlement, specs: RoadSpec[]): number;
};

/** The skeleton of the map that settlements hang on. */
export type Skeleton = { avenueY: number; highwayPoints: Point2[]; heightAt(x: number): number; riverBase: number; riverWidth: number; meander: number; lean: number; river: Point2[]; xs: number };

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Draw order of paths: the avenue first (the runtime puts its first cars on it), then arterials, collectors, links, streets, rails, footpaths. */
export function rank(p: WorldPath): number {
    if (p.kind === 'road') return p.id === 'avenue' ? 0 : p.hierarchy === 'arterial' ? 1 : p.hierarchy === 'collector' ? 2 : p.hierarchy === 'link' ? 3 : 4;
    return p.kind === 'rail' ? 5 : p.kind === 'runway' ? 6 : 7;
}
