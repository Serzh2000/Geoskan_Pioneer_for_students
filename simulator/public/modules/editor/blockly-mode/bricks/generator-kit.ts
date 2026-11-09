import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';
import { HEX_TO_BGR, INFER_CACHE, MODEL_NAME_PICKER } from './python-lib.js';

/*
 * Общие помощники генераторов Bricks: определения (definitions_) в порядке первого использования,
 * разбор входов и выражения-обёртки. Сами генераторы блоков - generators.ts и generators-ai.ts.
 * Вывод - в том же виде, что у Pioneer Bricks 2.3.0 (эталон - tests/fixtures/bricks/u01..u10.py).
 */

export const gen = pythonGenerator;

export type CodeValue = [string, number];

export function definitions(): Record<string, string> {
    return (gen as unknown as { definitions_: Record<string, string> }).definitions_;
}

/** Определение с ключом: повторное добавление ничего не меняет, порядок - по первому использованию. */
export function define(key: string, text: string): void {
    const all = definitions();
    if (!(key in all)) all[key] = text;
}

/** Функция в определениях отделяется пустыми строками. */
export const fn = (text: string): string => `\n${text}\n`;

export function pioneer(): void {
    define('pioneer', 'from pioneer_sdk2 import Pioneer\npioneer = Pioneer()');
}

export function colourHelper(): void {
    define('hex_to_bgr', fn(HEX_TO_BGR));
}

export function importCv2(): void {
    define('import_cv2', 'import cv2');
}

export function importNumpy(): void {
    define('import_numpy', 'import numpy as np');
}

export function camera(): void {
    importCv2();
    importNumpy();
    define(
        'camera',
        'from pioneer_sdk2 import Camera, ImageViewer, CameraType\n\n'
        + 'cam_main, cam_opt = Camera(camera_type=CameraType.MAIN), Camera(camera_type=CameraType.OPT)\n'
        + 'iv = ImageViewer()\ncams_dict = {}'
    );
}

export function inferCache(): void {
    define('infer_cache', fn(INFER_CACHE));
}

export function importDeque(): void {
    define('import_deque', 'from collections import deque, defaultdict');
}

export function aiCommon(): void {
    importCv2();
    define('import_os', 'import os');
    define('import_sys', 'import sys');
    define('import_defaultdict', 'from collections import defaultdict');
    importNumpy();
    define('queries_dict', 'queries_dict: defaultdict = defaultdict(set)');
    define('images_dict', 'images = {}');
    define('model_name_picker', fn(MODEL_NAME_PICKER));
}

export const ARG_NONE = Order.NONE;

export function arg(block: Blockly.Block, name: string, fallback: string, order: number = ARG_NONE): string {
    return gen.valueToCode(block, name, order) || fallback;
}

export function asText(code: string): string {
    return /^\s*(['"]).*\1\s*$/s.test(code) ? code : `str(${code})`;
}

/** Имя переменной, из которой взято изображение: Bricks хранит по нему результат нейросети. */
export function imageName(block: Blockly.Block, input: string): string {
    const target = block.getInputTargetBlock(input);
    if (target?.type === 'variables_get') {
        const name = gen.getVariableName(String(target.getFieldValue('VAR')));
        return name.replace(/[^A-Za-z0-9_]/g, '_') || 'img';
    }
    return 'img';
}

export function variableOfParent(block: Blockly.Block): string | null {
    const parent = block.getParent();
    if (parent?.type !== 'variables_set' || parent.getInputTargetBlock('VALUE') !== block) return null;
    return gen.getVariableName(String(parent.getFieldValue('VAR')));
}

export const inferCall = (name: string, image: string, modelCall: string, prefix = 'results'): string =>
    `(${prefix}_${name} := infer_cache_per_frame("${prefix}_${name}", ${image}, lambda fr: ${modelCall}))`;

export const ledColour = (block: Blockly.Block): string => {
    colourHelper();
    return `*[c / 255 for c in hex_to_bgr(${arg(block, 'COLOR', '"#000000"')})][::-1]`;
};

export function statement(code: string): string {
    return `${code}\n`;
}

export function value(code: string, order: number = Order.FUNCTION_CALL): CodeValue {
    return [code, order];
}

export type BlockGen = (block: Blockly.Block) => string | CodeValue;

/** Текст определений (в порядке добавления) после генерации тела программы. */
export function collectBricksDefinitions(): string {
    const all = definitions();
    const keys = Object.keys(all);
    const ordered = [
        ...keys.filter((key) => key === 'variables'),
        ...keys.filter((key) => key !== 'variables' && !key.startsWith('%')),
        ...keys.filter((key) => key.startsWith('%'))
    ];
    return ordered.map((key) => (key.startsWith('%') ? fn(all[key].replace(/\n+$/, '')) : all[key])).join('\n');
}
