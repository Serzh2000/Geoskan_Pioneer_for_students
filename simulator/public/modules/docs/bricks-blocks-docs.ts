import type { ApiDoc } from './api-docs-types.js';
import {
    BRICKS_CATEGORY_LABEL,
    BRICKS_SPECS,
    PAINT_OBJECT_CHOICES,
    PAINT_OBJECT_PYTHON,
    PAINT_OBJECT_NATIVE_TYPE,
    type BricksBlockSpec,
    type BricksPart
} from '../editor/blockly-mode/bricks/block-specs.js';

/*
 * Справочник блоков «Bricks (Мини 2)»: блок -> Python, который по нему собирает редактор (и сам Pioneer Bricks 2.3.0).
 * Данные берутся из описания блоков (editor/blockly-mode/bricks/block-specs.ts), поэтому справочник не расходится с палитрой.
 * Ключ записи - `Bricks.<тип блока>`: тип блока - то имя, которое стоит в XML проекта Bricks (<block type="...">).
 *
 * Подключение: у Мини 2 (pioneer_sdk2) рядом со справочником pioneer_sdk2 и pioneer_rknn показать
 * `{ ...pythonSdk2ApiDocs, ...pythonRknnApiDocs, ...bricksBlocksApiDocs }` (ui/api-docs/index.ts, renderApiDocs),
 * а в ui/api-docs/sections.ts завести раздел «Блоки Bricks» для ключей, начинающихся с `Bricks.`.
 */

function partText(part: BricksPart): string {
    if (typeof part === 'string') return part;
    if ('input' in part) return `[${part.input}]`;
    if ('dd' in part) return `[${part.options.slice(0, 3).map(([, label]) => label).join(' | ')}${part.options.length > 3 ? ' | …' : ''}]`;
    if ('num' in part) return `[${part.value}]`;
    if ('colour' in part) return `[${part.value}]`;
    return `[${part.value}°]`;
}

function titleOf(spec: BricksBlockSpec): string {
    return spec.parts.map(partText).join(' ').replace(/\s+/g, ' ').trim();
}

function paramsOf(spec: BricksBlockSpec): string {
    const params = spec.parts
        .filter((part): part is Exclude<BricksPart, string> => typeof part !== 'string')
        .map((part) => {
            if ('input' in part) return `${part.input} - вход блока${part.shadow ? ` (по умолчанию ${part.shadow.value})` : ''}`;
            if ('dd' in part) return `${part.dd} - выбор: ${part.options.map(([, label]) => label).join(', ')}`;
            if ('num' in part) return `${part.num} - число${part.min !== undefined ? ` от ${part.min} до ${part.max}` : ''}${part.precision ? `, шаг ${part.precision}` : ''}`;
            if ('colour' in part) return `${part.colour} - цвет`;
            return `${part.angle} - угол в градусах`;
        });
    return params.length > 0 ? params.join('; ') : 'нет';
}

function entry(spec: BricksBlockSpec): ApiDoc {
    const category = BRICKS_CATEGORY_LABEL[spec.category];
    const droneOnly = spec.droneOnly
        ? ' Только на дроне: в симуляторе нет этой функции OpenCV, блок отключён и в код не попадает; на настоящем Мини 2 он работает.'
        : '';
    return {
        desc: `Блок категории «${category}». ${spec.tooltip}${droneOnly}`,
        syntax: titleOf(spec),
        params: paramsOf(spec),
        returns: spec.kind === 'statement' ? 'команда (блок встаёт в цепочку)' : 'значение (блок вставляется в вход другого блока)',
        example: `# Блок → Python\n${spec.python}`,
        insertText: spec.python,
        kind: 'Block',
        aliases: ['bricks', 'блок', spec.type, category.toLowerCase()]
    };
}

const startAndPaint: Record<string, ApiDoc> = {
    'Bricks.start_block': {
        desc: 'Точка входа программы Bricks: блоки ниже выполняются сверху вниз. Из них редактор собирает тело программы внутри try; в finally дрон всегда садится (pioneer.land()), камеры и окно просмотра закрываются, потом печатается «Конец программы».',
        syntax: 'Начало программы',
        params: 'нет',
        returns: 'команда (неудаляемый блок)',
        example: '# Блок → Python\nprint("Начало программы")\ntry:\n    ...  # блоки под «Начало программы»\nexcept Exception as e:\n    print(e)\nfinally:\n    ...  # безопасное завершение: pio.land(), cam.stop(), viewer.close()',
        insertText: 'print("Начало программы")\ntry:\n    pass\nexcept Exception as e:\n    print(e)',
        kind: 'Block',
        aliases: ['bricks', 'блок', 'start_block', 'начало программы']
    },
    [`Bricks.${PAINT_OBJECT_NATIVE_TYPE}`]: {
        desc: `Блок категории «Камера»: рисует найденное на кадре. Форма блока зависит от выбранного объекта: ${PAINT_OBJECT_CHOICES.map(([, label]) => label).join(', ')}. У Yolo есть цвет рамки (блок «Цвет»), у ArUco - выбор «все метки» или метки с одним ID. Нужна инициализация модели (Yolo, YoloPose) или поиск маркеров.`,
        syntax: 'Нарисовать [Yolo | Поза | ArUco] объект [obj] на кадре [frame] цвет рамки [colour]',
        params: 'chosen_obj - выбор объекта; obj - результат поиска; frame - кадр; colour - цвет рамки Yolo; chosen_objaaaa - ArUco: все метки или с ID',
        returns: 'команда (блок встаёт в цепочку)',
        example: `# Блок → Python\n${PAINT_OBJECT_PYTHON}`,
        insertText: 'draw_yolo_on_image(img, people, hex_to_bgr("#00ff00"))',
        kind: 'Block',
        aliases: ['bricks', 'блок', PAINT_OBJECT_NATIVE_TYPE, 'нарисовать', 'камера']
    }
};

export const bricksBlocksApiDocs: Record<string, ApiDoc> = {
    'Bricks': {
        desc: 'Pioneer Bricks - блочное программирование Пионера Мини 2 (Blockly). Блоки собирают Python на pioneer_sdk2 и pioneer_rknn в том же виде, что и среда Bricks 2.3.0 Геоскана: проекты Bricks (.xml) открываются и сохраняются без потерь. Категории: Полёт, Модули, Камера, ИИ, Компьютерное зрение, Прочее и стандартные блоки Blockly. Блоки, которым нужны функции OpenCV, которых нет в симуляторе, помечены «только на дроне».',
        syntax: 'Редактор -> «Мини 2» -> режим «Blockly»',
        params: 'нет',
        returns: 'нет',
        example: '# Начало программы → Включить все светодиоды красным → Заснуть на 1 секунд\nfrom pioneer_sdk2 import Pioneer\npioneer = Pioneer()\n...\npioneer.led_control(255, *[c / 255 for c in hex_to_bgr("#ff0000")][::-1])\nsleep(1)',
        insertText: 'from pioneer_sdk2 import Pioneer\npioneer = Pioneer()',
        kind: 'Class',
        aliases: ['bricks', 'блоки', 'blockly', 'мини 2']
    },
    ...startAndPaint,
    ...Object.fromEntries(BRICKS_SPECS.map((spec) => [`Bricks.${spec.type}`, entry(spec)]))
};
