const Blockly = require('blockly');

const ws = new Blockly.Workspace();
const b = ws.newBlock('math_arithmetic');
Blockly.Blocks['sanity_array_out'] = {
    init() {
        this.appendDummyInput().appendField('arr');
        this.setOutput(true, 'Array');
    }
};
const arrBlock = ws.newBlock('sanity_array_out');
console.log('out check:', JSON.stringify(arrBlock.outputConnection.getCheck()));
try { b.getInput('A').connection.connect(arrBlock.outputConnection); console.log('connect: no throw'); }
catch (e) { console.log('connect threw:', e.message); }
console.log('A targetBlock:', b.getInput('A').connection.targetBlock()?.type ?? null);

const checker = new Blockly.ConnectionChecker();
const c1 = b.getInput('A').connection;
const c2 = ws.newBlock('sanity_array_out').outputConnection;
console.log('checker.canConnect:', checker.canConnect(c1, c2, false));

// controls_for через value-входы
const ws7 = new Blockly.Workspace();
const loop = ws7.newBlock('controls_for');
const varId = ws7.getVariableMap().createVariable('i').getId();
loop.setFieldValue(varId, 'VAR');
function num(ws_, value) { const n = ws_.newBlock('math_number'); n.setFieldValue(String(value), 'NUM'); return n; }
loop.getInput('FROM').connection.connect(num(ws7, 1).outputConnection);
loop.getInput('TO').connection.connect(num(ws7, 10).outputConnection);
loop.getInput('BY').connection.connect(num(ws7, 2).outputConnection);
const { pythonGenerator } = require('blockly/python');
const { luaGenerator } = require('blockly/lua');
console.log('py for:', JSON.stringify(pythonGenerator.workspaceToCode(ws7)));
console.log('lua for:', JSON.stringify(luaGenerator.workspaceToCode(ws7)));
