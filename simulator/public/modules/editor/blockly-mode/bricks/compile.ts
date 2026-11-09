import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';
import { BRICKS_START_TYPE, bricksType } from './constants.js';
import { collectBricksDefinitions, installBricksGenerators } from './generators.js';
import { setCompileWarning } from './drone-only.js';
import { PAINT_OBJECT_TYPE } from './block-specs.js';

const PROCEDURE_TYPES = new Set(['procedures_defnoreturn', 'procedures_defreturn']);

// Имена, которые создаёт сгенерированный код: переменная ученика не должна их затереть.
const RESERVED = [
    'pioneer', 'servo', 'cam_main', 'cam_opt', 'iv', 'cams_dict', 'queries_dict', 'images', 'cv2', 'np', 'os', 'sys',
    'sleep', 'time', 'model_yolo', 'model_yolopose', 'model_ppocr', 'IMG_SIZE', 'hex_to_bgr', 'last_cmds', 'tracker_state',
    'pio', 'cam', 'cam_name', 'viewer', 'e'
].join(',');

// Завершение программы Bricks: при любом исходе дрон садится, камеры и окно просмотра закрываются.
const FINALLY_BLOCK = [
    'finally:',
    '    pio = locals().get("pioneer")',
    '    if pio is not None:',
    '        try:',
    '            pio.wait_callback = False',
    '            pio.land()',
    '            pio.close_connection()',
    '        except Exception:',
    '            pass',
    '',
    '    for cam_name in ("cam_main", "cam_opt"):',
    '        cam = locals().get(cam_name)',
    '        if cam is not None:',
    '            try:',
    '                cam.stop()',
    '            except Exception:',
    '                pass',
    '',
    '    viewer = locals().get("iv")',
    '    if viewer is not None:',
    '        try:',
    '            viewer.close()',
    '        except Exception:',
    '            pass',
    '        del viewer',
    '',
    '    if pio is not None:',
    '        del pio',
    '    print("Конец программы")'
].join('\n');

const MODEL_BY_BLOCK: Record<string, string> = {
    [bricksType('yolo_object')]: 'Yolo',
    [bricksType('yolo_pose_object')]: 'YoloPose',
    [bricksType('pose_compare')]: 'YoloPose',
    [bricksType('ppocr_text_find')]: 'PaddleOCR',
    [bricksType('ppocr_text_selection_from_object')]: 'PaddleOCR'
};

function requiredModel(block: Blockly.Block): string | null {
    if (block.type === PAINT_OBJECT_TYPE) {
        const shape = block.getFieldValue('chosen_obj');
        return shape === 'yolo_obj' ? 'Yolo' : shape === 'yolopose_obj' ? 'YoloPose' : null;
    }
    return MODEL_BY_BLOCK[block.type] ?? null;
}

function topLevelBlocks(workspace: Blockly.Workspace): Blockly.Block[] {
    return workspace.getTopBlocks(true).filter((block) => !block.isInsertionMarker());
}

/** Ставит предупреждения: лишние «Начало программы», блоки вне программы, ИИ без инициализации модели. */
function refreshWarnings(workspace: Blockly.Workspace, topBlocks: Blockly.Block[]): void {
    const blocks = workspace.getAllBlocks(false);
    const initialised = new Set(
        blocks.filter((block) => block.type === bricksType('ai_model_init') && block.isEnabled()).map((block) => String(block.getFieldValue('chosen_model')))
    );
    const stray = new Set<Blockly.Block>();
    topBlocks.forEach((block) => {
        if (block.type !== BRICKS_START_TYPE && !PROCEDURE_TYPES.has(block.type)) stray.add(block);
    });
    const starts = topBlocks.filter((block) => block.type === BRICKS_START_TYPE);
    blocks.forEach((block) => {
        const model = requiredModel(block);
        let message: string | null = null;
        if (model && !initialised.has(model)) {
            message = `Сначала добавьте блок «Инициализация ИИ модели» с моделью ${model}: без неё нейросеть не загружена.`;
        }
        if (stray.has(block)) {
            message = 'Блок не подключён к «Начало программы» и не будет выполнен.';
        } else if (block.type === BRICKS_START_TYPE && starts.indexOf(block) > 0) {
            message = 'Несколько блоков «Начало программы»: используется только первый.';
        }
        setCompileWarning(block, message);
    });
}

function indentBody(body: string): string {
    return body
        .replace(/\n+$/, '')
        .split('\n')
        .map((line) => (line.trim() === '' ? '' : `    ${line}`))
        .join('\n');
}

function asCode(result: string | [string, number] | null): string {
    if (!result) return '';
    return typeof result === 'string' ? result : result[0];
}

/** Python программы Bricks: определения, затем тело в try/except/finally - как у Pioneer Bricks 2.3.0. */
export function compileBricksWorkspace(workspace: Blockly.Workspace): string {
    installBricksGenerators();
    // pythonGenerator один на весь редактор: зарезервированные слова Bricks нужны только на время
    // этой сборки, иначе они переименовали бы переменные программ Базового.
    const reserved = pythonGenerator as unknown as { RESERVED_WORDS_: string };
    const savedReserved = reserved.RESERVED_WORDS_;
    // То же с «напечатать»: общий генератор оборачивает аргумент в лишние скобки (print((a + b))),
    // а Bricks печатает print(a + b).
    const savedPrint = pythonGenerator.forBlock['text_print'];
    pythonGenerator.forBlock['text_print'] = (block) => `print(${pythonGenerator.valueToCode(block, 'TEXT', Order.NONE) || "''"})\n`;
    try {
        pythonGenerator.addReservedWords(RESERVED);
        pythonGenerator.init(workspace);
        return buildProgram(workspace);
    } finally {
        reserved.RESERVED_WORDS_ = savedReserved;
        pythonGenerator.forBlock['text_print'] = savedPrint;
    }
}

function buildProgram(workspace: Blockly.Workspace): string {
    const topBlocks = topLevelBlocks(workspace);
    refreshWarnings(workspace, topBlocks);

    const start = topBlocks.find((block) => block.type === BRICKS_START_TYPE && block.isEnabled());
    const body = start ? asCode(pythonGenerator.blockToCode(start)) : '';
    // Функции ученика не подключены к старту, но нужны программе, если где-то есть их вызов.
    topBlocks.filter((block) => PROCEDURE_TYPES.has(block.type)).forEach((block) => pythonGenerator.blockToCode(block));

    const definitions = collectBricksDefinitions().replace(/\n+$/, '');
    const program = [
        definitions,
        '',
        'print("Начало программы")',
        'try:',
        indentBody(body) || '    pass',
        'except Exception as e:',
        '    print(e)',
        FINALLY_BLOCK
    ].join('\n');
    return program.replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}
