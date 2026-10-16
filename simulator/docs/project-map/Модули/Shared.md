---
tags: [модуль, клиент, утилиты]
---

# Shared (`public/modules/shared/`)

5 файлов (3 в корне + `logging/`). Общие утилиты без привязки к конкретной
фиче:

- `math.ts` — математические хелперы.
- `gate-geometry.ts` — геометрия ворот/препятствий (используется в
  [[Physics]] и [[Environment]]).
- `object-types.ts` — общие типы объектов сцены.
- `logging/` — логирование (см. `tests/logger.test.ts`).

## Связанное

[[Physics]] · [[Environment]] · [[Core]]
