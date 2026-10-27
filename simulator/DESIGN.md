---
version: alpha
name: Pioneer learning workspace
description: A flight training workbook beside a live drone simulator.
colors:
  primary: "#ff6b00"
  light-background: "#f7f7f5"
  light-surface: "#ffffff"
  light-text: "#162235"
  light-muted: "#647286"
  light-border: "#e0e5ea"
  light-accent: "#c95e09"
  dark-background: "#1d1d1d"
  dark-surface: "#242424"
  dark-text: "#f1f1f1"
  dark-muted: "#b5b5b5"
  dark-border: "#353535"
  dark-accent: "#ffad68"
  success: "#1f9d62"
  danger: "#d13b2e"
typography:
  sans:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
  mono:
    fontFamily: "JetBrains Mono, Fira Code, monospace"
rounded:
  control: "8px"
  panel: "12px"
  dialog: "16px"
spacing:
  control-gap: "8px"
  content-gap: "24px"
  rail-width: "264px"
  reading-width: "1184px"
  content-gutter: "28px"
  overlay-inset: "6px"
components:
  course-workspace:
    description: "Fixed header, independent course rail and one lesson scroller"
  course-tabs:
    description: "Manual keyboard activation and independent language drafts"
  lesson-stepper:
    description: "Five authored learning stages, visible gates and completed marks"
---

# Pioneer UI design context

## Overview

Product surface for Russian-speaking students learning drone programming. The job is
to understand one concept, change a small program, and observe the actual apparatus.
The user's request and docs/step-by-step-learning.md define the curriculum. There is
no Japan-market or Japanese-language scope. Desktop is primary; narrow windows must
retain all lessons, instructions and actions.

The visual reference is an instructor's flight workbook: an indexed training route
beside the current exercise. The signature is the course rail and five-stage lesson
strip. Use numbering only for the real ordered curriculum. Keep the simulator's
existing graphite, orange and pale neutral identity. Avoid dashboard statistics,
marketing heroes inside a lesson, nested card piles and duplicate navigation.

