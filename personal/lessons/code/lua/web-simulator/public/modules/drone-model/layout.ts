export type Vec3Tuple = [number, number, number];
export type Vec2Tuple = [number, number];

export type PlacementConfig = {
    position: Vec3Tuple;
    rotation?: Vec3Tuple;
};

export const CAD_MM_TO_SCENE_SCALE = 0.002;
export const FRAME_PLATE_THICKNESS = 0.005;
export const MOTOR_ARM_OFFSET = 69.675 * CAD_MM_TO_SCENE_SCALE;
export const GUARD_Z = 0.04;
export const GUARD_ARC_MID_X = 62.815 * CAD_MM_TO_SCENE_SCALE;
export const GUARD_ARC_INNER_Y = 37.183 * CAD_MM_TO_SCENE_SCALE;

export const CAD_PART_PLACEMENTS = {
    mainFrame: {
        position: [0, 0, 0.004],
        rotation: [Math.PI / 2, 0, 0]
    },
    lowerBatteryPlate: {
        position: [0, 0, -0.031],
        rotation: [Math.PI / 2, 0, 0]
    },
    batteryBackPlate: {
        position: [0, -0.056, -0.03]
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
