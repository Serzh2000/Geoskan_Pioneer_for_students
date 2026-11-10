# ТЗ: удаление мёртвого кода в `simulator/`

Работа из двух частей, каждая отдельным коммитом. Часть 1: код, на который нет ни одной ссылки. Часть 2: код, который приложение не вызывает, а держат его только собственные тесты; он удаляется вместе с этими тестами. Часть 2 делается после части 1.

База: ветка `mini2-fixes-examples`, коммит `abd1740`. Номера строк ниже даны для этого коммита.
Все пути относительны `simulator/public/modules/`, если не сказано иное.

## Правила

1. Удалять только то, что перечислено в разделах «Часть 1» и «Часть 2». Ничего сверх списка, никакого попутного рефакторинга, переименований и форматирования.
2. Искать фрагмент по имени символа, а не по номеру строки: после первых правок в файле номера съезжают. В каждом файле идти снизу вверх.
3. Вместе с функцией удалять её doc-комментарий и одну пустую строку-разделитель, чтобы не оставалось двойных пустых строк.
4. В части 1 тесты (`tests/`) не трогать: ни один тест не ссылается на удаляемые там символы. В части 2 в тестах удалять только перечисленные строки, блоки и файлы; остальные проверки не переписывать.
5. Файлы в `docs/functions-reference/` и `FUNCTIONS_REFERENCE.md` руками не править. После каждой части запустить `npm run docs:functions`.
6. Эталоны результата лежат рядом: часть 1 в `simulator/docs/dead-code-cleanup.patch` (28 файлов, +5 / −377 строк), часть 2 в `simulator/docs/dead-code-cleanup-tests.patch` (28 файлов, +10 / −931 строка; накладывается поверх части 1). Итоговый `git diff` должен совпасть с ними по смыслу. Допустимо просто применить их из корня репозитория по очереди: `git apply simulator/docs/dead-code-cleanup.patch`, затем `git apply simulator/docs/dead-code-cleanup-tests.patch`.

## Часть 1. Что удалить

### Экспорты, на которые нет ни одной ссылки (ни в коде, ни в тестах, ни в tools, ни в HTML)

