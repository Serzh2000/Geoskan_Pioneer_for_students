import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions, compileMainEditorWorkspace } from '../public/modules/editor/blockly-mode/index.js';
import { buildTargetWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace-xml.js';
import { migrateLessonLedValues } from '../public/modules/editor/blockly/legacy-values.js';
import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import { getPythonLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/python.js';

beforeAll(async () => {
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await import('../public/modules/editor/blockly-mode/workspace-xml.js');
    await import('../public/modules/editor/blockly-mode/lua-definitions.js');
    await ensureEditorBlocklyDefinitions();
});

test.each(['lua', 'python'] as const)('all ten %s guide solutions compile to executable commands', (language) => {
    const state = language === 'lua' ? getLuaLessonState() : getPythonLessonState();
    for (const lesson of state.lessons) {
        const workspace = new Blockly.Workspace();
        try {
            const root = Blockly.utils.xml.textToDom(buildTargetWorkspaceXml(lesson.id, lesson.targetBlockIds));
            migrateLessonLedValues(root);
            Blockly.Xml.domToWorkspace(root, workspace);
            const code = compileMainEditorWorkspace(language, workspace as Blockly.WorkspaceSvg);
            expect(code.length).toBeGreaterThan(20);
            if (lesson.id.endsWith('led-single')) expect(code).toContain(language === 'lua' ? 'leds:set(0, 1, 0, 0)' : 'pioneer.led_control(');
            else expect(code).toMatch(language === 'lua' ? /leds:set|ap\.push|ap\.goToLocalPoint/ : /pioneer\.led_control|pioneer\.arm|pioneer\.takeoff/);
        } finally { workspace.dispose(); }
    }
});
