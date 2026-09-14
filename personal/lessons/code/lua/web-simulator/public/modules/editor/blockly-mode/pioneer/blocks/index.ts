import { registerProgramBlocks } from './program.js';
import { registerTimeBlocks } from './time.js';
import { registerLedBlocks } from './leds.js';
import { registerSensorBlocks } from './sensors.js';
import { registerFlightBlocks } from './flight.js';
import { registerCameraBlocks } from './camera.js';
import { registerEventBlocks } from './events.js';

let registered = false;

// Единственная точка входа — вызывается из ensureEditorBlocklyDefinitions()
// (blockly-mode/index.ts) рядом со старой регистрацией lua_*/py_* блоков.
export function registerPioneerBlocks(): void {
    if (registered) return;
    registered = true;

    registerProgramBlocks();
    registerTimeBlocks();
    registerLedBlocks();
    registerSensorBlocks();
    registerFlightBlocks();
    registerCameraBlocks();
    registerEventBlocks();
}