| № | Файл | Что удалить | Строки |
|---|------|-------------|--------|
| 1 | `app/simulation-controls.ts` | функция `resetSimulationState` | 23–30 |
| 2 | `core/drone-models.ts` | константа `DRONE_MODEL_IDS` | 76 |
| 3 | `editor/blockly-mode/bricks/blocks.ts` | функция `hasBricksDroneOnlyReason` с комментарием; из импорта в строке 2 убрать `BRICKS_DRONE_ONLY_REASON` (сама константа в `constants.ts` остаётся, она используется) | 170–173, 2 |
| 4 | `editor/blockly-mode/bricks/generators.ts` | функция `bricksGeneratorTypes` с комментарием | 182–185 |
| 5 | `editor/blockly-mode/workspace.ts` | функции `createRawCodeWorkspaceXml` и `escapeXml` | 62–73, 47–54 |
| 6 | `editor/index/api.ts` | функции `beginTemporaryEditorDocument`, `restoreTemporaryEditorDocument`, `revealEditorStart`; импорт из `./temporary-document.js` (строка 54); из импорта в строке 1 убрать `setCurrentScriptLanguage` | 59–77, 212–215, 54, 1 |
| 7 | `editor/index.ts` | из реэкспорта убрать `beginTemporaryEditorDocument`, `restoreTemporaryEditorDocument`, `revealEditorStart` | 4, 5, 18 |
| 8 | `environment/obstacles/buildings/city-specs.ts` | константы `MAX_BLOCK_RADIUS`, `MAX_HOUSE_RADIUS` (`MIN_BLOCK_RADIUS` остаётся) | 37–38 |
| 9 | `environment/truss-arena.ts` | функция `createTrussArena` (`createTrussArenaMesh` остаётся) | 72–77 |
| 10 | `learning/account.ts` | `isAccountReady`; после этого переменная `ready` только пишется — убрать `let ready = false;` и `ready = true;` в `setUser` | 93, 46, 103 |
| 11 | `lua/utils.ts` | константа `logs` и функция `log` (`luaToStr` и `decodeLuaByteLikeValue` остаются) | 3–14 |
| 12 | `python/pioneer-js-bridge-camera.ts` | функция-обёртка `captureDroneCameraFrameDataUrl`. Импорт-алиас `captureDroneCameraFrameImageDataUrl` в строке 5 оставить, он используется | 133–135 |
| 13 | `scene/core/transform-controls-style-helpers.ts` | константа `NEUTRAL_COLOR`, функция `cloneBaseMaterial` | 27, 84–108 |
| 14 | `shared/logging/logger.ts` | функция `createLogEntryElement` | 106–129 |
| 15 | `shared/notice-messages/lua-errors.ts` | `__luaParsers` с комментарием; функция `parseNear` с комментарием (`parseVariableHint` остаётся) | 601–602, 46–51 |
| 16 | `ui/api-docs/index.ts` | функция `openApiDocsCatalog` | 440–465 |
| 17 | `ui/panels/editor-docs.ts` | константа `EDITOR_DOCS_OPEN_EVENT` и подписка `document.addEventListener(EDITOR_DOCS_OPEN_EVENT, open)` с комментарием над ней: событие отправлял только `openApiDocsCatalog`. Функция `open` остаётся | 10, 40–41 |
| 18 | `ui/mission-guide/lessons/pioneer/dsl.ts` | константа `change` | 122 |
| 19 | `ui/mission-guide/types.ts` | типы `GuideBlockStyle`, `GuideBlockKind`, `GuideBlock`, `GuideOrderRule`, `GuideTabId`, `GuideLessonStepId`, `GuidePortalPageId`, `GuidePracticeTrack`, `GuideTheorySpoiler`, `GuideTheorySection`, `GuidePracticeTask`, `GuideChapter`, `GuideLesson`, `GuideLessonState`, `GuideTextLessonState`, `RuntimeBanner`, `RenderMissionGuidePanel`; оба импорта в начале файла (`ScriptLanguage`, `PioneerLessonSpec`). Остаются: `GuideMethodLink`, `GuideApiFocusItem`, `GuideDiagnosticKind`, `GuideDiagnostic`, `GuideTextLesson`, `GuideEvaluation` | 1–2, 25–135, 168–176, 186–191 |
| 20 | `ui/panels/terminal-session.ts` | константа `TERMINAL_COMMANDS` | 6 |
| 21 | `ui/settings/autopilot-params-model/state.ts` | функции `listAutopilotGroups`, `clearAutopilotAuditLog` | 101–103, 270–275 |
| 22 | `ui/settings/autopilot-params-model.ts` | из реэкспорта убрать `clearAutopilotAuditLog`, `listAutopilotGroups` | 12, 18 |
| 23 | `world/traffic.ts` | `MODEL_LENGTH`: строку 18 заменить на `export const MODEL_WIDTH = 1.75;` | 18 |

### Неиспользуемые члены классов, локальные символы и импорты

| № | Файл | Что удалить | Строки |
|---|------|-------------|--------|
| 24 | `world/walkers.ts` | геттер `Gait.current`; метод `Mover.hold` с комментарием | 47, 115–118 |
| 25 | `python/pioneer-rknn-scene.ts` | локальная функция `isHiddenUp` (рабочая копия живёт в `pioneer-rknn-bridge.ts`, её не трогать) | 99–102 |
| 26 | `ui/api-docs/preview/index.ts` | поле `private viewMode` и присваивание `this.viewMode = mode;` в `applyViewMode` (поле нигде не читается). Тип `ApiPreviewViewMode` и импорт остаются | 39, 182 |
| 27 | `editor/index/shell.ts` | импорт `AppTheme` | 24 |
| 28 | `learning/teacher-panel.ts` | из импорта убрать `type Quest`: `import { questGroups } from './quests.js';` | 15 |

### Ветвление с одинаковыми ветками

| № | Файл | Что сделать |
|---|------|-------------|
| 29 | `editor/blockly-mode/workspace.ts` | В `compileMainEditorWorkspace` обе ветки тернарного оператора одинаковые. Тело заменить на `return compileGeneratorWorkspace(language, workspace);`. После этого удалить ставшие ненужными `LUA_RAW_CODE_BLOCK`, `PY_RAW_CODE_BLOCK`, `getRawCodeBlockType`, `getWorkspaceTopBlocks`, `hasOnlySingleRawCodeBlock` (строки 6–20) |

## Часть 2. Код, который живёт только ради своих тестов

