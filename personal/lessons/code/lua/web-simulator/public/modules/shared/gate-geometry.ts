/**
 * Shared source of truth for the competition-gate ring geometry.
 *
 * These numbers are used in two independent places that must agree:
 *  - `environment/obstacles/competition.ts` builds the visual gate mesh
 *    (the ring torus and its support poles) from them, and
 *  - `physics/collisions.ts` builds the collision approximation for the
 *    same gate from them (a torus-distance check plus two leg capsules).
 *
 * Previously both files hard-coded their own copies of these constants;
 * a typo in either copy would silently desync the collision boundary from
 * the rendered gate. Values are unchanged from their previous inline
 * literals - this file only centralizes them.
 */
export const GATE_RING_RADIUS = 0.64;
export const GATE_RING_CENTER_HEIGHT = 1.18;
export const GATE_RING_TUBE_RADIUS = 0.07;
export const GATE_STAND_RADIUS = 0.04;
