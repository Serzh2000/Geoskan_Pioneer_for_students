-- логическое И и НЕ
local ok = true and not false
-- «тернарный» идиом в Lua через and/or
local sel = (gt and 1 or 0)
-- композиция условий «в диапазоне»
local within = (a >= 0) and (a <= 100)
-- проверка непустой строки
local nonempty = (name ~= nil) and (name ~= "")
-- исключающее ИЛИ для булевых
local xor = (p and not q) or (q and not p)
