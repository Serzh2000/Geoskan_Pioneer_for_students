/**
 * Набор примеров Bricks для редактора Мини 2 (examples-blocks-mini2/<группа>/<имя>.xml): каждый проект
 * открывается в редакторе, содержит «Начало программы» и собирается в Python, который синтаксически разбирается.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileBricksXml } from './helpers/bricks-fixtures.js';
import { runMini2Program, withMini2Python } from './helpers/mini2-runtime.js';

const ROOT = path.resolve(process.cwd(), 'examples-blocks-mini2');
const FILES = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) => fs.readdirSync(path.join(ROOT, dir.name)).filter((name) => name.endsWith('.xml')).map((name) => `${dir.name}/${name}`))
    .sort();

describe('Bricks: примеры редактора Мини 2', () => {
    test('примеров много и они разложены по темам', () => {
        expect(FILES.length).toBeGreaterThanOrEqual(40);
        expect(new Set(FILES.map((file) => file.split('/')[0])).size).toBeGreaterThanOrEqual(6);
    });

    test.each(FILES)('%s: открывается и собирается в Python', (file) => {
        const xml = fs.readFileSync(path.join(ROOT, file), 'utf8');
        expect(xml).toContain('type="start_block"');
        const python = compileBricksXml(xml);
        expect(python).toMatch(/try:/);
        const indents = python.split('\n').filter((line) => /^\t/.test(line));
        expect(indents).toEqual([]);
    });

    // Программа выполняется на настоящих pioneer_sdk2 и cv2 симулятора; ошибка Python — провал.
    const runnable = withMini2Python;
    // Папка bricks/ — проекты из учебника: бесконечные циклы и нейросети, их запускает bricks-runtime.test.ts.
    FILES.filter((file) => !file.startsWith('bricks/')).forEach((file) => {
        runnable(`${file}: выполняется без ошибок`, () => {
            const xml = fs.readFileSync(path.join(ROOT, file), 'utf8');
            const result = runMini2Program(compileBricksXml(xml), { seconds: 300, markers: true });
            expect(result.error).toBeNull();
        });
    });
});
