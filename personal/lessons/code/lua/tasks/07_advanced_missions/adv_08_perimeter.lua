-- «Периметр» вокруг базы с возвратом в исходную точку
local z = 0.9                                  -- высота полёта
local perim = {                                -- точки периметра вокруг (0,0)
  {1,0,z},{1,1,z},{0,1,z},{-1,1,z},{-1,0,z},{-1,-1,z},{0,-1,z},{1,-1,z},{1,0,z}
}
local i = 1                                    -- индекс текущей точки
function callback(event)                        -- обработчик событий
  if event == Ev.TAKEOFF_COMPLETE then          -- после взлёта
    Timer.callLater(2, function()               -- стабилизация
      ap.goToLocalPoint(table.unpack(perim[i])) -- первая точка периметра
    end)
  end
  if event == Ev.POINT_REACHED then             -- точка достигнута
    i = i + 1                                   -- следующая
    if i <= #perim then                         -- если не конец
      ap.goToLocalPoint(table.unpack(perim[i])) -- командуем следующую
    else                                        -- завершили обход
      ap.goToLocalPoint(0, 0, z)                -- возврат в центр
      ap.push(Ev.MCE_LANDING)                   -- посадка
    end
  end
end
