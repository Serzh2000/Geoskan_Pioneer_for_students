import type { ApiDoc } from './api-docs-types.js';

export const luaApiDocsRuntime: Record<string, ApiDoc> = {
    'time': {
        desc: 'Время с момента включения коптера.',
        syntax: 'time()',
        params: 'none',
        returns: 'seconds (число)',
        example: 'local started = time()\nTimer.callLater(2, function()\n    print("прошло, с:", time() - started)\nend)',
        kind: 'Function',
        insertText: 'time()'
    },
    'launchTime': {
        desc: 'Время запуска навигационной системы, с которым синхронизировано локальное время коптера. В симуляторе всегда 0.',
        syntax: 'launchTime()',
        params: 'none',
        returns: 'seconds (число)',
        example: 'local t0 = launchTime()\nprint("время запуска:", t0)',
        kind: 'Function',
        insertText: 'launchTime()'
    },
    'deltaTime': {
        desc: 'Разница в секундах между локальным временем коптера time() и глобальным временем навигационной системы. Нужна для Timer.callAtGlobal: глобальное время = time() + deltaTime(). В симуляторе возвращает постоянное значение 0.05.',
        syntax: 'deltaTime()',
        params: 'none',
        returns: 'seconds (число)',
        example: 'local globalNow = time() + deltaTime()  -- глобальное время',
        kind: 'Function',
        insertText: 'deltaTime()'
    },
    'sleep': {
        desc: 'Блокирующая пауза (не рекомендуется).',
        syntax: 'sleep(seconds)',
        params: 'seconds (число)',
        returns: 'nil',
        example: 'print("раз")\nsleep(1.5)  -- программа стоит 1.5 с (лучше использовать Timer)\nprint("два")',
        kind: 'Function',
        insertText: 'sleep(${1:seconds})'
    },
    'boardNumber': {
        desc: 'Идентификационный номер борта. Это переменная, а не функция: пишется без скобок. В симуляторе её значение — строка "SIMULATOR".',
        syntax: 'boardNumber',
        params: 'none',
        returns: 'номер борта',
        example: 'local id = boardNumber\nprint("борт:", id)',
        kind: 'Variable',
        insertText: 'boardNumber'
    },

    // Снимок с бортовой камеры. Коды ответа — как в документации на железо
    // (modules/lua/hardware/camera.ts): -1 — ждём, 0 — готово, 1 — ошибка;
    // симулятор принимает запрос сразу и -1 не отдаёт.
    'camera.requestMakeShot': {
        desc: 'Запрос снимка с камеры. Возвращает управление сразу, кадр сохраняется асинхронно.',
        syntax: 'camera.requestMakeShot()',
        params: 'none',
        returns: 'nil',
        example: 'camera.requestMakeShot()',
        kind: 'Method',
        insertText: 'requestMakeShot()'
    },
    'camera.checkRequestShot': {
        desc: 'Ответ на запрос снимка: -1 — ещё готовится, 0 — сохранён, 1 — ошибка.',
        syntax: 'camera.checkRequestShot()',
        params: 'none',
        returns: 'number (-1, 0 или 1)',
        example: 'while camera.checkRequestShot() == -1 do end',
        kind: 'Method',
        insertText: 'checkRequestShot()'
    },

    'Gpio.new': {
        desc: 'Создать объект порта ввода-вывода (GPIO) для одного вывода платы.',
        syntax: 'Gpio.new(port, pin, mode)',
        params: 'port (Gpio.A … Gpio.E), pin (номер вывода порта), mode (Gpio.INPUT, Gpio.OUTPUT или альтернативная функция)',
        returns: 'объект gpio',
        example: 'local pin = Gpio.new(Gpio.A, 1, Gpio.OUTPUT)',
        kind: 'Method',
        insertText: 'new(${1:Gpio.A}, ${2:pin}, ${3:Gpio.OUTPUT})'
    },
    'Gpio.read': {
        desc: 'Прочитать текущее значение вывода.',
        syntax: 'gpio:read()',
        params: 'нет',
        returns: 'значение вывода',
        example: 'local value = pin:read()',
        kind: 'Method',
        insertText: 'read()'
    },
    'Gpio.set': {
        desc: 'Установить на выводе единицу (высокий уровень).',
        syntax: 'gpio:set()',
        params: 'нет',
        returns: 'nil',
        example: 'pin:set()',
        kind: 'Method',
        insertText: 'set()'
    },
    'Gpio.reset': {
        desc: 'Установить на выводе ноль (низкий уровень).',
        syntax: 'gpio:reset()',
        params: 'нет',
        returns: 'nil',
        example: 'pin:reset()',
        kind: 'Method',
        insertText: 'reset()'
    },
    'Gpio.write': {
        desc: 'Записать значение на вывод.',
        syntax: 'gpio:write(value)',
        params: 'value (true/false или 1/0)',
        returns: 'nil',
        example: 'pin:write(true)',
        kind: 'Method',
        insertText: 'write(${1:value})'
    },
    'Gpio.setFunction': {
        desc: 'Выбрать альтернативную функцию вывода по номеру.',
        syntax: 'gpio:setFunction(num)',
        params: 'num (номер альтернативной функции)',
        returns: 'nil',
        example: 'pin:setFunction(1)',
        kind: 'Method',
        insertText: 'setFunction(${1:num})'
    },
    'Uart.new': {
        desc: 'Создать и инициализировать UART на плате. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'Uart.new(num, rate, parity, stopBits)',
        params: 'num (номер UART), rate (скорость, бод), parity (Uart.PARITY_NONE, Uart.PARITY_EVEN, Uart.PARITY_ODD; по умолчанию PARITY_NONE), stopBits (Uart.ONE_STOP, Uart.TWO_STOP; по умолчанию ONE_STOP)',
        returns: 'объект uart',
        example: 'local uart = Uart.new(1, 115200)',
        kind: 'Method',
        insertText: 'new(${1:num}, ${2:115200})'
    },
    'Uart.read': {
        desc: 'Прочитать указанное число байт. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'uart:read(size)',
        params: 'size (сколько байт прочитать)',
        returns: 'прочитанные данные',
        example: 'local data = uart:read(10)',
        kind: 'Method',
        insertText: 'read(${1:size})'
    },
    'Uart.write': {
        desc: 'Отправить данные (data) длиной size байт. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'uart:write(data, size)',
        params: 'data (строка), size (число байт)',
        returns: 'nil',
        example: 'uart:write("hello", 5)',
        kind: 'Method',
        insertText: 'write(${1:data}, ${2:size})'
    },
    'Uart.bytesToRead': {
        desc: 'Сколько байт уже получено и ждёт чтения. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'uart:bytesToRead()',
        params: 'нет',
        returns: 'число байт',
        example: 'if uart:bytesToRead() > 0 then\n    local data = uart:read(uart:bytesToRead())\n    print(data)\nend',
        kind: 'Method',
        insertText: 'bytesToRead()'
    },
    'Uart.setBaudRate': {
        desc: 'Изменить скорость обмена UART.',
        syntax: 'uart:setBaudRate(rate)',
        params: 'rate (скорость, бод)',
        returns: 'nil',
        example: 'uart:setBaudRate(9600)',
        kind: 'Method',
        insertText: 'setBaudRate(${1:rate})'
    },
    'Spi.new': {
        desc: 'Создать и инициализировать SPI на плате. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'Spi.new(num, rate, seq, mode)',
        params: 'num (номер SPI), rate (скорость), seq (порядок битов: Spi.MSB, Spi.LSB, Spi.MSB_16, Spi.LSB_16; по умолчанию MSB), mode (Spi.MODE0 … Spi.MODE3; по умолчанию MODE0)',
        returns: 'объект spi',
        example: 'local spi = Spi.new(2, 1000000)',
        kind: 'Method',
        insertText: 'new(${1:num}, ${2:rate})'
    },
    'Spi.read': {
        desc: 'Прочитать указанное число байт. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'spi:read(size)',
        params: 'size (сколько байт прочитать)',
        returns: 'прочитанные данные',
        example: 'local data = spi:read(4)',
        kind: 'Method',
        insertText: 'read(${1:size})'
    },
    'Spi.write': {
        desc: 'Отправить данные (data) длиной size байт. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'spi:write(data, size)',
        params: 'data (строка), size (число байт)',
        returns: 'nil',
        example: 'spi:write("abc", 3)',
        kind: 'Method',
        insertText: 'write(${1:data}, ${2:size})'
    },
    'Spi.exchange': {
        desc: 'Отправить данные (data) длиной size байт и одновременно получить столько же байт. В симуляторе к дрону ничего не подключено: команда принимается, но данных не приходит.',
        syntax: 'spi:exchange(data, size)',
        params: 'data (строка), size (число байт)',
        returns: 'полученные данные',
        example: 'local answer = spi:exchange("hello", 5)',
        kind: 'Method',
        insertText: 'exchange(${1:data}, ${2:size})'
    },
    'mailbox.connect': {
        desc: 'Подключиться к устройству по адресу и порту (обмен сообщениями между дронами и пультом). В симуляторе сети нет: вызов только проверяет аргументы и сообщает об успехе.',
        syntax: 'mailbox.connect(ip, port)',
        params: 'ip (строка, адрес устройства), port (число, рекомендуется 8889)',
        returns: 'hull, message (бортномер и сообщение о подключении)',
        example: 'local hull, message = mailbox.connect("192.168.0.100", 8889)',
        kind: 'Method',
        insertText: 'connect(${1:"192.168.0.100"}, ${2:8889})'
    },
    'mailbox.hasMessages': {
        desc: 'Проверить, пришли ли новые сообщения.',
        syntax: 'mailbox.hasMessages()',
        params: 'нет',
        returns: 'true или false',
        example: 'local has = mailbox.hasMessages()',
        kind: 'Method',
        insertText: 'hasMessages()'
    },
    'mailbox.myHullNumber': {
        desc: 'Узнать бортовой номер этого дрона.',
        syntax: 'mailbox.myHullNumber()',
        params: 'нет',
        returns: 'бортномер (число)',
        example: 'local my = mailbox.myHullNumber()',
        kind: 'Method',
        insertText: 'myHullNumber()'
    },
    'mailbox.receive': {
        desc: 'Принять одно сообщение. Если сообщений нет, возвращает -1. В симуляторе вызов никогда не блокирует программу: аргумент blocking не ждёт сообщения.',
        syntax: 'mailbox.receive(blocking)',
        params: 'blocking (true: ждать сообщения; false: сразу вернуть сообщение из буфера или -1)',
        returns: 'hull, message (бортномер отправителя и сообщение)',
        example: 'local hull, message = mailbox.receive(false)',
        kind: 'Method',
        insertText: 'receive(${1:false})'
    },
    'mailbox.send': {
        desc: 'Отправить сообщение другому дрону. Если hull меньше нуля, сообщение получат все известные устройства.',
        syntax: 'mailbox.send(hull, message)',
        params: 'hull (бортномер получателя), message (число или строка)',
        returns: 'true',
        example: 'mailbox.send(42, "Hello")\nmailbox.send(-1, "Hello all")',
        kind: 'Method',
        insertText: 'send(${1:hull}, ${2:message})'
    },
    'mailbox.setHullNumber': {
        desc: 'Установить новый бортовой номер этому дрону.',
        syntax: 'mailbox.setHullNumber(hull)',
        params: 'hull (новый бортномер, число)',
        returns: 'true',
        example: 'mailbox.setHullNumber(12)',
        kind: 'Method',
        insertText: 'setHullNumber(${1:hull})'
    }
};
