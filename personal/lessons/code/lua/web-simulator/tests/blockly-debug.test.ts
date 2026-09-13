/** Временный debug-тест 2: трассировка вызовов генераторов. */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { ensureEditorBlocklyDefinitions } from '../public/modules/editor/blockly-mode/index.js';

beforeAll(async () => {
    // См. комментарий в tests/blockly-codegen.test.ts: обходим ограничение
    // Jest (--experimental-vm-modules) на вложенные import() прогревом кэша.
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await import('../public/modules/editor/blockly-mode/workspace-xml.js');
    await import('../public/modules/editor/blockly-mode/lua-definitions.js');
    await ensureEditorBlocklyDefinitions();
});

test('debug2: трассировка генераторов', () => {
    const ws = new Blockly.Workspace();

    const set = ws.newBlock('py_variables_set');
    const battery = ws.newBlock('py_get_battery');
    set.getInput('VALUE')!.connection!.connect(battery.outputConnection!);

    const origBattery = pythonGenerator.forBlock['py_get_battery'];
    const origSet = pythonGenerator.forBlock['py_variables_set'];
    (pythonGenerator.forBlock as any)['py_get_battery'] = (block: Blockly.Block) => {
        console.log('>>> py_get_battery called, top-level?', block.getParent() === null, block.id);
        return (origBattery as any)(block);
    };
    (pythonGenerator.forBlock as any)['py_variables_set'] = (block: Blockly.Block) => {
        console.log('>>> py_variables_set called, top-level?', block.getParent() === null, block.id);
        return (origSet as any)(block);
    };

    const origBlockToCode = pythonGenerator.blockToCode.bind(pythonGenerator);
    (pythonGenerator as any).blockToCode = (block: Blockly.Block, opt?: boolean) => {
        if (block) {
            console.log('>>> blockToCode:', block.type, 'thisOnly=', opt, 'parent=', block.getParent()?.type ?? null);
        }
        return origBlockToCode(block, opt);
    };

    const code = pythonGenerator.workspaceToCode(ws);
    console.log('FINAL =', JSON.stringify(code));

    console.log('all top blocks (true) =', ws.getTopBlocks(true).map((b) => b.type));
    const allBlocks = ws.getAllBlocks(false).map((b) => b.type);
    console.log('all blocks in ws =', allBlocks);
}, 20000);
