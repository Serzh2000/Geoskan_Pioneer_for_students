# Утилиты, тесты и инструменты

Вспомогательные функции общего назначения, автоматические тесты и инженерные скрипты для генерации или обслуживания проекта.

## Состав группы

- [`.claude/launch.json`](#claude-launch-json)
- [`.dbg/pioneer-check.json`](#dbg-pioneer-check-json)
- [`.impeccable/config.json`](#impeccable-config-json)
- [`.impeccable/config.local.json`](#impeccable-config-local-json)
- [`.impeccable/hook.cache.json`](#impeccable-hook-cache-json)
- [`.impeccable/mocks/decision/assigned.html`](#impeccable-mocks-decision-assigned-html)
- [`.impeccable/mocks/decision/atlas.html`](#impeccable-mocks-decision-atlas-html)
- [`.impeccable/mocks/decision/canon.html`](#impeccable-mocks-decision-canon-html)
- [`.impeccable/mocks/decision/challenger-crouwel.html`](#impeccable-mocks-decision-challenger-crouwel-html)
- [`.impeccable/mocks/decision/challenger-streaming.html`](#impeccable-mocks-decision-challenger-streaming-html)
- [`.impeccable/mocks/decision/challenger-zoo.html`](#impeccable-mocks-decision-challenger-zoo-html)
- [`.impeccable/mocks/decision/lab.html`](#impeccable-mocks-decision-lab-html)
- [`.impeccable/mocks/decision/model-pick.html`](#impeccable-mocks-decision-model-pick-html)
- [`.impeccable/mocks/decision/specimen.html`](#impeccable-mocks-decision-specimen-html)
- [`.impeccable/mocks/decision/transit.html`](#impeccable-mocks-decision-transit-html)
- [`.impeccable/polish-audit.json`](#impeccable-polish-audit-json)
- [`.impeccable/polish-before/public/fragments/panels/editor.html`](#impeccable-polish-before-public-fragments-panels-editor-html)
- [`.impeccable/polish-before/public/modules/ui/controls/camera-mode.ts`](#impeccable-polish-before-public-modules-ui-controls-camera-mode-ts)
- [`.impeccable/polish-before/public/modules/ui/controls/file-controls.ts`](#impeccable-polish-before-public-modules-ui-controls-file-controls-ts)
- [`.impeccable/polish-before/public/modules/ui/mission-guide/render/text-guide.ts`](#impeccable-polish-before-public-modules-ui-mission-guide-render-text-guide-ts)
- [`.impeccable/questions/8a328775.answer.json`](#impeccable-questions-8a328775-answer-json)
- [`.impeccable/questions/8a328775.hand.json`](#impeccable-questions-8a328775-hand-json)
- [`.impeccable/questions/8a328775.state.json`](#impeccable-questions-8a328775-state-json)
- [`.impeccable/questions/pioneer-redesign-options.json`](#impeccable-questions-pioneer-redesign-options-json)
- [`.impeccable/workspace-before/public/fragments/layout/main-scene.html`](#impeccable-workspace-before-public-fragments-layout-main-scene-html)
- [`.impeccable/workspace-before/public/fragments/layout/sidebar-tabs.html`](#impeccable-workspace-before-public-fragments-layout-sidebar-tabs-html)
- [`.impeccable/workspace-before/public/fragments/panels/editor.html`](#impeccable-workspace-before-public-fragments-panels-editor-html)
- [`.impeccable/workspace-before/public/fragments/panels/gamepad.html`](#impeccable-workspace-before-public-fragments-panels-gamepad-html)
- [`.impeccable/workspace-before/public/fragments/panels/manager/inspector.html`](#impeccable-workspace-before-public-fragments-panels-manager-inspector-html)
- [`.impeccable/workspace-before/public/fragments/panels/telemetry.html`](#impeccable-workspace-before-public-fragments-panels-telemetry-html)
- [`.impeccable/workspace-before/public/index.html`](#impeccable-workspace-before-public-index-html)
- [`.impeccable/workspace-before/public/modules/ui/api-docs/index.ts`](#impeccable-workspace-before-public-modules-ui-api-docs-index-ts)
- [`.impeccable/workspace-before/public/modules/ui/environment-control.ts`](#impeccable-workspace-before-public-modules-ui-environment-control-ts)
- [`.impeccable/workspace-before/public/modules/ui/onboarding-tour.ts`](#impeccable-workspace-before-public-modules-ui-onboarding-tour-ts)
- [`.impeccable/workspace-before/public/modules/ui/panels/editor-terminal.ts`](#impeccable-workspace-before-public-modules-ui-panels-editor-terminal-ts)
- [`.impeccable/workspace-before/public/modules/ui/panels/sidebar.ts`](#impeccable-workspace-before-public-modules-ui-panels-sidebar-ts)
- [`.impeccable/workspace-before/public/modules/ui/workspace-view.ts`](#impeccable-workspace-before-public-modules-ui-workspace-view-ts)
- [`.tmp/pioneer-device-session/python-packages/pyserial-3.5.dist-info/metadata.json`](#tmp-pioneer-device-session-python-packages-pyserial-3-5-dist-info-metadata-json)
- [`.tmp/pioneer-firmware-research/fengari-bytecode-result.json`](#tmp-pioneer-firmware-research-fengari-bytecode-result-json)
- [`.tmp/pioneer-firmware-research/jar-index.json`](#tmp-pioneer-firmware-research-jar-index-json)
- [`.tmp/pioneer-firmware-research/modern-crypto-refs.json`](#tmp-pioneer-firmware-research-modern-crypto-refs-json)
- [`.tmp/pioneer-firmware-research/official-doc-tree.json`](#tmp-pioneer-firmware-research-official-doc-tree-json)
- [`.tmp/pioneer-firmware-research/repro/evidence.json`](#tmp-pioneer-firmware-research-repro-evidence-json)
- [`data/accounts.json`](#data-accounts-json)
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
- [`examples-blocks/01_start/01_takeoff_land.json`](#examples-blocks-01-start-01-takeoff-land-json)
- [`examples-blocks/01_start/02_hover.json`](#examples-blocks-01-start-02-hover-json)
- [`examples-blocks/01_start/03_fly_up.json`](#examples-blocks-01-start-03-fly-up-json)
- [`examples-blocks/01_start/04_forward_and_back.json`](#examples-blocks-01-start-04-forward-and-back-json)
- [`examples-blocks/01_start/05_disarm_after_landing.json`](#examples-blocks-01-start-05-disarm-after-landing-json)
- [`examples-blocks/01_start/06_turn_around.json`](#examples-blocks-01-start-06-turn-around-json)
- [`examples-blocks/02_flight/01_square.json`](#examples-blocks-02-flight-01-square-json)
- [`examples-blocks/02_flight/02_square_twice.json`](#examples-blocks-02-flight-02-square-twice-json)
- [`examples-blocks/02_flight/03_triangle.json`](#examples-blocks-02-flight-03-triangle-json)
- [`examples-blocks/02_flight/04_rectangle.json`](#examples-blocks-02-flight-04-rectangle-json)
- [`examples-blocks/02_flight/05_diamond.json`](#examples-blocks-02-flight-05-diamond-json)
- [`examples-blocks/02_flight/06_cross.json`](#examples-blocks-02-flight-06-cross-json)
- [`examples-blocks/02_flight/07_staircase.json`](#examples-blocks-02-flight-07-staircase-json)
- [`examples-blocks/02_flight/08_zigzag.json`](#examples-blocks-02-flight-08-zigzag-json)
- [`examples-blocks/02_flight/09_points_list.json`](#examples-blocks-02-flight-09-points-list-json)
- [`examples-blocks/02_flight/10_circle.json`](#examples-blocks-02-flight-10-circle-json)
- [`examples-blocks/02_flight/11_spiral_up.json`](#examples-blocks-02-flight-11-spiral-up-json)
- [`examples-blocks/02_flight/12_turn_while_flying.json`](#examples-blocks-02-flight-12-turn-while-flying-json)
- [`examples-blocks/02_flight/13_grid_scan.json`](#examples-blocks-02-flight-13-grid-scan-json)
- [`examples-blocks/03_leds/01_colour_presets.json`](#examples-blocks-03-leds-01-colour-presets-json)
- [`examples-blocks/03_leds/02_rgb_mix.json`](#examples-blocks-03-leds-02-rgb-mix-json)
- [`examples-blocks/03_leds/03_traffic_light.json`](#examples-blocks-03-leds-03-traffic-light-json)
- [`examples-blocks/03_leds/04_blink.json`](#examples-blocks-03-leds-04-blink-json)
- [`examples-blocks/03_leds/05_running_light.json`](#examples-blocks-03-leds-05-running-light-json)
- [`examples-blocks/03_leds/06_rainbow.json`](#examples-blocks-03-leds-06-rainbow-json)
- [`examples-blocks/03_leds/07_police.json`](#examples-blocks-03-leds-07-police-json)
- [`examples-blocks/03_leds/08_flight_colours.json`](#examples-blocks-03-leds-08-flight-colours-json)
- [`examples-blocks/04_logic/01_variable_height.json`](#examples-blocks-04-logic-01-variable-height-json)
- [`examples-blocks/04_logic/02_side_length.json`](#examples-blocks-04-logic-02-side-length-json)
- [`examples-blocks/04_logic/03_if_else.json`](#examples-blocks-04-logic-03-if-else-json)
- [`examples-blocks/04_logic/04_alternate_colours.json`](#examples-blocks-04-logic-04-alternate-colours-json)
- [`examples-blocks/04_logic/05_while_loop.json`](#examples-blocks-04-logic-05-while-loop-json)
- [`examples-blocks/04_logic/06_signal_function.json`](#examples-blocks-04-logic-06-signal-function-json)
- [`examples-blocks/04_logic/07_random_colour.json`](#examples-blocks-04-logic-07-random-colour-json)
- [`examples-blocks/04_logic/08_wait_until.json`](#examples-blocks-04-logic-08-wait-until-json)
- [`examples-blocks/04_logic/09_tower.json`](#examples-blocks-04-logic-09-tower-json)
- [`examples-blocks/05_sensors/01_print_position.json`](#examples-blocks-05-sensors-01-print-position-json)
- [`examples-blocks/05_sensors/02_flight_timer.json`](#examples-blocks-05-sensors-02-flight-timer-json)
- [`examples-blocks/05_sensors/03_battery_check.json`](#examples-blocks-05-sensors-03-battery-check-json)
- [`examples-blocks/05_sensors/04_height_light.json`](#examples-blocks-05-sensors-04-height-light-json)
- [`examples-blocks/05_sensors/05_countdown.json`](#examples-blocks-05-sensors-05-countdown-json)
- [`examples-blocks/06_events/01_blink_timer.json`](#examples-blocks-06-events-01-blink-timer-json)
- [`examples-blocks/06_events/02_after_once.json`](#examples-blocks-06-events-02-after-once-json)
- [`examples-blocks/06_events/03_two_timers.json`](#examples-blocks-06-events-03-two-timers-json)
- [`examples-blocks/06_events/04_lua_landing_event.json`](#examples-blocks-06-events-04-lua-landing-event-json)
- [`examples-blocks/07_projects/01_cargo_delivery.json`](#examples-blocks-07-projects-01-cargo-delivery-json)
- [`examples-blocks/07_projects/02_patrol.json`](#examples-blocks-07-projects-02-patrol-json)
- [`examples-blocks/07_projects/03_light_show.json`](#examples-blocks-07-projects-03-light-show-json)
- [`examples-blocks/07_projects/04_photo_points.json`](#examples-blocks-07-projects-04-photo-points-json)
- [`examples-blocks/07_projects/05_two_cargo_runs.json`](#examples-blocks-07-projects-05-two-cargo-runs-json)
- [`examples-python/advanced_navigation/camera_params_yaml.yaml`](#examples-python-advanced-navigation-camera-params-yaml-yaml)
- [`examples-python/advanced_navigation/map_json_example.json`](#examples-python-advanced-navigation-map-json-example-json)
- [`jest.config.js`](#jest-config-js)
- [`package-lock.json`](#package-lock-json)
- [`premium-audit.json`](#premium-audit-json)
- [`premium-ui.json`](#premium-ui-json)
- [`public/assets/models/pioneer/pioneer-basic.json`](#public-assets-models-pioneer-pioneer-basic-json)
- [`public/assets/models/pioneer/pioneer-mini2.json`](#public-assets-models-pioneer-pioneer-mini2-json)
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
- [`public/design-proposals/laboratory.html`](#public-design-proposals-laboratory-html)
- [`public/fragments/layout/main-scene.html`](#public-fragments-layout-main-scene-html)
- [`public/fragments/layout/sidebar-panels.html`](#public-fragments-layout-sidebar-panels-html)
- [`public/fragments/layout/sidebar-tabs.html`](#public-fragments-layout-sidebar-tabs-html)
- [`public/fragments/modals/gamepad-wizard.html`](#public-fragments-modals-gamepad-wizard-html)
- [`public/fragments/panels/account.html`](#public-fragments-panels-account-html)
- [`public/fragments/panels/docs.html`](#public-fragments-panels-docs-html)
- [`public/fragments/panels/drone-link.html`](#public-fragments-panels-drone-link-html)
- [`public/fragments/panels/drones.html`](#public-fragments-panels-drones-html)
- [`public/fragments/panels/editor-terminal.html`](#public-fragments-panels-editor-terminal-html)
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
- [`public/modules/app/scene-session-data.ts`](#public-modules-app-scene-session-data-ts)
- [`public/modules/app/scene-session.ts`](#public-modules-app-scene-session-ts)
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
- [`public/modules/core/drone-models.ts`](#public-modules-core-drone-models-ts)
- [`public/modules/core/learning-journal.ts`](#public-modules-core-learning-journal-ts)
- [`public/modules/core/mission-notices.ts`](#public-modules-core-mission-notices-ts)
- [`public/modules/core/script-failure.ts`](#public-modules-core-script-failure-ts)
- [`public/modules/core/state-drone.ts`](#public-modules-core-state-drone-ts)
- [`public/modules/core/state-types.ts`](#public-modules-core-state-types-ts)
- [`public/modules/core/state.ts`](#public-modules-core-state-ts)
- [`public/modules/docs/api-docs-events.ts`](#public-modules-docs-api-docs-events-ts)
- [`public/modules/docs/api-docs-types.ts`](#public-modules-docs-api-docs-types-ts)
- [`public/modules/docs/api-docs.ts`](#public-modules-docs-api-docs-ts)
- [`public/modules/docs/bricks-blocks-docs.ts`](#public-modules-docs-bricks-blocks-docs-ts)
- [`public/modules/docs/lua-api-docs-events.ts`](#public-modules-docs-lua-api-docs-events-ts)
- [`public/modules/docs/lua-api-docs-flight.ts`](#public-modules-docs-lua-api-docs-flight-ts)
- [`public/modules/docs/lua-api-docs-runtime.ts`](#public-modules-docs-lua-api-docs-runtime-ts)
- [`public/modules/docs/lua-api-docs.ts`](#public-modules-docs-lua-api-docs-ts)
- [`public/modules/docs/lua-stdlib-docs.ts`](#public-modules-docs-lua-stdlib-docs-ts)
- [`public/modules/docs/python-api-docs.ts`](#public-modules-docs-python-api-docs-ts)
- [`public/modules/docs/python-rknn-api-docs.ts`](#public-modules-docs-python-rknn-api-docs-ts)
- [`public/modules/docs/python-sdk2-api-docs.ts`](#public-modules-docs-python-sdk2-api-docs-ts)
- [`public/modules/docs/python-stdlib-docs.ts`](#public-modules-docs-python-stdlib-docs-ts)
- [`public/modules/hardware/drone-link.ts`](#public-modules-hardware-drone-link-ts)
- [`public/modules/hardware/lua-bytecode.ts`](#public-modules-hardware-lua-bytecode-ts)
- [`public/modules/hardware/plazlink/client.ts`](#public-modules-hardware-plazlink-client-ts)
- [`public/modules/hardware/plazlink/frame.ts`](#public-modules-hardware-plazlink-frame-ts)
- [`public/modules/hardware/telemetry.ts`](#public-modules-hardware-telemetry-ts)
- [`public/modules/hardware/web-serial-transport.ts`](#public-modules-hardware-web-serial-transport-ts)
- [`public/modules/learning/account-ui.ts`](#public-modules-learning-account-ui-ts)
- [`public/modules/learning/account.ts`](#public-modules-learning-account-ts)
- [`public/modules/learning/achievement-art.ts`](#public-modules-learning-achievement-art-ts)
- [`public/modules/learning/bricks-quests.ts`](#public-modules-learning-bricks-quests-ts)
- [`public/modules/learning/cabinet-kit.ts`](#public-modules-learning-cabinet-kit-ts)
- [`public/modules/learning/controller.ts`](#public-modules-learning-controller-ts)
- [`public/modules/learning/guides.ts`](#public-modules-learning-guides-ts)
- [`public/modules/learning/mini2-drone.ts`](#public-modules-learning-mini2-drone-ts)
- [`public/modules/learning/mode.ts`](#public-modules-learning-mode-ts)
- [`public/modules/learning/quests.ts`](#public-modules-learning-quests-ts)
- [`public/modules/learning/sdk2-quests.ts`](#public-modules-learning-sdk2-quests-ts)
- [`public/modules/learning/student-cabinet.ts`](#public-modules-learning-student-cabinet-ts)
- [`public/modules/learning/teacher-panel.ts`](#public-modules-learning-teacher-panel-ts)
- [`public/modules/learning/teacher-report.ts`](#public-modules-learning-teacher-report-ts)
- [`public/modules/learning/tracks.ts`](#public-modules-learning-tracks-ts)
- [`public/modules/sensors/downward.ts`](#public-modules-sensors-downward-ts)
- [`public/modules/sensors/ranger.ts`](#public-modules-sensors-ranger-ts)
- [`public/modules/shared/background-ticker.ts`](#public-modules-shared-background-ticker-ts)
- [`public/modules/shared/drone-scale.ts`](#public-modules-shared-drone-scale-ts)
- [`public/modules/shared/fpv-cube-geometry.ts`](#public-modules-shared-fpv-cube-geometry-ts)
- [`public/modules/shared/funny-names.ts`](#public-modules-shared-funny-names-ts)
- [`public/modules/shared/gate-geometry.ts`](#public-modules-shared-gate-geometry-ts)
- [`public/modules/shared/logging/journal.ts`](#public-modules-shared-logging-journal-ts)
- [`public/modules/shared/logging/logger.ts`](#public-modules-shared-logging-logger-ts)
- [`public/modules/shared/math.ts`](#public-modules-shared-math-ts)
- [`public/modules/shared/notice-messages/catalog.ts`](#public-modules-shared-notice-messages-catalog-ts)
- [`public/modules/shared/notice-messages/lua-errors.ts`](#public-modules-shared-notice-messages-lua-errors-ts)
- [`public/modules/shared/notice-messages/python-errors.ts`](#public-modules-shared-notice-messages-python-errors-ts)
- [`public/modules/shared/notice-messages/types.ts`](#public-modules-shared-notice-messages-types-ts)
- [`public/modules/shared/object-types.ts`](#public-modules-shared-object-types-ts)
- [`public/modules/vehicles/api.ts`](#public-modules-vehicles-api-ts)
- [`public/modules/vehicles/engine.ts`](#public-modules-vehicles-engine-ts)
- [`public/modules/world/actors.ts`](#public-modules-world-actors-ts)
- [`public/modules/world/atmosphere-model.ts`](#public-modules-world-atmosphere-model-ts)
- [`public/modules/world/atmosphere.ts`](#public-modules-world-atmosphere-ts)
- [`public/modules/world/car-fleet.ts`](#public-modules-world-car-fleet-ts)
- [`public/modules/world/car-model.ts`](#public-modules-world-car-model-ts)
- [`public/modules/world/crews.ts`](#public-modules-world-crews-ts)
- [`public/modules/world/incidents.ts`](#public-modules-world-incidents-ts)
- [`public/modules/world/mailbox.ts`](#public-modules-world-mailbox-ts)
- [`public/modules/world/pedestrians.ts`](#public-modules-world-pedestrians-ts)
- [`public/modules/world/people-preview.html`](#public-modules-world-people-preview-html)
- [`public/modules/world/person-model.ts`](#public-modules-world-person-model-ts)
- [`public/modules/world/props.ts`](#public-modules-world-props-ts)
- [`public/modules/world/road-marks.ts`](#public-modules-world-road-marks-ts)
- [`public/modules/world/roads.ts`](#public-modules-world-roads-ts)
- [`public/modules/world/runtime.ts`](#public-modules-world-runtime-ts)
- [`public/modules/world/services.ts`](#public-modules-world-services-ts)
- [`public/modules/world/signal-lights.ts`](#public-modules-world-signal-lights-ts)
- [`public/modules/world/signals.ts`](#public-modules-world-signals-ts)
- [`public/modules/world/traffic.ts`](#public-modules-world-traffic-ts)
- [`public/modules/world/vehicle-kinds.ts`](#public-modules-world-vehicle-kinds-ts)
- [`public/modules/world/walkers.ts`](#public-modules-world-walkers-ts)
- [`public/modules/world/walknet.ts`](#public-modules-world-walknet-ts)
- [`server-dev.ts`](#server-dev-ts)
- [`server/accounts.ts`](#server-accounts-ts)
- [`server/attempts.ts`](#server-attempts-ts)
- [`server/cabinet.ts`](#server-cabinet-ts)
- [`server/external-python-bridge.ts`](#server-external-python-bridge-ts)
- [`server/mavlink-bridge.ts`](#server-mavlink-bridge-ts)
- [`server/metrics.ts`](#server-metrics-ts)
- [`server/pioneer-connection.ts`](#server-pioneer-connection-ts)
- [`server/python-runtime.ts`](#server-python-runtime-ts)
- [`tests/academy-drone.test.ts`](#tests-academy-drone-test-ts)
- [`tests/academy-explainers.test.ts`](#tests-academy-explainers-test-ts)
- [`tests/academy-flight.test.ts`](#tests-academy-flight-test-ts)
- [`tests/academy-runtime-harness.ts`](#tests-academy-runtime-harness-ts)
- [`tests/academy-scene-vision.test.ts`](#tests-academy-scene-vision-test-ts)
- [`tests/academy-sdk-extras.test.ts`](#tests-academy-sdk-extras-test-ts)
- [`tests/academy-sdk-lua-more.test.ts`](#tests-academy-sdk-lua-more-test-ts)
- [`tests/academy-signals-code.test.ts`](#tests-academy-signals-code-test-ts)
- [`tests/academy-telemetry.test.ts`](#tests-academy-telemetry-test-ts)
- [`tests/academy-time.test.ts`](#tests-academy-time-test-ts)
- [`tests/academy-vision-harness.ts`](#tests-academy-vision-harness-ts)
- [`tests/academy-vision.test.ts`](#tests-academy-vision-test-ts)
- [`tests/accounts.test.ts`](#tests-accounts-test-ts)
- [`tests/achievements.test.ts`](#tests-achievements-test-ts)
- [`tests/api-doc-examples.test.ts`](#tests-api-doc-examples-test-ts)
- [`tests/asset-stub.ts`](#tests-asset-stub-ts)
- [`tests/atmosphere-model.test.ts`](#tests-atmosphere-model-test-ts)
- [`tests/attempts.test.ts`](#tests-attempts-test-ts)
- [`tests/block-examples.test.ts`](#tests-block-examples-test-ts)
- [`tests/blockly-codegen.test.ts`](#tests-blockly-codegen-test-ts)
- [`tests/blockly-debug.test.ts`](#tests-blockly-debug-test-ts)
- [`tests/blockly-python-blocks.test.ts`](#tests-blockly-python-blocks-test-ts)
- [`tests/blockly-workspace-controller.test.ts`](#tests-blockly-workspace-controller-test-ts)
- [`tests/book-localize.test.ts`](#tests-book-localize-test-ts)
- [`tests/bricks-blocks.test.ts`](#tests-bricks-blocks-test-ts)
- [`tests/bricks-docs.test.ts`](#tests-bricks-docs-test-ts)
- [`tests/bricks-editor.test.ts`](#tests-bricks-editor-test-ts)
- [`tests/bricks-example-set.test.ts`](#tests-bricks-example-set-test-ts)
- [`tests/bricks-examples.test.ts`](#tests-bricks-examples-test-ts)
- [`tests/bricks-missions.test.ts`](#tests-bricks-missions-test-ts)
- [`tests/bricks-runtime.test.ts`](#tests-bricks-runtime-test-ts)
- [`tests/cabinets.test.ts`](#tests-cabinets-test-ts)
- [`tests/cargo-contact.test.ts`](#tests-cargo-contact-test-ts)
- [`tests/city-buildings.test.ts`](#tests-city-buildings-test-ts)
- [`tests/city-plan.test.ts`](#tests-city-plan-test-ts)
- [`tests/collision-audit.test.ts`](#tests-collision-audit-test-ts)
- [`tests/collision-world.test.ts`](#tests-collision-world-test-ts)
- [`tests/drone-ground-support.test.ts`](#tests-drone-ground-support-test-ts)
- [`tests/drone-model-mini2.test.ts`](#tests-drone-model-mini2-test-ts)
- [`tests/drone-telemetry.test.ts`](#tests-drone-telemetry-test-ts)
- [`tests/editor-blockly-ui.test.ts`](#tests-editor-blockly-ui-test-ts)
- [`tests/editor-docs-keyboard.test.ts`](#tests-editor-docs-keyboard-test-ts)
- [`tests/editor-overlays.test.ts`](#tests-editor-overlays-test-ts)
- [`tests/environment-geometry.test.ts`](#tests-environment-geometry-test-ts)
- [`tests/external-bridge-frozen-clock.test.ts`](#tests-external-bridge-frozen-clock-test-ts)
- [`tests/external-python-bridge.test.ts`](#tests-external-python-bridge-test-ts)
- [`tests/fast-raycast.test.ts`](#tests-fast-raycast-test-ts)
- [`tests/fixtures/block-examples.json`](#tests-fixtures-block-examples-json)
- [`tests/fixtures/lua-drone-bytecode.json`](#tests-fixtures-lua-drone-bytecode-json)
- [`tests/fixtures/pioneer-official/manifest.json`](#tests-fixtures-pioneer-official-manifest-json)
- [`tests/flight-journal.test.ts`](#tests-flight-journal-test-ts)
- [`tests/fpv-cube.test.ts`](#tests-fpv-cube-test-ts)
- [`tests/frames.test.ts`](#tests-frames-test-ts)
- [`tests/fsm.test.ts`](#tests-fsm-test-ts)
- [`tests/funny-names-and-session.test.ts`](#tests-funny-names-and-session-test-ts)
- [`tests/gamepad-dialog.test.ts`](#tests-gamepad-dialog-test-ts)
- [`tests/geoscan-examples-blockly.test.ts`](#tests-geoscan-examples-blockly-test-ts)
- [`tests/ground-overview.test.ts`](#tests-ground-overview-test-ts)
- [`tests/helpers/block-flight.ts`](#tests-helpers-block-flight-ts)
- [`tests/helpers/blockly-json.ts`](#tests-helpers-blockly-json-ts)
- [`tests/helpers/bricks-fixtures.ts`](#tests-helpers-bricks-fixtures-ts)
- [`tests/helpers/layout-rules.ts`](#tests-helpers-layout-rules-ts)
- [`tests/helpers/lua-sim-harness.ts`](#tests-helpers-lua-sim-harness-ts)
- [`tests/helpers/map-audit.ts`](#tests-helpers-map-audit-ts)
- [`tests/helpers/mini2-runtime.ts`](#tests-helpers-mini2-runtime-ts)
- [`tests/helpers/python-sdk-harness.ts`](#tests-helpers-python-sdk-harness-ts)
- [`tests/helpers/script-execution-notice-harness.ts`](#tests-helpers-script-execution-notice-harness-ts)
- [`tests/helpers/trace-compare.ts`](#tests-helpers-trace-compare-ts)
- [`tests/journal-and-training-props.test.ts`](#tests-journal-and-training-props-test-ts)
- [`tests/learning-quests.test.ts`](#tests-learning-quests-test-ts)
- [`tests/lessons-book-examples.test.ts`](#tests-lessons-book-examples-test-ts)
- [`tests/logger.test.ts`](#tests-logger-test-ts)
- [`tests/lua-api-constants.test.ts`](#tests-lua-api-constants-test-ts)
- [`tests/lua-autopilot.test.ts`](#tests-lua-autopilot-test-ts)
- [`tests/lua-drone-bytecode.test.ts`](#tests-lua-drone-bytecode-test-ts)
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
- [`tests/map-generation-audit.test.ts`](#tests-map-generation-audit-test-ts)
- [`tests/marker-scan.test.ts`](#tests-marker-scan-test-ts)
- [`tests/mavlink-bridge.test.ts`](#tests-mavlink-bridge-test-ts)
- [`tests/mini2-tracks.test.ts`](#tests-mini2-tracks-test-ts)
- [`tests/mission-assets.test.ts`](#tests-mission-assets-test-ts)
- [`tests/monaco-completion-extras.test.ts`](#tests-monaco-completion-extras-test-ts)
- [`tests/monaco-completion.test.ts`](#tests-monaco-completion-test-ts)
- [`tests/notice-guide-lessons.test.ts`](#tests-notice-guide-lessons-test-ts)
- [`tests/notice-messages.test.ts`](#tests-notice-messages-test-ts)
- [`tests/notice-policy.test.ts`](#tests-notice-policy-test-ts)
- [`tests/paths.test.ts`](#tests-paths-test-ts)
- [`tests/pioneer-blender-model.test.ts`](#tests-pioneer-blender-model-test-ts)
- [`tests/pioneer-block-lessons.test.ts`](#tests-pioneer-block-lessons-test-ts)
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
- [`tests/pioneer-rknn-module.test.ts`](#tests-pioneer-rknn-module-test-ts)
- [`tests/pioneer-rknn-scene.test.ts`](#tests-pioneer-rknn-scene-test-ts)
- [`tests/plazlink.test.ts`](#tests-plazlink-test-ts)
- [`tests/python-camera-frames.test.ts`](#tests-python-camera-frames-test-ts)
- [`tests/python-cv2-emulation.test.ts`](#tests-python-cv2-emulation-test-ts)
- [`tests/python-runtime-concurrency.test.ts`](#tests-python-runtime-concurrency-test-ts)
- [`tests/python-runtime-globals.test.ts`](#tests-python-runtime-globals-test-ts)
- [`tests/python-runtime.test.ts`](#tests-python-runtime-test-ts)
- [`tests/python-sdk-docs-coverage.test.ts`](#tests-python-sdk-docs-coverage-test-ts)
- [`tests/python-sdk2-module.test.ts`](#tests-python-sdk2-module-test-ts)
- [`tests/quality-governor.test.ts`](#tests-quality-governor-test-ts)
- [`tests/runtime-cleanup.test.ts`](#tests-runtime-cleanup-test-ts)
- [`tests/scene-manager-catalog.test.ts`](#tests-scene-manager-catalog-test-ts)
- [`tests/scene-placement.test.ts`](#tests-scene-placement-test-ts)
- [`tests/script-execution-notice-failures.test.ts`](#tests-script-execution-notice-failures-test-ts)
- [`tests/script-execution-notice-scenarios.test.ts`](#tests-script-execution-notice-scenarios-test-ts)
- [`tests/sdk2-missions.test.ts`](#tests-sdk2-missions-test-ts)
- [`tests/server-rate-limits.test.ts`](#tests-server-rate-limits-test-ts)
- [`tests/settlement-policy.test.ts`](#tests-settlement-policy-test-ts)
- [`tests/state.test.ts`](#tests-state-test-ts)
- [`tests/teacher-rename.test.ts`](#tests-teacher-rename-test-ts)
- [`tests/teacher-report.test.ts`](#tests-teacher-report-test-ts)
- [`tests/terminal-session.test.ts`](#tests-terminal-session-test-ts)
- [`tests/terminal-workbench.test.ts`](#tests-terminal-workbench-test-ts)
- [`tests/tracing.test.ts`](#tests-tracing-test-ts)
- [`tests/training-mesh.test.ts`](#tests-training-mesh-test-ts)
- [`tests/training-roads.test.ts`](#tests-training-roads-test-ts)
- [`tests/training-terrain.test.ts`](#tests-training-terrain-test-ts)
- [`tests/training-variety.test.ts`](#tests-training-variety-test-ts)
- [`tests/training-world-collisions.test.ts`](#tests-training-world-collisions-test-ts)
- [`tests/training-world-surfaces.test.ts`](#tests-training-world-surfaces-test-ts)
- [`tests/viewport-pointer-controls.test.ts`](#tests-viewport-pointer-controls-test-ts)
- [`tests/web-serial-transport.test.ts`](#tests-web-serial-transport-test-ts)
- [`tests/wizard-radio-model.test.ts`](#tests-wizard-radio-model-test-ts)
- [`tests/workspace-panels.test.ts`](#tests-workspace-panels-test-ts)
- [`tests/workspace-reset.test.ts`](#tests-workspace-reset-test-ts)
- [`tests/world-fleet.test.ts`](#tests-world-fleet-test-ts)
- [`tests/world-incidents.test.ts`](#tests-world-incidents-test-ts)
- [`tests/world-people-actors.test.ts`](#tests-world-people-actors-test-ts)
- [`tests/world-people-harness.ts`](#tests-world-people-harness-ts)
- [`tests/world-people.test.ts`](#tests-world-people-test-ts)
- [`tests/world-props-audit.test.ts`](#tests-world-props-audit-test-ts)
- [`tests/world-roads-mailbox.test.ts`](#tests-world-roads-mailbox-test-ts)
- [`tests/world-scenarios.test.ts`](#tests-world-scenarios-test-ts)
- [`tests/world-services.test.ts`](#tests-world-services-test-ts)
- [`tests/world-signal-lights.test.ts`](#tests-world-signal-lights-test-ts)
- [`tests/world-street-props.test.ts`](#tests-world-street-props-test-ts)
- [`tests/world-traffic.test.ts`](#tests-world-traffic-test-ts)
- [`tools/block-examples/build.mjs`](#tools-block-examples-build-mjs)
- [`tools/block-examples/dsl.mjs`](#tools-block-examples-dsl-mjs)
- [`tools/block-examples/examples.mjs`](#tools-block-examples-examples-mjs)
- [`tools/check-map-generation.mjs`](#tools-check-map-generation-mjs)
- [`tools/check-settlement-layouts.mjs`](#tools-check-settlement-layouts-mjs)
- [`tools/functions-reference/config.mjs`](#tools-functions-reference-config-mjs)
- [`tools/functions-reference/renderer.mjs`](#tools-functions-reference-renderer-mjs)
- [`tools/functions-reference/scanner.mjs`](#tools-functions-reference-scanner-mjs)
- [`tools/generate_functions_reference_index.mjs`](#tools-generate-functions-reference-index-mjs)
- [`tools/generate_marker_dictionaries.mjs`](#tools-generate-marker-dictionaries-mjs)
- [`tools/optimize_pioneer_glb.mjs`](#tools-optimize-pioneer-glb-mjs)
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

<a id="impeccable-config-json"></a>
### `.impeccable/config.json`

- Исходник: [открыть файл](../../.impeccable/config.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-config-local-json"></a>
### `.impeccable/config.local.json`

- Исходник: [открыть файл](../../.impeccable/config.local.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-hook-cache-json"></a>
### `.impeccable/hook.cache.json`

- Исходник: [открыть файл](../../.impeccable/hook.cache.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-assigned-html"></a>
### `.impeccable/mocks/decision/assigned.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/assigned.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-atlas-html"></a>
### `.impeccable/mocks/decision/atlas.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/atlas.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-canon-html"></a>
### `.impeccable/mocks/decision/canon.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/canon.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-challenger-crouwel-html"></a>
### `.impeccable/mocks/decision/challenger-crouwel.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/challenger-crouwel.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-challenger-streaming-html"></a>
### `.impeccable/mocks/decision/challenger-streaming.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/challenger-streaming.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-challenger-zoo-html"></a>
### `.impeccable/mocks/decision/challenger-zoo.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/challenger-zoo.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-lab-html"></a>
### `.impeccable/mocks/decision/lab.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/lab.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-model-pick-html"></a>
### `.impeccable/mocks/decision/model-pick.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/model-pick.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-specimen-html"></a>
### `.impeccable/mocks/decision/specimen.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/specimen.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-mocks-decision-transit-html"></a>
### `.impeccable/mocks/decision/transit.html`

- Исходник: [открыть файл](../../.impeccable/mocks/decision/transit.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-polish-audit-json"></a>
### `.impeccable/polish-audit.json`

- Исходник: [открыть файл](../../.impeccable/polish-audit.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-polish-before-public-fragments-panels-editor-html"></a>
### `.impeccable/polish-before/public/fragments/panels/editor.html`

- Исходник: [открыть файл](../../.impeccable/polish-before/public/fragments/panels/editor.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-polish-before-public-modules-ui-controls-camera-mode-ts"></a>
### `.impeccable/polish-before/public/modules/ui/controls/camera-mode.ts`

- Исходник: [открыть файл](../../.impeccable/polish-before/public/modules/ui/controls/camera-mode.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 4
- Ключевые символы: `initCameraModeUI`, `resync`, `slideIndicatorTo`, `syncGroup`

<a id="impeccable-polish-before-public-modules-ui-controls-file-controls-ts"></a>
### `.impeccable/polish-before/public/modules/ui/controls/file-controls.ts`

- Исходник: [открыть файл](../../.impeccable/polish-before/public/modules/ui/controls/file-controls.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 3
- Ключевые символы: `initFileControls`, `populateFileOptions`, `refreshFileList`

<a id="impeccable-polish-before-public-modules-ui-mission-guide-render-text-guide-ts"></a>
### `.impeccable/polish-before/public/modules/ui/mission-guide/render/text-guide.ts`

- Исходник: [открыть файл](../../.impeccable/polish-before/public/modules/ui/mission-guide/render/text-guide.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 3
- Ключевые символы: `renderTextBuildStep`, `renderTextCheckStep`, `renderTextGuide`

<a id="impeccable-questions-8a328775-answer-json"></a>
### `.impeccable/questions/8a328775.answer.json`

- Исходник: [открыть файл](../../.impeccable/questions/8a328775.answer.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-questions-8a328775-hand-json"></a>
### `.impeccable/questions/8a328775.hand.json`

- Исходник: [открыть файл](../../.impeccable/questions/8a328775.hand.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-questions-8a328775-state-json"></a>
### `.impeccable/questions/8a328775.state.json`

- Исходник: [открыть файл](../../.impeccable/questions/8a328775.state.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-questions-pioneer-redesign-options-json"></a>
### `.impeccable/questions/pioneer-redesign-options.json`

- Исходник: [открыть файл](../../.impeccable/questions/pioneer-redesign-options.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-layout-main-scene-html"></a>
### `.impeccable/workspace-before/public/fragments/layout/main-scene.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/layout/main-scene.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-layout-sidebar-tabs-html"></a>
### `.impeccable/workspace-before/public/fragments/layout/sidebar-tabs.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/layout/sidebar-tabs.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-panels-editor-html"></a>
### `.impeccable/workspace-before/public/fragments/panels/editor.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/panels/editor.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-panels-gamepad-html"></a>
### `.impeccable/workspace-before/public/fragments/panels/gamepad.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/panels/gamepad.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-panels-manager-inspector-html"></a>
### `.impeccable/workspace-before/public/fragments/panels/manager/inspector.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/panels/manager/inspector.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-fragments-panels-telemetry-html"></a>
### `.impeccable/workspace-before/public/fragments/panels/telemetry.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/fragments/panels/telemetry.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-index-html"></a>
### `.impeccable/workspace-before/public/index.html`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/index.html)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="impeccable-workspace-before-public-modules-ui-api-docs-index-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/api-docs/index.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/api-docs/index.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 15
- Ключевые символы: `attachInteractions`, `destroyPreviews`, `escapeHtml`, `highlightApiCode`, `mountOpenPreview`, `openApiDocsCatalog`, `renderApiDocs`, `renderDirectionTag`, `renderEntry`, `renderEntryBody`, `renderFact`, `renderPreviewShell`, `renderSections`, `renderToolbar`, `restoreSearchSelection`

<a id="impeccable-workspace-before-public-modules-ui-environment-control-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/environment-control.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/environment-control.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 4
- Ключевые символы: `initEnvironmentControl`, `render`, `renderWeather`, `setOpen`

<a id="impeccable-workspace-before-public-modules-ui-onboarding-tour-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/onboarding-tour.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/onboarding-tour.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 12
- Ключевые символы: `back`, `clampX`, `clampY`, `end`, `initOnboardingTour`, `isAvailable`, `isVisible`, `next`, `onKey`, `place`, `render`, `startOnboardingTour`

<a id="impeccable-workspace-before-public-modules-ui-panels-editor-terminal-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/panels/editor-terminal.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/panels/editor-terminal.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 13
- Ключевые символы: `announceNew`, `close`, `createJournalLine`, `createSystemToggle`, `describe`, `endResize`, `initEditorTerminal`, `readShowSystem`, `render`, `resize`, `resizeBounds`, `syncLiveRegions`, `writeShowSystem`

<a id="impeccable-workspace-before-public-modules-ui-panels-sidebar-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/panels/sidebar.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/panels/sidebar.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 15
- Ключевые символы: `closePanelWithAnimation`, `endResize`, `finishClosePanel`, `initSidebar`, `isMobileSidebar`, `openPanel`, `persistActivePanel`, `refreshViewportLayout`, `resetClosingState`, `restoreSidebarState`, `saveWidth`, `setActiveTabButton`, `syncResponsiveSidebarState`, `syncSidebarCollapsedState`, `widthKey`

<a id="impeccable-workspace-before-public-modules-ui-workspace-view-ts"></a>
### `.impeccable/workspace-before/public/modules/ui/workspace-view.ts`

- Исходник: [открыть файл](../../.impeccable/workspace-before/public/modules/ui/workspace-view.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 10
- Ключевые символы: `applyExpanded`, `applyPage`, `hasOpenPanel`, `initWorkspaceView`, `isEditorOpen`, `on.if`, `readEditorExpanded`, `refreshViewports`, `sync`, `writeEditorExpanded`

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

<a id="data-accounts-json"></a>
### `data/accounts.json`

- Исходник: [открыть файл](../../data/accounts.json)
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

<a id="examples-blocks-01-start-01-takeoff-land-json"></a>
### `examples-blocks/01_start/01_takeoff_land.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/01_takeoff_land.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-01-start-02-hover-json"></a>
### `examples-blocks/01_start/02_hover.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/02_hover.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-01-start-03-fly-up-json"></a>
### `examples-blocks/01_start/03_fly_up.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/03_fly_up.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-01-start-04-forward-and-back-json"></a>
### `examples-blocks/01_start/04_forward_and_back.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/04_forward_and_back.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-01-start-05-disarm-after-landing-json"></a>
### `examples-blocks/01_start/05_disarm_after_landing.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/05_disarm_after_landing.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-01-start-06-turn-around-json"></a>
### `examples-blocks/01_start/06_turn_around.json`

- Исходник: [открыть файл](../../examples-blocks/01_start/06_turn_around.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-01-square-json"></a>
### `examples-blocks/02_flight/01_square.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/01_square.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-02-square-twice-json"></a>
### `examples-blocks/02_flight/02_square_twice.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/02_square_twice.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-03-triangle-json"></a>
### `examples-blocks/02_flight/03_triangle.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/03_triangle.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-04-rectangle-json"></a>
### `examples-blocks/02_flight/04_rectangle.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/04_rectangle.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-05-diamond-json"></a>
### `examples-blocks/02_flight/05_diamond.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/05_diamond.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-06-cross-json"></a>
### `examples-blocks/02_flight/06_cross.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/06_cross.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-07-staircase-json"></a>
### `examples-blocks/02_flight/07_staircase.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/07_staircase.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-08-zigzag-json"></a>
### `examples-blocks/02_flight/08_zigzag.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/08_zigzag.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-09-points-list-json"></a>
### `examples-blocks/02_flight/09_points_list.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/09_points_list.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-10-circle-json"></a>
### `examples-blocks/02_flight/10_circle.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/10_circle.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-11-spiral-up-json"></a>
### `examples-blocks/02_flight/11_spiral_up.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/11_spiral_up.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-12-turn-while-flying-json"></a>
### `examples-blocks/02_flight/12_turn_while_flying.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/12_turn_while_flying.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-02-flight-13-grid-scan-json"></a>
### `examples-blocks/02_flight/13_grid_scan.json`

- Исходник: [открыть файл](../../examples-blocks/02_flight/13_grid_scan.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-01-colour-presets-json"></a>
### `examples-blocks/03_leds/01_colour_presets.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/01_colour_presets.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-02-rgb-mix-json"></a>
### `examples-blocks/03_leds/02_rgb_mix.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/02_rgb_mix.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-03-traffic-light-json"></a>
### `examples-blocks/03_leds/03_traffic_light.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/03_traffic_light.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-04-blink-json"></a>
### `examples-blocks/03_leds/04_blink.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/04_blink.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-05-running-light-json"></a>
### `examples-blocks/03_leds/05_running_light.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/05_running_light.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-06-rainbow-json"></a>
### `examples-blocks/03_leds/06_rainbow.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/06_rainbow.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-07-police-json"></a>
### `examples-blocks/03_leds/07_police.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/07_police.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-03-leds-08-flight-colours-json"></a>
### `examples-blocks/03_leds/08_flight_colours.json`

- Исходник: [открыть файл](../../examples-blocks/03_leds/08_flight_colours.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-01-variable-height-json"></a>
### `examples-blocks/04_logic/01_variable_height.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/01_variable_height.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-02-side-length-json"></a>
### `examples-blocks/04_logic/02_side_length.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/02_side_length.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-03-if-else-json"></a>
### `examples-blocks/04_logic/03_if_else.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/03_if_else.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-04-alternate-colours-json"></a>
### `examples-blocks/04_logic/04_alternate_colours.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/04_alternate_colours.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-05-while-loop-json"></a>
### `examples-blocks/04_logic/05_while_loop.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/05_while_loop.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-06-signal-function-json"></a>
### `examples-blocks/04_logic/06_signal_function.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/06_signal_function.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-07-random-colour-json"></a>
### `examples-blocks/04_logic/07_random_colour.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/07_random_colour.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-08-wait-until-json"></a>
### `examples-blocks/04_logic/08_wait_until.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/08_wait_until.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-04-logic-09-tower-json"></a>
### `examples-blocks/04_logic/09_tower.json`

- Исходник: [открыть файл](../../examples-blocks/04_logic/09_tower.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-05-sensors-01-print-position-json"></a>
### `examples-blocks/05_sensors/01_print_position.json`

- Исходник: [открыть файл](../../examples-blocks/05_sensors/01_print_position.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-05-sensors-02-flight-timer-json"></a>
### `examples-blocks/05_sensors/02_flight_timer.json`

- Исходник: [открыть файл](../../examples-blocks/05_sensors/02_flight_timer.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-05-sensors-03-battery-check-json"></a>
### `examples-blocks/05_sensors/03_battery_check.json`

- Исходник: [открыть файл](../../examples-blocks/05_sensors/03_battery_check.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-05-sensors-04-height-light-json"></a>
### `examples-blocks/05_sensors/04_height_light.json`

- Исходник: [открыть файл](../../examples-blocks/05_sensors/04_height_light.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-05-sensors-05-countdown-json"></a>
### `examples-blocks/05_sensors/05_countdown.json`

- Исходник: [открыть файл](../../examples-blocks/05_sensors/05_countdown.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-06-events-01-blink-timer-json"></a>
### `examples-blocks/06_events/01_blink_timer.json`

- Исходник: [открыть файл](../../examples-blocks/06_events/01_blink_timer.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-06-events-02-after-once-json"></a>
### `examples-blocks/06_events/02_after_once.json`

- Исходник: [открыть файл](../../examples-blocks/06_events/02_after_once.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-06-events-03-two-timers-json"></a>
### `examples-blocks/06_events/03_two_timers.json`

- Исходник: [открыть файл](../../examples-blocks/06_events/03_two_timers.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-06-events-04-lua-landing-event-json"></a>
### `examples-blocks/06_events/04_lua_landing_event.json`

- Исходник: [открыть файл](../../examples-blocks/06_events/04_lua_landing_event.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-07-projects-01-cargo-delivery-json"></a>
### `examples-blocks/07_projects/01_cargo_delivery.json`

- Исходник: [открыть файл](../../examples-blocks/07_projects/01_cargo_delivery.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-07-projects-02-patrol-json"></a>
### `examples-blocks/07_projects/02_patrol.json`

- Исходник: [открыть файл](../../examples-blocks/07_projects/02_patrol.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-07-projects-03-light-show-json"></a>
### `examples-blocks/07_projects/03_light_show.json`

- Исходник: [открыть файл](../../examples-blocks/07_projects/03_light_show.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-07-projects-04-photo-points-json"></a>
### `examples-blocks/07_projects/04_photo_points.json`

- Исходник: [открыть файл](../../examples-blocks/07_projects/04_photo_points.json)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="examples-blocks-07-projects-05-two-cargo-runs-json"></a>
### `examples-blocks/07_projects/05_two_cargo_runs.json`

- Исходник: [открыть файл](../../examples-blocks/07_projects/05_two_cargo_runs.json)
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

<a id="premium-audit-json"></a>
### `premium-audit.json`

- Исходник: [открыть файл](../../premium-audit.json)
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

<a id="public-assets-models-pioneer-pioneer-mini2-json"></a>
### `public/assets/models/pioneer/pioneer-mini2.json`

- Исходник: [открыть файл](../../public/assets/models/pioneer/pioneer-mini2.json)
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

<a id="public-design-proposals-laboratory-html"></a>
### `public/design-proposals/laboratory.html`

- Исходник: [открыть файл](../../public/design-proposals/laboratory.html)
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

<a id="public-fragments-panels-account-html"></a>
### `public/fragments/panels/account.html`

- Исходник: [открыть файл](../../public/fragments/panels/account.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-docs-html"></a>
### `public/fragments/panels/docs.html`

- Исходник: [открыть файл](../../public/fragments/panels/docs.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-drone-link-html"></a>
### `public/fragments/panels/drone-link.html`

- Исходник: [открыть файл](../../public/fragments/panels/drone-link.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-drones-html"></a>
### `public/fragments/panels/drones.html`

- Исходник: [открыть файл](../../public/fragments/panels/drones.html)
- Кратко: Клиентский файл приложения.
- Обнаружено функций/методов: 0

<a id="public-fragments-panels-editor-terminal-html"></a>
### `public/fragments/panels/editor-terminal.html`

- Исходник: [открыть файл](../../public/fragments/panels/editor-terminal.html)
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
- Обнаружено функций/методов: 5
- Ключевые символы: `applyScriptLanguage`, `enforceDroneScriptLanguage`, `getSavedScriptLanguage`, `initScriptLanguageSelector`, `syncLanguageOptionsForDrone`

<a id="public-modules-app-scene-session-data-ts"></a>
### `public/modules/app/scene-session-data.ts`

- Исходник: [открыть файл](../../public/modules/app/scene-session-data.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `dronePoseForRestore`, `isPose`, `parseSceneSession`

<a id="public-modules-app-scene-session-ts"></a>
### `public/modules/app/scene-session.ts`

- Исходник: [открыть файл](../../public/modules/app/scene-session.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `buildSceneSession`, `readDronePoses`, `restoreSceneSession`, `saveSceneSessionNow`, `soon`, `startSceneSessionAutosave`, `writeSession`

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
- Обнаружено функций/методов: 14
- Ключевые символы: `callback`, `collectScenarioValidationResult`, `hasLuaEarlyRouteIssue`, `hasLuaMissingCallbackIssue`, `isSimultaneousCommandsFailureNotice`, `showEarlyRouteNotice`, `showMissingCallbackMissionNotice`, `showMissionGamepadOverrideNotice`, `showScenarioValidationNotice`, `showScriptFailureNotice`, `showSimultaneousCommandsNotice`, `stripInlineCode`, `validateScenarioBeforeLaunch`, `wireMissionNotices`

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
- Ключевые символы: `humanizeLuaRuntimeMessage`, `humanizeLuaSyntaxMessage`, `toHumanized`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `configureSimulationControls`, `restartAndRunSimulation`

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

<a id="public-modules-core-drone-models-ts"></a>
### `public/modules/core/drone-models.ts`

- Исходник: [открыть файл](../../public/modules/core/drone-models.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `blocksExamplesSetFor`, `droneModelProfile`, `examplesSetFor`, `isDroneModelId`, `supportsLanguage`

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

<a id="public-modules-docs-bricks-blocks-docs-ts"></a>
### `public/modules/docs/bricks-blocks-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/bricks-blocks-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `entry`, `paramsOf`, `partText`, `titleOf`

<a id="public-modules-docs-lua-api-docs-events-ts"></a>
### `public/modules/docs/lua-api-docs-events.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-api-docs-events.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `callback`

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

<a id="public-modules-docs-lua-stdlib-docs-ts"></a>
### `public/modules/docs/lua-stdlib-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/lua-stdlib-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-python-api-docs-ts"></a>
### `public/modules/docs/python-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-docs-python-rknn-api-docs-ts"></a>
### `public/modules/docs/python-rknn-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-rknn-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `method`

<a id="public-modules-docs-python-sdk2-api-docs-ts"></a>
### `public/modules/docs/python-sdk2-api-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-sdk2-api-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `method`

<a id="public-modules-docs-python-stdlib-docs-ts"></a>
### `public/modules/docs/python-stdlib-docs.ts`

- Исходник: [открыть файл](../../public/modules/docs/python-stdlib-docs.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-hardware-drone-link-ts"></a>
### `public/modules/hardware/drone-link.ts`

- Исходник: [открыть файл](../../public/modules/hardware/drone-link.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `delay`, `DroneLink.for`, `DroneLink.if`, `DroneLink.while`

<a id="public-modules-hardware-lua-bytecode-ts"></a>
### `public/modules/hardware/lua-bytecode.ts`

- Исходник: [открыть файл](../../public/modules/hardware/lua-bytecode.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `compileLuaForDrone`, `i32`, `normalizeForDrone`, `skipString`, `stringLength`, `u8`, `walk`, `writer`

<a id="public-modules-hardware-plazlink-client-ts"></a>
### `public/modules/hardware/plazlink/client.ts`

- Исходник: [открыть файл](../../public/modules/hardware/plazlink/client.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `crc32`, `PlazlinkClient.for`, `readPascal`, `readUint32`, `send`

<a id="public-modules-hardware-plazlink-frame-ts"></a>
### `public/modules/hardware/plazlink/frame.ts`

- Исходник: [открыть файл](../../public/modules/hardware/plazlink/frame.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `encodeFrame`, `fletcher`, `FrameParser.if`

<a id="public-modules-hardware-telemetry-ts"></a>
### `public/modules/hardware/telemetry.ts`

- Исходник: [открыть файл](../../public/modules/hardware/telemetry.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `decodeFieldValue`

<a id="public-modules-hardware-web-serial-transport-ts"></a>
### `public/modules/hardware/web-serial-transport.ts`

- Исходник: [открыть файл](../../public/modules/hardware/web-serial-transport.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `baudCandidates`, `createTransport`, `getSerial`, `isWebSerialSupported`, `openAndProbe`, `openPioneerPort`, `openPort`

<a id="public-modules-learning-account-ui-ts"></a>
### `public/modules/learning/account-ui.ts`

- Исходник: [открыть файл](../../public/modules/learning/account-ui.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 8
- Ключевые символы: `esc`, `field`, `initAccountUi`, `initials`, `render`, `renderForm`, `showPanel`, `wire`

<a id="public-modules-learning-account-ts"></a>
### `public/modules/learning/account.ts`

- Исходник: [открыть файл](../../public/modules/learning/account.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 22
- Ключевые символы: `changePassword`, `checkSession`, `flushMetrics`, `getLastAuthKind`, `getUser`, `isSessionExpired`, `login`, `logout`, `markExpired`, `onProfileChange`, `onSessionExpired`, `onUserChange`, `recheck`, `register`, `replaceUser`, `restoreSession`, `sessionTabId`, `setUser`, `startKeepAlive`, `touch`, `trackEvent`, `tzOffset`

<a id="public-modules-learning-achievement-art-ts"></a>
### `public/modules/learning/achievement-art.ts`

- Исходник: [открыть файл](../../public/modules/learning/achievement-art.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `glyphMarkup`, `numeral`, `rankFor`, `renderMedal`, `renderRankBadge`, `shapePath`

<a id="public-modules-learning-bricks-quests-ts"></a>
### `public/modules/learning/bricks-quests.ts`

- Исходник: [открыть файл](../../public/modules/learning/bricks-quests.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildBricksQuests`

<a id="public-modules-learning-cabinet-kit-ts"></a>
### `public/modules/learning/cabinet-kit.ts`

- Исходник: [открыть файл](../../public/modules/learning/cabinet-kit.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 15
- Ключевые символы: `ago`, `completedChapters`, `computeAchievements`, `downloadText`, `fmtDate`, `fmtDateTime`, `fmtDuration`, `groupTheme`, `handler`, `initials`, `plural`, `renderCalendar`, `shiftDay`, `svg`, `trapFocus`

<a id="public-modules-learning-controller-ts"></a>
### `public/modules/learning/controller.ts`

- Исходник: [открыть файл](../../public/modules/learning/controller.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 62
- Ключевые символы: `academyQuestions`, `adoptGuestProgress`, `apply`, `applyMode`, `buildDom`, `changeTrack`, `checkQuest`, `draftKey`, `enableHudDrag`, `ensureLanguage`, `enterBricksEditor`, `enterTextEditor`, `esc`, `flushPending`, `goToStep`, `group`, `handleUserChange`, `hideMap`, `hideSpot`, `hideSuccess`, `initLearningMode`, `isEditorVisible`, `loadPending`, `loadQuestWorkspace`, `loadTrack`, `make`, `move`, `noteQuestLeft`, `on`, `openLearningMission`, `openQuest`, `openQuestById`, `persist`, `place`, `prepareQuestScene`, `progressKey`, `questsFor`, `readDraft`, `refreshChecklist`, `renderCard`, `renderHud`, `reportCompletion`, `rich`, `runFlightCheck`, `saveDraft`, `savePending`, `scope`, `showEditorPanel`, `showMap`, `showScene`, `showSolution`, `showSuccess`, `startChecklistTimer`, `stepDots`, `stepsWord`, `stopChecklistTimer`, `storage`, `syncFromServer`, `syncGuide`, `up`, `usedBlockTypes`, `useTrack`

<a id="public-modules-learning-guides-ts"></a>
### `public/modules/learning/guides.ts`

- Исходник: [открыть файл](../../public/modules/learning/guides.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `whatIsApi`

<a id="public-modules-learning-mini2-drone-ts"></a>
### `public/modules/learning/mini2-drone.ts`

- Исходник: [открыть файл](../../public/modules/learning/mini2-drone.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `ensureDroneModel`, `selectDrone`

<a id="public-modules-learning-mode-ts"></a>
### `public/modules/learning/mode.ts`

- Исходник: [открыть файл](../../public/modules/learning/mode.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `getAppMode`, `onAppModeChange`, `setAppMode`

<a id="public-modules-learning-quests-ts"></a>
### `public/modules/learning/quests.ts`

- Исходник: [открыть файл](../../public/modules/learning/quests.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 18
- Ключевые символы: `buildAcademyQuests`, `buildQuests`, `clampStep`, `completeQuest`, `countDone`, `currentQuest`, `emptyProgress`, `findCheckSteps`, `firstOpenQuest`, `lastStepIndex`, `loadProgress`, `nextQuest`, `questGroups`, `questStatus`, `requiredBlockChecklist`, `saveProgress`, `selectQuest`, `splitIntoSteps`

<a id="public-modules-learning-sdk2-quests-ts"></a>
### `public/modules/learning/sdk2-quests.ts`

- Исходник: [открыть файл](../../public/modules/learning/sdk2-quests.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `buildSdk2Quests`

<a id="public-modules-learning-student-cabinet-ts"></a>
### `public/modules/learning/student-cabinet.ts`

- Исходник: [открыть файл](../../public/modules/learning/student-cabinet.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `artOf`, `closeStudentCabinet`, `continueTrack`, `load`, `medalList`, `on`, `openStudentCabinet`, `rememberAwards`, `render`, `renderAttempts`, `renderAwards`, `renderMissions`, `renderNotice`, `renderOverview`, `renderProfile`, `savedTrack`, `seenAwards`, `shortGoal`, `titleOf`, `wire`

<a id="public-modules-learning-teacher-panel-ts"></a>
### `public/modules/learning/teacher-panel.ts`

- Исходник: [открыть файл](../../public/modules/learning/teacher-panel.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 33
- Ключевые символы: `activityBars`, `bar`, `className`, `closeTeacherPanel`, `download`, `formValues`, `frame`, `guard`, `handleAction`, `handleSubmit`, `lastSeen`, `loadMetrics`, `loadStuck`, `onChange`, `onClick`, `onInput`, `onSubmit`, `openMission`, `openStudent`, `openTeacherPanel`, `printCredentials`, `refresh`, `render`, `renderClass`, `renderImprove`, `renderMatrix`, `renderModal`, `renderStuck`, `renderStudent`, `say`, `statusCell`, `th`, `titleOf`

<a id="public-modules-learning-teacher-report-ts"></a>
### `public/modules/learning/teacher-report.ts`

- Исходник: [открыть файл](../../public/modules/learning/teacher-report.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `className`, `countByStatus`, `credentialsReport`, `csvCell`, `dateText`, `filterStudents`, `matrixReport`, `sortStudents`, `startOfToday`, `studentStatus`, `summaryReport`, `troubleScore`

<a id="public-modules-learning-tracks-ts"></a>
### `public/modules/learning/tracks.ts`

- Исходник: [открыть файл](../../public/modules/learning/tracks.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `buildTrackQuests`, `createQuestCache`, `trackTotals`

<a id="public-modules-sensors-downward-ts"></a>
### `public/modules/sensors/downward.ts`

- Исходник: [открыть файл](../../public/modules/sensors/downward.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `gaussian`, `measureSurfaceBelow`, `readOpticalFlow`, `vehicleUnitOf`

<a id="public-modules-sensors-ranger-ts"></a>
### `public/modules/sensors/ranger.ts`

- Исходник: [открыть файл](../../public/modules/sensors/ranger.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `along`, `castRange`, `readRanger`

<a id="public-modules-shared-background-ticker-ts"></a>
### `public/modules/shared/background-ticker.ts`

- Исходник: [открыть файл](../../public/modules/shared/background-ticker.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `backgroundTimeout`, `clearBackgroundTimeout`, `getTimeoutWorker`, `startBackgroundTicker`

<a id="public-modules-shared-drone-scale-ts"></a>
### `public/modules/shared/drone-scale.ts`

- Исходник: [открыть файл](../../public/modules/shared/drone-scale.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-shared-fpv-cube-geometry-ts"></a>
### `public/modules/shared/fpv-cube-geometry.ts`

- Исходник: [открыть файл](../../public/modules/shared/fpv-cube-geometry.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `clampFpvCubeHeight`, `fpvCubeFrameCentre`, `scaled`

<a id="public-modules-shared-funny-names-ts"></a>
### `public/modules/shared/funny-names.ts`

- Исходник: [открыть файл](../../public/modules/shared/funny-names.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `randomFunnyName`, `resetFunnyNames`, `sceneFileName`, `scriptFileName`

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
- Обнаружено функций/методов: 13
- Ключевые символы: `classifyLogTone`, `countEntriesByCategory`, `createTabButton`, `extractTagAndMessage`, `getLogEntries`, `log`, `onLogsChanged`, `readLogClock`, `renderLogsUI`, `renderTabs`, `resolveLogCategory`, `scheduleLogsRender`, `setLogClock`

<a id="public-modules-shared-math-ts"></a>
### `public/modules/shared/math.ts`

- Исходник: [открыть файл](../../public/modules/shared/math.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `clamp`

<a id="public-modules-shared-notice-messages-catalog-ts"></a>
### `public/modules/shared/notice-messages/catalog.ts`

- Исходник: [открыть файл](../../public/modules/shared/notice-messages/catalog.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 23
- Ключевые символы: `batteryCriticalNotice`, `batteryDepletedNotice`, `batteryLowNotice`, `bridgeCommandRejectedNotice`, `callback`, `droneScriptStartedNotice`, `droneScriptStoppedNotice`, `droneUploadedNotice`, `earlyRouteNotice`, `explainDroneError`, `gamepadOverrideNotice`, `genericFailureMessage`, `genericFailureTitle`, `guideActionsForIssue`, `missingCallbackNotice`, `openLessonAction`, `scenarioBlockedNotice`, `scenarioWarningNotice`, `sceneEmptyNotice`, `sceneLoadedNotice`, `sceneLoadFailedNotice`, `sceneSavedNotice`, `simultaneousCommandsNotice`

<a id="public-modules-shared-notice-messages-lua-errors-ts"></a>
### `public/modules/shared/notice-messages/lua-errors.ts`

- Исходник: [открыть файл](../../public/modules/shared/notice-messages/lua-errors.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 10
- Ключевые символы: `callback`, `explainFsm`, `explainLuaError`, `explainLuaRuntimeError`, `explainLuaSyntaxError`, `explainSimultaneous`, `lookup`, `parseLuaMessage`, `parseVariableHint`, `typeName`

<a id="public-modules-shared-notice-messages-python-errors-ts"></a>
### `public/modules/shared/notice-messages/python-errors.ts`

- Исходник: [открыть файл](../../public/modules/shared/notice-messages/python-errors.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `explainPythonError`, `explainPythonRuntimeError`, `explainPythonSyntaxError`, `lastLine`, `lookup`, `parsePythonTracebackLine`

<a id="public-modules-shared-notice-messages-types-ts"></a>
### `public/modules/shared/notice-messages/types.ts`

- Исходник: [открыть файл](../../public/modules/shared/notice-messages/types.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 2
- Ключевые символы: `atLine`, `code`

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
- Обнаружено функций/методов: 22
- Ключевые символы: `clamp`, `createPerson`, `fill`, `footLow`, `gaitLegs`, `giveCuffs`, `giveSack`, `group`, `idleBase`, `lerp`, `mesh`, `placePerson`, `poseNow`, `removeCuffs`, `rx`, `rz`, `smooth`, `stanceK`, `stanceTravel`, `swingK`, `toePitch`, `tri`

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

<a id="public-modules-world-car-fleet-ts"></a>
### `public/modules/world/car-fleet.ts`

- Исходник: [открыть файл](../../public/modules/world/car-fleet.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `createFleet`, `update`, `white`

<a id="public-modules-world-car-model-ts"></a>
### `public/modules/world/car-model.ts`

- Исходник: [открыть файл](../../public/modules/world/car-model.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 14
- Ключевые символы: `add`, `box`, `busParts`, `carParts`, `createCar`, `createPoliceCar`, `lorryParts`, `merge`, `paint`, `paintVertices`, `profile`, `slab`, `vehicleParts`, `wheelGeometry`

<a id="public-modules-world-crews-ts"></a>
### `public/modules/world/crews.ts`

- Исходник: [открыть файл](../../public/modules/world/crews.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `Actor.scripted`, `Actor.show`, `Actor.x`, `Actor.y`, `behind`, `between`, `burglary`, `clamp01`, `createFireCrew`, `createPoliceCrew`, `createRepairCrew`, `door`, `fight`, `headingTo`, `lerp`, `mk`, `outsideSolids`, `progress`, `smooth`, `solidsOf`

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

<a id="public-modules-world-pedestrians-ts"></a>
### `public/modules/world/pedestrians.ts`

- Исходник: [открыть файл](../../public/modules/world/pedestrians.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 20
- Ключевые символы: `angleDiff`, `arrive`, `createCrowd`, `createCrowdView`, `crossingThreatened`, `dist`, `distanceToSegment`, `edgeOf`, `free`, `Heap.if`, `Heap.push`, `Heap.size`, `key`, `lightRed`, `place`, `plan`, `reindex`, `route`, `setPath`, `step`

<a id="public-modules-world-people-preview-html"></a>
### `public/modules/world/people-preview.html`

- Исходник: [открыть файл](../../public/modules/world/people-preview.html)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 0

<a id="public-modules-world-person-model-ts"></a>
### `public/modules/world/person-model.ts`

- Исходник: [открыть файл](../../public/modules/world/person-model.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 12
- Ключевые символы: `box`, `buildParts`, `cap`, `civilians`, `cyl`, `dome`, `ell`, `hashSeed`, `keyOf`, `merged`, `rng`, `tint`

<a id="public-modules-world-props-ts"></a>
### `public/modules/world/props.ts`

- Исходник: [открыть файл](../../public/modules/world/props.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 4
- Ключевые символы: `createHose`, `createLadder`, `setLadder`, `updateHose`

<a id="public-modules-world-road-marks-ts"></a>
### `public/modules/world/road-marks.ts`

- Исходник: [открыть файл](../../public/modules/world/road-marks.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 3
- Ключевые символы: `createRoadMarks`, `flat`, `instanced`

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
- Обнаружено функций/методов: 22
- Ключевые символы: `animate`, `build`, `buildFlames`, `driveTraffic`, `ensureWorld`, `groundAt`, `near`, `onServiceEvent`, `parkAt`, `place`, `polylineLengths`, `propAt`, `resetWorld`, `route`, `sampleAt`, `startWorldSession`, `stopWorldSession`, `teardown`, `terrainGroup`, `updateWorld`, `worldSolidsNear`, `worldTrafficCars`

<a id="public-modules-world-services-ts"></a>
### `public/modules/world/services.ts`

- Исходник: [открыть файл](../../public/modules/world/services.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `createWorldServices`, `drive`, `emit`, `findIncident`, `handle`, `say`, `step`

<a id="public-modules-world-signal-lights-ts"></a>
### `public/modules/world/signal-lights.ts`

- Исходник: [открыть файл](../../public/modules/world/signal-lights.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 6
- Ключевые символы: `bodyGeometry`, `createSignalLights`, `dimColor`, `lampGeometry`, `litColor`, `update`

<a id="public-modules-world-signals-ts"></a>
### `public/modules/world/signals.ts`

- Исходник: [открыть файл](../../public/modules/world/signals.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 5
- Ключевые символы: `createSignals`, `groupOf`, `pointAlong`, `refresh`, `stateAt`

<a id="public-modules-world-traffic-ts"></a>
### `public/modules/world/traffic.ts`

- Исходник: [открыть файл](../../public/modules/world/traffic.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 25
- Ключевые символы: `addNode`, `angleDiff`, `at`, `bezier`, `box`, `buildTrafficNetwork`, `carScaleFor`, `clear`, `conflicts`, `createTraffic`, `dedupe`, `dist`, `enter`, `keepOnRoad`, `makeSeg`, `normal`, `offsetPolyline`, `onRoad`, `place`, `planRoute`, `removeFrom`, `sample`, `speedLimitFor`, `step`, `trimPolyline`

<a id="public-modules-world-vehicle-kinds-ts"></a>
### `public/modules/world/vehicle-kinds.ts`

- Исходник: [открыть файл](../../public/modules/world/vehicle-kinds.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `vehicleKindFor`

<a id="public-modules-world-walkers-ts"></a>
### `public/modules/world/walkers.ts`

- Исходник: [открыть файл](../../public/modules/world/walkers.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 9
- Ключевые символы: `angleDiff`, `Gait.if`, `Gait.update`, `Mover.apply`, `Mover.for`, `Mover.if`, `Mover.pushOut`, `Mover.reset`, `turnToward`

<a id="public-modules-world-walknet-ts"></a>
### `public/modules/world/walknet.ts`

- Исходник: [открыть файл](../../public/modules/world/walknet.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 7
- Ключевые символы: `addNode`, `buildWalkNet`, `clearOfJunction`, `dist`, `flag`, `link`, `reindex`

<a id="server-dev-ts"></a>
### `server-dev.ts`

- Исходник: [открыть файл](../../server-dev.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 0

<a id="server-accounts-ts"></a>
### `server/accounts.ts`

- Исходник: [открыть файл](../../server/accounts.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 30
- Ключевые символы: `AccountStore.if`, `attemptsForUser`, `buildCabinet`, `buildOverview`, `checkPassword`, `classFromParams`, `completionTimes`, `currentUser`, `emptyProgress`, `ensureTeacher`, `findStuck`, `hashPassword`, `mark`, `migrateData`, `parseQuestId`, `parseTrack`, `progressIds`, `publicUser`, `readCookie`, `registerAccountRoutes`, `resolveAccountsFile`, `setSessionCookie`, `sha256`, `studentDetail`, `studentSummary`, `validateClassName`, `validateFullName`, `validateLogin`, `validateNote`, `validatePassword`

<a id="server-attempts-ts"></a>
### `server/attempts.ts`

- Исходник: [открыть файл](../../server/attempts.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 3
- Ключевые символы: `AttemptLog.for`, `clip`, `resolveAttemptsFile`

<a id="server-cabinet-ts"></a>
### `server/cabinet.ts`

- Исходник: [открыть файл](../../server/cabinet.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 7
- Ключевые символы: `activityByDay`, `dayKey`, `generatePassword`, `keyToDay`, `parseTz`, `streaks`, `suggestLogin`

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
- Обнаружено функций/методов: 29
- Ключевые символы: `buildCameraRegistrationKey`, `buildCameraSessionId`, `buildMavlinkRegistrationKey`, `buildMavlinkSessionId`, `CameraTcpBridge.for`, `CameraTcpBridge.if`, `closeStaleCameraBridge`, `closeStaleMavlinkBridge`, `computeX25Crc`, `drop`, `emitBridgeEvent`, `emitCameraBridgeEvent`, `encodeMavlinkV2Message`, `ensureBridgeConnections`, `isArmedAutopilotState`, `mapAutopilotStateToCustomMode`, `mapAutopilotStateToSystemStatus`, `MavlinkUdpBridge.if`, `MavlinkUdpBridge.switch`, `normalizeConnectionMethod`, `normalizeIpv4`, `parseCommandLong`, `parseRcChannelsOverride`, `parseSetPositionTargetLocalNed`, `parseSingleMavlinkFrame`, `registerMavlinkBridgeRoutes`, `sameHost`, `sanitizeRegistration`, `stopAllMavlinkBridges`

<a id="server-metrics-ts"></a>
### `server/metrics.ts`

- Исходник: [открыть файл](../../server/metrics.ts)
- Кратко: Файл проекта.
- Обнаружено функций/методов: 6
- Ключевые символы: `entry`, `MetricsLog.for`, `MetricsLog.if`, `MetricsLog.summary`, `resolveMetricsFile`, `sanitizeEvent`

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

<a id="tests-academy-explainers-test-ts"></a>
### `tests/academy-explainers.test.ts`

- Исходник: [открыть файл](../../tests/academy-explainers.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `forLanguage`

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
- Обнаружено функций/методов: 11
- Ключевые символы: `deltaTime`, `executeAcademyLua`, `executeAcademyPython`, `fromHSV`, `launchTime`, `move`, `print`, `set_phase`, `tick`, `time`, `update_clock`

<a id="tests-academy-scene-vision-test-ts"></a>
### `tests/academy-scene-vision.test.ts`

- Исходник: [открыть файл](../../tests/academy-scene-vision.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `observe`

<a id="tests-academy-sdk-extras-test-ts"></a>
### `tests/academy-sdk-extras.test.ts`

- Исходник: [открыть файл](../../tests/academy-sdk-extras.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `grade`

<a id="tests-academy-sdk-lua-more-test-ts"></a>
### `tests/academy-sdk-lua-more.test.ts`

- Исходник: [открыть файл](../../tests/academy-sdk-lua-more.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `errors`, `load`, `range`, `runLua`, `runPython`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `check`, `texts`

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
- Обнаружено функций/методов: 3
- Ключевые символы: `grade`, `run`, `scene`

<a id="tests-accounts-test-ts"></a>
### `tests/accounts.test.ts`

- Исходник: [открыть файл](../../tests/accounts.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `login`, `makeApp`

<a id="tests-achievements-test-ts"></a>
### `tests/achievements.test.ts`

- Исходник: [открыть файл](../../tests/achievements.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `earnedIds`

<a id="tests-api-doc-examples-test-ts"></a>
### `tests/api-doc-examples.test.ts`

- Исходник: [открыть файл](../../tests/api-doc-examples.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `callback`, `luaSyntaxError`

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

<a id="tests-attempts-test-ts"></a>
### `tests/attempts.test.ts`

- Исходник: [открыть файл](../../tests/attempts.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeApp`

<a id="tests-block-examples-test-ts"></a>
### `tests/block-examples.test.ts`

- Исходник: [открыть файл](../../tests/block-examples.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `load`

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

<a id="tests-book-localize-test-ts"></a>
### `tests/book-localize.test.ts`

- Исходник: [открыть файл](../../tests/book-localize.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-bricks-blocks-test-ts"></a>
### `tests/bricks-blocks.test.ts`

- Исходник: [открыть файл](../../tests/bricks-blocks.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-bricks-docs-test-ts"></a>
### `tests/bricks-docs.test.ts`

- Исходник: [открыть файл](../../tests/bricks-docs.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-bricks-editor-test-ts"></a>
### `tests/bricks-editor.test.ts`

- Исходник: [открыть файл](../../tests/bricks-editor.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `basicStarter`, `inputs`, `makeController`, `toolboxTypes`, `types`

<a id="tests-bricks-example-set-test-ts"></a>
### `tests/bricks-example-set.test.ts`

- Исходник: [открыть файл](../../tests/bricks-example-set.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-bricks-examples-test-ts"></a>
### `tests/bricks-examples.test.ts`

- Исходник: [открыть файл](../../tests/bricks-examples.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-bricks-missions-test-ts"></a>
### `tests/bricks-missions.test.ts`

- Исходник: [открыть файл](../../tests/bricks-missions.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `grade`, `mission`, `typesOf`

<a id="tests-bricks-runtime-test-ts"></a>
### `tests/bricks-runtime.test.ts`

- Исходник: [открыть файл](../../tests/bricks-runtime.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 7
- Ключевые символы: `callsOf`, `leds`, `num`, `poseRow`, `run`, `runProgram`, `transformerSource`

<a id="tests-cabinets-test-ts"></a>
### `tests/cabinets.test.ts`

- Исходник: [открыть файл](../../tests/cabinets.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 7
- Ключевые символы: `fail`, `legacy`, `makeApp`, `post`, `put`, `register`, `tmp`

<a id="tests-cargo-contact-test-ts"></a>
### `tests/cargo-contact.test.ts`

- Исходник: [открыть файл](../../tests/cargo-contact.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `runUntilGroundContact`

<a id="tests-city-buildings-test-ts"></a>
### `tests/city-buildings.test.ts`

- Исходник: [открыть файл](../../tests/city-buildings.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 13
- Ключевые символы: `build`, `distanceToPath`, `distanceToSegment`, `distToBoxes`, `footprint`, `hit`, `inside`, `make`, `meshes`, `o`, `range`, `segmentsCross`, `separated`

<a id="tests-city-plan-test-ts"></a>
### `tests/city-plan.test.ts`

- Исходник: [открыть файл](../../tests/city-plan.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-collision-audit-test-ts"></a>
### `tests/collision-audit.test.ts`

- Исходник: [открыть файл](../../tests/collision-audit.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 4
- Ключевые символы: `describe_`, `f`, `fmt`, `visit`

<a id="tests-collision-world-test-ts"></a>
### `tests/collision-world.test.ts`

- Исходник: [открыть файл](../../tests/collision-world.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `at`, `treeMap`

<a id="tests-drone-ground-support-test-ts"></a>
### `tests/drone-ground-support.test.ts`

- Исходник: [открыть файл](../../tests/drone-ground-support.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `callback`, `clearScene`, `run`

<a id="tests-drone-model-mini2-test-ts"></a>
### `tests/drone-model-mini2.test.ts`

- Исходник: [открыть файл](../../tests/drone-model-mini2.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `lookDirection`, `material`, `parse`, `shell`, `triangles`, `worldCenter`

<a id="tests-drone-telemetry-test-ts"></a>
### `tests/drone-telemetry.test.ts`

- Исходник: [открыть файл](../../tests/drone-telemetry.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `payload`

<a id="tests-editor-blockly-ui-test-ts"></a>
### `tests/editor-blockly-ui.test.ts`

- Исходник: [открыть файл](../../tests/editor-blockly-ui.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `createMockClassList`, `createMockElement`

<a id="tests-editor-docs-keyboard-test-ts"></a>
### `tests/editor-docs-keyboard.test.ts`

- Исходник: [открыть файл](../../tests/editor-docs-keyboard.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-editor-overlays-test-ts"></a>
### `tests/editor-overlays.test.ts`

- Исходник: [открыть файл](../../tests/editor-overlays.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `select`, `tintedBox`

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

<a id="tests-fast-raycast-test-ts"></a>
### `tests/fast-raycast.test.ts`

- Исходник: [открыть файл](../../tests/fast-raycast.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 7
- Ключевые символы: `boxes`, `castBoth`, `fire`, `run`, `sameHits`, `seeded`, `terrain`

<a id="tests-fixtures-block-examples-json"></a>
### `tests/fixtures/block-examples.json`

- Исходник: [открыть файл](../../tests/fixtures/block-examples.json)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-fixtures-lua-drone-bytecode-json"></a>
### `tests/fixtures/lua-drone-bytecode.json`

- Исходник: [открыть файл](../../tests/fixtures/lua-drone-bytecode.json)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-fixtures-pioneer-official-manifest-json"></a>
### `tests/fixtures/pioneer-official/manifest.json`

- Исходник: [открыть файл](../../tests/fixtures/pioneer-official/manifest.json)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-flight-journal-test-ts"></a>
### `tests/flight-journal.test.ts`

- Исходник: [открыть файл](../../tests/flight-journal.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `classify`

<a id="tests-fpv-cube-test-ts"></a>
### `tests/fpv-cube.test.ts`

- Исходник: [открыть файл](../../tests/fpv-cube.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `cube`, `hit`

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

<a id="tests-funny-names-and-session-test-ts"></a>
### `tests/funny-names-and-session.test.ts`

- Исходник: [открыть файл](../../tests/funny-names-and-session.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `session`

<a id="tests-gamepad-dialog-test-ts"></a>
### `tests/gamepad-dialog.test.ts`

- Исходник: [открыть файл](../../tests/gamepad-dialog.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

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

<a id="tests-helpers-block-flight-ts"></a>
### `tests/helpers/block-flight.ts`

- Исходник: [открыть файл](../../tests/helpers/block-flight.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `expectFlight`, `flightNames`, `goto`, `isSubsequence`, `ledColours`, `withStubs`

<a id="tests-helpers-blockly-json-ts"></a>
### `tests/helpers/blockly-json.ts`

- Исходник: [открыть файл](../../tests/helpers/blockly-json.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `block`, `chain`, `program`, `resetVariables`, `valueBlock`, `variableId`

<a id="tests-helpers-bricks-fixtures-ts"></a>
### `tests/helpers/bricks-fixtures.ts`

- Исходник: [открыть файл](../../tests/helpers/bricks-fixtures.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 4
- Ключевые символы: `compileBricksProject`, `compileBricksXml`, `normalizePython`, `readBricksFixture`

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

<a id="tests-helpers-map-audit-ts"></a>
### `tests/helpers/map-audit.ts`

- Исходник: [открыть файл](../../tests/helpers/map-audit.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 10
- Ключевые символы: `all`, `decalViolations`, `fingerprint`, `hasVertex`, `near`, `placementViolations`, `roadViolations`, `terrainViolations`, `turnAngle`, `z`

<a id="tests-helpers-mini2-runtime-ts"></a>
### `tests/helpers/mini2-runtime.ts`

- Исходник: [открыть файл](../../tests/helpers/mini2-runtime.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `runMini2Program`, `transformerSource`

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

<a id="tests-learning-quests-test-ts"></a>
### `tests/learning-quests.test.ts`

- Исходник: [открыть файл](../../tests/learning-quests.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `memoryStorage`

<a id="tests-lessons-book-examples-test-ts"></a>
### `tests/lessons-book-examples.test.ts`

- Исходник: [открыть файл](../../tests/lessons-book-examples.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 8
- Ключевые символы: `chapterFiles`, `collectCodeRefs`, `expectSubsequence`, `lines`, `matches`, `readPrints`, `unique`, `visit`

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

<a id="tests-lua-drone-bytecode-test-ts"></a>
### `tests/lua-drone-bytecode.test.ts`

- Исходник: [открыть файл](../../tests/lua-drone-bytecode.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `toHex`

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
- Обнаружено функций/методов: 5
- Ключевые символы: `__advance`, `arm`, `callback`, `point`, `takeoff`

<a id="tests-map-generation-audit-test-ts"></a>
### `tests/map-generation-audit.test.ts`

- Исходник: [открыть файл](../../tests/map-generation-audit.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `each`, `layoutOf`

<a id="tests-marker-scan-test-ts"></a>
### `tests/marker-scan.test.ts`

- Исходник: [открыть файл](../../tests/marker-scan.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `downCamera`, `place`

<a id="tests-mavlink-bridge-test-ts"></a>
### `tests/mavlink-bridge.test.ts`

- Исходник: [открыть файл](../../tests/mavlink-bridge.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `cameraConnects`, `canBindUdp`, `canListenTcp`, `delay`, `makeApp`

<a id="tests-mini2-tracks-test-ts"></a>
### `tests/mini2-tracks.test.ts`

- Исходник: [открыть файл](../../tests/mini2-tracks.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `run`

<a id="tests-mission-assets-test-ts"></a>
### `tests/mission-assets.test.ts`

- Исходник: [открыть файл](../../tests/mission-assets.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-monaco-completion-extras-test-ts"></a>
### `tests/monaco-completion-extras.test.ts`

- Исходник: [открыть файл](../../tests/monaco-completion-extras.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 6
- Ключевые символы: `callback`, `fly`, `go`, `labels`, `slices`, `sort`

<a id="tests-monaco-completion-test-ts"></a>
### `tests/monaco-completion.test.ts`

- Исходник: [открыть файл](../../tests/monaco-completion.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-notice-guide-lessons-test-ts"></a>
### `tests/notice-guide-lessons.test.ts`

- Исходник: [открыть файл](../../tests/notice-guide-lessons.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `lessonOf`, `titleOf`

<a id="tests-notice-messages-test-ts"></a>
### `tests/notice-messages.test.ts`

- Исходник: [открыть файл](../../tests/notice-messages.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `traceback`, `wordCount`

<a id="tests-notice-policy-test-ts"></a>
### `tests/notice-policy.test.ts`

- Исходник: [открыть файл](../../tests/notice-policy.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `entry`

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

<a id="tests-pioneer-block-lessons-test-ts"></a>
### `tests/pioneer-block-lessons.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-block-lessons.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `compiled`, `load`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `runStarter`, `starterCode`

<a id="tests-pioneer-rknn-module-test-ts"></a>
### `tests/pioneer-rknn-module.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-rknn-module.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `run`

<a id="tests-pioneer-rknn-scene-test-ts"></a>
### `tests/pioneer-rknn-scene.test.ts`

- Исходник: [открыть файл](../../tests/pioneer-rknn-scene.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 10
- Ключевые символы: `downCamera`, `frontCamera`, `handsUp`, `make`, `pad`, `personAt`, `sensor`, `still`, `width`, `y`

<a id="tests-plazlink-test-ts"></a>
### `tests/plazlink.test.ts`

- Исходник: [открыть файл](../../tests/plazlink.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 7
- Ключевые символы: `FakeDrone.close`, `FakeDrone.for`, `FakeDrone.if`, `FakeDrone.onData`, `FakeDrone.reply`, `FakeDrone.write`, `hex`

<a id="tests-python-camera-frames-test-ts"></a>
### `tests/python-camera-frames.test.ts`

- Исходник: [открыть файл](../../tests/python-camera-frames.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-python-cv2-emulation-test-ts"></a>
### `tests/python-cv2-emulation.test.ts`

- Исходник: [открыть файл](../../tests/python-cv2-emulation.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `run`

<a id="tests-python-runtime-concurrency-test-ts"></a>
### `tests/python-runtime-concurrency.test.ts`

- Исходник: [открыть файл](../../tests/python-runtime-concurrency.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `makeApp`

<a id="tests-python-runtime-globals-test-ts"></a>
### `tests/python-runtime-globals.test.ts`

- Исходник: [открыть файл](../../tests/python-runtime-globals.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `run`, `transformerSource`

<a id="tests-python-runtime-test-ts"></a>
### `tests/python-runtime.test.ts`

- Исходник: [открыть файл](../../tests/python-runtime.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `makeApp`, `uniqueDroneId`

<a id="tests-python-sdk-docs-coverage-test-ts"></a>
### `tests/python-sdk-docs-coverage.test.ts`

- Исходник: [открыть файл](../../tests/python-sdk-docs-coverage.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `classBody`, `publicMethods`

<a id="tests-python-sdk2-module-test-ts"></a>
### `tests/python-sdk2-module.test.ts`

- Исходник: [открыть файл](../../tests/python-sdk2-module.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `pioneerClassBody`, `publicMethods`, `run`

<a id="tests-quality-governor-test-ts"></a>
### `tests/quality-governor.test.ts`

- Исходник: [открыть файл](../../tests/quality-governor.test.ts)
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

<a id="tests-scene-placement-test-ts"></a>
### `tests/scene-placement.test.ts`

- Исходник: [открыть файл](../../tests/scene-placement.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `box`

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

<a id="tests-sdk2-missions-test-ts"></a>
### `tests/sdk2-missions.test.ts`

- Исходник: [открыть файл](../../tests/sdk2-missions.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `grade`, `mission`

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

<a id="tests-teacher-rename-test-ts"></a>
### `tests/teacher-rename.test.ts`

- Исходник: [открыть файл](../../tests/teacher-rename.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-teacher-report-test-ts"></a>
### `tests/teacher-report.test.ts`

- Исходник: [открыть файл](../../tests/teacher-report.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `row`, `student`

<a id="tests-terminal-session-test-ts"></a>
### `tests/terminal-session.test.ts`

- Исходник: [открыть файл](../../tests/terminal-session.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `actions`

<a id="tests-terminal-workbench-test-ts"></a>
### `tests/terminal-workbench.test.ts`

- Исходник: [открыть файл](../../tests/terminal-workbench.test.ts)
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
- Обнаружено функций/методов: 9
- Ключевые символы: `CanvasStub.hasPointerCapture`, `CanvasStub.releasePointerCapture`, `CanvasStub.setPointerCapture`, `drag`, `groundPointUnder`, `orbitAt`, `pointer`, `setup`, `wheel`

<a id="tests-web-serial-transport-test-ts"></a>
### `tests/web-serial-transport.test.ts`

- Исходник: [открыть файл](../../tests/web-serial-transport.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `fakePort`, `mockSerial`

<a id="tests-wizard-radio-model-test-ts"></a>
### `tests/wizard-radio-model.test.ts`

- Исходник: [открыть файл](../../tests/wizard-radio-model.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `slotOf`, `state`

<a id="tests-workspace-panels-test-ts"></a>
### `tests/workspace-panels.test.ts`

- Исходник: [открыть файл](../../tests/workspace-panels.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `ElementStub.setAttribute`

<a id="tests-workspace-reset-test-ts"></a>
### `tests/workspace-reset.test.ts`

- Исходник: [открыть файл](../../tests/workspace-reset.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `fakeStorage`

<a id="tests-world-fleet-test-ts"></a>
### `tests/world-fleet.test.ts`

- Исходник: [открыть файл](../../tests/world-fleet.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 3
- Ключевые символы: `angle`, `box`, `lit`

<a id="tests-world-incidents-test-ts"></a>
### `tests/world-incidents.test.ts`

- Исходник: [открыть файл](../../tests/world-incidents.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 0

<a id="tests-world-people-actors-test-ts"></a>
### `tests/world-people-actors.test.ts`

- Исходник: [открыть файл](../../tests/world-people-actors.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 8
- Ключевые символы: `drive`, `feet`, `minZ`, `points`, `sig`, `stanceSlip`, `state`, `width`

<a id="tests-world-people-harness-ts"></a>
### `tests/world-people-harness.ts`

- Исходник: [открыть файл](../../tests/world-people-harness.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 8
- Ключевые символы: `inWater`, `makeCrewWorld`, `park`, `record`, `recordCrew`, `solidAt`, `tick`, `trackMetrics`

<a id="tests-world-people-test-ts"></a>
### `tests/world-people.test.ts`

- Исходник: [открыть файл](../../tests/world-people.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 8
- Ключевые символы: `angleDiff`, `cpu`, `measure`, `median`, `onCarriageway`, `run`, `simulate`, `town`

<a id="tests-world-props-audit-test-ts"></a>
### `tests/world-props-audit.test.ts`

- Исходник: [открыть файл](../../tests/world-props-audit.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `distToSegment`, `roadDistance`

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

<a id="tests-world-signal-lights-test-ts"></a>
### `tests/world-signal-lights.test.ts`

- Исходник: [открыть файл](../../tests/world-signal-lights.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 2
- Ключевые символы: `crossing`, `litLamp`

<a id="tests-world-street-props-test-ts"></a>
### `tests/world-street-props.test.ts`

- Исходник: [открыть файл](../../tests/world-street-props.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 1
- Ключевые символы: `size`

<a id="tests-world-traffic-test-ts"></a>
### `tests/world-traffic.test.ts`

- Исходник: [открыть файл](../../tests/world-traffic.test.ts)
- Кратко: Автоматические тесты и тестовые помощники.
- Обнаружено функций/методов: 5
- Ключевые символы: `distanceToRoads`, `h`, `mean`, `run`, `simulate`

<a id="tools-block-examples-build-mjs"></a>
### `tools/block-examples/build.mjs`

- Исходник: [открыть файл](../../tools/block-examples/build.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 0

<a id="tools-block-examples-dsl-mjs"></a>
### `tools/block-examples/dsl.mjs`

- Исходник: [открыть файл](../../tools/block-examples/dsl.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 53
- Ключевые символы: `add`, `after`, `and`, `arith`, `battery`, `call`, `cargo`, `chain`, `change`, `compare`, `define`, `disarm`, `div`, `elapsed`, `every`, `everyStop`, `forEach`, `forRange`, `get`, `goTo`, `goToYaw`, `hsv`, `ifElse`, `item`, `join`, `land`, `ledAll`, `ledIndex`, `modulo`, `mul`, `onEvent`, `photo`, `position`, `preflight`, `preset`, `print`, `program`, `randomInt`, `repeat`, `resetVariables`, `rgb`, `set`, `setYaw`, `sub`, `takeoff`, `toJson`, `trig`, `valueBlock`, `variableId`, `wait`, `waitUntil`, `whileDo`, `yawNow`

<a id="tools-block-examples-examples-mjs"></a>
### `tools/block-examples/examples.mjs`

- Исходник: [открыть файл](../../tools/block-examples/examples.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 5
- Ключевые символы: `cycle`, `example`, `f`, `hsvColour`, `R`

<a id="tools-check-map-generation-mjs"></a>
### `tools/check-map-generation.mjs`

- Исходник: [открыть файл](../../tools/check-map-generation.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 1
- Ключевые символы: `arg`

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

<a id="tools-optimize-pioneer-glb-mjs"></a>
### `tools/optimize_pioneer_glb.mjs`

- Исходник: [открыть файл](../../tools/optimize_pioneer_glb.mjs)
- Кратко: Инженерный скрипт для генерации данных или обслуживания кода.
- Обнаружено функций/методов: 1
- Ключевые символы: `budget`

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

