/*
 * Bus behind the Lua `mailbox` object: every drone and every emergency service has a hull number
 * and an inbox. `send(hull < 0, ...)` reaches everybody known except the sender. Services (fire
 * station, repair crew, ...) are ordinary endpoints with a handler, so a drone talks to them
 * exactly as it would talk to another drone.
 */
export type MailboxMessage = { from: number; text: string | number };
export type MailboxHandler = (message: MailboxMessage) => void;

export const SERVICE_HULLS = { fire: 101, police: 102, repair: 103, airfield: 104 } as const;

type Endpoint = { inbox: MailboxMessage[]; handler?: MailboxHandler };

const endpoints = new Map<number, Endpoint>();
const droneHulls = new Map<string, number>();

function endpoint(hull: number): Endpoint {
    let found = endpoints.get(hull);
    if (!found) endpoints.set(hull, found = { inbox: [] });
    return found;
}

export function resetMailbox(): void {
    endpoints.clear();
    droneHulls.clear();
}

/** Service side: handler runs synchronously for every message addressed to (or broadcast past) this hull. */
export function registerService(hull: number, handler: MailboxHandler): () => void {
    endpoint(hull).handler = handler;
    return () => { if (endpoints.get(hull)?.handler === handler) endpoints.delete(hull); };
}

export function droneHull(droneId: string): number {
    let hull = droneHulls.get(droneId);
    if (hull === undefined) {
        const taken = new Set([...endpoints.keys(), ...Object.values(SERVICE_HULLS)]);
        hull = 1;
        while (taken.has(hull)) hull++;
        droneHulls.set(droneId, hull);
        endpoint(hull);
    }
    return hull;
}

export function setDroneHull(droneId: string, hull: number): void {
    if (!Number.isInteger(hull) || hull < 0) throw new Error('mailbox.setHullNumber: бортномер должен быть целым числом >= 0');
    if (Object.values(SERVICE_HULLS).some(value => value === hull) || endpoints.get(hull)?.handler) throw new Error('mailbox.setHullNumber: бортномер занят службой');
    if ([...droneHulls].some(([id, value]) => id !== droneId && value === hull)) throw new Error('mailbox.setHullNumber: бортномер занят другим дроном');
    const old = droneHulls.get(droneId);
    if (old !== undefined && old !== hull) endpoints.delete(old);
    droneHulls.set(droneId, hull);
    endpoint(hull);
}

export function sendMessage(from: number, to: number, text: string | number): void {
    if (!Number.isInteger(to)) throw new Error('mailbox.send: адресат должен быть целым бортномером');
    if ((typeof text !== 'string' && typeof text !== 'number') || (typeof text === 'number' && !Number.isFinite(text))) throw new Error('mailbox.send: сообщение должно быть строкой или конечным числом');
    const message: MailboxMessage = { from, text };
    const targets = to < 0 ? [...endpoints.keys()].filter(hull => hull !== from) : [to];
    for (const hull of targets) {
        const target = endpoints.get(hull);
        if (!target) continue; // nobody listens on this hull: like a radio message to an empty channel
        if (target.handler) target.handler(message); else target.inbox.push(message);
    }
}

export function hasMessages(hull: number): boolean {
    return (endpoints.get(hull)?.inbox.length ?? 0) > 0;
}

export function receiveMessage(hull: number): MailboxMessage | null {
    return endpoints.get(hull)?.inbox.shift() ?? null;
}
