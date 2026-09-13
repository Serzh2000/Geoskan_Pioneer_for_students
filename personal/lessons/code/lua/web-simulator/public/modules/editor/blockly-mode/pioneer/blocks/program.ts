import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { PIONEER_START_TYPE } from '../constants.js';

export function registerProgramBlocks(): void {
    definePioneerBlock({
        type: PIONEER_START_TYPE,
        category: 'program',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Начало программы');
            this.setNextStatement(true, null);
            this.setDeletable(false);
            this.setColour('#4b5563');
            this.setTooltip('Точка входа программы дрона. Блоки ниже выполняются по порядку.');
        },
        targets: {
            // Сам по себе код не даёт: compilePioneerWorkspace() (targets/compile.ts)
            // берёт тело __main()/скрипта из цепочки блоков ПОСЛЕ этого хата.
            lua: () => '',
            python: () => ''
        }
    });
}
