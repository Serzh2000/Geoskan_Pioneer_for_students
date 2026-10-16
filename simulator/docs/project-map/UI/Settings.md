---
tags: [ui]
---

# Settings (`public/modules/ui/settings/`)

Настройки симулятора:

- `autopilot-params-model.ts`/`.test.ts`, `autopilot-params-model/`,
  `autopilot-params-ui.ts`, `autopilot-params-ui/` — модель и UI параметров
  автопилота (тюнинг), связано с [[Autopilot]] → `params-runtime.ts`. См.
  `docs/autopilot-params-coverage-matrix.md` и
  `docs/autopilot-params-integration.md` в корне репо.
- `calibration.ts` — калибровка (геймпада/датчиков).
- `gamepad/`, `mapping.ts`, `mapping/` — настройка геймпада и маппинг кнопок,
  см. `public/fragments/panels/gamepad*.html`,
  `public/fragments/panels/gamepad/mapping-pane.html`.
- `input/` — обработка ввода.
- `rendering.ts`, `rendering/` — настройки рендера (качество графики).
- `wizard.ts`, `wizard/` — мастер первичной настройки (см.
  `public/fragments/modals/gamepad-wizard.html`).
- `constants.ts`, `dom.ts`, `runtime-state.ts`, `types.ts`, `index.ts` —
  инфраструктура модуля.

## Связанное

[[Autopilot]] · [[UI обзор]]
