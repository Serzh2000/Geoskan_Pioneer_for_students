import * as Blockly from 'blockly';
import * as luaGeneratorModule from 'blockly/lua';
import * as pythonGeneratorModule from 'blockly/python';
import * as javascriptGeneratorModule from 'blockly/javascript';
// Официальная русская локализация стандартных блоков Blockly
// (логика, циклы, числа, списки, переменные, функции, тултипы, кнопки flyout)
import * as ruMessages from 'blockly/msg/ru';

const luaGenerator = (luaGeneratorModule as any)?.luaGenerator;
const pythonGenerator = (pythonGeneratorModule as any)?.pythonGenerator;
const javascriptGenerator = (javascriptGeneratorModule as any)?.javascriptGenerator;

let definitionsInitialized = false;

export { Blockly };

export function getBlocklyGenerator(language: string) {
    if (language === 'lua') return luaGenerator;
    if (language === 'python') return pythonGenerator;
    if (language === 'javascript') return javascriptGenerator;
    return null;
}

import { registerLuaBlocklyDefinitions } from './teaching-lua-definitions.js';
import { registerPythonBlocklyDefinitions } from './teaching-python-definitions.js';

export function initBlocklyDefinitions() {
    if (definitionsInitialized) return;
    definitionsInitialized = true;

    applyRussianMessages();

    if (registerLuaBlocklyDefinitions) {
        registerLuaBlocklyDefinitions();
    }
    if (registerPythonBlocklyDefinitions) {
        registerPythonBlocklyDefinitions();
    }
}

function applyRussianMessages() {
    // Полная официальная русская локализация стандартных блоков Blockly:
    // условия («если/то/иначе»), циклы, числа, списки, переменные
    // (в т.ч. кнопка «Создать переменную...»), функции («создать функцию»), тултипы.
    Blockly.setLocale(ruMessages as unknown as Record<string, string>);

    // Локализуем СТАНДАРТНЫЕ блоки через Blockly.Msg, не подменяя их определения.
    // Раньше здесь переопределялись init() стандартных блоков, из-за чего
    // logic_compare терял входы A/B (любое сравнение давало «0 == 0»),
    // controls_for использовал поле STEP вместо BY (шаг молча игнорировался),
    // а controls_if терял мутатор else-if/else.
    // Формулировки ниже применяются ПОВЕРХ официального словаря ru.
    const messages: Record<string, string> = {
        // Условия
        CONTROLS_IF_MSG_IF: 'если',
        CONTROLS_IF_MSG_ELSEIF: 'иначе если',
        CONTROLS_IF_MSG_ELSE: 'иначе',
        CONTROLS_IF_MSG_THEN: 'то',
        // Циклы
        CONTROLS_REPEAT_TITLE: 'повторить %1 раз',
        CONTROLS_REPEAT_INPUT_DO: 'сделать',
        CONTROLS_WHILEUNTIL_OPERATOR_WHILE: 'повторять пока',
        CONTROLS_WHILEUNTIL_OPERATOR_UNTIL: 'повторять пока не',
        CONTROLS_FOR_TITLE: 'счётчик %1 от %2 до %3 с шагом %4',
        CONTROLS_FOREACH_TITLE: 'для каждого элемента %1 в списке %2',
        // Логика
        LOGIC_BOOLEAN_TRUE: 'истина',
        LOGIC_BOOLEAN_FALSE: 'ложь',
        LOGIC_OPERATION_AND: 'и',
        LOGIC_OPERATION_OR: 'или',
        LOGIC_NEGATE_TITLE: 'не %1',
        LOGIC_TERNARY_CONDITION: 'условие',
        LOGIC_TERNARY_IF_TRUE: 'если истина',
        // Текст
        TEXT_PRINT_TITLE: 'напечатать %1',
        TEXT_JOIN_TITLE_CREATEWITH: 'объединить текст из',
        // Списки
        LISTS_CREATE_WITH_INPUT_WITH: 'создать список из',
        LISTS_CREATE_WITH_CONTAINER_TITLE_ADD: 'список',
        LISTS_CREATE_WITH_ITEM_TITLE: 'элемент',
        LISTS_LENGTH_TITLE: 'длина %1',
        LISTS_ISEMPTY_TITLE: '%1 пуст',
        // Переменные
        VARIABLES_SET: 'переменная %1 = %2'
    };

    Object.entries(messages).forEach(([key, value]) => {
        (Blockly.Msg as unknown as Record<string, string>)[key] = value;
    });
}

// text_print - единый вывод
Blockly.Blocks.text_print = {
    init: function() {
        this.appendDummyInput().appendField('напечатать');
        this.appendValueInput('TEXT').appendField('').setCheck(['String', 'Number', 'Boolean', 'Array']);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip('Выводит значение на печать');
    }
};

// Когда все генераторы загрузятся, добавляем генераторы для текстовых блоков
function registerRussianGeneratorHooks() {
    const generators = [
        luaGenerator,
        pythonGenerator,
        javascriptGenerator
    ];

    generators.forEach((generator) => {
        if (generator && generator.forBlock) {
            generator.forBlock['text_print'] = function(block: any) {
                const value = generator.valueToCode(block, 'TEXT', 0) || '';
                return `print(${value})\n`;
            };
        }
    });
}

registerRussianGeneratorHooks();
