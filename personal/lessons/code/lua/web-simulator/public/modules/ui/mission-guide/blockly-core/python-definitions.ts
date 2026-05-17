import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

export function registerPythonBlocklyDefinitions(): void {
    Blockly.Blocks.py_led_control = {
        init: function() {
            this.appendDummyInput()
                .appendField('pioneer.led_control(r=')
                .appendField(new Blockly.FieldNumber(255, 0, 255), 'R')
                .appendField(', g=')
                .appendField(new Blockly.FieldNumber(0, 0, 255), 'G')
                .appendField(', b=')
                .appendField(new Blockly.FieldNumber(0, 0, 255), 'B')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };
    pythonGenerator.forBlock.py_led_control = (block: any) => `pioneer.led_control(r=${block.getFieldValue('R')}, g=${block.getFieldValue('G')}, b=${block.getFieldValue('B')})\n`;

    Blockly.Blocks.py_time_sleep = {
        init: function() {
            this.appendDummyInput().appendField('time.sleep(').appendField(new Blockly.FieldNumber(1, 0), 'TIME').appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
        }
    };
    pythonGenerator.forBlock.py_time_sleep = (block: any) => `time.sleep(${block.getFieldValue('TIME')})\n`;

    Blockly.Blocks.py_print = {
        init: function() {
            this.appendDummyInput().appendField('print(').appendField(new Blockly.FieldTextInput('сообщение'), 'TEXT').appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
        }
    };
    pythonGenerator.forBlock.py_print = (block: any) => `print("${block.getFieldValue('TEXT')}")\n`;

    Blockly.Blocks.py_arm = {
        init: function() {
            this.appendDummyInput().appendField('pioneer.arm()');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    pythonGenerator.forBlock.py_arm = () => 'pioneer.arm()\n';

    Blockly.Blocks.py_takeoff = {
        init: function() {
            this.appendDummyInput().appendField('pioneer.takeoff()');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    pythonGenerator.forBlock.py_takeoff = () => 'pioneer.takeoff()\n';

    Blockly.Blocks.py_land = {
        init: function() {
            this.appendDummyInput().appendField('pioneer.land()');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    pythonGenerator.forBlock.py_land = () => 'pioneer.land()\n';

    Blockly.Blocks.py_goto_local_point = {
        init: function() {
            this.appendDummyInput()
                .appendField('pioneer.go_to_local_point(x=')
                .appendField(new Blockly.FieldNumber(1), 'X')
                .appendField(', y=')
                .appendField(new Blockly.FieldNumber(0), 'Y')
                .appendField(', z=')
                .appendField(new Blockly.FieldNumber(1), 'Z')
                .appendField(')');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(290);
        }
    };
    pythonGenerator.forBlock.py_goto_local_point = (block: any) => `pioneer.go_to_local_point(x=${block.getFieldValue('X')}, y=${block.getFieldValue('Y')}, z=${block.getFieldValue('Z')})\n`;

    Blockly.Blocks.py_wait_point_reached = {
        init: function() {
            this.appendDummyInput().appendField('while not pioneer.point_reached(): time.sleep(0.05)');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
        }
    };
    pythonGenerator.forBlock.py_wait_point_reached = () => 'while not pioneer.point_reached():\n    time.sleep(0.05)\n';
}
