# Pioneer learning UX contract

Scope: textbook and its three programming tracks. This contract records the UI
consequences of the user-approved curriculum; it does not redefine the autopilot.

## Sources

| Concern | Evidence / authority |
| --- | --- |
| Curriculum and learning gates | User request for ≥100 progressive lessons; docs/step-by-step-learning.md; academy/catalog.ts |
| Runtime completion | core/learning-journal.ts; mission-guide/walkthrough/state.ts; academy/evaluation/ |
| Scene lifecycle | academy/scene.ts: preserve originals by identity, restore on close |
| Permissions, billing, legal, external transmission | Not part of this local educational workflow |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native HTML select in lesson and terrain renderers | DESIGN.md; platform popup accepted | native | Browser popup and keyboard |
| Form | Lesson renderers and academy bindings | Authored prediction, seed and runtime gates | inline fields; no form submission | Invalid seed recovery and prediction tests |
| Scrollbar | public/styles/core/base.css | Runtime CSS tokens, mirrored in DESIGN.md | normal; stable geometry in course rail/body | Computed styles and narrow browser |
| Toast | mission-guide render/support.ts and inline role=status | Runtime result, not optimistic acknowledgement | inline success/warning/error | Runtime and browser result states |

## Navigation and track contracts

- Course progress counts the union of completed academy lessons across Python/Lua,
  once out of 108. Ten additional exercises do not change this denominator.
- The left outline is the single course navigation owner; its active module starts
  expanded. Other modules may also expand. Locked lessons remain legible with the
  preceding lesson in their accessible title. Lesson navigation revalidates gates.
- Python/Lua switching keeps the same topic when it exists and is unlocked. Each
  language keeps its own code, answers, stage and runtime result. Lua cannot execute
  camera lessons 73–108; switching there returns to the last Lua lesson with an explanation.
- Blockly is a distinct ten-exercise track, retaining its own lesson and stage.
  Like the text tracks, it opens the exercise directly and uses the single outline.
- Tabs use manual activation: Left/Right/Home/End move focus; Enter/Space select.
  Only one tab is selected and its panel association is explicit.
- The next lesson requires explicit completion after successful observation and
  reflection. Finishing is separate from a merely correct prediction or printed message.
- On the practice step of Lua/Python lessons the live scene sits beside the task and
  code; it is mounted there before the first run and continues into the observation step.
- A lesson has five steps: Идея (the idea, what is needed and today's task on one
  screen), Прогноз, Практика, Результат, Разбор. Each fact is shown once; reading steps
  keep one 720px column, working steps (Практика, Результат) use the full width.
  Saved progress uses its own storage key (`pioneer-guide-walkthrough-v2`).
- One bottom bar moves the learner through steps: «Назад» is the previous step, and on the
  first step it is «Предыдущий урок» (absent in the first lesson, never a dead disabled
  button). There is no second lesson footer. The review step carries its own panel: finish
  the lesson, then «Дальше: <название урока>», previous lesson and back to the result.
  Finishing moves focus to that next-lesson button, and the outline scrolls the current
  lesson into view.
- Prediction choices are shown in a stable per-lesson shuffled order; the position of the
  right answer carries no pattern.
- Main scroll returns to the top on a lesson/stage change. Rechecking within the same
  stage preserves scroll. The course rail retains expansion and scroll while learning.

## Drafts and checks

- Drafts are scoped by language and lesson in the page session. They survive in-app
  transitions and modal close; page reload is not advertised as durable draft storage.
- Returning the starter offers an undo action restoring the replaced code.
- A runtime result belongs to the exact source version. New code requires a new run.
- While checking, track/lesson navigation and duplicate-run controls are disabled;
  the status explains why. Stopping returns to practice with the draft intact.
- Closing during a check first asks inline whether to stop it; only a confirmed close cancels
  its result and stops execution. No delayed success
  may mark a different lesson complete. Busy state never uses a fake percentage.
- Errors and further required trials remain inline with an action back to code.
- A finished text-lesson run shows a flight record (commands, autopilot state, light,
  altitude, messages on one time axis) built only from what the simulator reported while
  the check waited, with the same events as an ordered text list. Lua lists commands;
  Python has no command lane because its bridge does not report calls.
- Seed validation names the accepted range, marks the field invalid and focuses it;
  preparing a scene announces actual success or retry after load failure.

## Flow ledger

