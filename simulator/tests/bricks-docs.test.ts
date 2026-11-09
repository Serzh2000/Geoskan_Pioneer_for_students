/**
 * Справочник блоков Bricks (public/modules/docs/bricks-blocks-docs.ts): записи совпадают с набором блоков
 * и с Python, который блоки генерируют.
 */
import { BRICKS_SPECS } from '../public/modules/editor/blockly-mode/bricks/index.js';
import { bricksBlocksApiDocs } from '../public/modules/docs/bricks-blocks-docs.js';
import { compileBricksXml, normalizePython } from './helpers/bricks-fixtures.js';

describe('справочник блоков Bricks', () => {
    test('у каждого блока набора есть запись с описанием, сигнатурой и примером', () => {
        const native = ['start_block', 'paint_obj', ...BRICKS_SPECS.map((spec) => spec.type)];
        for (const type of native) {
            const doc = bricksBlocksApiDocs[`Bricks.${type}`];
            expect({ type, ok: Boolean(doc?.desc && doc.syntax && doc.example && doc.insertText) }).toEqual({ type, ok: true });
        }
        expect(bricksBlocksApiDocs['Bricks']).toBeDefined();
    });

    test('в справочнике нет блоков, которых нет в наборе', () => {
        const known = new Set(['Bricks', 'Bricks.start_block', 'Bricks.paint_obj', ...BRICKS_SPECS.map((spec) => `Bricks.${spec.type}`)]);
        expect(Object.keys(bricksBlocksApiDocs).filter((key) => !known.has(key))).toEqual([]);
    });

    test('блоки «только на дроне» названы такими в справочнике', () => {
        for (const spec of BRICKS_SPECS.filter((item) => item.droneOnly)) {
            expect(bricksBlocksApiDocs[`Bricks.${spec.type}`].desc).toContain('Только на дроне');
        }
    });

    test('Python из справочника - тот, что генерирует блок', () => {
        const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="start_block"><next><block type="take_off"><next><block type="landing"></block></next></block></next></block></xml>';
        const code = normalizePython(compileBricksXml(xml));
        expect(code).toContain(bricksBlocksApiDocs['Bricks.take_off'].insertText);
        expect(code).toContain(bricksBlocksApiDocs['Bricks.landing'].insertText);
    });
});
