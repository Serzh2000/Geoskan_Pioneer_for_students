import { droneHull, receiveMessage, resetMailbox, sendMessage, SERVICE_HULLS } from '../public/modules/world/mailbox.js';
import { createWorldServices, type Incident } from '../public/modules/world/services.js';

describe('emergency services', () => {
    const line = (from: { x: number; y: number }, to: { x: number; y: number }) => [from, to];
    const setup = (incidents: Incident[]) => {
        resetMailbox();
        const drone = droneHull('d1');
        const world = createWorldServices({ incidents, homes: { fire: { x: 0, y: 0 }, repair: { x: 0, y: 10 }, police: { x: 5, y: 0 } }, route: line, speed: 10 });
        const inbox = () => { const out: string[] = []; for (let m = receiveMessage(drone); m; m = receiveMessage(drone)) out.push(`${m.from}:${m.text}`); return out; };
        const run = (seconds: number) => { for (let t = 0; t < seconds; t += .1) world.update(.1); };
        return { drone, world, inbox, run };
    };
    const fire: Incident = { id: 'f', kind: 'fire', x: 100, y: 0, startAt: 0, active: false, resolved: false };

    it('puts out a fire reported at the right place and calls the police along', () => {
        const { drone, world, inbox, run } = setup([{ ...fire }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.fire, 'fire 98 3');
        expect(inbox()[0]).toMatch(/^101:accepted \d+$/);
        expect(world.responders.find(r => r.kind === 'police')!.state).toBe('driving');
        run(30);
        expect(world.incidents[0].resolved).toBe(true);
        expect(inbox()).toEqual(expect.arrayContaining(['101:arrived', '101:done']));
        run(30);
        expect(world.responders.find(r => r.kind === 'fire')!.state).toBe('idle');
    });

    it('drives away with nothing when the reported point is wrong', () => {
        const { drone, world, inbox, run } = setup([{ ...fire }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.fire, 'fire -90 40');
        run(40);
        expect(world.incidents[0].resolved).toBe(false);
        expect(inbox()).toEqual(expect.arrayContaining(['101:nothing found']));
    });

    it('refuses a second call while busy and malformed text', () => {
        const { drone, inbox, run } = setup([{ ...fire }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.fire, 'fire 98 3');
        sendMessage(drone, SERVICE_HULLS.fire, 'fire 10 10');
        sendMessage(drone, SERVICE_HULLS.repair, 'help');
        const got = inbox();
        expect(got).toEqual(expect.arrayContaining(['101:busy']));
        expect(got.some(m => m.startsWith('103:error'))).toBe(true);
    });

    it('does not see a break before it happens: repair finds nothing', () => {
        const { drone, world, inbox, run } = setup([{ id: 'l', kind: 'line-break', x: 50, y: 50, startAt: 999, active: false, resolved: false }]);
        sendMessage(drone, SERVICE_HULLS.repair, 'repair 50 50');
        run(30);
        expect(world.incidents[0].resolved).toBe(false);
        expect(inbox()).toEqual(expect.arrayContaining(['103:nothing found']));
    });

    it('repairs a real line break reported near its true position', () => {
        const { drone, world, inbox, run } = setup([{ id: 'l', kind: 'line-break', x: 50, y: 50, startAt: 0, active: false, resolved: false }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.repair, 'repair 55 44');
        run(40);
        expect(world.incidents[0].resolved).toBe(true);
        expect(inbox()).toEqual(expect.arrayContaining(['103:done', '103:home']));
    });

    const crime = (kind: 'burglary' | 'fight'): Incident => ({ id: kind, kind, x: 60, y: 30, startAt: 0, active: false, resolved: false });

    it.each(['burglary', 'fight'] as const)('police arrest the culprit of a %s and take them to the station', kind => {
        const { drone, world, inbox, run } = setup([crime(kind)]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.police, 'police 58 33');
        expect(inbox()[0]).toMatch(/^102:accepted \d+$/);
        const police = world.responders.find(r => r.kind === 'police')!;
        run(60);
        expect(world.incidents[0].resolved).toBe(true);
        expect(police.prisoner).toBe(true);
        expect(inbox()).toEqual(expect.arrayContaining(['102:arrived', '102:done', '102:home']));
        expect(police.state).toBe('idle');
        expect(police.workIncident).toBeNull();
    });

    it('police sent to the wrong street find nobody and leave without a prisoner', () => {
        const { drone, world, inbox, run } = setup([crime('burglary')]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.police, 'police -80 -80');
        run(60);
        expect(world.incidents[0].resolved).toBe(false);
        expect(world.responders.find(r => r.kind === 'police')!.prisoner).toBe(false);
        expect(inbox()).toEqual(expect.arrayContaining(['102:nothing found', '102:home']));
    });

    it('the fire crew calls the police only to help: no investigation, no false alarm', () => {
        const { drone, world, inbox, run } = setup([{ ...fire }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.fire, 'fire 98 3');
        const police = world.responders.find(r => r.kind === 'police')!;
        expect(police.assist).toBe(true);
        run(60);
        expect(police.state).toBe('idle');
        expect(inbox().some(m => m.startsWith('102:'))).toBe(false);   // the drone hears only the fire brigade
    });

    it('exposes the work phase: total length and the incident being worked on', () => {
        const { drone, world, run } = setup([{ ...fire }]);
        run(.2);
        sendMessage(drone, SERVICE_HULLS.fire, 'fire 98 3');
        const truck = world.responders.find(r => r.kind === 'fire')!;
        let guard = 0;
        while (truck.state !== 'working' && guard++ < 2000) world.update(.1);
        expect(truck.workTotal).toBeGreaterThan(10);
        expect(truck.workIncident?.kind).toBe('fire');
        expect(truck.timer).toBeLessThanOrEqual(truck.workTotal);
    });
});

