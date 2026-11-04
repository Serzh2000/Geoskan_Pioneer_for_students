/**
 * Собирает examples-blocks/<группа>/<имя>.json из каталога examples.mjs и
 * tests/fixtures/block-examples.json - ожидания для проверки в симуляторе.
 *
 *   node tools/block-examples/build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { program, resetVariables } from './dsl.mjs';
import { examples } from './examples.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(projectRoot, 'examples-blocks');
const expectPath = path.join(projectRoot, 'tests', 'fixtures', 'block-examples.json');

fs.rmSync(outDir, { recursive: true, force: true });
const expectations = [];
for (const example of examples) {
    resetVariables();
    const main = example.main();
    const top = example.top ? example.top() : [];
    const workspace = program(main, top, example.comment);
    const file = `${example.group}/${example.name}.json`;
    fs.mkdirSync(path.join(outDir, example.group), { recursive: true });
    fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(workspace, null, 2)}\n`, 'utf8');
    expectations.push({
        file, targets: example.targets, points: example.points, led: example.led, lands: example.lands, seconds: example.seconds
    });
}
fs.mkdirSync(path.dirname(expectPath), { recursive: true });
fs.writeFileSync(expectPath, `${JSON.stringify(expectations, null, 2)}\n`, 'utf8');
console.log(`[block-examples] ${expectations.length} примеров -> ${outDir}`);
