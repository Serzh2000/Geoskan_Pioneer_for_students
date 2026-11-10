# Интерфейс и взаимодействие

UI-компоненты симулятора, панели, HUD, контекстные меню, логгер, управление сценой и пользовательские рабочие потоки.

## Состав группы

- [`public/modules/editor/autofit.ts`](#public-modules-editor-autofit-ts)
- [`public/modules/editor/blockly-mode/blockly-core.ts`](#public-modules-editor-blockly-mode-blockly-core-ts)
- [`public/modules/editor/blockly-mode/bricks/block-spec-table.ts`](#public-modules-editor-blockly-mode-bricks-block-spec-table-ts)
- [`public/modules/editor/blockly-mode/bricks/block-spec-types.ts`](#public-modules-editor-blockly-mode-bricks-block-spec-types-ts)
- [`public/modules/editor/blockly-mode/bricks/block-specs.ts`](#public-modules-editor-blockly-mode-bricks-block-specs-ts)
- [`public/modules/editor/blockly-mode/bricks/blocks.ts`](#public-modules-editor-blockly-mode-bricks-blocks-ts)
- [`public/modules/editor/blockly-mode/bricks/colour-field.ts`](#public-modules-editor-blockly-mode-bricks-colour-field-ts)
- [`public/modules/editor/blockly-mode/bricks/compile.ts`](#public-modules-editor-blockly-mode-bricks-compile-ts)
- [`public/modules/editor/blockly-mode/bricks/constants.ts`](#public-modules-editor-blockly-mode-bricks-constants-ts)
- [`public/modules/editor/blockly-mode/bricks/drone-only.ts`](#public-modules-editor-blockly-mode-bricks-drone-only-ts)
- [`public/modules/editor/blockly-mode/bricks/generator-kit.ts`](#public-modules-editor-blockly-mode-bricks-generator-kit-ts)
- [`public/modules/editor/blockly-mode/bricks/generators-ai.ts`](#public-modules-editor-blockly-mode-bricks-generators-ai-ts)
- [`public/modules/editor/blockly-mode/bricks/generators.ts`](#public-modules-editor-blockly-mode-bricks-generators-ts)
- [`public/modules/editor/blockly-mode/bricks/index.ts`](#public-modules-editor-blockly-mode-bricks-index-ts)
- [`public/modules/editor/blockly-mode/bricks/model.ts`](#public-modules-editor-blockly-mode-bricks-model-ts)
- [`public/modules/editor/blockly-mode/bricks/python-lib-extra.ts`](#public-modules-editor-blockly-mode-bricks-python-lib-extra-ts)
- [`public/modules/editor/blockly-mode/bricks/python-lib.ts`](#public-modules-editor-blockly-mode-bricks-python-lib-ts)
- [`public/modules/editor/blockly-mode/bricks/starter.ts`](#public-modules-editor-blockly-mode-bricks-starter-ts)
- [`public/modules/editor/blockly-mode/bricks/toolbox.ts`](#public-modules-editor-blockly-mode-bricks-toolbox-ts)
- [`public/modules/editor/blockly-mode/bricks/xml.ts`](#public-modules-editor-blockly-mode-bricks-xml-ts)
- [`public/modules/editor/blockly-mode/catalog.ts`](#public-modules-editor-blockly-mode-catalog-ts)
- [`public/modules/editor/blockly-mode/index.ts`](#public-modules-editor-blockly-mode-index-ts)
- [`public/modules/editor/blockly-mode/loader.ts`](#public-modules-editor-blockly-mode-loader-ts)
- [`public/modules/editor/blockly-mode/lua-definitions.ts`](#public-modules-editor-blockly-mode-lua-definitions-ts)
- [`public/modules/editor/blockly-mode/pioneer-sdk2-definitions.ts`](#public-modules-editor-blockly-mode-pioneer-sdk2-definitions-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/camera.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-camera-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/events.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-events-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/flight.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-flight-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/index.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-index-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/leds.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-leds-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/program.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-program-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/scene.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-scene-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/sensors.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-sensors-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/shared.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-shared-ts)
- [`public/modules/editor/blockly-mode/pioneer/blocks/time.ts`](#public-modules-editor-blockly-mode-pioneer-blocks-time-ts)
- [`public/modules/editor/blockly-mode/pioneer/constants.ts`](#public-modules-editor-blockly-mode-pioneer-constants-ts)
- [`public/modules/editor/blockly-mode/pioneer/disable-reasons.ts`](#public-modules-editor-blockly-mode-pioneer-disable-reasons-ts)
- [`public/modules/editor/blockly-mode/pioneer/registry.ts`](#public-modules-editor-blockly-mode-pioneer-registry-ts)
- [`public/modules/editor/blockly-mode/pioneer/target-support.ts`](#public-modules-editor-blockly-mode-pioneer-target-support-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/compile.ts`](#public-modules-editor-blockly-mode-pioneer-targets-compile-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/lua-fsm.ts`](#public-modules-editor-blockly-mode-pioneer-targets-lua-fsm-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/lua-runtime.ts`](#public-modules-editor-blockly-mode-pioneer-targets-lua-runtime-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/lua-structured.ts`](#public-modules-editor-blockly-mode-pioneer-targets-lua-structured-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/python-runtime.ts`](#public-modules-editor-blockly-mode-pioneer-targets-python-runtime-ts)
- [`public/modules/editor/blockly-mode/pioneer/targets/types.ts`](#public-modules-editor-blockly-mode-pioneer-targets-types-ts)
- [`public/modules/editor/blockly-mode/pioneer/toolbox.ts`](#public-modules-editor-blockly-mode-pioneer-toolbox-ts)
- [`public/modules/editor/blockly-mode/pioneer/wait-in-event-guard.ts`](#public-modules-editor-blockly-mode-pioneer-wait-in-event-guard-ts)
- [`public/modules/editor/blockly-mode/pioneer/wait-in-loop-guard.ts`](#public-modules-editor-blockly-mode-pioneer-wait-in-loop-guard-ts)
- [`public/modules/editor/blockly-mode/pioneer/wait-model-guards.ts`](#public-modules-editor-blockly-mode-pioneer-wait-model-guards-ts)
- [`public/modules/editor/blockly-mode/teaching-lua-definitions.ts`](#public-modules-editor-blockly-mode-teaching-lua-definitions-ts)
- [`public/modules/editor/blockly-mode/teaching-python-definitions.ts`](#public-modules-editor-blockly-mode-teaching-python-definitions-ts)
- [`public/modules/editor/blockly-mode/types.ts`](#public-modules-editor-blockly-mode-types-ts)
- [`public/modules/editor/blockly-mode/ui.ts`](#public-modules-editor-blockly-mode-ui-ts)
- [`public/modules/editor/blockly-mode/workspace-xml.ts`](#public-modules-editor-blockly-mode-workspace-xml-ts)
- [`public/modules/editor/blockly-mode/workspace.ts`](#public-modules-editor-blockly-mode-workspace-ts)
- [`public/modules/editor/blockly.ts`](#public-modules-editor-blockly-ts)
- [`public/modules/editor/blockly/bounded-metrics.ts`](#public-modules-editor-blockly-bounded-metrics-ts)
- [`public/modules/editor/blockly/legacy-values.ts`](#public-modules-editor-blockly-legacy-values-ts)
- [`public/modules/editor/blockly/support.ts`](#public-modules-editor-blockly-support-ts)
- [`public/modules/editor/blockly/toggle-controller.ts`](#public-modules-editor-blockly-toggle-controller-ts)
- [`public/modules/editor/blockly/workspace-controller.ts`](#public-modules-editor-blockly-workspace-controller-ts)
- [`public/modules/editor/dom.ts`](#public-modules-editor-dom-ts)
- [`public/modules/editor/index.ts`](#public-modules-editor-index-ts)
- [`public/modules/editor/index/api.ts`](#public-modules-editor-index-api-ts)
- [`public/modules/editor/index/bricks-api.ts`](#public-modules-editor-index-bricks-api-ts)
- [`public/modules/editor/index/controllers.ts`](#public-modules-editor-index-controllers-ts)
- [`public/modules/editor/index/helpers.ts`](#public-modules-editor-index-helpers-ts)
- [`public/modules/editor/index/runtime.ts`](#public-modules-editor-index-runtime-ts)
- [`public/modules/editor/index/session.ts`](#public-modules-editor-index-session-ts)
- [`public/modules/editor/index/shell.ts`](#public-modules-editor-index-shell-ts)
- [`public/modules/editor/index/state.ts`](#public-modules-editor-index-state-ts)
- [`public/modules/editor/index/temporary-document.ts`](#public-modules-editor-index-temporary-document-ts)
- [`public/modules/editor/monaco/completion.ts`](#public-modules-editor-monaco-completion-ts)
- [`public/modules/editor/monaco/completion/call-context.ts`](#public-modules-editor-monaco-completion-call-context-ts)
- [`public/modules/editor/monaco/completion/catalog.ts`](#public-modules-editor-monaco-completion-catalog-ts)
- [`public/modules/editor/monaco/completion/context.ts`](#public-modules-editor-monaco-completion-context-ts)
- [`public/modules/editor/monaco/completion/entries.ts`](#public-modules-editor-monaco-completion-entries-ts)
- [`public/modules/editor/monaco/completion/signature.ts`](#public-modules-editor-monaco-completion-signature-ts)
- [`public/modules/editor/monaco/completion/snippets.ts`](#public-modules-editor-monaco-completion-snippets-ts)
- [`public/modules/editor/monaco/completion/types.ts`](#public-modules-editor-monaco-completion-types-ts)
- [`public/modules/editor/monaco/completion/user-symbols.ts`](#public-modules-editor-monaco-completion-user-symbols-ts)
- [`public/modules/editor/monaco/hover.ts`](#public-modules-editor-monaco-hover-ts)
- [`public/modules/editor/monaco/signature-help.ts`](#public-modules-editor-monaco-signature-help-ts)
- [`public/modules/editor/monaco/syntax.ts`](#public-modules-editor-monaco-syntax-ts)
- [`public/modules/editor/runtime.ts`](#public-modules-editor-runtime-ts)
- [`public/modules/editor/text-editor.ts`](#public-modules-editor-text-editor-ts)
- [`public/modules/ui/api-docs/index.ts`](#public-modules-ui-api-docs-index-ts)
- [`public/modules/ui/api-docs/preview/index.ts`](#public-modules-ui-api-docs-preview-index-ts)
- [`public/modules/ui/api-docs/preview/scenario-utils.ts`](#public-modules-ui-api-docs-preview-scenario-utils-ts)
- [`public/modules/ui/api-docs/preview/scenarios.ts`](#public-modules-ui-api-docs-preview-scenarios-ts)
- [`public/modules/ui/api-docs/preview/scene.ts`](#public-modules-ui-api-docs-preview-scene-ts)
- [`public/modules/ui/api-docs/preview/topdown-scenarios.ts`](#public-modules-ui-api-docs-preview-topdown-scenarios-ts)
- [`public/modules/ui/api-docs/preview/types.ts`](#public-modules-ui-api-docs-preview-types-ts)
- [`public/modules/ui/api-docs/sections.ts`](#public-modules-ui-api-docs-sections-ts)
- [`public/modules/ui/building-settings.ts`](#public-modules-ui-building-settings-ts)
- [`public/modules/ui/context-menu/dom.ts`](#public-modules-ui-context-menu-dom-ts)
- [`public/modules/ui/context-menu/index.ts`](#public-modules-ui-context-menu-index-ts)
- [`public/modules/ui/context-menu/menu-builder.ts`](#public-modules-ui-context-menu-menu-builder-ts)
- [`public/modules/ui/context-menu/styles.ts`](#public-modules-ui-context-menu-styles-ts)
- [`public/modules/ui/context-menu/types.ts`](#public-modules-ui-context-menu-types-ts)
- [`public/modules/ui/controls/camera-mode.ts`](#public-modules-ui-controls-camera-mode-ts)
- [`public/modules/ui/controls/file-controls.ts`](#public-modules-ui-controls-file-controls-ts)
- [`public/modules/ui/environment-control.ts`](#public-modules-ui-environment-control-ts)
- [`public/modules/ui/icons/tabler.ts`](#public-modules-ui-icons-tabler-ts)
- [`public/modules/ui/info/modal.ts`](#public-modules-ui-info-modal-ts)
- [`public/modules/ui/managers/drone-manager.ts`](#public-modules-ui-managers-drone-manager-ts)
- [`public/modules/ui/managers/drone-manager/connection-panel.ts`](#public-modules-ui-managers-drone-manager-connection-panel-ts)
- [`public/modules/ui/managers/drone-manager/dom.ts`](#public-modules-ui-managers-drone-manager-dom-ts)
- [`public/modules/ui/managers/drone-manager/helpers.ts`](#public-modules-ui-managers-drone-manager-helpers-ts)
- [`public/modules/ui/managers/drone-manager/list-panel.ts`](#public-modules-ui-managers-drone-manager-list-panel-ts)
- [`public/modules/ui/marker-settings.ts`](#public-modules-ui-marker-settings-ts)
- [`public/modules/ui/mission-guide/academy/catalog.ts`](#public-modules-ui-mission-guide-academy-catalog-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/drone.ts`](#public-modules-ui-mission-guide-academy-evaluation-drone-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/flight.ts`](#public-modules-ui-mission-guide-academy-evaluation-flight-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/lua-extras.ts`](#public-modules-ui-mission-guide-academy-evaluation-lua-extras-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/sdk-extras.ts`](#public-modules-ui-mission-guide-academy-evaluation-sdk-extras-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/sdk-python.ts`](#public-modules-ui-mission-guide-academy-evaluation-sdk-python-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/signals-code.ts`](#public-modules-ui-mission-guide-academy-evaluation-signals-code-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/telemetry.ts`](#public-modules-ui-mission-guide-academy-evaluation-telemetry-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/time.ts`](#public-modules-ui-mission-guide-academy-evaluation-time-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/vision.ts`](#public-modules-ui-mission-guide-academy-evaluation-vision-ts)
- [`public/modules/ui/mission-guide/academy/explainers.ts`](#public-modules-ui-mission-guide-academy-explainers-ts)
- [`public/modules/ui/mission-guide/academy/practices/camera-aruco.ts`](#public-modules-ui-mission-guide-academy-practices-camera-aruco-ts)
- [`public/modules/ui/mission-guide/academy/practices/drone.ts`](#public-modules-ui-mission-guide-academy-practices-drone-ts)
- [`public/modules/ui/mission-guide/academy/practices/flight.ts`](#public-modules-ui-mission-guide-academy-practices-flight-ts)
- [`public/modules/ui/mission-guide/academy/practices/index.ts`](#public-modules-ui-mission-guide-academy-practices-index-ts)
- [`public/modules/ui/mission-guide/academy/practices/lua-extras.ts`](#public-modules-ui-mission-guide-academy-practices-lua-extras-ts)
- [`public/modules/ui/mission-guide/academy/practices/sdk-extras.ts`](#public-modules-ui-mission-guide-academy-practices-sdk-extras-ts)
- [`public/modules/ui/mission-guide/academy/practices/sdk-python.ts`](#public-modules-ui-mission-guide-academy-practices-sdk-python-ts)
- [`public/modules/ui/mission-guide/academy/practices/shared.ts`](#public-modules-ui-mission-guide-academy-practices-shared-ts)
- [`public/modules/ui/mission-guide/academy/practices/signals-code.ts`](#public-modules-ui-mission-guide-academy-practices-signals-code-ts)
- [`public/modules/ui/mission-guide/academy/practices/telemetry.ts`](#public-modules-ui-mission-guide-academy-practices-telemetry-ts)
- [`public/modules/ui/mission-guide/academy/practices/time.ts`](#public-modules-ui-mission-guide-academy-practices-time-ts)
- [`public/modules/ui/mission-guide/academy/practices/vision-shared.ts`](#public-modules-ui-mission-guide-academy-practices-vision-shared-ts)
- [`public/modules/ui/mission-guide/academy/practices/visual-navigation.ts`](#public-modules-ui-mission-guide-academy-practices-visual-navigation-ts)
- [`public/modules/ui/mission-guide/academy/scene.ts`](#public-modules-ui-mission-guide-academy-scene-ts)
- [`public/modules/ui/mission-guide/book/localize.ts`](#public-modules-ui-mission-guide-book-localize-ts)
- [`public/modules/ui/mission-guide/evaluation/text/graders.ts`](#public-modules-ui-mission-guide-evaluation-text-graders-ts)
- [`public/modules/ui/mission-guide/evaluation/text/index.ts`](#public-modules-ui-mission-guide-evaluation-text-index-ts)
- [`public/modules/ui/mission-guide/evaluation/text/snapshot.ts`](#public-modules-ui-mission-guide-evaluation-text-snapshot-ts)
- [`public/modules/ui/mission-guide/evaluation/text/timeline.ts`](#public-modules-ui-mission-guide-evaluation-text-timeline-ts)
- [`public/modules/ui/mission-guide/evaluation/text/trace.ts`](#public-modules-ui-mission-guide-evaluation-text-trace-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/catalog.ts`](#public-modules-ui-mission-guide-lessons-pioneer-catalog-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/dsl.ts`](#public-modules-ui-mission-guide-lessons-pioneer-dsl-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/flight-basics.ts`](#public-modules-ui-mission-guide-lessons-pioneer-flight-basics-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/flight-shapes.ts`](#public-modules-ui-mission-guide-lessons-pioneer-flight-shapes-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/grade.ts`](#public-modules-ui-mission-guide-lessons-pioneer-grade-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/helpers.ts`](#public-modules-ui-mission-guide-lessons-pioneer-helpers-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/light.ts`](#public-modules-ui-mission-guide-lessons-pioneer-light-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/logic.ts`](#public-modules-ui-mission-guide-lessons-pioneer-logic-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/projects.ts`](#public-modules-ui-mission-guide-lessons-pioneer-projects-ts)
- [`public/modules/ui/mission-guide/lessons/pioneer/types.ts`](#public-modules-ui-mission-guide-lessons-pioneer-types-ts)
- [`public/modules/ui/mission-guide/mini2/bricks-missions.ts`](#public-modules-ui-mission-guide-mini2-bricks-missions-ts)
- [`public/modules/ui/mission-guide/mini2/bricks-xml-kit.ts`](#public-modules-ui-mission-guide-mini2-bricks-xml-kit-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-grade.ts`](#public-modules-ui-mission-guide-mini2-sdk2-grade-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-mission-kit.ts`](#public-modules-ui-mission-guide-mini2-sdk2-mission-kit-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-missions-flight.ts`](#public-modules-ui-mission-guide-mini2-sdk2-missions-flight-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-missions-systems.ts`](#public-modules-ui-mission-guide-mini2-sdk2-missions-systems-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-missions-vision.ts`](#public-modules-ui-mission-guide-mini2-sdk2-missions-vision-ts)
- [`public/modules/ui/mission-guide/mini2/sdk2-missions.ts`](#public-modules-ui-mission-guide-mini2-sdk2-missions-ts)
- [`public/modules/ui/mission-guide/types.ts`](#public-modules-ui-mission-guide-types-ts)
- [`public/modules/ui/mobile-editor-viewport.ts`](#public-modules-ui-mobile-editor-viewport-ts)
- [`public/modules/ui/modal-focus.ts`](#public-modules-ui-modal-focus-ts)
- [`public/modules/ui/onboarding-tour.ts`](#public-modules-ui-onboarding-tour-ts)
- [`public/modules/ui/panels/channel-monitor.ts`](#public-modules-ui-panels-channel-monitor-ts)
- [`public/modules/ui/panels/drone-link-panel.ts`](#public-modules-ui-panels-drone-link-panel-ts)
- [`public/modules/ui/panels/editor-docs.ts`](#public-modules-ui-panels-editor-docs-ts)
- [`public/modules/ui/panels/editor-drawers.ts`](#public-modules-ui-panels-editor-drawers-ts)
- [`public/modules/ui/panels/editor-drone-upload.ts`](#public-modules-ui-panels-editor-drone-upload-ts)
- [`public/modules/ui/panels/editor-model-switch.ts`](#public-modules-ui-panels-editor-model-switch-ts)
- [`public/modules/ui/panels/editor-terminal.ts`](#public-modules-ui-panels-editor-terminal-ts)
- [`public/modules/ui/panels/gamepad-dialog.ts`](#public-modules-ui-panels-gamepad-dialog-ts)
- [`public/modules/ui/panels/journal-lines.ts`](#public-modules-ui-panels-journal-lines-ts)
- [`public/modules/ui/panels/led-matrix.ts`](#public-modules-ui-panels-led-matrix-ts)
- [`public/modules/ui/panels/notice-policy.ts`](#public-modules-ui-panels-notice-policy-ts)
- [`public/modules/ui/panels/rail-a11y.ts`](#public-modules-ui-panels-rail-a11y-ts)
- [`public/modules/ui/panels/rail-status.ts`](#public-modules-ui-panels-rail-status-ts)
- [`public/modules/ui/panels/rail-tooltip.ts`](#public-modules-ui-panels-rail-tooltip-ts)
- [`public/modules/ui/panels/rail-visibility.ts`](#public-modules-ui-panels-rail-visibility-ts)
- [`public/modules/ui/panels/scene-stop.ts`](#public-modules-ui-panels-scene-stop-ts)
- [`public/modules/ui/panels/sidebar-debug.ts`](#public-modules-ui-panels-sidebar-debug-ts)
- [`public/modules/ui/panels/sidebar.ts`](#public-modules-ui-panels-sidebar-ts)
- [`public/modules/ui/panels/simulation-notice.ts`](#public-modules-ui-panels-simulation-notice-ts)
- [`public/modules/ui/panels/stats.ts`](#public-modules-ui-panels-stats-ts)
- [`public/modules/ui/panels/terminal-session.ts`](#public-modules-ui-panels-terminal-session-ts)
- [`public/modules/ui/panels/terminal-workbench.ts`](#public-modules-ui-panels-terminal-workbench-ts)
- [`public/modules/ui/scene-hotbar/index.ts`](#public-modules-ui-scene-hotbar-index-ts)
- [`public/modules/ui/scene-manager/bindings.ts`](#public-modules-ui-scene-manager-bindings-ts)
- [`public/modules/ui/scene-manager/bindings/actions.ts`](#public-modules-ui-scene-manager-bindings-actions-ts)
- [`public/modules/ui/scene-manager/bindings/add-form.ts`](#public-modules-ui-scene-manager-bindings-add-form-ts)
- [`public/modules/ui/scene-manager/bindings/scene-io.ts`](#public-modules-ui-scene-manager-bindings-scene-io-ts)
- [`public/modules/ui/scene-manager/bindings/shared.ts`](#public-modules-ui-scene-manager-bindings-shared-ts)
- [`public/modules/ui/scene-manager/catalog.ts`](#public-modules-ui-scene-manager-catalog-ts)
- [`public/modules/ui/scene-manager/dom.ts`](#public-modules-ui-scene-manager-dom-ts)
- [`public/modules/ui/scene-manager/experience.ts`](#public-modules-ui-scene-manager-experience-ts)
- [`public/modules/ui/scene-manager/index.ts`](#public-modules-ui-scene-manager-index-ts)
- [`public/modules/ui/scene-manager/preset-missions.ts`](#public-modules-ui-scene-manager-preset-missions-ts)
- [`public/modules/ui/scene-manager/render.ts`](#public-modules-ui-scene-manager-render-ts)
- [`public/modules/ui/scene-manager/render/details.ts`](#public-modules-ui-scene-manager-render-details-ts)
- [`public/modules/ui/scene-manager/render/details/controls.ts`](#public-modules-ui-scene-manager-render-details-controls-ts)
- [`public/modules/ui/scene-manager/render/details/markup.ts`](#public-modules-ui-scene-manager-render-details-markup-ts)
- [`public/modules/ui/scene-manager/render/details/transform.ts`](#public-modules-ui-scene-manager-render-details-transform-ts)
- [`public/modules/ui/scene-manager/render/format.ts`](#public-modules-ui-scene-manager-render-format-ts)
- [`public/modules/ui/scene-manager/render/icons.ts`](#public-modules-ui-scene-manager-render-icons-ts)
- [`public/modules/ui/scene-manager/render/label.ts`](#public-modules-ui-scene-manager-render-label-ts)
- [`public/modules/ui/scene-manager/render/list.ts`](#public-modules-ui-scene-manager-render-list-ts)
- [`public/modules/ui/scene-manager/scene-io.ts`](#public-modules-ui-scene-manager-scene-io-ts)
- [`public/modules/ui/scene-manager/support.ts`](#public-modules-ui-scene-manager-support-ts)
- [`public/modules/ui/scene-manager/support/building.ts`](#public-modules-ui-scene-manager-support-building-ts)
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
- [`public/modules/ui/scene-onboarding.ts`](#public-modules-ui-scene-onboarding-ts)
- [`public/modules/ui/vehicle-settings.ts`](#public-modules-ui-vehicle-settings-ts)
- [`public/modules/ui/workspace-view.ts`](#public-modules-ui-workspace-view-ts)

## Файлы

<a id="public-modules-editor-autofit-ts"></a>
### `public/modules/editor/autofit.ts`

- Исходник: [открыть файл](../../public/modules/editor/autofit.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `applySidebarAutofitWidth`, `autoExpandEditorPanelToContent`, `boundingBox`, `clampSidebarWidth`, `expandEditorPanelForBlockly`, `getBlocklyBlocksWidth`, `getRequiredBlocklySidebarWidth`, `getRequiredLuaSidebarWidth`, `getSceneSafeMaxWidth`, `getSidebarChromeWidth`, `getSidebarCurrentWidth`, `getSidebarPanelsElement`, `isMobileSidebarLayout`, `isStarterLuaScript`, `maybeAutoExpandTextEditorPanel`, `measureTextWidth`, `normalizeMultilineText`, `restoreEditorPanelWidthAfterBlockly`, `scheduleEditorPanelAutofit`, `storeEditorWidth`

<a id="public-modules-editor-blockly-mode-blockly-core-ts"></a>
### `public/modules/editor/blockly-mode/blockly-core.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/blockly-core.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `applyRussianMessages`, `getBlocklyGenerator`, `initBlocklyDefinitions`, `registerRussianGeneratorHooks`

<a id="public-modules-editor-blockly-mode-bricks-block-spec-table-ts"></a>
### `public/modules/editor/blockly-mode/bricks/block-spec-table.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/block-spec-table.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-bricks-block-spec-types-ts"></a>
### `public/modules/editor/blockly-mode/bricks/block-spec-types.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/block-spec-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-bricks-block-specs-ts"></a>
### `public/modules/editor/blockly-mode/bricks/block-specs.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/block-specs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `allBricksBlockTypes`, `allBricksNativeTypes`, `bricksDroneOnlyTypes`, `bricksSpecsByCategory`, `isBricksBlockType`

<a id="public-modules-editor-blockly-mode-bricks-blocks-ts"></a>
### `public/modules/editor/blockly-mode/bricks/blocks.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/blocks.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `createField`, `defineFromSpec`, `definePaintObject`, `defineStartBlock`, `flush`, `layout`, `registerBricksBlockDefinitions`, `setPaintShape`, `syncPaintInput`

<a id="public-modules-editor-blockly-mode-bricks-colour-field-ts"></a>
### `public/modules/editor/blockly-mode/bricks/colour-field.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/colour-field.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `FieldHexColour.for`, `FieldHexColour.if`, `normalise`

<a id="public-modules-editor-blockly-mode-bricks-compile-ts"></a>
### `public/modules/editor/blockly-mode/bricks/compile.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/compile.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `asCode`, `buildProgram`, `compileBricksWorkspace`, `indentBody`, `refreshWarnings`, `requiredModel`, `topLevelBlocks`

<a id="public-modules-editor-blockly-mode-bricks-constants-ts"></a>
### `public/modules/editor/blockly-mode/bricks/constants.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/constants.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `bricksType`, `nativeBricksType`

<a id="public-modules-editor-blockly-mode-bricks-drone-only-ts"></a>
### `public/modules/editor/blockly-mode/bricks/drone-only.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/drone-only.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyBricksDroneOnly`, `refreshBricksWarning`, `setCompileWarning`

<a id="public-modules-editor-blockly-mode-bricks-generator-kit-ts"></a>
### `public/modules/editor/blockly-mode/bricks/generator-kit.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/generator-kit.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 17
- Ключевые символы: `aiCommon`, `arg`, `asText`, `camera`, `collectBricksDefinitions`, `colourHelper`, `define`, `definitions`, `imageName`, `importCv2`, `importDeque`, `importNumpy`, `inferCache`, `pioneer`, `statement`, `value`, `variableOfParent`

<a id="public-modules-editor-blockly-mode-bricks-generators-ai-ts"></a>
### `public/modules/editor/blockly-mode/bricks/generators-ai.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/generators-ai.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `join`

<a id="public-modules-editor-blockly-mode-bricks-generators-ts"></a>
### `public/modules/editor/blockly-mode/bricks/generators.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/generators.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `installBricksGenerators`

<a id="public-modules-editor-blockly-mode-bricks-index-ts"></a>
### `public/modules/editor/blockly-mode/bricks/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerBricksBlocks`

<a id="public-modules-editor-blockly-mode-bricks-model-ts"></a>
### `public/modules/editor/blockly-mode/bricks/model.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/model.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `blocklyStateKeySuffix`, `currentBlocklyModelId`, `isBricksModelActive`, `setBlocklyModelProvider`

<a id="public-modules-editor-blockly-mode-bricks-python-lib-extra-ts"></a>
### `public/modules/editor/blockly-mode/bricks/python-lib-extra.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/python-lib-extra.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-bricks-python-lib-ts"></a>
### `public/modules/editor/blockly-mode/bricks/python-lib.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/python-lib.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-bricks-starter-ts"></a>
### `public/modules/editor/blockly-mode/bricks/starter.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/starter.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-bricks-toolbox-ts"></a>
### `public/modules/editor/blockly-mode/bricks/toolbox.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/toolbox.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `buildBricksToolbox`, `inputsOf`, `renderBlock`, `renderCategory`, `shadowXml`

<a id="public-modules-editor-blockly-mode-bricks-xml-ts"></a>
### `public/modules/editor/blockly-mode/bricks/xml.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/bricks/xml.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `bricksProjectFileName`, `loadBricksProject`, `looksLikeBricksProject`, `parseBricksProject`, `renameBlockTypes`, `serializeBricksProject`

<a id="public-modules-editor-blockly-mode-catalog-ts"></a>
### `public/modules/editor/blockly-mode/catalog.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/catalog.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `buildCatalog`, `getLuaCategory`, `getPythonCategory`, `inferSyntax`, `parseCallParts`, `sanitizeKey`

<a id="public-modules-editor-blockly-mode-index-ts"></a>
### `public/modules/editor/blockly-mode/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `buildCallCode`, `buildMainEditorToolbox`, `compileMainEditorWorkspace`, `defineLuaEventConstantBlock`, `defineStatementBlock`, `ensureEditorBlocklyDefinitions`, `extendCatalogWithCourseBlocks`, `getCourseBlockTypes`

<a id="public-modules-editor-blockly-mode-loader-ts"></a>
### `public/modules/editor/blockly-mode/loader.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/loader.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ensureBlocklyLoaded`, `isBlocklyLoaded`

<a id="public-modules-editor-blockly-mode-lua-definitions-ts"></a>
### `public/modules/editor/blockly-mode/lua-definitions.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/lua-definitions.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `callback`, `getAutopilotEventOptions`, `getFromAutopilotEvents`, `getToAutopilotEvents`, `registerLuaEditorBlocklyDefinitions`

<a id="public-modules-editor-blockly-mode-pioneer-sdk2-definitions-ts"></a>
### `public/modules/editor/blockly-mode/pioneer-sdk2-definitions.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer-sdk2-definitions.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `cameraGetter`, `cameraStatement`, `getter`, `imageValue`, `objectMetric`, `output`, `pointBlock`, `receivedGetter`, `registerPioneerSdk2Definitions`, `speedBlock`, `statement`, `value`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-camera-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/camera.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/camera.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `definitionsOf`, `ensurePythonCameraHelper`, `registerCameraBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-events-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/events.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `fromAutopilotEventOptions`, `registerEventBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-flight-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/flight.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/flight.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `ensurePythonGoToYawHelper`, `ensurePythonSetYawHelper`, `landingIsFollowed`, `pythonYaw`, `registerFlightBlocks`, `waitForPoint`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-index-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerPioneerBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-leds-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/leds.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/leds.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `__hsv`, `__led_all`, `__led_set`, `definitionsOf`, `ensureLuaLedHelpers`, `ensurePythonLedHelper`, `presetByLabel`, `registerLedBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-program-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/program.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/program.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerProgramBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-scene-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/scene.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/scene.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `ensurePythonVehicleImport`, `registerSceneBlocks`, `vehicleName`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-sensors-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/sensors.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/sensors.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `axisIndex`, `definitionsOf`, `ensurePythonPositionHelper`, `ensurePythonYawHelper`, `luaTripleSensor`, `registerSensorBlocks`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-shared-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/shared.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/shared.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `definitionsOf`, `distinctFunctionName`, `ensurePythonMathImport`, `ensurePythonThreads`, `numberArg`, `pythonBody`, `pythonGlobalsLine`, `requirePythonSimulatorSdk`

<a id="public-modules-editor-blockly-mode-pioneer-blocks-time-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/blocks/time.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/blocks/time.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureLuaTimers`, `ensurePythonTimeOrigin`, `registerTimeBlocks`, `timerName`

<a id="public-modules-editor-blockly-mode-pioneer-constants-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/constants.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/constants.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-pioneer-disable-reasons-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/disable-reasons.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/disable-reasons.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `refreshBlockWarning`, `setUnsupportedTargetMessage`, `withoutUndo`

<a id="public-modules-editor-blockly-mode-pioneer-registry-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/registry.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/registry.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `createUnsupportedGenerator`, `definePioneerBlock`, `getGenerator`, `getPioneerBlockTypes`, `getPioneerBlockTypesByCategory`, `isBlockSupported`

<a id="public-modules-editor-blockly-mode-pioneer-target-support-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/target-support.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/target-support.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `applyPioneerTargetToWorkspace`, `unsupportedMessage`

<a id="public-modules-editor-blockly-mode-pioneer-targets-compile-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/compile.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/compile.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `buildHeaderDefinitions`, `collectDefinitionsText`, `collectTopLevelParts`, `compilePioneerLuaSource`, `compilePioneerPythonSource`, `compilePioneerWorkspace`, `getGenerator`, `isProcedure`, `joinStatements`, `statementCode`

<a id="public-modules-editor-blockly-mode-pioneer-targets-lua-fsm-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/lua-fsm.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/lua-fsm.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `buildLuaSections`, `extractMarker`, `fsmPollTransition`, `fsmTimerTransition`, `fsmTransitionTail`, `indentLuaBlock`, `isFlatEligible`, `pollName`, `renderFlatSections`, `renderFsmSections`, `splitLuaChain`, `stateName`

<a id="public-modules-editor-blockly-mode-pioneer-targets-lua-runtime-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/lua-runtime.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/lua-runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `__advance`, `__loop_guard`, `buildConditionalPreamble`, `buildFlatLuaProgram`, `buildLuaProgram`, `callback`, `usesMarker`

<a id="public-modules-editor-blockly-mode-pioneer-targets-lua-structured-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/lua-structured.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/lua-structured.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `buildStructuredLuaSections`, `chainNeedsStructure`, `containsEscapingFlow`, `containsWait`, `findMarker`, `isActiveWait`, `needsStructure`, `statementCode`, `StructuredLuaCompiler.if`, `StructuredLuaCompiler.switch`

<a id="public-modules-editor-blockly-mode-pioneer-targets-python-runtime-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/python-runtime.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/python-runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildPythonProgram`

<a id="public-modules-editor-blockly-mode-pioneer-targets-types-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/targets/types.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/targets/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-pioneer-toolbox-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/toolbox.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/toolbox.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `buildPioneerToolbox`, `colourShadow`, `disabledAttribute`, `numberShadow`, `renderBlock`, `renderCategory`

<a id="public-modules-editor-blockly-mode-pioneer-wait-in-event-guard-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/wait-in-event-guard.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/wait-in-event-guard.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `isInsideEventBlock`, `recomputeWaitInEventReason`

<a id="public-modules-editor-blockly-mode-pioneer-wait-in-loop-guard-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/wait-in-loop-guard.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/wait-in-loop-guard.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `currentTarget`, `hasAncestorOfType`, `isWaitBlockType`, `recomputeWaitContainerReasons`, `refreshWaitContainerGuardsForWorkspace`, `registerWaitContainerGuardType`

<a id="public-modules-editor-blockly-mode-pioneer-wait-model-guards-ts"></a>
### `public/modules/editor/blockly-mode/pioneer/wait-model-guards.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/pioneer/wait-model-guards.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `installWaitModelGuards`

<a id="public-modules-editor-blockly-mode-teaching-lua-definitions-ts"></a>
### `public/modules/editor/blockly-mode/teaching-lua-definitions.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/teaching-lua-definitions.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `callback`, `formatLuaPrintCode`, `getAutopilotEventOptions`, `getFromAutopilotEvents`, `getToAutopilotEvents`, `registerLuaBlocklyDefinitions`

<a id="public-modules-editor-blockly-mode-teaching-python-definitions-ts"></a>
### `public/modules/editor/blockly-mode/teaching-python-definitions.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/teaching-python-definitions.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `formatPythonPrintCode`, `registerPythonBlocklyDefinitions`

<a id="public-modules-editor-blockly-mode-types-ts"></a>
### `public/modules/editor/blockly-mode/types.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-mode-ui-ts"></a>
### `public/modules/editor/blockly-mode/ui.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/ui.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyEditorLayoutState`, `computeBlocklyViewportDimensions`, `resizeBlocklyCanvas`

<a id="public-modules-editor-blockly-mode-workspace-xml-ts"></a>
### `public/modules/editor/blockly-mode/workspace-xml.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/workspace-xml.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildTargetWorkspaceXml`, `collectWorkspaceSequence`, `extractMissionGuideSequence`, `serializeWorkspaceXml`

<a id="public-modules-editor-blockly-mode-workspace-ts"></a>
### `public/modules/editor/blockly-mode/workspace.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/workspace.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `compileGeneratorWorkspace`, `compileMainEditorWorkspace`, `createStarterWorkspaceXml`

<a id="public-modules-editor-blockly-ts"></a>
### `public/modules/editor/blockly.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-blockly-bounded-metrics-ts"></a>
### `public/modules/editor/blockly/bounded-metrics.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/bounded-metrics.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `boundedRange`, `registerBoundedMetricsManager`

<a id="public-modules-editor-blockly-legacy-values-ts"></a>
### `public/modules/editor/blockly/legacy-values.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/legacy-values.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `migrateLessonLedValues`

<a id="public-modules-editor-blockly-support-ts"></a>
### `public/modules/editor/blockly/support.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/support.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `createBlocklyResizeRuntime`, `ensureBlocklyResizeTracking`, `isBlocklyWorkspaceEmpty`, `resizeBlocklyWorkspaceViewport`

<a id="public-modules-editor-blockly-toggle-controller-ts"></a>
### `public/modules/editor/blockly/toggle-controller.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/toggle-controller.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `setBlocklyEditorEnabled`

<a id="public-modules-editor-blockly-workspace-controller-ts"></a>
### `public/modules/editor/blockly/workspace-controller.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly/workspace-controller.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `ensureBlocklyWorkspace`, `loadBlocklyWorkspace`, `retargetBlocklyWorkspace`, `saveBlocklyWorkspaceState`, `switchBlocklyModel`

<a id="public-modules-editor-dom-ts"></a>
### `public/modules/editor/dom.ts`

- Исходник: [открыть файл](../../public/modules/editor/dom.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `createEditorShell`, `fallbackEditor`, `getBlocklyWorkspaceStateKey`, `getEditorStateKey`, `getFallbackEditorElement`, `getFallbackEditorValue`, `hasFallbackEditor`, `setFallbackEditorValue`, `syncEditorModeVisibility`, `syncScriptLanguageSelect`

<a id="public-modules-editor-index-ts"></a>
### `public/modules/editor/index.ts`

- Исходник: [открыть файл](../../public/modules/editor/index.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-editor-index-api-ts"></a>
### `public/modules/editor/index/api.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/api.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 19
- Ключевые символы: `ensureBlocklyWorkspace`, `getEditorControllers`, `getEditorValue`, `getMainBlocklyWorkspace`, `getSavedEditorDraft`, `initEditor`, `isBlocklyEditorEnabled`, `layoutEditor`, `loadBlocklyWorkspace`, `loadMainBlocklyJson`, `loadMainBlocklyXml`, `retargetBlocklyWorkspace`, `saveBlocklyWorkspaceState`, `setBlocklyEditorEnabled`, `setEditorLanguage`, `setEditorTheme`, `setEditorValue`, `syncBlocklyWithDroneModel`, `syncScriptLanguageSelect`

<a id="public-modules-editor-index-bricks-api-ts"></a>
### `public/modules/editor/index/bricks-api.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/bricks-api.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `exportMainBricksProject`, `loadMainBricksProject`

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
- Обнаружено функций/методов: 15
- Ключевые символы: `createEditor`, `createEditorShell`, `disposeEditor`, `fallbackEditor`, `getBlocklyStateKey`, `getEditorStateKey`, `getTextEditorValue`, `initializeEditorShellEnvironment`, `layoutEditor`, `persistCurrentEditorIndexSession`, `scheduleTextEditorAutofit`, `setEditorTextLanguage`, `setEditorTheme`, `setTextEditorValue`, `syncEditorModeVisibility`

<a id="public-modules-editor-index-state-ts"></a>
### `public/modules/editor/index/state.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `assignEditorIndexShell`, `getEditorIndexCollections`, `getEditorIndexShellState`, `setPendingEditorLanguage`, `setPendingEditorValue`

<a id="public-modules-editor-index-temporary-document-ts"></a>
### `public/modules/editor/index/temporary-document.ts`

- Исходник: [открыть файл](../../public/modules/editor/index/temporary-document.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `beginTemporaryDocument`, `getTemporaryDocumentToken`, `isTemporaryDocumentActive`, `restoreTemporaryDocument`

<a id="public-modules-editor-monaco-completion-ts"></a>
### `public/modules/editor/monaco/completion.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `ensureLanguageRegistered`, `setupCompletionProvider`, `toMonacoSuggestions`

<a id="public-modules-editor-monaco-completion-call-context-ts"></a>
### `public/modules/editor/monaco/completion/call-context.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/call-context.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `calleeBefore`, `findCallContext`, `name`

<a id="public-modules-editor-monaco-completion-catalog-ts"></a>
### `public/modules/editor/monaco/completion/catalog.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/catalog.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `activePythonCatalog`, `activePythonDocTable`, `buildCompletionCatalog`, `currentDroneUsesSdk2`, `getOwnerMembers`, `groupOf`, `inferLuaMemberSeparator`, `LUA_EV_ENTRIES`

<a id="public-modules-editor-monaco-completion-context-ts"></a>
### `public/modules/editor/monaco/completion/context.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/context.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `extractMemberAccessContext`, `getLineTextBeforeCursor`, `getTextBeforeCursor`, `inferLuaSymbolTypes`, `inferPythonSymbolTypes`, `resolveLuaOwnerName`, `resolvePythonOwnerName`, `stripLuaComment`, `stripPythonComment`

<a id="public-modules-editor-monaco-completion-entries-ts"></a>
### `public/modules/editor/monaco/completion/entries.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/entries.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `getLuaArgumentTriggerEntries`, `getLuaCompletionEntries`, `getPythonCompletionEntries`, `reservedNames`

<a id="public-modules-editor-monaco-completion-signature-ts"></a>
### `public/modules/editor/monaco/completion/signature.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/signature.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `docTable`, `eventConstantEntries`, `getArgumentEntries`, `parseParameterRanges`, `push`, `resolveDocKey`, `resolveSignature`, `syntaxFromInsertText`

<a id="public-modules-editor-monaco-completion-snippets-ts"></a>
### `public/modules/editor/monaco/completion/snippets.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/snippets.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `callback`, `keyword`, `template`

<a id="public-modules-editor-monaco-completion-types-ts"></a>
### `public/modules/editor/monaco/completion/types.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createDocEntry`, `dedupeDocEntries`, `dedupeSuggestions`, `formatEntryDocumentation`, `parseApiMemberKey`

<a id="public-modules-editor-monaco-completion-user-symbols-ts"></a>
### `public/modules/editor/monaco/completion/user-symbols.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/user-symbols.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `extractLuaUserSymbols`, `extractPythonUserSymbols`, `splitNames`, `stripLuaComment`, `stripPythonComment`, `toEntries`

<a id="public-modules-editor-monaco-hover-ts"></a>
### `public/modules/editor/monaco/hover.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/hover.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `ensureLanguageRegistered`, `findLuaDoc`, `getFullWordAtPosition`, `getMarkdownContents`, `setupHoverProvider`

<a id="public-modules-editor-monaco-signature-help-ts"></a>
### `public/modules/editor/monaco/signature-help.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/signature-help.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ensureLanguageRegistered`, `setupSignatureHelpProvider`

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
- Обнаружено функций/методов: 3
- Ключевые символы: `ensureBlocklyThemesBuilt`, `getBlocklyTheme`, `getBlocklyThemeByName`

<a id="public-modules-editor-text-editor-ts"></a>
### `public/modules/editor/text-editor.ts`

- Исходник: [открыть файл](../../public/modules/editor/text-editor.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 21
- Ключевые символы: `clearFallbackEditorProblemHighlight`, `clearTextEditorProblemHighlight`, `createTextEditorInstance`, `disposeTextEditorInstance`, `ensureOverflowWidgetsContainer`, `fitToPage`, `getCurrentAppTheme`, `getFallbackEditorElement`, `getMonacoLanguage`, `getMonacoThemeName`, `getTextEditorValueFromInstance`, `highlightFallbackEditorProblem`, `highlightTextEditorProblem`, `initializeMonacoEnvironment`, `layoutTextEditorInstance`, `normalizeEditorText`, `scheduleEditorFontRemeasure`, `setTextEditorLanguageOnInstance`, `setTextEditorTheme`, `setTextEditorValueOnInstance`, `syncEditorProblemHandlers`

<a id="public-modules-ui-api-docs-index-ts"></a>
### `public/modules/ui/api-docs/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 16
- Ключевые символы: `attachInteractions`, `destroyPreviews`, `escapeHtml`, `highlightApiCode`, `mountOpenPreview`, `pythonSdkOfCurrentDrone`, `renderApiDocs`, `renderDirectionTag`, `renderEntry`, `renderEntryBody`, `renderFact`, `renderPreviewShell`, `renderSections`, `renderToolbar`, `resetSearch`, `restoreSearchSelection`

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

<a id="public-modules-ui-building-settings-ts"></a>
### `public/modules/ui/building-settings.ts`

- Исходник: [открыть файл](../../public/modules/ui/building-settings.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 30
- Ключевые символы: `applyNow`, `clearHighlight`, `close`, `current`, `escapeHtml`, `fillDictionaries`, `floorsWord`, `icon`, `initBuildingSettings`, `key`, `metres`, `onFieldChange`, `onKey`, `onOutside`, `openBuildingSettings`, `options`, `paint`, `place`, `radioKeys`, `readMarker`, `renderAll`, `renderChrome`, `renderFacade`, `renderSummary`, `scheduleApply`, `serialize`, `showHighlight`, `stopObserving`, `stopPainting`, `windowOrder`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `hide`, `initContextMenu`, `renderButtons`, `show`

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

<a id="public-modules-ui-context-menu-types-ts"></a>
### `public/modules/ui/context-menu/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/context-menu/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-controls-camera-mode-ts"></a>
### `public/modules/ui/controls/camera-mode.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/camera-mode.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initCameraModeUI`, `syncGroup`

<a id="public-modules-ui-controls-file-controls-ts"></a>
### `public/modules/ui/controls/file-controls.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/file-controls.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `currentExamplesSet`, `initFileControls`, `populateFileOptions`, `refreshFileList`, `syncBricksButton`

<a id="public-modules-ui-environment-control-ts"></a>
### `public/modules/ui/environment-control.ts`

- Исходник: [открыть файл](../../public/modules/ui/environment-control.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `initEnvironmentControl`, `positionPopover`, `render`, `renderWeather`, `setOpen`

<a id="public-modules-ui-icons-tabler-ts"></a>
### `public/modules/ui/icons/tabler.ts`

- Исходник: [открыть файл](../../public/modules/ui/icons/tabler.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `tablerIcon`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `emitConnectionSettingsChanged`, `emitDroneSelectionChanged`, `getActiveDroneId`, `initDroneManager`

<a id="public-modules-ui-managers-drone-manager-connection-panel-ts"></a>
### `public/modules/ui/managers/drone-manager/connection-panel.ts`

- Исходник: [открыть файл](../../public/modules/ui/managers/drone-manager/connection-panel.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `applyToCurrentDroneConnection`, `bind`, `buildBridgeSnippet`, `buildCameraSnippet`, `createConnectionPanel`, `focusBridgeToggle`, `focusConnectionCard`, `renderBridgeCard`, `renderConnectionForm`, `setBridgeStatus`, `updateActionsState`, `updateConnectionModeHint`

<a id="public-modules-ui-managers-drone-manager-dom-ts"></a>
### `public/modules/ui/managers/drone-manager/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/managers/drone-manager/dom.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `collectDroneManagerDom`

<a id="public-modules-ui-managers-drone-manager-helpers-ts"></a>
### `public/modules/ui/managers/drone-manager/helpers.ts`

- Исходник: [открыть файл](../../public/modules/ui/managers/drone-manager/helpers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `getDroneAddress`, `getDroneTransportSummary`, `getNextAvailableCameraPort`, `getNextAvailableMavlinkPort`, `getNextAvailablePort`, `reportDroneManagerDebug`

<a id="public-modules-ui-managers-drone-manager-list-panel-ts"></a>
### `public/modules/ui/managers/drone-manager/list-panel.ts`

- Исходник: [открыть файл](../../public/modules/ui/managers/drone-manager/list-panel.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `addDrone`, `bind`, `createDroneListPanel`, `deleteDrone`, `focusRow`, `itemFromEvent`, `renderModelSwitch`, `setDroneModel`, `switchDrone`, `updateList`

<a id="public-modules-ui-marker-settings-ts"></a>
### `public/modules/ui/marker-settings.ts`

- Исходник: [открыть файл](../../public/modules/ui/marker-settings.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `apply`, `close`, `dictionarySelect`, `initMarkerSettings`, `isConfigurableMarker`, `modeOf`, `num`, `numberField`, `onKey`, `onOutside`, `openMarkerSettings`, `read`, `renderSummary`, `scheduleApply`

<a id="public-modules-ui-mission-guide-academy-catalog-ts"></a>
### `public/modules/ui/mission-guide/academy/catalog.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/catalog.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `chapter`

<a id="public-modules-ui-mission-guide-academy-evaluation-drone-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/drone.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/drone.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `at`, `error`, `gradeDroneAcademy`, `sentBetween`

<a id="public-modules-ui-mission-guide-academy-evaluation-flight-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `fail`, `gradeFlightAcademy`, `near`

<a id="public-modules-ui-mission-guide-academy-evaluation-lua-extras-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/lua-extras.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/lua-extras.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `fail`, `gradeLuaExtrasAcademy`, `near`

<a id="public-modules-ui-mission-guide-academy-evaluation-sdk-extras-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/sdk-extras.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/sdk-extras.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `fail`, `gradeSdkExtrasAcademy`

<a id="public-modules-ui-mission-guide-academy-evaluation-sdk-python-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/sdk-python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/sdk-python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `fail`, `gradeSdkPythonAcademy`

<a id="public-modules-ui-mission-guide-academy-evaluation-signals-code-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/signals-code.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/signals-code.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `checkFinal`, `checkMessages`, `checkSequence`, `close`, `fail`, `gradeSignalsCode`

<a id="public-modules-ui-mission-guide-academy-evaluation-telemetry-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/telemetry.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/telemetry.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `fail`, `gradeTelemetryAcademy`, `printNumbers`

<a id="public-modules-ui-mission-guide-academy-evaluation-time-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/time.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/time.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `afterArm`, `fail`, `gradeTimeAcademy`, `matches`, `messages`, `sequence`

<a id="public-modules-ui-mission-guide-academy-evaluation-vision-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/vision.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/vision.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 18
- Ключевые символы: `center`, `centered`, `checkPrintedGeometry`, `error`, `expectPair`, `fail`, `fresh`, `gradeVisionAcademy`, `hasMessage`, `listed`, `near`, `numbers`, `previousDetection`, `recovered`, `side`, `stableBefore`, `visible`, `zero`

<a id="public-modules-ui-mission-guide-academy-explainers-ts"></a>
### `public/modules/ui/mission-guide/academy/explainers.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/explainers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `explainerFor`

<a id="public-modules-ui-mission-guide-academy-practices-camera-aruco-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/camera-aruco.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/camera-aruco.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getCameraArucoAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-practices-drone-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/drone.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/drone.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getDroneAcademyPractices`, `wrap`

<a id="public-modules-ui-mission-guide-academy-practices-flight-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `flightBody`, `getFlightAcademyPractices`, `keep`, `localizedExercise`, `point`

<a id="public-modules-ui-mission-guide-academy-practices-index-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getAcademyTextPractices`, `isAcademyPracticeReady`

<a id="public-modules-ui-mission-guide-academy-practices-lua-extras-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/lua-extras.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/lua-extras.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `flight`, `getLuaExtrasAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-practices-sdk-extras-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/sdk-extras.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/sdk-extras.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getSdkExtrasAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-practices-sdk-python-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/sdk-python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/sdk-python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getSdkPythonAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-practices-shared-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `compileAcademyExercise`, `wrap`

<a id="public-modules-ui-mission-guide-academy-practices-signals-code-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/signals-code.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/signals-code.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getSignalsCodePractices`, `green_signal`, `red_signal`

<a id="public-modules-ui-mission-guide-academy-practices-telemetry-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/telemetry.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/telemetry.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `callback`, `flight`, `getTelemetryAcademyPractices`, `keep`, `localizedExercise`, `measure`, `reportLuaAs`, `reportPythonAs`

<a id="public-modules-ui-mission-guide-academy-practices-time-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/time.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/time.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getTimeAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-practices-vision-shared-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/vision-shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/vision-shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `compileVisionExercise`, `visionBootstrap`

<a id="public-modules-ui-mission-guide-academy-practices-visual-navigation-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/visual-navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/visual-navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `base`, `getVisualNavigationAcademyPractices`

<a id="public-modules-ui-mission-guide-academy-scene-ts"></a>
### `public/modules/ui/mission-guide/academy/scene.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/scene.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `academySceneProfile`, `disposeTerrain`, `getAcademySceneEvidence`, `prepareAcademyScene`, `restoreAcademyScene`

<a id="public-modules-ui-mission-guide-book-localize-ts"></a>
### `public/modules/ui/mission-guide/book/localize.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/book/localize.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `localize`

<a id="public-modules-ui-mission-guide-evaluation-text-graders-ts"></a>
### `public/modules/ui/mission-guide/evaluation/text/graders.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/text/graders.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 18
- Ключевые символы: `colorCloseTo`, `describeColor`, `errorDiagnostic`, `firstLed`, `gradeLanding`, `gradeLedConfirm`, `gradeLedDelayed`, `gradeLedSequence`, `gradeLedSingle`, `gradeMission`, `gradePointConfirm`, `gradePreflight`, `gradeRoute`, `gradeTakeoff`, `hasFsmTransition`, `hasFsmTransitionTo`, `infoDiagnostic`, `successDiagnostic`

<a id="public-modules-ui-mission-guide-evaluation-text-index-ts"></a>
### `public/modules/ui/mission-guide/evaluation/text/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/text/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `evaluateTextLesson`, `runTextLessonCheck`, `wait`

<a id="public-modules-ui-mission-guide-evaluation-text-snapshot-ts"></a>
### `public/modules/ui/mission-guide/evaluation/text/snapshot.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/text/snapshot.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `captureDroneSnapshot`

<a id="public-modules-ui-mission-guide-evaluation-text-timeline-ts"></a>
### `public/modules/ui/mission-guide/evaluation/text/timeline.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/text/timeline.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildFlightTimeline`, `commandLabel`, `ledOf`, `segments`

<a id="public-modules-ui-mission-guide-evaluation-text-trace-ts"></a>
### `public/modules/ui/mission-guide/evaluation/text/trace.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/text/trace.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `color`, `gradeWalkthroughTrace`

<a id="public-modules-ui-mission-guide-lessons-pioneer-catalog-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/catalog.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/catalog.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-dsl-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/dsl.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/dsl.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `chain`, `isVariable`, `program`, `toJson`, `valueBlock`, `variableId`

<a id="public-modules-ui-mission-guide-lessons-pioneer-flight-basics-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/flight-basics.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/flight-basics.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-flight-shapes-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/flight-shapes.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/flight-shapes.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-grade-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/grade.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/grade.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `colourKey`, `describeColour`, `fmt`, `gradePioneerLesson`, `isFlightFinished`, `near`, `pointsWord`, `relativePositions`, `sameColour`

<a id="public-modules-ui-mission-guide-lessons-pioneer-helpers-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/helpers.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/helpers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `cycle`, `flightMs`, `groundMs`, `lessonsOf`, `R`, `twice`

<a id="public-modules-ui-mission-guide-lessons-pioneer-light-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/light.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/light.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-logic-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/logic.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/logic.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-projects-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/projects.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/projects.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-lessons-pioneer-types-ts"></a>
### `public/modules/ui/mission-guide/lessons/pioneer/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/pioneer/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-mini2-bricks-missions-ts"></a>
### `public/modules/ui/mission-guide/mini2/bricks-missions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/bricks-missions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `gradeBricksMission`, `missingBricksBlocks`, `T`

<a id="public-modules-ui-mission-guide-mini2-bricks-xml-kit-ts"></a>
### `public/modules/ui/mission-guide/mini2/bricks-xml-kit.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/bricks-xml-kit.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `block`, `colour`, `compare`, `distance`, `editorBlockTypes`, `esc`, `frame`, `getVar`, `join`, `num`, `project`, `text`, `variable`

<a id="public-modules-ui-mission-guide-mini2-sdk2-grade-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-grade.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-grade.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `hi`, `ledColorName`, `lo`, `Sdk2Grader.for`, `Sdk2Grader.if`

<a id="public-modules-ui-mission-guide-mini2-sdk2-mission-kit-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-mission-kit.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-mission-kit.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `fillAnswers`, `flightProgram`, `groundProgram`, `indent`

<a id="public-modules-ui-mission-guide-mini2-sdk2-missions-flight-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-missions-flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-missions-flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `dot`

<a id="public-modules-ui-mission-guide-mini2-sdk2-missions-systems-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-missions-systems.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-missions-systems.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `colorAt`

<a id="public-modules-ui-mission-guide-mini2-sdk2-missions-vision-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-missions-vision.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-missions-vision.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `lastDetection`

<a id="public-modules-ui-mission-guide-mini2-sdk2-missions-ts"></a>
### `public/modules/ui/mission-guide/mini2/sdk2-missions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/mini2/sdk2-missions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `gradeSdk2Mission`, `isSdk2Mission`

<a id="public-modules-ui-mission-guide-types-ts"></a>
### `public/modules/ui/mission-guide/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mobile-editor-viewport-ts"></a>
### `public/modules/ui/mobile-editor-viewport.ts`

- Исходник: [открыть файл](../../public/modules/ui/mobile-editor-viewport.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `applyFocusedLayout`, `clearFocusedLayout`, `getEditorContent`, `getEditorPanel`, `getHeaderOffset`, `handleFocusIn`, `handleFocusOut`, `handleViewportChange`, `initMobileEditorViewport`, `isEditorElement`, `isEditorFocused`, `scrollEditorPanelIntoView`, `updateViewportVariables`

<a id="public-modules-ui-modal-focus-ts"></a>
### `public/modules/ui/modal-focus.ts`

- Исходник: [открыть файл](../../public/modules/ui/modal-focus.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `createModalFocusScope`

<a id="public-modules-ui-onboarding-tour-ts"></a>
### `public/modules/ui/onboarding-tour.ts`

- Исходник: [открыть файл](../../public/modules/ui/onboarding-tour.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 16
- Ключевые символы: `activePanelId`, `back`, `clampX`, `clampY`, `end`, `hidePanel`, `initOnboardingTour`, `isAvailable`, `isVisible`, `next`, `onKey`, `place`, `render`, `showPanel`, `startOnboardingTour`, `startWhenFree`

<a id="public-modules-ui-panels-channel-monitor-ts"></a>
### `public/modules/ui/panels/channel-monitor.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/channel-monitor.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `buildChannelCell`, `buildRenderSignature`, `initChannelMonitor`, `isMonitorVisible`, `pickGamepad`, `readChannelSample`, `renderBoardStatus`, `renderChannelCell`, `resetPeaks`, `syncFreezeButton`, `toTrackPercent`

<a id="public-modules-ui-panels-drone-link-panel-ts"></a>
### `public/modules/ui/panels/drone-link-panel.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/drone-link-panel.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `clock`, `fixed`, `initDroneLinkPanel`, `kibibytes`, `notify`, `render`, `reportFailure`, `setChip`, `setMeter`, `setText`, `showConfirm`

<a id="public-modules-ui-panels-editor-docs-ts"></a>
### `public/modules/ui/panels/editor-docs.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-docs.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `close`, `initEditorDocs`, `open`

<a id="public-modules-ui-panels-editor-drawers-ts"></a>
### `public/modules/ui/panels/editor-drawers.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-drawers.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `announceEditorDrawerOpen`, `pinEditorPanelHorizontalScroll`, `setEditorDrawerState`

<a id="public-modules-ui-panels-editor-drone-upload-ts"></a>
### `public/modules/ui/panels/editor-drone-upload.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-drone-upload.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `initEditorDroneUpload`, `notify`, `onProgress`, `setStatus`, `syncAvailability`, `toErrorLike`

<a id="public-modules-ui-panels-editor-model-switch-ts"></a>
### `public/modules/ui/panels/editor-model-switch.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-model-switch.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initEditorModelSwitch`, `render`

<a id="public-modules-ui-panels-editor-terminal-ts"></a>
### `public/modules/ui/panels/editor-terminal.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-terminal.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 16
- Ключевые символы: `announceNew`, `close`, `createJournalLine`, `createSystemToggle`, `describe`, `endResize`, `fitProblems`, `fitProblemsSoon`, `headerHeight`, `initEditorTerminal`, `readShowSystem`, `render`, `resize`, `resizeBounds`, `syncLiveRegions`, `writeShowSystem`

<a id="public-modules-ui-panels-gamepad-dialog-ts"></a>
### `public/modules/ui/panels/gamepad-dialog.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/gamepad-dialog.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `close`, `initGamepadDialog`

<a id="public-modules-ui-panels-journal-lines-ts"></a>
### `public/modules/ui/panels/journal-lines.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/journal-lines.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `cleanJournalMessage`, `describeAutopilotApiCall`, `describeLogEntry`, `formatJournalTime`, `isDefaultJournalLine`

<a id="public-modules-ui-panels-led-matrix-ts"></a>
### `public/modules/ui/panels/led-matrix.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/led-matrix.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initLEDMatrixUI`

<a id="public-modules-ui-panels-notice-policy-ts"></a>
### `public/modules/ui/panels/notice-policy.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/notice-policy.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `noticeLifetimeMs`, `noticeRole`, `noticeSignature`, `pickToastToEvict`, `recordNotice`, `splitInlineCode`

<a id="public-modules-ui-panels-rail-a11y-ts"></a>
### `public/modules/ui/panels/rail-a11y.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-a11y.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `drawerButton`, `drawerIsOpen`, `editorIsOpen`, `editorPanel`, `initRailA11y`, `panelTabs`, `syncAll`, `syncCurrent`, `syncDocs`, `syncTheme`

<a id="public-modules-ui-panels-rail-status-ts"></a>
### `public/modules/ui/panels/rail-status.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-status.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initRailStatus`, `sync`

<a id="public-modules-ui-panels-rail-tooltip-ts"></a>
### `public/modules/ui/panels/rail-tooltip.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-tooltip.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `adoptAll`, `adoptTitle`, `buttonFrom`, `hide`, `initRailTooltip`, `labelOf`, `render`, `show`

<a id="public-modules-ui-panels-rail-visibility-ts"></a>
### `public/modules/ui/panels/rail-visibility.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-visibility.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `hasOpenPanel`, `initRailVisibility`, `isExpanded`, `sync`

<a id="public-modules-ui-panels-scene-stop-ts"></a>
### `public/modules/ui/panels/scene-stop.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/scene-stop.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `initSceneStop`, `sync`

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
- Обнаружено функций/методов: 15
- Ключевые символы: `closePanelWithAnimation`, `endResize`, `finishClosePanel`, `initSidebar`, `isMobileSidebar`, `openPanel`, `persistActivePanel`, `refreshViewportLayout`, `resetClosingState`, `restoreSidebarState`, `saveWidth`, `setActiveTabButton`, `syncResponsiveSidebarState`, `syncSidebarCollapsedState`, `widthKey`

<a id="public-modules-ui-panels-simulation-notice-ts"></a>
### `public/modules/ui/panels/simulation-notice.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/simulation-notice.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 16
- Ключевые символы: `armToastTimer`, `closeCenter`, `createActionButtons`, `dismissNewestToast`, `dismissToast`, `ensureToastStack`, `initSimulationNotice`, `pauseToast`, `remove`, `renderNotificationCenter`, `renderRichText`, `resumeToast`, `runNoticeAction`, `setCountChip`, `spawnToast`, `updateBadge`

<a id="public-modules-ui-panels-stats-ts"></a>
### `public/modules/ui/panels/stats.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/stats.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `applyStateChip`, `describeAutopilotState`, `getLedElements`, `getRunStateChip`, `updateBatteryBar`, `updateButtons`, `updateCameraParamsVisibility`, `updateFlightChart`, `updateFlightMode`, `updateLeds`, `updateStats`, `updateTelemetry`, `x`, `y`

<a id="public-modules-ui-panels-terminal-session-ts"></a>
### `public/modules/ui/panels/terminal-session.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/terminal-session.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `appendTerminalLine`, `createTerminalSession`, `executeTerminalCommand`, `matchesTerminalShortcut`, `navigateTerminalHistory`

<a id="public-modules-ui-panels-terminal-workbench-ts"></a>
### `public/modules/ui/panels/terminal-workbench.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/terminal-workbench.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `clickAction`, `initTerminalWorkbench`, `renderConsole`, `renderSessions`, `selectSession`, `selectView`, `updateLogs`

<a id="public-modules-ui-scene-hotbar-index-ts"></a>
### `public/modules/ui/scene-hotbar/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-hotbar/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 22
- Ключевые символы: `buildItemCard`, `close`, `ensurePlacementMarker`, `escapeHtml`, `initSceneHotbar`, `isSceneCanvasEvent`, `onPlacementPointerMove`, `optionsIn`, `placeArmedObjectAt`, `placementPointAt`, `placeVehicleAt`, `raycastPlaceableSurface`, `registerPlacementInterceptor`, `renderCategoryTabs`, `renderHint`, `renderItems`, `routeUnderCursor`, `selectCategory`, `setArmed`, `setMarkerVisible`, `startRouteAt`, `syncScrollFades`

<a id="public-modules-ui-scene-manager-bindings-ts"></a>
### `public/modules/ui/scene-manager/bindings.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyQuery`, `registerSceneManagerBindings`, `registerTabBindings`, `registerTreeBindings`, `setActiveTab`

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
- Обнаружено функций/методов: 21
- Ключевые символы: `applyPendingSelection`, `cancelScheduledPreview`, `changePage`, `clampPageIndex`, `closeModal`, `filterCatalog`, `focusModalCard`, `getAllOptions`, `getOptions`, `getPageCount`, `getPendingOption`, `isModalOpen`, `openModal`, `registerAddFormBindings`, `renderModalPage`, `schedulePreview`, `showCardPreview`, `syncModalSelectionSummary`, `syncPageIndicator`, `syncPageWithSelection`, `syncPreview`

<a id="public-modules-ui-scene-manager-bindings-scene-io-ts"></a>
### `public/modules/ui/scene-manager/bindings/scene-io.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings/scene-io.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `notify`, `registerSceneIoBindings`

<a id="public-modules-ui-scene-manager-bindings-shared-ts"></a>
### `public/modules/ui/scene-manager/bindings/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/bindings/shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-scene-manager-catalog-ts"></a>
### `public/modules/ui/scene-manager/catalog.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/catalog.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getCatalogCategory`, `matchesCatalogFilter`, `normalize`

<a id="public-modules-ui-scene-manager-dom-ts"></a>
### `public/modules/ui/scene-manager/dom.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/dom.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getSceneManagerDomRefs`

<a id="public-modules-ui-scene-manager-experience-ts"></a>
### `public/modules/ui/scene-manager/experience.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/experience.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `announce`, `choose`, `fit`, `registerAddObjectButton`, `registerPresetOptions`, `registerSceneExperience`, `sync`, `syncAddLabel`

<a id="public-modules-ui-scene-manager-index-ts"></a>
### `public/modules/ui/scene-manager/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `buildSceneManagerRenderSignature`, `getRenderState`, `initSceneManager`, `render`, `scheduleRender`

<a id="public-modules-ui-scene-manager-preset-missions-ts"></a>
### `public/modules/ui/scene-manager/preset-missions.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/preset-missions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

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
- Обнаружено функций/методов: 2
- Ключевые символы: `renderEmptyStateMarkup`, `renderSelectedDetailsMarkup`

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
- Обнаружено функций/методов: 1
- Ключевые символы: `escapeHtml`

<a id="public-modules-ui-scene-manager-render-icons-ts"></a>
### `public/modules/ui/scene-manager/render/icons.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/icons.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getSceneObjectIcon`, `hasSceneToken`

<a id="public-modules-ui-scene-manager-render-label-ts"></a>
### `public/modules/ui/scene-manager/render/label.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/label.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `formatObjectCount`, `getEntryKind`, `getEntryMeta`, `getEntryTitle`, `isGroundEntry`, `isGroupEntry`, `isPresetEntry`, `isProtectedEntry`, `matchesQuery`, `pluralizeRu`

<a id="public-modules-ui-scene-manager-render-list-ts"></a>
### `public/modules/ui/scene-manager/render/list.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/render/list.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `appendFolder`, `buildVisibleRows`, `createRow`, `focusRowMain`, `holdsSelection`, `renderObjectList`, `subtreeHasMatch`, `topLevel`, `walk`

<a id="public-modules-ui-scene-manager-scene-io-ts"></a>
### `public/modules/ui/scene-manager/scene-io.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-manager/scene-io.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `applySceneImport`, `buildSceneExport`, `parseSceneImport`, `restorePresetComponents`

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
- Обнаружено функций/методов: 5
- Ключевые символы: `clampFloors`, `clampInt`, `clampNumber`, `clampWindowFloor`, `formatSceneNumber`

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
- Обнаружено функций/методов: 3
- Ключевые символы: `findSceneTypeIcon`, `getSceneTypePreviewConfig`, `updateAddTypePreview`

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

<a id="public-modules-ui-scene-onboarding-ts"></a>
### `public/modules/ui/scene-onboarding.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-onboarding.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initSceneOnboarding`

<a id="public-modules-ui-vehicle-settings-ts"></a>
### `public/modules/ui/vehicle-settings.ts`

- Исходник: [открыть файл](../../public/modules/ui/vehicle-settings.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `apply`, `close`, `escapeHtml`, `fillDictionaries`, `initVehicleSettings`, `onChange`, `onKey`, `onOutside`, `openVehicleSettings`, `options`, `renderSummary`, `routesFor`

<a id="public-modules-ui-workspace-view-ts"></a>
### `public/modules/ui/workspace-view.ts`

- Исходник: [открыть файл](../../public/modules/ui/workspace-view.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `applyExpanded`, `applyPage`, `hasOpenPanel`, `initWorkspaceView`, `isEditorOpen`, `on.if`, `refreshViewports`, `sync`

