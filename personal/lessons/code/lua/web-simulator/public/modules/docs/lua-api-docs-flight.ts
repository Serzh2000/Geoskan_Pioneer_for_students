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
        params: 'x, y, z (числа), time (секунды, опционально)',
        returns: 'nil',
        example: 'ap.goToLocalPoint(1.5, 0, 1.0, 5)',
        kind: 'Method',
        insertText: 'goToLocalPoint(${1:x}, ${2:y}, ${3:z}, ${4:time})',
        aliases: ['лететь в точку', 'полет к точке', 'перелет', 'goto local point'],
        direction: 'to-autopilot'
    },
    'ap.goToPoint': {
        desc: 'Полет в глобальные координаты (GPS).',
        syntax: 'ap.goToPoint(lat, lon, alt)',
        params: 'lat (широта * 10^7), lon (долгота * 10^7), alt (метры)',
        returns: 'nil',
        example: 'ap.goToPoint(600859810, 304206500, 50)',
        kind: 'Method',
        insertText: 'goToPoint(${1:lat}, ${2:lon}, ${3:alt})',
        aliases: ['gps точка', 'глобальная точка', 'координаты gps'],
        direction: 'to-autopilot'
    },
    'ap.updateYaw': {
        desc: 'Установка угла рыскания (курса).',
        syntax: 'ap.updateYaw(angle)',
        params: 'angle (радианы)',
        returns: 'nil',
        example: 'ap.updateYaw(Math.PI / 2)',
        kind: 'Method',
        insertText: 'updateYaw(${1:angle})',
        aliases: ['курс', 'рыскание', 'yaw', 'поворот'],
        direction: 'to-autopilot'
    },

    'Timer.callLater': {
        desc: 'Выполнение функции через задержку.',
        syntax: 'Timer.callLater(delay, func)',
        params: 'delay (секунды), func (функция)',
        returns: 'nil',
        example: 'Timer.callLater(2, function() print("Done") end)',
        kind: 'Method',
        insertText: 'callLater(${1:delay}, function()\n\t${2}\nend)'
    },
    'Timer.new': {
        desc: 'Создание циклического таймера.',
        syntax: 'Timer.new(period, func)',
        params: 'period (секунды), func (функция)',
        returns: 'Timer object',
        example: 'local t = Timer.new(1, function() ... end)',
        kind: 'Method',
        insertText: 'new(${1:period}, function()\n\t${2}\nend)'
    },
    'Timer.start': { desc: 'Запуск таймера.', syntax: 'timer:start()', kind: 'Method', insertText: 'start()' },
    'Timer.stop': { desc: 'Остановка таймера.', syntax: 'timer:stop()', kind: 'Method', insertText: 'stop()' },
    'Timer.callAt': { desc: 'Вызов функции в определенное локальное время.', syntax: 'Timer.callAt(time, func)', kind: 'Method', insertText: 'callAt(${1:time}, function()\n\t${2}\nend)' },
    'Timer.callAtGlobal': { desc: 'Вызов функции в глобальное время.', syntax: 'Timer.callAtGlobal(time, func)', kind: 'Method', insertText: 'callAtGlobal(${1:time}, function()\n\t${2}\nend)' },

    'Ledbar.new': {
        desc: 'Инициализация светодиодной ленты.',
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
    'Ledbar:set': {
        desc: 'Установка цвета светодиода.',
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
    'Sensors.lpsYaw': { desc: 'Угол рыскания в локальной системе координат.', syntax: 'Sensors.lpsYaw()', returns: 'yaw (радианы)', kind: 'Method', insertText: 'lpsYaw()' },
    'Sensors.orientation': {
        desc: 'Получение углов ориентации (Эйлер).',
        syntax: 'Sensors.orientation()',
        params: 'none',
        returns: 'roll, pitch, yaw (радианы)',
        example: 'local r, p, y = Sensors.orientation()',
        kind: 'Method',
        insertText: 'orientation()'
    },
    'Sensors.altitude': { desc: 'Высота по барометру.', syntax: 'Sensors.altitude()', returns: 'alt (метры)', kind: 'Method', insertText: 'altitude()' },
    'Sensors.accel': { desc: 'Ускорение по осям.', syntax: 'Sensors.accel()', returns: 'ax, ay, az (м/с²)', kind: 'Method', insertText: 'accel()' },
    'Sensors.gyro': { desc: 'Угловая скорость.', syntax: 'Sensors.gyro()', returns: 'gx, gy, gz (рад/с)', kind: 'Method', insertText: 'gyro()' },
    'Sensors.rc': { desc: 'Значения каналов пульта РУ.', syntax: 'Sensors.rc()', returns: 'ch1, ch2, ch3, ch4, ...', kind: 'Method', insertText: 'rc()' },
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
        desc: 'Высота по дальномеру (лазер/ультразвук).',
        syntax: 'Sensors.range()',
        params: 'none',
        returns: 'dist (метры)',
        example: 'local d = Sensors.range()',
        kind: 'Method',
        insertText: 'range()'
    },
    'Sensors.tof': {
        desc: 'Данные с TOF-сенсора.',
        syntax: 'Sensors.tof()',
        params: 'none',
        returns: 'dist (мм)',
        example: 'local d = Sensors.tof()',
        kind: 'Method',
        insertText: 'tof()'
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
        desc: 'Проверка статуса запроса на снимок.',
        syntax: 'camera.checkRequestShot()',
        params: 'none',
        returns: '1 (готов) или 0 (в процессе)',
        example: 'if camera.checkRequestShot() == 1 then print("Готово") end',
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
        desc: 'Проверка статуса записи видео.',
        syntax: 'camera.checkRequestRecord()',
        params: 'none',
        returns: '1 (запись идет) или 0',
        example: 'if camera.checkRequestRecord() == 1 then print("Пишем...") end',
        kind: 'Method',
        insertText: 'checkRequestRecord()'
    }
};
