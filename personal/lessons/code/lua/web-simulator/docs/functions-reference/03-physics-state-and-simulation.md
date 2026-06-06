# Физика, состояние и симуляция

Основной цикл симуляции, события столкновений, физические материалы, захват грузов, MCE-события и служебные тестовые сценарии.

## Состав группы

- [`public/modules/physics/cargo-contact.ts`](#public-modules-physics-cargo-contact-ts)
- [`public/modules/physics/collisions.ts`](#public-modules-physics-collisions-ts)
- [`public/modules/physics/commands.ts`](#public-modules-physics-commands-ts)
- [`public/modules/physics/constants.ts`](#public-modules-physics-constants-ts)
- [`public/modules/physics/events.ts`](#public-modules-physics-events-ts)
- [`public/modules/physics/flight-update.ts`](#public-modules-physics-flight-update-ts)
- [`public/modules/physics/frames.ts`](#public-modules-physics-frames-ts)
- [`public/modules/physics/helpers.ts`](#public-modules-physics-helpers-ts)
- [`public/modules/physics/index.ts`](#public-modules-physics-index-ts)
- [`public/modules/physics/magnet-gripper.ts`](#public-modules-physics-magnet-gripper-ts)
- [`public/modules/physics/materials.ts`](#public-modules-physics-materials-ts)
- [`public/modules/physics/state-transitions.ts`](#public-modules-physics-state-transitions-ts)
- [`public/modules/physics/tracing.ts`](#public-modules-physics-tracing-ts)
- [`public/modules/tests.ts`](#public-modules-tests-ts)

## Файлы

<a id="public-modules-physics-cargo-contact-ts"></a>
### `public/modules/physics/cargo-contact.ts`

- Исходник: [открыть файл](../../public/modules/physics/cargo-contact.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 3
- Ключевые символы: `applyGroundFriction`, `combineContactMaterials`, `simulateDetachedCargoStep`

<a id="public-modules-physics-collisions-ts"></a>
### `public/modules/physics/collisions.ts`

- Исходник: [открыть файл](../../public/modules/physics/collisions.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 8
- Ключевые символы: `capsuleDistanceToPoint`, `findGateAncestor`, `gateHasCollision`, `intersectsExpandedBox`, `isGateObject`, `obstacleHasCollision`, `sampleSegmentPoints`, `shouldSkipCollisionForObject`

<a id="public-modules-physics-commands-ts"></a>
### `public/modules/physics/commands.ts`

- Исходник: [открыть файл](../../public/modules/physics/commands.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 1
- Ключевые символы: `processCommandQueue`

<a id="public-modules-physics-constants-ts"></a>
### `public/modules/physics/constants.ts`

- Исходник: [открыть файл](../../public/modules/physics/constants.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 0

<a id="public-modules-physics-events-ts"></a>
### `public/modules/physics/events.ts`

- Исходник: [открыть файл](../../public/modules/physics/events.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 4
- Ключевые символы: `applyCrashState`, `beginDisarmedFall`, `checkPhysicsEvents`, `shouldCrashOnGroundImpact`

<a id="public-modules-physics-flight-update-ts"></a>
### `public/modules/physics/flight-update.ts`

- Исходник: [открыть файл](../../public/modules/physics/flight-update.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 4
- Ключевые символы: `updateActiveFlight`, `updateAutoFlight`, `updateFlightModeFromRc`, `updateManualFlight`

<a id="public-modules-physics-frames-ts"></a>
### `public/modules/physics/frames.ts`

- Исходник: [открыть файл](../../public/modules/physics/frames.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 2
- Ключевые символы: `bodyPlanarToWorld`, `worldPlanarToBody`

<a id="public-modules-physics-helpers-ts"></a>
### `public/modules/physics/helpers.ts`

- Исходник: [открыть файл](../../public/modules/physics/helpers.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 5
- Ключевые символы: `applyDeadzone`, `approach`, `clampStick`, `isDroneFlying`, `normalizeThrottle`

<a id="public-modules-physics-index-ts"></a>
### `public/modules/physics/index.ts`

- Исходник: [открыть файл](../../public/modules/physics/index.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 1
- Ключевые символы: `updatePhysics`

<a id="public-modules-physics-magnet-gripper-ts"></a>
### `public/modules/physics/magnet-gripper.ts`

- Исходник: [открыть файл](../../public/modules/physics/magnet-gripper.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 6
- Ключевые символы: `getCargoMassKg`, `getCargoVelocity`, `isCargoObject`, `setCargoVelocity`, `updateDetachedCargoPhysics`, `updateMagnetGripper`

<a id="public-modules-physics-materials-ts"></a>
### `public/modules/physics/materials.ts`

- Исходник: [открыть файл](../../public/modules/physics/materials.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 1
- Ключевые символы: `resolvePhysicsMaterial`

<a id="public-modules-physics-state-transitions-ts"></a>
### `public/modules/physics/state-transitions.ts`

- Исходник: [открыть файл](../../public/modules/physics/state-transitions.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 5
- Ключевые символы: `resolveGroundContact`, `stopDroneAtGround`, `updateCrashedState`, `updateDisarmedFallState`, `updateGroundedState`

<a id="public-modules-physics-tracing-ts"></a>
### `public/modules/physics/tracing.ts`

- Исходник: [открыть файл](../../public/modules/physics/tracing.ts)
- Кратко: Низкоуровневая физика, столкновения и контактные расчеты.
- Обнаружено функций/методов: 2
- Ключевые символы: `shouldKeepTracing`, `updateTracePath`

<a id="public-modules-tests-ts"></a>
### `public/modules/tests.ts`

- Исходник: [открыть файл](../../public/modules/tests.ts)
- Кратко: Исходный модуль симулятора.
- Обнаружено функций/методов: 1
- Ключевые символы: `runIntegrationTests`

