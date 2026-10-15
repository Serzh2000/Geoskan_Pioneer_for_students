/** Bounded evidence captured only during a guided experiment, never persisted. */
export type LearningEvent = {
    time: number;
    kind: 'arm' | 'print' | 'led' | 'state' | 'position' | 'range' | 'camera' | 'detect' | 'display' | 'annotation' | 'velocity';
    frameId?: number;
    width?: number;
    height?: number;
    view?: string;
    dictionary?: string;
    markers?: Array<{ id: number; corners: Array<[number, number]> }>;
    velocity?: { x: number; y: number; z: number };
    point?: { x: number; y: number };
    value?: number;
    text?: string;
    accepted?: boolean;
    state?: string;
    from?: string;
    pos?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
    yaw?: number;
    ledId?: number;
    color?: { r: number; g: number; b: number };
};
function copyEvent(event: LearningEvent): LearningEvent {
    return { ...event, ...(event.color ? { color: { ...event.color } } : {}), ...(event.pos ? { pos: { ...event.pos } } : {}), ...(event.target ? { target: { ...event.target } } : {}), ...(event.markers ? { markers: event.markers.map(marker => ({ id: marker.id, corners: marker.corners.map(point => [...point] as [number, number]) })) } : {}), ...(event.velocity ? { velocity: { ...event.velocity } } : {}), ...(event.point ? { point: { ...event.point } } : {}) };
}
const captures = new Map<string, { token: number; events: LearningEvent[]; origin?: number }>();
let serial = 0;

export function beginLearningCapture(droneId: string): number {
    const token = ++serial;
    captures.set(droneId, { token, events: [] });
    return token;
}

export function recordLearningEvent(droneId: string, event: LearningEvent): void {
    const capture = captures.get(droneId);
    if (!capture) return;
    capture.events.push(copyEvent({ ...event, time: event.time - (capture.origin || 0) }));
    if (capture.events.length > 512) capture.events.splice(0, capture.events.length - 512);
}

export function markLearningRunStarted(droneId: string, simulationTime: number): void {
    const capture = captures.get(droneId);
    if (capture) capture.origin = simulationTime;
}

export function finishLearningCapture(droneId: string, token: number): LearningEvent[] {
    const capture = captures.get(droneId);
    if (!capture || capture.token !== token) return [];
    captures.delete(droneId);
    return capture.events.map(copyEvent);
}

export function hasLearningMessage(droneId: string, token: number, text: string): boolean {
    const capture = captures.get(droneId);
    return capture?.token === token && capture.events.some(event => event.kind === 'print' && event.text === text);
}
