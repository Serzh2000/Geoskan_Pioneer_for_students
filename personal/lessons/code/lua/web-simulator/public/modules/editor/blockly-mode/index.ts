import type { ScriptLanguage } from '../../core/state.js';
import { evConstants } from '../../docs/api-docs-events.js';
import { Blockly, getBlocklyGenerator, initBlocklyDefinitions } from '../../ui/mission-guide/blockly.js';
import { buildCatalog, groupCatalogByCategory } from './catalog.js';
import type { ApiCatalogEntry } from './types.js';
import {
    compileMainEditorWorkspace as compileWorkspaceCode,
    createRawCodeWorkspaceXml,
    RAW_CODE_BLOCK_TYPES
} from './workspace.js';

const LUA_API_VALUE_BLOCK = 'lua_api_value';
const PY_API_VALUE_BLOCK = 'py_api_value';
const LUA_EVENT_CONSTANT_BLOCK = 'lua_event_constant';

let definitionsInitialized = false;
let luaCatalog: ApiCatalogEntry[] = [];
let pythonCatalog: ApiCatalogEntry[] = [];

function buildCallCode(entry: ApiCatalogEntry, args: string): string {
    if (!entry.hasArgs) {
        return `${entry.callHead}()`;
    }
    const finalArgs = args.trim() || entry.defaultArgs;
    return `${entry.callHead}(${finalArgs})`;
}

function defineStatementBlock(entry: ApiCatalogEntry, language: ScriptLanguage): void {
    Blockly.Blocks[entry.type] = {
        init: function() {
            const input = this.appendDummyInput().appendField(entry.callHead);
            if (entry.hasArgs) {
                input
                    .appendField('(')
                    .appendField(new Blockly.FieldTextInput(entry.defaultArgs), 'ARGS')
                    .appendField(')');
            } else {
                input.appendField('()');
            }
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(entry.colour);
            this.setTooltip(entry.doc.desc || entry.key);
        }
    };

    const generator = getBlocklyGenerator(language);
    generator.forBlock[entry.type] = function(block: any) {
        const args = entry.hasArgs ? String(block.getFieldValue('ARGS') || '') : '';
        return `${buildCallCode(entry, args)}\n`;
    };
}

function defineApiValueBlock(language: ScriptLanguage, type: string, label: string, entries: ApiCatalogEntry[]): void {
    const dropdownOptions = entries.map((entry) => [entry.key, entry.key] as [string, string]);

    Blockly.Blocks[type] = {
        init: function() {
            this.appendDummyInput()
                .appendField(label)
                .appendField(new Blockly.FieldDropdown(dropdownOptions), 'METHOD')
                .appendField('(')
                .appendField(new Blockly.FieldTextInput(''), 'ARGS')
                .appendField(')');
            this.setOutput(true, null);
            this.setColour('#0ea5e9');
            this.setTooltip('Возвращает выражение API для использования в переменных, условиях и выводе.');
        }
    };

    const generator = getBlocklyGenerator(language);
    generator.forBlock[type] = function(block: any) {
        const methodKey = String(block.getFieldValue('METHOD') || '');
        const args = String(block.getFieldValue('ARGS') || '');
        const entry = entries.find((item) => item.key === methodKey) || entries[0];
        const code = entry ? buildCallCode(entry, args) : '';
        return [code, 0] as [string, number];
    };
}

function defineRawCodeBlock(language: ScriptLanguage, type: string, label: string): void {
    Blockly.Blocks[type] = {
        init: function() {
            this.appendDummyInput()
                .appendField(label);
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput(language === 'lua' ? '-- ваш код' : '# ваш код'), 'CODE');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#64748b');
            this.setTooltip('Сохраняет произвольный код при переходе между текстовым и блочным режимами.');
        }
    };

    const generator = getBlocklyGenerator(language);
    generator.forBlock[type] = function(block: any) {
        const code = String(block.getFieldValue('CODE') || '').trim();
        return code ? `${code}\n` : '';
    };
}

function defineLuaEventConstantBlock(): void {
    Blockly.Blocks[LUA_EVENT_CONSTANT_BLOCK] = {
        init: function() {
            this.appendDummyInput()
                .appendField('Ev.')
                .appendField(new Blockly.FieldDropdown(evConstants.map((eventName) => [eventName, eventName] as [string, string])), 'EVENT');
            this.setOutput(true, null);
            this.setColour('#a855f7');
            this.setTooltip('Константа события FSM для Lua API.');
        }
    };

    const generator = getBlocklyGenerator('lua');
    generator.forBlock[LUA_EVENT_CONSTANT_BLOCK] = function(block: any) {
        return [`Ev.${block.getFieldValue('EVENT')}`, 0] as [string, number];
    };
}

