import { compileAcademyExercise, type AcademyCodeExercise } from './shared.js';

export const TELEMETRY_FLIGHTS = [
    { number: 64, points: [[2, 0, 1]] }, { number: 65, points: [[0, 0, 2]] },
    { number: 67, points: [[0, 0, 2]] }, { number: 68, points: [[2, 0, 1]] },
    { number: 72, points: [[1, 1, 1]], land: true }
];

const waitPython = `def wait_for(test,limit=60):
    deadline=time.monotonic()+limit
    while time.monotonic()<deadline:
        if test(): return
        time.sleep(0.05)
    raise RuntimeError("тайм-аут")
`;
const reportLua = 'local x,y,z=Sensors.lpsPosition(); print("Положение: "..x..","..y..","..z)';
const reportPython = 'x,y,z=pioneer.get_local_position_lps(); print("Положение:",x,y,z)';
function flight(number: number, language: 'lua' | 'python'): string {
    const p = TELEMETRY_FLIGHTS.find(item => item.number === number)!.points[0].join(',');
    const poll = [65, 67, 68].includes(number);
    if (language === 'lua') {
        const watch = number === 65 ? 'print("Высота: "..z)' : number === 67 ? 'if z>=___ then leds:set(0,0,1,0) end' : 'print("Ошибка X: "..(___-x))';
        const period = number === 65 ? '___' : number === 67 ? '0.1' : '0.5';
        return `local finished=false
local count=0
${[64, 72].includes(number) ? reportLua : ''}
${poll ? `function measure()
    if finished or count>=300 then return end
    count=count+1
    local x,y,z=Sensors.lpsPosition()
    ${watch}
    Timer.callLater(${period},measure)
end` : ''}
ap.push(Ev.MCE_PREFLIGHT)
function callback(event)
    if event==Ev.ENGINES_STARTED then ap.push(Ev.MCE_TAKEOFF) end
    if event==Ev.TAKEOFF_COMPLETE then
        ${number === 64 ? reportLua : number === 72 ? 'print("___: 1,1,1")' : ''}
        ap.goToLocalPoint(${number === 64 ? '___,0,1' : p})
        ${poll ? 'measure()' : ''}
    end
    if event==Ev.POINT_REACHED then
        finished=true
        ${[64, 72].includes(number) ? reportLua : ''}
        ${number === 72 ? 'ap.push(Ev.MCE_LANDING)' : 'print("Опыт завершён")'}
    end
    ${number === 72 ? `if event==Ev.COPTER_LANDED then ${reportLua}; print("Опыт завершён") end` : ''}
end`;
    }
    const watch = number === 65 ? 'print("Высота:",z)' : number === 67 ? 'if z>=___: pioneer.led_control(0,0,255,0)' : 'print("Ошибка X:",___-x)';
    const period = number === 65 ? '___' : number === 67 ? '0.1' : '0.5';
    return `${waitPython}
${[64, 72].includes(number) ? reportPython : ''}
pioneer.arm(); pioneer.takeoff()
wait_for(lambda:pioneer.get_autopilot_state()=="MISSION")
${number === 64 ? reportPython : number === 72 ? 'print("___: 1,1,1")' : ''}
pioneer.go_to_local_point(${number === 64 ? '___,0,1' : p})
${poll ? `deadline=time.monotonic()+60
while not pioneer.point_reached() and time.monotonic()<deadline:
    x,y,z=pioneer.get_local_position_lps()
    ${watch}
    time.sleep(${period})` : 'wait_for(pioneer.point_reached)'}
${[64, 72].includes(number) ? reportPython : ''}
${number === 72 ? `pioneer.land()
wait_for(lambda:pioneer.get_autopilot_state()=="DISARMED")
${reportPython}` : ''}
print("Опыт завершён")`;
}

