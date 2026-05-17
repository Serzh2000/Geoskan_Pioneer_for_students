import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';

export function registerLuaBlocklyDefinitions(): void {
    Blockly.Blocks['lua_ledbar_new'] = {
        init: function() {
            this.appendDummyInput().appendField('создать Ledbar(').appendField(new Blockly.FieldNumber(29, 1, 100), 'COUNT').appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip('Инициализирует светодиодную ленту');
        }
    };
    luaGenerator.forBlock.lua_ledbar_new = (block: any) => `local leds = Ledbar.new(${block.getFieldValue('COUNT')})\n`;

    Blockly.Blocks['lua_led_set'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('leds:set(')
                .appendField(new Blockly.FieldNumber(0, 0, 100), 'INDEX')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(0, 0, 1), 'R')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(0, 0, 1), 'G')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(0, 0, 1), 'B')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip('Установить цвет светодиода');
        }
    };
    luaGenerator.forBlock.lua_led_set = (block: any) => `leds:set(${block.getFieldValue('INDEX')}, ${block.getFieldValue('R')}, ${block.getFieldValue('G')}, ${block.getFieldValue('B')})\n`;

    Blockly.Blocks['lua_timer_calllater'] = {
        init: function() {
            this.appendDummyInput().appendField('Timer.callLater(').appendField(new Blockly.FieldNumber(0.5, 0), 'DELAY').appendField(')');
            this.appendStatementInput('CALLBACK').setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip('Откладывает вложенные блоки: все, что находится внутри, попадет в function() ... end и выполнится позже.');
        }
    };
    luaGenerator.forBlock.lua_timer_calllater = (block: any) => `Timer.callLater(${block.getFieldValue('DELAY')}, function()\n${luaGenerator.statementToCode(block, 'CALLBACK') || ''}end)\n`;

    Blockly.Blocks['lua_print'] = {
        init: function() {
            this.appendDummyInput().appendField('print(').appendField(new Blockly.FieldTextInput('сообщение'), 'TEXT').appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };
    luaGenerator.forBlock.lua_print = (block: any) => `print("${block.getFieldValue('TEXT')}")\n`;

    Blockly.Blocks['lua_ap_push'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('ap.push(')
                .appendField(new Blockly.FieldDropdown([
                    ['Ev.MCE_PREFLIGHT', 'Ev.MCE_PREFLIGHT'],
                    ['Ev.MCE_TAKEOFF', 'Ev.MCE_TAKEOFF'],
                    ['Ev.MCE_LANDING', 'Ev.MCE_LANDING']
                ]), 'EVENT')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    luaGenerator.forBlock.lua_ap_push = (block: any) => `ap.push(${block.getFieldValue('EVENT')})\n`;

    Blockly.Blocks['lua_event_callback'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('if event ==')
                .appendField(new Blockly.FieldDropdown([
                    ['Ev.ENGINES_STARTED', 'Ev.ENGINES_STARTED'],
                    ['Ev.TAKEOFF_COMPLETE', 'Ev.TAKEOFF_COMPLETE'],
                    ['Ev.POINT_REACHED', 'Ev.POINT_REACHED']
                ]), 'EVENT')
                .appendField('then');
            this.appendStatementInput('DO').setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
        }
    };
    luaGenerator.forBlock.lua_event_callback = (block: any) => `if event == ${block.getFieldValue('EVENT')} then\n${luaGenerator.statementToCode(block, 'DO') || ''}end\n`;

    Blockly.Blocks['lua_goto_local_point'] = {
        init: function() {
            this.appendDummyInput()
                .appendField('ap.goToLocalPoint(')
                .appendField(new Blockly.FieldNumber(1), 'X')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(0), 'Y')
                .appendField(',')
                .appendField(new Blockly.FieldNumber(1), 'Z')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    luaGenerator.forBlock.lua_goto_local_point = (block: any) => `ap.goToLocalPoint(${block.getFieldValue('X')}, ${block.getFieldValue('Y')}, ${block.getFieldValue('Z')})\n`;

    Blockly.Blocks.lua_callback_open = {
        init: function() {
            this.appendDummyInput().appendField('function callback(event)');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Открывает обязательный обработчик системных событий Lua');
        }
    };
    luaGenerator.forBlock.lua_callback_open = () => '';

    Blockly.Blocks.lua_callback_end = {
        init: function() {
            this.appendDummyInput().appendField('end');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Закрывает блок function callback(event)');
        }
    };
    luaGenerator.forBlock.lua_callback_end = () => '';

    Blockly.Blocks['lua-callback-stub'] = {
        init: function() {
            this.appendDummyInput().appendField('function callback(event) ... end');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(210);
            this.setTooltip('Устаревший блок callback');
        }
    };
    luaGenerator.forBlock['lua-callback-stub'] = () => '';
}
