import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { PIONEER_ON_EVENT_TYPE } from '../constants.js';
import { luaApiDocsEvents, luaApiEventLabels } from '../../../../docs/lua-api-docs-events.js';

// Только направление "от автопилота" (from-autopilot): записи "к
// автопилоту" в luaApiDocsEvents — это команды (ap.push(Ev.MCE_TAKEOFF) и
// т.п.), а не то, что приходит вторым аргументом в callback(event)
// (см. §5 плана и public/modules/docs/lua-api-docs-events.ts).
function fromAutopilotEventOptions(): Array<[string, string]> {
    return Object.keys(luaApiDocsEvents)
        .filter((key) => luaApiDocsEvents[key].direction === 'from-autopilot')
        .map((key) => key.replace(/^Ev\./, ''))
        .map((name): [string, string] => [luaApiEventLabels[name] ?? name, name]);
}

export function registerEventBlocks(): void {
    definePioneerBlock({
        type: PIONEER_ON_EVENT_TYPE,
        category: 'events',
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Когда событие от автопилота')
                .appendField(new Blockly.FieldDropdown(fromAutopilotEventOptions()), 'EVENT');
            this.appendStatementInput('DO');
            this.setColour('#8b5cf6');
            this.setTooltip(
                'Обработчик события от автопилота. Доступно только для Lua: код попадает в ' +
                'callback(event) до возобновления корутины. Блоки ожидания внутри недоступны — ' +
                'здесь нет корутины, coroutine.yield() внутри callback() упадёт с ошибкой.'
            );
        },
        targets: {
            // Только Lua (см. таблицу §5 плана): в Python-таргете нет
            // callback-модели, ожидание состояний идёт опросом внутри
            // _pioneer_wait_*-хелперов (targets/python-runtime.ts) — отдельная
            // ветка обработки события не нужна и не поддерживается.
            lua: (block, gen) => {
                const eventName = block.getFieldValue('EVENT');
                const branch = gen.statementToCode(block, 'DO');
                return `if event == Ev.${eventName} then\n${branch}end\n`;
            }
        },
        apiUsage: { lua: [] }
    });
}
