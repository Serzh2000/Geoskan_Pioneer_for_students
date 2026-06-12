export type Vec3Tuple = [number, number, number];
export type Vec2Tuple = [number, number];

export type PlacementConfig = {
    position: Vec3Tuple;
    rotation?: Vec3Tuple;
};

export const CAD_MM_TO_SCENE_SCALE = 0.002;
export const FRAME_PLATE_THICKNESS = 0.005;
export const MOTOR_ARM_OFFSET = 69.675 * CAD_MM_TO_SCENE_SCALE;
const GUARD_BASE_Z = 0.04;
export const GUARD_ARC_MID_X = 62.815 * CAD_MM_TO_SCENE_SCALE;
export const GUARD_ARC_INNER_Y = 37.183 * CAD_MM_TO_SCENE_SCALE;
export const LANDING_GEAR_HEIGHT = 78.5 * CAD_MM_TO_SCENE_SCALE;
export const LANDING_GEAR_TOP_SURFACE_Z = -0.031;
const LANDING_GEAR_CENTER_Z = LANDING_GEAR_TOP_SURFACE_Z - LANDING_GEAR_HEIGHT / 2;
export const DRONE_MODEL_OFFSET = LANDING_GEAR_HEIGHT - LANDING_GEAR_TOP_SURFACE_Z;

// Hand-tuned frame-part coordinates. Adjust these values to align the DXF/STL parts manually.
const FRAME_PARTS_ORIGIN_X = 0;
const FRAME_PARTS_ORIGIN_Y = 0;
const MAIN_FRAME_BASE_Z = 0.004;
const LOWER_BATTERY_PLATE_BASE_Z = -0.031;
const BATTERY_BACK_PLATE_BASE_Y = 0.056;
const BATTERY_BACK_PLATE_BASE_Z = -0.03;
const MAIN_FRAME_Z_ADJUST = -0.042;
const LOWER_BATTERY_PLATE_Z_ADJUST = -0.05;
const BATTERY_BACK_PLATE_Y_ADJUST = 0.02;
const BATTERY_BACK_PLATE_Z_ADJUST = -0.022;

const MAIN_FRAME_Z = MAIN_FRAME_BASE_Z + MAIN_FRAME_Z_ADJUST;
const LOWER_BATTERY_PLATE_Z = LOWER_BATTERY_PLATE_BASE_Z + LOWER_BATTERY_PLATE_Z_ADJUST;
const BATTERY_BACK_PLATE_Y = BATTERY_BACK_PLATE_BASE_Y + BATTERY_BACK_PLATE_Y_ADJUST;
const BATTERY_BACK_PLATE_Z = BATTERY_BACK_PLATE_BASE_Z + BATTERY_BACK_PLATE_Z_ADJUST;

const FRAME_BASE_ROTATION: Vec3Tuple = [Math.PI / 2, Math.PI, 0];
const BATTERY_BACK_PLATE_ROTATION: Vec3Tuple = [0, Math.PI, 0];
export const FRAME_COMPONENTS_Z_OFFSET = MAIN_FRAME_Z_ADJUST;
export const BATTERY_COMPONENTS_Z_OFFSET = LOWER_BATTERY_PLATE_Z_ADJUST;
export const BATTERY_BACK_PLATE_Y_OFFSET = BATTERY_BACK_PLATE_Y_ADJUST;
export const BATTERY_BACK_PLATE_Z_OFFSET = BATTERY_BACK_PLATE_Z_ADJUST;
export const GUARD_Z = GUARD_BASE_Z + FRAME_COMPONENTS_Z_OFFSET;
export const MAIN_FRAME_PANEL_Z = MAIN_FRAME_Z + 0.0025;
const BASE_LED_ROTATION: Vec3Tuple = [0, 0, 0];
const LED_MATRIX_PANEL_ROTATION: Vec3Tuple = [0, 0, 0];

export const BASE_LED_PLACEMENTS = [
    { position: [0.045, 0.025, MAIN_FRAME_PANEL_Z], rotation: BASE_LED_ROTATION },
    { position: [0.045, -0.025, MAIN_FRAME_PANEL_Z], rotation: BASE_LED_ROTATION },
    { position: [-0.045, -0.025, MAIN_FRAME_PANEL_Z], rotation: BASE_LED_ROTATION },
    { position: [-0.045, 0.025, MAIN_FRAME_PANEL_Z], rotation: BASE_LED_ROTATION }
] satisfies PlacementConfig[];
export const LED_MATRIX_PANEL_PLACEMENT: PlacementConfig = {
    position: [0, 0, MAIN_FRAME_PANEL_Z],
    rotation: LED_MATRIX_PANEL_ROTATION
};

export const CAD_PART_PLACEMENTS = {
    mainFrame: {
        position: [FRAME_PARTS_ORIGIN_X, FRAME_PARTS_ORIGIN_Y, MAIN_FRAME_Z],
        rotation: FRAME_BASE_ROTATION
    },
    lowerBatteryPlate: {
        position: [FRAME_PARTS_ORIGIN_X, FRAME_PARTS_ORIGIN_Y, LOWER_BATTERY_PLATE_Z],
        rotation: FRAME_BASE_ROTATION
    },
    batteryBackPlate: {
        position: [FRAME_PARTS_ORIGIN_X, FRAME_PARTS_ORIGIN_Y + BATTERY_BACK_PLATE_Y, BATTERY_BACK_PLATE_Z],
        rotation: BATTERY_BACK_PLATE_ROTATION
    }
} satisfies Record<string, PlacementConfig>;

