# Сцена, окружение и 3D-объекты

Three.js-сцена, окружение, препятствия, модель дрона, визуальные эффекты, выбор и трансформация объектов.

## Состав группы

- [`public/modules/drone-model/blender-model.ts`](#public-modules-drone-model-blender-model-ts)
- [`public/modules/drone-model/camera-antenna.ts`](#public-modules-drone-model-camera-antenna-ts)
- [`public/modules/drone-model/esp32-module.ts`](#public-modules-drone-model-esp32-module-ts)
- [`public/modules/drone-model/frame-cad.ts`](#public-modules-drone-model-frame-cad-ts)
- [`public/modules/drone-model/frame-fallback.ts`](#public-modules-drone-model-frame-fallback-ts)
- [`public/modules/drone-model/frame.ts`](#public-modules-drone-model-frame-ts)
- [`public/modules/drone-model/index.ts`](#public-modules-drone-model-index-ts)
- [`public/modules/drone-model/layout.ts`](#public-modules-drone-model-layout-ts)
- [`public/modules/drone-model/led-glow.ts`](#public-modules-drone-model-led-glow-ts)
- [`public/modules/drone-model/leds.ts`](#public-modules-drone-model-leds-ts)
- [`public/modules/drone-model/motors.ts`](#public-modules-drone-model-motors-ts)
- [`public/modules/drone/camera-views.ts`](#public-modules-drone-camera-views-ts)
- [`public/modules/drone/crash-visuals.ts`](#public-modules-drone-crash-visuals-ts)
- [`public/modules/drone/index.ts`](#public-modules-drone-index-ts)
- [`public/modules/drone/scene-events.ts`](#public-modules-drone-scene-events-ts)
- [`public/modules/drone/trails.ts`](#public-modules-drone-trails-ts)
- [`public/modules/environment/ground.ts`](#public-modules-environment-ground-ts)
- [`public/modules/environment/ground/textures.ts`](#public-modules-environment-ground-textures-ts)
- [`public/modules/environment/ground/theme.ts`](#public-modules-environment-ground-theme-ts)
- [`public/modules/environment/index.ts`](#public-modules-environment-index-ts)
- [`public/modules/environment/lights.ts`](#public-modules-environment-lights-ts)
- [`public/modules/environment/obstacles.ts`](#public-modules-environment-obstacles-ts)
- [`public/modules/environment/obstacles/arena-infrastructure.ts`](#public-modules-environment-obstacles-arena-infrastructure-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/arena-control-station.ts`](#public-modules-environment-obstacles-arena-infrastructure-arena-control-station-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/arena-heliport.ts`](#public-modules-environment-obstacles-arena-infrastructure-arena-heliport-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/arena-space.ts`](#public-modules-environment-obstacles-arena-infrastructure-arena-space-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/cargo.ts`](#public-modules-environment-obstacles-arena-infrastructure-cargo-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/charge-station.ts`](#public-modules-environment-obstacles-arena-infrastructure-charge-station-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/index.ts`](#public-modules-environment-obstacles-arena-infrastructure-index-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/light-tower.ts`](#public-modules-environment-obstacles-arena-infrastructure-light-tower-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/locus-beacon.ts`](#public-modules-environment-obstacles-arena-infrastructure-locus-beacon-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/start-position.ts`](#public-modules-environment-obstacles-arena-infrastructure-start-position-ts)
- [`public/modules/environment/obstacles/arena-infrastructure/video-tower.ts`](#public-modules-environment-obstacles-arena-infrastructure-video-tower-ts)
- [`public/modules/environment/obstacles/arena-scenery.ts`](#public-modules-environment-obstacles-arena-scenery-ts)
- [`public/modules/environment/obstacles/arena.ts`](#public-modules-environment-obstacles-arena-ts)
- [`public/modules/environment/obstacles/buildings.ts`](#public-modules-environment-obstacles-buildings-ts)
- [`public/modules/environment/obstacles/buildings/effects.ts`](#public-modules-environment-obstacles-buildings-effects-ts)
- [`public/modules/environment/obstacles/buildings/incidents.ts`](#public-modules-environment-obstacles-buildings-incidents-ts)
- [`public/modules/environment/obstacles/buildings/modules.ts`](#public-modules-environment-obstacles-buildings-modules-ts)
- [`public/modules/environment/obstacles/buildings/shared.ts`](#public-modules-environment-obstacles-buildings-shared-ts)
- [`public/modules/environment/obstacles/competition.ts`](#public-modules-environment-obstacles-competition-ts)
- [`public/modules/environment/obstacles/house-prop.ts`](#public-modules-environment-obstacles-house-prop-ts)
- [`public/modules/environment/obstacles/infra-props.ts`](#public-modules-environment-obstacles-infra-props-ts)
- [`public/modules/environment/obstacles/linear.ts`](#public-modules-environment-obstacles-linear-ts)
- [`public/modules/environment/obstacles/marker-dictionaries.ts`](#public-modules-environment-obstacles-marker-dictionaries-ts)
- [`public/modules/environment/obstacles/markers.ts`](#public-modules-environment-obstacles-markers-ts)
- [`public/modules/environment/obstacles/markers/map.ts`](#public-modules-environment-obstacles-markers-map-ts)
- [`public/modules/environment/obstacles/markers/object.ts`](#public-modules-environment-obstacles-markers-object-ts)
- [`public/modules/environment/obstacles/markers/shared.ts`](#public-modules-environment-obstacles-markers-shared-ts)
- [`public/modules/environment/obstacles/markers/surface.ts`](#public-modules-environment-obstacles-markers-surface-ts)
- [`public/modules/environment/obstacles/markers/texture.ts`](#public-modules-environment-obstacles-markers-texture-ts)
- [`public/modules/environment/obstacles/mission-assets.ts`](#public-modules-environment-obstacles-mission-assets-ts)
- [`public/modules/environment/obstacles/nature.ts`](#public-modules-environment-obstacles-nature-ts)
- [`public/modules/environment/obstacles/pads.ts`](#public-modules-environment-obstacles-pads-ts)
- [`public/modules/environment/obstacles/park-props.ts`](#public-modules-environment-obstacles-park-props-ts)
- [`public/modules/environment/obstacles/presets.ts`](#public-modules-environment-obstacles-presets-ts)
- [`public/modules/environment/obstacles/presets/geoskan-arena.ts`](#public-modules-environment-obstacles-presets-geoskan-arena-ts)
- [`public/modules/environment/obstacles/presets/race-track.ts`](#public-modules-environment-obstacles-presets-race-track-ts)
- [`public/modules/environment/obstacles/presets/residential.ts`](#public-modules-environment-obstacles-presets-residential-ts)
- [`public/modules/environment/obstacles/training-props.ts`](#public-modules-environment-obstacles-training-props-ts)
- [`public/modules/environment/obstacles/types.ts`](#public-modules-environment-obstacles-types-ts)
- [`public/modules/environment/obstacles/utils.ts`](#public-modules-environment-obstacles-utils-ts)
- [`public/modules/environment/obstacles/vehicles.ts`](#public-modules-environment-obstacles-vehicles-ts)
- [`public/modules/environment/training/city-plan.ts`](#public-modules-environment-training-city-plan-ts)
- [`public/modules/environment/training/geography.ts`](#public-modules-environment-training-geography-ts)
- [`public/modules/environment/training/landscape-assets.ts`](#public-modules-environment-training-landscape-assets-ts)
- [`public/modules/environment/training/layout.ts`](#public-modules-environment-training-layout-ts)
- [`public/modules/environment/training/mesh.ts`](#public-modules-environment-training-mesh-ts)
- [`public/modules/environment/training/overpass.ts`](#public-modules-environment-training-overpass-ts)
- [`public/modules/environment/training/patterns.ts`](#public-modules-environment-training-patterns-ts)
- [`public/modules/environment/training/road-network.ts`](#public-modules-environment-training-road-network-ts)
- [`public/modules/environment/training/settlement-policy.ts`](#public-modules-environment-training-settlement-policy-ts)
- [`public/modules/environment/training/town-frontage.ts`](#public-modules-environment-training-town-frontage-ts)
- [`public/modules/environment/training/town-plan.ts`](#public-modules-environment-training-town-plan-ts)
- [`public/modules/environment/training/town-sites.ts`](#public-modules-environment-training-town-sites-ts)
- [`public/modules/environment/training/world-builder.ts`](#public-modules-environment-training-world-builder-ts)
- [`public/modules/environment/training/world-context.ts`](#public-modules-environment-training-world-context-ts)
- [`public/modules/environment/training/world-details.ts`](#public-modules-environment-training-world-details-ts)
- [`public/modules/environment/training/world-env.ts`](#public-modules-environment-training-world-env-ts)
- [`public/modules/environment/training/world-extras.ts`](#public-modules-environment-training-world-extras-ts)
- [`public/modules/environment/training/world-network.ts`](#public-modules-environment-training-world-network-ts)
- [`public/modules/environment/training/world-places.ts`](#public-modules-environment-training-world-places-ts)
- [`public/modules/environment/training/world-plan.ts`](#public-modules-environment-training-world-plan-ts)
- [`public/modules/environment/training/world-surfaces.ts`](#public-modules-environment-training-world-surfaces-ts)
- [`public/modules/environment/training/world-vegetation.ts`](#public-modules-environment-training-world-vegetation-ts)
- [`public/modules/environment/training/world-woods.ts`](#public-modules-environment-training-world-woods-ts)
- [`public/modules/environment/truss-arena.ts`](#public-modules-environment-truss-arena-ts)
- [`public/modules/scene/core/camera-mode-state.ts`](#public-modules-scene-core-camera-mode-state-ts)
- [`public/modules/scene/core/camera.ts`](#public-modules-scene-core-camera-ts)
- [`public/modules/scene/core/DroneOrbitControls.ts`](#public-modules-scene-core-droneorbitcontrols-ts)
- [`public/modules/scene/core/editor-overlays.ts`](#public-modules-scene-core-editor-overlays-ts)
- [`public/modules/scene/core/FreeFlyControls.ts`](#public-modules-scene-core-freeflycontrols-ts)
- [`public/modules/scene/core/ground-feedback.ts`](#public-modules-scene-core-ground-feedback-ts)
- [`public/modules/scene/core/ground-overview.ts`](#public-modules-scene-core-ground-overview-ts)
- [`public/modules/scene/core/orientation-widget.ts`](#public-modules-scene-core-orientation-widget-ts)
- [`public/modules/scene/core/pointer-drag.ts`](#public-modules-scene-core-pointer-drag-ts)
- [`public/modules/scene/core/quality.ts`](#public-modules-scene-core-quality-ts)
- [`public/modules/scene/core/render-metrics.ts`](#public-modules-scene-core-render-metrics-ts)
- [`public/modules/scene/core/scene-init.ts`](#public-modules-scene-core-scene-init-ts)
- [`public/modules/scene/core/transform-controls-style-helpers.ts`](#public-modules-scene-core-transform-controls-style-helpers-ts)
- [`public/modules/scene/core/transform-controls-style.ts`](#public-modules-scene-core-transform-controls-style-ts)
- [`public/modules/scene/interaction/input-helpers.ts`](#public-modules-scene-interaction-input-helpers-ts)
- [`public/modules/scene/interaction/input.ts`](#public-modules-scene-interaction-input-ts)
- [`public/modules/scene/interaction/linear-editing.ts`](#public-modules-scene-interaction-linear-editing-ts)
- [`public/modules/scene/interaction/selection-ui.ts`](#public-modules-scene-interaction-selection-ui-ts)
- [`public/modules/scene/interaction/selection.ts`](#public-modules-scene-interaction-selection-ts)
- [`public/modules/scene/interaction/transform.ts`](#public-modules-scene-interaction-transform-ts)
- [`public/modules/scene/objects/object-catalog.ts`](#public-modules-scene-objects-object-catalog-ts)
- [`public/modules/scene/objects/object-manager-support.ts`](#public-modules-scene-objects-object-manager-support-ts)
- [`public/modules/scene/objects/object-manager.ts`](#public-modules-scene-objects-object-manager-ts)
- [`public/modules/scene/objects/object-transform.ts`](#public-modules-scene-objects-object-transform-ts)

## Файлы

<a id="public-modules-drone-model-blender-model-ts"></a>
### `public/modules/drone-model/blender-model.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/blender-model.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 4
- Ключевые символы: `attachBlenderModel`, `createBlenderModel`, `loadTemplate`, `whenDroneModelReady`

<a id="public-modules-drone-model-camera-antenna-ts"></a>
### `public/modules/drone-model/camera-antenna.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/camera-antenna.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 1
- Ключевые символы: `createCameraAndAntenna`

<a id="public-modules-drone-model-esp32-module-ts"></a>
### `public/modules/drone-model/esp32-module.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/esp32-module.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyPose`, `easeOutCubic`, `setEsp32Attached`, `setupEsp32Module`, `stateOf`, `updateEsp32Module`

<a id="public-modules-drone-model-frame-cad-ts"></a>
### `public/modules/drone-model/frame-cad.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/frame-cad.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 8
- Ключевые символы: `buildCadAssembly`, `buildCadGuardAssembly`, `centerCadGeometry`, `createArcPlacement`, `createCadMesh`, `loadCadGeometry`, `toPlacement`, `vec3`

<a id="public-modules-drone-model-frame-fallback-ts"></a>
### `public/modules/drone-model/frame-fallback.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/frame-fallback.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 4
- Ключевые символы: `createBatteryVolume`, `createFallbackStructure`, `createGuard`, `createLegs`

<a id="public-modules-drone-model-frame-ts"></a>
### `public/modules/drone-model/frame.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/frame.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 2
- Ключевые символы: `attachCadAssembly`, `createFrame`

<a id="public-modules-drone-model-index-ts"></a>
### `public/modules/drone-model/index.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/index.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 6
- Ключевые символы: `animateRotors`, `applyLedMaterialState`, `createDroneModel`, `createLegacyDroneModel`, `shouldAnimateRotors`, `updateLEDs`

<a id="public-modules-drone-model-layout-ts"></a>
### `public/modules/drone-model/layout.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/layout.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 0

<a id="public-modules-drone-model-led-glow-ts"></a>
### `public/modules/drone-model/led-glow.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/led-glow.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 4
- Ключевые символы: `createLedGlowSprite`, `findLedGlowSprite`, `getGlowTexture`, `updateLedGlowSprite`

<a id="public-modules-drone-model-leds-ts"></a>
### `public/modules/drone-model/leds.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/leds.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 8
- Ключевые символы: `applyPlacement`, `attachCadLedModels`, `cloneBaseLedModel`, `createLedAssembly`, `createLEDMatrix`, `createLEDs`, `loadBaseLedModel`, `normalizeBaseLedModel`

<a id="public-modules-drone-model-motors-ts"></a>
### `public/modules/drone-model/motors.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/motors.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 7
- Ключевые символы: `attachCadMotors`, `attachCadPropellers`, `buildCadMotors`, `centerCadGeometry`, `createFallbackMotors`, `createMotors`, `loadCadGeometry`

<a id="public-modules-drone-camera-views-ts"></a>
### `public/modules/drone/camera-views.ts`

- Исходник: [открыть файл](../../public/modules/drone/camera-views.ts)
- Кратко: Визуальное поведение дрона и спецэффекты.
- Обнаружено функций/методов: 14
- Ключевые символы: `bottomCameraOf`, `cameraFor`, `clampPosition`, `ensureUi`, `icon`, `installDragging`, `loadState`, `move`, `placeView`, `render`, `renderCameraViews`, `saveState`, `setOpen`, `stop`

<a id="public-modules-drone-crash-visuals-ts"></a>
### `public/modules/drone/crash-visuals.ts`

- Исходник: [открыть файл](../../public/modules/drone/crash-visuals.ts)
- Кратко: Визуальное поведение дрона и спецэффекты.
- Обнаружено функций/методов: 3
- Ключевые символы: `explodeDrone`, `resetDroneVisuals`, `updateDebrisVisuals`

<a id="public-modules-drone-index-ts"></a>
### `public/modules/drone/index.ts`

- Исходник: [открыть файл](../../public/modules/drone/index.ts)
- Кратко: Визуальное поведение дрона и спецэффекты.
- Обнаружено функций/методов: 10
- Ключевые символы: `ensurePrintBubbleOverlay`, `getObstacles`, `getPrintBubbleElement`, `hidePrintBubble`, `init3D`, `setDroneEsp32Attached`, `showDronePrintBubble`, `syncDronePrintBubbles`, `syncDrones`, `updateDrone3D`

<a id="public-modules-drone-scene-events-ts"></a>
### `public/modules/drone/scene-events.ts`

- Исходник: [открыть файл](../../public/modules/drone/scene-events.ts)
- Кратко: Визуальное поведение дрона и спецэффекты.
- Обнаружено функций/методов: 3
- Ключевые символы: `handleSceneKeyDown`, `isScenePointerEvent`, `registerScenePointerHandlers`

<a id="public-modules-drone-trails-ts"></a>
### `public/modules/drone/trails.ts`

- Исходник: [открыть файл](../../public/modules/drone/trails.ts)
- Кратко: Визуальное поведение дрона и спецэффекты.
- Обнаружено функций/методов: 10
- Ключевые символы: `disposeTrailForDrone`, `getRingState`, `getTracerColorHex`, `getTracerPointSize`, `getTracerWidthPx`, `initTrailForDrone`, `shouldShowTracerLine`, `shouldShowTracerPoints`, `updateTrailForDrone`, `writePositions`

<a id="public-modules-environment-ground-ts"></a>
### `public/modules/environment/ground.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyGroundTheme`, `createGround`, `ensureGroundThemeListener`

<a id="public-modules-environment-ground-textures-ts"></a>
### `public/modules/environment/ground/textures.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground/textures.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createFloorTexture`, `createLandingPadTexture`, `replaceMaterialTexture`

<a id="public-modules-environment-ground-theme-ts"></a>
### `public/modules/environment/ground/theme.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground/theme.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `getGroundTheme`

<a id="public-modules-environment-index-ts"></a>
### `public/modules/environment/index.ts`

- Исходник: [открыть файл](../../public/modules/environment/index.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 7
- Ключевые символы: `addObjectToScene`, `createSceneObjectByType`, `setupEnvironment`, `stampSlots`, `syncDefaultDressing`, `updateSceneObjectPoints`, `updateSceneObjectValue`

<a id="public-modules-environment-lights-ts"></a>
### `public/modules/environment/lights.ts`

- Исходник: [открыть файл](../../public/modules/environment/lights.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `setupLights`

<a id="public-modules-environment-obstacles-ts"></a>
### `public/modules/environment/obstacles.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createObstacles`

<a id="public-modules-environment-obstacles-arena-infrastructure-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-arena-infrastructure-arena-control-station-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/arena-control-station.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/arena-control-station.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createArenaControlStationMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-arena-heliport-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/arena-heliport.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/arena-heliport.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createArenaHeliportMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-arena-space-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/arena-space.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/arena-space.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createArenaSpaceMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-cargo-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/cargo.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/cargo.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createCargoMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-charge-station-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/charge-station.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/charge-station.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createChargeStationMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-index-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/index.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/index.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-arena-infrastructure-light-tower-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/light-tower.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/light-tower.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createLightTowerMesh`, `loadTemplate`

<a id="public-modules-environment-obstacles-arena-infrastructure-locus-beacon-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/locus-beacon.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/locus-beacon.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createLocusBeaconMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-start-position-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/start-position.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/start-position.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createStartPositionMesh`

<a id="public-modules-environment-obstacles-arena-infrastructure-video-tower-ts"></a>
### `public/modules/environment/obstacles/arena-infrastructure/video-tower.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-infrastructure/video-tower.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createVideoTowerMesh`

<a id="public-modules-environment-obstacles-arena-scenery-ts"></a>
### `public/modules/environment/obstacles/arena-scenery.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena-scenery.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createArenaHillClusterMesh`, `createForestPatchMesh`, `createSettlementMesh`

<a id="public-modules-environment-obstacles-arena-ts"></a>
### `public/modules/environment/obstacles/arena.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/arena.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-buildings-ts"></a>
### `public/modules/environment/obstacles/buildings.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 10
- Ключевые символы: `createApartmentBuildingMesh`, `finishShellMeshes`, `getBuildingWindowSlots`, `hasFireAt`, `isKeptSeparate`, `measureRoofTop`, `mergeBuildingShell`, `placeRoofMarker`, `rebuildApartmentBuilding`, `updateApartmentBuildingMetadata`

<a id="public-modules-environment-obstacles-buildings-effects-ts"></a>
### `public/modules/environment/obstacles/buildings/effects.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/effects.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `addIncidentEffect`

<a id="public-modules-environment-obstacles-buildings-incidents-ts"></a>
### `public/modules/environment/obstacles/buildings/incidents.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/incidents.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `getWindowSlots`, `parseIncidentKind`, `parseWindowIncidents`, `summarizeWindowIncidents`

<a id="public-modules-environment-obstacles-buildings-modules-ts"></a>
### `public/modules/environment/obstacles/buildings/modules.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/modules.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyNamedMaterials`, `loadTemplate`, `populateWindowsAndEntrance`

<a id="public-modules-environment-obstacles-buildings-shared-ts"></a>
### `public/modules/environment/obstacles/buildings/shared.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/shared.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `clampBuildingFloors`, `normalizeBuildingConfig`

<a id="public-modules-environment-obstacles-competition-ts"></a>
### `public/modules/environment/obstacles/competition.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/competition.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createFlagMesh`, `createGateMesh`, `createPylonMesh`

<a id="public-modules-environment-obstacles-house-prop-ts"></a>
### `public/modules/environment/obstacles/house-prop.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/house-prop.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createSettlementHouseMesh`, `loadTemplate`, `recolor`

<a id="public-modules-environment-obstacles-infra-props-ts"></a>
### `public/modules/environment/obstacles/infra-props.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/infra-props.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 5
- Ключевые символы: `attachFrom`, `attachInfraNode`, `attachInfraNodeB`, `loadTemplateA`, `loadTemplateB`

<a id="public-modules-environment-obstacles-linear-ts"></a>
### `public/modules/environment/obstacles/linear.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/linear.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 12
- Ключевые символы: `buildOrientedBox`, `buildOrientedCylinder`, `buildRibbon`, `createRailwayMesh`, `createRoadMesh`, `getLinearFeatureCurve`, `getLinearFeatureSurfaceHeight`, `inGap`, `makePathCurve`, `rebuildLinearFeature`, `toPointList`, `updateLinearFeaturePoints`

<a id="public-modules-environment-obstacles-marker-dictionaries-ts"></a>
### `public/modules/environment/obstacles/marker-dictionaries.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/marker-dictionaries.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-markers-ts"></a>
### `public/modules/environment/obstacles/markers.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-markers-map-ts"></a>
### `public/modules/environment/obstacles/markers/map.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers/map.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 6
- Ключевые символы: `applyMarkerMapMetadata`, `createAprilTagMarkerMapMesh`, `createArucoMarkerMapMesh`, `createMarkerMapMesh`, `getAnchorPosition`, `updateMarkerMapSettings`

<a id="public-modules-environment-obstacles-markers-object-ts"></a>
### `public/modules/environment/obstacles/markers/object.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers/object.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 7
- Ключевые символы: `applyMarkerMetadata`, `createAprilTagMarkerMesh`, `createArucoMarkerMesh`, `createMarkerMeshForMap`, `isMarkerObject`, `updateMarkerMaterials`, `updateMarkerValue`

<a id="public-modules-environment-obstacles-markers-shared-ts"></a>
### `public/modules/environment/obstacles/markers/shared.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers/shared.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 10
- Ключевые символы: `clampInt`, `clampNumber`, `getDefaultDictionary`, `getDictionaryDefinition`, `getMarkerKindKey`, `normalizeMarkerDictionaryId`, `normalizeMarkerMapOptions`, `normalizeMarkerValue`, `parseMarkerId`, `wrapMarkerId`

<a id="public-modules-environment-obstacles-markers-surface-ts"></a>
### `public/modules/environment/obstacles/markers/surface.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers/surface.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `addBoxSurfaceCandidates`, `clampValue`, `makeCandidate`, `snapMarkerToSurface`

<a id="public-modules-environment-obstacles-markers-texture-ts"></a>
### `public/modules/environment/obstacles/markers/texture.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/markers/texture.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `bytesToBitMatrix`, `createMarkerTexture`, `getMarkerMatrix`, `parseMarkerId`

<a id="public-modules-environment-obstacles-mission-assets-ts"></a>
### `public/modules/environment/obstacles/mission-assets.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/mission-assets.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createMissionAsset`

<a id="public-modules-environment-obstacles-nature-ts"></a>
### `public/modules/environment/obstacles/nature.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/nature.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 8
- Ключевые символы: `bark`, `createBushMesh`, `createFirTreeMesh`, `createHillMesh`, `createParkPatch`, `createTreeMesh`, `foliage`, `noise`

<a id="public-modules-environment-obstacles-pads-ts"></a>
### `public/modules/environment/obstacles/pads.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/pads.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createStyledLandingPad`, `createTransportMesh`

<a id="public-modules-environment-obstacles-park-props-ts"></a>
### `public/modules/environment/obstacles/park-props.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/park-props.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 5
- Ключевые символы: `createParkBenchMesh`, `createParkLampMesh`, `createParkPlanterMesh`, `createPropMesh`, `loadTemplate`

<a id="public-modules-environment-obstacles-presets-ts"></a>
### `public/modules/environment/obstacles/presets.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/presets.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-presets-geoskan-arena-ts"></a>
### `public/modules/environment/obstacles/presets/geoskan-arena.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/presets/geoskan-arena.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createGeoskanArenaPreset`

<a id="public-modules-environment-obstacles-presets-race-track-ts"></a>
### `public/modules/environment/obstacles/presets/race-track.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/presets/race-track.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `createRaceTrackPreset`

<a id="public-modules-environment-obstacles-presets-residential-ts"></a>
### `public/modules/environment/obstacles/presets/residential.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/presets/residential.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createResidentialPreset`, `place`

<a id="public-modules-environment-obstacles-training-props-ts"></a>
### `public/modules/environment/obstacles/training-props.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/training-props.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `loadTrainingTemplate`

<a id="public-modules-environment-obstacles-types-ts"></a>
### `public/modules/environment/obstacles/types.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/types.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 0

<a id="public-modules-environment-obstacles-utils-ts"></a>
### `public/modules/environment/obstacles/utils.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/utils.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyShadows`, `clearGeneratedChildren`, `disposeObject3D`

<a id="public-modules-environment-obstacles-vehicles-ts"></a>
### `public/modules/environment/obstacles/vehicles.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/vehicles.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 8
- Ключевые символы: `addRoofMarker`, `buildCar`, `buildLocomotive`, `buildWagon`, `createVehicleMesh`, `normalizeVehicleConfig`, `num`, `rebuildVehicle`

<a id="public-modules-environment-training-city-plan-ts"></a>
### `public/modules/environment/training/city-plan.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/city-plan.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `populateCity`

<a id="public-modules-environment-training-geography-ts"></a>
### `public/modules/environment/training/geography.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/geography.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 15
- Ключевые символы: `distanceToBox`, `distanceToPath`, `distanceToPolygon`, `distanceToSegment`, `distanceToWaterBodies`, `insidePolygon`, `nearestOnPath`, `ObjectIndex.key`, `ObjectIndex.sync`, `PathIndex.key`, `pointAtLength`, `polylineLength`, `seededRandom`, `segmentCrossing`, `WaterProbe.if`

<a id="public-modules-environment-training-landscape-assets-ts"></a>
### `public/modules/environment/training/landscape-assets.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/landscape-assets.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createLandscapeAsset`, `kitOf`

<a id="public-modules-environment-training-layout-ts"></a>
### `public/modules/environment/training/layout.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/layout.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `generateTrainingLayout`, `randomFromSeed`

<a id="public-modules-environment-training-mesh-ts"></a>
### `public/modules/environment/training/mesh.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/mesh.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createTrainingTerrain`, `createTurbine`

<a id="public-modules-environment-training-overpass-ts"></a>
### `public/modules/environment/training/overpass.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/overpass.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `addOverpasses`, `box`, `lift`, `sweep`

<a id="public-modules-environment-training-patterns-ts"></a>
### `public/modules/environment/training/patterns.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/patterns.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 10
- Ключевые символы: `axisLines`, `degree`, `gridPattern`, `inHoleColumn`, `makeCell`, `pinned`, `polygonArea`, `radialPattern`, `ribbonPattern`, `road`

<a id="public-modules-environment-training-road-network-ts"></a>
### `public/modules/environment/training/road-network.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/road-network.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `note`, `RoadBook.for`, `RoadBook.if`

<a id="public-modules-environment-training-settlement-policy-ts"></a>
### `public/modules/environment/training/settlement-policy.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/settlement-policy.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 7
- Ключевые символы: `canPlaceModel`, `districtAt`, `districts`, `homes`, `modelLimit`, `reserveFootprint`, `residentialNeighbors`

<a id="public-modules-environment-training-town-frontage-ts"></a>
### `public/modules/environment/training/town-frontage.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/town-frontage.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `finishTown`, `frontage`, `inflate`

<a id="public-modules-environment-training-town-plan-ts"></a>
### `public/modules/environment/training/town-plan.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/town-plan.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 11
- Ключевые символы: `centreOver`, `distToHole`, `edgeOnAvenue`, `insetCell`, `place`, `placeServices`, `planLandmarks`, `planLanes`, `planParks`, `stationScore`, `verifyCivic`

<a id="public-modules-environment-training-town-sites-ts"></a>
### `public/modules/environment/training/town-sites.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/town-sites.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 7
- Ключевые символы: `around`, `centrality`, `hierarchyBonus`, `inCell`, `lessonOrPark`, `placeBest`, `sitesAlong`

<a id="public-modules-environment-training-world-builder-ts"></a>
### `public/modules/environment/training/world-builder.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-builder.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `buildWorld`, `weight`

<a id="public-modules-environment-training-world-context-ts"></a>
### `public/modules/environment/training/world-context.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-context.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createContext`, `dbg`, `hashString`

<a id="public-modules-environment-training-world-details-ts"></a>
### `public/modules/environment/training/world-details.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-details.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 14
- Ключевые символы: `addPolyline`, `addPowerWires`, `addStreetLamps`, `addWorldDetails`, `at`, `box`, `clear`, `createWireSpan`, `findPlace`, `part`, `place`, `rect`, `wireSpanGeometries`, `world`

<a id="public-modules-environment-training-world-env-ts"></a>
### `public/modules/environment/training/world-env.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-env.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `clamp`, `rank`

<a id="public-modules-environment-training-world-extras-ts"></a>
### `public/modules/environment/training/world-extras.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-extras.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 17
- Ключевые символы: `buildIndustry`, `clamp`, `dryBox`, `face`, `late`, `nearestRoad`, `planAirfield`, `planExtras`, `planFarm`, `planHills`, `planLandscape`, `planPower`, `roadsNow`, `spot`, `tooClose`, `touches`, `xAt`

<a id="public-modules-environment-training-world-network-ts"></a>
### `public/modules/environment/training/world-network.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-network.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `addOverpass`, `addPromenade`, `addSidewalks`, `closeDeadEnds`

<a id="public-modules-environment-training-world-places-ts"></a>
### `public/modules/environment/training/world-places.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-places.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 16
- Ключевые символы: `addTown`, `allValid`, `buildCity`, `createPlacers`, `distanceToBoxPath`, `farFromEdge`, `hamlets`, `hierarchy`, `makeRibbon`, `makeTown`, `makeTrunks`, `mostlyValid`, `placeHighway`, `placeTowns`, `regional`, `villages`

<a id="public-modules-environment-training-world-plan-ts"></a>
### `public/modules/environment/training/world-plan.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-plan.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `distanceToWater`, `populateWorld`, `trainingHeightAt`

<a id="public-modules-environment-training-world-surfaces-ts"></a>
### `public/modules/environment/training/world-surfaces.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-surfaces.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 8
- Ключевые символы: `addJunctionSurfaces`, `addWorldSurfaces`, `batchStaticMeshes`, `disc`, `flatPolygon`, `projectHeading`, `riverOutline`, `signature`

<a id="public-modules-environment-training-world-vegetation-ts"></a>
### `public/modules/environment/training/world-vegetation.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-vegetation.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `addWorldVegetation`

<a id="public-modules-environment-training-world-woods-ts"></a>
### `public/modules/environment/training/world-woods.ts`

- Исходник: [открыть файл](../../public/modules/environment/training/world-woods.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `blocked`, `districtOfVillage`, `plantWorld`

<a id="public-modules-environment-truss-arena-ts"></a>
### `public/modules/environment/truss-arena.ts`

- Исходник: [открыть файл](../../public/modules/environment/truss-arena.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `createTruss`, `createTrussArena`, `createTrussArenaMesh`, `line`

<a id="public-modules-scene-core-camera-mode-state-ts"></a>
### `public/modules/scene/core/camera-mode-state.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/camera-mode-state.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 4
- Ключевые символы: `getCameraMode`, `getFreeCameraSubMode`, `setCameraMode`, `setFreeCameraSubMode`

<a id="public-modules-scene-core-camera-ts"></a>
### `public/modules/scene/core/camera.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/camera.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 1
- Ключевые символы: `updateCamera`

<a id="public-modules-scene-core-droneorbitcontrols-ts"></a>
### `public/modules/scene/core/DroneOrbitControls.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/DroneOrbitControls.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 17
- Ключевые символы: `DroneOrbitControls.addEventListener`, `DroneOrbitControls.clampElevation`, `DroneOrbitControls.clampRadius`, `DroneOrbitControls.clampTargetToSceneBounds`, `DroneOrbitControls.dispatchEvent`, `DroneOrbitControls.enabled`, `DroneOrbitControls.if`, `DroneOrbitControls.isTransformInteractionActive`, `DroneOrbitControls.onPointerDown`, `DroneOrbitControls.onPointerMove`, `DroneOrbitControls.onPointerUp`, `DroneOrbitControls.onWheel`, `DroneOrbitControls.removeEventListener`, `DroneOrbitControls.setTarget`, `DroneOrbitControls.syncSphericalFromCamera`, `DroneOrbitControls.update`, `DroneOrbitControls.zoomTowardsPointer`

<a id="public-modules-scene-core-editor-overlays-ts"></a>
### `public/modules/scene/core/editor-overlays.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/editor-overlays.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 1
- Ключевые символы: `materialsOf`

<a id="public-modules-scene-core-freeflycontrols-ts"></a>
### `public/modules/scene/core/FreeFlyControls.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/FreeFlyControls.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 3
- Ключевые символы: `FreeFlyControls.enabled`, `FreeFlyControls.getBasis`, `FreeFlyControls.if`

<a id="public-modules-scene-core-ground-feedback-ts"></a>
### `public/modules/scene/core/ground-feedback.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/ground-feedback.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 2
- Ключевые символы: `createGroundPointLabel`, `showGroundPoint`

<a id="public-modules-scene-core-ground-overview-ts"></a>
### `public/modules/scene/core/ground-overview.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/ground-overview.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 1
- Ключевые символы: `groundOverview`

<a id="public-modules-scene-core-orientation-widget-ts"></a>
### `public/modules/scene/core/orientation-widget.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/orientation-widget.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 9
- Ключевые символы: `cancelSnap`, `createBubble`, `initOrientationWidget`, `setCaption`, `shortestAngle`, `show`, `snapOrbitTo`, `step`, `updateOrientationWidget`

<a id="public-modules-scene-core-pointer-drag-ts"></a>
### `public/modules/scene/core/pointer-drag.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/pointer-drag.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 1
- Ключевые символы: `PointerDragSession.if`

<a id="public-modules-scene-core-quality-ts"></a>
### `public/modules/scene/core/quality.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/quality.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 17
- Ключевые символы: `applyTier`, `createGovernorState`, `decideTier`, `findSun`, `getQualitySetting`, `getQualityTier`, `loadSetting`, `lodFlags`, `manualTier`, `median`, `onQualityChange`, `parseQualitySetting`, `setQualitySetting`, `setShadowCasting`, `tierOfSetting`, `updateDistanceLod`, `updateQuality`

<a id="public-modules-scene-core-render-metrics-ts"></a>
### `public/modules/scene/core/render-metrics.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/render-metrics.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 3
- Ключевые символы: `finishRenderSample`, `startRenderSample`, `stats`

<a id="public-modules-scene-core-scene-init-ts"></a>
### `public/modules/scene/core/scene-init.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/scene-init.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 12
- Ключевые символы: `applySceneTheme`, `configureTransformHelperVisuals`, `ensureSceneThemeListener`, `focusOrbitControlsOnObject`, `getSceneTheme`, `getSceneThemePalette`, `initScene`, `onWindowResize`, `setIsHittingGizmo`, `setSelectedObject`, `syncViewportDependentSceneVisuals`, `toggleMultiSelectObject`

<a id="public-modules-scene-core-transform-controls-style-helpers-ts"></a>
### `public/modules/scene/core/transform-controls-style-helpers.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/transform-controls-style-helpers.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 11
- Ключевые символы: `applySharedRootStyling`, `axisFromName`, `cloneBaseMaterial`, `getAxisValue`, `getGeometryMetrics`, `removeByName`, `replaceRotateGeometry`, `scaleGeometryAlongAxis`, `setMaterialColor`, `translateGeometryAlongAxis`, `tuneMaterialLibrary`

<a id="public-modules-scene-core-transform-controls-style-ts"></a>
### `public/modules/scene/core/transform-controls-style.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/transform-controls-style.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 8
- Ключевые символы: `addBackHalfArc`, `applyTransformControlsUxTheme`, `customizeLinearModeGroup`, `customizeRotateModeGroup`, `customizeScaleModeGroup`, `isAxisActive`, `syncCustomHighlight`, `syncTransformControlsStyle`

<a id="public-modules-scene-interaction-input-helpers-ts"></a>
### `public/modules/scene/interaction/input-helpers.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/input-helpers.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 7
- Ключевые символы: `collectPointerTargets`, `getGroundPointFromPointer`, `getObjectDisplayName`, `getRootSceneObject`, `isDroneObject`, `isGroundObject`, `traceClick`

<a id="public-modules-scene-interaction-input-ts"></a>
### `public/modules/scene/interaction/input.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/input.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 3
- Ключевые символы: `onPointerDown`, `onPointerUp`, `onSceneDoubleClick`

<a id="public-modules-scene-interaction-linear-editing-ts"></a>
### `public/modules/scene/interaction/linear-editing.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/linear-editing.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 54
- Ключевые символы: `addPointFromCursor`, `begin`, `buildDisc`, `buildRibbon`, `closesRing`, `computeCursor`, `continueFromEnd`, `curveOf`, `disposeGroup`, `ensureListeners`, `escapeHtml`, `finishLinearFeatureEditing`, `formatMetres`, `formatPoints`, `groundAt`, `groundZ`, `handleLinearEditingKeyDown`, `handleLinearEditingPointerMove`, `handleLinearEditingPointerUp`, `headingOf`, `hintText`, `hudHost`, `icon`, `isCanvasEvent`, `isLinearFeatureEditingActive`, `keepScreenSize`, `midpoints`, `onDoubleClick`, `onHudClick`, `onPointerDown`, `onPointerMove`, `onPointerUp`, `overlayMaterial`, `pickHandle`, `problemFor`, `refreshPreview`, `removeVertex`, `renderHud`, `renderLabel`, `renderStats`, `routeLength`, `setNotice`, `snapFrom`, `snapToGrid`, `startLinearFeatureEditing`, `startRouteDrawing`, `syncTarget`, `teardown`, `toggleLoop`, `toScreen`, `turnAt`, `undoPoint`, `updateCanvasCursor`, `vertexProblem`

<a id="public-modules-scene-interaction-selection-ui-ts"></a>
### `public/modules/scene/interaction/selection-ui.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/selection-ui.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 4
- Ключевые символы: `handleSelection`, `hideTransformUiPreserveSelection`, `showTransformUi`, `updateObjectSelectionVisuals`

<a id="public-modules-scene-interaction-selection-ts"></a>
### `public/modules/scene/interaction/selection.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/selection.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 3
- Ключевые символы: `deselectObject`, `exitTransformMode`, `handleDeselection`

<a id="public-modules-scene-interaction-transform-ts"></a>
### `public/modules/scene/interaction/transform.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/transform.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 8
- Ключевые символы: `createAxisLabel`, `getGuideLength`, `hideRotationGuide`, `setHelperRenderOrder`, `setupTransformControlListeners`, `showRotationGuide`, `syncRotationGuide`, `updateTransformModeDecorations`

<a id="public-modules-scene-objects-object-catalog-ts"></a>
### `public/modules/scene/objects/object-catalog.ts`

- Исходник: [открыть файл](../../public/modules/scene/objects/object-catalog.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 10
- Ключевые символы: `buildSceneEntry`, `findSceneObjectById`, `formatPoints`, `getSceneTopLevelObjects`, `isTransformableObject`, `listChildEntities`, `listSceneObjects`, `normalizePoints`, `parsePointsText`, `visit`

<a id="public-modules-scene-objects-object-manager-support-ts"></a>
### `public/modules/scene/objects/object-manager-support.ts`

- Исходник: [открыть файл](../../public/modules/scene/objects/object-manager-support.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 5
- Ключевые символы: `detachObjectFromGroupPreservingWorldTransform`, `disposeObjectHierarchyResources`, `getViewportCenterSelectionPoint`, `isDroneSceneObject`, `moveObjectIntoGroupPreservingWorldTransform`

<a id="public-modules-scene-objects-object-manager-ts"></a>
### `public/modules/scene/objects/object-manager.ts`

- Исходник: [открыть файл](../../public/modules/scene/objects/object-manager.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 21
- Ключевые символы: `addObject`, `appendPointToSelectedLinearObject`, `clearSceneSelection`, `deleteSceneObjectById`, `deleteSelectedObject`, `duplicateObject`, `finishSelectedLinearObjectEditing`, `focusSceneObjectById`, `getSelectedSceneObjectId`, `groupObjects`, `isSelectedLinearObjectEditingActive`, `resetDroneToOrigin`, `resetSelectedSceneObjectTransform`, `rotateSelectedSceneObjectByDegrees`, `selectSceneObjectById`, `setSceneObjectTransformMode`, `startSelectedLinearObjectEditing`, `toggleMultiSelectObjectById`, `ungroupObject`, `updateMarkerObjectSettings`, `updateSelectedSceneObject`

<a id="public-modules-scene-objects-object-transform-ts"></a>
### `public/modules/scene/objects/object-transform.ts`

- Исходник: [открыть файл](../../public/modules/scene/objects/object-transform.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 6
- Ключевые символы: `activateTransformMode`, `clearSelectedObjectInitialTransform`, `rememberSelectedObjectInitialTransform`, `resetSelectedObjectToInitialTransform`, `rotateSelectedObjectByDegrees`, `setSelectedObjectTransform`

