import type { ScriptLanguage } from '../../core/state.js';
import { getBlocklyGenerator, type BlocklyNS } from './loader.js';
import { isBricksModelActive } from './bricks/model.js';
import { BRICKS_STARTER_XML } from './bricks/starter.js';

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
        'pioneer = Pioneer()',
        ''
    ];
    const suffix = ['', 'pioneer.close_connection()'];

    return [...prefix, ...(code ? [code] : []), ...suffix].join('\n');
}

export function compileMainEditorWorkspace(language: ScriptLanguage, workspace: BlocklyNS.WorkspaceSvg): string {
    return compileGeneratorWorkspace(language, workspace);
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
    // Пионер Мини 2: блоки Bricks («Начало программы» -> «Предполётная подготовка» -> «Взлет» -> «Посадка»).
    if (isBricksModelActive()) return BRICKS_STARTER_XML;
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

