import {
    DEFAULT_LUA_SCRIPT,
    DEFAULT_PYTHON_SCRIPT,
    type ScriptLanguage
} from '../../core/state.js';
import { Blockly, getBlocklyGenerator } from '../../ui/mission-guide/blockly.js';

const LUA_RAW_CODE_BLOCK = 'lua_raw_code';
const PY_RAW_CODE_BLOCK = 'py_raw_code';

function getRawCodeBlockType(language: ScriptLanguage): string {
    return language === 'lua' ? LUA_RAW_CODE_BLOCK : PY_RAW_CODE_BLOCK;
}

function getWorkspaceTopBlocks(workspace: Blockly.WorkspaceSvg): Blockly.Block[] {
    return workspace.getTopBlocks(true).filter((block) => !block.isInsertionMarker());
}

function hasOnlySingleRawCodeBlock(language: ScriptLanguage, workspace: Blockly.WorkspaceSvg): boolean {
    const blocks = getWorkspaceTopBlocks(workspace);
    return blocks.length === 1 && blocks[0]?.type === getRawCodeBlockType(language) && !blocks[0].getNextBlock();
}

function compileGeneratorWorkspace(language: ScriptLanguage, workspace: Blockly.WorkspaceSvg): string {
    const generator = getBlocklyGenerator(language);
    const code = String(generator.workspaceToCode(workspace) || '').trim();
    if (language === 'lua') return code;

    const prefix = [
        '# Pioneer Python Script',
        'from pioneer_sdk import Pioneer',
        'import time',
        '',
        'pioneer = Pioneer(simulator=True)',
        ''
    ];
    const suffix = ['', 'pioneer.close_connection()'];

    return [...prefix, ...(code ? [code] : []), ...suffix].join('\n');
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function compileMainEditorWorkspace(language: ScriptLanguage, workspace: Blockly.WorkspaceSvg): string {
    return hasOnlySingleRawCodeBlock(language, workspace)
        ? compileGeneratorWorkspace(language, workspace)
        : compileGeneratorWorkspace(language, workspace);
}

export function createRawCodeWorkspaceXml(language: ScriptLanguage, code: string): string {
    const blockType = getRawCodeBlockType(language);
    const defaultCode = code.trim() || (language === 'lua' ? '-- ваш код' : '# ваш код');

    return `
        <xml xmlns="https://developers.google.com/blockly/xml">
            <block type="${blockType}" x="32" y="32">
                <field name="CODE">${escapeXml(defaultCode)}</field>
            </block>
        </xml>
    `;
}

export function createStarterWorkspaceXml(language: ScriptLanguage): string {
    if (language === 'lua') {
        return `
            <xml xmlns="https://developers.google.com/blockly/xml">
                <block type="lua_ap_push" x="32" y="32">
                    <field name="EVENT">Ev.MCE_PREFLIGHT</field>
                    <next>
                        <block type="lua_timer_calllater">
                            <field name="DELAY">0.5</field>
                            <statement name="CALLBACK">
                                <block type="lua_ap_push">
                                    <field name="EVENT">Ev.MCE_TAKEOFF</field>
                                </block>
                            </statement>
                        </block>
                    </next>
                </block>
            </xml>
        `;
    }

    return createRawCodeWorkspaceXml(language, language === 'python' ? DEFAULT_PYTHON_SCRIPT : DEFAULT_LUA_SCRIPT);
}

export const RAW_CODE_BLOCK_TYPES = {
    lua: LUA_RAW_CODE_BLOCK,
    python: PY_RAW_CODE_BLOCK
} as const;
