-- Количество светодиодов на основной плате (4) + на модуле LED (25)
local ledNumber = 29
local leds = Ledbar.new(ledNumber)

-- Базовые функции для работы с матрицей 5x5 (индексы 4..28)
local function setPixel(x, y, r, g, b)
    if x >= 0 and x < 5 and y >= 0 and y < 5 then
        -- Вычисление индекса (x, y) для матрицы. Строки идут сверху вниз.
        local index = 4 + (y * 5) + x
        leds:set(index, r, g, b)
    end
end

local function clearMatrix()
    for i = 4, 28 do
        leds:set(i, 0, 0, 0)
    end
end

local function fillMatrix(r, g, b)
    for i = 4, 28 do
        leds:set(i, r, g, b)
    end
end

-- Отображение символа (смайлик)
local function drawSmile(r, g, b)
    clearMatrix()
    -- Глаза
    setPixel(1, 1, r, g, b)
    setPixel(3, 1, r, g, b)
    -- Рот
    setPixel(0, 3, r, g, b)
    setPixel(1, 4, r, g, b)
    setPixel(2, 4, r, g, b)
    setPixel(3, 4, r, g, b)
    setPixel(4, 3, r, g, b)
end

-- Анимация: Бегущая строка (пиксель бежит по кругу)
local runX, runY = 0, 0
local dirX, dirY = 1, 0
local function stepRunningPixel()
    clearMatrix()
    setPixel(runX, runY, 0, 1, 0)
    
    runX = runX + dirX
    runY = runY + dirY
    
    if runX >= 4 and runY == 0 then dirX = 0; dirY = 1 end
    if runX == 4 and runY >= 4 then dirX = -1; dirY = 0 end
    if runX <= 0 and runY == 4 then dirX = 0; dirY = -1 end
    if runX == 0 and runY <= 0 then dirX = 1; dirY = 0 end
end

-- Анимация: Волна
local waveOffset = 0
local function stepWave()
    for x = 0, 4 do
        for y = 0, 4 do
            -- Вычисляем яркость синего на основе синуса
            local val = (math.sin(x + waveOffset) + 1) / 2
            setPixel(x, y, 0, val * 0.5, val)
        end
    end
    waveOffset = waveOffset + 0.5
end

-- Машина состояний для переключения анимаций
local animState = 0
local ticks = 0

timerAnim = Timer.new(0.1, function()
    ticks = ticks + 1
    
    -- Каждые 5 секунд меняем анимацию (50 тиков)
    if ticks > 50 then
        ticks = 0
        animState = (animState + 1) % 4
    end
    
    if animState == 0 then
        -- Мерцание случайным цветом
        if ticks % 5 == 0 then
            fillMatrix(math.random(), math.random(), math.random())
        end
    elseif animState == 1 then
        -- Смайлик
        drawSmile(1, 1, 0)
    elseif animState == 2 then
        -- Бегущий пиксель
        stepRunningPixel()
    elseif animState == 3 then
        -- Волна
        stepWave()
    end
end)

-- Запуск анимации
timerAnim:start()

-- Отключение при низком напряжении
function callback(event)
    if (event == Ev.LOW_VOLTAGE2) then
        timerAnim:stop()
        Timer.callLater(1, function () fillMatrix(0, 0, 0) end)
    end
end