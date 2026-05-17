# Справочник проекта Web Simulator

Этот файл является корневым оглавлением по исходникам проекта. Он не дублирует подробное описание каждого модуля, а ведет к тематическим файлам каталога, чтобы справочник было проще читать человеку и ИИ.

## Как пользоваться

- Сначала выберите логическую группу.
- Затем перейдите по ссылке к нужному модулю внутри группового файла.
- Из группового файла можно открыть соответствующий исходник проекта.
- После добавления новых модулей выполните `npm run docs:functions`, чтобы пересобрать навигацию.

## Группы навигации

### Инициализация и конфигурация

Точка входа приложения, глобальное состояние, конфигурационные файлы и модули, которые запускают или связывают подсистемы между собой.

- Файл группы: [`01-initialization-and-configuration.md`](docs/functions-reference/01-initialization-and-configuration.md)
- Модули:
- [`eslint.config.mjs`](docs/functions-reference/01-initialization-and-configuration.md#eslint-config-mjs)
- [`package.json`](docs/functions-reference/01-initialization-and-configuration.md#package-json)
- [`public/global.d.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-global-d-ts)
- [`public/main.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-main-ts)
- [`public/modules/api-docs.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-api-docs-ts)
- [`public/modules/camera.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-camera-ts)
- [`public/modules/editor.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-editor-ts)
- [`public/modules/environment.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-environment-ts)
- [`public/modules/state.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-state-ts)
- [`public/modules/ui/index.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-ui-index-ts)
- [`public/modules/ui/settings.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-modules-ui-settings-ts)
- [`public/shims.d.ts`](docs/functions-reference/01-initialization-and-configuration.md#public-shims-d-ts)
- [`server.ts`](docs/functions-reference/01-initialization-and-configuration.md#server-ts)
- [`tsconfig.json`](docs/functions-reference/01-initialization-and-configuration.md#tsconfig-json)
- [`tsconfig.server.json`](docs/functions-reference/01-initialization-and-configuration.md#tsconfig-server-json)
- [`vite.config.ts`](docs/functions-reference/01-initialization-and-configuration.md#vite-config-ts)

### API-запросы и рантаймы

Интеграции Lua/Python, публикация OpenAPI, клиентские и серверные точки взаимодействия с внешними сценариями и API.

- Файл группы: [`02-api-and-runtimes.md`](docs/functions-reference/02-api-and-runtimes.md)
- Модули:
- [`openapi.yaml`](docs/functions-reference/02-api-and-runtimes.md#openapi-yaml)
- [`public/modules/lua/autopilot.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-autopilot-ts)
- [`public/modules/lua/hardware.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-hardware-ts)
- [`public/modules/lua/index.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-index-ts)
- [`public/modules/lua/leds.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-leds-ts)
- [`public/modules/lua/runner.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-runner-ts)
- [`public/modules/lua/sensors.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-sensors-ts)
- [`public/modules/lua/timers.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-lua-timers-ts)
- [`public/modules/python/index.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-python-index-ts)
- [`public/modules/python/runtime.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-python-runtime-ts)
- [`public/modules/ui/api-docs-ui.ts`](docs/functions-reference/02-api-and-runtimes.md#public-modules-ui-api-docs-ui-ts)

### Физика, состояние и симуляция

Основной цикл симуляции, события столкновений, физические материалы, захват грузов, MCE-события и служебные тестовые сценарии.

- Файл группы: [`03-physics-state-and-simulation.md`](docs/functions-reference/03-physics-state-and-simulation.md)
- Модули:
- [`public/modules/mce-events.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-mce-events-ts)
- [`public/modules/physics.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-ts)
- [`public/modules/physics/cargo-contact.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-cargo-contact-ts)
- [`public/modules/physics/collisions.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-collisions-ts)
- [`public/modules/physics/constants.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-constants-ts)
- [`public/modules/physics/events.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-events-ts)
- [`public/modules/physics/magnet-gripper.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-magnet-gripper-ts)
- [`public/modules/physics/materials.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-physics-materials-ts)
- [`public/modules/tests.ts`](docs/functions-reference/03-physics-state-and-simulation.md#public-modules-tests-ts)

### Сцена, окружение и 3D-объекты

Three.js-сцена, окружение, препятствия, модель дрона, визуальные эффекты, выбор и трансформация объектов.

- Файл группы: [`04-scene-environment-and-3d.md`](docs/functions-reference/04-scene-environment-and-3d.md)
- Модули:
- [`public/modules/drone-model.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-model-ts)
- [`public/modules/drone-model/camera-antenna.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-model-camera-antenna-ts)
- [`public/modules/drone-model/frame.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-model-frame-ts)
- [`public/modules/drone-model/leds.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-model-leds-ts)
- [`public/modules/drone-model/motors.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-model-motors-ts)
- [`public/modules/drone.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-ts)
- [`public/modules/drone/crash-visuals.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-crash-visuals-ts)
- [`public/modules/drone/scene-events.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-scene-events-ts)
- [`public/modules/drone/trails.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-drone-trails-ts)
- [`public/modules/environment/ground.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-ground-ts)
- [`public/modules/environment/lights.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-lights-ts)
- [`public/modules/environment/obstacles.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-ts)
- [`public/modules/environment/obstacles/arena.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-arena-ts)
- [`public/modules/environment/obstacles/buildings.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-buildings-ts)
- [`public/modules/environment/obstacles/competition.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-competition-ts)
- [`public/modules/environment/obstacles/linear.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-linear-ts)
- [`public/modules/environment/obstacles/marker-dictionaries.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-marker-dictionaries-ts)
- [`public/modules/environment/obstacles/markers.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-markers-ts)
- [`public/modules/environment/obstacles/nature.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-nature-ts)
- [`public/modules/environment/obstacles/pads.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-pads-ts)
- [`public/modules/environment/obstacles/presets.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-presets-ts)
- [`public/modules/environment/obstacles/types.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-types-ts)
- [`public/modules/environment/obstacles/utils.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-obstacles-utils-ts)
- [`public/modules/environment/truss-arena.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-environment-truss-arena-ts)
- [`public/modules/scene/DroneOrbitControls.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-droneorbitcontrols-ts)
- [`public/modules/scene/input.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-input-ts)
- [`public/modules/scene/object-catalog.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-object-catalog-ts)
- [`public/modules/scene/object-manager.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-object-manager-ts)
- [`public/modules/scene/object-transform.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-object-transform-ts)
- [`public/modules/scene/scene-init.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-scene-init-ts)
- [`public/modules/scene/selection.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-selection-ts)
- [`public/modules/scene/transform.ts`](docs/functions-reference/04-scene-environment-and-3d.md#public-modules-scene-transform-ts)

### Интерфейс и взаимодействие

UI-компоненты симулятора, панели, HUD, контекстные меню, логгер, управление сценой и пользовательские рабочие потоки.

- Файл группы: [`05-ui-and-interaction.md`](docs/functions-reference/05-ui-and-interaction.md)
- Модули:
- [`public/modules/ui/camera-mode.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-camera-mode-ts)
- [`public/modules/ui/context-menu.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-context-menu-ts)
- [`public/modules/ui/drone-manager.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-drone-manager-ts)
- [`public/modules/ui/file-controls.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-file-controls-ts)
- [`public/modules/ui/hud-controls.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-hud-controls-ts)
- [`public/modules/ui/led-matrix.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-led-matrix-ts)
- [`public/modules/ui/logger.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-logger-ts)
- [`public/modules/ui/scene-manager.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-scene-manager-ts)
- [`public/modules/ui/sidebar.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-sidebar-ts)
- [`public/modules/ui/simulation-notice.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-simulation-notice-ts)
- [`public/modules/ui/stats.ts`](docs/functions-reference/05-ui-and-interaction.md#public-modules-ui-stats-ts)

### Настройки пульта и калибровка

Подсистема настроек геймпада: карта каналов, автоопределение входов, калибровка, диапазоны AUX и визуализация живых данных.

- Файл группы: [`06-gamepad-settings-and-calibration.md`](docs/functions-reference/06-gamepad-settings-and-calibration.md)
- Модули:
- [`public/modules/ui/settings/auto-detect.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-auto-detect-ts)
- [`public/modules/ui/settings/bindings.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-bindings-ts)
- [`public/modules/ui/settings/calibration.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-calibration-ts)
- [`public/modules/ui/settings/channel-ranges.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-channel-ranges-ts)
- [`public/modules/ui/settings/constants.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-constants-ts)
- [`public/modules/ui/settings/dom.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-dom-ts)
- [`public/modules/ui/settings/mapping.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-mapping-ts)
- [`public/modules/ui/settings/observed-inputs.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-observed-inputs-ts)
- [`public/modules/ui/settings/rendering.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-rendering-ts)
- [`public/modules/ui/settings/runtime-state.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-runtime-state-ts)
- [`public/modules/ui/settings/types.ts`](docs/functions-reference/06-gamepad-settings-and-calibration.md#public-modules-ui-settings-types-ts)

### Утилиты, тесты и инструменты

Вспомогательные функции общего назначения, автоматические тесты и инженерные скрипты для генерации или обслуживания проекта.

- Файл группы: [`07-utilities-tests-and-tools.md`](docs/functions-reference/07-utilities-tests-and-tools.md)
- Модули:
- [`Описание методов API — документация Pioneer February update 2026.html`](docs/functions-reference/07-utilities-tests-and-tools.md#api-pioneer-february-update-2026-html)
- [`jest.config.js`](docs/functions-reference/07-utilities-tests-and-tools.md#jest-config-js)
- [`package-lock.json`](docs/functions-reference/07-utilities-tests-and-tools.md#package-lock-json)
- [`public/index.html`](docs/functions-reference/07-utilities-tests-and-tools.md#public-index-html)
- [`public/modules/editor/completion.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#public-modules-editor-completion-ts)
- [`public/modules/editor/hover.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#public-modules-editor-hover-ts)
- [`public/modules/editor/syntax.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#public-modules-editor-syntax-ts)
- [`public/modules/utils.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#public-modules-utils-ts)
- [`Python.html`](docs/functions-reference/07-utilities-tests-and-tools.md#python-html)
- [`tests/cargo-contact.test.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tests-cargo-contact-test-ts)
- [`tests/paths.test.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tests-paths-test-ts)
- [`tests/state.test.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tests-state-test-ts)
- [`tools/audit_and_refactor.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tools-audit-and-refactor-ts)
- [`tools/generate_functions_reference_index.mjs`](docs/functions-reference/07-utilities-tests-and-tools.md#tools-generate-functions-reference-index-mjs)
- [`tools/generate_marker_dictionaries.mjs`](docs/functions-reference/07-utilities-tests-and-tools.md#tools-generate-marker-dictionaries-mjs)
- [`tools/revert_lua.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tools-revert-lua-ts)
- [`tools/run_tests.ts`](docs/functions-reference/07-utilities-tests-and-tools.md#tools-run-tests-ts)

## Структура каталога

- `FUNCTIONS_REFERENCE.md` - корневое оглавление.
- `docs/functions-reference/` - тематические каталоги по группам модулей.
- `tools/generate_functions_reference_index.mjs` - генератор навигации.

