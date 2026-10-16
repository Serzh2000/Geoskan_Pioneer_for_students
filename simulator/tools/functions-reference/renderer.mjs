import fs from 'node:fs';
import path from 'node:path';

import { GROUPS, OUTPUT_ROOT, ROOT, ROOT_INDEX, toPosix } from './config.mjs';

export function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function relativeLink(fromFile, toFile) {
    return toPosix(path.relative(path.dirname(fromFile), toFile));
}

export function renderGroupFile(group, files, metadataByFile) {
    const outputPath = path.join(OUTPUT_ROOT, `${group.id}.md`);
    const lines = [];

    lines.push(`# ${group.title}`);
    lines.push('');
    lines.push(group.description);
    lines.push('');
    lines.push('## Состав группы');
    lines.push('');

    for (const relativePath of files) {
        const meta = metadataByFile.get(relativePath);
        lines.push(`- [\`${relativePath}\`](#${meta.anchor})`);
    }

    lines.push('');
    lines.push('## Файлы');
    lines.push('');

    for (const relativePath of files) {
        const meta = metadataByFile.get(relativePath);
        const sourceHref = relativeLink(outputPath, path.join(ROOT, relativePath));
        lines.push(`<a id="${meta.anchor}"></a>`);
        lines.push(`### \`${relativePath}\``);
        lines.push('');
        lines.push(`- Исходник: [открыть файл](${sourceHref})`);
        lines.push(`- Кратко: ${meta.summary}`);
        lines.push(`- Обнаружено функций/методов: ${meta.functions.length}`);
        if (meta.functions.length > 0) {
            lines.push(`- Ключевые символы: ${meta.functions.map((name) => `\`${name}\``).join(', ')}`);
        }
        lines.push('');
    }

    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

export function renderRootIndex(groupFiles, metadataByFile) {
    const lines = [];

    lines.push('# Справочник проекта Web Simulator');
    lines.push('');
    lines.push('Этот файл является корневым оглавлением по исходникам проекта. Он не дублирует подробное описание каждого модуля, а ведет к тематическим файлам каталога, чтобы справочник было проще читать человеку и ИИ.');
    lines.push('');
    lines.push('## Как пользоваться');
    lines.push('');
    lines.push('- Сначала выберите логическую группу.');
    lines.push('- Затем перейдите по ссылке к нужному модулю внутри группового файла.');
    lines.push('- Из группового файла можно открыть соответствующий исходник проекта.');
    lines.push('- После добавления новых модулей выполните `npm run docs:functions`, чтобы пересобрать навигацию.');
    lines.push('');
    lines.push('## Группы навигации');
    lines.push('');

    for (const group of GROUPS) {
        const outputPath = groupFiles.get(group.id);
        const files = [...metadataByFile.values()]
            .filter((meta) => meta.groupId === group.id)
            .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

        lines.push(`### ${group.title}`);
        lines.push('');
        lines.push(group.description);
        lines.push('');
        lines.push(`- Файл группы: [\`${path.basename(outputPath)}\`](${relativeLink(ROOT_INDEX, outputPath)})`);
        lines.push('- Модули:');

        for (const meta of files) {
            const target = `${relativeLink(ROOT_INDEX, outputPath)}#${meta.anchor}`;
            lines.push(`- [\`${meta.relativePath}\`](${target})`);
        }

        lines.push('');
    }

    lines.push('## Структура каталога');
    lines.push('');
    lines.push('- `FUNCTIONS_REFERENCE.md` - корневое оглавление.');
    lines.push('- `docs/functions-reference/` - тематические каталоги по группам модулей.');
    lines.push('- `tools/generate_functions_reference_index.mjs` - генератор навигации.');
    lines.push('');

    fs.writeFileSync(ROOT_INDEX, `${lines.join('\n')}\n`, 'utf8');
}
