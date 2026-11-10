import { placePerson, poseNow, type Person, type PoseMode } from './actors.js';

/*
 * Kinematics and gait of a walking person. Everything that moves a figure around the city (crews, pedestrians) goes
 * through here, so that a person always:
 *   - speeds up and slows down smoothly (no jumps),
 *   - turns at a bounded angular speed and faces the way it walks,
 *   - swings its legs in step with the ground it covers (actors.ts takes the phase from the distance travelled),
 *   - eases into the idle pose when it stops (blending in actors.ts), never by freezing mid-stride.
 * Poses themselves are the job of actors.ts (`poseNow`); this file only decides which one and at which phase.
 */
export const WALK_SPEED = 1.4, RUN_SPEED = 3.4;
export const TURN_RATE = 5;                 // rad/s, the most a body can swing round
const ACCEL = 2.2, DECEL = 3.2;             // m/s^2
const RUN_ABOVE = 2.3, WALK_BELOW = 2.0;    // hysteresis between the two gaits (m/s)

export type Solid = { x: number; y: number; r: number };
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const turnToward = (heading: number, wanted: number, dt: number, rate = TURN_RATE) =>
    heading + Math.max(-rate * dt, Math.min(rate * dt, angleDiff(heading, wanted)));

/**
 * Chooses the pose of one figure from its ground speed and hands it to actors.ts, which blends between poses (about 0.2 s)
 * and runs the stride from the distance the figure actually covers. `still` is the pose shown when it stands (idle, work,
 * handsUp ...), `carry` swaps the walking pose for the one with arms held out in front. Walk and run have a hysteresis so
 * that a figure at the border speed does not flicker between them.
 */
export class Gait {
    private mode: PoseMode = 'idle';
    private idleTime = 0;
    constructor(readonly person: Person) { person.root.userData.personRef = person; }

    update(dt: number, speed: number, still: PoseMode = 'idle', carry = false) {
        const p = this.person;
        let mode: PoseMode = still;
        if (speed > .08) mode = (this.mode === 'run' ? speed > WALK_BELOW : speed > RUN_ABOVE) ? 'run' : carry ? 'carry' : 'walk';
        // Standing still the pose hardly changes (a breath): refresh it ten times a second, not every frame.
        if (mode === 'idle' && this.mode === 'idle' && p.mode === 'idle') {
            this.idleTime += dt;
            if (this.idleTime < .1) return;
            dt = this.idleTime;
        }
        this.idleTime = 0;
        this.mode = mode;
        poseNow(p, mode, dt, 1);
    }
}

export type DriveOptions = {
    /** Speed to move at while far from the goal (WALK_SPEED or RUN_SPEED). */
    pace?: number;
    /** Face this way when standing at the goal. */
    face?: number;
    still?: PoseMode;
    carry?: boolean;
    /** Stop short of the goal by this much. */
    stopAt?: number;
};

/**
 * A figure that chases a goal point: the goal may jump about (a script moves it), the figure never does. It accelerates
 * smoothly, turns at a bounded rate, slows to arrive and never ends up inside one of the solid circles it is given.
 */
export class Mover {
    x = 0; y = 0; z = 0; heading = 0; speed = 0;
    readonly gait: Gait;
    solids: ReadonlyArray<Solid> = [];
    /** True when the figure has been walking into something for a while and gave up: it stands, and the gait follows. */
    blocked = false;
    private pressed = 0;
    private covered = 0;
    /** A goal that proved unreachable (a wall in the way): the figure stands instead of trying again until the goal moves. */
    private lost: { x: number; y: number } | null = null;
    constructor(readonly person: Person, readonly ground: (x: number, y: number) => number = () => 0) {
        this.gait = new Gait(person);
    }

    /** Puts the figure down (it is hidden or has just been created: this is not a movement). */
    reset(x: number, y: number, heading = this.heading) {
        this.x = x; this.y = y; this.heading = heading; this.speed = 0; this.covered = 0;
        this.apply(0, 'idle', false);
    }

    /** One frame towards `goal`. Returns the distance still to go. */
    drive(dt: number, goal: { x: number; y: number }, o: DriveOptions = {}): number {
        const dx = goal.x - this.x, dy = goal.y - this.y, d = Math.hypot(dx, dy), pace = o.pace ?? WALK_SPEED;
        const remaining = Math.max(0, d - (o.stopAt ?? 0));
        if (this.lost && Math.hypot(goal.x - this.lost.x, goal.y - this.lost.y) > 1.2) this.lost = null;
        let wanted = this.heading;
        if (remaining > .12) wanted = Math.atan2(dy, dx); else if (o.face !== undefined) wanted = o.face;
        const diff = Math.abs(angleDiff(this.heading, wanted));
        this.heading = turnToward(this.heading, wanted, dt);
        // Walk off only roughly facing the goal; brake so as to stop on it.
        let top = remaining > .12 && !this.lost ? Math.min(pace, Math.sqrt(2 * DECEL * .8 * remaining)) : 0;
        if (diff > .9) top = Math.min(top, .5);
        else if (diff > .4) top = Math.min(top, pace * .6);
        top = Math.min(top, remaining / dt);
        this.speed += Math.max(-DECEL * dt, Math.min(ACCEL * dt, top - this.speed));
        if (this.speed < .01 && top === 0) this.speed = 0;
        if (this.blocked) { this.speed = 0; this.pressed -= dt; if (this.pressed <= 0) this.blocked = false; }
        const move = this.speed * dt, fromX = this.x, fromY = this.y;
        this.x += Math.cos(this.heading) * move; this.y += Math.sin(this.heading) * move;
        this.pushOut();
        // Pushing against a wall without getting anywhere: stop walking on the spot instead of marching in place.
        const got = Math.hypot(this.x - fromX, this.y - fromY);
        if (this.speed > .08 && got < this.speed * dt * .25) { this.pressed += dt; if (this.pressed > .5) { this.blocked = true; this.pressed = 1.5; this.speed = 0; this.lost = { x: goal.x, y: goal.y }; } }
        else if (!this.blocked) this.pressed = Math.max(0, this.pressed - dt);
        // The legs follow the ground really covered, not the speed asked for: a figure held up by a wall stands, it does not march.
        this.covered += (got / dt - this.covered) * Math.min(1, dt * 12);
        this.apply(dt, o.still ?? 'idle', !!o.carry, Math.min(this.speed, this.covered));
        return remaining;
    }

    private pushOut() {
        for (const s of this.solids) {
            const dx = this.x - s.x, dy = this.y - s.y, d = Math.hypot(dx, dy);
            if (d >= s.r) continue;
            const k = d > 1e-6 ? s.r / d : 0;
            if (k) { this.x = s.x + dx * k; this.y = s.y + dy * k; } else this.x = s.x + s.r;
        }
    }

    private apply(dt: number, still: PoseMode, carry: boolean, gaitSpeed = this.speed) {
        this.z = this.ground(this.x, this.y);
        placePerson(this.person, this.x, this.y, this.z, this.heading);
        this.gait.update(dt, gaitSpeed, still, carry);
    }
}
