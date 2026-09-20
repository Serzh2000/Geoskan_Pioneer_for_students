---
tags: [модуль, клиент, скриптинг]
---

# Python (`public/modules/python/`)

16 файлов. Два независимых режима исполнения Python-скрипта ученика:

## 1. Браузерный JS-bridge (Pyodide, в вкладке)

- `pyodide-loader.ts` — загрузка Pyodide (Python в WASM).
- `browser-runtime.ts` — запуск скрипта прямо в браузере.
- `pioneer-js-bridge*.ts` — эмуляция `pioneer_sdk` поверх JS/`simState`
  (`pioneer-js-bridge.ts`, `-camera.ts`, `-camera-render.ts`,
  `-camera-shared.ts`, `-cv.ts`) — включая имитацию камеры и CV-примитивов.
- `pioneer-sdk-module.ts`, `pioneer-sdk-cv-prelude.ts` — подмена модуля
  `pioneer_sdk` внутри Pyodide-окружения.

## 2. Серверный / внешний Python

- `local-runtime.ts`, `runtime.ts`, `runtime-shared.ts` — обвязка над запуском
  **настоящего** Python-процесса через сервер, см. [[Python Runtime]].
- `external-bridge.ts`, `external-bridge-runtime.ts`,
  `external-bridge-binding.ts` — обвязка над [[External Python Bridge]]
  (пользователь запускает Python отдельно, вне браузера).

## Связанное

[[Editor]] · [[Autopilot]] · [[Lua]] (параллельная реализация того же API) ·
[[Python Runtime]] · [[External Python Bridge]] · [[Известные ограничения и риски]]
(сервер выполняет присланный код — риск безопасности)
