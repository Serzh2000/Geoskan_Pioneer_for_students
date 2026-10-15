local a = 42
-- сравнение возвращает булево значение
local gt = a > 10
-- логическое И и НЕ
local ok = true and not false
-- "тернарный" идиом в Lua через and/or
local sel = gt and 1 or 0
-- композиция условий "в диапазоне"
local within = (a >= 0) and (a <= 100)
print(ok, sel, within)        -- true  1  true

local name = "Pioneer"
-- проверка непустой строки
local nonempty = (name ~= nil) and (name ~= "")
-- исключающее ИЛИ для булевых
local p, q = true, false
local xor = (p and not q) or (q and not p)
print(nonempty, xor)          -- true  true
