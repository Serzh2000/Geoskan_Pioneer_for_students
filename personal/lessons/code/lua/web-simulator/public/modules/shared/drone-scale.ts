/**
 * The simulator draws the Pioneer larger than the real aircraft (see tests/pioneer-blender-model.test.ts, "simulator
 * scale"), while props the drone interacts with are sized to that drawn drone (the competition gate's 1.14 m opening
 * is about twice a drone's width, not twice a real 29 cm one). Anything new that must keep the real proportion to the
 * drone multiplies its real size by DRONE_SIM_SCALE.
 *
 * Real Pioneer: 290 x 290 x 120 mm overall (https://www.geoscan.ru/en/pioneer).
 * Drawn Pioneer: 0.56854 m across (the GLB bounds the model test pins).
 */
export const DRONE_REAL_WIDTH = 0.29;
export const DRONE_SIM_WIDTH = 0.56854;
export const DRONE_SIM_SCALE = DRONE_SIM_WIDTH / DRONE_REAL_WIDTH;