Приложение ничего из этого не вызывает: от `public/main.ts`, `server.ts`, `tools/` и отладочных страниц до этих символов дойти нельзя. Ссылаются на них только тесты, которые проверяют сам этот код. Удалять код и его тесты вместе. В этой части пути даны от `simulator/`.

| № | Что это | Код | Тесты и прочее |
|---|---------|-----|----------------|
| 30 | Временный документ редактора. Включать его некому уже после части 1, поэтому `isTemporaryDocumentActive()` всегда возвращает `false` | Удалить файл `public/modules/editor/index/temporary-document.ts`. В `public/modules/editor/index/helpers.ts` убрать импорт (строка 3) и строку `if (isTemporaryDocumentActive()) return;` в `persistEditorIndexSession` (74) | Удалить файл `tests/editor-temporary-document.test.ts`. В `premium-ui.json` (строка 34) убрать из команды `unit` путь `tests/editor-temporary-document.test.ts` |
| 31 | `looksLikeBricksProject` | `public/modules/editor/blockly-mode/bricks/xml.ts`: функция с комментарием (42–45). `bricks/index.ts`: убрать имя из реэкспорта (17) | `tests/bricks-editor.test.ts`: импорт (24), строка `expect(looksLikeBricksProject(saved))…` (152), тест «обычный XML Blockly без Bricks не принимается за проект» целиком (161–164) |
| 32 | `COCO_CLASSES`, таблица 80 имён классов | `public/modules/python/pioneer-rknn-scene.ts`: константа с комментарием (19–30). `COCO` остаётся | `tests/pioneer-rknn-scene.test.ts`: имя в импорте (7), блок `describe('классы COCO')` целиком (50–61) |
| 33 | `snapPlanarPoint`, `snapAngleRadians` | `public/modules/scene/objects/placement-geometry.ts`: обе функции (58–68). `snapToGrid`, `softSnapPlanarPoint`, `ROTATION_SNAP_DEGREES` остаются | `tests/scene-placement.test.ts`: два имени в импорте (15–16), строки с `snapPlanarPoint` (48, 66), тест «rotation snaps to 15° steps…» целиком (69–74) |
| 34 | `leverAngle`, `LEVER_SWING`, `advanceProgress` | `public/modules/ui/settings/wizard/radio-model.ts`: константа с комментарием (14–15), функции с комментариями (71–76, 107–111). `AUTO_ADVANCE_MS` остаётся | `tests/wizard-radio-model.test.ts`: из импорта убрать `AUTO_ADVANCE_MS`, `LEVER_SWING`, `advanceProgress`, `leverAngle`; тесты «swings a lever…» (25–31) и «runs the pause…» (33–37) целиком |
| 35 | `decodeDataUrlToBuffer` | `server/mavlink-bridge.ts`: функция (329–344) | `tests/mavlink-bridge.test.ts`: имя в импорте (17), блок `describe('decodeDataUrlToBuffer')` целиком (175–189) |
| 36 | `solutionBlockTypes`, `editorBlockTypes` | `public/modules/ui/mission-guide/mini2/bricks-missions.ts`: константа с комментарием (430–431), имя `editorBlockTypes` в импорте (8). `mini2/bricks-xml-kit.ts`: функция `editorBlockTypes` с комментарием и `BRICKS_NATIVE` (74–85), оба импорта в начале файла (6–7) | `tests/bricks-missions.test.ts`: имя в импорте (7), комментарий и строка `expect(solutionBlockTypes(mission)).toEqual(real);` (71–72). Остальные проверки этого теста остаются |
| 37 | Старая модель профилей пульта (`DeviceProfile`). Приложение работает через `mapping/legacy.ts` | См. ниже | Удалить файл `tests/rc-settings.test.ts`. В `docs/project-map/Разработка/Тесты.md` (строка 28) убрать `rc-settings` из перечня |

### Пункт 37 по файлам (`public/modules/ui/settings/`)