| Operation | Pending | Success destination / feedback | Failure / recovery |
| --- | --- | --- | --- |
| Select topic | Gate checked | Current lesson, saved draft | Locked topic unavailable with prerequisite |
| Select language | Save departing draft | Same supported topic or last target topic | Python-only topic explanation |
| Run check | One busy state, scene observation, navigation disabled | Observation with real diagnostics | Correct code and retry; stop returns to practice |
| Complete lesson | Exact-code result and reflection verified | Lesson remains; next action unlocked | Return to practice and run again |
| Restore starter | Previous code captured | Practice; undo available | Original draft remains recoverable |
| Close textbook | While a check runs, an inline question asks «Остановить и закрыть» or «Продолжить проверку» (Escape = continue; focus moves to «Продолжить проверку»); once confirmed or when idle, cancel outstanding check, restore moved DOM and owned scene | Simulator; focus returns to opener; the last verdict stays on «Результат» when the lesson is reopened | No user scene serialization or deletion |

## Focus, layers and responsive ownership

The modal uses ui/modal-focus.ts: focus enters its close control, background siblings
are inert, Tab/Shift+Tab remain inside, Escape closes, and original inert/focus state
is restored. Monaco consumes Escape for its own transient UI before the modal.
The API reference closes the textbook before opening its existing non-modal drawer.
On narrow windows Escape closes the course outline before closing the textbook.
Selecting a lesson from the outline returns to its content. Code-editor scrolling
is the only nested scroller inside a stage; long instructions belong to the body.

The compact outline is controlled by mission-guide/support/outline-navigation.ts.
Below 900px only the visible outline or lesson is exposed to keyboard navigation
and accessibility APIs; resizing restores both desktop surfaces. Opening the outline
focuses the current available lesson. Selecting a topic closes the outline before
rerendering and places focus in the newly visible lesson; Escape returns to its toggle.
The five checkpoints have explicit current/completed states and accessible gate
reasons. A visible message beside stage actions explains whether a correct forecast,
an actual run or a successful result is needed. Code edits invalidate that result
and its reflection gate. Prediction and completion rerenders preserve the user's
control focus; changes of lesson or stage focus the labelled lesson region.

The moved scene keeps the same input ownership as the main simulator. Camera and
print overlays pass input through their empty areas; axis buttons and camera windows
handle their own input without forwarding it to orbit controls. Only one captured
pointer owns a camera drag. Release outside the viewport, cancellation, lost capture,
window blur, hidden document, camera-mode changes and moving the scene end the gesture.
A pointer move with the original button released cannot rotate or pan the camera.
Manual orbit dragging cancels an unfinished axis-view animation.

The textbook borrows a temporary editor document while open. Main code, language,
mode and persisted draft collections remain the user's workspace; closing restores
them together. Lesson drafts remain scoped by language and lesson, including empty
drafts. A check that awaits setup cannot resume into a closed or reopened session.

The visible modal sets an honest localized document title and restores it on close.
No URL routing, server CRUD, authentication, or offline queue is added. Errors from
the local interpreter preserve code. Storage fallback continues in memory.

## Landscape exploration

Generated worlds default to 600 × 600 m; the lesson route retains its 100 m / 180 m
exercise spacing. Functional districts and settlement-policy.ts own frequencies,
land use, catchments and physical footprint reservations. Seed reproduces geography, roads, buildings and vegetation;
the start and the central lesson corridor stay clear. Preparation adds one named
group and reports actual completion. The scene manager exposes editable buildings
and routes; static landscape details belong to the generated group.

Ground view frames all visible training presets in both wide and narrow viewports.
Explicit object focus switches to free orbit and keeps its target on the following
frame. Fog, shadows and projection depth precision scale for a full landscape view.
Scene row action slots keep their geometry when hovered. Revealing Delete cannot
replace Focus beneath a pointer that is already over the row.

## Verification ownership

tests/mission-guide-course-ui.test.ts covers topic continuity, progress denominator,
outline gates and the language distinction. Existing walkthrough tests cover stale
checks, exact-code completion and stage gates. Browser evidence covers all three
tracks, keyboard, failure/success, draft return, narrow layout and both themes.

## Workspace panel contracts · October 2026

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Navigation | panels/sidebar.ts and rail-visibility.ts | Actual active panel, pinned session/storage state | desktop disclosure; persistent narrow rail | Repeated toggle during close; keyboard; narrow viewport |
| Drawer | panels/editor-drawers.ts | Panel hidden state and shared disclosure helper | exclusive side slot; independent bottom terminal | Coexistence; Escape; focus restore; pointer and keyboard resize |
| Tree | scene-manager/render/list.ts | Object manager selection and hierarchy | filtered tree; protected base objects | No results/clear; selection to properties |
| Disclosure | Native details in manager/hierarchy.html | Native open attribute; hidden select stores preset selection | terrain library; file transfer | Closed content hidden; radio arrows; explicit add |

