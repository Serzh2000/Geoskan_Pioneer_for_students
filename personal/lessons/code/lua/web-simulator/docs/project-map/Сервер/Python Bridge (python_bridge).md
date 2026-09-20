---
tags: [сервер]
---

# `python_bridge/`

Вспомогательные Python-скрипты, которые [[Python Runtime]]
(`server/python-runtime.ts`) инжектирует в запускаемый процесс, чтобы
подменить `pioneer_sdk.Pioneer`/`Camera` параметрами из браузера.

- `pioneer_browser_bridge_bootstrap.py`
- `pioneer_browser_bridge_runtime.py`

Не путать с [[External Python Bridge]] (`server/external-python-bridge.ts`) —
это для Python, запущенного сервером; внешний мост — для Python, запущенного
пользователем отдельно.

## Связанное

[[Python Runtime]] · [[External Python Bridge]] · [[Python]]
