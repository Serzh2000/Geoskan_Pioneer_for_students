import type { Point2 } from '../environment/training/geography.js';
import { registerService, sendMessage, SERVICE_HULLS, type MailboxMessage } from './mailbox.js';
import { routeLength, trimRoute } from './roads.js';

/*
 * Emergency services as mailbox endpoints. A drone writes e.g. `mailbox.send(101, "fire 40 -12")`;
 * the service drives to those coordinates and answers to the sender. If nothing is burning there,
 * the crew finds nothing and drives back: a wrong report costs a trip.
 *
 * Message grammar:  "<kind> <x> <y>"  with kind = fire | repair | police
 * Answers:          "accepted <eta s>" -> "arrived" -> "done" | "nothing found" -> "home"
 */
export type IncidentKind = 'fire' | 'line-break' | 'burglary' | 'fight';
export type Incident = { id: string; kind: IncidentKind; x: number; y: number; startAt: number; active: boolean; resolved: boolean };
export type ResponderKind = 'fire' | 'repair' | 'police';
export type ResponderState = 'idle' | 'driving' | 'working' | 'returning';
export type Responder = {
    kind: ResponderKind; hull: number; home: Point2; homeHeading: number; x: number; y: number; heading: number;
    state: ResponderState; route: Point2[]; leg: number; target: Point2 | null; replyTo: number; timer: number; speed: number;
    /** Length of the work phase in seconds and the incident being worked on (null: searching, or helping another service). */
    workTotal: number; workIncident: Incident | null; assist: boolean;
    /** Police: a suspect is in the car, being taken to the station. Cleared at the next call. */
    prisoner: boolean;
};
export type ServiceEvent = { type: 'dispatched' | 'arrived' | 'resolved' | 'false-alarm' | 'home'; responder: Responder; incident?: Incident };

/** How far a reported point may be from the real incident and still count as the right place. */
export const REPORT_TOLERANCE = 22;
const WORK_SECONDS: Record<ResponderKind, number> = { fire: 16, repair: 20, police: 18 };
const SEARCH_SECONDS = 3;
const ASSIST_SECONDS = 4;
const MIN_ETA = 1;
/** How far from the reported point a crew parks (the fire engine must not drive into the burning house). */
const STANDOFF: Record<ResponderKind, number> = { fire: 20, repair: 12, police: 9 };
/** What each service can put right. Police: a burglary or a fight. */
const TARGET: Record<ResponderKind, IncidentKind[]> = { fire: ['fire'], repair: ['line-break'], police: ['burglary', 'fight'] };

export type WorldServices = {
    incidents: Incident[];
    responders: Responder[];
    time: number;
    update(dt: number): void;
    onEvent(listener: (event: ServiceEvent) => void): void;
    dispose(): void;
};