type LessonInput = Omit<AcademyCodeExercise, 'lua' | 'python' | 'luaAnswer' | 'pythonAnswer'> & { answer: string; lua?: string; python?: string };
const exercises: LessonInput[] = [
    { number: 64, answer: '2', task: 'Прочитайте положение до arm, после взлёта и после прибытия к (2,0,1). Дополните целевой X, не подменяя измерения целевыми числами.',
        observation: 'Три измерения показывают землю, завершённый подъём и достигнутую точку.', hint: 'Lua Sensors.lpsPosition() возвращает x,y,z; Python get_local_position_lps() — три компоненты. Вызывайте чтение заново на каждом этапе.',
        experiment: 'Почему измерение после взлёта отличается от последующей цели?', question: 'Что показывает телеметрия положения?', right: 'Измеренное текущее положение', wrong: 'Только последнюю отправленную цель', feedback: 'Намерение и измеренный результат — разные данные.' },
    { number: 65, answer: '0.2', task: 'Во время подъёма к Z=2 выводите измеренную высоту сначала каждые 0.2 секунды, затем повторите с периодом 0.8. Сравните плотность наблюдений.',
        observation: 'Подтверждены два периода реальных чтений положения во время движения.', hint: 'Меньший период даёт больше измерений. Меняйте только интервал Timer.callLater / time.sleep внутри опроса; это секунды, не частота в герцах.',
        experiment: 'Какой период соответствует пяти измерениям в секунду?', question: 'При каком периоде записей больше?', right: '0.2 секунды', wrong: '0.8 секунды', feedback: 'Частота обратно пропорциональна периоду.' },
    { number: 66, answer: 'nil', waitMs: 2000,
        task: 'measurement намеренно недоступно (nil/None). Добавьте проверку перед сравнением и выведите «Нет данных» без полётных команд.', observation: 'Отсутствие измерения не заменяется нулём и не вызывает ошибки сравнения.',
        hint: 'Это контролируемая заготовка отказа, а не отключение датчика. Lua сравнивает с nil, Python с None через is. В ветке отсутствия не оцениваем высоту.', experiment: 'Замените measurement числом 0: почему это другой исход?',
        question: 'Отсутствие измерения и высота 0 — одно?', right: 'Нет, ноль является доступным числом', wrong: 'Да, отсутствие всегда означает землю', feedback: 'Сначала проверяем доступность, затем используем значение.',
        lua: 'local measurement=nil\nif measurement==___ then print("Нет данных")\nelseif measurement<0.2 then print("На земле") end', python: 'measurement=None\nif measurement is ___: print("Нет данных")\nelif measurement<0.2: print("На земле")' },
    { number: 67, answer: '1.8', task: 'Летите к Z=2 и включайте зелёный только когда новое измерение Z достигло 1.8. Период опроса — 0.1 секунды.', observation: 'Первая зелёная команда следует за реальным измерением Z≥1.8.',
        hint: 'Сравнивайте новое измерение с порогом. Отправленная цель Z=2 ещё не доказывает набранную высоту. Проверка сопоставляет чтение перед сигналом.', experiment: 'Поставьте порог выше цели: почему готовность не появится?',
        question: 'Какое число сравниваем с порогом?', right: 'Новое измерение высоты', wrong: 'Отправленную высоту цели', feedback: 'Условие по результату не заменяется условием по намерению.' },
    { number: 68, answer: '2', task: 'Во время движения к X=2 выводите подписанную ошибку «Ошибка X:» как цель минус измеренное X.', observation: 'Ошибка положительна в начале и уменьшается к нулю при подходе.',
        hint: 'Не берите модуль: здесь знак показывает направление. Новое значение X читается внутри каждого шага опроса.', experiment: 'Вычислите ошибку при X=1,2,3 для цели 2.',
        question: 'При цели X=2 и измерении X=3 ошибка равна…', right: '-1', wrong: '+1', feedback: 'Разность цель минус измерение сохраняет сторону цели.' },
    { number: 69, answer: '0.1', waitMs: 2000,
        task: 'На учебных ошибках -0.04,0.03,-0.02,0.2,-0.2 примените допуск 0.1. Выведите 0 внутри зоны, +1 справа и -1 слева.', observation: 'Получаются отдельные решения 0,0,0,1,-1; мелкие колебания не переключают направление.',
        hint: 'Это набор данных для отладки решения без полёта. Сначала сравните модуль с допуском, затем выбирайте знак.', experiment: 'Добавьте ровно ±0.1 и объясните границу.',
        question: 'Что делает зона допуска?', right: 'Прекращает коррекцию при небольшой ошибке', wrong: 'Усиливает любую малую ошибку', feedback: 'Область спокойствия отделяет малое отклонение от команды коррекции.',
        lua: 'for _,err in ipairs({-0.04,0.03,-0.02,0.2,-0.2}) do\n    local command=0\n    if math.abs(err)>___ then command=err>0 and 1 or -1 end\n    print(command)\nend', python: 'for err in [-0.04,0.03,-0.02,0.2,-0.2]:\n    command=0\n    if abs(err)>___: command=1 if err>0 else -1\n    print(command)' },
    { number: 70, answer: '0.4', waitMs: 2000,
        task: 'Ограничьте вычисленную скорость диапазоном [-0.4,0.4]. Для ошибок -10,0,10 и коэффициента 0.5 выведите три результата без движения аппарата.', observation: 'Команды равны -0.4,0,0.4, хотя необрезанные значения были -5,0,5.',
        hint: 'Сначала умножаем ошибку на коэффициент, затем max(-limit,min(limit,value)). Отлаживаем расчёт до подключения моторов.', experiment: 'Добавьте ошибку 0.2: почему результат 0.1 не должен стать 0.4?',
        question: 'Что происходит с уже допустимой командой?', right: 'Её величина сохраняется', wrong: 'Она всегда заменяется максимумом', feedback: 'Ограничение обрезает только выход за границы.',
        lua: 'local limit=___\nfor _,err in ipairs({-10,0,10}) do\n    print(math.max(-limit,math.min(limit,err*0.5)))\nend', python: 'limit=___\nfor err in [-10,0,10]:\n    print(max(-limit,min(limit,err*0.5)))' },
    { number: 71, answer: '0.15', waitMs: 3500,
        task: 'Без arm проверьте два исхода: цель X=0 совпадает со стартом; цель X=100 за секунду не достигается. Выведите «Цель достигнута», затем «тайм-аут».', observation: 'Успех использует реальное положение; второй исход появляется после ограниченного ожидания.',
        hint: 'Мы намеренно не отправляем движение. Этот опыт проверяет диагностику ожидания, а не дальний маршрут.', experiment: 'Замените первую цель на 100: какое сообщение должно измениться?',
        question: 'Что сохраняем при неудачном ожидании?', right: 'Причину и этап остановки', wrong: 'Всегда сообщаем об успехе', feedback: 'Диагностика различает достижение цели и истечение срока.',
        lua: 'local x=Sensors.lpsPosition()\nif math.abs(0-x)<___ then print("Цель достигнута") end\nTimer.callLater(1,function()\n    local x=Sensors.lpsPosition()\n    if math.abs(100-x)>=0.15 then print("тайм-аут") end\n    print("Опыт завершён")\nend)',
        python: 'x,y,z=pioneer.get_local_position_lps()\nif abs(0-x)<___: print("Цель достигнута")\ndeadline=time.monotonic()+1\nwhile time.monotonic()<deadline:\n    x,y,z=pioneer.get_local_position_lps()\n    if abs(100-x)<0.15: break\n    time.sleep(0.05)\nelse:\n    print("тайм-аут")\nprint("Опыт завершён")' },
    { number: 72, answer: 'Цель', task: 'Выполните полёт к (1,1,1) с посадкой и запишите положение старта, цель, измеренное прибытие и положение после остановки. Дополните подпись цели.',
        observation: 'Отчёт содержит намерение перед движением и реальные измерения трёх этапов.', hint: 'Заготовка читает положение заново в каждом этапе. Цель подписывается отдельно от измеренного результата; одной строки «успех» мало.',
        experiment: 'Сравните заданную и измеренную точки: укладывается ли разность в допуск?', question: 'Чем подкрепляется вывод «миссия выполнена»?', right: 'Измерениями и подтверждениями всех этапов', wrong: 'Одной заранее напечатанной строкой', feedback: 'Отчёт связывает план с наблюдаемым результатом.' }
];

export function getTelemetryAcademyPractices(language: 'lua' | 'python') {
    return exercises.map(exercise => {
        const lesson = compileAcademyExercise({ ...exercise, lua: exercise.lua ?? flight(exercise.number, 'lua'), python: exercise.python ?? flight(exercise.number, 'python'),
            luaAnswer: exercise.answer, pythonAnswer: exercise.number === 66 ? 'None' : exercise.answer, waitMs: exercise.waitMs ?? 90000 }, language);
        if (TELEMETRY_FLIGHTS.some(item => item.number === exercise.number) || exercise.number === 71) lesson.academy!.doneMessage = 'Опыт завершён';
        lesson.academy!.teaching.device = `${lesson.summary} ${exercise.hint} ${exercise.observation}`;
        lesson.links = [{ label: 'Измерение положения', query: language === 'lua' ? 'Sensors.lpsPosition' : 'get_local_position_lps' }];
        return lesson;
    });
}
