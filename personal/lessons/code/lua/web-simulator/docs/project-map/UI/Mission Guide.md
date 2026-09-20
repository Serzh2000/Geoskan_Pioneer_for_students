---
tags: [ui, скриптинг, контент]
---

# Mission Guide (`public/modules/ui/mission-guide/`)

Методический движок уроков: показывает теорию, задание, проверяет условия
выполнения скрипта ученика. По README — «контент уроков (`lessons/`,
`curriculum/`) пока живёт вперемешку с TS-кодом рендера, а не как отдельные
данные» — при рефакторинге стоит это разделить.

## Структура

- `curriculum.ts`, `curriculum/` — учебный план (последовательность уроков).
- `lessons.ts`, `lua-lessons.ts`, `python-lessons.ts`, `lessons/` (+
  `lessons/expanded/`, `lessons/flight/`, `lessons/led/`) — сам контент уроков,
  раздельно для Lua и Python, по темам: `flight` (полёт), `led` (LED-матрица),
  `expanded` (расширенные версии — foundations/mission по языкам).
- `evaluation/` — проверка условий выполнения задания (связано с
  [[Lua]] → `mission-guard.ts`).
- `interactions.ts`, `interactions/` (`actions.ts`, `navigation.ts`) —
  взаимодействие пользователя с гайдом (кнопки далее/назад, запуск проверки).
- `render.ts`, `render/` (`navigation.ts`, `results.ts`, `sections.ts`,
  `support.ts`, `theory.ts`) — отрисовка UI гайда по секциям.
- `state.ts`, `state/storage.ts` — состояние прогресса ученика + сохранение
  (вероятно `localStorage`).
- `modal.ts`, `panel.ts` — контейнеры UI (модалка/панель).
- `types.ts` — общие типы.
- `bricks_full.txt` — похоже на дамп/справочник Blockly-блоков для уроков.

## Связанное

[[Lua]] (`mission-guard.ts` — проверка условий) · [[Python]] · [[Editor]]
(Blockly-блоки, доступные в уроке) · [[UI обзор]]
