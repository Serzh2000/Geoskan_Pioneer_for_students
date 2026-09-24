import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// docs/imported holds local copies of third-party documentation and is
// git-ignored on purpose, so it is absent in CI and on a fresh clone.
const importedDocsDir = path.resolve(__dirname, '../docs/imported');
const testWhenImportedDocsPresent = fs.existsSync(importedDocsDir) ? test : test.skip;

describe('Path Resolution Tests', () => {
    testWhenImportedDocsPresent('Imported examples directory should exist', () => {
        const stat = fs.statSync(importedDocsDir);
        expect(stat.isDirectory()).toBe(true);
    });

    test('Public modules directory should exist', () => {
        const modulesPath = path.resolve(__dirname, '../public/modules');
        expect(fs.existsSync(modulesPath)).toBe(true);
    });

    test('Important frontend assets should exist', () => {
        const assets = [
            '../public/index.html',
            '../public/main.ts',
            '../public/modules/core/state.ts'
        ];

        assets.forEach(asset => {
            const assetPath = path.resolve(__dirname, asset);
            if (!fs.existsSync(assetPath)) {
                console.error(`Asset missing: ${assetPath}`);
            }
            expect(fs.existsSync(assetPath)).toBe(true);
        });
    });
});