Token ownership is **runtime canonical (Model B)**. This file mirrors accepted
values; it does not generate CSS. Theme sources are public/styles/core/base.css and
public/styles/panels/panel-chrome.css. The shared composition kit for every side panel
and the textbook is public/styles/panels/panel-kit.css (`pk-section`, `pk-chip`,
`pk-seg`, `pk-row`, `pk-field`, `pk-toggle`, `pk-meter`, `pk-device`, `pk-disclosure`).
The textbook's whole recipe is one file, public/styles/panels/guide-panel.css; the
former 26-file layer stack (page/*, page-workbench, lesson-polish, course-shell,
flight-workbook, journal-academy, theme/dark-panels) is gone. The design mock and the
written contract live in docs/design/rail-redesign.html and docs/design/rail-redesign-tasks.md.
Behavior ownership is recorded in UX-CONTRACT.md.

## Colors

The base orange is reserved for the next meaningful action. Text accent and focus
use the theme-specific work accent. Surface, text, muted, border and soft tones
are consumed through --work-*; they change together with the global theme. Success
and error are accompanied by text, never communicated by color alone.

## Typography

Reuse --font-sans for Cyrillic reading and controls; use --font-mono for lesson
indices, counts and technical captions. Explanatory text uses 15 px
with 1.8 line height, practice text 13 px with 1.65 line height. The lesson title uses
25–32 px and 700 weight; its lead uses 17 px/1.75. Do not load a new font
for one feature. API names keep their real spelling; instructions and accessible
labels are Russian. Headings are sentence case, not promotional slogans.

## Layout

At desktop widths the header and context line remain fixed. The 264 px course rail
and lesson body each own their scroll; lesson copy itself has natural height.
The lesson is bounded once to 1184 px. The outer content wrapper has no additional
width cap or auto margins. Desktop body gutters are 28 px, 24 px below 1250 px and
16 px below 560 px. The desktop overlay inset is 6 px. Structural stage sections
have 24 px between them, including observation versus result/scene. The compact
header is 56 px plus an optional 28 px context line; the desktop route strip has
48 px checkpoints and 14 px vertical padding. Empty context takes no desktop space.
At 1250 px the rail becomes 240 px and practice
stacks instructions above the editor. Below 900 px, Oглавление switches between
the full course rail and the lesson, keeping the same lesson state. At 560 px the
five-stage strip wraps into two rows. No horizontal document overflow is acceptable.

The editor has a stable 400 px minimum frame during loading and after mounting,
reduced to 280 px for short windows. Reserve a
short draft-status line. Primary actions must remain reachable at short heights.
The application scrollbar baseline is global in base.css with visible thin thumbs,
engine fallbacks and a forced-colors escape path.

## Elevation & Depth

Use tonal differences and one-pixel borders inside the workbook. A flat lesson
heading precedes one stage surface; avoid wrapping every sentence in another card.
The course overlay preserves the established modal layer above the simulator.
Sticky stage navigation belongs to the lesson scroller, never the whole page.
The five checkpoints form a flight route: a real ordered index, one short stage
label and a small verb describing its purpose. Thin connectors encode sequence;
completion uses the existing real checkmark and success tone. At compact widths
the verb disappears while the checkpoint label remains visible.
API explanations are flat reference rows separated by rules. The expected task
is one surface with an accent edge. This keeps the reading hierarchy clear without
stacking rounded cards inside rounded cards. On wide lesson surfaces its task
sits in a 300 px side column; at smaller sizes it follows the explanation.

## Shapes

Controls use 8 px corners, stage panels 12 px and the outer dialog 16 px. Mobile
uses the viewport without rounded outer corners. Step indices use small circles
because they represent checkpoints; status captions do not need pills.

## Components

| Role | Runtime owner / mapping | Consumers |
| --- | --- | --- |
| Brand action | base.css --accent-color / --accent-color-strong | Primary lesson action |
| Surfaces and reading | base.css --panel-bg/--control-bg/--panel-bg-strong, panel-chrome.css --pc-* | Course rail and stages, every side panel |
| Focus / active topic | --accent-soft fill + --pc-accent text | Route stops, outline, segmented switches, rows |
| Body / indices | base.css --font-sans / --font-mono | Copy / counts / step numbers |
| Panel composition | panel-kit.css pk-section/pk-row/pk-field/pk-seg/pk-chip/pk-toggle/pk-meter/pk-device | All side panels and the textbook |
| Course geometry | guide-panel.css: 56 px header, 264 px outline, 720 px reading column, full-width practice | Textbook shell |
| Scrollbars | base.css --scrollbar-thumb/track/hover/active | All application scrollers |

Enabled buttons and summary controls have hover, focus and pressed states. Busy
is described in a live status; disabled controls remain legible and their reason is
nearby. Selected tabs have a bottom accent and aria-selected; current lesson has
an inset rail marker and aria-current. Native selects deliberately retain platform
popup behavior. No screen-local select implementation is introduced.

Tabs, outline, stage gates, draft recovery and modal focus are shared across lessons.
Motion is limited to existing short state transitions; reduced motion disables it.
No ambient animation is needed in a reading or coding exercise.

## Do's and Don'ts

- Keep one route to the current lesson and one ordered stage strip.
- Reserve space for row actions; revealing a hover action must not move another button under the pointer.
- Keep Python/Lua drafts separate; display course progress once, excluding extras.
- Keep code, explanations and error recovery readable in both themes.
- Do not put the full curriculum, a second lesson grid and a start banner above every exercise.
- Do not imply Blockly has 108 lessons or that completing Lua validates Python code.
- Do not use hardcoded blue as an alternative active-state system.

## Simulator tools · October 2026

Use the existing Inter/monospace typography, graphite and orange control language.
The desktop tool disclosure has one fixed slot above the rail icons. Its position
and hit target never depend on scene width; hover does not reveal panels. An open
panel and a pinned rail both close through that disclosure. Narrow layouts keep
their existing always-visible tool navigation.

The editor owns a VS Code style bottom console (260px initially, bounded to 65% of
available content height while docked, with a full-height maximize action). The reference and notification drawers share a side
slot within the code area; neither covers terminal output. Utility buttons share
pressed/expanded state, localized action labels and focus restoration. Escape
closes one visible utility at a time. The simulator console accepts commands;
the Output tab retains the flight journal and the Problems tab shows actual warnings/errors.

Telemetry is one flight readout with altitude as the dominant value, speed and
flight time as peers, and a battery meter. Hardware indicators form two separate
sections. Their dark physical board and unlit pixels stay dark in both themes;
inline emitted RGB values remain owned by the simulator. Values never become
live announcements at the 50ms update cadence. Styling belongs to telemetry.css.

The scene manager prioritizes its searchable object tree and selection properties.
Terrain templates and JSON transfer use native disclosures, with the selected
terrain visible in the closed summary. Selection never creates a terrain; the
separate Add action does. Object actions and protected-object behavior retain the
existing owners. Styling belongs to the existing workbench/polish recipes.
Telemetry starts at 320px and the scene manager at 420px; each remembers its own
resized width independently of editor autofit.

## Sidebar component ownership · October 2026

All side panels share one header recipe in `layout/panel-shell.css`: 52 px height,
sentence-case 15 px/650 title and a 36 px close control. Optional subtitle layout is
a content variant; editor toolbar geometry stays with the editor owner. Common
body padding and section spacing are `base.css --panel-content-pad/gap` at 16 px.
Narrow layouts use the existing responsive header-height token.

`panels/panel-chrome.css` owns the shared `--pc-*` surface and text tones, keyboard
focus and reduced motion. It contains no second header recipe. Light muted text
is #566274; light accent/success/warning/danger are #a84a00/#17744a/#8d4b07/#b3261e.
Dark counterparts are #a8a8a8 and #ffad68/#6fd69c/#f6c260/#ff9a90. The raw orange
brand token owns solid actions; semantic text tokens keep small labels readable.

`core/forms.css` owns global fields and `.btn-primary/.btn-secondary`: 36 px
minimum controls, 8 px corners, visible hover/focus/pressed/disabled states and
no translated hover motion. Native selects retain native popup behavior. Feature
recipes set only their required geometry and business-specific states. Global
scrollbars stay owned by `base.css`; side panels never hide thumbs until hover.

Journal typography, filters and event rows live in `panels/logs.css`. Telemetry owns
physical LED surfaces in `panels/telemetry.css` and consumes the same panel tokens.
Historical dark workspace/header/telemetry overrides are removed after token migration.

## Panel kit · October 2026

Every rail panel (Телеметрия, Рой, Менеджер сцены, Пульт, Настройки) and the textbook
are composed from `panels/panel-kit.css`. The header is 52 px with a title, one status
chip slot (`pk-chip`, tone by fill) and the 36 px close control; the body is flat
`pk-section` blocks separated by one rule, never cards inside cards. The only card is
`pk-device` for physical surfaces (LED boards, scene previews, code). Lists use 44 px
`pk-row` with selection by `--accent-soft` fill and in-row actions that keep their
slot; fields use `pk-field` with the label above a 36 px control; mode switches are
`pk-seg`, on/off settings are `pk-toggle` + `pk-switch`. State is always a fill: no
underlines, edge stripes, gradients, glows or `!important`. Default panel widths are
360 px, telemetry 320, scene manager 420. The code editor always fills the workspace;
controller setup uses a full-window dialog matching the textbook. Other tool panels
keep the scene visible beside them. The rail separates workspace
panels from utility buttons with a rule and labels every button through one
`data-tooltip` mechanism; the theme button is an action, never an active tab.

## Рабочие контролы · 14 октября 2026

Переключатели камеры используют `pk-seg` и общие `--pc-*`/`--pk-*` токены,
доступные также внутри `.scene-container`. Выбор обозначается сплошной оранжевой заливкой
и тёмным текстом; клавиатурный фокус имеет отдельный контур.
Кнопки камеры сохраняют 36 px высоты, при грубом указателе — 44 px.
Контролы редактора имеют 40 px в узком окне и 44 px при грубом указателе.
Компас сохраняет размер видимых дисков, области нажатия расширены до 24 px.
В учебной сцене группы режимов переносятся целиком вместо скрытия горизонтальным скроллом.

У списка примеров есть постоянный слот подписи 24 px: загрузка и недоступность
показаны текстом рядом с полем. Пустой слот сохраняет геометрию при успешной загрузке.


## Навигация и справочник · 14 октября 2026

Редактор всегда занимает всю рабочую область, без режима половины экрана и ресайзера.
Запуск, стоп и сброс — три иконки в фиксированном блоке справа снизу, доступном
в сцене и редакторе. Названия доступны через подсказки и aria-label; Ctrl/Cmd+Enter сохранён.
«Пульт» использует окно с геометрией учебника: отступ 16 px, ширина до 1480 px,
вся доступная высота и прокрутка содержимого. Настройки каналов сохранены.

Справочник доступен из редактора; его кнопка убрана из рельса. Панель шириной 560 px
показывает поиск, категории, число результатов и раскрываемые методы. Синтаксис и
пример — отдельные поверхности кода; аргументы и результат — подписанные строки.
На узком экране категории собраны в select, чтобы не занимать высоту чтения.
Полёт, Рой, Сцена и Настройки разделены видимыми заголовками 14/700, линиями
border-strong и увеличенными промежутками. «Объекты» и «Окружение» стоят рядом с «Орбитой» и «Полётом»
в нижнем ряду и используют такой же pk-seg; на узком экране группы размещены выше блока запуска. Рельса 72 px: все
подписи центрированы в области 64 px и помещаются целиком.

Панель расстановки объектов располагается выше блока запуска; запуск, стоп и
сброс остаются доступными в этом режиме. На коротком экране каталог прокручивается
внутри своей панели. Открытие справочника переводит фокус в поиск.

## Консоль редактора · 14 октября 2026

Нижняя панель следует композиции VS Code: заголовок 38 px, вкладки «Терминал»,
«Вывод», «Проблемы» слева, сеанс и иконки действий справа. Здесь выбранная вкладка
использует тонкую нижнюю линию акцента, как у заданного пользователем образца.
Шрифт консоли — общий моноширинный, 13 px / 1.65. Ввод следует сразу после вывода,
а не закреплён у нижнего края. Несколько сеансов показаны списком справа; на узком
экране доступен select. Оранжевый акцент, поверхности и ошибки берутся из текущих
токенов. Граница панели изменяет высоту, стрелка раскрывает её на всю область кода.

Настройки используют плотную компоновку: 12 px между группами, 16 px после
разделителя, 10 px внутри группы и заголовок 24 px. Цвет и толщина трассера
размещены рядом, если внутренняя ширина панели не меньше 300 px. Размеры
интерактивных контролов сохранены. Выбор камеры имеет сплошную акцентную заливку,
контрастный тёмный текст и переход 160 мс; уменьшение движения отключает переход.

## Book view · October 2026

Every lesson list of the textbook is also laid out as a book: the numbered course (Lua 72, Python 108), the ten
extra practice tasks of each text track (the last chapter «Доп»), and the ten Blockly assignments (their workspace
sits on the code sheet). Every topic has the same three parts, which the student may open in any order:

1. **Теория** — the fragment the lesson is built for, explained, with an example read piece by piece.
2. **Демонстрация** — the same example runs in the simulator while the student watches.
3. **Практика** — the lesson's task, the code sheet (or the Blockly workspace) and the check. A passed check
   ends the lesson (a stamp and the way to the next one); there are no gates between the parts.

The examples are authored per lesson in `book/examples/` (one file per chapter, `topics.ts` for the extra
tasks and Blockly) and are run by `tests/mission-guide-examples.test.ts` in the same harness as the lessons, so none
of them can fail to run or give away the task. The plain page keeps the five-stage walkthrough and is reachable with
«Показать обычный вид урока»; the choice is remembered in `pioneer:mission-guide:book:v1`, the part a lesson was left on
in `pioneer:mission-guide:book-step:v1`. Owners: `modules/ui/mission-guide/book/` and `panels/book.css`.

The page is paper in both themes (cream, ink, a large serif); the desk and the bar above it follow the application
theme. Inside the sheet the application's tokens are set back to their light values, so the shared components (buttons,
verdicts, diagnostics, fields) draw themselves light on the paper without overrides. Orange stays the next action: the
primary button of the spread. Navigation is bookmarks: numbered lesson tabs and the language (a segmented control) in the
bar, the three parts as folder tabs on the top edge of the sheet (the open one is the sheet's own paper), chapter tabs on
the outer edge (the open chapter spells its title vertically); each row is named in the margin. Tab state is fill, never an
underline. Labels are sentence case; the only capitals are the running head of a printed page, which says the lesson and
the part. The practice page is built from three parts: the lead (what to achieve), the recipe (what to build, a numbered
sequence whose bold values are the numbers to type), and the bench (the editor or the Blockly workspace with its own
action strip and status line); hints, the ready solution and references are quiet rows under it. The result page holds
the scene and the verdict, which already carries the goal, so the goal is never printed twice. Below 1060 px the two
pages stack.

Sanctioned exception to "no new font": the reading text is a serif (Source Serif 4, OFL) and the margin labels a
handwriting (Caveat, OFL), both bundled in `assets/fonts/book/` and scoped to `.book`. Controls, verdicts,
diagnostics, flight record and the editor keep Inter/mono.

The book is a physical object, and that is the one place its shading differs from the flat panels: the open spread
rests on stacked page edges (box-shadow layers, thicker on the side with more pages, from the share of the volume
already read) and its gutter is shaded with a narrow gradient. Pages that can be turned carry a lifted corner
(`.book-curl`, bottom outer corners) that rises under the pointer and turns the page. Turning plays a 760 ms leaf over
the spine (`book/turn.ts`): copies of the replaced pages are swung in 3D above the new spread; it plays only between
spreads of one volume in the two-column layout and never under `prefers-reduced-motion`.
