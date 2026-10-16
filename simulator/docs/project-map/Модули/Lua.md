---
tags: [модуль, клиент, скриптинг]
---

# Lua (`public/modules/lua/`)

19 файлов (14 в корне + `diagnostics/`, `hardware/`). Раннер Lua-скриптов на
**Fengari** (Lua, скомпилированный в WASM/JS).

- `runner.ts`, `runtime.ts`, `setup-script.ts` — запуск скрипта ученика.
- `bridge.ts` — мост между Lua-окружением и JS/`simState`.
- `autopilot.ts` — Lua API для команд автопилоту (`ap.*`), см. [[Autopilot]].
- `sensors.ts` — Lua API `Sensors.*`.
- `timers.ts` — Lua API `Timer.*` (периодические таймеры).
- `leds.ts`, `hardware/` — API для LED-матрицы/железа (см. [[Panels]] →
  `led-matrix.ts`).
- `api-constants.ts` — константы Lua API.
- `mission-guard.ts` — проверка скрипта на соответствие условиям задания
  (используется [[Mission Guide]] для оценки урока).
- `diagnostics/` — диагностика падений скрипта (для [[App]] →
  `script-execution-notice*`).
- `utils.ts`, `index.ts` — точка входа модуля и утилиты.

## Связанное

[[Editor]] (пишет скрипт) · [[Autopilot]] · [[App]] (уведомления об ошибках)
· [[Mission Guide]] (проверка условий урока) · [[Python]] (параллельная
реализация того же API для Python)
