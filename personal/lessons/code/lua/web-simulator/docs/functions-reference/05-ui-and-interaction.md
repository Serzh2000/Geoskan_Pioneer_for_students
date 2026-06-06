# Интерфейс и взаимодействие

UI-компоненты симулятора, панели, HUD, контекстные меню, логгер, управление сценой и пользовательские рабочие потоки.

## Состав группы

- [`public/modules/editor/autofit.ts`](#public-modules-editor-autofit-ts)
- [`public/modules/editor/blockly-mode/catalog.ts`](#public-modules-editor-blockly-mode-catalog-ts)
- [`public/modules/editor/blockly-mode/index.ts`](#public-modules-editor-blockly-mode-index-ts)
- [`public/modules/editor/blockly-mode/types.ts`](#public-modules-editor-blockly-mode-types-ts)
- [`public/modules/editor/blockly-mode/ui.ts`](#public-modules-editor-blockly-mode-ui-ts)
- [`public/modules/editor/blockly-mode/workspace.ts`](#public-modules-editor-blockly-mode-workspace-ts)
- [`public/modules/editor/blockly.ts`](#public-modules-editor-blockly-ts)
- [`public/modules/editor/blockly/editor.ts`](#public-modules-editor-blockly-editor-ts)
- [`public/modules/editor/blockly/support.ts`](#public-modules-editor-blockly-support-ts)
- [`public/modules/editor/blockly/toggle-controller.ts`](#public-modules-editor-blockly-toggle-controller-ts)
- [`public/modules/editor/blockly/ui.ts`](#public-modules-editor-blockly-ui-ts)
- [`public/modules/editor/blockly/workspace-controller.ts`](#public-modules-editor-blockly-workspace-controller-ts)
- [`public/modules/editor/completion.ts`](#public-modules-editor-completion-ts)
- [`public/modules/editor/dom.ts`](#public-modules-editor-dom-ts)
- [`public/modules/editor/hover.ts`](#public-modules-editor-hover-ts)
- [`public/modules/editor/index.ts`](#public-modules-editor-index-ts)
- [`public/modules/editor/index/api.ts`](#public-modules-editor-index-api-ts)
- [`public/modules/editor/index/controllers.ts`](#public-modules-editor-index-controllers-ts)
- [`public/modules/editor/index/helpers.ts`](#public-modules-editor-index-helpers-ts)
- [`public/modules/editor/index/runtime.ts`](#public-modules-editor-index-runtime-ts)
- [`public/modules/editor/index/session.ts`](#public-modules-editor-index-session-ts)
- [`public/modules/editor/index/shell.ts`](#public-modules-editor-index-shell-ts)
- [`public/modules/editor/index/state.ts`](#public-modules-editor-index-state-ts)
- [`public/modules/editor/monaco/completion.ts`](#public-modules-editor-monaco-completion-ts)
- [`public/modules/editor/monaco/hover.ts`](#public-modules-editor-monaco-hover-ts)
- [`public/modules/editor/monaco/syntax.ts`](#public-modules-editor-monaco-syntax-ts)
- [`public/modules/editor/runtime.ts`](#public-modules-editor-runtime-ts)
- [`public/modules/editor/syntax.ts`](#public-modules-editor-syntax-ts)
- [`public/modules/editor/text-editor.ts`](#public-modules-editor-text-editor-ts)
- [`public/modules/ui/api-docs/index.ts`](#public-modules-ui-api-docs-index-ts)
- [`public/modules/ui/api-docs/preview/index.ts`](#public-modules-ui-api-docs-preview-index-ts)
- [`public/modules/ui/api-docs/preview/scenario-utils.ts`](#public-modules-ui-api-docs-preview-scenario-utils-ts)
- [`public/modules/ui/api-docs/preview/scenarios.ts`](#public-modules-ui-api-docs-preview-scenarios-ts)
- [`public/modules/ui/api-docs/preview/scene.ts`](#public-modules-ui-api-docs-preview-scene-ts)
- [`public/modules/ui/api-docs/preview/topdown-scenarios.ts`](#public-modules-ui-api-docs-preview-topdown-scenarios-ts)
- [`public/modules/ui/api-docs/preview/types.ts`](#public-modules-ui-api-docs-preview-types-ts)
- [`public/modules/ui/api-docs/sections.ts`](#public-modules-ui-api-docs-sections-ts)
- [`public/modules/ui/context-menu/dom.ts`](#public-modules-ui-context-menu-dom-ts)
- [`public/modules/ui/context-menu/index.ts`](#public-modules-ui-context-menu-index-ts)
- [`public/modules/ui/context-menu/menu-builder.ts`](#public-modules-ui-context-menu-menu-builder-ts)
- [`public/modules/ui/context-menu/styles.ts`](#public-modules-ui-context-menu-styles-ts)
- [`public/modules/ui/context-menu/toolbar-builder.ts`](#public-modules-ui-context-menu-toolbar-builder-ts)
- [`public/modules/ui/context-menu/types.ts`](#public-modules-ui-context-menu-types-ts)
- [`public/modules/ui/controls/camera-mode.ts`](#public-modules-ui-controls-camera-mode-ts)
- [`public/modules/ui/controls/file-controls.ts`](#public-modules-ui-controls-file-controls-ts)
- [`public/modules/ui/controls/hud-controls.ts`](#public-modules-ui-controls-hud-controls-ts)
- [`public/modules/ui/info/modal.ts`](#public-modules-ui-info-modal-ts)
- [`public/modules/ui/managers/drone-manager.ts`](#public-modules-ui-managers-drone-manager-ts)
- [`public/modules/ui/mission-guide/blockly-core/compiler.ts`](#public-modules-ui-mission-guide-blockly-core-compiler-ts)
- [`public/modules/ui/mission-guide/blockly-core/definitions.ts`](#public-modules-ui-mission-guide-blockly-core-definitions-ts)
- [`public/modules/ui/mission-guide/blockly-core/lua-definitions.ts`](#public-modules-ui-mission-guide-blockly-core-lua-definitions-ts)
- [`public/modules/ui/mission-guide/blockly-core/python-definitions.ts`](#public-modules-ui-mission-guide-blockly-core-python-definitions-ts)
- [`public/modules/ui/mission-guide/blockly-core/toolbox.ts`](#public-modules-ui-mission-guide-blockly-core-toolbox-ts)
- [`public/modules/ui/mission-guide/blockly-toolbox.ts`](#public-modules-ui-mission-guide-blockly-toolbox-ts)
- [`public/modules/ui/mission-guide/blockly.ts`](#public-modules-ui-mission-guide-blockly-ts)
- [`public/modules/ui/mission-guide/blockly/compiler.ts`](#public-modules-ui-mission-guide-blockly-compiler-ts)
- [`public/modules/ui/mission-guide/blockly/definitions.ts`](#public-modules-ui-mission-guide-blockly-definitions-ts)
- [`public/modules/ui/mission-guide/curriculum.ts`](#public-modules-ui-mission-guide-curriculum-ts)
- [`public/modules/ui/mission-guide/curriculum/constants.ts`](#public-modules-ui-mission-guide-curriculum-constants-ts)
- [`public/modules/ui/mission-guide/curriculum/lua.ts`](#public-modules-ui-mission-guide-curriculum-lua-ts)
- [`public/modules/ui/mission-guide/curriculum/python.ts`](#public-modules-ui-mission-guide-curriculum-python-ts)
- [`public/modules/ui/mission-guide/evaluation/callbacks.ts`](#public-modules-ui-mission-guide-evaluation-callbacks-ts)
- [`public/modules/ui/mission-guide/evaluation/diagnostics.ts`](#public-modules-ui-mission-guide-evaluation-diagnostics-ts)
- [`public/modules/ui/mission-guide/evaluation/index.ts`](#public-modules-ui-mission-guide-evaluation-index-ts)
- [`public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts`](#public-modules-ui-mission-guide-evaluation-lua-led-sequence-ts)
- [`public/modules/ui/mission-guide/evaluation/xml.ts`](#public-modules-ui-mission-guide-evaluation-xml-ts)
- [`public/modules/ui/mission-guide/interactions.ts`](#public-modules-ui-mission-guide-interactions-ts)
- [`public/modules/ui/mission-guide/interactions/actions.ts`](#public-modules-ui-mission-guide-interactions-actions-ts)
- [`public/modules/ui/mission-guide/interactions/context.ts`](#public-modules-ui-mission-guide-interactions-context-ts)
- [`public/modules/ui/mission-guide/interactions/launch.ts`](#public-modules-ui-mission-guide-interactions-launch-ts)
- [`public/modules/ui/mission-guide/interactions/navigation.ts`](#public-modules-ui-mission-guide-interactions-navigation-ts)
- [`public/modules/ui/mission-guide/interactions/workspace.ts`](#public-modules-ui-mission-guide-interactions-workspace-ts)
- [`public/modules/ui/mission-guide/lessons.ts`](#public-modules-ui-mission-guide-lessons-ts)
- [`public/modules/ui/mission-guide/lessons/catalog/lua.ts`](#public-modules-ui-mission-guide-lessons-catalog-lua-ts)
- [`public/modules/ui/mission-guide/lessons/catalog/python.ts`](#public-modules-ui-mission-guide-lessons-catalog-python-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/lua-flight.ts`](#public-modules-ui-mission-guide-lessons-expanded-lua-flight-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/lua-foundations.ts`](#public-modules-ui-mission-guide-lessons-expanded-lua-foundations-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/lua.ts`](#public-modules-ui-mission-guide-lessons-expanded-lua-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/python-flight.ts`](#public-modules-ui-mission-guide-lessons-expanded-python-flight-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/python-foundations.ts`](#public-modules-ui-mission-guide-lessons-expanded-python-foundations-ts)
- [`public/modules/ui/mission-guide/lessons/expanded/python.ts`](#public-modules-ui-mission-guide-lessons-expanded-python-ts)
- [`public/modules/ui/mission-guide/lessons/flight/lua-core.ts`](#public-modules-ui-mission-guide-lessons-flight-lua-core-ts)
- [`public/modules/ui/mission-guide/lessons/flight/lua-mission.ts`](#public-modules-ui-mission-guide-lessons-flight-lua-mission-ts)
- [`public/modules/ui/mission-guide/lessons/flight/lua.ts`](#public-modules-ui-mission-guide-lessons-flight-lua-ts)
- [`public/modules/ui/mission-guide/lessons/flight/python-core.ts`](#public-modules-ui-mission-guide-lessons-flight-python-core-ts)
- [`public/modules/ui/mission-guide/lessons/flight/python-mission.ts`](#public-modules-ui-mission-guide-lessons-flight-python-mission-ts)
- [`public/modules/ui/mission-guide/lessons/flight/python.ts`](#public-modules-ui-mission-guide-lessons-flight-python-ts)
- [`public/modules/ui/mission-guide/lessons/led/lua.ts`](#public-modules-ui-mission-guide-lessons-led-lua-ts)
- [`public/modules/ui/mission-guide/lessons/led/python.ts`](#public-modules-ui-mission-guide-lessons-led-python-ts)
- [`public/modules/ui/mission-guide/lessons/support/builders.ts`](#public-modules-ui-mission-guide-lessons-support-builders-ts)
- [`public/modules/ui/mission-guide/lessons/support/compilers.ts`](#public-modules-ui-mission-guide-lessons-support-compilers-ts)
- [`public/modules/ui/mission-guide/lessons/support/snippets.ts`](#public-modules-ui-mission-guide-lessons-support-snippets-ts)
- [`public/modules/ui/mission-guide/lessons/support/state-helpers.ts`](#public-modules-ui-mission-guide-lessons-support-state-helpers-ts)
- [`public/modules/ui/mission-guide/modal.ts`](#public-modules-ui-mission-guide-modal-ts)
- [`public/modules/ui/mission-guide/panel.ts`](#public-modules-ui-mission-guide-panel-ts)
- [`public/modules/ui/mission-guide/render.ts`](#public-modules-ui-mission-guide-render-ts)
- [`public/modules/ui/mission-guide/render/navigation.ts`](#public-modules-ui-mission-guide-render-navigation-ts)
- [`public/modules/ui/mission-guide/render/results.ts`](#public-modules-ui-mission-guide-render-results-ts)
- [`public/modules/ui/mission-guide/render/sections.ts`](#public-modules-ui-mission-guide-render-sections-ts)
- [`public/modules/ui/mission-guide/render/shared.ts`](#public-modules-ui-mission-guide-render-shared-ts)
- [`public/modules/ui/mission-guide/render/support.ts`](#public-modules-ui-mission-guide-render-support-ts)
- [`public/modules/ui/mission-guide/render/theory.ts`](#public-modules-ui-mission-guide-render-theory-ts)
- [`public/modules/ui/mission-guide/state.ts`](#public-modules-ui-mission-guide-state-ts)
- [`public/modules/ui/mission-guide/state/storage.ts`](#public-modules-ui-mission-guide-state-storage-ts)
- [`public/modules/ui/mission-guide/support/logging.ts`](#public-modules-ui-mission-guide-support-logging-ts)
- [`public/modules/ui/mission-guide/support/scene-preview.ts`](#public-modules-ui-mission-guide-support-scene-preview-ts)
- [`public/modules/ui/mission-guide/support/workspace-xml.ts`](#public-modules-ui-mission-guide-support-workspace-xml-ts)
- [`public/modules/ui/mission-guide/types.ts`](#public-modules-ui-mission-guide-types-ts)
- [`public/modules/ui/mobile-editor-viewport.ts`](#public-modules-ui-mobile-editor-viewport-ts)
- [`public/modules/ui/mobile-workspace-carousel.ts`](#public-modules-ui-mobile-workspace-carousel-ts)
- [`public/modules/ui/panels/channel-monitor.ts`](#public-modules-ui-panels-channel-monitor-ts)
- [`public/modules/ui/panels/led-matrix.ts`](#public-modules-ui-panels-led-matrix-ts)
- [`public/modules/ui/panels/sidebar-debug.ts`](#public-modules-ui-panels-sidebar-debug-ts)
- [`public/modules/ui/panels/sidebar.ts`](#public-modules-ui-panels-sidebar-ts)
- [`public/modules/ui/panels/simulation-notice.ts`](#public-modules-ui-panels-simulation-notice-ts)
- [`public/modules/ui/panels/stats.ts`](#public-modules-ui-panels-stats-ts)
- [`public/modules/ui/scene-manager/bindings.ts`](#public-modules-ui-scene-manager-bindings-ts)
- [`public/modules/ui/scene-manager/bindings/actions.ts`](#public-modules-ui-scene-manager-bindings-actions-ts)
- [`public/modules/ui/scene-manager/bindings/add-form.ts`](#public-modules-ui-scene-manager-bindings-add-form-ts)
- [`public/modules/ui/scene-manager/bindings/shared.ts`](#public-modules-ui-scene-manager-bindings-shared-ts)
- [`public/modules/ui/scene-manager/dom.ts`](#public-modules-ui-scene-manager-dom-ts)
- [`public/modules/ui/scene-manager/index.ts`](#public-modules-ui-scene-manager-index-ts)
- [`public/modules/ui/scene-manager/render.ts`](#public-modules-ui-scene-manager-render-ts)
- [`public/modules/ui/scene-manager/render/details.ts`](#public-modules-ui-scene-manager-render-details-ts)
- [`public/modules/ui/scene-manager/render/details/controls.ts`](#public-modules-ui-scene-manager-render-details-controls-ts)
- [`public/modules/ui/scene-manager/render/details/markup.ts`](#public-modules-ui-scene-manager-render-details-markup-ts)
- [`public/modules/ui/scene-manager/render/details/transform.ts`](#public-modules-ui-scene-manager-render-details-transform-ts)
- [`public/modules/ui/scene-manager/render/format.ts`](#public-modules-ui-scene-manager-render-format-ts)
- [`public/modules/ui/scene-manager/render/icons.ts`](#public-modules-ui-scene-manager-render-icons-ts)
- [`public/modules/ui/scene-manager/render/list.ts`](#public-modules-ui-scene-manager-render-list-ts)
- [`public/modules/ui/scene-manager/support.ts`](#public-modules-ui-scene-manager-support-ts)
- [`public/modules/ui/scene-manager/support/building.ts`](#public-modules-ui-scene-manager-support-building-ts)
- [`public/modules/ui/scene-manager/support/dom.ts`](#public-modules-ui-scene-manager-support-dom-ts)
- [`public/modules/ui/scene-manager/support/draft.ts`](#public-modules-ui-scene-manager-support-draft-ts)
- [`public/modules/ui/scene-manager/support/focus.ts`](#public-modules-ui-scene-manager-support-focus-ts)
- [`public/modules/ui/scene-manager/support/maps.ts`](#public-modules-ui-scene-manager-support-maps-ts)
- [`public/modules/ui/scene-manager/support/markers.ts`](#public-modules-ui-scene-manager-support-markers-ts)
- [`public/modules/ui/scene-manager/support/numbers.ts`](#public-modules-ui-scene-manager-support-numbers-ts)
- [`public/modules/ui/scene-manager/support/type-guards.ts`](#public-modules-ui-scene-manager-support-type-guards-ts)
- [`public/modules/ui/scene-manager/support/type-preview-config.ts`](#public-modules-ui-scene-manager-support-type-preview-config-ts)
- [`public/modules/ui/scene-manager/type-preview.ts`](#public-modules-ui-scene-manager-type-preview-ts)
- [`public/modules/ui/scene-manager/type-preview/camera.ts`](#public-modules-ui-scene-manager-type-preview-camera-ts)
- [`public/modules/ui/scene-manager/type-preview/fallback.ts`](#public-modules-ui-scene-manager-type-preview-fallback-ts)
- [`public/modules/ui/scene-manager/type-preview/theme.ts`](#public-modules-ui-scene-manager-type-preview-theme-ts)
- [`public/modules/ui/scene-manager/types.ts`](#public-modules-ui-scene-manager-types-ts)
- [`public/modules/ui/scene-manager/view-state.ts`](#public-modules-ui-scene-manager-view-state-ts)

## Файлы

<a id="public-modules-editor-autofit-ts"></a>
### `public/modules/editor/autofit.ts`

- Исходник: [открыть файл](../../public/modules/editor/autofit.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 17
- Ключевые символы: `applySidebarAutofitWidth`, `autoExpandEditorPanelToContent`, `boundingBox`, `clampSidebarWidth`, `expandEditorPanelForBlockly`, `getBlocklyBlocksWidth`, `getRequiredBlocklySidebarWidth`, `getRequiredLuaSidebarWidth`, `getSidebarChromeWidth`, `getSidebarCurrentWidth`, `getSidebarPanelsElement`, `isStarterLuaScript`, `maybeAutoExpandTextEditorPanel`, `measureTextWidth`, `normalizeMultilineText`, `restoreEditorPanelWidthAfterBlockly`, `scheduleEditorPanelAutofit`

<a id="public-modules-editor-blockly-mode-catalog-ts"></a>
### `public/modules/editor/blockly-mode/catalog.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/catalog.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `buildCatalog`, `getLuaCategory`, `getPythonCategory`, `groupCatalogByCategory`, `inferSyntax`, `parseCallParts`, `sanitizeKey`

<a id="public-modules-editor-blockly-mode-index-ts"></a>
### `public/modules/editor/blockly-mode/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `buildCallCode`, `buildMainEditorToolbox`, `compileMainEditorWorkspace`, `defineApiValueBlock`, `defineLuaEventConstantBlock`, `defineRawCodeBlock`, `defineStatementBlock`, `ensureEditorBlocklyDefinitions`, `getCatalog`, `renderStandardCategories`

<a id="public-modules-editor-blockly-mode-types-ts"></a>
### `public/modules/editor/blockly-mode/types.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-ui-ts"></a>
### `public/modules/editor/blockly-mode/ui.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/ui.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyEditorLayoutState`, `computeBlocklyViewportDimensions`, `computeExpandedSidebarWidth`, `resizeBlocklyCanvas`, `updateGeneratedCodePreview`

<a id="public-modules-editor-blockly-mode-workspace-ts"></a>
### `public/modules/editor/blockly-mode/workspace.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/workspace.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `compileGeneratorWorkspace`, `compileMainEditorWorkspace`, `createRawCodeWorkspaceXml`, `createStarterWorkspaceXml`, `escapeXml`, `getRawCodeBlockType`, `getWorkspaceTopBlocks`, `hasOnlySingleRawCodeBlock`

<a id="public-modules-editor-blockly-ts"></a>
### `public/modules/editor/blockly.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-editor-ts"></a>
### `public/modules/editor/blockly/editor.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/editor.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 17
- Ключевые символы: `ensureBlocklyResizeTracking`, `ensureBlocklyWorkspace`, `expandEditorPanelForBlockly`, `getBlocklyEditorValue`, `getEditorStateKey`, `initBlocklyEditorToggle`, `isBlocklyEditorEnabled`, `isBlocklyWorkspaceEmpty`, `loadBlocklyWorkspace`, `resizeBlocklyWorkspaceViewport`, `restoreEditorPanelWidthAfterBlockly`, `saveBlocklyWorkspaceState`, `setBlocklyEditorEnabled`, `setBlocklyEditorLanguage`, `setBlocklyEditorValue`, `syncBlocklyUiState`, `updateBlocklyPreview`

<a id="public-modules-editor-blockly-support-ts"></a>
### `public/modules/editor/blockly/support.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/support.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createBlocklyResizeRuntime`, `ensureBlocklyResizeTracking`, `isBlocklyWorkspaceEmpty`, `resizeBlocklyWorkspaceViewport`, `updateBlocklyPreview`

<a id="public-modules-editor-blockly-toggle-controller-ts"></a>
### `public/modules/editor/blockly/toggle-controller.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/toggle-controller.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initBlocklyEditorToggle`, `setBlocklyEditorEnabled`

<a id="public-modules-editor-blockly-ui-ts"></a>
### `public/modules/editor/blockly/ui.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/ui.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyEditorLayoutState`, `computeBlocklyViewportDimensions`, `computeExpandedSidebarWidth`, `resizeBlocklyCanvas`, `updateGeneratedCodePreview`

<a id="public-modules-editor-blockly-workspace-controller-ts"></a>
### `public/modules/editor/blockly/workspace-controller.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/workspace-controller.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureBlocklyWorkspace`, `getStarterBlocklyWorkspaceXml`, `loadBlocklyWorkspace`, `saveBlocklyWorkspaceState`

<a id="public-modules-editor-completion-ts"></a>
### `public/modules/editor/completion.ts`

- Исходник: [открыть файл](../../public/modules/editor/completion.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `dedupeSuggestions`, `ensureLanguageRegistered`, `parseApiMemberKey`, `setupCompletionProvider`

<a id="public-modules-editor-dom-ts"></a>
### `public/modules/editor/dom.ts`

- Исходник: [открыть файл](../../public/modules/editor/dom.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `computeExpandedSidebarWidth`, `createEditorShell`, `expandEditorPanelForBlockly`, `fallbackEditor`, `getEditorStateKey`, `getFallbackEditorElement`, `getFallbackEditorValue`, `getSidebarPanelsElement`, `hasFallbackEditor`, `restoreEditorPanelWidthAfterBlockly`, `setFallbackEditorValue`, `syncBlocklyCodeOverlayToggle`, `syncBlocklyEditorToggle`, `syncEditorModeVisibility`

<a id="public-modules-editor-hover-ts"></a>
### `public/modules/editor/hover.ts`

- Исходник: [открыть файл](../../public/modules/editor/hover.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `ensureLanguageRegistered`, `findLuaDoc`, `getFullWordAtPosition`, `getMarkdownContents`, `setupHoverProvider`

<a id="public-modules-editor-index-ts"></a>
### `public/modules/editor/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-index-api-ts"></a>
### `public/modules/editor/index/api.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/api.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `ensureBlocklyWorkspace`, `getEditorControllers`, `getEditorValue`, `getSavedEditorDraft`, `initBlocklyEditorToggle`, `initEditor`, `isBlocklyEditorEnabled`, `layoutEditor`, `loadBlocklyWorkspace`, `saveBlocklyWorkspaceState`, `setBlocklyEditorEnabled`, `setEditorLanguage`, `setEditorTheme`, `setEditorValue`

<a id="public-modules-editor-index-controllers-ts"></a>
### `public/modules/editor/index/controllers.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/controllers.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `createBlocklyToggleController`, `createBlocklyWorkspaceController`

<a id="public-modules-editor-index-helpers-ts"></a>
### `public/modules/editor/index/helpers.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/helpers.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createEditorAutofitContext`, `createEditorHost`, `getSavedEditorDraft`, `loadEditorIndexSession`, `persistEditorIndexSession`

<a id="public-modules-editor-index-runtime-ts"></a>
### `public/modules/editor/index/runtime.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `createEditorIndexControllers`

<a id="public-modules-editor-index-session-ts"></a>
### `public/modules/editor/index/session.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/session.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getSavedEditorDraft`, `loadPersistedEditorSession`, `persistEditorSession`

<a id="public-modules-editor-index-shell-ts"></a>
### `public/modules/editor/index/shell.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/shell.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `createEditor`, `createEditorShell`, `fallbackEditor`, `getEditorStateKey`, `getTextEditorValue`, `initializeEditorShellEnvironment`, `layoutEditor`, `persistCurrentEditorIndexSession`, `scheduleTextEditorAutofit`, `setEditorTextLanguage`, `setEditorTheme`, `setTextEditorValue`, `syncEditorModeVisibility`

<a id="public-modules-editor-index-state-ts"></a>
### `public/modules/editor/index/state.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `assignEditorIndexShell`, `getEditorIndexCollections`, `getEditorIndexShellState`, `setPendingEditorLanguage`, `setPendingEditorValue`

<a id="public-modules-editor-monaco-completion-ts"></a>
### `public/modules/editor/monaco/completion.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `dedupeSuggestions`, `ensureLanguageRegistered`, `parseApiMemberKey`, `setupCompletionProvider`

<a id="public-modules-editor-monaco-hover-ts"></a>
### `public/modules/editor/monaco/hover.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/hover.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `ensureLanguageRegistered`, `findLuaDoc`, `getFullWordAtPosition`, `getMarkdownContents`, `setupHoverProvider`

<a id="public-modules-editor-monaco-syntax-ts"></a>
### `public/modules/editor/monaco/syntax.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/syntax.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ensureLanguageRegistered`, `setupSyntaxHighlighting`

<a id="public-modules-editor-runtime-ts"></a>
### `public/modules/editor/runtime.ts`

- Исходник: [открыть файл](../../public/modules/editor/runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `assignEditorShell`

<a id="public-modules-editor-syntax-ts"></a>
### `public/modules/editor/syntax.ts`

- Исходник: [открыть файл](../../public/modules/editor/syntax.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ensureLanguageRegistered`, `setupSyntaxHighlighting`

<a id="public-modules-editor-text-editor-ts"></a>
### `public/modules/editor/text-editor.ts`

- Исходник: [открыть файл](../../public/modules/editor/text-editor.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 21
- Ключевые символы: `clearFallbackEditorProblemHighlight`, `clearTextEditorProblemHighlight`, `createTextEditor`, `createTextEditorInstance`, `getCurrentAppTheme`, `getFallbackEditorElement`, `getMonacoLanguage`, `getMonacoThemeName`, `getTextEditorValue`, `getTextEditorValueFromInstance`, `highlightFallbackEditorProblem`, `highlightTextEditorProblem`, `initializeMonacoEnvironment`, `layoutTextEditor`, `layoutTextEditorInstance`, `setTextEditorLanguage`, `setTextEditorLanguageOnInstance`, `setTextEditorTheme`, `setTextEditorValue`, `setTextEditorValueOnInstance`, `syncEditorProblemHandlers`

<a id="public-modules-ui-api-docs-index-ts"></a>
### `public/modules/ui/api-docs/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `attachInteractions`, `destroyPreviews`, `escapeHtml`, `highlightApiCode`, `mountOpenPreview`, `openApiDocsCatalog`, `renderApiDocs`, `renderEntry`, `renderPreviewShell`, `renderSections`, `renderToolbar`, `restoreSearchSelection`

<a id="public-modules-ui-api-docs-preview-index-ts"></a>
### `public/modules/ui/api-docs/preview/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ApiMethodPreview.for`, `ApiMethodPreview.if`

<a id="public-modules-ui-api-docs-preview-scenario-utils-ts"></a>
### `public/modules/ui/api-docs/preview/scenario-utils.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/scenario-utils.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildArcPoints`, `setFloorGlowOpacity`, `setMarkerScale`

<a id="public-modules-ui-api-docs-preview-scenarios-ts"></a>
### `public/modules/ui/api-docs/preview/scenarios.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/scenarios.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `renderArmScenario`, `renderDisarmScenario`, `renderFsmScenario`, `renderLandScenario`, `renderPreviewScenario`, `renderTakeoffScenario`

<a id="public-modules-ui-api-docs-preview-scene-ts"></a>
### `public/modules/ui/api-docs/preview/scene.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/scene.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createBeaconMarker`, `createLine`, `createPointMarker`, `createTargetMarker`, `disposeSceneResources`

<a id="public-modules-ui-api-docs-preview-topdown-scenarios-ts"></a>
### `public/modules/ui/api-docs/preview/topdown-scenarios.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/topdown-scenarios.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `renderGoToScenario`, `renderManualScenario`, `renderPointReachedScenario`, `renderYawScenario`

<a id="public-modules-ui-api-docs-preview-types-ts"></a>
### `public/modules/ui/api-docs/preview/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/preview/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-api-docs-sections-ts"></a>
### `public/modules/ui/api-docs/sections.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/sections.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `buildSearchText`, `buildSections`, `classifyEntry`, `getPreviewScenario`, `getScopeLabel`

<a id="public-modules-ui-context-menu-dom-ts"></a>
### `public/modules/ui/context-menu/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/dom.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `createContextMenuDom`

<a id="public-modules-ui-context-menu-index-ts"></a>
### `public/modules/ui/context-menu/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `hide`, `hideToolbar`, `initContextMenu`, `renderButtons`, `renderToolbar`, `setRotationStep`, `setToolbarMode`, `show`

<a id="public-modules-ui-context-menu-menu-builder-ts"></a>
### `public/modules/ui/context-menu/menu-builder.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/menu-builder.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `addButton`, `addInfoCard`, `addSectionLabel`, `addSeparator`, `renderContextMenuContents`, `run`

<a id="public-modules-ui-context-menu-styles-ts"></a>
### `public/modules/ui/context-menu/styles.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/styles.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-context-menu-toolbar-builder-ts"></a>
### `public/modules/ui/context-menu/toolbar-builder.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/toolbar-builder.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `addToolbarButton`, `renderContextToolbar`

<a id="public-modules-ui-context-menu-types-ts"></a>
### `public/modules/ui/context-menu/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-controls-camera-mode-ts"></a>
### `public/modules/ui/controls/camera-mode.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/camera-mode.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initCameraModeUI`

<a id="public-modules-ui-controls-file-controls-ts"></a>
### `public/modules/ui/controls/file-controls.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/file-controls.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initFileControls`

<a id="public-modules-ui-controls-hud-controls-ts"></a>
### `public/modules/ui/controls/hud-controls.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/hud-controls.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyHudVisibility`, `initHudControls`, `initHudToggle`

<a id="public-modules-ui-info-modal-ts"></a>
### `public/modules/ui/info/modal.ts`

- Исходник: [открыть файл](../../public/modules/ui/info/modal.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `hide`, `initInfoModal`, `show`, `syncButtonState`

<a id="public-modules-ui-managers-drone-manager-ts"></a>
### `public/modules/ui/managers/drone-manager.ts`

- Исходник: [открыть файл](../../public/modules/ui/managers/drone-manager.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `getActiveDroneId`, `initDroneManager`, `switchDrone`, `updateActionsState`, `updateList`

<a id="public-modules-ui-mission-guide-blockly-core-compiler-ts"></a>
### `public/modules/ui/mission-guide/blockly-core/compiler.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-core/compiler.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `appendSeparated`, `callback`, `collectLuaCallbackBody`, `collectWorkspaceSequence`, `compileLuaBlock`, `compileLuaChain`, `compileLuaWorkspace`, `compileMissionGuideWorkspace`, `compilePythonBlock`, `compilePythonWorkspace`, `extractMissionGuideSequence`, `indentLines`, `quoteString`, `trimBlankLines`

<a id="public-modules-ui-mission-guide-blockly-core-definitions-ts"></a>
### `public/modules/ui/mission-guide/blockly-core/definitions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-core/definitions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getBlocklyGenerator`, `initBlocklyDefinitions`

<a id="public-modules-ui-mission-guide-blockly-core-lua-definitions-ts"></a>
### `public/modules/ui/mission-guide/blockly-core/lua-definitions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-core/lua-definitions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `registerLuaBlocklyDefinitions`

<a id="public-modules-ui-mission-guide-blockly-core-python-definitions-ts"></a>
### `public/modules/ui/mission-guide/blockly-core/python-definitions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-core/python-definitions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerPythonBlocklyDefinitions`

<a id="public-modules-ui-mission-guide-blockly-core-toolbox-ts"></a>
### `public/modules/ui/mission-guide/blockly-core/toolbox.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-core/toolbox.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildGuideToolbox`, `getLuaCategories`, `getPythonCategories`

<a id="public-modules-ui-mission-guide-blockly-toolbox-ts"></a>
### `public/modules/ui/mission-guide/blockly-toolbox.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly-toolbox.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildGuideToolbox`, `getLuaCategories`, `getPythonCategories`

<a id="public-modules-ui-mission-guide-blockly-ts"></a>
### `public/modules/ui/mission-guide/blockly.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-blockly-compiler-ts"></a>
### `public/modules/ui/mission-guide/blockly/compiler.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly/compiler.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `appendSeparated`, `callback`, `collectLuaCallbackBody`, `collectWorkspaceSequence`, `compileLuaBlock`, `compileLuaChain`, `compileLuaWorkspace`, `compileMissionGuideWorkspace`, `compilePythonBlock`, `compilePythonWorkspace`, `extractMissionGuideSequence`, `indentLines`, `quoteString`, `trimBlankLines`

<a id="public-modules-ui-mission-guide-blockly-definitions-ts"></a>
### `public/modules/ui/mission-guide/blockly/definitions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/blockly/definitions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-curriculum-ts"></a>
### `public/modules/ui/mission-guide/curriculum.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/curriculum.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getGuideChapters`

<a id="public-modules-ui-mission-guide-curriculum-constants-ts"></a>
### `public/modules/ui/mission-guide/curriculum/constants.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/curriculum/constants.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-curriculum-lua-ts"></a>
### `public/modules/ui/mission-guide/curriculum/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/curriculum/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildLuaChapters`

<a id="public-modules-ui-mission-guide-curriculum-python-ts"></a>
### `public/modules/ui/mission-guide/curriculum/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/curriculum/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildPythonChapters`

<a id="public-modules-ui-mission-guide-evaluation-callbacks-ts"></a>
### `public/modules/ui/mission-guide/evaluation/callbacks.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/callbacks.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getCallbackDiagnostics`

<a id="public-modules-ui-mission-guide-evaluation-diagnostics-ts"></a>
### `public/modules/ui/mission-guide/evaluation/diagnostics.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/diagnostics.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `getExtraBlockDiagnostics`, `getMissingBlockDiagnostics`, `solvedDiagnostic`, `uniqueDiagnostics`

<a id="public-modules-ui-mission-guide-evaluation-index-ts"></a>
### `public/modules/ui/mission-guide/evaluation/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `callback`, `evaluateLesson`, `getCallbackDiagnostics`, `getLessonCode`, `solvedDiagnostic`, `uniqueDiagnostics`

<a id="public-modules-ui-mission-guide-evaluation-lua-led-sequence-ts"></a>
### `public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `getStructureDiagnostics`, `matchesLedSet`, `matchesLuaLedSequenceWorkspace`, `matchesTimerDelay`, `validateLuaLedSequenceWorkspace`

<a id="public-modules-ui-mission-guide-evaluation-xml-ts"></a>
### `public/modules/ui/mission-guide/evaluation/xml.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/xml.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `findFirstBlockByType`, `getDirectBlockChild`, `getDirectChildByTagName`, `getFieldValue`, `getNextBlock`, `getStatementBlock`, `hasBlockType`, `hasFieldValue`, `hasNumericFieldValue`, `parseWorkspaceXml`

<a id="public-modules-ui-mission-guide-interactions-ts"></a>
### `public/modules/ui/mission-guide/interactions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachGuideInteractions`

<a id="public-modules-ui-mission-guide-interactions-actions-ts"></a>
### `public/modules/ui/mission-guide/interactions/actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/actions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachGuideActionBindings`

<a id="public-modules-ui-mission-guide-interactions-context-ts"></a>
### `public/modules/ui/mission-guide/interactions/context.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/context.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `buildGuideEventContext`, `resetGuideRuntimeView`

<a id="public-modules-ui-mission-guide-interactions-launch-ts"></a>
### `public/modules/ui/mission-guide/interactions/launch.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/launch.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `canLaunchLesson`, `launchLesson`, `renderUncheckedDiagnostics`, `renderUncheckedSummary`, `updateGeneratedCodePreview`

<a id="public-modules-ui-mission-guide-interactions-navigation-ts"></a>
### `public/modules/ui/mission-guide/interactions/navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachGuideNavigationBindings`

<a id="public-modules-ui-mission-guide-interactions-workspace-ts"></a>
### `public/modules/ui/mission-guide/interactions/workspace.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/workspace.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `attachGuideWorkspace`, `attachWorkspaceChangeListener`, `clearGuideWorkspace`, `disposeWorkspace`, `ensureGuideBlocklyThemeListener`, `fillGuideWorkspace`, `getBlocklyAppTheme`, `getGuideBlocklyGridColour`, `getGuideBlocklyTheme`, `getGuideWorkspace`, `hasSequenceChanged`, `initializeWorkspace`, `restoreWorkspaceState`, `shouldHandleWorkspaceMutation`, `syncGuideWorkspaceTheme`

<a id="public-modules-ui-mission-guide-lessons-ts"></a>
### `public/modules/ui/mission-guide/lessons.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getGuideLessonState`

<a id="public-modules-ui-mission-guide-lessons-catalog-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/catalog/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/catalog/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLuaLessonState`

<a id="public-modules-ui-mission-guide-lessons-catalog-python-ts"></a>
### `public/modules/ui/mission-guide/lessons/catalog/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/catalog/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonLessonState`

<a id="public-modules-ui-mission-guide-lessons-expanded-lua-flight-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/lua-flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/lua-flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaExpandedFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-expanded-lua-foundations-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/lua-foundations.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/lua-foundations.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaExpandedFoundationLessons`

<a id="public-modules-ui-mission-guide-lessons-expanded-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLuaExpandedLessons`

<a id="public-modules-ui-mission-guide-lessons-expanded-python-flight-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/python-flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/python-flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonExpandedFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-expanded-python-foundations-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/python-foundations.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/python-foundations.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonExpandedFoundationLessons`

<a id="public-modules-ui-mission-guide-lessons-expanded-python-ts"></a>
### `public/modules/ui/mission-guide/lessons/expanded/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/expanded/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonExpandedLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-lua-core-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/lua-core.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/lua-core.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaCoreFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-lua-mission-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/lua-mission.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/lua-mission.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaMissionLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLuaFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-python-core-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/python-core.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/python-core.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonCoreFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-python-mission-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/python-mission.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/python-mission.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonMissionLessons`

<a id="public-modules-ui-mission-guide-lessons-flight-python-ts"></a>
### `public/modules/ui/mission-guide/lessons/flight/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/flight/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonFlightLessons`

<a id="public-modules-ui-mission-guide-lessons-led-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/led/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/led/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaLedLessons`

<a id="public-modules-ui-mission-guide-lessons-led-python-ts"></a>
### `public/modules/ui/mission-guide/lessons/led/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/led/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonLedLessons`

<a id="public-modules-ui-mission-guide-lessons-support-builders-ts"></a>
### `public/modules/ui/mission-guide/lessons/support/builders.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/support/builders.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `createEventBlock`, `createStatementBlock`, `createTimerBlock`

<a id="public-modules-ui-mission-guide-lessons-support-compilers-ts"></a>
### `public/modules/ui/mission-guide/lessons/support/compilers.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/support/compilers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `callback`, `compileLuaEvents`, `compileLuaLinear`, `compileLuaTimed`, `compilePython`, `finalizeLuaCode`, `indentLines`, `splitCodeLines`

<a id="public-modules-ui-mission-guide-lessons-support-snippets-ts"></a>
### `public/modules/ui/mission-guide/lessons/support/snippets.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/support/snippets.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

<a id="public-modules-ui-mission-guide-lessons-support-state-helpers-ts"></a>
### `public/modules/ui/mission-guide/lessons/support/state-helpers.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/support/state-helpers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `apiFocus`

<a id="public-modules-ui-mission-guide-modal-ts"></a>
### `public/modules/ui/mission-guide/modal.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/modal.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `hide`, `initMissionGuideModal`, `show`, `syncGuideButtonState`

<a id="public-modules-ui-mission-guide-panel-ts"></a>
### `public/modules/ui/mission-guide/panel.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/panel.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderMissionGuidePanel`

<a id="public-modules-ui-mission-guide-render-ts"></a>
### `public/modules/ui/mission-guide/render.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderGuide`

<a id="public-modules-ui-mission-guide-render-navigation-ts"></a>
### `public/modules/ui/mission-guide/render/navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `renderGuideSelectors`, `renderGuideTopTabs`, `renderPageTabs`, `renderRunBanner`

<a id="public-modules-ui-mission-guide-render-results-ts"></a>
### `public/modules/ui/mission-guide/render/results.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/results.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `renderCheckSummary`, `renderResultHero`

<a id="public-modules-ui-mission-guide-render-sections-ts"></a>
### `public/modules/ui/mission-guide/render/sections.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/sections.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `renderLessonOverview`, `renderLessonTheory`, `renderPortalIntro`

<a id="public-modules-ui-mission-guide-render-shared-ts"></a>
### `public/modules/ui/mission-guide/render/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `escapeHtml`, `getBlockMap`, `renderApiFocusItem`, `renderDiagnosticCard`, `renderDocLink`, `renderTargetRoute`

<a id="public-modules-ui-mission-guide-render-support-ts"></a>
### `public/modules/ui/mission-guide/render/support.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/support.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-render-theory-ts"></a>
### `public/modules/ui/mission-guide/render/theory.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/theory.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `renderTheoryView`, `renderTrainerIntro`

<a id="public-modules-ui-mission-guide-state-ts"></a>
### `public/modules/ui/mission-guide/state.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/state.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 37
- Ключевые символы: `clearLessonSequence`, `ensureActiveChapterId`, `ensureActiveLessonId`, `getActiveChapter`, `getActiveGuideTheme`, `getActiveLesson`, `getActivePortalPage`, `getActiveTab`, `getCompletedLessonsCount`, `getFirstUnlockedLesson`, `getLessonBanner`, `getLessonIndex`, `getLessonProgressState`, `getLessonSequence`, `getLessonsForChapter`, `getLessonWorkspaceState`, `getNextLesson`, `getPreviousLesson`, `getStateKey`, `isLessonChecked`, `isLessonCompleted`, `isLessonGeneratedCodeVisible`, `isLessonSolutionVisible`, `isLessonUnlocked`, `persistCurrentGuideSessionState`, `setActiveChapterId`, `setActiveGuideTheme`, `setActiveLessonId`, `setActivePortalPage`, `setActiveTab`, `setLessonBanner`, `setLessonChecked`, `setLessonCompleted`, `setLessonGeneratedCodeVisible`, `setLessonSequence`, `setLessonSolutionVisible`, `setLessonWorkspaceState`

<a id="public-modules-ui-mission-guide-state-storage-ts"></a>
### `public/modules/ui/mission-guide/state/storage.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/state/storage.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createDefaultSessionState`, `loadGuideProgress`, `loadGuideSessionState`, `persistGuideProgress`, `persistGuideSessionState`

<a id="public-modules-ui-mission-guide-support-logging-ts"></a>
### `public/modules/ui/mission-guide/support/logging.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/logging.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `formatCompactDetails`, `logGuideEvent`, `normalizeDetailValue`, `summarizeGuideDiagnostics`

<a id="public-modules-ui-mission-guide-support-scene-preview-ts"></a>
### `public/modules/ui/mission-guide/support/scene-preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/scene-preview.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `debugPreviewZoom`, `forwardPointerToControls`, `getPreviewHost`, `getRendererHitState`, `getSceneContainer`, `installPreviewGestureGuards`, `isMissionGuideScenePreviewActive`, `mountMissionGuideScenePreview`, `preventGestureDefault`, `preventWheelDefault`, `resizeSceneSoon`, `restoreMissionGuideScenePreview`, `setMissionGuideScenePreviewActive`

<a id="public-modules-ui-mission-guide-support-workspace-xml-ts"></a>
### `public/modules/ui/mission-guide/support/workspace-xml.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/workspace-xml.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildTargetWorkspaceXml`

<a id="public-modules-ui-mission-guide-types-ts"></a>
### `public/modules/ui/mission-guide/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mobile-editor-viewport-ts"></a>
### `public/modules/ui/mobile-editor-viewport.ts`

- Исходник: [открыть файл](../../public/modules/ui/mobile-editor-viewport.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `applyFocusedLayout`, `clearFocusedLayout`, `getEditorContent`, `getEditorPanel`, `handleFocusIn`, `handleFocusOut`, `handleViewportChange`, `initMobileEditorViewport`, `isEditorElement`, `isEditorFocused`, `updateViewportVariables`

<a id="public-modules-ui-mobile-workspace-carousel-ts"></a>
### `public/modules/ui/mobile-workspace-carousel.ts`

- Исходник: [открыть файл](../../public/modules/ui/mobile-workspace-carousel.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyPageState`, `goToPage`, `initMobileWorkspaceCarousel`, `isMobileWorkspacePage`, `syncMode`

<a id="public-modules-ui-panels-channel-monitor-ts"></a>
### `public/modules/ui/panels/channel-monitor.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/channel-monitor.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `buildChannelCell`, `escapeHtml`, `initChannelMonitor`, `pickGamepad`, `readChannelSample`, `renderBoardStatus`, `renderChannelCell`, `resetPeaks`, `syncFreezeButton`, `toTrackPercent`, `updateStatusPill`

<a id="public-modules-ui-panels-led-matrix-ts"></a>
### `public/modules/ui/panels/led-matrix.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/led-matrix.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initLEDMatrixUI`

<a id="public-modules-ui-panels-sidebar-debug-ts"></a>
### `public/modules/ui/panels/sidebar-debug.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/sidebar-debug.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `captureAncestorChain`, `captureCenterHitStack`, `captureChildPreview`, `captureContainmentSnapshot`, `captureElementSnapshot`, `createSidebarDiagnosticsLogger`, `describeElementBriefly`, `pushHiddenWarnings`

<a id="public-modules-ui-panels-sidebar-ts"></a>
### `public/modules/ui/panels/sidebar.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/sidebar.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `closePanelWithAnimation`, `finishClosePanel`, `initSidebar`, `isMobileSidebar`, `persistActivePanel`, `refreshViewportLayout`, `resetClosingState`, `restoreSidebarState`, `setActiveTabButton`, `syncResponsiveSidebarState`, `syncSidebarCollapsedState`, `syncSidebarMode`

<a id="public-modules-ui-panels-simulation-notice-ts"></a>
### `public/modules/ui/panels/simulation-notice.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/simulation-notice.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `hideNotice`, `initSimulationNotice`

<a id="public-modules-ui-panels-stats-ts"></a>
### `public/modules/ui/panels/stats.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/stats.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `updateStats`

<a id="public-modules-ui-scene-manager-bindings-ts"></a>
### `public/modules/ui/scene-manager/bindings.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `registerSceneManagerBindings`, `registerTabBindings`

<a id="public-modules-ui-scene-manager-bindings-actions-ts"></a>
### `public/modules/ui/scene-manager/bindings/actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings/actions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `bindTransformMode`, `registerCreationBindings`, `registerGlobalActionBindings`, `registerIncidentBindings`, `registerSelectionBindings`, `registerTransformBindings`

<a id="public-modules-ui-scene-manager-bindings-add-form-ts"></a>
### `public/modules/ui/scene-manager/bindings/add-form.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings/add-form.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 17
- Ключевые символы: `applyPendingSelection`, `changePage`, `clampPageIndex`, `closeModal`, `focusModalCard`, `getOptions`, `getPageCount`, `getPendingOption`, `isModalOpen`, `openModal`, `registerAddFormBindings`, `renderModalPage`, `showCardPreview`, `syncModalSelectionSummary`, `syncPageIndicator`, `syncPageWithSelection`, `syncPreview`

<a id="public-modules-ui-scene-manager-bindings-shared-ts"></a>
### `public/modules/ui/scene-manager/bindings/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings/shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-scene-manager-dom-ts"></a>
### `public/modules/ui/scene-manager/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/dom.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getSceneManagerDomRefs`

<a id="public-modules-ui-scene-manager-index-ts"></a>
### `public/modules/ui/scene-manager/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initSceneManager`, `render`

<a id="public-modules-ui-scene-manager-render-ts"></a>
### `public/modules/ui/scene-manager/render.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderSceneManager`

<a id="public-modules-ui-scene-manager-render-details-ts"></a>
### `public/modules/ui/scene-manager/render/details.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/details.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `renderEmptyState`, `renderSelectedDetails`

<a id="public-modules-ui-scene-manager-render-details-controls-ts"></a>
### `public/modules/ui/scene-manager/render/details/controls.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/details/controls.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `resetSelectedControls`, `setBuildingEditorDisabled`, `setFieldVisibility`, `syncSelectedInputs`, `updateSelectedControls`

<a id="public-modules-ui-scene-manager-render-details-markup-ts"></a>
### `public/modules/ui/scene-manager/render/details/markup.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/details/markup.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `formatCompassDegrees`, `getCompassDirectionLabel`, `normalizeDegrees`, `renderEmptyStateMarkup`, `renderSelectedDetailsMarkup`

<a id="public-modules-ui-scene-manager-render-details-transform-ts"></a>
### `public/modules/ui/scene-manager/render/details/transform.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/details/transform.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getTransformValues`, `setTransformFields`

<a id="public-modules-ui-scene-manager-render-format-ts"></a>
### `public/modules/ui/scene-manager/render/format.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/format.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `escapeHtml`, `formatSceneLabel`

<a id="public-modules-ui-scene-manager-render-icons-ts"></a>
### `public/modules/ui/scene-manager/render/icons.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/icons.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getSceneObjectIcon`, `hasSceneToken`

<a id="public-modules-ui-scene-manager-render-list-ts"></a>
### `public/modules/ui/scene-manager/render/list.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/list.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderObjectList`

<a id="public-modules-ui-scene-manager-support-ts"></a>
### `public/modules/ui/scene-manager/support.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-scene-manager-support-building-ts"></a>
### `public/modules/ui/scene-manager/support/building.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/building.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `appendIncidentEntry`, `clearIncidentEntries`, `getIncidentKey`, `normalizeIncidentEntries`, `serializeIncidentEntries`, `setBuildingControlsVisible`, `syncFloorLimit`, `syncIncidentValue`

<a id="public-modules-ui-scene-manager-support-dom-ts"></a>
### `public/modules/ui/scene-manager/support/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/dom.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-scene-manager-support-draft-ts"></a>
### `public/modules/ui/scene-manager/support/draft.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/draft.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `readAddSceneObjectDraft`

<a id="public-modules-ui-scene-manager-support-focus-ts"></a>
### `public/modules/ui/scene-manager/support/focus.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/focus.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `isSceneEditorFocused`

<a id="public-modules-ui-scene-manager-support-maps-ts"></a>
### `public/modules/ui/scene-manager/support/maps.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/maps.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `getMapInputs`, `readAddMarkerMapOptions`, `setFieldVisibility`, `updateAddControlsState`, `updateMapSummary`

<a id="public-modules-ui-scene-manager-support-markers-ts"></a>
### `public/modules/ui/scene-manager/support/markers.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/markers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `fillDictionarySelect`, `getMarkerMode`

<a id="public-modules-ui-scene-manager-support-numbers-ts"></a>
### `public/modules/ui/scene-manager/support/numbers.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/numbers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `clampFloors`, `clampInt`, `clampNumber`, `clampWindowFloor`, `formatSceneAngleRadians`, `formatSceneNumber`

<a id="public-modules-ui-scene-manager-support-type-guards-ts"></a>
### `public/modules/ui/scene-manager/support/type-guards.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/type-guards.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `isBuildingType`, `isMarkerMapType`, `isSingleMarkerType`, `isValueInputType`

<a id="public-modules-ui-scene-manager-support-type-preview-config-ts"></a>
### `public/modules/ui/scene-manager/support/type-preview-config.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/support/type-preview-config.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getSceneTypePreviewConfig`, `updateAddTypePreview`

<a id="public-modules-ui-scene-manager-type-preview-ts"></a>
### `public/modules/ui/scene-manager/type-preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/type-preview.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `applyPreviewTheme`, `clearPreviewObject`, `createNoopPreviewController`, `getPreviewObjectOptions`, `handleThemeChange`, `hide`, `initSceneTypePreview`, `rebuildGround`, `render`, `show`, `sync`, `updatePreviewMeta`

<a id="public-modules-ui-scene-manager-type-preview-camera-ts"></a>
### `public/modules/ui/scene-manager/type-preview/camera.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/type-preview/camera.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `fitPreviewCameraToObject`

<a id="public-modules-ui-scene-manager-type-preview-fallback-ts"></a>
### `public/modules/ui/scene-manager/type-preview/fallback.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/type-preview/fallback.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderPreviewFallback`

<a id="public-modules-ui-scene-manager-type-preview-theme-ts"></a>
### `public/modules/ui/scene-manager/type-preview/theme.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/type-preview/theme.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `createPreviewGround`, `getPreviewTheme`

<a id="public-modules-ui-scene-manager-types-ts"></a>
### `public/modules/ui/scene-manager/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-scene-manager-view-state-ts"></a>
### `public/modules/ui/scene-manager/view-state.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/view-state.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `createSceneManagerViewState`, `syncInspectorAvailability`, `syncTabVisibility`, `syncTransformModeState`

