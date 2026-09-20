---
tags: [модуль, клиент, 3d]
---

# Environment (`public/modules/environment/`)

47 файлов. Окружение сцены: земля, освещение, препятствия, учебная разметка.

- `ground.ts` — земля/пол арены.
- `lights.ts` — освещение сцены.
- `obstacles.ts` (+ `obstacles/buildings.ts`, `obstacles/buildings/modules.ts`,
  `obstacles/training-props.ts`) — препятствия и учебный реквизит (здания,
  ворота, тренировочные объекты для миссий).
- `truss-arena.ts` — ферменная арена (гоночная трасса?).
- `ground/`, `index.ts` — доп. модули земли и точка входа.

## Связанное

[[Scene]] (окружение — объекты сцены) · [[Mission Guide]] (сценарии миссий
могут требовать конкретных препятствий) · [[Shared]] (`gate-geometry.ts`)