// Chassis plates are assembled as a cross: one plate keeps the source orientation,
// the other is rotated by 90 degrees around Z.
export const LANDING_GEAR_PART_PLACEMENTS = {
    top: {
        position: [0, 0, LANDING_GEAR_CENTER_Z],
        rotation: [Math.PI, 0, Math.PI / 4]
    },
    bottom: {
        position: [0, 0, LANDING_GEAR_CENTER_Z],
        rotation: [Math.PI, 0, 3 * Math.PI / 4]
    }
} satisfies Record<string, PlacementConfig>;

// The first brace was aligned by hand, the others follow the same pattern.
export const GUARD_BRACE_PLACEMENTS = [
    { position: [MOTOR_ARM_OFFSET + 0.056, -MOTOR_ARM_OFFSET + 0.12, GUARD_Z - 0.038 - FRAME_PLATE_THICKNESS], rotation: [0, 0, 5 * Math.PI / 4] },
    { position: [-MOTOR_ARM_OFFSET - 0.056, MOTOR_ARM_OFFSET - 0.12, GUARD_Z - 0.038 - FRAME_PLATE_THICKNESS], rotation: [0, 0, Math.PI / 4] },
    { position: [MOTOR_ARM_OFFSET - 0.12, MOTOR_ARM_OFFSET + 0.056, GUARD_Z - 0.038 - FRAME_PLATE_THICKNESS], rotation: [0, 0, -Math.PI / 4] },
    { position: [-MOTOR_ARM_OFFSET + 0.12, -MOTOR_ARM_OFFSET - 0.056, GUARD_Z - 0.038 - FRAME_PLATE_THICKNESS], rotation: [0, 0, 3 * Math.PI / 4] }
] satisfies PlacementConfig[];

export const MOTOR_ANCHOR_POSITIONS: Vec2Tuple[] = [
    [MOTOR_ARM_OFFSET - 0.005, -MOTOR_ARM_OFFSET + 0.005],
    [-MOTOR_ARM_OFFSET + 0.005, MOTOR_ARM_OFFSET - 0.005],
    [MOTOR_ARM_OFFSET - 0.005, MOTOR_ARM_OFFSET - 0.005],
    [-MOTOR_ARM_OFFSET + 0.005, -MOTOR_ARM_OFFSET + 0.005]
];

const GUARD_LOWER_TIER_Z = GUARD_Z - 0.05;
const GUARD_UPPER_TIER_Z = GUARD_Z;

export const GUARD_ARC_TARGETS = [
    { position: [-0.188, 0.189, GUARD_LOWER_TIER_Z], rotation: [0, 0, -7 * Math.PI / 4] },
    { position: [0.189, 0.188, GUARD_LOWER_TIER_Z], rotation: [0, 0, -Math.PI / 4] },
    { position: [0.188, -0.189, GUARD_LOWER_TIER_Z], rotation: [0, 0, -3 * Math.PI / 4] },
    { position: [-0.189, -0.188, GUARD_LOWER_TIER_Z], rotation: [0, 0, -5 * Math.PI / 4] },
    { position: [-0.188, 0.189, GUARD_UPPER_TIER_Z], rotation: [0, 0, -7 * Math.PI / 4] },
    { position: [0.189, 0.188, GUARD_UPPER_TIER_Z], rotation: [0, 0, -Math.PI / 4] },
    { position: [0.188, -0.189, GUARD_UPPER_TIER_Z], rotation: [0, 0, -3 * Math.PI / 4] },
    { position: [-0.189, -0.188, GUARD_UPPER_TIER_Z], rotation: [0, 0, -5 * Math.PI / 4] }
] satisfies PlacementConfig[];

export const GUARD_BRIDGE_PLACEMENTS = [
    { position: [0, 0.279, GUARD_LOWER_TIER_Z], rotation: [Math.PI / 2, Math.PI / 2, 0] },
    { position: [0.279, 0, GUARD_LOWER_TIER_Z], rotation: [Math.PI / 2, 0, 0] },
    { position: [-0.279, 0, GUARD_LOWER_TIER_Z], rotation: [Math.PI / 2, 0, 0] },
    { position: [0, -0.279, GUARD_LOWER_TIER_Z], rotation: [Math.PI / 2, Math.PI / 2, 0] },
    { position: [0, 0.279, GUARD_UPPER_TIER_Z], rotation: [Math.PI / 2, Math.PI / 2, 0] },
    { position: [0.279, 0, GUARD_UPPER_TIER_Z], rotation: [Math.PI / 2, 0, 0] },
    { position: [-0.279, 0, GUARD_UPPER_TIER_Z], rotation: [Math.PI / 2, 0, 0] },
    { position: [0, -0.279, GUARD_UPPER_TIER_Z], rotation: [Math.PI / 2, Math.PI / 2, 0] }
] satisfies PlacementConfig[];
