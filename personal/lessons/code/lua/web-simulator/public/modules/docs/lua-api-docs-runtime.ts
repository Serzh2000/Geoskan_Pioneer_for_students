import type { ApiDoc } from './api-docs-types.js';

export const luaApiDocsRuntime: Record<string, ApiDoc> = {
    'time': {
        desc: 'Время с момента включения коптера.',
        syntax: 'time()',
        params: 'none',
        returns: 'seconds (число)',
        example: 'local t = time()',
        kind: 'Function',
        insertText: 'time()'
    },
    'launchTime': { desc: 'Время с момента взлета коптера.', syntax: 'launchTime()', returns: 'seconds', kind: 'Function', insertText: 'launchTime()' },
    'deltaTime': {
        desc: 'Время, прошедшее с предыдущего кадра.',
        syntax: 'deltaTime()',
        params: 'none',
        returns: 'seconds (число)',
        example: 'local dt = deltaTime()',
        kind: 'Function',
        insertText: 'deltaTime()'
    },
    'sleep': {
        desc: 'Блокирующая пауза (не рекомендуется).',
        syntax: 'sleep(seconds)',
        params: 'seconds (число)',
        returns: 'nil',
        example: 'sleep(1.5)',
        kind: 'Function',
        insertText: 'sleep(${1:seconds})'
    },
    'boardNumber': { desc: 'Номер платы (коптера).', syntax: 'boardNumber()', returns: 'number', kind: 'Function', insertText: 'boardNumber()' },

    'Gpio.new': { desc: 'Создание GPIO.', kind: 'Method', insertText: 'new(${1:port}, ${2:pin}, ${3:mode})' },
    'Gpio.read': { desc: 'Чтение значения пина.', kind: 'Method', insertText: 'read()' },
    'Gpio.set': { desc: 'Установка пина в 1.', kind: 'Method', insertText: 'set()' },
    'Gpio.reset': { desc: 'Установка пина в 0.', kind: 'Method', insertText: 'reset()' },
    'Gpio.write': { desc: 'Запись значения на пин.', syntax: 'gpio:write(val)', kind: 'Method', insertText: 'write(${1:val})' },
    'Gpio.setFunction': { desc: 'Установка альтернативной функции пина.', kind: 'Method', insertText: 'setFunction(${1:func})' },

    'Uart.new': { desc: 'Инициализация UART.', kind: 'Method', insertText: 'new(${1:num}, ${2:rate})' },
    'Uart.read': { desc: 'Чтение из UART.', syntax: 'uart:read(bytes)', kind: 'Method', insertText: 'read(${1:bytes})' },
    'Uart.write': { desc: 'Запись в UART.', syntax: 'uart:write(data)', kind: 'Method', insertText: 'write(${1:data})' },
    'Uart.bytesToRead': { desc: 'Количество байт в буфере UART.', kind: 'Method', insertText: 'bytesToRead()' },
    'Uart.setBaudRate': { desc: 'Изменение скорости UART.', kind: 'Method', insertText: 'setBaudRate(${1:rate})' },

    'Spi.new': { desc: 'Создание SPI.', kind: 'Method', insertText: 'new(${1:num}, ${2:rate})' },
    'Spi.read': { desc: 'Чтение из SPI.', syntax: 'spi:read(count)', kind: 'Method', insertText: 'read(${1:count})' },
    'Spi.write': { desc: 'Запись в SPI.', syntax: 'spi:write(data)', kind: 'Method', insertText: 'write(${1:data})' },
    'Spi.exchange': { desc: 'Двусторонний обмен по SPI.', syntax: 'spi:exchange(data)', kind: 'Method', insertText: 'exchange(${1:data})' },

    'mailbox.connect': { desc: 'Подключение к почтовому ящику.', syntax: 'mailbox.connect(server)', kind: 'Method', insertText: 'connect(${1:server})' },
    'mailbox.hasMessages': { desc: 'Проверка наличия сообщений.', syntax: 'mailbox.hasMessages()', kind: 'Method', insertText: 'hasMessages()' },
    'mailbox.myHullNumber': { desc: 'Получение бортового номера из mailbox.', syntax: 'mailbox.myHullNumber()', kind: 'Method', insertText: 'myHullNumber()' },
    'mailbox.receive': { desc: 'Получение сообщения.', syntax: 'mailbox.receive([wait])', kind: 'Method', insertText: 'receive()' },
    'mailbox.send': { desc: 'Отправка сообщения.', syntax: 'mailbox.send(to, data)', kind: 'Method', insertText: 'send(${1:to}, ${2:data})' },
    'mailbox.setHullNumber': { desc: 'Установка бортового номера в mailbox.', syntax: 'mailbox.setHullNumber(num)', kind: 'Method', insertText: 'setHullNumber(${1:num})' }
};
