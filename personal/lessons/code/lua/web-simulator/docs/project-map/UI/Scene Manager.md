---
tags: [ui, 3d]
---

# Scene Manager (`public/modules/ui/scene-manager/`)

UI-панель для управления объектами 3D-сцены (иерархия объектов + инспектор —
судя по недавним коммитам «Rework the scene manager into a hierarchy and
inspector workspace», «Keep the scene in frame while zooming and panning»).

- `experience.ts`, `index.ts` — точка входа панели.
- `bindings.ts`, `bindings/` — связка UI ↔ данные сцены.
- `catalog.ts` — каталог доступных типов объектов (для добавления на сцену).
- `render.ts`, `render/` — отрисовка панели.
- `support.ts`, `support/` — вспомогательная логика.
- `type-preview.ts`, `type-preview/` — превью типа объекта перед добавлением.
- `view-state.ts` — состояние вида (зум/пан/выбор).
- `dom.ts`, `types.ts`.

См. `tests/scene-manager-catalog.test.ts`.

## Связанное

[[Scene]] · [[Environment]] · [[UI обзор]]
