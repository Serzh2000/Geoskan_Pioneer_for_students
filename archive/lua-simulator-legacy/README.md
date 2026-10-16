# Lua Drone Flight Simulator

Симулятор полета дрона "Пионер", реализованный на Lua. Позволяет тестировать пользовательские скрипты без использования реального оборудования.

## Структура проекта

- [main.lua](file:///c:/Users/Master/Documents/GitHub/Geoskan-Pioneer-for-students/personal/lesson1/tex/code/lua/simulator/main.lua) — Основной цикл симуляции и загрузчик скриптов.
- [physics.lua](file:///c:/Users/Master/Documents/GitHub/Geoskan-Pioneer-for-students/personal/lesson1/tex/code/lua/simulator/physics.lua) — Физическая модель (3D движение, силы, сопротивление).
- [api.lua](file:///c:/Users/Master/Documents/GitHub/Geoskan-Pioneer-for-students/personal/lesson1/tex/code/lua/simulator/api.lua) — Мост API (эмуляция `ap`, `Ev`, `Sensors`, `Timer`, `Ledbar`).
- [pid.lua](file:///c:/Users/Master/Documents/GitHub/Geoskan-Pioneer-for-students/personal/lesson1/tex/code/lua/simulator/pid.lua) — PID-регулятор для стабилизации высоты и управления.

## Как запустить

Для запуска симулятора передайте путь к вашему Lua-скрипту в качестве аргумента:

```bash
lua main.lua <путь_к_скрипту>
```

Пример:
```bash
lua main.lua ../examples/chapter_06/mission_takeoff_landing.lua
```

## Особенности
- **Физика**: Учитывает массу, гравитацию, тягу двигателей и аэродинамическое сопротивление.
- **Автопилот**: Встроенный PID-регулятор обеспечивает стабильный взлет, зависание и посадку.
- **События**: Поддержка системы обратных вызовов (`callback(event)`), аналогично реальному Pioneer.
- **Безопасность**: Мониторинг заряда батареи и автоматическая аварийная посадка при низком заряде.
- **Визуализация**: Текстовый вывод состояния (время, высота, тяга, батарея, статус) в реальном времени.
