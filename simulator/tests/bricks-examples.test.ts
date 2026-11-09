/**
 * Проекты Bricks, которые лежат в examples/python-onboard/bricks/ и на которые ссылается книга
 * (главы «Bricks»): каждый XML открывается и собирается в тот же Python, что и проект из сборника
 * «Pioneer Bricks» (tests/fixtures/bricks/*.py - вывод самого Bricks 2.3.0).
 * Что код из книги (bricks/python/*.py) входит в этот Python, проверяет lessons-book-examples.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BRICKS_PROJECTS, compileBricksXml, normalizePython, readBricksFixture } from './helpers/bricks-fixtures.js';

const EXAMPLES = path.resolve(process.cwd(), '..', 'examples', 'python-onboard', 'bricks');
const available = fs.existsSync(EXAMPLES);
const describeExamples = available ? describe : describe.skip;

describeExamples('Bricks: проекты из examples/', () => {
    test('в examples/ те же 10 проектов, что в фикстурах', () => {
        const names = fs.readdirSync(EXAMPLES).filter((name) => name.endsWith('.xml')).map((name) => name.replace(/\.xml$/, '')).sort();
        expect(names).toEqual(BRICKS_PROJECTS);
    });

    test.each(BRICKS_PROJECTS)('%s: XML из examples/ собирается в Python, равный выводу Bricks', (name) => {
        const xml = fs.readFileSync(path.join(EXAMPLES, `${name}.xml`), 'utf8');
        expect(normalizePython(compileBricksXml(xml))).toBe(normalizePython(readBricksFixture(name, 'py')));
    });
});
