-- безопасно работаем с полями, если таблица и поле существуют
if t and t.value then
  result = t.value * 2
end
