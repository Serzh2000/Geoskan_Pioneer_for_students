import path from 'node:path';
import { GROUPS, OUTPUT_ROOT } from './functions-reference/config.mjs';
import { renderGroupFile, renderRootIndex, ensureDir } from './functions-reference/renderer.mjs';
import { buildMetadataByFile, collectTrackedFiles } from './functions-reference/scanner.mjs';

const trackedFiles = collectTrackedFiles();
const metadataByFile = buildMetadataByFile(trackedFiles);

ensureDir(OUTPUT_ROOT);

const groupFiles = new Map();

for (const group of GROUPS) {
    const files = [...metadataByFile.values()]
        .filter((meta) => meta.groupId === group.id)
        .map((meta) => meta.relativePath)
        .sort((a, b) => a.localeCompare(b));

    const outputPath = path.join(OUTPUT_ROOT, `${group.id}.md`);
    groupFiles.set(group.id, outputPath);
    renderGroupFile(group, files, metadataByFile);
}

renderRootIndex(groupFiles, metadataByFile);

console.log(`Справочник обновлен: ${trackedFiles.length} файлов, ${GROUPS.length} групп.`);
