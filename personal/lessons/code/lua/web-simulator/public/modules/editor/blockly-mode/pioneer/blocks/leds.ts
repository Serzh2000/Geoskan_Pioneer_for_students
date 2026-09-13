import * as Blockly from 'blockly';
import { definePioneerBlock } from '../registry.js';
import { PIONEER_LED_COUNT } from '../constants.js';

const COLOUR_CHECK = 'PioneerColour';

type ColourPreset = { label: string; rgb: [number, number, number] };

// Порядок и русские подписи — как в §5 плана (value «pioneer_colour_preset»).
const COLOUR_PRESETS: ColourPreset[] = [
    { label: 'красный', rgb: [255, 0, 0] },
    { label: 'зелёный', rgb: [0, 255, 0] },
    { label: 'синий', rgb: [0, 0, 255] },
    { label: 'жёлтый', rgb: [255, 255, 0] },
    { label: 'белый', rgb: [255, 255, 255] },
    { label: 'выключен', rgb: [0, 0, 0] }
];

function presetByLabel(label: string): ColourPreset {
    return COLOUR_PRESETS.find((preset) => preset.label === label) ?? COLOUR_PRESETS[0];
}

// definitions_ у Blockly-генератора протектед — прямого типа для внешнего
// доступа нет, поэтому здесь единственное оправданное исключение из правила
// "не использовать any" (см. существующий pioneer-sdk2-definitions.ts:559).
function definitionsOf(gen: Blockly.CodeGenerator): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

function ensureLuaLedHelpers(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_led_helpers) return;
    definitions.pioneer_led_helpers = [
        `local leds = Ledbar.new(${PIONEER_LED_COUNT})`,
        'local function __led_set(i, c) leds:set(i, c[1] / 255, c[2] / 255, c[3] / 255) end',
        `local function __led_all(c) for i = 0, ${PIONEER_LED_COUNT - 1} do __led_set(i, c) end end`
    ].join('\n');
}

function ensurePythonLedHelper(gen: Blockly.CodeGenerator): void {
    const definitions = definitionsOf(gen);
    if (definitions.pioneer_led_helper) return;
    definitions.pioneer_led_helper = [
        'def _pioneer_led(led_id, c):',
        // led_control() ждёт r,g,b в 0..1 (как реальный pioneer_sdk), а цвет в блоке хранится в 0..255.
        '    pioneer.led_control(led_id=led_id, r=c[0] / 255, g=c[1] / 255, b=c[2] / 255)'
    ].join('\n');
}

export function registerLedBlocks(): void {
    definePioneerBlock({
        type: 'pioneer_colour_preset',
        category: 'leds',
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField(
                new Blockly.FieldDropdown(COLOUR_PRESETS.map((preset) => [preset.label, preset.label])),
                'PRESET'
            );
            this.setOutput(true, COLOUR_CHECK);
            this.setColour('#22c55e');
            this.setTooltip('Готовый цвет для светодиодов.');
        },
        targets: {
            lua: (block) => {
                const [r, g, b] = presetByLabel(block.getFieldValue('PRESET')).rgb;
                return [`{${r}, ${g}, ${b}}`, 0] as [string, number];
            },
            python: (block) => {
                const [r, g, b] = presetByLabel(block.getFieldValue('PRESET')).rgb;
                return [`(${r}, ${g}, ${b})`, 0] as [string, number];
            }
        }
    });

    definePioneerBlock({
        type: 'pioneer_colour_rgb',
        category: 'leds',
        init(this: Blockly.Block) {
            this.appendValueInput('R').setCheck('Number').appendField('Цвет R');
            this.appendValueInput('G').setCheck('Number').appendField('G');
            this.appendValueInput('B').setCheck('Number').appendField('B');
            this.setInputsInline(true);
            this.setOutput(true, COLOUR_CHECK);
            this.setColour('#22c55e');
            this.setTooltip('Цвет по компонентам R, G, B (0..255).');
        },
        targets: {
            lua: (block, gen) => {
                const r = gen.valueToCode(block, 'R', 0) || '0';
                const g = gen.valueToCode(block, 'G', 0) || '0';
                const b = gen.valueToCode(block, 'B', 0) || '0';
                return [`{${r}, ${g}, ${b}}`, 0] as [string, number];
            },
            python: (block, gen) => {
                const r = gen.valueToCode(block, 'R', 0) || '0';
                const g = gen.valueToCode(block, 'G', 0) || '0';
                const b = gen.valueToCode(block, 'B', 0) || '0';
                return [`(${r}, ${g}, ${b})`, 0] as [string, number];
            }
        }
    });

    definePioneerBlock({
        type: 'pioneer_led_all',
        category: 'leds',
        init(this: Blockly.Block) {
            this.appendValueInput('COLOUR').setCheck(COLOUR_CHECK).appendField('Все светодиоды: цвет');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#22c55e');
            this.setTooltip('Устанавливает один цвет для всех светодиодов ленты.');
        },
        targets: {
            lua: (block, gen) => {
                ensureLuaLedHelpers(gen);
                return `__led_all(${gen.valueToCode(block, 'COLOUR', 0) || '{0, 0, 0}'})\n`;
            },
            python: (block, gen) => {
                ensurePythonLedHelper(gen);
                return `_pioneer_led(255, ${gen.valueToCode(block, 'COLOUR', 0) || '(0, 0, 0)'})\n`;
            }
        },
        apiUsage: { lua: ['Ledbar.new', 'leds:set'], python: ['pioneer.led_control'] }
    });

    definePioneerBlock({
        type: 'pioneer_led_index',
        category: 'leds',
        init(this: Blockly.Block) {
            this.appendValueInput('INDEX').setCheck('Number').appendField('Светодиод №');
            this.appendValueInput('COLOUR').setCheck(COLOUR_CHECK).appendField('цвет');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour('#22c55e');
            this.setTooltip('Устанавливает цвет одного светодиода по номеру (нумерация с 0).');
        },
        targets: {
            lua: (block, gen) => {
                ensureLuaLedHelpers(gen);
                const index = gen.valueToCode(block, 'INDEX', 0) || '0';
                const colour = gen.valueToCode(block, 'COLOUR', 0) || '{0, 0, 0}';
                return `__led_set(${index}, ${colour})\n`;
            },
            python: (block, gen) => {
                ensurePythonLedHelper(gen);
                const index = gen.valueToCode(block, 'INDEX', 0) || '0';
                const colour = gen.valueToCode(block, 'COLOUR', 0) || '(0, 0, 0)';
                return `_pioneer_led(${index}, ${colour})\n`;
            }
        },
        apiUsage: { lua: ['Ledbar.new', 'leds:set'], python: ['pioneer.led_control'] }
    });
}