- Удалить файл `mapping/profile.ts` и папку `mapping/profile/` целиком (`device.ts`, `runtime.ts`, `shared.ts`).
- `mapping.ts`: убрать строку `export * from './mapping/profile.js';`. Остаётся реэкспорт `./mapping/legacy.js`.
- `constants.ts`: удалить `RC_CHANNEL_COUNT`, `RC_VISIBLE_CHANNELS_DEFAULT`, `VIRTUAL_DEVICE_ID`, `BINDING_ACTIONS` (35–47) и всё от `getRoleLabel` до конца файла (58–169): `getRoleLabel`, `getDefaultChannelRoles`, `createDefaultChannelMappings`, `createDefaultBindings`, `createDefaultWizardSteps`, `createDefaultCalibration`, `createDefaultProfile`. В импорте типов оставить `ActionAuxChannelKey`, `AuxiliaryChannelKey`, `ChannelKey`, `PrimaryChannelKey`.
- `types.ts`: удалить импорт `GamepadInputRef` (1) и всё от `ChannelRole` до конца файла (24–129). Остаются `PrimaryChannelKey`, `AuxiliaryChannelKey`, `ActionAuxChannelKey`, `ChannelKey`, `StickMode`, `ObservedInputPosition`, `ObservedInputStats`.
- `input/calibration.ts`: удалить `sanitizeCalibration`, `normalizeCenteredInput`, `quantizeDiscreteLevel`, `toAxisUnit`, `normalizeInputValue` (99–201) и импорт типов (2). У `sampleCalibration` (203–225) убрать перегрузку с числом, которую никто не вызывает. Должно остаться:

```ts
export function sampleCalibration(calibration: CalibrationState, gp: Gamepad): void {
    const axisCount = Math.min(calibration.min.length, gp.axes.length);
    for (let i = 0; i < axisCount; i += 1) {
        const axisValue = gp.axes[i];
        if (!Number.isFinite(axisValue)) continue;
        calibration.min[i] = Math.min(calibration.min[i], axisValue);
        calibration.max[i] = Math.max(calibration.max[i], axisValue);
    }
}
```

## Что НЕ трогать

- Экспорты, через которые тесты проверяют живой код. В приложении они не вызываются, но без них пришлось бы переписывать проверки рабочей логики: `whenDroneModelReady`, `compilePioneerWorkspace` (реэкспорт в `editor/blockly-mode/index.ts`), `ALL_LUA_BLOCK_TYPES`, `getPioneerBlockTypes`, `GROUND_CHAINS`, `FUNNY_NAME_COUNT`, `resetFunnyNames`, `explainLuaError`, `luaDictionaryIds`, `explainPythonError`, `pythonDictionaryIds`, `ACADEMY_READY_NUMBERS`, `isAcademyPracticeReady`, `ROLES`.
- Неиспользуемые параметры функций и колбэков: их удаление меняет сигнатуры.
- Слово `export` у символов, которые используются только внутри своего файла.
- Отладочные страницы `*-preview.html`, `public/design-proposals/`, файлы в `tools/`, `scripts/`, CSS, ассеты.
- Зависимости в `package.json`: все используются.

## Проверка (всё из `simulator/`)

```bash
npx tsc --noEmit
npx tsc --noEmit --noUnusedLocals
npx tsc -p tsconfig.server.json --noEmit
npm run lint
npm test
npx vite build
```

Ожидаемый результат:

- `tsc --noEmit` и серверный `tsc` без ошибок;
- `tsc --noEmit --noUnusedLocals` выводит единственную строку про `tests/world-street-props.test.ts` (переменная `head`, была и до правок) и ничего из `public/` или `server/`;
- `lint` без ошибок, предупреждений не больше 513;
- `npm test` после части 1 — те же результаты, что на `abd1740` (143 файла); после части 2 файлов 141, упавших нет;
- `vite build` собирается.

Про `npm test`: под нагрузкой (параллельно со сборкой или линтером) нестабильно падают тесты, зависящие от времени: `city-plan`, `world-people`, `lessons-book-examples`, `geoscan-examples-blockly`, `academy-*`, `python-runtime-globals`. Это не связано с правками. Упавшие файлы перезапустить отдельно, без другой нагрузки: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand <файлы>`. На эталонных патчах все файлы проходят.

Если после удаления чего-то из списка компилятор сообщает об ошибке использования — остановиться и не удалять этот пункт, сообщить о расхождении.

Проверку выполнять после каждой части.

Коммитов два:

1. `Удаление мёртвого кода: неиспользуемые экспорты, типы и хвосты`
2. `Удаление кода, который держали только тесты: старые профили пульта, временный документ, мелкие хвосты`
