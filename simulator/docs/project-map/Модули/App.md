---
tags: [модуль, клиент]
---

# App (`public/modules/app/`)

15 файлов (7 в корне + `script-execution-notice/`). Верхнеуровневая склейка
приложения:

- `animation-loop.ts` — главный цикл рендера/физики (`requestAnimationFrame`).
- `script-execution-notice.ts` (+ `-templates.ts`, `script-execution-notice/`)
  — уведомления пользователю о выполнении/ошибках скрипта (Lua/Python).
- `global-error.ts` — глобальный обработчик ошибок.
- `language-selector.ts` — переключатель языка Lua/Python.
- `theme-toggle.ts` — тёмная/светлая тема.
- `simulation-controls.ts` — старт/стоп/сброс симуляции.

## Связанное

[[Lua]] · [[Python]] (источники ошибок для уведомлений) · [[Physics]]
(шаг физики внутри animation-loop) · [[UI обзор]]
