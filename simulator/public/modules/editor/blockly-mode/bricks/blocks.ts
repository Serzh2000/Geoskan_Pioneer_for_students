import * as Blockly from 'blockly';
import { BRICKS_COLOURS, BRICKS_DRONE_ONLY_REASON, BRICKS_START_TYPE, bricksType } from './constants.js';
import { FieldHexColour } from './colour-field.js';
import {
    BRICKS_CATEGORY_COLOUR,
    BRICKS_SPECS,
    PAINT_OBJECT_CHOICES,
    PAINT_OBJECT_PYTHON,
    PAINT_OBJECT_TYPE,
    type BricksBlockSpec,
    type BricksPart
} from './block-specs.js';

let registered = false;

type FieldLike = Blockly.Field;

function createField(part: Exclude<BricksPart, string | { input: string }>): { field: FieldLike; name: string } {
    if ('dd' in part) {
        return { field: new Blockly.FieldDropdown(part.options.map(([value, label]) => [label, value] as [string, string])), name: part.dd };
    }
    if ('num' in part) {
        return {
            field: new Blockly.FieldNumber(part.value, part.min, part.max, part.precision),
            name: part.num
        };
    }
    if ('colour' in part) {
        return { field: new FieldHexColour(part.value), name: part.colour };
    }
    return { field: new Blockly.FieldNumber(part.value, -360, 360, 1), name: part.angle };
}

/**
 * Раскладка блока по описанию: подписи и поля копятся и садятся на следующий вход-значение
 * (как «X [ ]» в Bricks), остаток после последнего входа - на отдельный пустой вход.
 */
function layout(block: Blockly.Block, parts: BricksPart[]): void {
    let pending: Array<string | { field: FieldLike; name: string }> = [];
    const flush = (input: Blockly.Input) => {
        for (const item of pending) {
            if (typeof item === 'string') input.appendField(item);
            else input.appendField(item.field, item.name);
        }
        pending = [];
    };
    for (const part of parts) {
        if (typeof part === 'string') {
            pending.push(part);
        } else if ('input' in part) {
            const input = block.appendValueInput(part.input);
            if (part.check) input.setCheck(part.check);
            flush(input);
        } else {
            pending.push(createField(part));
        }
    }
    if (pending.length > 0) flush(block.appendDummyInput());
    block.setInputsInline(true);
}

function defineFromSpec(spec: BricksBlockSpec): void {
    Blockly.Blocks[bricksType(spec.type)] = {
        init(this: Blockly.Block) {
            layout(this, spec.parts);
            if (spec.kind === 'statement') {
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
            } else {
                this.setOutput(true, spec.output ?? null);
            }
            this.setColour(BRICKS_CATEGORY_COLOUR[spec.category]);
            this.setTooltip(spec.droneOnly
                ? `${spec.tooltip} Python: ${spec.python}. Работает только на дроне: в симуляторе этой функции OpenCV нет.`
                : `${spec.tooltip} Python: ${spec.python}`);
        }
    };
}

// ---- «Нарисовать …»: набор входов зависит от выбранного объекта ----
// Входы добавляются и убираются по-настоящему (а не прячутся), поэтому форма блока одинакова и в
// редакторе, и в генераторе кода, и при загрузке XML: поле chosen_obj ставится раньше входов,
// а его проверка собирает нужную форму.

const PAINT_LABELS: Record<string, string> = { yolo_obj: 'объект YOLO', yolopose_obj: 'позу', aruco: 'объект ArUco' };

function syncPaintInput(block: Blockly.Block, name: string, wanted: boolean, create: () => void): void {
    const exists = Boolean(block.getInput(name));
    if (wanted && !exists) {
        create();
    } else if (!wanted && exists) {
        block.getInput(name)?.connection?.targetBlock()?.unplug();
        block.removeInput(name, true);
    }
}

function setPaintShape(block: Blockly.Block, shape: string, idsMode: string): void {
    block.getField('PAINT_LABEL')?.setValue(PAINT_LABELS[shape] ?? PAINT_LABELS.yolo_obj);
    // Цвет рамки - только для Yolo; блок «Цвет» подключают сюда (поле colour в XML Bricks).
    syncPaintInput(block, 'colour', shape === 'yolo_obj', () => {
        block.appendValueInput('colour').appendField('цвет рамки');
    });
    syncPaintInput(block, 'ARUCO_ROW', shape === 'aruco', () => {
        block.appendDummyInput('ARUCO_ROW')
            .appendField('отрисовать')
            .appendField(
                new Blockly.FieldDropdown([['все', 'all'], ['только с ID', 'id']], (newValue: string) => {
                    setPaintShape(block, block.getFieldValue('chosen_obj') ?? 'aruco', newValue);
                    return newValue;
                }),
                'chosen_objaaaa'
            )
            .appendField('метки');
    });
    syncPaintInput(block, 'ID', shape === 'aruco' && idsMode === 'id', () => {
        block.appendValueInput('ID').appendField('ID');
    });
    block.setInputsInline(true);
}

function definePaintObject(): void {
    Blockly.Blocks[PAINT_OBJECT_TYPE] = {
        init(this: Blockly.Block) {
            this.appendDummyInput()
                .appendField('Нарисовать')
                .appendField(
                    new Blockly.FieldDropdown(
                        PAINT_OBJECT_CHOICES.map(([value, label]) => [label, value] as [string, string]),
                        (newValue: string) => {
                            setPaintShape(this, newValue, this.getFieldValue('chosen_objaaaa') ?? 'all');
                            return newValue;
                        }
                    ),
                    'chosen_obj'
                )
                .appendField(new Blockly.FieldLabel(PAINT_LABELS.yolo_obj), 'PAINT_LABEL');
            this.appendValueInput('obj');
            this.appendValueInput('frame').appendField('на кадре');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(BRICKS_COLOURS.camera);
            this.setTooltip(`Рисует найденные объекты на кадре. Python: ${PAINT_OBJECT_PYTHON}`);
            setPaintShape(this, 'yolo_obj', 'all');
        }
    };
}

function defineStartBlock(): void {
    Blockly.Blocks[BRICKS_START_TYPE] = {
        init(this: Blockly.Block) {
            this.appendDummyInput().appendField('Начало программы');
            this.setNextStatement(true, null);
            this.setDeletable(false);
            this.setColour(BRICKS_COLOURS.start);
            this.setTooltip('Точка входа: блоки ниже выполняются сверху вниз.');
        }
    };
}

/** Регистрирует определения блоков Bricks (Blockly.Blocks). Генераторы - в generators.ts. */
export function registerBricksBlockDefinitions(): void {
    if (registered) return;
    registered = true;
    defineStartBlock();
    definePaintObject();
    BRICKS_SPECS.forEach(defineFromSpec);
}

/** Для отладки и тестов: причины отключения блока. */
export function hasBricksDroneOnlyReason(block: Blockly.Block): boolean {
    return block.hasDisabledReason(BRICKS_DRONE_ONLY_REASON);
}
