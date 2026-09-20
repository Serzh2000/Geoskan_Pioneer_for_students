---
tags: [ui]
---

# Panels (`public/modules/ui/panels/`)

Боковые панели рабочего пространства:

- `channel-monitor.ts` — монитор каналов (RC/MAVLink?), см.
  `public/fragments/panels/channel-monitor.html`.
- `led-matrix.ts` — визуализация LED-матрицы дрона (связана с [[Lua]] →
  `leds.ts`/`hardware/`).
- `rail-visibility.ts` — видимость боковых рельс/панелей (сворачивание UI).
- `sidebar.ts`, `sidebar-debug.ts` — сама боковая панель + debug-режим.
- `simulation-notice.ts` — уведомления о состоянии симуляции.
- `stats.ts` — статистика/производительность.

## Связанное

[[UI обзор]] · [[Lua]] · [[App]]
