import { compileAcademyExercise, type AcademyCodeExercise } from './shared.js';

const exercises: AcademyCodeExercise[] = [
    {
        number: 28, waitMs: 3400,
        task: 'Покажите синий, зелёный, красный на LED 0 с интервалом в одну секунду. В Lua таймеры отсчитывают время от регистрации, в Python паузы стоят между действиями.',
        observation: 'Все три цвета действительно заданы в нужном порядке; между изменениями прошло не менее 0.8 секунды времени симуляции.',
        hint: 'Lua: синий сразу, зелёный через 1, красный через 2 секунды. Python: sleep(1) между соседними командами. Последний цвет не доказывает весь порядок.',
        experiment: 'Уменьшите интервалы до 0.1 секунды. Почему журнал видит то, что глаз различает с трудом?',
        question: 'Где нужен интервал для различимых трёх цветов?', right: 'Между соседними изменениями', wrong: 'Только после последнего цвета', feedback: 'Пауза после финала не делает предыдущие цвета различимыми. Время показа относится к каждому промежуточному состоянию.',
        lua: 'leds:set(0,0,0,1)\nTimer.callLater(1, function() leds:set(0,0,1,0) end)\nTimer.callLater(___, function() leds:set(0,1,0,0) end)',
        python: 'pioneer.led_control(0,0,0,255)\ntime.sleep(___)\npioneer.led_control(0,0,255,0)\ntime.sleep(1)\npioneer.led_control(0,255,0,0)', luaAnswer: '2', pythonAnswer: '1'
    },
    {
        number: 29, waitMs: 2500,
        task: 'Через одну секунду включите синий LED 0 и затем выведите «Сигнал». До задержки сигнал должен отсутствовать.',
        observation: 'Синий появился после ожидания. Сообщение находится после соответствующего светового действия.',
        hint: 'Lua: оба действия внутри Timer.callLater(1,...). Python: сначала time.sleep(1), затем LED и print. Регистрация таймера сама не выполняет его тело.',
        experiment: 'Вынесите print перед задержкой и объясните замечание проверки.',
        question: 'Когда выполняется тело Timer.callLater?', right: 'После заданного интервала', wrong: 'Немедленно при регистрации', feedback: 'Таймер планирует будущую работу. Чтобы сообщение подтверждало её, оно должно выполняться вместе с отложенным действием.',
        lua: 'Timer.callLater(___, function()\n    leds:set(0,0,0,1)\n    print("Сигнал")\nend)',
        python: 'time.sleep(___)\npioneer.led_control(0,0,0,255)\nprint("Сигнал")', luaAnswer: '1', pythonAnswer: '1'
    },
    {
        number: 30, waitMs: 3300,
        task: 'Получите синий в момент 1 секунды и зелёный в момент 2 секунд от начала опыта. Учитывайте разницу независимых таймеров и последовательных пауз.',
        observation: 'Первый сигнал появился около t=1, второй около t=2, а не t=3.',
        hint: 'В Lua второй независимый таймер получает 2. В Python после первой секундной паузы до второго сигнала нужна ещё 1 секунда.',
        experiment: 'Поставьте второй Python sleep(2). Почему общий момент второго сигнала станет 3 секунды?',
        question: 'Два последовательных sleep(1) и sleep(2) дадут второй сигнал когда?', right: 'Через 3 секунды', wrong: 'Через 2 секунды', feedback: 'Последовательные паузы складываются. Независимые таймеры отсчитывают интервалы от времени своего создания.',
        lua: 'Timer.callLater(1, function() leds:set(0,0,0,1) end)\nTimer.callLater(___, function() leds:set(0,0,1,0) end)',
        python: 'time.sleep(1)\npioneer.led_control(0,0,0,255)\ntime.sleep(___)\npioneer.led_control(0,0,255,0)', luaAnswer: '2', pythonAnswer: '1'
    },
    {
        number: 31, waitMs: 3800,
        task: 'Сделайте три полных синих мигания: полсекунды свет и полсекунды темнота. После третьего мигания LED должен быть выключен.',
        observation: 'Журнал содержит шесть чередующихся действий и три полные светлые фазы примерно по 0.5 секунды.',
        hint: 'Полный период включает включение и выключение. В Lua цикл регистрирует пары таймеров i и i+0.5; в Python цикл делает две паузы по 0.5.',
        experiment: 'Оставьте свет 0.2, темноту 0.8. Что осталось прежним, а что изменилось в ритме?',
        question: 'Какой период у мигания 0.5 секунды свет + 0.5 темнота?', right: 'Одна секунда', wrong: 'Половина секунды', feedback: 'Период — время полного повторения. Обе фазы принадлежат одному миганию.',
        lua: 'for i=0,2 do\n    Timer.callLater(i, function() leds:set(0,0,0,1) end)\n    Timer.callLater(i+___, function() leds:set(0,0,0,0) end)\nend',
        python: 'for i in range(3):\n    pioneer.led_control(0,0,0,255)\n    time.sleep(___)\n    pioneer.led_control(0,0,0,0)\n    time.sleep(0.5)', luaAnswer: '0.5', pythonAnswer: '0.5'
    },
    {
        number: 32, waitMs: 1600,
        task: 'После подтверждения подготовки выведите «готовность». Lua получает ENGINES_STARTED в callback, Python проверяет успешный результат arm.',
        observation: 'Подготовка реально принята, запись «готовность» появилась после неё. Дрон остаётся на земле.',
        hint: 'Тело Lua callback вызывается автопилотом, а не только определением функции. В Python if pioneer.arm() проверяет результат вызова.',
        experiment: 'Уберите команду подготовки. Почему одно определение обработчика не доставляет событие?',
        question: 'Кто вызывает Lua callback при подтверждении?', right: 'Автопилот, сообщая о событии', wrong: 'Любое определение функции запускает её само', feedback: 'Обработчик описывает реакцию. Реальное событие — причина его вызова.',
        lua: 'ap.push(Ev.MCE_PREFLIGHT)\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        print("___")\n    end\nend',
        python: 'if pioneer.arm():\n    print("___")', luaAnswer: 'готовность', pythonAnswer: 'готовность'
    },
    {
        number: 33, waitMs: 1600,
        task: 'Включайте зелёный только после подтверждения подготовки. Восстановите нужное имя события Lua или состояние Python.',
        observation: 'Есть принятый arm и зелёный после него. При исходном IDLE зелёный не включался.',
        hint: 'Lua сравнивает event с Ev.ENGINES_STARTED. Python get_autopilot_state() возвращает ARMED после подготовки; это имя SDK, соответствующее PREFLIGHT сцены.',
        experiment: 'Подставьте другое событие или состояние. Почему зелёный не появляется?',
        question: 'Зачем обработчику проверять имя события?', right: 'Чтобы выполнить действие только для нужного подтверждения', wrong: 'Любое уведомление всегда означает готовность', feedback: 'Автопилот сообщает о разных этапах. Фильтр связывает реакцию с конкретным событием или состоянием.',
        lua: 'ap.push(Ev.MCE_PREFLIGHT)\nfunction callback(event)\n    if event == Ev.___ then\n        leds:set(0,0,1,0)\n        print("готовность")\n    end\nend',
        python: 'pioneer.arm()\nif pioneer.get_autopilot_state() == "___":\n    pioneer.led_control(0,0,255,0)\n    print("готовность")', luaAnswer: 'ENGINES_STARTED', pythonAnswer: 'ARMED'
    },
    {
        number: 34, waitMs: 1800,
        task: 'Сохраните этап в переменной phase. Напечатайте «этап:ожидание» до подготовки и «этап:готовность» после подтверждения, обновляя одну переменную.',
        observation: 'Две записи показывают переход этапа; между ними есть настоящая подготовка аппарата.',
        hint: 'Переменная phase хранит текущий этап программы. В Lua callback меняет уже объявленную переменную, в Python изменение идёт после arm.',
        experiment: 'Не обновляйте phase после arm. Что потеряется в отчёте, хотя подготовка выполнится?',
        question: 'Зачем программе помнить свой этап?', right: 'Чтобы связывать реакции с текущим ходом миссии', wrong: 'Имя переменной само управляет автопилотом', feedback: 'Состояние программы хранится в данных. Команды и обработчики используют его, чтобы выбрать дальнейшее действие.',
        lua: 'local phase="ожидание"\nprint("этап:" .. phase)\nap.push(Ev.MCE_PREFLIGHT)\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        phase="___"\n        print("этап:" .. phase)\n    end\nend',
        python: 'phase="ожидание"\nprint("этап:" + phase)\npioneer.arm()\nphase="___"\nprint("этап:" + phase)', luaAnswer: 'готовность', pythonAnswer: 'готовность'
    },
    {
        number: 35, waitMs: 2500,
        task: 'В заготовке готовность намеренно не наступит: arm отсутствует. Завершите ограниченное ожидание через одну секунду сообщением «тайм-аут».',
        observation: 'Программа не зависла. Через ограниченный интервал появился «тайм-аут», аппарат остался IDLE.',
        hint: 'В Lua таймер проверит ready позже. В Python monotonic() даёт время для сравнения с deadline; sleep(0.05) оставляет время симулятору. Не отправляйте arm в этом опыте.',
        experiment: 'Увеличьте предел до двух секунд и сравните момент сообщения.',
        question: 'Что делать, если подтверждение не пришло?', right: 'Ограничить ожидание и сообщить причину', wrong: 'Ждать бесконечно без сообщения', feedback: 'Тайм-аут даёт программе определённый исход, когда ожидаемое событие не наступает.',
        lua: 'local ready=false\nTimer.callLater(___, function()\n    if not ready then print("тайм-аут") end\nend)',
        python: 'ready=False\ndeadline=time.monotonic()+___\nwhile not ready and time.monotonic()<deadline:\n    time.sleep(0.05)\nif not ready:\n    print("тайм-аут")', luaAnswer: '1', pythonAnswer: '1'
    },
    {
        number: 36, waitMs: 2700,
        task: 'Свяжите зелёный сигнал с подтверждением подготовки, сохранив тайм-аут на случай отсутствия подтверждения. Выведите «готовность» только в успешной ветке.',
        observation: 'Одна подготовка принята, зелёный и «готовность» появились после неё. Ложного «тайм-аут» в успешном запуске нет.',
        hint: 'В Lua ready становится true внутри ENGINES_STARTED, а таймер проверяет его через 1.5 секунды. Python опрашивает состояние до deadline и различает ARMED и истёкшее ожидание.',
        experiment: 'Уберите arm и проверьте запасную ветку: должен появиться тайм-аут, а не зелёный.',
        question: 'Чем ожидание условия лучше угадывания готовности по паузе?', right: 'Оно проверяет подтверждение и ограничивает ожидание', wrong: 'Любая достаточно длинная пауза гарантирует готовность', feedback: 'Процесс может не завершиться. Подтверждение отличает успех, а тайм-аут обеспечивает понятный неуспех.',
        lua: 'local ready=false\nap.push(Ev.MCE_PREFLIGHT)\nfunction callback(event)\n    if event == Ev.ENGINES_STARTED then\n        ready=___\n        leds:set(0,0,1,0)\n        print("готовность")\n    end\nend\nTimer.callLater(1.5,function()\n    if not ready then print("тайм-аут") end\nend)',
        python: 'pioneer.arm()\ndeadline=time.monotonic()+1.5\nwhile pioneer.get_autopilot_state()!="ARMED" and time.monotonic()<deadline:\n    time.sleep(0.05)\nif pioneer.get_autopilot_state()=="___":\n    pioneer.led_control(0,0,255,0)\n    print("готовность")\nelse:\n    print("тайм-аут")', luaAnswer: 'true', pythonAnswer: 'ARMED'
    }
];

export function getTimeAcademyPractices(language: 'lua' | 'python') {
    return exercises.map(exercise => compileAcademyExercise(exercise, language));
}