- Editor width is fixed to the workspace. Other panels persist width under
  their panel ID; opening telemetry must not inherit a full-width code editor.
- The disclosure remains reachable while a desktop panel opens/closes. Closing
  animation is already a collapsed state for toggling; a second click reveals the
  rail without reopening or choosing a panel.
- Utility close restores focus only if focus was inside that utility. Side drawers
  immediately leave layout and keyboard navigation when hidden. Escape respects
  previously handled editor events and closes one utility, then the terminal.
- Console height has pointer capture and cancels on release/cancel/lost capture,
  blur and hidden document. Up/Down adjust by 20px; Home/End reach current bounds.
  New log entries preserve scroll when the reader has moved away from the bottom.
- Terrain library selection changes only the pending template. The Add action
  appends a separate group using existing bindings; existing scene objects remain.
- Telemetry uses actual selected-drone values. Battery has meter semantics; dynamic
  values do not announce every frame. Failure states include status text and tone.

## Обратная связь редактора · 14 октября 2026

Список примеров отключён на время загрузки; статус рядом с ним описывает загрузку
или предлагает открыть локальный файл при недоступности API. Подпись связана с
полем через `aria-describedby`; статус доступен вежливым live region.
Состояние полёта в шапке объявляет только дискретные изменения, а не каждое
обновление телеметрии. Выбор камеры сохраняет существующие классы и `aria-pressed`;
его заливка не зависит от измерения ширины кнопки или положения сцены.


## Полноэкранные инструменты · 14 октября 2026

- Код открывается на всю рабочую область при любом сохранённом состоянии;
  свернуть его до половины или изменить ширину нельзя. Остальные боковые панели
  сохраняют собственную ширину.
- Run/Stop/Reset сохраняют единственные IDs и обработчики в общем блоке справа
  снизу. Состояния disabled и Ctrl/Cmd+Enter одинаковы в сцене и редакторе.
- Пульт — модальное окно на всю доступную страницу. Фон inert, Tab остаётся
  внутри, Escape закрывает окно и возвращает фокус на Пульт. Код и его черновик
  сохраняются. Мастер настройки открывается поверх пульта с отдельным фокусом.
- Справочник открывается из шапки кода. Поиск сохраняет курсор при перерисовке;
  раскрытие метода и выбор категории сохраняют клавиатурный фокус. Пустой
  результат предлагает вернуть весь каталог. Копирование и 3D-примеры сохранены.
- Мобильная сцена и редактор укладываются в доступную высоту; навигация
  прокручивается одним горизонтальным рядом, камеры не перекрывают запуск.

- Расстановка объектов сохраняет доступ к Run/Stop/Reset. Каталог не перекрывает
  этот блок, а при недостатке высоты прокручивается внутри.
- Открытие справочника переводит фокус в поиск, в том числе по ссылке из урока.
  Escape в нативном выборе категории сначала закрывает его список; следующий
  Escape из справочника возвращает фокус на кнопку в шапке редактора.

## Консоль симулятора · 14 октября 2026

- Нижняя панель содержит три вкладки: интерактивный терминал, вывод программы и
  событий полёта, реальные ошибки/предупреждения. Стрелки переключают вкладки.
- Команды help/run/stop/reset/status/clear используют существующие действия и
  состояние симулятора. Внешний shell не нужен. Неизвестная команда сообщает
  ошибку и предлагает help. Черновик редактора не меняется командами.
- Сеансы хранят свои команды, историю и вывод в течение текущего открытия страницы.
  Вывод программы направляется в сеанс, из которого она запущена, включая запуск
  из общей кнопки. Смена сеанса сохраняет незавершённый ввод. Завершение активного
  сеанса останавливает его запущенную программу; последний сеанс скрывает панель.
- Очистка терминала или вывода не удаляет общие логи. Прокрутка сохраняет место
  чтения; новые строки дописываются без замены уже показанных DOM-строк.
- Ctrl+` открывает/фокусирует терминал, Ctrl+Shift+` создаёт сеанс, Ctrl+J скрывает
  панель. ↑/↓ выбирают историю, Ctrl+L очищает сеанс. Ctrl+C останавливает программу
  при отсутствии выделенного текста; копирование выделения сохраняется.
- Развертывание временно скрывает область кода и сохраняет нормальную высоту.
  Разделитель работает мышью и клавиатурой. Escape из нативного select принадлежит
  его списку; закрытие панели возвращает фокус на кнопку в шапке редактора.
