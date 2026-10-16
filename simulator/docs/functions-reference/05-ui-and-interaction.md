# Интерфейс и взаимодействие

UI-компоненты симулятора, панели, HUD, контекстные меню, логгер, управление сценой и пользовательские рабочие потоки.

## Состав группы

- [`public/modules/editor/autofit.ts`](#public-modules-editor-autofit-ts)
- [`public/modules/editor/blockly-mode/blockly-core.ts`](#public-modules-editor-blockly-mode-blockly-core-ts)
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
- [`public/modules/editor/blockly/legacy-values.ts`](#public-modules-editor-blockly-legacy-values-ts)
- [`public/modules/editor/blockly/support.ts`](#public-modules-editor-blockly-support-ts)
- [`public/modules/editor/blockly/toggle-controller.ts`](#public-modules-editor-blockly-toggle-controller-ts)
- [`public/modules/editor/blockly/workspace-controller.ts`](#public-modules-editor-blockly-workspace-controller-ts)
- [`public/modules/editor/dom.ts`](#public-modules-editor-dom-ts)
- [`public/modules/editor/index.ts`](#public-modules-editor-index-ts)
- [`public/modules/editor/index/api.ts`](#public-modules-editor-index-api-ts)
- [`public/modules/editor/index/controllers.ts`](#public-modules-editor-index-controllers-ts)
- [`public/modules/editor/index/helpers.ts`](#public-modules-editor-index-helpers-ts)
- [`public/modules/editor/index/runtime.ts`](#public-modules-editor-index-runtime-ts)
- [`public/modules/editor/index/session.ts`](#public-modules-editor-index-session-ts)
- [`public/modules/editor/index/shell.ts`](#public-modules-editor-index-shell-ts)
- [`public/modules/editor/index/state.ts`](#public-modules-editor-index-state-ts)
- [`public/modules/editor/index/temporary-document.ts`](#public-modules-editor-index-temporary-document-ts)
- [`public/modules/editor/monaco/completion.ts`](#public-modules-editor-monaco-completion-ts)
- [`public/modules/editor/monaco/completion/catalog.ts`](#public-modules-editor-monaco-completion-catalog-ts)
- [`public/modules/editor/monaco/completion/context.ts`](#public-modules-editor-monaco-completion-context-ts)
- [`public/modules/editor/monaco/completion/entries.ts`](#public-modules-editor-monaco-completion-entries-ts)
- [`public/modules/editor/monaco/completion/types.ts`](#public-modules-editor-monaco-completion-types-ts)
- [`public/modules/editor/monaco/hover.ts`](#public-modules-editor-monaco-hover-ts)
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
- [`public/modules/ui/mission-guide/academy/evaluation/signals-code.ts`](#public-modules-ui-mission-guide-academy-evaluation-signals-code-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/telemetry.ts`](#public-modules-ui-mission-guide-academy-evaluation-telemetry-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/time.ts`](#public-modules-ui-mission-guide-academy-evaluation-time-ts)
- [`public/modules/ui/mission-guide/academy/evaluation/vision.ts`](#public-modules-ui-mission-guide-academy-evaluation-vision-ts)
- [`public/modules/ui/mission-guide/academy/practices/camera-aruco.ts`](#public-modules-ui-mission-guide-academy-practices-camera-aruco-ts)
- [`public/modules/ui/mission-guide/academy/practices/drone.ts`](#public-modules-ui-mission-guide-academy-practices-drone-ts)
- [`public/modules/ui/mission-guide/academy/practices/flight.ts`](#public-modules-ui-mission-guide-academy-practices-flight-ts)
- [`public/modules/ui/mission-guide/academy/practices/index.ts`](#public-modules-ui-mission-guide-academy-practices-index-ts)
- [`public/modules/ui/mission-guide/academy/practices/shared.ts`](#public-modules-ui-mission-guide-academy-practices-shared-ts)
- [`public/modules/ui/mission-guide/academy/practices/signals-code.ts`](#public-modules-ui-mission-guide-academy-practices-signals-code-ts)
- [`public/modules/ui/mission-guide/academy/practices/telemetry.ts`](#public-modules-ui-mission-guide-academy-practices-telemetry-ts)
- [`public/modules/ui/mission-guide/academy/practices/time.ts`](#public-modules-ui-mission-guide-academy-practices-time-ts)
- [`public/modules/ui/mission-guide/academy/practices/vision-shared.ts`](#public-modules-ui-mission-guide-academy-practices-vision-shared-ts)
- [`public/modules/ui/mission-guide/academy/practices/visual-navigation.ts`](#public-modules-ui-mission-guide-academy-practices-visual-navigation-ts)
- [`public/modules/ui/mission-guide/academy/scene.ts`](#public-modules-ui-mission-guide-academy-scene-ts)
- [`public/modules/ui/mission-guide/course-navigation.ts`](#public-modules-ui-mission-guide-course-navigation-ts)
- [`public/modules/ui/mission-guide/curriculum.ts`](#public-modules-ui-mission-guide-curriculum-ts)
- [`public/modules/ui/mission-guide/curriculum/constants.ts`](#public-modules-ui-mission-guide-curriculum-constants-ts)
- [`public/modules/ui/mission-guide/curriculum/lua.ts`](#public-modules-ui-mission-guide-curriculum-lua-ts)
- [`public/modules/ui/mission-guide/curriculum/python.ts`](#public-modules-ui-mission-guide-curriculum-python-ts)
- [`public/modules/ui/mission-guide/evaluation/index.ts`](#public-modules-ui-mission-guide-evaluation-index-ts)
- [`public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts`](#public-modules-ui-mission-guide-evaluation-lua-led-sequence-ts)
- [`public/modules/ui/mission-guide/evaluation/lua-led-single.ts`](#public-modules-ui-mission-guide-evaluation-lua-led-single-ts)
- [`public/modules/ui/mission-guide/evaluation/text/graders.ts`](#public-modules-ui-mission-guide-evaluation-text-graders-ts)
- [`public/modules/ui/mission-guide/evaluation/text/index.ts`](#public-modules-ui-mission-guide-evaluation-text-index-ts)
- [`public/modules/ui/mission-guide/evaluation/text/snapshot.ts`](#public-modules-ui-mission-guide-evaluation-text-snapshot-ts)
- [`public/modules/ui/mission-guide/evaluation/text/timeline.ts`](#public-modules-ui-mission-guide-evaluation-text-timeline-ts)
- [`public/modules/ui/mission-guide/evaluation/text/trace.ts`](#public-modules-ui-mission-guide-evaluation-text-trace-ts)
- [`public/modules/ui/mission-guide/evaluation/xml.ts`](#public-modules-ui-mission-guide-evaluation-xml-ts)
- [`public/modules/ui/mission-guide/interactions.ts`](#public-modules-ui-mission-guide-interactions-ts)
- [`public/modules/ui/mission-guide/interactions/academy.ts`](#public-modules-ui-mission-guide-interactions-academy-ts)
- [`public/modules/ui/mission-guide/interactions/actions.ts`](#public-modules-ui-mission-guide-interactions-actions-ts)
- [`public/modules/ui/mission-guide/interactions/context.ts`](#public-modules-ui-mission-guide-interactions-context-ts)
- [`public/modules/ui/mission-guide/interactions/launch.ts`](#public-modules-ui-mission-guide-interactions-launch-ts)
- [`public/modules/ui/mission-guide/interactions/learning.ts`](#public-modules-ui-mission-guide-interactions-learning-ts)
- [`public/modules/ui/mission-guide/interactions/navigation.ts`](#public-modules-ui-mission-guide-interactions-navigation-ts)
- [`public/modules/ui/mission-guide/interactions/reference.ts`](#public-modules-ui-mission-guide-interactions-reference-ts)
- [`public/modules/ui/mission-guide/interactions/text-actions.ts`](#public-modules-ui-mission-guide-interactions-text-actions-ts)
- [`public/modules/ui/mission-guide/interactions/walkthrough.ts`](#public-modules-ui-mission-guide-interactions-walkthrough-ts)
- [`public/modules/ui/mission-guide/lessons.ts`](#public-modules-ui-mission-guide-lessons-ts)
- [`public/modules/ui/mission-guide/lessons/catalog/lua-text.ts`](#public-modules-ui-mission-guide-lessons-catalog-lua-text-ts)
- [`public/modules/ui/mission-guide/lessons/catalog/lua.ts`](#public-modules-ui-mission-guide-lessons-catalog-lua-ts)
- [`public/modules/ui/mission-guide/lessons/catalog/python-text.ts`](#public-modules-ui-mission-guide-lessons-catalog-python-text-ts)
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
- [`public/modules/ui/mission-guide/lessons/text/lua.ts`](#public-modules-ui-mission-guide-lessons-text-lua-ts)
- [`public/modules/ui/mission-guide/lessons/text/python.ts`](#public-modules-ui-mission-guide-lessons-text-python-ts)
- [`public/modules/ui/mission-guide/modal.ts`](#public-modules-ui-mission-guide-modal-ts)
- [`public/modules/ui/mission-guide/panel.ts`](#public-modules-ui-mission-guide-panel-ts)
- [`public/modules/ui/mission-guide/render.ts`](#public-modules-ui-mission-guide-render-ts)
- [`public/modules/ui/mission-guide/render/academy.ts`](#public-modules-ui-mission-guide-render-academy-ts)
- [`public/modules/ui/mission-guide/render/blockly-copy.ts`](#public-modules-ui-mission-guide-render-blockly-copy-ts)
- [`public/modules/ui/mission-guide/render/check-step.ts`](#public-modules-ui-mission-guide-render-check-step-ts)
- [`public/modules/ui/mission-guide/render/course-outline.ts`](#public-modules-ui-mission-guide-render-course-outline-ts)
- [`public/modules/ui/mission-guide/render/learning.ts`](#public-modules-ui-mission-guide-render-learning-ts)
- [`public/modules/ui/mission-guide/render/navigation.ts`](#public-modules-ui-mission-guide-render-navigation-ts)
- [`public/modules/ui/mission-guide/render/results.ts`](#public-modules-ui-mission-guide-render-results-ts)
- [`public/modules/ui/mission-guide/render/shared.ts`](#public-modules-ui-mission-guide-render-shared-ts)
- [`public/modules/ui/mission-guide/render/support.ts`](#public-modules-ui-mission-guide-render-support-ts)
- [`public/modules/ui/mission-guide/render/text-guide.ts`](#public-modules-ui-mission-guide-render-text-guide-ts)
- [`public/modules/ui/mission-guide/render/walkthrough.ts`](#public-modules-ui-mission-guide-render-walkthrough-ts)
- [`public/modules/ui/mission-guide/state.ts`](#public-modules-ui-mission-guide-state-ts)
- [`public/modules/ui/mission-guide/state/storage.ts`](#public-modules-ui-mission-guide-state-storage-ts)
- [`public/modules/ui/mission-guide/support/blockly-preview.ts`](#public-modules-ui-mission-guide-support-blockly-preview-ts)
- [`public/modules/ui/mission-guide/support/camera-view.ts`](#public-modules-ui-mission-guide-support-camera-view-ts)
- [`public/modules/ui/mission-guide/support/logging.ts`](#public-modules-ui-mission-guide-support-logging-ts)
- [`public/modules/ui/mission-guide/support/monaco-preview.ts`](#public-modules-ui-mission-guide-support-monaco-preview-ts)
- [`public/modules/ui/mission-guide/support/outline-navigation.ts`](#public-modules-ui-mission-guide-support-outline-navigation-ts)
- [`public/modules/ui/mission-guide/support/scene-preview.ts`](#public-modules-ui-mission-guide-support-scene-preview-ts)
- [`public/modules/ui/mission-guide/types.ts`](#public-modules-ui-mission-guide-types-ts)
- [`public/modules/ui/mission-guide/walkthrough/content.ts`](#public-modules-ui-mission-guide-walkthrough-content-ts)
- [`public/modules/ui/mission-guide/walkthrough/runtime.ts`](#public-modules-ui-mission-guide-walkthrough-runtime-ts)
- [`public/modules/ui/mission-guide/walkthrough/state.ts`](#public-modules-ui-mission-guide-walkthrough-state-ts)
- [`public/modules/ui/mobile-editor-viewport.ts`](#public-modules-ui-mobile-editor-viewport-ts)
- [`public/modules/ui/modal-focus.ts`](#public-modules-ui-modal-focus-ts)
- [`public/modules/ui/onboarding-tour.ts`](#public-modules-ui-onboarding-tour-ts)
- [`public/modules/ui/panels/channel-monitor.ts`](#public-modules-ui-panels-channel-monitor-ts)
- [`public/modules/ui/panels/editor-docs.ts`](#public-modules-ui-panels-editor-docs-ts)
- [`public/modules/ui/panels/editor-drawers.ts`](#public-modules-ui-panels-editor-drawers-ts)
- [`public/modules/ui/panels/editor-terminal.ts`](#public-modules-ui-panels-editor-terminal-ts)
- [`public/modules/ui/panels/led-matrix.ts`](#public-modules-ui-panels-led-matrix-ts)
- [`public/modules/ui/panels/rail-tooltip.ts`](#public-modules-ui-panels-rail-tooltip-ts)
- [`public/modules/ui/panels/rail-visibility.ts`](#public-modules-ui-panels-rail-visibility-ts)
- [`public/modules/ui/panels/sidebar-debug.ts`](#public-modules-ui-panels-sidebar-debug-ts)
- [`public/modules/ui/panels/sidebar.ts`](#public-modules-ui-panels-sidebar-ts)
- [`public/modules/ui/panels/simulation-notice.ts`](#public-modules-ui-panels-simulation-notice-ts)
- [`public/modules/ui/panels/stats.ts`](#public-modules-ui-panels-stats-ts)
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
- [`public/modules/ui/viewport-anchor.ts`](#public-modules-ui-viewport-anchor-ts)
- [`public/modules/ui/workspace-view.ts`](#public-modules-ui-workspace-view-ts)

## Файлы

<a id="public-modules-editor-autofit-ts"></a>
### `public/modules/editor/autofit.ts`

- Исходник: [открыть файл](../../public/modules/editor/autofit.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 18
- Ключевые символы: `applySidebarAutofitWidth`, `autoExpandEditorPanelToContent`, `boundingBox`, `clampSidebarWidth`, `expandEditorPanelForBlockly`, `getBlocklyBlocksWidth`, `getRequiredBlocklySidebarWidth`, `getRequiredLuaSidebarWidth`, `getSidebarChromeWidth`, `getSidebarCurrentWidth`, `getSidebarPanelsElement`, `isMobileSidebarLayout`, `isStarterLuaScript`, `maybeAutoExpandTextEditorPanel`, `measureTextWidth`, `normalizeMultilineText`, `restoreEditorPanelWidthAfterBlockly`, `scheduleEditorPanelAutofit`

<a id="public-modules-editor-blockly-mode-blockly-core-ts"></a>
### `public/modules/editor/blockly-mode/blockly-core.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly-mode/blockly-core.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `applyRussianMessages`, `getBlocklyGenerator`, `initBlocklyDefinitions`, `registerRussianGeneratorHooks`

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
- Обнаружено функций/методов: 9
- Ключевые символы: `buildHeaderDefinitions`, `collectDefinitionsText`, `collectTopLevelParts`, `compilePioneerLuaSource`, `compilePioneerPythonSource`, `compilePioneerWorkspace`, `getGenerator`, `joinStatements`, `statementCode`

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
- Обнаружено функций/методов: 8
- Ключевые символы: `compileGeneratorWorkspace`, `compileMainEditorWorkspace`, `createRawCodeWorkspaceXml`, `createStarterWorkspaceXml`, `escapeXml`, `getRawCodeBlockType`, `getWorkspaceTopBlocks`, `hasOnlySingleRawCodeBlock`

<a id="public-modules-editor-blockly-ts"></a>
### `public/modules/editor/blockly.ts`

- Исходник: [открыть файл](../../public/modules/editor/blockly.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

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
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureBlocklyWorkspace`, `loadBlocklyWorkspace`, `retargetBlocklyWorkspace`, `saveBlocklyWorkspaceState`

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
- Обнаружено функций/методов: 20
- Ключевые символы: `beginTemporaryEditorDocument`, `ensureBlocklyWorkspace`, `getEditorControllers`, `getEditorValue`, `getMainBlocklyWorkspace`, `getSavedEditorDraft`, `initEditor`, `isBlocklyEditorEnabled`, `layoutEditor`, `loadBlocklyWorkspace`, `loadMainBlocklyXml`, `restoreTemporaryEditorDocument`, `retargetBlocklyWorkspace`, `revealEditorStart`, `saveBlocklyWorkspaceState`, `setBlocklyEditorEnabled`, `setEditorLanguage`, `setEditorTheme`, `setEditorValue`, `syncScriptLanguageSelect`

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

<a id="public-modules-editor-monaco-completion-catalog-ts"></a>
### `public/modules/editor/monaco/completion/catalog.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/catalog.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildCompletionCatalog`, `getOwnerMembers`, `inferLuaMemberSeparator`, `LUA_EV_ENTRIES`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `getLuaCompletionEntries`, `getPythonCompletionEntries`

<a id="public-modules-editor-monaco-completion-types-ts"></a>
### `public/modules/editor/monaco/completion/types.ts`

- Исходник: [открыть файл](../../public/modules/editor/monaco/completion/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `createDocEntry`, `dedupeDocEntries`, `dedupeSuggestions`, `parseApiMemberKey`

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
- Обнаружено функций/методов: 3
- Ключевые символы: `ensureBlocklyThemesBuilt`, `getBlocklyTheme`, `getBlocklyThemeByName`

<a id="public-modules-editor-text-editor-ts"></a>
### `public/modules/editor/text-editor.ts`

- Исходник: [открыть файл](../../public/modules/editor/text-editor.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `clearFallbackEditorProblemHighlight`, `clearTextEditorProblemHighlight`, `createTextEditorInstance`, `disposeTextEditorInstance`, `ensureOverflowWidgetsContainer`, `getCurrentAppTheme`, `getFallbackEditorElement`, `getMonacoLanguage`, `getMonacoThemeName`, `getTextEditorValueFromInstance`, `highlightFallbackEditorProblem`, `highlightTextEditorProblem`, `initializeMonacoEnvironment`, `layoutTextEditorInstance`, `normalizeEditorText`, `scheduleEditorFontRemeasure`, `setTextEditorLanguageOnInstance`, `setTextEditorTheme`, `setTextEditorValueOnInstance`, `syncEditorProblemHandlers`

<a id="public-modules-ui-api-docs-index-ts"></a>
### `public/modules/ui/api-docs/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/api-docs/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `attachInteractions`, `destroyPreviews`, `escapeHtml`, `highlightApiCode`, `mountOpenPreview`, `openApiDocsCatalog`, `renderApiDocs`, `renderDirectionTag`, `renderEntry`, `renderEntryBody`, `renderFact`, `renderPreviewShell`, `renderSections`, `renderToolbar`, `restoreSearchSelection`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `initCameraModeUI`, `resync`, `slideIndicatorTo`, `syncGroup`

<a id="public-modules-ui-controls-file-controls-ts"></a>
### `public/modules/ui/controls/file-controls.ts`

- Исходник: [открыть файл](../../public/modules/ui/controls/file-controls.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `initFileControls`, `populateFileOptions`, `refreshFileList`

<a id="public-modules-ui-environment-control-ts"></a>
### `public/modules/ui/environment-control.ts`

- Исходник: [открыть файл](../../public/modules/ui/environment-control.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `initEnvironmentControl`, `render`, `renderWeather`, `setOpen`

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
- Обнаружено функций/методов: 10
- Ключевые символы: `applyToCurrentDroneConnection`, `bind`, `createConnectionPanel`, `focusBridgeToggle`, `focusConnectionCard`, `renderBridgeCard`, `renderConnectionForm`, `setBridgeStatus`, `updateActionsState`, `updateConnectionModeHint`

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
- Обнаружено функций/методов: 7
- Ключевые символы: `bind`, `createDroneListPanel`, `deleteDrone`, `focusRow`, `itemFromEvent`, `switchDrone`, `updateList`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `error`, `gradeDroneAcademy`

<a id="public-modules-ui-mission-guide-academy-evaluation-flight-ts"></a>
### `public/modules/ui/mission-guide/academy/evaluation/flight.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/evaluation/flight.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `fail`, `gradeFlightAcademy`, `near`

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
- Обнаружено функций/методов: 17
- Ключевые символы: `center`, `centered`, `checkPrintedGeometry`, `error`, `expectPair`, `fail`, `fresh`, `gradeVisionAcademy`, `hasMessage`, `near`, `numbers`, `previousDetection`, `recovered`, `side`, `stableBefore`, `visible`, `zero`

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
- Обнаружено функций/методов: 3
- Ключевые символы: `flightBody`, `getFlightAcademyPractices`, `point`

<a id="public-modules-ui-mission-guide-academy-practices-index-ts"></a>
### `public/modules/ui/mission-guide/academy/practices/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/academy/practices/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getAcademyTextPractices`, `isAcademyPracticeReady`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `callback`, `flight`, `getTelemetryAcademyPractices`, `measure`

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

<a id="public-modules-ui-mission-guide-course-navigation-ts"></a>
### `public/modules/ui/mission-guide/course-navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/course-navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `academyCompletedCount`, `isAcademyLessonComplete`, `switchGuideTrack`

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

<a id="public-modules-ui-mission-guide-evaluation-index-ts"></a>
### `public/modules/ui/mission-guide/evaluation/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `callback`, `evaluateLesson`, `getCallbackDiagnostics`, `hasRequiredBlockOccurrences`, `solvedDiagnostic`, `uniqueDiagnostics`

<a id="public-modules-ui-mission-guide-evaluation-lua-led-sequence-ts"></a>
### `public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/lua-led-sequence.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `getStructureDiagnostics`, `matchesLedSet`, `matchesLuaLedSequenceWorkspace`, `matchesTimerDelay`, `validateLuaLedSequenceWorkspace`

<a id="public-modules-ui-mission-guide-evaluation-lua-led-single-ts"></a>
### `public/modules/ui/mission-guide/evaluation/lua-led-single.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/evaluation/lua-led-single.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `validateLuaLedSingleWorkspace`

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

<a id="public-modules-ui-mission-guide-interactions-academy-ts"></a>
### `public/modules/ui/mission-guide/interactions/academy.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/academy.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachAcademyBindings`

<a id="public-modules-ui-mission-guide-interactions-actions-ts"></a>
### `public/modules/ui/mission-guide/interactions/actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/actions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `attachGuideActionBindings`, `executeLessonLaunch`, `getMainWorkspaceSnapshot`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `canLaunchLesson`, `launchLesson`

<a id="public-modules-ui-mission-guide-interactions-learning-ts"></a>
### `public/modules/ui/mission-guide/interactions/learning.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/learning.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachLearningInteractions`

<a id="public-modules-ui-mission-guide-interactions-navigation-ts"></a>
### `public/modules/ui/mission-guide/interactions/navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `attachGuideNavigationBindings`

<a id="public-modules-ui-mission-guide-interactions-reference-ts"></a>
### `public/modules/ui/mission-guide/interactions/reference.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/reference.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `openGuideReference`

<a id="public-modules-ui-mission-guide-interactions-text-actions-ts"></a>
### `public/modules/ui/mission-guide/interactions/text-actions.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/text-actions.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `attachTextGuideBindings`, `runTextCheck`

<a id="public-modules-ui-mission-guide-interactions-walkthrough-ts"></a>
### `public/modules/ui/mission-guide/interactions/walkthrough.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/interactions/walkthrough.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `attachWalkthroughBindings`, `getWalkthroughSource`, `move`, `source`

<a id="public-modules-ui-mission-guide-lessons-ts"></a>
### `public/modules/ui/mission-guide/lessons.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getGuideLessonState`

<a id="public-modules-ui-mission-guide-lessons-catalog-lua-text-ts"></a>
### `public/modules/ui/mission-guide/lessons/catalog/lua-text.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/catalog/lua-text.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLuaTextLessonState`

<a id="public-modules-ui-mission-guide-lessons-catalog-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/catalog/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/catalog/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLuaLessonState`

<a id="public-modules-ui-mission-guide-lessons-catalog-python-text-ts"></a>
### `public/modules/ui/mission-guide/lessons/catalog/python-text.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/catalog/python-text.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `getPythonTextLessonState`

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

<a id="public-modules-ui-mission-guide-lessons-text-lua-ts"></a>
### `public/modules/ui/mission-guide/lessons/text/lua.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/text/lua.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `getLuaTextLessons`

<a id="public-modules-ui-mission-guide-lessons-text-python-ts"></a>
### `public/modules/ui/mission-guide/lessons/text/python.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/lessons/text/python.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getPythonTextLessons`, `withPrologue`

<a id="public-modules-ui-mission-guide-modal-ts"></a>
### `public/modules/ui/mission-guide/modal.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/modal.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `hide`, `initMissionGuideModal`, `show`, `syncGuideButtonState`, `syncOutlineVisibility`, `syncTrackSwitchState`

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

<a id="public-modules-ui-mission-guide-render-academy-ts"></a>
### `public/modules/ui/mission-guide/render/academy.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/academy.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `renderAcademyRoadmap`

<a id="public-modules-ui-mission-guide-render-blockly-copy-ts"></a>
### `public/modules/ui/mission-guide/render/blockly-copy.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/blockly-copy.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `blocklyLessonCopy`, `blocklyPracticeSteps`, `blocklyTopic`, `EV`

<a id="public-modules-ui-mission-guide-render-check-step-ts"></a>
### `public/modules/ui/mission-guide/render/check-step.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/check-step.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `renderCheckStep`, `renderResultScene`, `sortDiagnostics`

<a id="public-modules-ui-mission-guide-render-course-outline-ts"></a>
### `public/modules/ui/mission-guide/render/course-outline.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/course-outline.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `renderCourseOutline`, `renderIntro`

<a id="public-modules-ui-mission-guide-render-learning-ts"></a>
### `public/modules/ui/mission-guide/render/learning.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/learning.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `getLearningNote`, `getTopic`, `renderColorExperiment`, `renderLearningNote`, `renderPracticeBrief`

<a id="public-modules-ui-mission-guide-render-navigation-ts"></a>
### `public/modules/ui/mission-guide/render/navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `renderLessonSteps`, `renderRunBanner`

<a id="public-modules-ui-mission-guide-render-results-ts"></a>
### `public/modules/ui/mission-guide/render/results.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/results.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `renderAltitude`, `renderCheckVerdict`, `renderFlightRecord`, `renderPoints`, `renderScenePlaceholder`, `renderSegments`

<a id="public-modules-ui-mission-guide-render-shared-ts"></a>
### `public/modules/ui/mission-guide/render/shared.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/shared.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `escapeHtml`, `getBlockMap`, `renderApiFocusItem`, `renderDiagnosticCard`, `renderInline`, `renderLessonFooter`, `renderLessonHeader`, `renderTargetRoute`

<a id="public-modules-ui-mission-guide-render-support-ts"></a>
### `public/modules/ui/mission-guide/render/support.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/support.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-render-text-guide-ts"></a>
### `public/modules/ui/mission-guide/render/text-guide.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/text-guide.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `renderTextBuildStep`, `renderTextCheckStep`, `renderTextGuide`

<a id="public-modules-ui-mission-guide-render-walkthrough-ts"></a>
### `public/modules/ui/mission-guide/render/walkthrough.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/render/walkthrough.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `gateHint`, `renderIdea`, `renderWalkthrough`, `uniqueApiList`

<a id="public-modules-ui-mission-guide-state-ts"></a>
### `public/modules/ui/mission-guide/state.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/state.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 31
- Ключевые символы: `ensureActiveChapterId`, `ensureActiveLessonId`, `getActiveChapter`, `getActiveLesson`, `getActivePracticeTrack`, `getActiveTab`, `getActiveTextLesson`, `getFirstUnlockedLesson`, `getLessonBanner`, `getLessonIndex`, `getLessonsForChapter`, `getNextLesson`, `getNextTextLesson`, `getPreviousLesson`, `getPreviousTextLesson`, `getStateKey`, `getTextLessonIndex`, `isLessonChecked`, `isLessonCompleted`, `isLessonUnlocked`, `isTextLessonUnlocked`, `persistCurrentGuideSessionState`, `setActiveChapterId`, `setActiveGuideStep`, `setActiveLessonId`, `setActivePortalPage`, `setActivePracticeTrack`, `setActiveTab`, `setLessonBanner`, `setLessonChecked`, `setLessonCompleted`

<a id="public-modules-ui-mission-guide-state-storage-ts"></a>
### `public/modules/ui/mission-guide/state/storage.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/state/storage.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `createDefaultSessionState`, `loadGuideProgress`, `loadGuideSessionState`, `parseActiveStepByLessonKey`, `persistGuideProgress`, `persistGuideSessionState`

<a id="public-modules-ui-mission-guide-support-blockly-preview-ts"></a>
### `public/modules/ui/mission-guide/support/blockly-preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/blockly-preview.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `applyLessonToolbox`, `ensureModalBodyObserver`, `getBlocklyCanvasHost`, `getPreviewHost`, `isMissionGuideBlocklyPreviewActive`, `mountMissionGuideBlocklyPreview`, `reattachIfNeeded`, `resizeBlocklySoon`, `restoreMissionGuideBlocklyPreview`, `triggerResize`

<a id="public-modules-ui-mission-guide-support-camera-view-ts"></a>
### `public/modules/ui/mission-guide/support/camera-view.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/camera-view.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `captureCameraView`, `restoreCameraView`

<a id="public-modules-ui-mission-guide-support-logging-ts"></a>
### `public/modules/ui/mission-guide/support/logging.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/logging.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `formatCompactDetails`, `logGuideEvent`, `normalizeDetailValue`, `summarizeGuideDiagnostics`

<a id="public-modules-ui-mission-guide-support-monaco-preview-ts"></a>
### `public/modules/ui/mission-guide/support/monaco-preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/monaco-preview.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `ensureModalBodyObserver`, `getMissionGuideDraft`, `getMonacoRoot`, `getPreviewHost`, `layoutMonacoSoon`, `mountMissionGuideMonacoPreview`, `reattachIfNeeded`, `restoreMissionGuideMonacoPreview`, `saveMissionGuideDraft`

<a id="public-modules-ui-mission-guide-support-outline-navigation-ts"></a>
### `public/modules/ui/mission-guide/support/outline-navigation.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/outline-navigation.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `focusCourseContent`, `focusCourseOutline`, `setCourseOutlineOpen`

<a id="public-modules-ui-mission-guide-support-scene-preview-ts"></a>
### `public/modules/ui/mission-guide/support/scene-preview.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/support/scene-preview.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `debugPreviewZoom`, `getPreviewHost`, `getRendererHitState`, `getSceneContainer`, `installPreviewGestureGuards`, `isMissionGuideScenePreviewActive`, `mountMissionGuideScenePreview`, `preventGestureDefault`, `preventWheelDefault`, `resizeSceneSoon`, `restoreMissionGuideScenePreview`, `setMissionGuideScenePreviewActive`

<a id="public-modules-ui-mission-guide-types-ts"></a>
### `public/modules/ui/mission-guide/types.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/types.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-walkthrough-content-ts"></a>
### `public/modules/ui/mission-guide/walkthrough/content.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/walkthrough/content.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getWalkthroughContent`, `getWalkthroughTopic`, `shuffleChoices`

<a id="public-modules-ui-mission-guide-walkthrough-runtime-ts"></a>
### `public/modules/ui/mission-guide/walkthrough/runtime.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/walkthrough/runtime.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-ui-mission-guide-walkthrough-state-ts"></a>
### `public/modules/ui/mission-guide/walkthrough/state.ts`

- Исходник: [открыть файл](../../public/modules/ui/mission-guide/walkthrough/state.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `answerWalkthrough`, `beginWalkthroughCheck`, `canCompleteWalkthrough`, `finishWalkthroughCheck`, `getWalkthroughProgress`, `getWalkthroughResult`, `isWalkthroughBusy`, `isWalkthroughCheckCurrent`, `load`, `moveWalkthrough`, `parseWalkthroughProgress`, `resetWalkthroughResult`, `save`, `syncWalkthroughSession`, `walkthroughKey`

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
- Обнаружено функций/методов: 12
- Ключевые символы: `back`, `clampX`, `clampY`, `end`, `initOnboardingTour`, `isAvailable`, `isVisible`, `next`, `onKey`, `place`, `render`, `startOnboardingTour`

<a id="public-modules-ui-panels-channel-monitor-ts"></a>
### `public/modules/ui/panels/channel-monitor.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/channel-monitor.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `buildChannelCell`, `buildRenderSignature`, `initChannelMonitor`, `isMonitorVisible`, `pickGamepad`, `readChannelSample`, `renderBoardStatus`, `renderChannelCell`, `resetPeaks`, `syncFreezeButton`, `toTrackPercent`

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

<a id="public-modules-ui-panels-editor-terminal-ts"></a>
### `public/modules/ui/panels/editor-terminal.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/editor-terminal.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `close`, `endResize`, `initEditorTerminal`, `render`, `resize`, `resizeBounds`

<a id="public-modules-ui-panels-led-matrix-ts"></a>
### `public/modules/ui/panels/led-matrix.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/led-matrix.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `initLEDMatrixUI`

<a id="public-modules-ui-panels-rail-tooltip-ts"></a>
### `public/modules/ui/panels/rail-tooltip.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-tooltip.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `adoptAll`, `adoptTitle`, `buttonFrom`, `hide`, `initRailTooltip`, `labelOf`, `show`

<a id="public-modules-ui-panels-rail-visibility-ts"></a>
### `public/modules/ui/panels/rail-visibility.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/rail-visibility.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `hasOpenPanel`, `initRailVisibility`, `isExpanded`, `sync`

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
- Обнаружено функций/методов: 7
- Ключевые символы: `closeCenter`, `dismissToast`, `ensureToastStack`, `initSimulationNotice`, `renderNotificationCenter`, `spawnToast`, `updateBadge`

<a id="public-modules-ui-panels-stats-ts"></a>
### `public/modules/ui/panels/stats.ts`

- Исходник: [открыть файл](../../public/modules/ui/panels/stats.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `getLedElements`, `getStatusLabel`, `getStatusTone`, `updateBatteryBar`, `updateButtons`, `updateCameraParamsVisibility`, `updateFlightMode`, `updateLeds`, `updateStats`, `updateTelemetry`

<a id="public-modules-ui-scene-hotbar-index-ts"></a>
### `public/modules/ui/scene-hotbar/index.ts`

- Исходник: [открыть файл](../../public/modules/ui/scene-hotbar/index.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 21
- Ключевые символы: `buildItemCard`, `close`, `ensurePlacementMarker`, `escapeHtml`, `initSceneHotbar`, `isSceneCanvasEvent`, `onPlacementPointerMove`, `optionsIn`, `placeArmedObjectAt`, `placeVehicleAt`, `raycastPlaceableSurface`, `registerPlacementInterceptor`, `renderCategoryTabs`, `renderHint`, `renderItems`, `routeUnderCursor`, `selectCategory`, `setArmed`, `setMarkerVisible`, `startRouteAt`, `syncScrollFades`

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
- Обнаружено функций/методов: 1
- Ключевые символы: `registerSceneIoBindings`

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
- Обнаружено функций/методов: 5
- Ключевые символы: `buildVisibleRows`, `createRow`, `renderObjectList`, `subtreeHasMatch`, `walk`

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

<a id="public-modules-ui-viewport-anchor-ts"></a>
### `public/modules/ui/viewport-anchor.ts`

- Исходник: [открыть файл](../../public/modules/ui/viewport-anchor.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getAnchorRect`, `initViewportAnchor`, `syncPositions`

<a id="public-modules-ui-workspace-view-ts"></a>
### `public/modules/ui/workspace-view.ts`

- Исходник: [открыть файл](../../public/modules/ui/workspace-view.ts)
- Кратко: Пользовательский интерфейс и рабочие панели симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyPage`, `hasOpenPanel`, `initWorkspaceView`, `isEditorOpen`, `sync`

