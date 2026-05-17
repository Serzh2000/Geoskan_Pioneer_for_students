import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
import type { ScriptLanguage } from '../../api-docs/sections.js';
import { registerLuaBlocklyDefinitions } from './lua-definitions.js';
import { registerPythonBlocklyDefinitions } from './python-definitions.js';

let definitionsInitialized = false;

type BlocklyCodeGenerator = typeof luaGenerator | typeof pythonGenerator;

export { Blockly };

export function getBlocklyGenerator(language: ScriptLanguage): BlocklyCodeGenerator {
    return language === 'lua' ? luaGenerator : pythonGenerator;
}

export function initBlocklyDefinitions() {
    if (definitionsInitialized) return;
    definitionsInitialized = true;
    registerLuaBlocklyDefinitions();
    registerPythonBlocklyDefinitions();
}