export function createWorldServices(options: {
    incidents: Incident[];
    /** Parking place of each crew; `heading` is the way the vehicle faces when parked (out of its bay). */
    homes: Partial<Record<ResponderKind, Point2 & { heading?: number }>>;
    route: (from: Point2, to: Point2) => Point2[] | null;
    speed?: number;
}): WorldServices {
    const listeners: Array<(event: ServiceEvent) => void> = [];
    const emit = (event: ServiceEvent) => listeners.forEach(listener => listener(event));
    const responders: Responder[] = [];
    const unregister: Array<() => void> = [];
    const returnRoutes = new Map<Responder, Point2[]>();
    const speed = options.speed ?? 11;
    if (!Number.isFinite(speed) || speed <= 0) throw new Error('Service speed must be a positive finite number');
    const hullOf: Record<ResponderKind, number> = { fire: SERVICE_HULLS.fire, repair: SERVICE_HULLS.repair, police: SERVICE_HULLS.police };

    for (const kind of ['fire', 'repair', 'police'] as ResponderKind[]) {
        const home = options.homes[kind];
        if (!home) continue;
        const responder: Responder = { kind, hull: hullOf[kind], home: { x: home.x, y: home.y }, homeHeading: home.heading ?? 0, x: home.x, y: home.y, heading: home.heading ?? 0, state: 'idle',
            route: [], leg: 0, target: null, replyTo: -1, timer: 0, speed, workTotal: 0, workIncident: null, assist: false, prisoner: false };
        responders.push(responder);
        unregister.push(registerService(responder.hull, message => handle(responder, message)));
    }

    const say = (responder: Responder, to: number, text: string) => { if (to >= 0) sendMessage(responder.hull, to, text); };

    function handle(responder: Responder, message: MailboxMessage) {
        const parts = String(message.text).trim().toLowerCase().split(/\s+/);
        const x = Number(parts[1]), y = Number(parts[2]);
        const fromService = Object.values(SERVICE_HULLS).some(hull => hull === message.from);
        if (parts.length !== 3 || parts[0] !== responder.kind || !Number.isFinite(x) || !Number.isFinite(y)) {
            // Replies between services ("accepted", "done", ...) are not requests: answering them would never end.
            if (fromService) return;
            say(responder, message.from, `error expected "${responder.kind} <x> <y>"`);
            return;
        }
        if (responder.state !== 'idle') { say(responder, message.from, 'busy'); return; }
        const full = options.route({ x: responder.x, y: responder.y }, { x, y });
        if (!full?.length || full.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) { say(responder, message.from, 'error no road'); return; }
        const route = trimRoute(full, STANDOFF[responder.kind]);
        const back = options.route(route[route.length - 1], responder.home);
        if (!back?.length || back.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) { say(responder, message.from, 'error no return road'); return; }
        // Cache the actual return path before dispatch; never declare home without driving there.
        returnRoutes.set(responder, back.map(point => ({ ...point })));
        Object.assign(responder, { state: 'driving', route, leg: 1, target: { x, y }, replyTo: message.from, timer: 0, workIncident: null, prisoner: false,
            // The fire brigade asks the police to close the street: that crew helps, it does not investigate.
            assist: responder.kind === 'police' && message.from === SERVICE_HULLS.fire });
        say(responder, message.from, `accepted ${Math.max(MIN_ETA, Math.round(routeLength(route) / responder.speed))}`);
        emit({ type: 'dispatched', responder });
        // The fire brigade asks the police to close the street, like a real call-out.
        if (responder.kind === 'fire') sendMessage(responder.hull, SERVICE_HULLS.police, `police ${x} ${y}`);
    }

    function drive(responder: Responder, dt: number): boolean {
        let budget = responder.speed * dt;
        while (budget > 0 && responder.leg < responder.route.length) {
            const to = responder.route[responder.leg];
            const dx = to.x - responder.x, dy = to.y - responder.y;
            const d = Math.hypot(dx, dy);
            if (d > 1e-6) responder.heading = Math.atan2(dy, dx);
            if (d <= budget) { responder.x = to.x; responder.y = to.y; budget -= d; responder.leg++; }
            else { responder.x += dx / d * budget; responder.y += dy / d * budget; budget = 0; }
        }
        return responder.leg >= responder.route.length;
    }

    function findIncident(responder: Responder): Incident | undefined {
        const kinds = TARGET[responder.kind];
        const target = responder.target!;
        return options.incidents.find(i => kinds.includes(i.kind) && i.active && !i.resolved && Math.hypot(i.x - target.x, i.y - target.y) <= REPORT_TOLERANCE);
    }

    function step(responder: Responder, dt: number) {
        if (responder.state === 'driving') {
            if (!drive(responder, dt)) return;
            const incident = responder.assist ? undefined : findIncident(responder);
            responder.state = 'working';
            responder.timer = responder.workTotal = responder.assist ? ASSIST_SECONDS : incident ? WORK_SECONDS[responder.kind] : SEARCH_SECONDS;
            responder.workIncident = incident ?? null;
            say(responder, responder.replyTo, 'arrived');
            emit({ type: 'arrived', responder, incident });
        } else if (responder.state === 'working') {
            responder.timer -= dt;
            if (responder.timer > 0) return;
            const incident = responder.assist ? undefined : findIncident(responder);
            if (incident) {
                incident.resolved = true;
                responder.prisoner = incident.kind === 'burglary' || incident.kind === 'fight';
                say(responder, responder.replyTo, 'done');
                emit({ type: 'resolved', responder, incident });
            } else if (responder.assist) {
                say(responder, responder.replyTo, 'done');
            } else {
                say(responder, responder.replyTo, 'nothing found');
                emit({ type: 'false-alarm', responder });
            }
            responder.workIncident = null;
            const back = returnRoutes.get(responder)!;
            Object.assign(responder, { state: 'returning', route: back, leg: 1, target: null });
        } else if (responder.state === 'returning') {
            if (!drive(responder, dt)) return;
            responder.state = 'idle';
            returnRoutes.delete(responder);
            responder.heading = responder.homeHeading;   // parked nose-out again
            say(responder, responder.replyTo, 'home');
            emit({ type: 'home', responder });
        }
    }

    const services: WorldServices = {
        incidents: options.incidents, responders, time: 0,
        update(dt) {
            if (!Number.isFinite(dt) || dt <= 0) return;
            services.time += dt;
            for (const incident of options.incidents) if (!incident.active && !incident.resolved && services.time >= incident.startAt) incident.active = true;
            for (const responder of responders) step(responder, dt);
        },
        onEvent(listener) { listeners.push(listener); },
        dispose() { unregister.forEach(remove => remove()); returnRoutes.clear(); listeners.length = 0; }
    };
    return services;
}
