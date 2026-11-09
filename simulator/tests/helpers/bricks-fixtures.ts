import fs from 'node:fs';
import path from 'node:path';
import * as Blockly from 'blockly';
import { ensureEditorBlocklyDefinitions } from '../../public/modules/editor/blockly-mode/index.js';
import { compileBricksWorkspace, loadBricksProject } from '../../public/modules/editor/blockly-mode/bricks/index.js';

await import('../../public/modules/editor/blockly-mode/blockly-core.js');
await import('../../public/modules/editor/blockly-mode/workspace-xml.js');
await import('../../public/modules/editor/blockly-mode/lua-definitions.js');
await ensureEditorBlocklyDefinitions();

/** Проекты Bricks 2.3.0 и Python, который по ним сгенерировал сам Bricks (сборник «Pioneer Bricks», папка generated/). */
export const BRICKS_FIXTURES = path.join(process.cwd(), 'tests', 'fixtures', 'bricks');

export const BRICKS_PROJECTS = fs
    .readdirSync(BRICKS_FIXTURES)
    .filter((name) => name.endsWith('.xml'))
    .map((name) => name.replace(/\.xml$/, ''))
    .sort();

export function readBricksFixture(name: string, ext: 'xml' | 'py'): string {
    return fs.readFileSync(path.join(BRICKS_FIXTURES, `${name}.${ext}`), 'utf8');
}

/** Сравнение «по смыслу»: без пустых строк и хвостовых пробелов; перенос перед запятой Bricks склеивается. */
export function normalizePython(code: string): string {
    return code
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*,/g, ',')
        .split('\n')
        .map((line) => line.replace(/\s+$/, ''))
        .filter((line) => line.length > 0)
        .join('\n');
}

export function compileBricksXml(xml: string): string {
    const workspace = new Blockly.Workspace();
    try {
        loadBricksProject(xml, workspace);
        return compileBricksWorkspace(workspace);
    } finally {
        workspace.dispose();
    }
}

export function compileBricksProject(name: string): string {
    return compileBricksXml(readBricksFixture(name, 'xml'));
}
