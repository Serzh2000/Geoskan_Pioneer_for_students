---
tags: [ui, скриптинг, контент]
---

# Mission Guide (`public/modules/ui/mission-guide/`)

Содержание миссий режима обучения и их проверка. Интерфейса здесь нет: бывший учебник-«книга»
вырезан, миссии показывает карточка режима обучения (`public/modules/learning/`).

## Структура

- `academy/catalog.ts` — 108 уроков Академии: главы, цели, терренные профили.
- `academy/practices/` — миссии для Lua и Python (шаги, подсказка, заготовка, решение, контрольный вопрос).
- `academy/evaluation/` — проверка полёта по каждой главе; `academy/scene.ts` — подготовка сцены.
- `evaluation/text/` — общий запуск проверки `runTextLessonCheck` и граферы.
- `lessons/pioneer/` — 16 блочных миссий (Blockly) и проверка `gradePioneerLesson`.
- `book/localize.ts` — подстановка `<lua>/<py>` в текстах миссий.

Связь с режимом обучения: [[quests]] строит из этих данных список миссий, `controller.ts` показывает их по шагам.
