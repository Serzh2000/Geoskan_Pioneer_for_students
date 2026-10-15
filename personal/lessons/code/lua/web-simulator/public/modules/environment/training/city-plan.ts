import type { TrainingLayout } from './layout.js';
import { buildWorld } from './world-builder.js';

/*
 * The big-city profile. It runs through the same pipeline as every other inhabited map (world-builder.ts) with a city recipe:
 *   - one large city whose street pattern depends on the seed: ruled grid, organic (jittered) streets or a radial plan;
 *     a grid city keeps the lesson strip inside a big park block bounded by the avenue;
 *   - a hierarchy of roads (avenue > collectors > streets > lanes), sidewalks along the main streets;
 *   - a centre of apartments and offices, hospital, schools, a mall, restaurants with terraces, a church, petrol stations,
 *     parks and a central square, fire and police stations facing the avenue;
 *   - the railway station, a freight yard on a siding, a northern artery over the railway on an overpass;
 *   - satellite villages, a farm, a power line, wind turbines and woods on the outskirts.
 * Pure and seeded; every prop respects the layout rules.
 */
export function populateCity(layout: TrainingLayout, density: number): TrainingLayout {
    return buildWorld(layout, density);
}
