import type { ScriptLanguage } from '../../core/state.js';
import { getBlocklyGenerator, type BlocklyNS } from './loader.js';

const LUA_RAW_CODE_BLOCK = 'lua_raw_code';
const PY_RAW_CODE_BLOCK = 'py_raw_code';

function getRawCodeBlockType(language: ScriptLanguage): string {
    return language === 'lua' ? LUA_RAW_CODE_BLOCK : PY_RAW_CODE_BLOCK;
}

function getWorkspaceTopBlocks(workspace: BlocklyNS.WorkspaceSvg): BlocklyNS.Block[] {
    return workspace.getTopBlocks(true).filter((block) => !block.isInsertionMarker());
}

function hasOnlySingleRawCodeBlock(language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg): boolean {
    const blocks = getWorkspaceTopBlocks(workspace);
    return blocks.length === 1 && blocks[0]?.type === getRawCodeBlockType(language) && !blocks[0].getNextBlock();
}

function compileGeneratorWorkspace(language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg): string {
    const generator = getBlocklyGenerator(language);
    const code = String(generator?.workspaceToCode(workspace) || '').trim();

    if (language === 'lua') {
        // Префикс: Lua-скрипт выполняется в Fengari-рантайме, который уже
        // инициализирует глобальные функции (ap, Sensors, Timer, camera и т.д.)
        // через LUA_SETUP_SCRIPT в setup-script.ts. Поэтому префикс не нужен.
        // Возвращаем чистый сгенерированный код.
        return code;
    }

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

export function compileMainEditorWorkspace(language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg): string {
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

// Фаза 7 плана, шаг 4: стартовый workspace одинаковый для обоих языков —
// pioneer_start -> preflight -> takeoff -> land. Раньше здесь была Lua-only
// цепочка через старые callback-блоки (lua_preflight/lua_callback_open/...),
// а для Python отдавался "сырой код" (createRawCodeWorkspaceXml) — с единым
// набором pioneer_* обе ветки не нужны, параметр language оставлен только
// ради сигнатуры вызывающего кода (getStarterBlocklyWorkspaceXml в
// workspace-controller.ts, использовавший его для Lua-only проверки, удалён).
export function createStarterWorkspaceXml(language: ScriptLanguage): string {
    void language; // см. комментарий выше — параметр сохранён ради сигнатуры вызывающего кода
    return `
        <xml xmlns="https://developers.google.com/blockly/xml">
            <block type="pioneer_start" x="32" y="32">
                <next>
                    <block type="pioneer_preflight">
                        <next>
                            <block type="pioneer_takeoff">
                                <next>
                                    <block type="pioneer_land"></block>
                                </next>
                            </block>
                        </next>
                    </block>
                </next>
            </block>
        </xml>
    `;
}

export const RAW_CODE_BLOCK_TYPES = {
    lua: LUA_RAW_CODE_BLOCK,
    python: PY_RAW_CODE_BLOCK
} as const;
