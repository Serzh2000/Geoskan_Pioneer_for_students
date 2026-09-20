---
tags: [модуль, клиент, ui]
---

# Editor (`public/modules/editor/`)

58 файлов — второй по размеру раздел после [[UI обзор]]. Два режима
редактирования кода:

- `text-editor.ts`, `monaco/` (+ `monaco/completion/`) — текстовый редактор на
  **Monaco** с автодополнением Lua/Python API.
- `blockly.ts`, `blockly-ui.ts`, `blockly/`, `blockly-mode/` (+
  `blockly-mode/pioneer/`) — визуальный редактор на **Blockly**, блоки под
  Pioneer API (генерация Lua/Python кода из блоков).
- `runtime.ts` — связывает выбранный код (текст или блоки) с запуском в
  [[Lua]] / [[Python]].
- `dom.ts`, `autofit.ts`, `index.ts` — обвязка DOM/вёрстки редактора.

См. также `docs/blockly-audit.md` и `docs/blockly-unification-plan.md` в корне
репозитория — план унификации Blockly-блоков.

## Связанное

[[Lua]] · [[Python]] · [[UI обзор]] · [[App]] (уведомления об ошибках
выполнения)
