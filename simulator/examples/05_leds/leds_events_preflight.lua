-- Готовность по подтверждению, а не по угадыванию
local ledNumber = 29
local leds = Ledbar.new(ledNumber)
local phase = "ожидание"                  -- текущий этап программы
local ready = false                       -- подготовка подтверждена?

local function fill(r, g, b)
  for i = 0, ledNumber - 1 do leds:set(i, r, g, b) end
end

fill(1, 0, 0)                             -- красный: ждём подтверждения
print("этап: " .. phase)
ap.push(Ev.MCE_PREFLIGHT)                 -- подготовка (arm): моторы запускаются, дрон стоит

function callback(event)
  if event == Ev.ENGINES_STARTED then     -- реагируем только на нужное событие
    ready = true
    phase = "готовность"
    fill(0, 1, 0)                         -- зелёный: подготовка принята
    print("этап: " .. phase)
  end
end

-- тайм-аут: ждём подтверждения не дольше 1.5 с
Timer.callLater(1.5, function()
  if not ready then
    fill(1, 1, 0)                         -- жёлтый: что-то пошло не так
    print("тайм-аут: подготовка не подтверждена")
  end
end)
