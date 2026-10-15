-- "охранное" условие: работаем с полем, только если таблица и поле существуют
local function doubled(t)
  if t and t.value then
    return t.value * 2
  end
  return "нет данных"
end

print(doubled({value = 42}))  -- 84
print(doubled(nil))           -- нет данных
