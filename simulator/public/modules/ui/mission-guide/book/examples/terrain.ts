import type { ChapterExamples } from '../example.js';

/** Examples of the chapter, by lesson number. */
export const TERRAIN_EXAMPLES: ChapterExamples = {
    55: {
        theory: [
            '**Seed** («зерно») — это число, из которого генератор карты получает все остальные «случайные» числа: где встанут деревья, дома, ворота и контрольные метки.',
            'Генератор не бросает настоящий кубик. Он берёт seed, по формуле вычисляет следующее число, затем следующее после него — получается цепочка, которую всегда можно построить заново.',
            'Одинаковый seed даёт одинаковую цепочку и одинаковую карту, другой seed — другую цепочку и другую расстановку. Поэтому трудный маршрут можно записать вместе с seed и вернуться к нему в любой момент.'
        ],
        lua: `local seed = 4
for i = 1, 3 do
    seed = (seed * 75 + 74) % 65537
    print("Дерево " .. i .. ": x = " .. (seed % 20 - 10))
end`,
        python: `seed = 4
for i in range(1, 4):
    seed = (seed * 75 + 74) % 65537
    print(f"Дерево {i}: x = {seed % 20 - 10}")`,
        steps: [
            { lua: 'local seed = 4', python: 'seed = 4', text: 'Начальное число — seed. Всё остальное будет вычислено из него.' },
            { lua: 'seed = (seed * 75 + 74) % 65537', python: 'seed = (seed * 75 + 74) % 65537', text: 'Формула получает из прежнего числа следующее. Одно и то же число на входе всегда даёт одно и то же на выходе.' },
            { lua: 'print("Дерево " .. i .. ": x = " .. (seed % 20 - 10))', python: 'print(f"Дерево {i}: x = {seed % 20 - 10}")', text: 'Из числа получаем координату X дерева от -10 до 9 и печатаем её в журнал.' }
        ],
        watch: 'В журнале три строки с координатами деревьев; при повторном запуске числа те же самые, а если заменить seed = 4 на другое число, они изменятся.'
    },
    56: {
        theory: [
            'Перед взлётом дрону нужен свободный объём вокруг аппарата, а не одна точка под ним. Размеры корпуса и винтов входят в расчёт так же, как положение центра.',
            'Берём радиус аппарата вместе с винтами и добавляем запас: при подъёме дрон может немного сместиться. Сумма показывает, сколько места нужно от центра до ближайшего препятствия.',
            'Свободное место замеряем по сцене — например, расстояние от старта до ближайшего дерева или здания. Если оно больше нужного, взлетаем; иначе сначала выбираем другое место.'
        ],
        lua: `local bodyRadius = 0.3
local margin = 0.5
local freeSpace = 2.4
local needed = bodyRadius + margin
if freeSpace > needed then
    print("Место есть: " .. freeSpace .. " > " .. needed)
    ap.push(Ev.MCE_PREFLIGHT)
else
    print("Тесно: нужно " .. needed .. " м")
end
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then print("Подъём завершён") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
body_radius = 0.3
margin = 0.5
free_space = 2.4
needed = body_radius + margin
if free_space > needed:
    print(f"Место есть: {free_space} > {needed}")
    pioneer.arm(); pioneer.takeoff()
    while pioneer.get_autopilot_state() != "MISSION":
        time.sleep(0.1)
    print("Подъём завершён")
else:
    print(f"Тесно: нужно {needed} м")`,
        steps: [
            { lua: 'local needed = bodyRadius + margin', python: 'needed = body_radius + margin', text: 'Нужное место — радиус аппарата с винтами плюс запас на смещение при подъёме.' },
            { lua: 'if freeSpace > needed then', python: 'if free_space > needed:', text: 'Сравниваем замеренное свободное место с нужным: взлёт разрешён, только если места хватает.' },
            { lua: 'ap.push(Ev.MCE_PREFLIGHT)', python: 'pioneer.arm(); pioneer.takeoff()', text: 'Подготовку двигателей и взлёт запускаем уже внутри проверки, после того как место подтверждено.' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE then print("Подъём завершён") end', python: 'print("Подъём завершён")', text: 'Сообщение выводим после подтверждения, что подъём закончился, а не сразу после команды.' }
        ],
        watch: 'В журнале сообщение «Место есть», затем дрон вертикально поднимается над площадкой; если сделать свободное место меньше нужного, взлёта не будет, только строка «Тесно».'
    },
    57: {
        theory: [
            'Лесной коридор — свободная полоса между деревьями. Центр траектории может идти по её середине, но винты шире центра, а кроны деревьев шире стволов.',
            'Боковой запас считаем от края кроны до линии маршрута: положение дерева минус радиус кроны минус положение маршрута. Положительное число значит, что до листвы ещё есть место.',
            'Сам маршрут записываем списком точек: все они стоят на одной линии вдоль коридора, а один алгоритм по очереди отправляет дрон к каждой из них.'
        ],
        lua: `local treeX, crown, routeX = 3.5, 1.5, 0
print("Боковой запас до кроны: " .. (treeX - crown - routeX) .. " м")
local points = {{0, 4, 2}, {0, 10, 2}}
local i = 0
function nextPoint()
    i = i + 1
    if points[i] then ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])
    else print("Коридор пройден") end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
tree_x, crown, route_x = 3.5, 1.5, 0
print(f"Боковой запас до кроны: {tree_x - crown - route_x} м")
points = [(0, 4, 2), (0, 10, 2)]
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
for x, y, z in points:
    pioneer.go_to_local_point(x, y, z)
    while not pioneer.point_reached():
        time.sleep(0.1)
print("Коридор пройден")`,
        steps: [
            { lua: 'print("Боковой запас до кроны: " .. (treeX - crown - routeX) .. " м")', python: 'print(f"Боковой запас до кроны: {tree_x - crown - route_x} м")', text: 'Считаем запас от края кроны до маршрута и печатаем его: если число положительное, винты не заденут листву.' },
            { lua: 'local points = {{0, 4, 2}, {0, 10, 2}}', python: 'points = [(0, 4, 2), (0, 10, 2)]', text: 'Две точки коридора лежат на линии X = 0, вдоль центра свободной полосы, на высоте 2 метра.' },
            { lua: 'ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])', python: 'pioneer.go_to_local_point(x, y, z)', text: 'Отправляем дрон к очередной точке списка. Следующую цель выдаём только после подтверждения прибытия.' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end', python: 'while not pioneer.point_reached():', text: 'Следующая точка запускается после взлёта или после прибытия в предыдущую.' }
        ],
        watch: 'Дрон взлетает и летит строго по центру коридора вдоль оси Y, деревья остаются по обе стороны, а в журнале сначала боковой запас 2.0 м и в конце «Коридор пройден».'
    },
    58: {
        theory: [
            'Холм — препятствие, которое поднимается над землёй. Прежде чем лететь над ним, нужно знать его высоту и решить, какой запас оставить сверху.',
            'Безопасная высота равна высоте холма плюс запас. Лучше вычислить её в программе: тогда для другого холма достаточно поменять одно число, а не искать его по всем строкам.',
            'Высоту набираем до начала опасного участка: сначала подъём на месте, потом горизонтальный полёт. Если подниматься одновременно с движением, дрон окажется у склона ещё на малой высоте.'
        ],
        lua: `local hillTop, margin = 4, 2
local safeZ = hillTop + margin
print("Безопасная высота: " .. safeZ)
local climbed = false
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(0, 0, safeZ) end
    if event == Ev.POINT_REACHED and not climbed then
        climbed = true
        ap.goToLocalPoint(0, 10, safeZ)
    elseif event == Ev.POINT_REACHED then print("Холмы пройдены") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
hill_top, margin = 4, 2
safe_z = hill_top + margin
print("Безопасная высота:", safe_z)
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
pioneer.go_to_local_point(0, 0, safe_z)
while not pioneer.point_reached():
    time.sleep(0.1)
pioneer.go_to_local_point(0, 10, safe_z)
while not pioneer.point_reached():
    time.sleep(0.1)
print("Холмы пройдены")`,
        steps: [
            { lua: 'local safeZ = hillTop + margin', python: 'safe_z = hill_top + margin', text: 'Безопасная высота — высота холма плюс запас, посчитанная в одном месте программы.' },
            { lua: 'ap.goToLocalPoint(0, 0, safeZ)', python: 'pioneer.go_to_local_point(0, 0, safe_z)', text: 'Сначала поднимаемся на месте, над стартом, до безопасной высоты.' },
            { lua: 'ap.goToLocalPoint(0, 10, safeZ)', python: 'pioneer.go_to_local_point(0, 10, safe_z)', text: 'Только после этого летим вперёд, уже на нужной высоте, и высота при движении не меняется.' }
        ],
        watch: 'Дрон сначала поднимается почти вертикально до 6 м, потом идёт горизонтально над холмами; в журнале число 6 и в конце «Холмы пройдены».'
    },
    59: {
        theory: [
            'Прямая от старта к цели не всегда свободна: здание может оказаться ровно на ней. Тогда путь строят из промежуточных точек так, чтобы они лежали сбоку от здания.',
            'Положение обхода считаем с запасом от фасада: середина здания плюс половина его ширины плюс зазор. Тогда число зазора можно менять, не пересчитывая остальное.',
            'Промежуточных точек обычно две: одна рядом со стартовой стороной здания, другая за ним. Дрон идёт вдоль фасада и затем возвращается к нужной линии.'
        ],
        lua: `local buildingX, halfWidth, gap = 0, 2, 2
local sideX = buildingX + halfWidth + gap
print("Обход по X = " .. sideX)
local points = {{sideX, 2, 3}, {sideX, 10, 3}, {0, 10, 3}}
local i = 0
function nextPoint()
    i = i + 1
    if points[i] then ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])
    else print("Здание обойдено") end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
building_x, half_width, gap = 0, 2, 2
side_x = building_x + half_width + gap
print("Обход по X =", side_x)
points = [(side_x, 2, 3), (side_x, 10, 3), (0, 10, 3)]
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
for x, y, z in points:
    pioneer.go_to_local_point(x, y, z)
    while not pioneer.point_reached():
        time.sleep(0.1)
print("Здание обойдено")`,
        steps: [
            { lua: 'local sideX = buildingX + halfWidth + gap', python: 'side_x = building_x + half_width + gap', text: 'Линия обхода: середина здания плюс полуширина плюс зазор. Здесь она проходит на 4 метра от оси.' },
            { lua: 'local points = {{sideX, 2, 3}, {sideX, 10, 3}, {0, 10, 3}}', python: 'points = [(side_x, 2, 3), (side_x, 10, 3), (0, 10, 3)]', text: 'Две точки идут вдоль здания сбоку, третья возвращает дрон на центральную линию уже за зданием.' },
            { lua: 'if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end', python: 'while not pioneer.point_reached():', text: 'Каждая следующая точка выдаётся только после прибытия в предыдущую.' }
        ],
        watch: 'Дрон уходит вбок от оси X, идёт вдоль фасада здания на расстоянии, потом возвращается на центр за зданием и в журнале пишет «Здание обойдено».'
    },
    60: {
        theory: [
            'На промышленном участке мачты и пилоны ограничивают проход и по бокам, и по высоте. Свободный финиш ничего не гарантирует: пилон может стоять между точками.',
            'Поэтому проверяем каждый участок маршрута до взлёта: боковое смещение от оси коридора не больше допустимого, высота не ниже минимальной. Проверку удобно делать циклом по списку точек.',
            'Если хотя бы один участок не прошёл проверку, дрон не взлетает, а в журнале видно, какой участок плох. Ошибка в расчёте обходится дешевле, чем столкновение.'
        ],
        lua: `local corridor, minZ = 2.5, 2
local points = {{0, 4, 3}, {0, 8, 3}, {0, 13, 3}}
local allClear = true
for i, p in ipairs(points) do
    if math.abs(p[1]) > corridor or p[3] < minZ then allClear = false end
    print("Участок " .. i .. ": отклонение " .. math.abs(p[1]) .. " м, высота " .. p[3] .. " м")
end
if allClear then ap.push(Ev.MCE_PREFLIGHT) else print("Маршрут не проходит") end
function callback(event)
    local last = points[3]
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE then ap.goToLocalPoint(last[1], last[2], last[3]) end
    if event == Ev.POINT_REACHED then print("Коридор пройден") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
corridor, min_z = 2.5, 2
points = [(0, 4, 3), (0, 8, 3), (0, 13, 3)]
all_clear = True
for i, p in enumerate(points, 1):
    if abs(p[0]) > corridor or p[2] < min_z:
        all_clear = False
    print(f"Участок {i}: отклонение {abs(p[0])} м, высота {p[2]} м")
if all_clear:
    pioneer.arm(); pioneer.takeoff()
    while pioneer.get_autopilot_state() != "MISSION":
        time.sleep(0.1)
    pioneer.go_to_local_point(*points[2])
    while not pioneer.point_reached():
        time.sleep(0.1)
    print("Коридор пройден")
else:
    print("Маршрут не проходит")`,
        steps: [
            { lua: 'local points = {{0, 4, 3}, {0, 8, 3}, {0, 13, 3}}', python: 'points = [(0, 4, 3), (0, 8, 3), (0, 13, 3)]', text: 'Маршрут из трёх участков вдоль центрального коридора, на высоте 3 метра.' },
            { lua: 'if math.abs(p[1]) > corridor or p[3] < minZ then allClear = false end', python: 'if abs(p[0]) > corridor or p[2] < min_z:', text: 'Каждый участок проверяется на боковое смещение и на минимальную высоту. Одна неудача делает весь маршрут негодным.' },
            { lua: 'if allClear then ap.push(Ev.MCE_PREFLIGHT) else print("Маршрут не проходит") end', python: 'if all_clear:', text: 'Взлёт разрешается только после того, как проверены все участки.' }
        ],
        watch: 'До взлёта в журнале три строки «Участок» с отклонением и высотой, затем дрон летит по коридору; если поставить corridor меньше нуля, взлёта не будет.'
    },
    61: {
        theory: [
            'Гоночные ворота — это проём, у которого есть направление прохода. Недостаточно оказаться рядом с кольцом: нужно подойти с одной стороны, пересечь центр и выйти с другой.',
            'Поэтому ворота задают тремя точками на одной линии: подход, центр и выход. Центр берём из описания ворот, а подход и выход отодвигаем на небольшое расстояние по оси прохода.',
            'Ось прохода зависит от плоскости кольца: если кольцо стоит в плоскости YZ, пролетаем вдоль X. Высоту центра нельзя оценивать на глаз, её берут из описания трассы.'
        ],
        lua: `local cx, cy, cz, d = 0, -6, 1.18, 1.5
local points = {{cx - d, cy, cz}, {cx, cy, cz}, {cx + d, cy, cz}}
local names = {"подход", "центр", "выход"}
local i = 0
function nextPoint()
    if i > 0 then print("Пройден " .. names[i]) end
    i = i + 1
    if points[i] then ap.goToLocalPoint(points[i][1], points[i][2], points[i][3]) end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
cx, cy, cz, d = 0, -6, 1.18, 1.5
points = [(cx - d, cy, cz), (cx, cy, cz), (cx + d, cy, cz)]
names = ["подход", "центр", "выход"]
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
for i, point in enumerate(points):
    pioneer.go_to_local_point(*point)
    while not pioneer.point_reached():
        time.sleep(0.1)
    print("Пройден " + names[i])`,
        steps: [
            { lua: 'local cx, cy, cz, d = 0, -6, 1.18, 1.5', python: 'cx, cy, cz, d = 0, -6, 1.18, 1.5', text: 'Центр ворот и расстояние d, на которое подход и выход отодвинуты от центра.' },
            { lua: 'local points = {{cx - d, cy, cz}, {cx, cy, cz}, {cx + d, cy, cz}}', python: 'points = [(cx - d, cy, cz), (cx, cy, cz), (cx + d, cy, cz)]', text: 'Три точки на одной линии вдоль X: подход слева от кольца, центр кольца и выход справа.' },
            { lua: 'if i > 0 then print("Пройден " .. names[i]) end', python: 'print("Пройден " + names[i])', text: 'После каждого подтверждённого прибытия печатаем название пройденной точки.' }
        ],
        watch: 'Дрон подходит к кольцу с левой стороны, летит через его центр и выходит с правой; в журнале по очереди «подход», «центр», «выход».'
    },
    62: {
        theory: [
            'При новом seed карта меняется: боковые деревья, здания и мачты стоят в других местах. Старый маршрут, построенный вокруг конкретного препятствия, может стать неверным.',
            'Но у генератора есть правила, которые не зависят от seed, — например, свободный центральный коридор. Точки на нём остаются верными на любой карте, а точки у боковых объектов нужно проверять заново.',
            'Удобно хранить в списке точек пометку, надёжна ли точка при смене seed. Тогда программа летит по надёжным точкам, а остальные пропускает и честно сообщает об этом.'
        ],
        lua: `local points = {{0, 5, 3, true}, {4, 8, 3, false}, {0, 11, 3, true}}
local i = 0
function nextPoint()
    i = i + 1
    local p = points[i]
    if p == nil then print("Маршрут закончен")
    elseif p[4] then ap.goToLocalPoint(p[1], p[2], p[3])
    else
        print("Точка " .. i .. " зависит от seed, пропускаем")
        nextPoint()
    end
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE or event == Ev.POINT_REACHED then nextPoint() end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
points = [(0, 5, 3, True), (4, 8, 3, False), (0, 11, 3, True)]
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
for i, p in enumerate(points, 1):
    if p[3]:
        pioneer.go_to_local_point(p[0], p[1], p[2])
        while not pioneer.point_reached():
            time.sleep(0.1)
    else:
        print("Точка " + str(i) + " зависит от seed, пропускаем")
print("Маршрут закончен")`,
        steps: [
            { lua: 'local points = {{0, 5, 3, true}, {4, 8, 3, false}, {0, 11, 3, true}}', python: 'points = [(0, 5, 3, True), (4, 8, 3, False), (0, 11, 3, True)]', text: 'У каждой точки есть четвёртое значение: надёжна ли она при любом seed. Центральные точки надёжны, боковая — нет.' },
            { lua: 'elseif p[4] then ap.goToLocalPoint(p[1], p[2], p[3])', python: 'if p[3]:', text: 'Надёжная точка отправляется дрону как обычно.' },
            { lua: 'print("Точка " .. i .. " зависит от seed, пропускаем")', python: 'print("Точка " + str(i) + " зависит от seed, пропускаем")', text: 'Ненадёжную точку не посещаем: в журнале записано, что её нужно сначала проверить на новой карте.' }
        ],
        watch: 'Дрон летит по центральной линии к первой и третьей точкам, а вторую, боковую, пропускает; в журнале строка «Точка 2 зависит от seed, пропускаем».'
    },
    63: {
        theory: [
            'Большая экспедиция состоит из участков, и у каждого свои условия: куда лететь, на какой высоте, как понять, что участок закончен. Так её проще проверить, чем один длинный перелёт.',
            'Для каждого участка записываем контрольную точку и высоту. Над холмами и тяжёлыми зонами высоту берём побольше, а условием завершения участка служит подтверждённое прибытие в точку.',
            'В конце вернитесь в стартовую зону и посадите дрон. Название каждого участка выводим в журнал, чтобы по записи видеть, на каком этапе что-то пошло не так.'
        ],
        lua: `local points = {{-2, -10, 3}, {0, 0, 3}, {2, 10, 5}, {0, 0, 2}}
local names = {"юг", "центр", "север", "старт"}
local i = 0
function nextLeg()
    i = i + 1
    print("Участок «" .. names[i] .. "»: высота " .. points[i][3] .. " м")
    ap.goToLocalPoint(points[i][1], points[i][2], points[i][3])
end
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event == Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event == Ev.TAKEOFF_COMPLETE or (event == Ev.POINT_REACHED and i < 4) then nextLeg()
    elseif event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end
    if event == Ev.COPTER_LANDED then print("Экспедиция завершена") end
end`,
        python: `from pioneer_sdk import Pioneer
import time

pioneer = Pioneer(simulator=True)
points = [(-2, -10, 3), (0, 0, 3), (2, 10, 5), (0, 0, 2)]
names = ["юг", "центр", "север", "старт"]
pioneer.arm(); pioneer.takeoff()
while pioneer.get_autopilot_state() != "MISSION":
    time.sleep(0.1)
for i, point in enumerate(points):
    print("Участок «" + names[i] + "»: высота " + str(point[2]) + " м")
    pioneer.go_to_local_point(*point)
    while not pioneer.point_reached():
        time.sleep(0.2)
pioneer.land()
while pioneer.get_autopilot_state() != "DISARMED":
    time.sleep(0.1)
print("Экспедиция завершена")`,
        steps: [
            { lua: 'local points = {{-2, -10, 3}, {0, 0, 3}, {2, 10, 5}, {0, 0, 2}}', python: 'points = [(-2, -10, 3), (0, 0, 3), (2, 10, 5), (0, 0, 2)]', text: 'Четыре участка: юг, центр, север и возвращение на старт. У северного участка высота больше.' },
            { lua: 'print("Участок «" .. names[i] .. "»: высота " .. points[i][3] .. " м")', python: 'print("Участок «" + names[i] + "»: высота " + str(point[2]) + " м")', text: 'Перед каждым участком печатаем его название и высоту, чтобы журнал рассказывал историю полёта.' },
            { lua: 'elseif event == Ev.POINT_REACHED then ap.push(Ev.MCE_LANDING) end', python: 'pioneer.land()', text: 'Когда последний участок, возвращение на старт, подтверждён, отправляем команду посадки.' },
            { lua: 'if event == Ev.COPTER_LANDED then print("Экспедиция завершена") end', python: 'print("Экспедиция завершена")', text: 'Итоговое сообщение выводим только после подтверждения, что дрон сел.' }
        ],
        watch: 'Дрон по очереди проходит четыре участка, на северном поднимается выше, возвращается к старту и садится; в журнале названия участков и в конце «Экспедиция завершена».'
    }
};
