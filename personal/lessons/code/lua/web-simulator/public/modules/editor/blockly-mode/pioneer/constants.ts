// Тип хат-блока «Начало программы» — единственная точка входа для компиляции
// (см. §4.2 плана): именно с него compilePioneerWorkspace собирает тело __main.
export const PIONEER_START_TYPE = 'pioneer_start';

// Появится в фазе 5 (события Lua); зафиксировано здесь заранее, чтобы
// compilePioneerWorkspace (фаза 2) уже умел отличать такие блоки от «сирот».
export const PIONEER_ON_EVENT_TYPE = 'pioneer_on_event';

// Число светодиодов по умолчанию для Ledbar.new() в сгенерированном Lua.
// Значение взято из уроков (LED-модуль), см. открытый вопрос №3 плана —
// выбор между 29 (модуль) и 4 (бортовые) остаётся за владельцем.
export const PIONEER_LED_COUNT = 29;
