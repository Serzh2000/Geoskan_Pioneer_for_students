import type { ScriptLanguage } from '../../core/state.js';
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

export const RAW_CODE_BLOCK_TYPES = {
    lua: LUA_RAW_CODE_BLOCK,
    python: PY_RAW_CODE_BLOCK
} as const;
