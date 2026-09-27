# Официальные примеры Geoscan

Копии без изменений — эталон для `tests/geoscan-examples-blockly.test.ts`:
тест собирает каждый пример из блоков Blockly, генерирует Lua и Python и
сравнивает, что делает дрон, с оригиналом.

| Папка | Источник | Коммит |
|---|---|---|
| `lua/example_*.lua`, `lua/rc_script_start.lua`, `lua/take_photo_video.lua` | https://gitflic.ru/project/geoscan-llc/pioneer-lua-example | `6e7b6d4` (2025-05-23) |
| `lua/pioneer_led_blink.lua`, `python/*.py` | https://gitflic.ru/project/geoscan-llc/pioneer-sdk (`examples/`), совпадает с https://github.com/geoscan/pioneer_sdk | `7b9654b` (2026-09-02) |
