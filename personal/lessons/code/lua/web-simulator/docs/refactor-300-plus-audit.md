<!--
  Аудит крупных исходных файлов для поэтапной декомпозиции.
  Документ фиксирует исходный список файлов >300 строк в рабочей области проекта.
-->

# Аудит файлов длиннее 300 строк

## Область аудита

В аудит включены только собственные исходники проекта:

- `public/**`
- `tests/**`
- `tools/**`

Из аудита исключены:

- `dist/**`
- импортированные HTML/CSS/JS-артефакты документации
- lock-файлы и прочие сгенерированные файлы

## Список файлов >300 строк

### TypeScript / JavaScript

| Файл | Строк |
| --- | ---: |
| `public/modules/app/script-execution-notice.ts` | 761 |
| `public/modules/lua/index.ts` | 489 |
| `public/modules/lua/diagnostics.ts` | 411 |
| `public/modules/environment/ground.ts` | 359 |
| `tools/generate_functions_reference_index.mjs` | 339 |
| `public/modules/ui/scene-manager/type-preview.ts` | 313 |
| `tests/script-execution-notice.test.ts` | 306 |

### CSS

| Файл | Строк |
| --- | ---: |
| `public/styles/core/theme/dark-panels.css` | 769 |
| `public/styles/scene/manager-panel/light-forms.css` | 765 |
| `public/styles/responsive/index.css` | 569 |
| `public/styles/overlays/hud-and-settings.css` | 542 |
| `public/styles/core/theme/dark-settings.css` | 455 |
| `public/styles/core/theme/dark-foundation.css` | 363 |
| `public/styles/layout/header.css` | 312 |

## Логические блоки декомпозиции

### `public/modules/app/script-execution-notice.ts`

- Фабрика типизированных ошибок сценариев
- Humanize-логика для Lua/Python
- Эвристики валидации сценариев
- Состояние подавления повторных уведомлений
- Оркестрация UI-уведомлений

### `public/modules/lua/index.ts`

- Инициализация bridge-окружения Fengari
- Сборка Lua setup-скрипта и регистрация JS API
- Запуск/остановка Lua-скрипта
- Обновление таймеров и возобновление coroutine
- Вызов `callback(event)` и маршрутизация ошибок

### `public/modules/lua/diagnostics.ts`

- Инициализация и хранение Lua diagnostics state
- Запись runtime-логов и API-вызовов
- Сборка контекста и истории FSM
- Построение `ScriptFailureError` для runtime-падений
- Fengari bridge callbacks `js_diag_*`

### `public/modules/environment/ground.ts`

- Выбор темы и палитры
- Генерация canvas-текстур пола
- Генерация текстуры посадочной площадки
- Применение темы к материалам
- Сборка геометрии пола и визуальных маркеров
- Создание подписей осей

### `public/modules/ui/scene-manager/type-preview.ts`

- Fallback-рендер для недоступного WebGL
- Тема и базовая площадка превью
- Настройка света и renderer
- Подготовка объекта-превью из формы
- Подгонка камеры и размеров площадки
- Публичный контроллер show/hide/sync/destroy

### `tests/script-execution-notice.test.ts`

- Инициализация тестовой harness-среды
- Тесты эвристик валидации сценариев
- Тесты humanize-логики и рендеринга ошибок
- Тесты Lua diagnostics fallback-контекста

### `tools/generate_functions_reference_index.mjs`

- Сканирование исходников и документации
- Построение структуры reference-разделов
- Формирование markdown-отчёта
- Сериализация и запись итогового индекса

### Крупные CSS-файлы

- `dark-panels.css`: тёмная тема панелей по доменным зонам
- `light-forms.css`: формы scene manager и связанные light-variant блоки
- `responsive/index.css`: брейкпоинты по диапазонам ширины и зонам UI
- `hud-and-settings.css`: HUD, simulation notice, info modal, settings shell
- `dark-settings.css`: тёмные стили runtime/settings/wizard
- `dark-foundation.css`: базовые тёмные токены и foundation-слои
- `header.css`: бренд, контролы, action-группы, мобильная навигация

## Статус этапов

- Выполнено: декомпозиция `public/modules/app/script-execution-notice.ts`
- Выполнено: декомпозиция `tests/script-execution-notice.test.ts`
- Выполнено: декомпозиция `public/modules/environment/ground.ts`
- Выполнено: декомпозиция `public/modules/ui/scene-manager/type-preview.ts`
- Выполнено: декомпозиция `public/modules/lua/index.ts`
- Выполнено: декомпозиция `public/modules/lua/diagnostics.ts`
- Выполнено: декомпозиция `tools/generate_functions_reference_index.mjs`
- Выполнено: декомпозиция `public/styles/core/theme/dark-panels.css`
- Выполнено: декомпозиция `public/styles/scene/manager-panel/light-forms.css`
- Выполнено: декомпозиция `public/styles/responsive/index.css`
- В очереди: оставшиеся крупные CSS-агрегаторы

## План рекомендуемых коммитов

Так как `git` недоступен в текущей среде, ниже сохранён рекомендуемый порядок коммитов:

1. `refactor(app): split script execution notice helpers and validation`
2. `test(app): split script execution notice specs into focused suites`
3. `refactor(environment): extract ground textures theme and axes helpers`
4. `refactor(scene-manager): extract type preview fallback theme and camera helpers`
5. `refactor(lua): split bridge bootstrap runtime loop and diagnostics helpers`
6. `refactor(styles): split large dark and responsive CSS bundles by feature area`
7. `docs: add audit of source files over 300 lines`
