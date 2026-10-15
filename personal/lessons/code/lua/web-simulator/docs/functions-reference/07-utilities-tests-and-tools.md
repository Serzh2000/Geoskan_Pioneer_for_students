# Утилиты, тесты и инструменты

Вспомогательные функции общего назначения, автоматические тесты и инженерные скрипты для генерации или обслуживания проекта.

## Состав группы

- [`.claude/launch.json`](#claude-launch-json)
- [`.dbg/pioneer-check.json`](#dbg-pioneer-check-json)
- [`.tmp/pioneer-device-session/python-packages/pyserial-3.5.dist-info/metadata.json`](#tmp-pioneer-device-session-python-packages-pyserial-3-5-dist-info-metadata-json)
- [`.tmp/pioneer-firmware-research/fengari-bytecode-result.json`](#tmp-pioneer-firmware-research-fengari-bytecode-result-json)
- [`.tmp/pioneer-firmware-research/jar-index.json`](#tmp-pioneer-firmware-research-jar-index-json)
- [`.tmp/pioneer-firmware-research/modern-crypto-refs.json`](#tmp-pioneer-firmware-research-modern-crypto-refs-json)
- [`.tmp/pioneer-firmware-research/official-doc-tree.json`](#tmp-pioneer-firmware-research-official-doc-tree-json)
- [`.tmp/pioneer-firmware-research/repro/evidence.json`](#tmp-pioneer-firmware-research-repro-evidence-json)
- [`docs/design/rail-redesign.html`](#docs-design-rail-redesign-html)
- [`docs/map-generation-check.json`](#docs-map-generation-check-json)
- [`docs/panel-style-ownership-audit.json`](#docs-panel-style-ownership-audit-json)
- [`docs/pioneer-lua-research-evidence.json`](#docs-pioneer-lua-research-evidence-json)
- [`docs/premium-audit-final.json`](#docs-premium-audit-final-json)
- [`docs/premium-learning-audit.json`](#docs-premium-learning-audit-json)
- [`docs/premium-textbook-audit.json`](#docs-premium-textbook-audit-json)
- [`docs/premium-workspace-audit.json`](#docs-premium-workspace-audit-json)
- [`docs/project-map/.obsidian/app.json`](#docs-project-map-obsidian-app-json)
- [`docs/project-map/.obsidian/appearance.json`](#docs-project-map-obsidian-appearance-json)
- [`docs/project-map/.obsidian/core-plugins.json`](#docs-project-map-obsidian-core-plugins-json)
- [`docs/project-map/.obsidian/workspace.json`](#docs-project-map-obsidian-workspace-json)
- [`docs/workspace-eslint-summary.json`](#docs-workspace-eslint-summary-json)
- [`examples-python/advanced_navigation/camera_params_yaml.yaml`](#examples-python-advanced-navigation-camera-params-yaml-yaml)
- [`examples-python/advanced_navigation/map_json_example.json`](#examples-python-advanced-navigation-map-json-example-json)
- [`jest.config.js`](#jest-config-js)
- [`package-lock.json`](#package-lock-json)
- [`premium-ui.json`](#premium-ui-json)
- [`public/assets/models/pioneer/pioneer-basic.json`](#public-assets-models-pioneer-pioneer-basic-json)
- [`public/assets/models/props/landscape-kit-v1.manifest.json`](#public-assets-models-props-landscape-kit-v1-manifest-json)
- [`public/assets/models/props/landscape-kit-v1.mesh.json`](#public-assets-models-props-landscape-kit-v1-mesh-json)
- [`public/assets/models/props/landscape-kit-v2.manifest.json`](#public-assets-models-props-landscape-kit-v2-manifest-json)
- [`public/assets/models/props/landscape-kit-v2.mesh.json`](#public-assets-models-props-landscape-kit-v2-mesh-json)
- [`public/assets/models/props/landscape-kit-v3.manifest.json`](#public-assets-models-props-landscape-kit-v3-manifest-json)
- [`public/assets/models/props/landscape-kit-v3.mesh.json`](#public-assets-models-props-landscape-kit-v3-mesh-json)
- [`public/assets/models/props/landscape-kit-v4.manifest.json`](#public-assets-models-props-landscape-kit-v4-manifest-json)
- [`public/assets/models/props/landscape-kit-v4.mesh.json`](#public-assets-models-props-landscape-kit-v4-mesh-json)
- [`public/assets/models/props/landscape-kit-v5.manifest.json`](#public-assets-models-props-landscape-kit-v5-manifest-json)
- [`public/assets/models/props/landscape-kit-v5.mesh.json`](#public-assets-models-props-landscape-kit-v5-mesh-json)
- [`public/assets/models/props/mission-assets-v1.manifest.json`](#public-assets-models-props-mission-assets-v1-manifest-json)
- [`public/assets/models/props/mission-assets-v1.mesh.json`](#public-assets-models-props-mission-assets-v1-mesh-json)
- [`public/assets/models/props/training-props-v2.json`](#public-assets-models-props-training-props-v2-json)
- [`public/fragments/layout/main-scene.html`](#public-fragments-layout-main-scene-html)
- [`public/fragments/layout/sidebar-panels.html`](#public-fragments-layout-sidebar-panels-html)
- [`public/fragments/layout/sidebar-tabs.html`](#public-fragments-layout-sidebar-tabs-html)
- [`public/fragments/modals/gamepad-wizard.html`](#public-fragments-modals-gamepad-wizard-html)
- [`public/fragments/panels/docs.html`](#public-fragments-panels-docs-html)
- [`public/fragments/panels/drones.html`](#public-fragments-panels-drones-html)
- [`public/fragments/panels/editor.html`](#public-fragments-panels-editor-html)
- [`public/fragments/panels/gamepad.html`](#public-fragments-panels-gamepad-html)
- [`public/fragments/panels/gamepad/mapping-pane.html`](#public-fragments-panels-gamepad-mapping-pane-html)
- [`public/fragments/panels/gamepad/monitor-pane.html`](#public-fragments-panels-gamepad-monitor-pane-html)
- [`public/fragments/panels/logs.html`](#public-fragments-panels-logs-html)
- [`public/fragments/panels/manager.html`](#public-fragments-panels-manager-html)
- [`public/fragments/panels/manager/hierarchy.html`](#public-fragments-panels-manager-hierarchy-html)
- [`public/fragments/panels/manager/inspector.html`](#public-fragments-panels-manager-inspector-html)
- [`public/fragments/panels/settings.html`](#public-fragments-panels-settings-html)
- [`public/fragments/panels/telemetry.html`](#public-fragments-panels-telemetry-html)
- [`public/index.html`](#public-index-html)
- [`public/modules/app/animation-loop.ts`](#public-modules-app-animation-loop-ts)
- [`public/modules/app/global-error.ts`](#public-modules-app-global-error-ts)
- [`public/modules/app/language-selector.ts`](#public-modules-app-language-selector-ts)
- [`public/modules/app/script-execution-notice-templates.ts`](#public-modules-app-script-execution-notice-templates-ts)
- [`public/modules/app/script-execution-notice.ts`](#public-modules-app-script-execution-notice-ts)
- [`public/modules/app/script-execution-notice/error.ts`](#public-modules-app-script-execution-notice-error-ts)
- [`public/modules/app/script-execution-notice/humanize-lua.ts`](#public-modules-app-script-execution-notice-humanize-lua-ts)
- [`public/modules/app/script-execution-notice/humanize-python.ts`](#public-modules-app-script-execution-notice-humanize-python-ts)
- [`public/modules/app/script-execution-notice/humanize.ts`](#public-modules-app-script-execution-notice-humanize-ts)
- [`public/modules/app/script-execution-notice/lua-validation.ts`](#public-modules-app-script-execution-notice-lua-validation-ts)
- [`public/modules/app/script-execution-notice/python-validation.ts`](#public-modules-app-script-execution-notice-python-validation-ts)
- [`public/modules/app/script-execution-notice/state.ts`](#public-modules-app-script-execution-notice-state-ts)
- [`public/modules/app/script-execution-notice/types.ts`](#public-modules-app-script-execution-notice-types-ts)
- [`public/modules/app/simulation-controls.ts`](#public-modules-app-simulation-controls-ts)
- [`public/modules/app/theme-toggle.ts`](#public-modules-app-theme-toggle-ts)
- [`public/modules/autopilot/fsm-internals.ts`](#public-modules-autopilot-fsm-internals-ts)
- [`public/modules/autopilot/fsm-runtime.ts`](#public-modules-autopilot-fsm-runtime-ts)
- [`public/modules/autopilot/fsm.ts`](#public-modules-autopilot-fsm-ts)
- [`public/modules/autopilot/mce-events.ts`](#public-modules-autopilot-mce-events-ts)
- [`public/modules/autopilot/params-effects.ts`](#public-modules-autopilot-params-effects-ts)
- [`public/modules/autopilot/params-runtime.ts`](#public-modules-autopilot-params-runtime-ts)
- [`public/modules/core/learning-journal.ts`](#public-modules-core-learning-journal-ts)
- [`public/modules/core/mission-notices.ts`](#public-modules-core-mission-notices-ts)
- [`public/modules/core/script-failure.ts`](#public-modules-core-script-failure-ts)
- [`public/modules/core/state-drone.ts`](#public-modules-core-state-drone-ts)
- [`public/modules/core/state-types.ts`](#public-modules-core-state-types-ts)
- [`public/modules/core/state.ts`](#public-modules-core-state-ts)
- [`public/modules/docs/api-docs-events.ts`](#public-modules-docs-api-docs-events-ts)
- [`public/modules/docs/api-docs-types.ts`](#public-modules-docs-api-docs-types-ts)
- [`public/modules/docs/api-docs.ts`](#public-modules-docs-api-docs-ts)
- [`public/modules/docs/lua-api-docs-events.ts`](#public-modules-docs-lua-api-docs-events-ts)
- [`public/modules/docs/lua-api-docs-flight.ts`](#public-modules-docs-lua-api-docs-flight-ts)
- [`public/modules/docs/lua-api-docs-runtime.ts`](#public-modules-docs-lua-api-docs-runtime-ts)
- [`public/modules/docs/lua-api-docs.ts`](#public-modules-docs-lua-api-docs-ts)
- [`public/modules/docs/python-api-docs.ts`](#public-modules-docs-python-api-docs-ts)
- [`public/modules/sensors/downward.ts`](#public-modules-sensors-downward-ts)
- [`public/modules/shared/background-ticker.ts`](#public-modules-shared-background-ticker-ts)
- [`public/modules/shared/gate-geometry.ts`](#public-modules-shared-gate-geometry-ts)
- [`public/modules/shared/logging/journal.ts`](#public-modules-shared-logging-journal-ts)
- [`public/modules/shared/logging/logger.ts`](#public-modules-shared-logging-logger-ts)
- [`public/modules/shared/math.ts`](#public-modules-shared-math-ts)
- [`public/modules/shared/object-types.ts`](#public-modules-shared-object-types-ts)
- [`public/modules/vehicles/api.ts`](#public-modules-vehicles-api-ts)
- [`public/modules/vehicles/engine.ts`](#public-modules-vehicles-engine-ts)
- [`public/modules/world/actors.ts`](#public-modules-world-actors-ts)
- [`public/modules/world/atmosphere-model.ts`](#public-modules-world-atmosphere-model-ts)
- [`public/modules/world/atmosphere.ts`](#public-modules-world-atmosphere-ts)
- [`public/modules/world/car-model.ts`](#public-modules-world-car-model-ts)
- [`public/modules/world/crews.ts`](#public-modules-world-crews-ts)
- [`public/modules/world/incidents.ts`](#public-modules-world-incidents-ts)
- [`public/modules/world/mailbox.ts`](#public-modules-world-mailbox-ts)
- [`public/modules/world/roads.ts`](#public-modules-world-roads-ts)
- [`public/modules/world/runtime.ts`](#public-modules-world-runtime-ts)
- [`public/modules/world/services.ts`](#public-modules-world-services-ts)
- [`public/modules/world/traffic.ts`](#public-modules-world-traffic-ts)
- [`server-dev.ts`](#server-dev-ts)
- [`server/external-python-bridge.ts`](#server-external-python-bridge-ts)
- [`server/mavlink-bridge.ts`](#server-mavlink-bridge-ts)
- [`server/pioneer-connection.ts`](#server-pioneer-connection-ts)
- [`server/python-runtime.ts`](#server-python-runtime-ts)
- [`tests/academy-drone.test.ts`](#tests-academy-drone-test-ts)
- [`tests/academy-flight.test.ts`](#tests-academy-flight-test-ts)
- [`tests/academy-runtime-harness.ts`](#tests-academy-runtime-harness-ts)
- [`tests/academy-scene-vision.test.ts`](#tests-academy-scene-vision-test-ts)
- [`tests/academy-signals-code.test.ts`](#tests-academy-signals-code-test-ts)
- [`tests/academy-telemetry.test.ts`](#tests-academy-telemetry-test-ts)
- [`tests/academy-time.test.ts`](#tests-academy-time-test-ts)
- [`tests/academy-vision-harness.ts`](#tests-academy-vision-harness-ts)
- [`tests/academy-vision.test.ts`](#tests-academy-vision-test-ts)
- [`tests/asset-stub.ts`](#tests-asset-stub-ts)
- [`tests/atmosphere-model.test.ts`](#tests-atmosphere-model-test-ts)
- [`tests/blockly-codegen.test.ts`](#tests-blockly-codegen-test-ts)
- [`tests/blockly-debug.test.ts`](#tests-blockly-debug-test-ts)
- [`tests/blockly-python-blocks.test.ts`](#tests-blockly-python-blocks-test-ts)
- [`tests/blockly-workspace-controller.test.ts`](#tests-blockly-workspace-controller-test-ts)
- [`tests/cargo-contact.test.ts`](#tests-cargo-contact-test-ts)
- [`tests/city-plan.test.ts`](#tests-city-plan-test-ts)
- [`tests/editor-blockly-ui.test.ts`](#tests-editor-blockly-ui-test-ts)
- [`tests/editor-overlays.test.ts`](#tests-editor-overlays-test-ts)
- [`tests/editor-temporary-document.test.ts`](#tests-editor-temporary-document-test-ts)
- [`tests/environment-geometry.test.ts`](#tests-environment-geometry-test-ts)
- [`tests/external-bridge-frozen-clock.test.ts`](#tests-external-bridge-frozen-clock-test-ts)
- [`tests/external-python-bridge.test.ts`](#tests-external-python-bridge-test-ts)
- [`tests/fixtures/pioneer-official/manifest.json`](#tests-fixtures-pioneer-official-manifest-json)
- [`tests/frames.test.ts`](#tests-frames-test-ts)
- [`tests/fsm.test.ts`](#tests-fsm-test-ts)
- [`tests/geoscan-examples-blockly.test.ts`](#tests-geoscan-examples-blockly-test-ts)
- [`tests/ground-overview.test.ts`](#tests-ground-overview-test-ts)
- [`tests/helpers/blockly-json.ts`](#tests-helpers-blockly-json-ts)
- [`tests/helpers/layout-rules.ts`](#tests-helpers-layout-rules-ts)
- [`tests/helpers/lua-sim-harness.ts`](#tests-helpers-lua-sim-harness-ts)
- [`tests/helpers/python-sdk-harness.ts`](#tests-helpers-python-sdk-harness-ts)
- [`tests/helpers/script-execution-notice-harness.ts`](#tests-helpers-script-execution-notice-harness-ts)
- [`tests/helpers/trace-compare.ts`](#tests-helpers-trace-compare-ts)
- [`tests/journal-and-training-props.test.ts`](#tests-journal-and-training-props-test-ts)
- [`tests/logger.test.ts`](#tests-logger-test-ts)
- [`tests/lua-api-constants.test.ts`](#tests-lua-api-constants-test-ts)
- [`tests/lua-autopilot.test.ts`](#tests-lua-autopilot-test-ts)
- [`tests/lua-flight-integration.test.ts`](#tests-lua-flight-integration-test-ts)
- [`tests/lua-mailbox.test.ts`](#tests-lua-mailbox-test-ts)
- [`tests/lua-mission-guard.test.ts`](#tests-lua-mission-guard-test-ts)
- [`tests/lua-periodic-timer.test.ts`](#tests-lua-periodic-timer-test-ts)
- [`tests/lua-runner.test.ts`](#tests-lua-runner-test-ts)
- [`tests/lua-runtime.test.ts`](#tests-lua-runtime-test-ts)
- [`tests/lua-sleep.test.ts`](#tests-lua-sleep-test-ts)
- [`tests/lua-timed-square-flight.test.ts`](#tests-lua-timed-square-flight-test-ts)
- [`tests/lua-utils.test.ts`](#tests-lua-utils-test-ts)
- [`tests/lua-validation.test.ts`](#tests-lua-validation-test-ts)
- [`tests/mavlink-bridge.test.ts`](#tests-mavlink-bridge-test-ts)
- [`tests/mission-assets.test.ts`](#tests-mission-assets-test-ts)
- [`tests/mission-guide-blockly-copy.test.ts`](#tests-mission-guide-blockly-copy-test-ts)
- [`tests/mission-guide-blockly-values.test.ts`](#tests-mission-guide-blockly-values-test-ts)
- [`tests/mission-guide-camera-view.test.ts`](#tests-mission-guide-camera-view-test-ts)
- [`tests/mission-guide-compilation.test.ts`](#tests-mission-guide-compilation-test-ts)
- [`tests/mission-guide-course-ui.test.ts`](#tests-mission-guide-course-ui-test-ts)
- [`tests/mission-guide-drafts.test.ts`](#tests-mission-guide-drafts-test-ts)
- [`tests/mission-guide-learning.test.ts`](#tests-mission-guide-learning-test-ts)
- [`tests/mission-guide-outline-navigation.test.ts`](#tests-mission-guide-outline-navigation-test-ts)
- [`tests/mission-guide-scene-preview.test.ts`](#tests-mission-guide-scene-preview-test-ts)
- [`tests/mission-guide-timeline.test.ts`](#tests-mission-guide-timeline-test-ts)
- [`tests/mission-guide-trace.test.ts`](#tests-mission-guide-trace-test-ts)
- [`tests/mission-guide-validation.test.ts`](#tests-mission-guide-validation-test-ts)
- [`tests/mission-guide-walkthrough.test.ts`](#tests-mission-guide-walkthrough-test-ts)
- [`tests/mission-guide.test.ts`](#tests-mission-guide-test-ts)
- [`tests/monaco-completion.test.ts`](#tests-monaco-completion-test-ts)
- [`tests/paths.test.ts`](#tests-paths-test-ts)
- [`tests/pioneer-blender-model.test.ts`](#tests-pioneer-blender-model-test-ts)
- [`tests/pioneer-blockly-camera.test.ts`](#tests-pioneer-blockly-camera-test-ts)
- [`tests/pioneer-blockly-codegen.test.ts`](#tests-pioneer-blockly-codegen-test-ts)
- [`tests/pioneer-blockly-contract.test.ts`](#tests-pioneer-blockly-contract-test-ts)
- [`tests/pioneer-blockly-events.test.ts`](#tests-pioneer-blockly-events-test-ts)
- [`tests/pioneer-blockly-lua-fsm.test.ts`](#tests-pioneer-blockly-lua-fsm-test-ts)
- [`tests/pioneer-blockly-lua-structured.test.ts`](#tests-pioneer-blockly-lua-structured-test-ts)
- [`tests/pioneer-blockly-script-validation.test.ts`](#tests-pioneer-blockly-script-validation-test-ts)
- [`tests/pioneer-blockly-target-support.test.ts`](#tests-pioneer-blockly-target-support-test-ts)
- [`tests/pioneer-js-bridge.test.ts`](#tests-pioneer-js-bridge-test-ts)
- [`tests/pioneer-official-examples.test.ts`](#tests-pioneer-official-examples-test-ts)
- [`tests/pioneer-python-flight-execution.test.ts`](#tests-pioneer-python-flight-execution-test-ts)
- [`tests/python-camera-frames.test.ts`](#tests-python-camera-frames-test-ts)
- [`tests/python-runtime-concurrency.test.ts`](#tests-python-runtime-concurrency-test-ts)
- [`tests/python-runtime.test.ts`](#tests-python-runtime-test-ts)
- [`tests/quality-governor.test.ts`](#tests-quality-governor-test-ts)
- [`tests/rc-settings.test.ts`](#tests-rc-settings-test-ts)
- [`tests/runtime-cleanup.test.ts`](#tests-runtime-cleanup-test-ts)
- [`tests/scene-manager-catalog.test.ts`](#tests-scene-manager-catalog-test-ts)
- [`tests/script-execution-notice-failures.test.ts`](#tests-script-execution-notice-failures-test-ts)
- [`tests/script-execution-notice-scenarios.test.ts`](#tests-script-execution-notice-scenarios-test-ts)
- [`tests/server-rate-limits.test.ts`](#tests-server-rate-limits-test-ts)
- [`tests/settlement-policy.test.ts`](#tests-settlement-policy-test-ts)
- [`tests/state.test.ts`](#tests-state-test-ts)
- [`tests/tracing.test.ts`](#tests-tracing-test-ts)
- [`tests/training-mesh.test.ts`](#tests-training-mesh-test-ts)
- [`tests/training-roads.test.ts`](#tests-training-roads-test-ts)
- [`tests/training-terrain.test.ts`](#tests-training-terrain-test-ts)
- [`tests/training-variety.test.ts`](#tests-training-variety-test-ts)
- [`tests/training-world-collisions.test.ts`](#tests-training-world-collisions-test-ts)
- [`tests/training-world-surfaces.test.ts`](#tests-training-world-surfaces-test-ts)
- [`tests/viewport-pointer-controls.test.ts`](#tests-viewport-pointer-controls-test-ts)
- [`tests/workspace-panels.test.ts`](#tests-workspace-panels-test-ts)
- [`tests/world-incidents.test.ts`](#tests-world-incidents-test-ts)
- [`tests/world-roads-mailbox.test.ts`](#tests-world-roads-mailbox-test-ts)
- [`tests/world-scenarios.test.ts`](#tests-world-scenarios-test-ts)
- [`tests/world-services.test.ts`](#tests-world-services-test-ts)
- [`tests/world-traffic.test.ts`](#tests-world-traffic-test-ts)
- [`tools/check-settlement-layouts.mjs`](#tools-check-settlement-layouts-mjs)
- [`tools/functions-reference/config.mjs`](#tools-functions-reference-config-mjs)
- [`tools/functions-reference/renderer.mjs`](#tools-functions-reference-renderer-mjs)
- [`tools/functions-reference/scanner.mjs`](#tools-functions-reference-scanner-mjs)
- [`tools/generate_functions_reference_index.mjs`](#tools-generate-functions-reference-index-mjs)
- [`tools/generate_marker_dictionaries.mjs`](#tools-generate-marker-dictionaries-mjs)
- [`tools/sync_lesson_examples.mjs`](#tools-sync-lesson-examples-mjs)
- [`tools/validate-landscape-assets-v2.mjs`](#tools-validate-landscape-assets-v2-mjs)
- [`tools/validate-landscape-assets-v3.mjs`](#tools-validate-landscape-assets-v3-mjs)
- [`tools/validate-landscape-assets-v4.mjs`](#tools-validate-landscape-assets-v4-mjs)
- [`tools/validate-landscape-assets-v5.mjs`](#tools-validate-landscape-assets-v5-mjs)
- [`tools/validate-landscape-assets.mjs`](#tools-validate-landscape-assets-mjs)
- [`tools/validate-mission-assets.mjs`](#tools-validate-mission-assets-mjs)
- [`tools/verify_panel_style_owners.mjs`](#tools-verify-panel-style-owners-mjs)

## Файлы

<a id="claude-launch-json"></a>
### `.claude/launch.json`

- Исходник: [открыть файл](../../.claude/launch.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="dbg-pioneer-check-json"></a>
### `.dbg/pioneer-check.json`

- Исходник: [открыть файл](../../.dbg/pioneer-check.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-device-session-python-packages-pyserial-3-5-dist-info-metadata-json"></a>
### `.tmp/pioneer-device-session/python-packages/pyserial-3.5.dist-info/metadata.json`

- Исходник: [открыть файл](../../.tmp/pioneer-device-session/python-packages/pyserial-3.5.dist-info/metadata.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-firmware-research-fengari-bytecode-result-json"></a>
### `.tmp/pioneer-firmware-research/fengari-bytecode-result.json`

- Исходник: [открыть файл](../../.tmp/pioneer-firmware-research/fengari-bytecode-result.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-firmware-research-jar-index-json"></a>
### `.tmp/pioneer-firmware-research/jar-index.json`

- Исходник: [открыть файл](../../.tmp/pioneer-firmware-research/jar-index.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-firmware-research-modern-crypto-refs-json"></a>
### `.tmp/pioneer-firmware-research/modern-crypto-refs.json`

- Исходник: [открыть файл](../../.tmp/pioneer-firmware-research/modern-crypto-refs.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-firmware-research-official-doc-tree-json"></a>
### `.tmp/pioneer-firmware-research/official-doc-tree.json`

- Исходник: [открыть файл](../../.tmp/pioneer-firmware-research/official-doc-tree.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="tmp-pioneer-firmware-research-repro-evidence-json"></a>
### `.tmp/pioneer-firmware-research/repro/evidence.json`

- Исходник: [открыть файл](../../.tmp/pioneer-firmware-research/repro/evidence.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-design-rail-redesign-html"></a>
### `docs/design/rail-redesign.html`

- Исходник: [открыть файл](../design/rail-redesign.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-map-generation-check-json"></a>
### `docs/map-generation-check.json`

- Исходник: [открыть файл](../map-generation-check.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-panel-style-ownership-audit-json"></a>
### `docs/panel-style-ownership-audit.json`

- Исходник: [открыть файл](../panel-style-ownership-audit.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-pioneer-lua-research-evidence-json"></a>
### `docs/pioneer-lua-research-evidence.json`

- Исходник: [открыть файл](../pioneer-lua-research-evidence.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-premium-audit-final-json"></a>
### `docs/premium-audit-final.json`

- Исходник: [открыть файл](../premium-audit-final.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-premium-learning-audit-json"></a>
### `docs/premium-learning-audit.json`

- Исходник: [открыть файл](../premium-learning-audit.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-premium-textbook-audit-json"></a>
### `docs/premium-textbook-audit.json`

- Исходник: [открыть файл](../premium-textbook-audit.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-premium-workspace-audit-json"></a>
### `docs/premium-workspace-audit.json`

- Исходник: [открыть файл](../premium-workspace-audit.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-project-map-obsidian-app-json"></a>
### `docs/project-map/.obsidian/app.json`

- Исходник: [открыть файл](../project-map/.obsidian/app.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-project-map-obsidian-appearance-json"></a>
### `docs/project-map/.obsidian/appearance.json`

- Исходник: [открыть файл](../project-map/.obsidian/appearance.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-project-map-obsidian-core-plugins-json"></a>
### `docs/project-map/.obsidian/core-plugins.json`

- Исходник: [открыть файл](../project-map/.obsidian/core-plugins.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-project-map-obsidian-workspace-json"></a>
### `docs/project-map/.obsidian/workspace.json`

- Исходник: [открыть файл](../project-map/.obsidian/workspace.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="docs-workspace-eslint-summary-json"></a>
### `docs/workspace-eslint-summary.json`

- Исходник: [открыть файл](../workspace-eslint-summary.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-python-advanced-navigation-camera-params-yaml-yaml"></a>
### `examples-python/advanced_navigation/camera_params_yaml.yaml`

- Исходник: [открыть файл](../../examples-python/advanced_navigation/camera_params_yaml.yaml)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-python-advanced-navigation-map-json-example-json"></a>
### `examples-python/advanced_navigation/map_json_example.json`

- Исходник: [открыть файл](../../examples-python/advanced_navigation/map_json_example.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="jest-config-js"></a>
### `jest.config.js`

- Исходник: [открыть файл](../../jest.config.js)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="package-lock-json"></a>
### `package-lock.json`

- Исходник: [открыть файл](../../package-lock.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="premium-ui-json"></a>
### `premium-ui.json`

- Исходник: [открыть файл](../../premium-ui.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="public-assets-models-pioneer-pioneer-basic-json"></a>
### `public/assets/models/pioneer/pioneer-basic.json`

- Исходник: [открыть файл](../../public/assets/models/pioneer/pioneer-basic.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v1-manifest-json"></a>
### `public/assets/models/props/landscape-kit-v1.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v1.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v1-mesh-json"></a>
### `public/assets/models/props/landscape-kit-v1.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v1.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v2-manifest-json"></a>
### `public/assets/models/props/landscape-kit-v2.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v2.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v2-mesh-json"></a>
### `public/assets/models/props/landscape-kit-v2.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v2.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v3-manifest-json"></a>
### `public/assets/models/props/landscape-kit-v3.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v3.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v3-mesh-json"></a>
### `public/assets/models/props/landscape-kit-v3.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v3.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v4-manifest-json"></a>
### `public/assets/models/props/landscape-kit-v4.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v4.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v4-mesh-json"></a>
### `public/assets/models/props/landscape-kit-v4.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v4.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v5-manifest-json"></a>
### `public/assets/models/props/landscape-kit-v5.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v5.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-landscape-kit-v5-mesh-json"></a>
### `public/assets/models/props/landscape-kit-v5.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/landscape-kit-v5.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-mission-assets-v1-manifest-json"></a>
### `public/assets/models/props/mission-assets-v1.manifest.json`

- Исходник: [открыть файл](../../public/assets/models/props/mission-assets-v1.manifest.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-mission-assets-v1-mesh-json"></a>
### `public/assets/models/props/mission-assets-v1.mesh.json`

- Исходник: [открыть файл](../../public/assets/models/props/mission-assets-v1.mesh.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-assets-models-props-training-props-v2-json"></a>
### `public/assets/models/props/training-props-v2.json`

- Исходник: [открыть файл](../../public/assets/models/props/training-props-v2.json)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-main-scene-html"></a>
### `public/fragments/layout/main-scene.html`

- Исходник: [открыть файл](../../public/fragments/layout/main-scene.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-sidebar-panels-html"></a>
### `public/fragments/layout/sidebar-panels.html`

- Исходник: [открыть файл](../../public/fragments/layout/sidebar-panels.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-layout-sidebar-tabs-html"></a>
### `public/fragments/layout/sidebar-tabs.html`

- Исходник: [открыть файл](../../public/fragments/layout/sidebar-tabs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-modals-gamepad-wizard-html"></a>
### `public/fragments/modals/gamepad-wizard.html`

- Исходник: [открыть файл](../../public/fragments/modals/gamepad-wizard.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-docs-html"></a>
### `public/fragments/panels/docs.html`

- Исходник: [открыть файл](../../public/fragments/panels/docs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-drones-html"></a>
### `public/fragments/panels/drones.html`

- Исходник: [открыть файл](../../public/fragments/panels/drones.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-editor-html"></a>
### `public/fragments/panels/editor.html`

- Исходник: [открыть файл](../../public/fragments/panels/editor.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-html"></a>
### `public/fragments/panels/gamepad.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-mapping-pane-html"></a>
### `public/fragments/panels/gamepad/mapping-pane.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad/mapping-pane.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-gamepad-monitor-pane-html"></a>
### `public/fragments/panels/gamepad/monitor-pane.html`

- Исходник: [открыть файл](../../public/fragments/panels/gamepad/monitor-pane.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-logs-html"></a>
### `public/fragments/panels/logs.html`

- Исходник: [открыть файл](../../public/fragments/panels/logs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-html"></a>
### `public/fragments/panels/manager.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-hierarchy-html"></a>
### `public/fragments/panels/manager/hierarchy.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager/hierarchy.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-manager-inspector-html"></a>
### `public/fragments/panels/manager/inspector.html`

- Исходник: [открыть файл](../../public/fragments/panels/manager/inspector.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-settings-html"></a>
### `public/fragments/panels/settings.html`

- Исходник: [открыть файл](../../public/fragments/panels/settings.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-telemetry-html"></a>
### `public/fragments/panels/telemetry.html`

- Исходник: [открыть файл](../../public/fragments/panels/telemetry.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-index-html"></a>
### `public/index.html`

- Исходник: [открыть файл](../../public/index.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-modules-app-animation-loop-ts"></a>
### `public/modules/app/animation-loop.ts`

- Исходник: [открыть файл](../../public/modules/app/animation-loop.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `animate`, `fallbackTick`, `startAnimationLoop`, `stepPhysics`, `syncBackgroundTicker`, `updateFpsCounter`

<a id="public-modules-app-global-error-ts"></a>
### `public/modules/app/global-error.ts`

- Исходник: [открыть файл](../../public/modules/app/global-error.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `registerGlobalErrorHandler`

<a id="public-modules-app-language-selector-ts"></a>
### `public/modules/app/language-selector.ts`

- Исходник: [открыть файл](../../public/modules/app/language-selector.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `getSavedScriptLanguage`, `initScriptLanguageSelector`

<a id="public-modules-app-script-execution-notice-templates-ts"></a>
### `public/modules/app/script-execution-notice-templates.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice-templates.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `buildScriptFailureLocation`, `callback`, `collectScriptFailureTechnicalDetails`, `escapeHtml`, `normalizeNoticeText`, `renderEarlyRouteHtml`, `renderFailureSection`, `renderFailureStack`, `renderIssuesHtml`, `renderLuaMissionStateGuideHtml`, `renderScriptFailureHtml`, `renderSimultaneousCommandsHtml`

<a id="public-modules-app-script-execution-notice-ts"></a>
### `public/modules/app/script-execution-notice.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `callback`, `collectScenarioValidationResult`, `hasLuaEarlyRouteIssue`, `hasLuaMissingCallbackIssue`, `isSimultaneousCommandsFailureNotice`, `showEarlyRouteNotice`, `showMissingCallbackMissionNotice`, `showMissionGamepadOverrideNotice`, `showScenarioValidationNotice`, `showScriptFailureNotice`, `showSimultaneousCommandsNotice`, `validateScenarioBeforeLaunch`, `wireMissionNotices`

<a id="public-modules-app-script-execution-notice-error-ts"></a>
### `public/modules/app/script-execution-notice/error.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/error.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `createScriptFailureError`, `getLastNonEmptyLine`, `normalizeScriptFailureError`

<a id="public-modules-app-script-execution-notice-humanize-lua-ts"></a>
### `public/modules/app/script-execution-notice/humanize-lua.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/humanize-lua.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `humanizeLuaFsmRuntimeMessage`, `humanizeLuaRuntimeMessage`, `humanizeLuaSyntaxMessage`

<a id="public-modules-app-script-execution-notice-humanize-python-ts"></a>
### `public/modules/app/script-execution-notice/humanize-python.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/humanize-python.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `humanizePythonRuntimeMessage`, `humanizePythonSyntaxMessage`

<a id="public-modules-app-script-execution-notice-humanize-ts"></a>
### `public/modules/app/script-execution-notice/humanize.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/humanize.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `humanizeScriptFailure`

<a id="public-modules-app-script-execution-notice-lua-validation-ts"></a>
### `public/modules/app/script-execution-notice/lua-validation.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/lua-validation.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `blankLuaText`, `collectLuaBlockingIssues`, `collectLuaDelayedMissionCommands`, `collectLuaIssues`, `collectLuaMissionCommandGroups`, `collectLuaMissionCommands`, `detectLuaEarlyRouteIssue`, `hasLuaEarlyRouteIssue`, `luaFunctionRanges`, `stripLuaCommentsAndStrings`, `stripLuaManagedBlocks`

<a id="public-modules-app-script-execution-notice-python-validation-ts"></a>
### `public/modules/app/script-execution-notice/python-validation.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/python-validation.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `collectPythonIssues`

<a id="public-modules-app-script-execution-notice-state-ts"></a>
### `public/modules/app/script-execution-notice/state.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `getNoticeSuppressionState`, `markEarlyRouteNoticeAsShown`, `markMissingCallbackNoticeAsShown`, `markSimultaneousNoticeAsShown`, `resetScriptExecutionNoticeState`, `shouldSuppressEarlyRouteNotice`, `shouldSuppressMissingCallbackNotice`, `shouldSuppressSimultaneousNotice`

<a id="public-modules-app-script-execution-notice-types-ts"></a>
### `public/modules/app/script-execution-notice/types.ts`

- Исходник: [открыть файл](../../public/modules/app/script-execution-notice/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-app-simulation-controls-ts"></a>
### `public/modules/app/simulation-controls.ts`

- Исходник: [открыть файл](../../public/modules/app/simulation-controls.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `configureSimulationControls`, `resetSimulationState`, `restartAndRunSimulation`

<a id="public-modules-app-theme-toggle-ts"></a>
### `public/modules/app/theme-toggle.ts`

- Исходник: [открыть файл](../../public/modules/app/theme-toggle.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyAppTheme`, `getStoredTheme`, `getSystemTheme`, `initThemeToggle`, `resolveTheme`, `updateThemeToggleButton`

<a id="public-modules-autopilot-fsm-internals-ts"></a>
### `public/modules/autopilot/fsm-internals.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/fsm-internals.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `canRunInSameTick`, `failSimultaneousCommands`, `getCommandName`, `getTickCommandLabel`, `isCompatibleSameTickPair`, `makeSignature`, `setFsmStateAndSyncStatus`, `syncStatus`

<a id="public-modules-autopilot-fsm-runtime-ts"></a>
### `public/modules/autopilot/fsm-runtime.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/fsm-runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `beginEventCallbackPhase`, `getCommandSource`, `getCurrentTickMs`, `isDroneAirborneState`, `isDroneMovingState`, `queueMceCommand`, `recordTickCommand`, `rejectCommandByFsm`, `setDroneFsmState`, `shouldSpinRotors`, `throwFsmTransitionError`

<a id="public-modules-autopilot-fsm-ts"></a>
### `public/modules/autopilot/fsm.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/fsm.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `applyGoToLocalPointRequest`, `canDeferGoToLocalPointDuringTakeoff`, `completeLanding`, `completePointReached`, `completeTakeoff`, `enterLandingProcess`, `enterPreflight`, `enterTakeoffProcess`, `handlePreflightTimeout`, `isMovementReached`, `isPointReached`

<a id="public-modules-autopilot-mce-events-ts"></a>
### `public/modules/autopilot/mce-events.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/mce-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `pushCommand`

<a id="public-modules-autopilot-params-effects-ts"></a>
### `public/modules/autopilot/params-effects.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/params-effects.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `shouldStartRtlForTimeout`, `shouldStartRtlForVoltage`, `startRtlIfNeeded`, `updateAutopilotParameterEffects`

<a id="public-modules-autopilot-params-runtime-ts"></a>
### `public/modules/autopilot/params-runtime.ts`

- Исходник: [открыть файл](../../public/modules/autopilot/params-runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `activateAutopilotRtl`, `clearAutopilotRtl`, `clearEmergencyLandingTriggered`, `getAutonomousFlightDurationS`, `getAutopilotHomePosition`, `getAutopilotRtlState`, `getAutopilotRuntimeConfig`, `getDroneContext`, `hasEmergencyLandingTriggered`, `markAutonomousFlightActivity`, `markEmergencyLandingTriggered`, `readNumber`, `rememberAutopilotHomePosition`, `resetAutonomousFlightActivity`, `syncAutopilotRuntimeFromValues`

<a id="public-modules-core-learning-journal-ts"></a>
### `public/modules/core/learning-journal.ts`

- Исходник: [открыть файл](../../public/modules/core/learning-journal.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `beginLearningCapture`, `copyEvent`, `finishLearningCapture`, `hasLearningMessage`, `markLearningRunStarted`, `recordLearningEvent`

<a id="public-modules-core-mission-notices-ts"></a>
### `public/modules/core/mission-notices.ts`

- Исходник: [открыть файл](../../public/modules/core/mission-notices.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `emitEarlyRoute`, `emitGenericNotice`, `emitMissingCallbackMission`, `emitMissionGamepadOverride`, `emitScriptFailure`, `emitSimultaneousCommands`, `onMissionNotices`

<a id="public-modules-core-script-failure-ts"></a>
### `public/modules/core/script-failure.ts`

- Исходник: [открыть файл](../../public/modules/core/script-failure.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `failScriptRun`

<a id="public-modules-core-state-drone-ts"></a>
### `public/modules/core/state-drone.ts`

- Исходник: [открыть файл](../../public/modules/core/state-drone.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `createDefaultPioneerConnectionSettings`, `createDroneRecord`, `createEmptyLuaDiagnosticsState`, `resetDroneRuntimeState`

<a id="public-modules-core-state-types-ts"></a>
### `public/modules/core/state-types.ts`

- Исходник: [открыть файл](../../public/modules/core/state-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-core-state-ts"></a>
### `public/modules/core/state.ts`

- Исходник: [открыть файл](../../public/modules/core/state.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `createDroneState`, `ensureDronePythonConnectionSettings`, `getDroneFromLua`, `loadGamepadSettings`, `matchesAuxRange`, `removeDroneState`, `resetRuntimeStatePreservePose`, `resetState`, `saveGamepadSettings`, `setCurrentDrone`, `setCurrentScriptLanguage`, `setSceneEditDragActive`

<a id="public-modules-docs-api-docs-events-ts"></a>
### `public/modules/docs/api-docs-events.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-api-docs-types-ts"></a>
### `public/modules/docs/api-docs-types.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-api-docs-ts"></a>
### `public/modules/docs/api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-lua-api-docs-events-ts"></a>
### `public/modules/docs/lua-api-docs-events.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-lua-api-docs-flight-ts"></a>
### `public/modules/docs/lua-api-docs-flight.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs-flight.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-lua-api-docs-runtime-ts"></a>
### `public/modules/docs/lua-api-docs-runtime.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs-runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-lua-api-docs-ts"></a>
### `public/modules/docs/lua-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-python-api-docs-ts"></a>
### `public/modules/docs/python-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-sensors-downward-ts"></a>
### `public/modules/sensors/downward.ts`

- Исходник: [открыть файл](../../public/modules/sensors/downward.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `gaussian`, `measureSurfaceBelow`, `readOpticalFlow`, `vehicleUnitOf`

<a id="public-modules-shared-background-ticker-ts"></a>
### `public/modules/shared/background-ticker.ts`

- Исходник: [открыть файл](../../public/modules/shared/background-ticker.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `backgroundTimeout`, `clearBackgroundTimeout`, `getTimeoutWorker`, `startBackgroundTicker`

<a id="public-modules-shared-gate-geometry-ts"></a>
### `public/modules/shared/gate-geometry.ts`

- Исходник: [открыть файл](../../public/modules/shared/gate-geometry.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-shared-logging-journal-ts"></a>
### `public/modules/shared/logging/journal.ts`

- Исходник: [открыть файл](../../public/modules/shared/logging/journal.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `filterJournal`, `isTechnicalLog`, `redraw`, `renderJournal`

<a id="public-modules-shared-logging-logger-ts"></a>
### `public/modules/shared/logging/logger.ts`

- Исходник: [открыть файл](../../public/modules/shared/logging/logger.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `classifyLogTone`, `countEntriesByCategory`, `createLogEntryElement`, `createTabButton`, `extractTagAndMessage`, `getLogEntries`, `log`, `onLogsChanged`, `renderLogsUI`, `renderTabs`, `resolveLogCategory`, `scheduleLogsRender`

<a id="public-modules-shared-math-ts"></a>
### `public/modules/shared/math.ts`

- Исходник: [открыть файл](../../public/modules/shared/math.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `clamp`

<a id="public-modules-shared-object-types-ts"></a>
### `public/modules/shared/object-types.ts`

- Исходник: [открыть файл](../../public/modules/shared/object-types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-vehicles-api-ts"></a>
### `public/modules/vehicles/api.ts`

- Исходник: [открыть файл](../../public/modules/vehicles/api.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `findVehicleByName`, `normalize`, `requireVehicle`, `vehicleGetState`, `vehicleNames`, `vehicleSetSpeed`, `vehicleStart`, `vehicleStop`

<a id="public-modules-vehicles-engine-ts"></a>
### `public/modules/vehicles/engine.ts`

- Исходник: [открыть файл](../../public/modules/vehicles/engine.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `advance`, `commandVehicle`, `findRoute`, `geometryOf`, `initialRuntime`, `isRouteFor`, `listVehicles`, `placeUnits`, `resetVehicle`, `resetVehicles`, `routeKindFor`, `runtimeOf`, `shouldMove`, `startVehicleSession`, `stopVehicleSession`, `trainSpan`, `unitsOf`, `updateVehicles`, `worldPointAt`, `wrapDistance`

<a id="public-modules-world-actors-ts"></a>
### `public/modules/world/actors.ts`

- Исходник: [открыть файл](../../public/modules/world/actors.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 13
- Ключевые символы: `createHose`, `createLadder`, `createPerson`, `giveCuffs`, `giveSack`, `material`, `mesh`, `placePerson`, `poseNow`, `removeCuffs`, `setLadder`, `swing`, `updateHose`

<a id="public-modules-world-atmosphere-model-ts"></a>
### `public/modules/world/atmosphere-model.ts`

- Исходник: [открыть файл](../../public/modules/world/atmosphere-model.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `allowedWeather`, `ch`, `clamp`, `formatHour`, `landscapeFogDensity`, `mixColor`, `normalizeHour`, `sanitizeAtmosphere`, `seasonLook`, `smooth`, `sunAt`, `weatherLook`

<a id="public-modules-world-atmosphere-ts"></a>
### `public/modules/world/atmosphere.ts`

- Исходник: [открыть файл](../../public/modules/world/atmosphere.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 19
- Ключевые символы: `animateWeather`, `apply`, `applyNightGlow`, `applySeason`, `applySky`, `applyWeather`, `ensureWeather`, `frame`, `getAtmosphere`, `greenish`, `initAtmosphere`, `load`, `remember`, `restoreSky`, `save`, `sceneLights`, `setAtmosphere`, `subscribeAtmosphere`, `terrain`

<a id="public-modules-world-car-model-ts"></a>
### `public/modules/world/car-model.ts`

- Исходник: [открыть файл](../../public/modules/world/car-model.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `add`, `arch`, `box`, `createCar`, `createPoliceCar`, `merge`, `paint`, `parts`, `profile`, `wheel`

<a id="public-modules-world-crews-ts"></a>
### `public/modules/world/crews.ts`

- Исходник: [открыть файл](../../public/modules/world/crews.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `at`, `behind`, `between`, `burglary`, `clamp01`, `createFireCrew`, `createPoliceCrew`, `createRepairCrew`, `fight`, `ground`, `headingTo`, `lerp`, `progress`, `put`, `smooth`

<a id="public-modules-world-incidents-ts"></a>
### `public/modules/world/incidents.ts`

- Исходник: [открыть файл](../../public/modules/world/incidents.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 11
- Ключевые символы: `findPoliceSite`, `findService`, `findStationSite`, `lineBreakWorkPoint`, `planBurglary`, `planFight`, `planFire`, `planIncidents`, `planLineBreak`, `powerPylons`, `powerWirePoint`

<a id="public-modules-world-mailbox-ts"></a>
### `public/modules/world/mailbox.ts`

- Исходник: [открыть файл](../../public/modules/world/mailbox.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `droneHull`, `endpoint`, `hasMessages`, `receiveMessage`, `registerService`, `resetMailbox`, `sendMessage`, `setDroneHull`

<a id="public-modules-world-roads-ts"></a>
### `public/modules/world/roads.ts`

- Исходник: [открыть файл](../../public/modules/world/roads.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 22
- Ключевые символы: `add`, `analyzeRoads`, `buildRoadGraph`, `covered`, `crossPolylines`, `cumulativeLengths`, `dist`, `filletPolyline`, `findRoute`, `intersectSegments`, `link`, `nearestNode`, `outranks`, `overpassHeight`, `overpassLift`, `overpassSpans`, `pointAlong`, `projectOnPolyline`, `roadAnchors`, `routeLength`, `subPolyline`, `trimRoute`

<a id="public-modules-world-runtime-ts"></a>
### `public/modules/world/runtime.ts`

- Исходник: [открыть файл](../../public/modules/world/runtime.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 19
- Ключевые символы: `animate`, `build`, `buildFlames`, `driveTraffic`, `ensureWorld`, `groundAt`, `onServiceEvent`, `parkAt`, `place`, `polylineLengths`, `propAt`, `resetWorld`, `route`, `sampleAt`, `startWorldSession`, `stopWorldSession`, `teardown`, `terrainGroup`, `updateWorld`

<a id="public-modules-world-services-ts"></a>
### `public/modules/world/services.ts`

- Исходник: [открыть файл](../../public/modules/world/services.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `createWorldServices`, `drive`, `emit`, `findIncident`, `handle`, `say`, `step`

<a id="public-modules-world-traffic-ts"></a>
### `public/modules/world/traffic.ts`

- Исходник: [открыть файл](../../public/modules/world/traffic.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 25
- Ключевые символы: `addNode`, `angleDiff`, `at`, `bezier`, `box`, `buildTrafficNetwork`, `carScaleFor`, `clear`, `conflicts`, `createTraffic`, `dedupe`, `dist`, `enter`, `keepOnRoad`, `makeSeg`, `normal`, `offsetPolyline`, `onRoad`, `place`, `planRoute`, `removeFrom`, `sample`, `speedLimitFor`, `step`, `trimPolyline`

<a id="server-dev-ts"></a>
### `server-dev.ts`

- Исходник: [открыть файл](../../server-dev.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="server-external-python-bridge-ts"></a>
### `server/external-python-bridge.ts`

- Исходник: [открыть файл](../../server/external-python-bridge.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 12
- Ключевые символы: `buildExternalBridgeStateKey`, `clearExternalPythonBridgeStore`, `decodeJpegDataUrl`, `frameToDataUrl`, `getExternalPythonBridgeState`, `normalizeExternalBridgeIp`, `normalizeExternalBridgeKeyPart`, `parsePositionPayload`, `recordExternalPythonBridgeEvent`, `registerExternalPythonBridgeRoutes`, `updateExternalPythonBridgeFrame`, `updateExternalPythonBridgeState`

<a id="server-mavlink-bridge-ts"></a>
### `server/mavlink-bridge.ts`

- Исходник: [открыть файл](../../server/mavlink-bridge.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 30
- Ключевые символы: `buildCameraRegistrationKey`, `buildCameraSessionId`, `buildMavlinkRegistrationKey`, `buildMavlinkSessionId`, `CameraTcpBridge.for`, `CameraTcpBridge.if`, `closeStaleCameraBridge`, `closeStaleMavlinkBridge`, `computeX25Crc`, `decodeDataUrlToBuffer`, `drop`, `emitBridgeEvent`, `emitCameraBridgeEvent`, `encodeMavlinkV2Message`, `ensureBridgeConnections`, `isArmedAutopilotState`, `mapAutopilotStateToCustomMode`, `mapAutopilotStateToSystemStatus`, `MavlinkUdpBridge.if`, `MavlinkUdpBridge.switch`, `normalizeConnectionMethod`, `normalizeIpv4`, `parseCommandLong`, `parseRcChannelsOverride`, `parseSetPositionTargetLocalNed`, `parseSingleMavlinkFrame`, `registerMavlinkBridgeRoutes`, `sameHost`, `sanitizeRegistration`, `stopAllMavlinkBridges`

<a id="server-pioneer-connection-ts"></a>
### `server/pioneer-connection.ts`

- Исходник: [открыть файл](../../server/pioneer-connection.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="server-python-runtime-ts"></a>
### `server/python-runtime.ts`

- Исходник: [открыть файл](../../server/python-runtime.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 11
- Ключевые символы: `appendRuntimeChunk`, `appendRuntimeOutput`, `buildSpawnCommand`, `countRunningLocalPythonRuns`, `createRuntimeWrapperSource`, `flushRuntimeBuffer`, `registerPythonRuntimeRoutes`, `sanitizePioneerConnectionConfig`, `startLocalPythonRun`, `stopAllLocalPythonRuns`, `stopLocalPythonRun`

<a id="tests-academy-drone-test-ts"></a>
### `tests/academy-drone.test.ts`

- Исходник: [открыть файл](../../tests/academy-drone.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `samples`

<a id="tests-academy-flight-test-ts"></a>
### `tests/academy-flight.test.ts`

- Исходник: [открыть файл](../../tests/academy-flight.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `scene`

<a id="tests-academy-runtime-harness-ts"></a>
### `tests/academy-runtime-harness.ts`

- Исходник: [открыть файл](../../tests/academy-runtime-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `executeAcademyLua`, `executeAcademyPython`, `move`, `print`, `set_phase`, `update_clock`

<a id="tests-academy-scene-vision-test-ts"></a>
### `tests/academy-scene-vision.test.ts`

- Исходник: [открыть файл](../../tests/academy-scene-vision.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `observe`

<a id="tests-academy-signals-code-test-ts"></a>
### `tests/academy-signals-code.test.ts`

- Исходник: [открыть файл](../../tests/academy-signals-code.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-academy-telemetry-test-ts"></a>
### `tests/academy-telemetry.test.ts`

- Исходник: [открыть файл](../../tests/academy-telemetry.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `execute`, `run`, `scene`

<a id="tests-academy-time-test-ts"></a>
### `tests/academy-time.test.ts`

- Исходник: [открыть файл](../../tests/academy-time.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `check`

<a id="tests-academy-vision-harness-ts"></a>
### `tests/academy-vision-harness.ts`

- Исходник: [открыть файл](../../tests/academy-vision-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `visionHarness`

<a id="tests-academy-vision-test-ts"></a>
### `tests/academy-vision.test.ts`

- Исходник: [открыть файл](../../tests/academy-vision.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `run`, `scene`

<a id="tests-asset-stub-ts"></a>
### `tests/asset-stub.ts`

- Исходник: [открыть файл](../../tests/asset-stub.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-atmosphere-model-test-ts"></a>
### `tests/atmosphere-model.test.ts`

- Исходник: [открыть файл](../../tests/atmosphere-model.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `transmittance`, `visible`

<a id="tests-blockly-codegen-test-ts"></a>
### `tests/blockly-codegen.test.ts`

- Исходник: [открыть файл](../../tests/blockly-codegen.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `callback`, `dropdownOptions`, `makeWorkspace`, `numberBlock`, `toolboxBlockTypes`

<a id="tests-blockly-debug-test-ts"></a>
### `tests/blockly-debug.test.ts`

- Исходник: [открыть файл](../../tests/blockly-debug.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-blockly-python-blocks-test-ts"></a>
### `tests/blockly-python-blocks.test.ts`

- Исходник: [открыть файл](../../tests/blockly-python-blocks.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `makeWorkspace`, `numberBlock`, `toolboxBlockTypes`

<a id="tests-blockly-workspace-controller-test-ts"></a>
### `tests/blockly-workspace-controller.test.ts`

- Исходник: [открыть файл](../../tests/blockly-workspace-controller.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeController`

<a id="tests-cargo-contact-test-ts"></a>
### `tests/cargo-contact.test.ts`

- Исходник: [открыть файл](../../tests/cargo-contact.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `runUntilGroundContact`

<a id="tests-city-plan-test-ts"></a>
### `tests/city-plan.test.ts`

- Исходник: [открыть файл](../../tests/city-plan.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-editor-blockly-ui-test-ts"></a>
### `tests/editor-blockly-ui.test.ts`

- Исходник: [открыть файл](../../tests/editor-blockly-ui.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `createMockClassList`, `createMockElement`

<a id="tests-editor-overlays-test-ts"></a>
### `tests/editor-overlays.test.ts`

- Исходник: [открыть файл](../../tests/editor-overlays.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `select`, `tintedBox`

<a id="tests-editor-temporary-document-test-ts"></a>
### `tests/editor-temporary-document.test.ts`

- Исходник: [открыть файл](../../tests/editor-temporary-document.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-environment-geometry-test-ts"></a>
### `tests/environment-geometry.test.ts`

- Исходник: [открыть файл](../../tests/environment-geometry.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `marker`, `meshes`, `roofTop`

<a id="tests-external-bridge-frozen-clock-test-ts"></a>
### `tests/external-bridge-frozen-clock.test.ts`

- Исходник: [открыть файл](../../tests/external-bridge-frozen-clock.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `allowAll`, `makeEvent`

<a id="tests-external-python-bridge-test-ts"></a>
### `tests/external-python-bridge.test.ts`

- Исходник: [открыть файл](../../tests/external-python-bridge.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeApp`

<a id="tests-fixtures-pioneer-official-manifest-json"></a>
### `tests/fixtures/pioneer-official/manifest.json`

- Исходник: [открыть файл](../../tests/fixtures/pioneer-official/manifest.json)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-frames-test-ts"></a>
### `tests/frames.test.ts`

- Исходник: [открыть файл](../../tests/frames.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-fsm-test-ts"></a>
### `tests/fsm.test.ts`

- Исходник: [открыть файл](../../tests/fsm.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `captureLogLine`

<a id="tests-geoscan-examples-blockly-test-ts"></a>
### `tests/geoscan-examples-blockly.test.ts`

- Исходник: [открыть файл](../../tests/geoscan-examples-blockly.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 16
- Ключевые символы: `blink`, `blocks`, `bright`, `build`, `cameraCalls`, `circle`, `fixture`, `generate`, `height`, `level`, `lua`, `path`, `position`, `positive`, `python`, `scaled`

<a id="tests-ground-overview-test-ts"></a>
### `tests/ground-overview.test.ts`

- Исходник: [открыть файл](../../tests/ground-overview.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-helpers-blockly-json-ts"></a>
### `tests/helpers/blockly-json.ts`

- Исходник: [открыть файл](../../tests/helpers/blockly-json.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `block`, `chain`, `program`, `resetVariables`, `valueBlock`, `variableId`

<a id="tests-helpers-layout-rules-ts"></a>
### `tests/helpers/layout-rules.ts`

- Исходник: [открыть файл](../../tests/helpers/layout-rules.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `key`, `spacingViolations`

<a id="tests-helpers-lua-sim-harness-ts"></a>
### `tests/helpers/lua-sim-harness.ts`

- Исходник: [открыть файл](../../tests/helpers/lua-sim-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `createLuaSim`, `eventNames`, `observe`, `pullGotos`, `record`, `setupLuaSim`

<a id="tests-helpers-python-sdk-harness-ts"></a>
### `tests/helpers/python-sdk-harness.ts`

- Исходник: [открыть файл](../../tests/helpers/python-sdk-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `findPython`, `runPythonScenario`

<a id="tests-helpers-script-execution-notice-harness-ts"></a>
### `tests/helpers/script-execution-notice-harness.ts`

- Исходник: [открыть файл](../../tests/helpers/script-execution-notice-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `createScriptExecutionNoticeHarness`

<a id="tests-helpers-trace-compare-ts"></a>
### `tests/helpers/trace-compare.ts`

- Исходник: [открыть файл](../../tests/helpers/trace-compare.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `behaviour`, `collapse`, `expectSameBehaviour`, `names`, `visible`

<a id="tests-journal-and-training-props-test-ts"></a>
### `tests/journal-and-training-props.test.ts`

- Исходник: [открыть файл](../../tests/journal-and-training-props.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-logger-test-ts"></a>
### `tests/logger.test.ts`

- Исходник: [открыть файл](../../tests/logger.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-api-constants-test-ts"></a>
### `tests/lua-api-constants.test.ts`

- Исходник: [открыть файл](../../tests/lua-api-constants.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-autopilot-test-ts"></a>
### `tests/lua-autopilot.test.ts`

- Исходник: [открыть файл](../../tests/lua-autopilot.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

<a id="tests-lua-flight-integration-test-ts"></a>
### `tests/lua-flight-integration.test.ts`

- Исходник: [открыть файл](../../tests/lua-flight-integration.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

<a id="tests-lua-mailbox-test-ts"></a>
### `tests/lua-mailbox.test.ts`

- Исходник: [открыть файл](../../tests/lua-mailbox.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `global`, `run`

<a id="tests-lua-mission-guard-test-ts"></a>
### `tests/lua-mission-guard.test.ts`

- Исходник: [открыть файл](../../tests/lua-mission-guard.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

<a id="tests-lua-periodic-timer-test-ts"></a>
### `tests/lua-periodic-timer.test.ts`

- Исходник: [открыть файл](../../tests/lua-periodic-timer.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-runner-test-ts"></a>
### `tests/lua-runner.test.ts`

- Исходник: [открыть файл](../../tests/lua-runner.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-runtime-test-ts"></a>
### `tests/lua-runtime.test.ts`

- Исходник: [открыть файл](../../tests/lua-runtime.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

<a id="tests-lua-sleep-test-ts"></a>
### `tests/lua-sleep.test.ts`

- Исходник: [открыть файл](../../tests/lua-sleep.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-timed-square-flight-test-ts"></a>
### `tests/lua-timed-square-flight.test.ts`

- Исходник: [открыть файл](../../tests/lua-timed-square-flight.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `advance`, `run`

<a id="tests-lua-utils-test-ts"></a>
### `tests/lua-utils.test.ts`

- Исходник: [открыть файл](../../tests/lua-utils.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-lua-validation-test-ts"></a>
### `tests/lua-validation.test.ts`

- Исходник: [открыть файл](../../tests/lua-validation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 4
- Ключевые символы: `arm`, `callback`, `point`, `takeoff`

<a id="tests-mavlink-bridge-test-ts"></a>
### `tests/mavlink-bridge.test.ts`

- Исходник: [открыть файл](../../tests/mavlink-bridge.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `cameraConnects`, `canBindUdp`, `canListenTcp`, `delay`, `makeApp`

<a id="tests-mission-assets-test-ts"></a>
### `tests/mission-assets.test.ts`

- Исходник: [открыть файл](../../tests/mission-assets.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-blockly-copy-test-ts"></a>
### `tests/mission-guide-blockly-copy.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-blockly-copy.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-blockly-values-test-ts"></a>
### `tests/mission-guide-blockly-values.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-blockly-values.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-camera-view-test-ts"></a>
### `tests/mission-guide-camera-view.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-camera-view.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-compilation-test-ts"></a>
### `tests/mission-guide-compilation.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-compilation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-course-ui-test-ts"></a>
### `tests/mission-guide-course-ui.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-course-ui.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-drafts-test-ts"></a>
### `tests/mission-guide-drafts.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-drafts.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `edit`

<a id="tests-mission-guide-learning-test-ts"></a>
### `tests/mission-guide-learning.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-learning.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-outline-navigation-test-ts"></a>
### `tests/mission-guide-outline-navigation.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-outline-navigation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-scene-preview-test-ts"></a>
### `tests/mission-guide-scene-preview.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-scene-preview.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-timeline-test-ts"></a>
### `tests/mission-guide-timeline.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-timeline.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-mission-guide-trace-test-ts"></a>
### `tests/mission-guide-trace.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-trace.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `errors`, `sample`

<a id="tests-mission-guide-validation-test-ts"></a>
### `tests/mission-guide-validation.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-validation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `getLesson`

<a id="tests-mission-guide-walkthrough-test-ts"></a>
### `tests/mission-guide-walkthrough.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide-walkthrough.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `index`, `practice`, `render`

<a id="tests-mission-guide-test-ts"></a>
### `tests/mission-guide.test.ts`

- Исходник: [открыть файл](../../tests/mission-guide.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-monaco-completion-test-ts"></a>
### `tests/monaco-completion.test.ts`

- Исходник: [открыть файл](../../tests/monaco-completion.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-paths-test-ts"></a>
### `tests/paths.test.ts`

- Исходник: [открыть файл](../../tests/paths.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-pioneer-blender-model-test-ts"></a>
### `tests/pioneer-blender-model.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blender-model.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `shell`

<a id="tests-pioneer-blockly-camera-test-ts"></a>
### `tests/pioneer-blockly-camera.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-camera.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `__poll_s0`, `__poll_s1`, `__poll_s2`, `callback`, `chainUnderStart`, `makeWorkspace`

<a id="tests-pioneer-blockly-codegen-test-ts"></a>
### `tests/pioneer-blockly-codegen.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-codegen.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `__loop_guard`, `callback`, `chainUnderStart`, `makeWorkspace`, `numberBlock`

<a id="tests-pioneer-blockly-contract-test-ts"></a>
### `tests/pioneer-blockly-contract.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-contract.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 15
- Ключевые символы: `$.while`, `buildFullFlightWorkspace`, `buildLuaAllowSet`, `buildWorkspaceForBlock`, `callback`, `checkLuaSyntax`, `extractBridgeGlobals`, `extractCalls`, `extractClassMethods`, `extractPioneerMethods`, `fillColourInputs`, `fillNumericInputs`, `isAllowedLuaCall`, `isAllowedPythonCall`, `numberInput`

<a id="tests-pioneer-blockly-events-test-ts"></a>
### `tests/pioneer-blockly-events.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-events.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `callback`, `chainUnderStart`, `flushBlocklyEvents`, `makeWorkspace`, `numberBlock`

<a id="tests-pioneer-blockly-lua-fsm-test-ts"></a>
### `tests/pioneer-blockly-lua-fsm.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-lua-fsm.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `__advance`, `callback`, `chainUnderStart`, `flushBlocklyEvents`, `makeWorkspace`, `numberBlock`

<a id="tests-pioneer-blockly-lua-structured-test-ts"></a>
### `tests/pioneer-blockly-lua-structured.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-lua-structured.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `compileProgram`

<a id="tests-pioneer-blockly-script-validation-test-ts"></a>
### `tests/pioneer-blockly-script-validation.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-script-validation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildFullFlightWorkspace`, `callback`, `numberBlock`

<a id="tests-pioneer-blockly-target-support-test-ts"></a>
### `tests/pioneer-blockly-target-support.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-blockly-target-support.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `flushBlocklyEvents`, `makeWorkspace`, `numberBlock`

<a id="tests-pioneer-js-bridge-test-ts"></a>
### `tests/pioneer-js-bridge.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-js-bridge.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-pioneer-official-examples-test-ts"></a>
### `tests/pioneer-official-examples.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-official-examples.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-pioneer-python-flight-execution-test-ts"></a>
### `tests/pioneer-python-flight-execution.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-python-flight-execution.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `runStarter`

<a id="tests-python-camera-frames-test-ts"></a>
### `tests/python-camera-frames.test.ts`

- Исходник: [открыть файл](../../tests/python-camera-frames.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-python-runtime-concurrency-test-ts"></a>
### `tests/python-runtime-concurrency.test.ts`

- Исходник: [открыть файл](../../tests/python-runtime-concurrency.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeApp`

<a id="tests-python-runtime-test-ts"></a>
### `tests/python-runtime.test.ts`

- Исходник: [открыть файл](../../tests/python-runtime.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `makeApp`, `uniqueDroneId`

<a id="tests-quality-governor-test-ts"></a>
### `tests/quality-governor.test.ts`

- Исходник: [открыть файл](../../tests/quality-governor.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-rc-settings-test-ts"></a>
### `tests/rc-settings.test.ts`

- Исходник: [открыть файл](../../tests/rc-settings.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-runtime-cleanup-test-ts"></a>
### `tests/runtime-cleanup.test.ts`

- Исходник: [открыть файл](../../tests/runtime-cleanup.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-scene-manager-catalog-test-ts"></a>
### `tests/scene-manager-catalog.test.ts`

- Исходник: [открыть файл](../../tests/scene-manager-catalog.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-script-execution-notice-failures-test-ts"></a>
### `tests/script-execution-notice-failures.test.ts`

- Исходник: [открыть файл](../../tests/script-execution-notice-failures.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-script-execution-notice-scenarios-test-ts"></a>
### `tests/script-execution-notice-scenarios.test.ts`

- Исходник: [открыть файл](../../tests/script-execution-notice-scenarios.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `changeColor`

<a id="tests-server-rate-limits-test-ts"></a>
### `tests/server-rate-limits.test.ts`

- Исходник: [открыть файл](../../tests/server-rate-limits.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeApp`

<a id="tests-settlement-policy-test-ts"></a>
### `tests/settlement-policy.test.ts`

- Исходник: [открыть файл](../../tests/settlement-policy.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `count`

<a id="tests-state-test-ts"></a>
### `tests/state.test.ts`

- Исходник: [открыть файл](../../tests/state.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-tracing-test-ts"></a>
### `tests/tracing.test.ts`

- Исходник: [открыть файл](../../tests/tracing.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-training-mesh-test-ts"></a>
### `tests/training-mesh.test.ts`

- Исходник: [открыть файл](../../tests/training-mesh.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `stats`

<a id="tests-training-roads-test-ts"></a>
### `tests/training-roads.test.ts`

- Исходник: [открыть файл](../../tests/training-roads.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `each`, `homesOf`, `roadsOf`

<a id="tests-training-terrain-test-ts"></a>
### `tests/training-terrain.test.ts`

- Исходник: [открыть файл](../../tests/training-terrain.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-training-variety-test-ts"></a>
### `tests/training-variety.test.ts`

- Исходник: [открыть файл](../../tests/training-variety.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-training-world-collisions-test-ts"></a>
### `tests/training-world-collisions.test.ts`

- Исходник: [открыть файл](../../tests/training-world-collisions.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-training-world-surfaces-test-ts"></a>
### `tests/training-world-surfaces.test.ts`

- Исходник: [открыть файл](../../tests/training-world-surfaces.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-viewport-pointer-controls-test-ts"></a>
### `tests/viewport-pointer-controls.test.ts`

- Исходник: [открыть файл](../../tests/viewport-pointer-controls.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `CanvasStub.hasPointerCapture`, `CanvasStub.releasePointerCapture`, `CanvasStub.setPointerCapture`, `drag`, `pointer`, `setup`

<a id="tests-workspace-panels-test-ts"></a>
### `tests/workspace-panels.test.ts`

- Исходник: [открыть файл](../../tests/workspace-panels.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `ElementStub.setAttribute`

<a id="tests-world-incidents-test-ts"></a>
### `tests/world-incidents.test.ts`

- Исходник: [открыть файл](../../tests/world-incidents.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-world-roads-mailbox-test-ts"></a>
### `tests/world-roads-mailbox.test.ts`

- Исходник: [открыть файл](../../tests/world-roads-mailbox.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-world-scenarios-test-ts"></a>
### `tests/world-scenarios.test.ts`

- Исходник: [открыть файл](../../tests/world-scenarios.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 8
- Ключевые символы: `inbox`, `meshesVisible`, `park`, `peopleOnScene`, `run`, `shown`, `tick`, `world`

<a id="tests-world-services-test-ts"></a>
### `tests/world-services.test.ts`

- Исходник: [открыть файл](../../tests/world-services.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 4
- Ключевые символы: `inbox`, `line`, `run`, `setup`

<a id="tests-world-traffic-test-ts"></a>
### `tests/world-traffic.test.ts`

- Исходник: [открыть файл](../../tests/world-traffic.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `distanceToRoads`, `h`, `mean`, `run`, `simulate`

<a id="tools-check-settlement-layouts-mjs"></a>
### `tools/check-settlement-layouts.mjs`

- Исходник: [открыть файл](../../tools/check-settlement-layouts.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 2
- Ключевые символы: `service`, `structure`

<a id="tools-functions-reference-config-mjs"></a>
### `tools/functions-reference/config.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/config.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 6
- Ключевые символы: `classifyFile`, `isMatch`, `relativeToRoot`, `slugFromPath`, `summaryForFile`, `toPosix`

<a id="tools-functions-reference-renderer-mjs"></a>
### `tools/functions-reference/renderer.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/renderer.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 4
- Ключевые символы: `ensureDir`, `relativeLink`, `renderGroupFile`, `renderRootIndex`

<a id="tools-functions-reference-scanner-mjs"></a>
### `tools/functions-reference/scanner.mjs`

- Исходник: [открыть файл](../../tools/functions-reference/scanner.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 4
- Ключевые символы: `buildMetadataByFile`, `collectTrackedFiles`, `extractFunctions`, `walk`

<a id="tools-generate-functions-reference-index-mjs"></a>
### `tools/generate_functions_reference_index.mjs`

- Исходник: [открыть файл](../../tools/generate_functions_reference_index.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-generate-marker-dictionaries-mjs"></a>
### `tools/generate_marker_dictionaries.mjs`

- Исходник: [открыть файл](../../tools/generate_marker_dictionaries.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 4
- Ключевые символы: `formatDataBlock`, `loadSources`, `main`, `parseSourceArrays`

<a id="tools-sync-lesson-examples-mjs"></a>
### `tools/sync_lesson_examples.mjs`

- Исходник: [открыть файл](../../tools/sync_lesson_examples.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-landscape-assets-v2-mjs"></a>
### `tools/validate-landscape-assets-v2.mjs`

- Исходник: [открыть файл](../../tools/validate-landscape-assets-v2.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-landscape-assets-v3-mjs"></a>
### `tools/validate-landscape-assets-v3.mjs`

- Исходник: [открыть файл](../../tools/validate-landscape-assets-v3.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-landscape-assets-v4-mjs"></a>
### `tools/validate-landscape-assets-v4.mjs`

- Исходник: [открыть файл](../../tools/validate-landscape-assets-v4.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-landscape-assets-v5-mjs"></a>
### `tools/validate-landscape-assets-v5.mjs`

- Исходник: [открыть файл](../../tools/validate-landscape-assets-v5.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-landscape-assets-mjs"></a>
### `tools/validate-landscape-assets.mjs`

- Исходник: [открыть файл](../../tools/validate-landscape-assets.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-validate-mission-assets-mjs"></a>
### `tools/validate-mission-assets.mjs`

- Исходник: [открыть файл](../../tools/validate-mission-assets.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-verify-panel-style-owners-mjs"></a>
### `tools/verify_panel_style_owners.mjs`

- Исходник: [открыть файл](../../tools/verify_panel_style_owners.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 2
- Ключевые символы: `list`, `visit`

