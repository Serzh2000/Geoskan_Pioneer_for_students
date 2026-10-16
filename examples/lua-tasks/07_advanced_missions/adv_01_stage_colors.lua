-- Плавная смена цвета индикации этапов миссии
local leds = Ledbar.new(29)                   -- объект управления линейкой
local function setAll(r,g,b)                  -- утилита: установить цвет всем индексам
  for i=0,28 do leds:set(i,r,g,b) end
end
function stageColor(stage)                    -- функция цвета по стадии
  if stage=="PREPARE" then                    -- подготовка
    setAll(1,1,1)
  elseif stage=="FLIGHT" then                 -- полёт
    setAll(0,1,0)
  elseif stage=="LANDING" then                -- посадка
    setAll(1,1,0)
  else                                        -- прочие состояния
    setAll(0,0,0)
  end
end
