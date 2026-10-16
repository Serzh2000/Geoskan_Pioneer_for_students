---
tags: [модуль, клиент]
---

# Autopilot (`public/modules/autopilot/`)

7 файлов — конечный автомат (FSM) полёта:

- `fsm.ts`, `fsm-runtime.ts`, `fsm-internals.ts`, `fsm-status.ts` — сам автомат
  состояний полёта и его исполнение/статус.
- `mce-events.ts` — события MCE (mission control events?).
- `params-runtime.ts`, `params-effects.ts` — обработка параметров автопилота
  (тюнинг PID и т.п. — см. `docs/autopilot-params-integration.md` и
  `docs/autopilot-params-coverage-matrix.md` в корне репо, а также
  [[Settings]] → `autopilot-params-model`/`autopilot-params-ui`).

## Поток данных

Команды из [[Lua]] (`lua/autopilot.ts`) или [[Python]] дергают FSM → FSM
двигает состояние полёта и передаёт целевые величины в [[Physics]].

## Связанное

[[Lua]] · [[Python]] · [[Physics]] · [[Settings]]
