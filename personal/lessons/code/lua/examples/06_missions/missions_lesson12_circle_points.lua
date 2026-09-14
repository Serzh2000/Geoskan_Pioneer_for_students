local ledNumber = 29                        -- количество видимых диодов на плате
local leds = Ledbar.new(ledNumber)         -- объект управления светодиодами
local unpack = table.unpack                -- сокращение для распаковки таблиц
local curr_state = "PREPARE_FLIGHT"        -- начальное состояние автомата

local function changeColor(color)          -- функция смены цвета всех диодов
  for i=0, ledNumber - 1 do                -- проход по индексам 0..(ledNumber-1)
    leds:set(i, unpack(color))             -- установка RGB для индекса i
  end
end

local colors = {                           -- палитра используемых цветов
  {1,0,0}, {1,1,1}, {0,1,0}, {1,1,0},
  {1,0,1}, {0,0,1}, {0,0,0}
}

local r = 0.5                              -- радиус окружности
local angle = 30                           -- угловой шаг (градусы)
local points = {}                          -- массив точек окружности
for i=1, 12 do                             -- генерация 12 равномерных точек
  local a = i * angle
  local xCoord = r * math.cos(a * math.pi / 180) -- X координата
  local yCoord = r * math.sin(a * math.pi / 180) -- Y координата
  local yaw = (a + 90) * math.pi / 180           -- курс (тангенциальный)
  points[i] = {xCoord, yCoord, 0.8, yaw}         -- точка с высотой и курсом
end

local j = 1                                -- индекс текущей точки
action = {                                 -- таблица функций по состояниям
  ["PREPARE_FLIGHT"] = function()          -- подготовка полёта
    changeColor(colors[2])                 -- белый — подготовка
    Timer.callLater(2, function () ap.push(Ev.MCE_PREFLIGHT) end) -- предстарт
    Timer.callLater(4, function () changeColor(colors[3]) end)    -- зелёный — готовность
    Timer.callLater(6, function ()        -- через 6 секунд
      ap.push(Ev.MCE_TAKEOFF)             -- взлёт
      curr_state = "FLIGHT"               -- переход к полёту
    end)
  end,
  ["FLIGHT"] = function ()                 -- состояние полёта
    if j <= #points then                   -- если есть следующая точка
      local x, y, z, yaw = table.unpack(points[j])
      ap.updateYaw(yaw)                    -- сначала поворачиваемся
      ap.goToLocalPoint(x, y, z)           -- затем летим
      j = j + 1                            -- увеличить индекс
      curr_state = "FLIGHT"                -- остаться в состоянии для следующего POINT_REACHED
    else
      curr_state = "PIONEER_LANDING"       -- переход к посадке
      action[curr_state]()                 -- запуск логики посадки
    end
  end,
  ["PIONEER_LANDING"] = function ()        -- состояние посадки
    changeColor(colors[6])                 -- синий — посадка
    Timer.callLater(2, function () ap.push(Ev.MCE_LANDING) end) -- команда посадки
  end
}

function callback(event)                   -- обработчик системных событий
  if (event == Ev.TAKEOFF_COMPLETE) then action[curr_state]() end -- старт логики
  if (event == Ev.SHOCK) then              -- авария (столкновение)
    changeColor(colors[1])                 -- красный цвет
    ap.push(Ev.ENGINES_DISARM)                -- выключение двигателей (требуется ENGINES_DISARM)
  end
  if (event == Ev.POINT_REACHED) then action[curr_state]() end -- переход по достижению точки
  if (event == Ev.COPTER_LANDED) then changeColor(colors[7]) end -- выключить индикацию
end

changeColor(colors[1])                     -- начальная индикация (красный)
Timer.callLater(2, function () action[curr_state]() end) -- запуск автомата через 2с
