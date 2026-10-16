# Урок 1 — структура и запуск

## Структура каталогов
- docs/api — локальная копия документации API Pioneer (index.html, assets)
- examples — примеры Lua (сенсоры, точки, светодиоды, RC-тумблер)
- lua/missions — базовые и продвинутые миссии Lua
- lua/algorithms — учебные алгоритмические задачи на Lua
- lua/solutions_tasks — решения учебных задач (разные задания)
- tex — исходники LaTeX (lua.tex, leds.tex, missions_part1.tex, missions_part2.tex, main.tex)
- tex/build — артефакты сборки LaTeX (pdf, лог, кэш minted)

## Сборка LaTeX
- Откройте каталог tex
- Соберите документ:

```bash
xelatex -shell-escape -interaction=nonstopmode main.tex
```

- Готовый PDF: tex/build/main.pdf

## Запуск Lua миссий
- Папка: lua/missions
- Все миссии запускают движение только после безопасной стабилизации: после события TAKEOFF_COMPLETE добавлена неблокирующая задержка 2 секунды через Timer.callLater
- Базовые миссии: base_01_circle.lua, base_02_polygon.lua, ...
- Продвинутые миссии: adv_07_accuracy_check.lua, adv_08_perimeter.lua, ...

## Примеры и утилиты
- Примеры сенсоров и команд полёта: examples/*.lua
- Примеры работы с RC: examples/example_rc8channel_test.lua
- Пример управления светодиодами: examples/example_led.lua, example_leds_4.lua

## Документация API
- Локально: docs/api/index.html
- Ключевые методы:
  - ap.goToLocalPoint(x, y, z)
  - ap.updateYaw(angle) — угол в радианах
  - Timer.new(period, fn), Timer.callLater(delay, fn)
  - Sensors.rc(), Sensors.lpsYaw()

## Примечания
- Файлы кэша и логов LaTeX перенесены в tex/build
- Для единообразия имена Lua-примеров унифицированы (example_*)
