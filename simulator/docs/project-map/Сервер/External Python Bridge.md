---
tags: [сервер]
---

# External Python Bridge (`server/external-python-bridge.ts`)

Событийный мост для внешнего Python, запущенного пользователем отдельно (не
из браузера) — например, реальный `pioneer_sdk` на своей машине, который
подключается к симулятору как к источнику телеметрии/камеры.

Клиентская сторона: [[Python]] → `external-bridge.ts`,
`external-bridge-runtime.ts`, `external-bridge-binding.ts`. Тесты:
`tests/external-python-bridge.test.ts`,
`tests/external-bridge-frozen-clock.test.ts`.

## Связанное

[[Python]] · [[Python Bridge (python_bridge)]] · [[Сервер обзор]]