function getCatalog(language: ScriptLanguage): ApiCatalogEntry[] {
    return language === 'lua' ? luaCatalog : pythonCatalog;
}

function renderStandardCategories(language: ScriptLanguage): string {
    const extraValueBlock = language === 'lua' ? LUA_API_VALUE_BLOCK : PY_API_VALUE_BLOCK;
    const extraRawBlock = language === 'lua' ? RAW_CODE_BLOCK_TYPES.lua : RAW_CODE_BLOCK_TYPES.python;
    const courseBlocks = language === 'lua'
        ? ['lua_ledbar_new', 'lua_led_set', 'lua_timer_calllater', 'lua_print', 'lua_ap_push', 'lua_event_callback', 'lua_goto_local_point', LUA_EVENT_CONSTANT_BLOCK]
        : ['py_led_control', 'py_time_sleep', 'py_print', 'py_arm', 'py_takeoff', 'py_land', 'py_goto_local_point', 'py_wait_point_reached'];

    return `
        <category name="Учебные блоки" colour="#0ea5e9">
            ${courseBlocks.map((blockType) => `<block type="${blockType}"></block>`).join('')}
        </category>
        <category name="Значения API" colour="#0ea5e9">
            <block type="${extraValueBlock}"></block>
        </category>
        <category name="Сырой код" colour="#64748b">
            <block type="${extraRawBlock}"></block>
        </category>
        <sep></sep>
        <category name="Логика" colour="#8b5cf6">
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="logic_operation"></block>
            <block type="logic_negate"></block>
            <block type="logic_boolean"></block>
        </category>
        <category name="Циклы" colour="#ec4899">
            <block type="controls_repeat_ext"></block>
            <block type="controls_whileUntil"></block>
            <block type="controls_for"></block>
            <block type="controls_flow_statements"></block>
        </category>
        <category name="Числа" colour="#f59e0b">
            <block type="math_number"></block>
            <block type="math_arithmetic"></block>
            <block type="math_single"></block>
            <block type="math_round"></block>
        </category>
        <category name="Текст" colour="#22c55e">
            <block type="text"></block>
            <block type="text_join"></block>
            <block type="text_print"></block>
        </category>
        <category name="Переменные" custom="VARIABLE" colour="#14b8a6"></category>
        <category name="Функции" custom="PROCEDURE" colour="#6366f1"></category>
    `;
}

export function ensureEditorBlocklyDefinitions(): void {
    if (definitionsInitialized) return;
    definitionsInitialized = true;

    initBlocklyDefinitions();

    luaCatalog = buildCatalog('lua');
    pythonCatalog = buildCatalog('python');

    luaCatalog.forEach((entry) => defineStatementBlock(entry, 'lua'));
    pythonCatalog.forEach((entry) => defineStatementBlock(entry, 'python'));

    defineApiValueBlock('lua', LUA_API_VALUE_BLOCK, 'Lua API', luaCatalog);
    defineApiValueBlock('python', PY_API_VALUE_BLOCK, 'Python API', pythonCatalog);
    defineRawCodeBlock('lua', RAW_CODE_BLOCK_TYPES.lua, 'Lua: вставка кода');
    defineRawCodeBlock('python', RAW_CODE_BLOCK_TYPES.python, 'Python: вставка кода');
    defineLuaEventConstantBlock();
}

export function buildMainEditorToolbox(language: ScriptLanguage): string {
    ensureEditorBlocklyDefinitions();

    const grouped = groupCatalogByCategory(getCatalog(language));
    const apiCategories = Array.from(grouped.entries())
        .map(([categoryName, entries]) => `
            <category name="${categoryName}" colour="${entries[0]?.colour || '#0ea5e9'}">
                ${entries.map((entry) => `<block type="${entry.type}"></block>`).join('')}
            </category>
        `)
        .join('');

    return `
        <xml xmlns="https://developers.google.com/blockly/xml">
            ${renderStandardCategories(language)}
            <sep></sep>
            ${apiCategories}
        </xml>
    `;
}

export function compileMainEditorWorkspace(language: ScriptLanguage, workspace: Blockly.WorkspaceSvg): string {
    ensureEditorBlocklyDefinitions();
    return compileWorkspaceCode(language, workspace);
}

export { createRawCodeWorkspaceXml };
