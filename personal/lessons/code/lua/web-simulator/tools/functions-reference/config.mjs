import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = path.resolve(__dirname, '..', '..');
export const OUTPUT_ROOT = path.join(ROOT, 'docs', 'functions-reference');
export const ROOT_INDEX = path.join(ROOT, 'FUNCTIONS_REFERENCE.md');

export const EXCLUDE_NAMES = new Set([
    '.git',
    'dist',
    'node_modules',
    'Python_files',
    'Описание методов API — документация Pioneer February update 2026_files'
]);

export const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.json', '.yaml', '.yml', '.html']);
export const CODE_EXTENSIONS = new Set(['.ts', '.js', '.mjs']);

export const GROUPS = [
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

export function toPosix(relativePath) {
    return relativePath.split(path.sep).join('/');
}

export function relativeToRoot(filePath) {
    return toPosix(path.relative(ROOT, filePath));
}

function isMatch(relativePath, candidate) {
    return candidate.endsWith('/') ? relativePath.startsWith(candidate) : relativePath === candidate;
}

export function classifyFile(relativePath) {
    for (const group of GROUPS) {
        const matched = group.matches.some((candidate) => isMatch(relativePath, candidate));
        const excluded = (group.exclude ?? []).some((candidate) => isMatch(relativePath, candidate));
        if (matched && !excluded) return group;
    }
    return GROUPS[GROUPS.length - 1];
}

export function slugFromPath(relativePath) {
    return relativePath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function summaryForFile(relativePath) {
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
