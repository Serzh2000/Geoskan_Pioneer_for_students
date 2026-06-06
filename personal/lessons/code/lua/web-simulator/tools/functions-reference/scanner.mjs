import fs from 'node:fs';
import path from 'node:path';

import {
    CODE_EXTENSIONS,
    EXCLUDE_NAMES,
    ROOT,
    SOURCE_EXTENSIONS,
    classifyFile,
    relativeToRoot,
    slugFromPath,
    summaryForFile
} from './config.mjs';

function walk(dirPath, files) {
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
        for (const name of fs.readdirSync(dirPath)) {
            if (EXCLUDE_NAMES.has(name)) continue;
            walk(path.join(dirPath, name), files);
        }
        return;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(dirPath))) return;
    files.push(dirPath);
}

export function extractFunctions(filePath) {
    if (!CODE_EXTENSIONS.has(path.extname(filePath))) return [];

    const sourceText = fs.readFileSync(filePath, 'utf8');
    const names = new Set();
    const classRegex = /class\s+([A-Za-z_$][\w$]*)[\s\S]*?\{([\s\S]*?)\n\}/g;
    const standaloneFunctionRegex = /\b(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    const variableFunctionRegex = /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g;
    const classMethodRegex = /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^;\n]*\)\s*\{/gm;

    for (const match of sourceText.matchAll(standaloneFunctionRegex)) {
        names.add(match[1]);
    }
    for (const match of sourceText.matchAll(variableFunctionRegex)) {
        names.add(match[1]);
    }
    for (const classMatch of sourceText.matchAll(classRegex)) {
        const className = classMatch[1];
        const classBody = classMatch[2];
        for (const methodMatch of classBody.matchAll(classMethodRegex)) {
            const methodName = methodMatch[1];
            if (methodName !== 'constructor') {
                names.add(`${className}.${methodName}`);
            }
        }
    }

    return [...names].sort((a, b) => a.localeCompare(b));
}

export function collectTrackedFiles() {
    const allFiles = [];
    walk(ROOT, allFiles);

    return allFiles
        .map((filePath) => relativeToRoot(filePath))
        .filter((relativePath) => !relativePath.startsWith('docs/functions-reference/'))
        .filter((relativePath) => relativePath !== 'FUNCTIONS_REFERENCE.md')
        .filter((relativePath) => !relativePath.startsWith('Описание методов API — документация Pioneer February update 2026_files/'))
        .sort((a, b) => a.localeCompare(b));
}

export function buildMetadataByFile(trackedFiles) {
    const metadataByFile = new Map();

    for (const relativePath of trackedFiles) {
        const group = classifyFile(relativePath);
        metadataByFile.set(relativePath, {
            relativePath,
            groupId: group.id,
            anchor: slugFromPath(relativePath),
            summary: summaryForFile(relativePath),
            functions: extractFunctions(path.join(ROOT, relativePath))
        });
    }

    return metadataByFile;
}
