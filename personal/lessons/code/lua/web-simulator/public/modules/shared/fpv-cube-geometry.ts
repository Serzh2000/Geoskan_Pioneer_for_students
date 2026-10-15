import { DRONE_SIM_SCALE } from './drone-scale.js';

/**
 * Shared source of truth for the FPV racing cube ("FPV-куб"): four square fabric frames standing as the sides of a cube
 * on a collapsible black stand. The product (Gemfan style pop-up gate, "Poortmaat 80x80", height 105-145 cm, folded
 * 39 x 39 cm) is 80 cm across for a 29 cm drone, a ratio of 2.76.
 *
 * Real sizes are written down once, in metres, and multiplied by DRONE_SIM_SCALE (the simulator draws the drone about
 * twice as big as the real one), so the cube keeps its real proportion to the drone as it looks on screen.
 *
 * `environment/obstacles/fpv-cube.ts` builds the mesh from these numbers and `physics/collisions.ts` builds the
 * collision shape from the same ones, so the rendered frame and the solid frame cannot drift apart.
 * Local axes follow the other props: Z is up, the cube is centred on X and Y, its feet stand on Z = 0.
 */
export const FPV_CUBE_REAL = {
    frameSize: 0.8,
    /** Clear opening: the frame's outer size less a fabric band of 10 cm on each side (retailers give 8.3 cm for the 75 cm model). */
    opening: 0.6,
    frameThickness: 0.03,
    minHeight: 1.05,
    maxHeight: 1.45,
    legInset: 0.36,
    legRadius: 0.012,
    outerCornerRadius: 0.14,
    openingCornerRadius: 0.1
} as const;

const scaled = (real: number) => real * DRONE_SIM_SCALE;

export const FPV_CUBE_FRAME_SIZE = scaled(FPV_CUBE_REAL.frameSize);
/** Side of the square opening a drone flies through; the rest of the frame is fabric border. */
export const FPV_CUBE_OPENING = scaled(FPV_CUBE_REAL.opening);
export const FPV_CUBE_FRAME_THICKNESS = scaled(FPV_CUBE_REAL.frameThickness);
/** Total height range in scene metres (the product adjusts from 105 to 145 cm). */
export const FPV_CUBE_MIN_HEIGHT = scaled(FPV_CUBE_REAL.minHeight);
export const FPV_CUBE_MAX_HEIGHT = scaled(FPV_CUBE_REAL.maxHeight);
export const FPV_CUBE_DEFAULT_HEIGHT = FPV_CUBE_MIN_HEIGHT;
/** Where the four stand legs stand, measured from the centre on both axes. */
export const FPV_CUBE_LEG_INSET = scaled(FPV_CUBE_REAL.legInset);
export const FPV_CUBE_LEG_RADIUS = scaled(FPV_CUBE_REAL.legRadius);
export const FPV_CUBE_OUTER_CORNER_RADIUS = scaled(FPV_CUBE_REAL.outerCornerRadius);
export const FPV_CUBE_OPENING_CORNER_RADIUS = scaled(FPV_CUBE_REAL.openingCornerRadius);

export interface FpvCubeFrame {
    /** The axis the frame's plane is perpendicular to. */
    normal: 'x' | 'y';
    /** Position of the plane along that axis. */
    offset: number;
}

/**
 * The side frames sit a little outside the front and back ones, so the four overlap like the pinwheel of the real
 * product instead of fighting for the same pixels at the corners.
 */
const SIDE_FRAME_OFFSET = FPV_CUBE_FRAME_SIZE / 2 + scaled(0.02);
export const FPV_CUBE_FRAMES: readonly FpvCubeFrame[] = [
    { normal: 'y', offset: FPV_CUBE_FRAME_SIZE / 2 },
    { normal: 'y', offset: -FPV_CUBE_FRAME_SIZE / 2 },
    { normal: 'x', offset: SIDE_FRAME_OFFSET },
    { normal: 'x', offset: -SIDE_FRAME_OFFSET }
];

export function clampFpvCubeHeight(height: unknown): number {
    const value = Number(height);
    if (!Number.isFinite(value)) return FPV_CUBE_DEFAULT_HEIGHT;
    return Math.min(FPV_CUBE_MAX_HEIGHT, Math.max(FPV_CUBE_MIN_HEIGHT, value));
}

/** Height of the frames' centre above the ground: the frames fill the top 80 cm (scaled) of the total height. */
export function fpvCubeFrameCentre(height: number): number {
    return height - FPV_CUBE_FRAME_SIZE / 2;
}
