import { registerProgramBlocks } from './program.js';
import { registerTimeBlocks } from './time.js';
import { registerLedBlocks } from './leds.js';
import { registerSensorBlocks } from './sensors.js';

let registered = false;

// Единственная точка входа — вызывается из ensureEditorBlocklyDefinitions()
// (blockly-mode/index.ts) рядом со старой регистрацией lua_*/py_* блоков.
// Полётные блоки (registerFlightBlocks) добавляются в фазе 4.
export function registerPioneerBlocks(): void {
    if (registered) return;
    registered = true;

    registerProgramBlocks();
    registerTimeBlocks();
    registerLedBlocks();
    registerSensorBlocks();
}
