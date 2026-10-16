import { buildRoadGraph, findRoute, routeLength } from '../public/modules/world/roads.js';
import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { droneHull, hasMessages, receiveMessage, registerService, resetMailbox, sendMessage, setDroneHull } from '../public/modules/world/mailbox.js';

describe('road graph', () => {
    it('joins two crossing roads and routes through the junction', () => {
        const graph = buildRoadGraph([
            { id: 'a', kind: 'road', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }] },
            { id: 'b', kind: 'road', points: [{ x: 40, y: 2 }, { x: 40, y: 40 }] }
        ]);
        const route = findRoute(graph, { x: 0, y: 0 }, { x: 40, y: 40 })!;
        expect(route).not.toBeNull();
        expect(routeLength(route)).toBeLessThan(95);
    });
    it('reaches the district roads of every generated profile from the fire station site', () => {
        for (const profile of ['urban', 'forest', 'hills', 'industrial', 'mixed'] as const) {
            const layout = generateTrainingLayout({ profile, seed: 20261009 });
            const graph = buildRoadGraph(layout.paths);
            const roads = layout.paths.filter((p: { kind: string }) => p.kind === 'road');
            if (!roads.length) continue;
            const a = roads[0].points[0];
            for (const road of roads) expect(findRoute(graph, a, road.points[road.points.length - 1])).not.toBeNull();
        }
    });
});

describe('mailbox bus', () => {
    beforeEach(resetMailbox);
    it('delivers to a hull inbox in order and reports -1 when empty', () => {
        const a = droneHull('d1'), b = droneHull('d2');
        sendMessage(a, b, 'hi'); sendMessage(a, b, 7);
        expect(hasMessages(b)).toBe(true);
        expect(receiveMessage(b)).toEqual({ from: a, text: 'hi' });
        expect(receiveMessage(b)).toEqual({ from: a, text: 7 });
        expect(receiveMessage(b)).toBeNull();
    });
    it('broadcasts to everybody but the sender, and services get a handler call', () => {
        const a = droneHull('d1'); droneHull('d2');
        const seen: string[] = [];
        registerService(101, m => seen.push(String(m.text)));
        sendMessage(a, -1, 'all');
        expect(seen).toEqual(['all']);
        expect(hasMessages(a)).toBe(false);
        expect(hasMessages(droneHull('d2'))).toBe(true);
    });
    it('lets a drone change its hull number', () => {
        setDroneHull('d1', 42);
        expect(droneHull('d1')).toBe(42);
        expect(() => setDroneHull('d1', -3)).toThrow();
    });
});

import { trimRoute } from '../public/modules/world/roads.js';
describe('trimRoute', () => {
    it('stops the given distance before the end, across segments', () => {
        const route = trimRoute([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 14);
        expect(route[route.length - 1].x).toBeCloseTo(6);
        expect(route[route.length - 1].y).toBeCloseTo(0);
    });
});
