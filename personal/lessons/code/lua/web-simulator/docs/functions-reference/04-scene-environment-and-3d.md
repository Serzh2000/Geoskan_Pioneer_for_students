# Сцена, окружение и 3D-объекты

Three.js-сцена, окружение, препятствия, модель дрона, визуальные эффекты, выбор и трансформация объектов.

## Состав группы

- [`public/modules/drone-model/camera-antenna.ts`](#public-modules-drone-model-camera-antenna-ts)
- [`public/modules/drone-model/frame.ts`](#public-modules-drone-model-frame-ts)
- [`public/modules/drone-model/index.ts`](#public-modules-drone-model-index-ts)
- [`public/modules/drone-model/leds.ts`](#public-modules-drone-model-leds-ts)
- [`public/modules/drone-model/motors.ts`](#public-modules-drone-model-motors-ts)
- [`public/modules/drone/crash-visuals.ts`](#public-modules-drone-crash-visuals-ts)
- [`public/modules/drone/index.ts`](#public-modules-drone-index-ts)
- [`public/modules/drone/scene-events.ts`](#public-modules-drone-scene-events-ts)
- [`public/modules/drone/trails.ts`](#public-modules-drone-trails-ts)
- [`public/modules/environment/ground.ts`](#public-modules-environment-ground-ts)
- [`public/modules/environment/ground/axes-labels.ts`](#public-modules-environment-ground-axes-labels-ts)
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
- [`public/modules/environment/obstacles/buildings/shared.ts`](#public-modules-environment-obstacles-buildings-shared-ts)
- [`public/modules/environment/obstacles/competition.ts`](#public-modules-environment-obstacles-competition-ts)
- [`public/modules/environment/obstacles/linear.ts`](#public-modules-environment-obstacles-linear-ts)
- [`public/modules/environment/obstacles/marker-dictionaries.ts`](#public-modules-environment-obstacles-marker-dictionaries-ts)
- [`public/modules/environment/obstacles/markers.ts`](#public-modules-environment-obstacles-markers-ts)
- [`public/modules/environment/obstacles/markers/map.ts`](#public-modules-environment-obstacles-markers-map-ts)
- [`public/modules/environment/obstacles/markers/object.ts`](#public-modules-environment-obstacles-markers-object-ts)
- [`public/modules/environment/obstacles/markers/shared.ts`](#public-modules-environment-obstacles-markers-shared-ts)
- [`public/modules/environment/obstacles/markers/surface.ts`](#public-modules-environment-obstacles-markers-surface-ts)
- [`public/modules/environment/obstacles/markers/texture.ts`](#public-modules-environment-obstacles-markers-texture-ts)
- [`public/modules/environment/obstacles/nature.ts`](#public-modules-environment-obstacles-nature-ts)
- [`public/modules/environment/obstacles/pads.ts`](#public-modules-environment-obstacles-pads-ts)
- [`public/modules/environment/obstacles/presets.ts`](#public-modules-environment-obstacles-presets-ts)
- [`public/modules/environment/obstacles/presets/geoskan-arena.ts`](#public-modules-environment-obstacles-presets-geoskan-arena-ts)
- [`public/modules/environment/obstacles/presets/race-track.ts`](#public-modules-environment-obstacles-presets-race-track-ts)
- [`public/modules/environment/obstacles/presets/residential.ts`](#public-modules-environment-obstacles-presets-residential-ts)
- [`public/modules/environment/obstacles/types.ts`](#public-modules-environment-obstacles-types-ts)
- [`public/modules/environment/obstacles/utils.ts`](#public-modules-environment-obstacles-utils-ts)
- [`public/modules/environment/truss-arena.ts`](#public-modules-environment-truss-arena-ts)
- [`public/modules/scene/core/camera.ts`](#public-modules-scene-core-camera-ts)
- [`public/modules/scene/core/DroneOrbitControls.ts`](#public-modules-scene-core-droneorbitcontrols-ts)
- [`public/modules/scene/core/ground-feedback.ts`](#public-modules-scene-core-ground-feedback-ts)
- [`public/modules/scene/core/orientation-widget.ts`](#public-modules-scene-core-orientation-widget-ts)
- [`public/modules/scene/core/scene-init.ts`](#public-modules-scene-core-scene-init-ts)
- [`public/modules/scene/core/transform-controls-style-helpers.ts`](#public-modules-scene-core-transform-controls-style-helpers-ts)
- [`public/modules/scene/core/transform-controls-style.ts`](#public-modules-scene-core-transform-controls-style-ts)
- [`public/modules/scene/interaction/input-helpers.ts`](#public-modules-scene-interaction-input-helpers-ts)
- [`public/modules/scene/interaction/input.ts`](#public-modules-scene-interaction-input-ts)
- [`public/modules/scene/interaction/linear-editing-support.ts`](#public-modules-scene-interaction-linear-editing-support-ts)
- [`public/modules/scene/interaction/linear-editing.ts`](#public-modules-scene-interaction-linear-editing-ts)
- [`public/modules/scene/interaction/selection-ui.ts`](#public-modules-scene-interaction-selection-ui-ts)
- [`public/modules/scene/interaction/selection.ts`](#public-modules-scene-interaction-selection-ts)
- [`public/modules/scene/interaction/transform.ts`](#public-modules-scene-interaction-transform-ts)
- [`public/modules/scene/objects/object-catalog.ts`](#public-modules-scene-objects-object-catalog-ts)
- [`public/modules/scene/objects/object-manager-support.ts`](#public-modules-scene-objects-object-manager-support-ts)
- [`public/modules/scene/objects/object-manager.ts`](#public-modules-scene-objects-object-manager-ts)
- [`public/modules/scene/objects/object-transform.ts`](#public-modules-scene-objects-object-transform-ts)

## Файлы

<a id="public-modules-drone-model-camera-antenna-ts"></a>
### `public/modules/drone-model/camera-antenna.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/camera-antenna.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 1
- Ключевые символы: `createCameraAndAntenna`

<a id="public-modules-drone-model-frame-ts"></a>
### `public/modules/drone-model/frame.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/frame.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 3
- Ключевые символы: `createFrame`, `createGuard`, `createLegs`

<a id="public-modules-drone-model-index-ts"></a>
### `public/modules/drone-model/index.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/index.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 3
- Ключевые символы: `animateRotors`, `createDroneModel`, `updateLEDs`

<a id="public-modules-drone-model-leds-ts"></a>
### `public/modules/drone-model/leds.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/leds.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 1
- Ключевые символы: `createLEDs`

<a id="public-modules-drone-model-motors-ts"></a>
### `public/modules/drone-model/motors.ts`

- Исходник: [открыть файл](../../public/modules/drone-model/motors.ts)
- Кратко: Сборка визуальных компонентов модели дрона.
- Обнаружено функций/методов: 1
- Ключевые символы: `createMotors`

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
- Обнаружено функций/методов: 9
- Ключевые символы: `ensurePrintBubbleOverlay`, `getObstacles`, `getPrintBubbleElement`, `hidePrintBubble`, `init3D`, `showDronePrintBubble`, `syncDronePrintBubbles`, `syncDrones`, `updateDrone3D`

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
- Обнаружено функций/методов: 9
- Ключевые символы: `disposeTrailForDrone`, `getTracerColorHex`, `getTracerPointSize`, `getTracerWidthPx`, `initTrailForDrone`, `shouldShowTracerLine`, `shouldShowTracerPoints`, `updateTrailForDrone`, `writePositions`

<a id="public-modules-environment-ground-ts"></a>
### `public/modules/environment/ground.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyGroundTheme`, `createGround`, `ensureGroundThemeListener`

<a id="public-modules-environment-ground-axes-labels-ts"></a>
### `public/modules/environment/ground/axes-labels.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground/axes-labels.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `createAxesLabels`, `makeAxisLabel`

<a id="public-modules-environment-ground-textures-ts"></a>
### `public/modules/environment/ground/textures.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground/textures.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `createFloorTexture`, `createLandingPadTexture`, `hash`, `replaceMaterialTexture`

<a id="public-modules-environment-ground-theme-ts"></a>
### `public/modules/environment/ground/theme.ts`

- Исходник: [открыть файл](../../public/modules/environment/ground/theme.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 2
- Ключевые символы: `getFloorPalette`, `getGroundTheme`

<a id="public-modules-environment-index-ts"></a>
### `public/modules/environment/index.ts`

- Исходник: [открыть файл](../../public/modules/environment/index.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 5
- Ключевые символы: `addObjectToScene`, `createSceneObjectByType`, `setupEnvironment`, `updateSceneObjectPoints`, `updateSceneObjectValue`

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
- Обнаружено функций/методов: 1
- Ключевые символы: `createLightTowerMesh`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `addStrut`, `createVideoTowerMesh`

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
- Обнаружено функций/методов: 4
- Ключевые символы: `createApartmentBuildingMesh`, `rebuildApartmentBuilding`, `updateApartmentBuildingIncidents`, `updateApartmentBuildingMetadata`

<a id="public-modules-environment-obstacles-buildings-effects-ts"></a>
### `public/modules/environment/obstacles/buildings/effects.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/effects.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `addIncidentEffect`, `createFireEffect`, `createSmokeEffect`, `createThiefEffect`

<a id="public-modules-environment-obstacles-buildings-incidents-ts"></a>
### `public/modules/environment/obstacles/buildings/incidents.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/incidents.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 4
- Ключевые символы: `getWindowSlots`, `parseIncidentKind`, `parseWindowIncidents`, `summarizeWindowIncidents`

<a id="public-modules-environment-obstacles-buildings-shared-ts"></a>
### `public/modules/environment/obstacles/buildings/shared.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/buildings/shared.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 1
- Ключевые символы: `clampBuildingFloors`

<a id="public-modules-environment-obstacles-competition-ts"></a>
### `public/modules/environment/obstacles/competition.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/competition.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createFlagMesh`, `createGateMesh`, `createPylonMesh`

<a id="public-modules-environment-obstacles-linear-ts"></a>
### `public/modules/environment/obstacles/linear.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/linear.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 9
- Ключевые символы: `buildHorizontalPatch`, `buildOrientedBox`, `buildOrientedCylinder`, `createRailwayMesh`, `createRoadMesh`, `makePathCurve`, `rebuildLinearFeature`, `toPointList`, `updateLinearFeaturePoints`

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
- Обнаружено функций/методов: 5
- Ключевые символы: `applyMarkerMapMetadata`, `createAprilTagMarkerMapMesh`, `createArucoMarkerMapMesh`, `createMarkerMapMesh`, `getAnchorPosition`

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
- Обнаружено функций/методов: 11
- Ключевые символы: `clampInt`, `clampNumber`, `getDefaultDictionary`, `getDictionaryDefinition`, `getMarkerDictionaryOptions`, `getMarkerKindKey`, `normalizeMarkerDictionaryId`, `normalizeMarkerMapOptions`, `normalizeMarkerValue`, `parseMarkerId`, `wrapMarkerId`

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

<a id="public-modules-environment-obstacles-nature-ts"></a>
### `public/modules/environment/obstacles/nature.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/nature.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 7
- Ключевые символы: `createBushMesh`, `createFirTreeMesh`, `createGrassClump`, `createHillMesh`, `createParkPatch`, `createTreeMesh`, `seededRandom`

<a id="public-modules-environment-obstacles-pads-ts"></a>
### `public/modules/environment/obstacles/pads.ts`

- Исходник: [открыть файл](../../public/modules/environment/obstacles/pads.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createLandingPad`, `createStyledLandingPad`, `createTransportMesh`

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
- Обнаружено функций/методов: 1
- Ключевые символы: `createResidentialPreset`

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

<a id="public-modules-environment-truss-arena-ts"></a>
### `public/modules/environment/truss-arena.ts`

- Исходник: [открыть файл](../../public/modules/environment/truss-arena.ts)
- Кратко: Создание окружения, земли, света и препятствий.
- Обнаружено функций/методов: 3
- Ключевые символы: `createTruss`, `createTrussArena`, `createTrussArenaMesh`

<a id="public-modules-scene-core-camera-ts"></a>
### `public/modules/scene/core/camera.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/camera.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 2
- Ключевые символы: `syncOrbitControlsFromCamera`, `updateCamera`

<a id="public-modules-scene-core-droneorbitcontrols-ts"></a>
### `public/modules/scene/core/DroneOrbitControls.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/DroneOrbitControls.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 15
- Ключевые символы: `DroneOrbitControls.addEventListener`, `DroneOrbitControls.clampElevation`, `DroneOrbitControls.clampTargetToSceneBounds`, `DroneOrbitControls.debugZoom`, `DroneOrbitControls.dispatchEvent`, `DroneOrbitControls.if`, `DroneOrbitControls.isTransformInteractionActive`, `DroneOrbitControls.onPointerDown`, `DroneOrbitControls.onPointerMove`, `DroneOrbitControls.onPointerUp`, `DroneOrbitControls.onWheel`, `DroneOrbitControls.setTarget`, `DroneOrbitControls.syncSphericalFromCamera`, `DroneOrbitControls.syncTargetToPendingObjectIfInView`, `DroneOrbitControls.update`

<a id="public-modules-scene-core-ground-feedback-ts"></a>
### `public/modules/scene/core/ground-feedback.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/ground-feedback.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 2
- Ключевые символы: `createGroundPointLabel`, `showGroundPoint`

<a id="public-modules-scene-core-orientation-widget-ts"></a>
### `public/modules/scene/core/orientation-widget.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/orientation-widget.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 3
- Ключевые символы: `createAxisDom`, `initOrientationWidget`, `updateOrientationWidget`

<a id="public-modules-scene-core-scene-init-ts"></a>
### `public/modules/scene/core/scene-init.ts`

- Исходник: [открыть файл](../../public/modules/scene/core/scene-init.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 13
- Ключевые символы: `applySceneTheme`, `configureTransformHelperVisuals`, `ensureSceneThemeListener`, `focusOrbitControlsOnObject`, `getSceneTheme`, `getSceneThemePalette`, `initScene`, `onWindowResize`, `setIsHittingGizmo`, `setPointerDownPos`, `setSelectedObject`, `syncViewportDependentSceneVisuals`, `toggleMultiSelectObject`

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
- Обнаружено функций/методов: 9
- Ключевые символы: `addBackHalfArc`, `applyTransformControlsUxTheme`, `customizeLinearModeGroup`, `customizeRotateModeGroup`, `customizeScaleModeGroup`, `isAxisActive`, `refreshTransformControlsUxTheme`, `syncCustomHighlight`, `syncTransformControlsStyle`

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
- Обнаружено функций/методов: 2
- Ключевые символы: `onPointerDown`, `onPointerUp`

<a id="public-modules-scene-interaction-linear-editing-support-ts"></a>
### `public/modules/scene/interaction/linear-editing-support.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/linear-editing-support.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 10
- Ключевые символы: `applySoftSnap`, `buildMarker`, `cloneLinearPoints`, `disposePreviewGroup`, `getLinearEditingHoverPointFromEvent`, `localPointToWorldVector`, `refreshLinearEditingPreview`, `roundIfClose`, `setLinearEditingCoordsHint`, `worldVectorToLocalPoint`

<a id="public-modules-scene-interaction-linear-editing-ts"></a>
### `public/modules/scene/interaction/linear-editing.ts`

- Исходник: [открыть файл](../../public/modules/scene/interaction/linear-editing.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 11
- Ключевые символы: `finishLinearFeatureEditing`, `getHoverPointFromEvent`, `getLinearFeatureEditingTargetId`, `handleLinearEditingKeyDown`, `handleLinearEditingPointerMove`, `handleLinearEditingPointerUp`, `isLinearFeatureEditingActive`, `refreshPreview`, `resetState`, `startLinearFeatureEditing`, `syncObjectPoints`

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
- Обнаружено функций/методов: 7
- Ключевые символы: `findSceneObjectById`, `formatPoints`, `getSceneTopLevelObjects`, `isTransformableObject`, `listSceneObjects`, `normalizePoints`, `parsePointsText`

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
- Обнаружено функций/методов: 19
- Ключевые символы: `addObject`, `appendPointToSelectedLinearObject`, `clearSceneSelection`, `deleteSceneObjectById`, `deleteSelectedObject`, `duplicateObject`, `finishSelectedLinearObjectEditing`, `getSelectedLinearObjectEditingTargetId`, `getSelectedSceneObjectId`, `groupObjects`, `isSelectedLinearObjectEditingActive`, `resetDroneToOrigin`, `resetSelectedSceneObjectTransform`, `rotateSelectedSceneObjectByDegrees`, `selectSceneObjectById`, `setSceneObjectTransformMode`, `startSelectedLinearObjectEditing`, `ungroupObject`, `updateSelectedSceneObject`

<a id="public-modules-scene-objects-object-transform-ts"></a>
### `public/modules/scene/objects/object-transform.ts`

- Исходник: [открыть файл](../../public/modules/scene/objects/object-transform.ts)
- Кратко: Логика 3D-сцены, выбора объектов и трансформаций.
- Обнаружено функций/методов: 8
- Ключевые символы: `activateTransformMode`, `clearSelectedObjectInitialTransform`, `getRotationStepDegrees`, `getRotationStepOptions`, `rememberSelectedObjectInitialTransform`, `resetSelectedObjectToInitialTransform`, `rotateSelectedObjectByDegrees`, `setRotationStepDegrees`

