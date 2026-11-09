import type { ApiDoc } from './api-docs-types.js';

export const luaApiDocsFlight: Record<string, ApiDoc> = {
    'ap.push': {
        desc: 'Добавляет команду или событие в очередь автопилота.',
        syntax: 'ap.push(event)',
        params: 'event (число или константа Ev.*)',
        returns: 'nil',
        example: 'ap.push(Ev.MCE_TAKEOFF)',
        kind: 'Method',
        insertText: 'push(${1:event})',
        aliases: ['команда', 'событие', 'очередь команд', 'отправить автопилоту'],
        direction: 'to-autopilot'
    },
    'ap.goToLocalPoint': {
        desc: 'Полет в точку в локальной системе координат (метры).',
        syntax: 'ap.goToLocalPoint(x, y, z, [time])',
        params: 'x, y, z (числа), time (секунды, опционально: за сколько долететь до точки; без него — со скоростью Copter_pos_vMax)',
        returns: 'nil',
        example: 'ap.goToLocalPoint(1.5, 0, 1.0, 5)',
        kind: 'Method',
        insertText: 'goToLocalPoint(${1:x}, ${2:y}, ${3:z}, ${4:time})',
        aliases: ['лететь в точку', 'полет к точке', 'перелет', 'goto local point'],
        direction: 'to-autopilot'
    },
    'ap.goToPoint': {
        desc: 'Полёт в глобальные координаты (GPS). Широту и долготу задают целыми числами: градусы, умноженные на 10^7. В симуляторе одна единица равна 1 см на земле, точка старта: 600859810, 304206500.',
        syntax: 'ap.goToPoint(lat, lon, alt)',
        params: 'lat (широта * 10^7), lon (долгота * 10^7), alt (метры)',
        returns: 'nil',
        example: '-- старт симулятора: широта 60.0859810, долгота 30.4206500 (в единицах 10^-7 градуса)\nap.goToPoint(600859810 + 1000, 304206500, 2)  -- на 10 м к северу от старта, высота 2 м',
        kind: 'Method',
        insertText: 'goToPoint(${1:lat}, ${2:lon}, ${3:alt})',
        aliases: ['gps точка', 'глобальная точка', 'координаты gps'],
        direction: 'to-autopilot'
    },
    'ap.updateYaw': {
        desc: 'Установка угла рыскания (курса). Угол задают в радианах: 90° = math.pi / 2.',
        syntax: 'ap.updateYaw(angle)',
        params: 'angle (радианы)',
        returns: 'nil',
        example: 'ap.updateYaw(math.pi / 2)  -- повернуться на 90 градусов',
        kind: 'Method',
        insertText: 'updateYaw(${1:angle})',
        aliases: ['курс', 'рыскание', 'yaw', 'поворот'],
        direction: 'to-autopilot'
    },

    'Timer.callLater': {
        desc: 'Выполнение функции через задержку. На настоящем дроне одновременно работает не больше 16 таймеров (callAt, callLater, callAtGlobal, Timer.new): лишние не запустятся.',
        syntax: 'Timer.callLater(delay, func)',
        params: 'delay (секунды), func (функция)',
        returns: 'nil',
        example: 'Timer.callLater(2, function() print("Done") end)',
        kind: 'Method',
        insertText: 'callLater(${1:delay}, function()\n\t${2}\nend)'
    },
    'Timer.new': {
        desc: 'Создание циклического таймера. На настоящем дроне одновременно работает не больше 16 таймеров (callAt, callLater, callAtGlobal, Timer.new): лишние не запустятся.',
        syntax: 'Timer.new(period, func)',
        params: 'period (секунды), func (функция)',
        returns: 'Timer object',
        example: 'local count = 0\nlocal timer = Timer.new(1, function()\n    count = count + 1\n    print("тик", count)\nend)\ntimer:start()',
        kind: 'Method',
        insertText: 'new(${1:period}, function()\n\t${2}\nend)'
    },
    'Timer.start': { desc: 'Запуск таймера, созданного через Timer.new. Пока таймер не запущен, функция не вызывается.', syntax: 'timer:start()', example: 'local timer = Timer.new(1, function() print("тик") end)\ntimer:start()', kind: 'Method', insertText: 'start()' },
    'Timer.stop': { desc: 'Остановка таймера: после вызова функция больше не вызывается. Остановить таймер можно изнутри его же функции.', syntax: 'timer:stop()', example: 'local count = 0\nlocal timer\ntimer = Timer.new(1, function()\n    count = count + 1\n    print("тик", count)\n    if count == 3 then timer:stop() end\nend)\ntimer:start()', kind: 'Method', insertText: 'stop()' },
    'Timer.callAt': { desc: 'Вызвать функцию один раз в заданный момент локального времени. Момент отсчитывается так же, как time() (с момента включения коптера), поэтому «через 2 секунды» — это time() + 2.', syntax: 'Timer.callAt(time, func)', example: 'Timer.callAt(time() + 2, function()\n    print("прошло две секунды")\nend)', kind: 'Method', insertText: 'callAt(${1:time}, function()\n\t${2}\nend)' },
    'Timer.callAtGlobal': { desc: 'Вызвать функцию один раз в заданный момент глобального времени навигационной системы (time() + deltaTime()), общего для всех дронов. Так дроны стартуют вместе.', syntax: 'Timer.callAtGlobal(time, func)', example: 'Timer.callAtGlobal(time() + deltaTime() + 2, function()\n    print("глобальное время наступило")\nend)', kind: 'Method', insertText: 'callAtGlobal(${1:time}, function()\n\t${2}\nend)' },

    'Ledbar.new': {
        desc: 'Инициализация светодиодной ленты — группы светодиодов, которыми управляют по номеру (индексу, счёт с 0). count — сколько светодиодов в ленте; в учебных заготовках это 29.',
        syntax: 'Ledbar.new(count)',
        params: 'count (число светодиодов)',
        returns: 'Ledbar object',
        example: 'local leds = Ledbar.new(4)',
        kind: 'Method',
        insertText: 'new(${1:count})'
    },
    'Ledbar.fromHSV': {
        desc: 'Конвертация HSV в RGB.',
        syntax: 'Ledbar.fromHSV(h, s, v)',
        params: 'h (0-360), s (0-100), v (0-100)',
        returns: 'r, g, b (0-1)',
        example: 'local r,g,b = Ledbar.fromHSV(120, 100, 100)',
        kind: 'Method',
        insertText: 'fromHSV(${1:h}, ${2:s}, ${3:v})'
    },
    // В официальной документации fromHSV описан как глобальная функция, и
    // официальный example_led.lua зовёт именно её, без Ledbar.
    'fromHSV': {
        desc: 'Конвертация HSV в RGB (то же, что Ledbar.fromHSV).',
        syntax: 'fromHSV(h, s, v)',
        params: 'h (0-360), s (0-100), v (0-100)',
        returns: 'r, g, b (0-1)',
        example: 'local r, g, b = fromHSV(120, 100, 100)',
        kind: 'Function',
        insertText: 'fromHSV(${1:h}, ${2:s}, ${3:v})'
    },
    'Ledbar:set': {
        desc: 'Установка цвета светодиода. index — номер светодиода (счёт с 0). r, g, b — красный, зелёный и синий каналы цвета, каждый число от 0 (канал выключен) до 1 (максимум); все три в 0 — светодиод погашен, все три в 1 — белый. Новая команда на тот же светодиод заменяет прежний цвет.',
        syntax: 'leds:set(index, r, g, b, [w])',
        params: 'index (0..N-1), r,g,b (0-1), w (0-1, опц.)',
        returns: 'nil',
        example: 'leds:set(0, 1, 0, 0)',
        kind: 'Method',
        insertText: 'set(${1:index}, ${2:r}, ${3:g}, ${4:b})'
    },

    'Sensors.lpsPosition': {
        desc: 'Получение текущих координат.',
        syntax: 'Sensors.lpsPosition()',
        params: 'none',
        returns: 'x, y, z (метры)',
        example: 'local x, y, z = Sensors.lpsPosition()',
        kind: 'Method',
        insertText: 'lpsPosition()'
    },
    'Sensors.lpsVelocity': {
        desc: 'Получение текущей скорости.',
        syntax: 'Sensors.lpsVelocity()',
        params: 'none',
        returns: 'vx, vy, vz (м/с)',
        example: 'local vx, vy, vz = Sensors.lpsVelocity()',
        kind: 'Method',
        insertText: 'lpsVelocity()'
    },
    'Sensors.lpsYaw': { desc: 'Угол рыскания в локальной системе координат.', syntax: 'Sensors.lpsYaw()', returns: 'yaw (радианы)', example: 'local yaw = Sensors.lpsYaw()\nprint("курс, рад:", yaw)', kind: 'Method', insertText: 'lpsYaw()' },
    'Sensors.orientation': {
        desc: 'Получение углов ориентации (Эйлер).',
        syntax: 'Sensors.orientation()',
        params: 'none',
        returns: 'roll, pitch, yaw (радианы)',
        example: 'local r, p, y = Sensors.orientation()',
        kind: 'Method',
        insertText: 'orientation()'
    },
    'Sensors.altitude': { desc: 'Высота по барометру.', syntax: 'Sensors.altitude()', returns: 'alt (метры)', example: 'local alt = Sensors.altitude()\nprint("высота по барометру, м:", alt)', kind: 'Method', insertText: 'altitude()' },
    'Sensors.accel': { desc: 'Ускорение по осям.', syntax: 'Sensors.accel()', returns: 'ax, ay, az (м/с²)', example: 'local ax, ay, az = Sensors.accel()\nprint("ускорение:", ax, ay, az)', kind: 'Method', insertText: 'accel()' },
    'Sensors.gyro': { desc: 'Угловая скорость.', syntax: 'Sensors.gyro()', returns: 'gx, gy, gz (рад/с)', example: 'local gx, gy, gz = Sensors.gyro()\nprint("угловая скорость:", gx, gy, gz)', kind: 'Method', insertText: 'gyro()' },
    'Sensors.rc': { desc: 'Значения каналов пульта РУ.', syntax: 'Sensors.rc()', returns: 'ch1, ch2, ch3, ch4, ...', example: 'local ch1, ch2, ch3, ch4 = Sensors.rc()\nprint("каналы пульта:", ch1, ch2, ch3, ch4)', kind: 'Method', insertText: 'rc()' },
    'Sensors.battery': {
        desc: 'Напряжение батареи.',
        syntax: 'Sensors.battery()',
        params: 'none',
        returns: 'voltage (вольты)',
        example: 'local v = Sensors.battery()',
        kind: 'Method',
        insertText: 'battery()'
    },
    'Sensors.range': {
        desc: 'Расстояние до поверхности прямо под дроном по дальномеру: до земли, крыши дома или крыши едущего поезда.',
        syntax: 'Sensors.range()',
        params: 'none',
        returns: 'dist (метры)',
        example: 'local d = Sensors.range()',
        kind: 'Method',
        insertText: 'range()'
    },
    'Sensors.tof': {
        desc: 'Расстояние до поверхности под дроном по TOF-сенсору, в миллиметрах (земля, крыша, крыша поезда).',
        syntax: 'Sensors.tof()',
        params: 'none',
        returns: 'dist (мм)',
        example: 'local d = Sensors.tof()',
        kind: 'Method',
        insertText: 'tof()'
    },

    'Sensors.opticalFlow': {
        desc: "Датчик оптического потока (как PMW3901): как быстро поверхность под дроном «уезжает» в кадре. Над едущим поездом показывает движение относительно крыши: если дрон держится ровно над ней, поток близок к нулю. Шумит; качество падает ниже 8 см и выше 3 м. Скорость относительно поверхности: v = (flow - вращение) * высота.",
        syntax: "Sensors.opticalFlow()",
        params: "none",
        returns: "flowX, flowY (рад/с, оси дрона: X - вперёд, Y - вправо), quality (0..255)",
        example: "local fx, fy, q = Sensors.opticalFlow()\nlocal h = Sensors.range()\nif q > 100 then\n    local vForward = fx * h  -- м/с относительно поверхности\nend",
        kind: "Method",
        insertText: "opticalFlow()"
    },
    'Vehicle.start': {
        desc: "Только в симуляторе: трогает с места машину или поезд по названию из их настроек.",
        syntax: "Vehicle.start(name)",
        params: "name (string) - название, например \"Поезд 1\"",
        returns: "true",
        example: "Vehicle.start(\"Поезд 1\")",
        kind: "Method",
        insertText: "Vehicle.start(\"${1:Поезд 1}\")"
    },
    'Vehicle.stop': {
        desc: "Только в симуляторе: плавно останавливает машину или поезд.",
        syntax: "Vehicle.stop(name)",
        params: "name (string)",
        returns: "true",
        example: "Vehicle.stop(\"Поезд 1\")",
        kind: "Method",
        insertText: "Vehicle.stop(\"${1:Поезд 1}\")"
    },
    'Vehicle.setSpeed': {
        desc: "Только в симуляторе: задаёт скорость машины или поезда (0-15 м/с, разгон плавный).",
        syntax: "Vehicle.setSpeed(name, speed)",
        params: "name (string), speed (м/с)",
        returns: "true",
        example: "Vehicle.setSpeed(\"Поезд 1\", 3)",
        kind: "Method",
        insertText: "Vehicle.setSpeed(\"${1:Поезд 1}\", ${2:3})"
    },
    'Vehicle.state': {
        desc: "Только в симуляторе: истинное положение и скорость машины или поезда - для настройки сценария и проверки. В самой миссии слежения используйте камеру и оптический поток.",
        syntax: "Vehicle.state(name)",
        params: "name (string)",
        returns: "x, y, z (м), heading (рад), speed (м/с), moving (bool)",
        example: "local x, y, z, heading, speed = Vehicle.state(\"Поезд 1\")",
        kind: "Method",
        insertText: "Vehicle.state(\"${1:Поезд 1}\")"
    },

    'camera.requestMakeShot': {
        desc: 'Создает снимок с FPV-камеры дрона и сразу скачивает PNG в браузере.',
        syntax: 'camera.requestMakeShot()',
        params: 'none',
        returns: 'nil',
        example: 'camera.requestMakeShot()',
        kind: 'Method',
        insertText: 'requestMakeShot()'
    },
    'camera.checkRequestShot': {
        desc: 'Ответ на последний запрос снимка.',
        syntax: 'camera.checkRequestShot()',
        params: 'none',
        returns: '-1 (ответа ещё нет), 0 (снимок сделан) или 1 (ошибка)',
        example: 'while camera.checkRequestShot() == -1 do end',
        kind: 'Method',
        insertText: 'checkRequestShot()'
    },
    'camera.requestRecordStart': {
        desc: 'Запускает запись видео с FPV-камеры дрона.',
        syntax: 'camera.requestRecordStart()',
        params: 'none',
        returns: 'nil',
        example: 'camera.requestRecordStart()',
        kind: 'Method',
        insertText: 'requestRecordStart()'
    },
    'camera.requestRecordStop': {
        desc: 'Останавливает FPV-запись и сразу скачивает готовое видео в браузере.',
        syntax: 'camera.requestRecordStop()',
        params: 'none',
        returns: 'nil',
        example: 'camera.requestRecordStop()',
        kind: 'Method',
        insertText: 'requestRecordStop()'
    },
    'camera.checkRequestRecord': {
        desc: 'Ответ на последний запрос старта или остановки записи.',
        syntax: 'camera.checkRequestRecord()',
        params: 'none',
        returns: '-1 (ответа ещё нет), 0 (выполнено) или 1 (ошибка)',
        example: 'while camera.checkRequestRecord() == -1 do end',
        kind: 'Method',
        insertText: 'checkRequestRecord()'
    }
};
