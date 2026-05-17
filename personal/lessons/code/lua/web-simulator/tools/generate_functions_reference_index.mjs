import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT, 'docs', 'functions-reference');
const ROOT_INDEX = path.join(ROOT, 'FUNCTIONS_REFERENCE.md');
const EXCLUDE_NAMES = new Set([
    '.git',
    'dist',
    'node_modules',
    'imported',
    'playwright',
    'scratch',
    'Python_files',
    'Описание методов API — документация Pioneer February update 2026_files'
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.json', '.yaml', '.yml', '.html']);
const CODE_EXTENSIONS = new Set(['.ts', '.js', '.mjs']);

const GROUPS = [
    {
        id: '01-initialization-and-configuration',
        title: 'Инициализация и конфигурация',
        description: 'Точка входа приложения, глобальное состояние, конфигурационные файлы и модули, которые запускают или связывают подсистемы между собой.',
        matches: [
            'package.json',
            'tsconfig.json',
            'tsconfig.server.json',
            'vite.config.ts',
            'eslint.config.mjs',
            'server.ts',
            'public/main.ts',
            'public/global.d.ts',
            'public/shims.d.ts',
            'public/modules/state.ts',
            'public/modules/environment.ts',
            'public/modules/editor.ts',
            'public/modules/ui/index.ts',
            'public/modules/camera.ts'
        ]
    },
    {
        id: '02-api-and-runtimes',
        title: 'API-запросы и рантаймы',
        description: 'Интеграции Lua/Python, публикация OpenAPI, клиентские и серверные точки взаимодействия с внешними сценариями и API.',
        matches: [
            'openapi.yaml',
            'public/tests.lua',
            'public/modules/api-docs.ts',
            'public/modules/lua/',
            'public/modules/python/',
            'public/modules/ui/api-docs-ui.ts'
        ]
    },
    {
        id: '03-physics-state-and-simulation',
        title: 'Физика, состояние и симуляция',
        description: 'Основной цикл симуляции, события столкновений, физические материалы, захват грузов, MCE-события и служебные тестовые сценарии.',
        matches: [
            'public/modules/physics.ts',
            'public/modules/physics/',
            'public/modules/mce-events.ts',
            'public/modules/tests.ts'
        ]
    },
    {
        id: '04-scene-environment-and-3d',
        title: 'Сцена, окружение и 3D-объекты',
        description: 'Three.js-сцена, окружение, препятствия, модель дрона, визуальные эффекты, выбор и трансформация объектов.',
        matches: [
            'public/modules/scene/',
            'public/modules/environment/',
            'public/modules/drone-model.ts',
            'public/modules/drone-model/',
            'public/modules/drone.ts',
            'public/modules/drone/'
        ]
    },
    {
        id: '05-ui-and-interaction',
        title: 'Интерфейс и взаимодействие',
        description: 'UI-компоненты симулятора, панели, HUD, контекстные меню, логгер, управление сценой и пользовательские рабочие потоки.',
        matches: [
            'public/modules/editor/',
            'public/modules/ui/'
        ],
        exclude: [
            'public/modules/ui/api-docs-ui.ts',
            'public/modules/ui/settings/'
        ]
    },
    {
        id: '06-gamepad-settings-and-calibration',
        title: 'Настройки пульта и калибровка',
        description: 'Подсистема настроек геймпада: карта каналов, автоопределение входов, калибровка, диапазоны AUX и визуализация живых данных.',
        matches: [
            'public/modules/ui/settings.ts',
            'public/modules/ui/settings/'
        ]
    },
    {
        id: '07-utilities-tests-and-tools',
        title: 'Утилиты, тесты и инструменты',
        description: 'Вспомогательные функции общего назначения, автоматические тесты и инженерные скрипты для генерации или обслуживания проекта.',
        matches: [
            'public/modules/utils.ts',
            'tests/',
            'tools/'
        ]
    }
];

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

function toPosix(relativePath) {
    return relativePath.split(path.sep).join('/');
}

function relativeToRoot(filePath) {
    return toPosix(path.relative(ROOT, filePath));
}

function isMatch(relativePath, candidate) {
    return candidate.endsWith('/') ? relativePath.startsWith(candidate) : relativePath === candidate;
}

function classifyFile(relativePath) {
    for (const group of GROUPS) {
        const matched = group.matches.some((candidate) => isMatch(relativePath, candidate));
        const excluded = (group.exclude ?? []).some((candidate) => isMatch(relativePath, candidate));
        if (matched && !excluded) return group;
    }
    return GROUPS[GROUPS.length - 1];
}

function slugFromPath(relativePath) {
    return relativePath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function summaryForFile(relativePath) {
    if (relativePath === 'server.ts') return 'HTTP entry point и настройка Express/Vite-сервера.';
    if (relativePath === 'openapi.yaml') return 'Контракт API и источник схемы для Swagger/OpenAPI.';
    if (relativePath.endsWith('package.json')) return 'Скрипты сборки, запуска и служебные зависимости проекта.';
    if (relativePath.startsWith('public/modules/lua/')) return 'Модуль Lua-моста и исполнения Lua-логики.';
    if (relativePath.startsWith('public/modules/python/')) return 'Модуль Python/Pyodide-интеграции.';
    if (relativePath.startsWith('public/modules/physics/')) return 'Низкоуровневая физика, столкновения и контактные расчеты.';
    if (relativePath === 'public/modules/physics.ts') return 'Верхнеуровневый цикл физического обновления дронов.';
    if (relativePath.startsWith('public/modules/environment/')) return 'Создание окружения, земли, света и препятствий.';
    if (relativePath.startsWith('public/modules/scene/')) return 'Логика 3D-сцены, выбора объектов и трансформаций.';
    if (relativePath.startsWith('public/modules/ui/settings/')) return 'Модуль карты каналов, калибровки и настроек геймпада.';
    if (relativePath.startsWith('public/modules/ui/')) return 'Пользовательский интерфейс и рабочие панели симулятора.';
    if (relativePath.startsWith('public/modules/drone-model/')) return 'Сборка визуальных компонентов модели дрона.';
    if (relativePath.startsWith('public/modules/drone/')) return 'Визуальное поведение дрона и спецэффекты.';
    if (relativePath.startsWith('tests/')) return 'Автоматические тесты и тестовые помощники.';
    if (relativePath.startsWith('tools/')) return 'Инженерный скрипт для генерации данных или обслуживания кода.';
    if (relativePath.startsWith('public/modules/')) return 'Исходный модуль симулятора.';
    if (relativePath.startsWith('public/')) return 'Клиентский файл приложения.';
    return 'Файл проекта.';
}

function extractFunctions(filePath) {
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

function ensureDir(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

function relativeLink(fromFile, toFile) {
    return toPosix(path.relative(path.dirname(fromFile), toFile));
}

function renderGroupFile(group, files, metadataByFile) {
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

function renderRootIndex(groupFiles, metadataByFile) {
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

const allFiles = [];
walk(ROOT, allFiles);

const trackedFiles = allFiles
    .map((filePath) => relativeToRoot(filePath))
    .filter((relativePath) => !relativePath.startsWith('docs/functions-reference/'))
    .filter((relativePath) => relativePath !== 'FUNCTIONS_REFERENCE.md')
    .filter((relativePath) => !relativePath.startsWith('Описание методов API — документация Pioneer February update 2026_files/'))
    .sort((a, b) => a.localeCompare(b));

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
