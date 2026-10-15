import { registerHooks } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

// Run the pure TypeScript planner without booting a renderer or a server.
registerHooks({
    resolve(specifier, context, next) {
        if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL?.includes('/public/modules/')) {
            const source = new URL(specifier.replace(/\.js$/, '.ts'), context.parentURL);
            if (existsSync(source)) return next(source.href, context);
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
        return next(url, context);
    }
});
const { generateTrainingLayout } = await import('../public/modules/environment/training/layout.ts');
const { residentialNeighbors } = await import('../public/modules/environment/training/settlement-policy.ts');
const { distanceToPath, nearestOnPath } = await import('../public/modules/environment/training/geography.ts');
const { buildRoadGraph, nearestNode } = await import('../public/modules/world/roads.ts');

/** Structural checks of one layout: the things a viewer of the map would call defects. */
function structure(layout) {
    const roads = layout.paths.filter(p => p.kind === 'road'), half = layout.size / 2;
    const graph = buildRoadGraph(layout.paths);
    const seen = new Set([0]), queue = [0];
    while (queue.length) for (const edge of graph.edges[queue.pop()]) if (!seen.has(edge.to)) { seen.add(edge.to); queue.push(edge.to); }
    const disconnected = roads.filter(road => !road.points.every(p => seen.has(nearestNode(graph, p)))).map(road => road.id);
    let deadEnds = 0;
    for (const road of roads) {
        if (road.hierarchy === 'lane' || /-rib|^farm-lane|^airfield-road|^industry-road|^station-road/.test(road.id)) continue;
        for (const end of [road.points[0], road.points[road.points.length - 1]]) {
            if (Math.abs(end.x) > half - 12 || Math.abs(end.y) > half - 12) continue;
            if (!roads.some(other => other !== road && distanceToPath(end, other.points) < .6) && !layout.paths.some(p => p.kind === 'footpath' && distanceToPath(end, p.points) < .6)) deadEnds++;
        }
    }
    const homes = layout.objects.filter(p => p.type === 'house' || p.type === 'building');
    let homesFarFromRoad = 0;
    for (const home of homes) if (!roads.some(road => nearestOnPath(home, road.points).distance <= 24)) homesFarFromRoad++;
    const service = type => {
        const s = layout.objects.find(p => p.type === type);
        if (!s) return null;
        const hit = roads.map(road => nearestOnPath(s, road.points)).sort((a, b) => a.distance - b.distance)[0];
        return { roadMetres: +hit.distance.toFixed(1), x: +s.x.toFixed(1), y: +s.y.toFixed(1) };
    };
    return { roads: roads.length, roadHierarchy: Object.fromEntries(['arterial', 'collector', 'street', 'lane', 'link'].map(h => [h, roads.filter(r => r.hierarchy === h).length])),
        disconnectedRoads: disconnected, deadEnds, homes: homes.length, homesFarFromRoad, bridges: layout.bridges.length, overpass: layout.bridges.some(b => b.kind === 'overpass'),
        districts: layout.districts.length, powerPylons: layout.objects.filter(p => p.type === 'power-pylon').length, fireStation: service('fire-station'), policeStation: service('police-station') };
}

const samples = [];
for (const profile of ['forest', 'hills', 'urban', 'industrial', 'mixed', 'city']) for (const seed of [1, 2, 7, 341]) {
    const start = performance.now(), layout = generateTrainingLayout({ profile, seed, density: 1 });
    const generationMs = Math.round(performance.now() - start);
    const counts = {};
    for (const p of layout.objects) counts[p.type] = (counts[p.type] ?? 0) + 1;
    const civic = layout.objects.filter(p => ['school', 'hospital', 'church'].includes(p.type)).map(p => ({ type: p.type, district: p.districtId, homesWithin75m: residentialNeighbors(layout, p), x: +p.x.toFixed(1), y: +p.y.toFixed(1) }));
    samples.push({ profile, seed, size: layout.size, density: 1, generationMs, objects: layout.objects.length, counts, civic, structure: structure(layout) });
}
writeFileSync(new URL('../docs/map-generation-check.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), samples }, null, 2) + '\n');
for (const sample of samples) {
    const st = sample.structure;
    console.log(`${sample.profile} #${sample.seed}: ${sample.objects} objects, ${sample.generationMs} ms; roads ${st.roads}, dead ends ${st.deadEnds}, disconnected ${st.disconnectedRoads.length}, homes ${st.homes} (${st.homesFarFromRoad} far from a road); civic ${sample.civic.map(p => `${p.type}:${p.homesWithin75m} homes`).join(', ') || 'none'}`);
}
