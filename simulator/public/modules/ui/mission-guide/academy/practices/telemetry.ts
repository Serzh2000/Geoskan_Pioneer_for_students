import { localize } from '../../book/localize.js';
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
/** The flight report (72) labels every stage; the reading lesson (64) keeps one label. */
const reportLuaAs = (label: string) => reportLua.replace('Положение', label);
const reportPythonAs = (label: string) => reportPython.replace('Положение', label);
function flight(number: number, language: 'lua' | 'python'): string {
    const p = TELEMETRY_FLIGHTS.find(item => item.number === number)!.points[0].join(',');
    const poll = [65, 67, 68].includes(number);
    if (language === 'lua') {
        const watch = number === 65 ? 'print("Высота: "..z)' : number === 67 ? 'if z>=___ then leds:set(0,0,1,0) end' : 'print("Ошибка X: "..(___-x))';
        const period = number === 65 ? '___' : number === 67 ? '0.1' : '0.5';
        return `local finished=false
local count=0
${number === 64 ? reportLua : number === 72 ? reportLuaAs('Старт') : ''}
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
        ${number === 64 ? reportLua : number === 72 ? reportLuaAs('Прибытие') : ''}
        ${number === 72 ? 'ap.push(Ev.MCE_LANDING)' : 'print("Опыт завершён")'}
    end
    ${number === 72 ? `if event==Ev.COPTER_LANDED then ${reportLuaAs('После посадки')}; print("Опыт завершён") end` : ''}
end`;
    }
    const watch = number === 65 ? 'print("Высота:",z)' : number === 67 ? 'if z>=___: pioneer.led_control(0,0,255,0)' : 'print("Ошибка X:",___-x)';
    const period = number === 65 ? '___' : number === 67 ? '0.1' : '0.5';
    return `${waitPython}
${number === 64 ? reportPython : number === 72 ? reportPythonAs('Старт') : ''}
pioneer.arm(); pioneer.takeoff()
wait_for(lambda:pioneer.get_autopilot_state()=="MISSION")
${number === 64 ? reportPython : number === 72 ? 'print("___: 1,1,1")' : ''}
pioneer.go_to_local_point(${number === 64 ? '___,0,1' : p})
${poll ? `deadline=time.monotonic()+60
while not pioneer.point_reached() and time.monotonic()<deadline:
    x,y,z=pioneer.get_local_position_lps()
    ${watch}
    time.sleep(${period})` : 'wait_for(pioneer.point_reached)'}
${number === 64 ? reportPython : number === 72 ? reportPythonAs('Прибытие') : ''}
${number === 72 ? `pioneer.land()
wait_for(lambda:pioneer.get_autopilot_state()=="DISARMED")
${reportPythonAs('После посадки')}` : ''}
print("Опыт завершён")`;
}

/** The texts of an exercise are written once for both languages; each language keeps only its own `<lua>`/`<py>` passages. */
function localizedExercise(exercise: LessonInput, language: 'lua' | 'python'): LessonInput {
    const keep = (text: string) => localize(text, language);
    return { ...exercise, task: keep(exercise.task), hint: keep(exercise.hint), experiment: keep(exercise.experiment), observation: keep(exercise.observation),
        question: keep(exercise.question), right: keep(exercise.right), wrong: keep(exercise.wrong), feedback: keep(exercise.feedback) };
}

type LessonInput = Omit<AcademyCodeExercise, 'lua' | 'python' | 'luaAnswer' | 'pythonAnswer'> & { answer: string; lua?: string; python?: string };
const exercises: LessonInput[] = [
    { number: 64, answer: '2', task: 'Заготовка читает положение трижды: до <lua>подготовки двигателей</lua><py>arm</py>, после взлёта и после прибытия к (2,0,1). Впишите вместо ___ целевой X точки (2,0,1); в строках «Положение:» должны быть измерения, а не целевые числа.',
        observation: 'Три измерения показывают землю, завершённый подъём и достигнутую точку.', hint: '<lua>Sensors.lpsPosition()</lua><py>get_local_position_lps()</py> возвращает x,y,z в метрах. Вызывайте чтение заново на каждом этапе.',
        experiment: 'Сравните Z после взлёта с Z следующей цели: совпадают ли они и почему измерение — не то же самое, что цель?', question: 'Что показывает телеметрия положения?', right: 'Измеренное текущее положение', wrong: 'Только последнюю отправленную цель', feedback: 'Намерение и измеренный результат — разные данные.' },
    { number: 65, answer: '0.2', task: 'Заготовка выводит измеренную высоту во время подъёма к Z=2. Впишите вместо ___ период 0.2 секунды и запустите проверку. Затем замените 0.2 на 0.8 и запустите проверку ещё раз.',
        observation: 'Подтверждены два периода реальных чтений положения во время движения.', hint: 'Меньший период даёт больше измерений. Меняйте только интервал <lua>Timer.callLater</lua><py>time.sleep</py> внутри опроса; это секунды между двумя измерениями.',
        experiment: 'Сколько измерений в секунду даёт период 0.5 секунды?', question: 'При каком периоде записей больше?', right: '0.2 секунды', wrong: '0.8 секунды', feedback: 'Частота обратно пропорциональна периоду.' },
    { number: 66, answer: 'nil', waitMs: 2000,
        task: 'Переменная measurement намеренно пуста: в ней нет измерения. Впишите вместо ___ специальное «пустое» значение, чтобы проверка отсутствия сработала до сравнения с числом. Выведите «Нет данных» без полётных команд.', observation: 'Программа выводит «Нет данных»: отсутствие измерения не заменяется нулём и не вызывает ошибки сравнения.',
        hint: 'Это контролируемая заготовка отказа, а не отключение датчика. <lua>В Lua отсутствие значения записывается словом nil; сравнивайте измерение с ним.</lua><py>В Python отсутствие значения — None; его сравнивают через is.</py> В ветке отсутствия не оцениваем высоту.', experiment: 'Замените measurement числом 0: почему это другой исход?',
        question: 'Отсутствие измерения и высота 0 — одно?', right: 'Нет, ноль является доступным числом', wrong: 'Да, отсутствие всегда означает землю', feedback: 'Сначала проверяем доступность, затем используем значение.',
        lua: 'local measurement=nil\nif measurement==___ then print("Нет данных")\nelseif measurement<0.2 then print("На земле") end', python: 'measurement=None\nif measurement is ___: print("Нет данных")\nelif measurement<0.2: print("На земле")' },
    { number: 67, answer: '1.8', task: 'Летите к Z=2 и включайте зелёный только когда новое измерение Z достигло порога. Впишите порог вместо ___ (значение указано в «Результате»). Период опроса — 0.1 секунды.', observation: 'Первая зелёная команда следует за реальным измерением Z≥1.8 (порог 1.8 м чуть ниже цели 2 м).',
        hint: 'Сравнивайте новое измерение с порогом. Отправленная цель Z=2 ещё не доказывает набранную высоту. Порог берут чуть ниже цели: дрон подходит к высоте плавно и редко замирает ровно в ней.', experiment: 'Поставьте порог выше цели: почему готовность не появится?',
        question: 'Какое число сравниваем с порогом?', right: 'Новое измерение высоты', wrong: 'Отправленную высоту цели', feedback: 'Условие по результату не заменяется условием по намерению.' },
    { number: 68, answer: '2', task: 'Во время движения к X=2 выводите подписанную ошибку «Ошибка X:» как цель минус измеренное X. Впишите вместо ___ целевое X.', observation: 'Ошибка положительна в начале и уменьшается к нулю при подходе.',
        hint: 'Не берите модуль: здесь знак показывает направление. Новое значение X читается внутри каждого шага опроса.', experiment: 'Вычислите ошибку при X=1,2,3 для цели 2.',
        question: 'При цели X=2 и измерении X=3 ошибка равна…', right: '-1', wrong: '+1', feedback: 'Разность цель минус измерение сохраняет сторону цели.' },
    { number: 69, answer: '0.1', waitMs: 2000,
        task: 'На учебных ошибках -0.04,0.03,-0.02,0.2,-0.2 примените допуск 0.1 (впишите его вместо ___). Выведите 0, если ошибка внутри зоны допуска, 1 — если ошибка больше допуска, -1 — если меньше минус допуска.', observation: 'Программа выводит пять строк: 0, 0, 0, 1, -1. Мелкие колебания не переключают направление.',
        hint: 'Это набор данных для отладки решения без полёта. Сначала сравните модуль с допуском, затем выбирайте знак. <lua>Запись a and b or c читается как «если a, то b, иначе c»; ipairs перебирает список по порядку.</lua><py>Запись 1 if err>0 else -1 читается как «1, если err>0, иначе -1».</py>', experiment: 'Добавьте ровно ±0.1 и объясните границу.',
        question: 'Что делает зона допуска?', right: 'Прекращает коррекцию при небольшой ошибке', wrong: 'Усиливает любую малую ошибку', feedback: 'Область спокойствия отделяет малое отклонение от команды коррекции.',
        lua: 'for _,err in ipairs({-0.04,0.03,-0.02,0.2,-0.2}) do\n    local command=0\n    if math.abs(err)>___ then command=err>0 and 1 or -1 end\n    print(command)\nend', python: 'for err in [-0.04,0.03,-0.02,0.2,-0.2]:\n    command=0\n    if abs(err)>___: command=1 if err>0 else -1\n    print(command)' },
    { number: 70, answer: '0.4', waitMs: 2000,
        task: 'Ограничьте вычисленную скорость (м/с) симметричным диапазоном [-limit, limit]; значение limit впишите вместо ___ (оно указано в «Результате»). Для ошибок -10,0,10 и коэффициента 0.5 выведите три результата без движения аппарата.', observation: 'Программа выводит -0.4, 0 и 0.4 (ноль может печататься как 0.0), хотя необрезанные значения были -5, 0, 5; диапазон [-0.4, 0.4].',
        hint: 'Сначала умножаем ошибку на коэффициент, затем «зажимаем» результат между -limit и limit с помощью <lua>math.min и math.max</lua><py>min и max</py>. Отлаживаем расчёт до подключения моторов.', experiment: 'Добавьте ошибку 0.2: почему результат 0.1 не должен стать 0.4?',
        question: 'Что происходит с уже допустимой командой?', right: 'Её величина сохраняется', wrong: 'Она всегда заменяется максимумом', feedback: 'Ограничение обрезает только выход за границы.',
        lua: 'local limit=___\nfor _,err in ipairs({-10,0,10}) do\n    print(math.max(-limit,math.min(limit,err*0.5)))\nend', python: 'limit=___\nfor err in [-10,0,10]:\n    print(max(-limit,min(limit,err*0.5)))' },
    { number: 71, answer: '0.15', waitMs: 3500,
        task: 'Без <lua>подготовки двигателей</lua><py>arm</py> проверьте два исхода: цель X=0 совпадает со стартом; цель X=100 за секунду не достигается. Допуск достижения цели — 0.15 м, впишите его вместо ___. Программа должна вывести «Цель достигнута», затем строку, начинающуюся со слова «тайм-аут» и называющую причину.', observation: 'В выводе программы сначала «Цель достигнута», затем «тайм-аут: ожидание X=100» примерно через секунду.',
        hint: 'Мы намеренно не отправляем движение. Этот опыт проверяет диагностику ожидания, а не дальний маршрут.', experiment: 'Замените первую цель на 100: какое сообщение должно измениться?',
        question: 'Что сохраняем при неудачном ожидании?', right: 'Причину и этап остановки', wrong: 'Всегда сообщаем об успехе', feedback: 'Диагностика различает достижение цели и истечение срока.',
        lua: 'local x=Sensors.lpsPosition()\nif math.abs(0-x)<___ then print("Цель достигнута") end\nlocal waited=0\nfunction waitTarget()\n    local x=Sensors.lpsPosition()\n    if math.abs(100-x)<0.15 then print("Цель X=100 достигнута"); return end\n    waited=waited+0.05\n    if waited>=1 then\n        print("тайм-аут: ожидание X=100")\n        print("Опыт завершён")\n        return\n    end\n    Timer.callLater(0.05,waitTarget)\nend\nwaitTarget()',
        python: 'x,y,z=pioneer.get_local_position_lps()\nif abs(0-x)<___: print("Цель достигнута")\ndeadline=time.monotonic()+1\nwhile time.monotonic()<deadline:\n    x,y,z=pioneer.get_local_position_lps()\n    if abs(100-x)<0.15: break\n    time.sleep(0.05)\nelse:  # выполняется, если цикл закончился без break\n    print("тайм-аут: ожидание X=100")\nprint("Опыт завершён")' },
    { number: 72, answer: 'Цель', task: 'Выполните полёт к (1,1,1) с посадкой: заготовка записывает положение старта, цель, измеренное прибытие и положение после остановки, каждую строку со своей подписью. Подпишите намерение: впишите вместо ___ одно слово-метку для строки «…: 1,1,1», которая выводится до начала движения (слово указано в «Результате»).',
        observation: 'Отчёт содержит строку «Цель: 1,1,1» перед движением и три измерения с подписями «Старт:», «Прибытие:», «После посадки:».', hint: 'Заготовка читает положение заново в каждом этапе. Цель подписывается отдельно от измеренного результата; одной строки «успех» мало.',
        experiment: 'Сравните заданную и измеренную точки: укладывается ли разность в допуск?', question: 'Чем подкрепляется вывод «миссия выполнена»?', right: 'Измерениями и подтверждениями всех этапов', wrong: 'Одной заранее напечатанной строкой', feedback: 'Отчёт связывает план с наблюдаемым результатом.' }
];

export function getTelemetryAcademyPractices(language: 'lua' | 'python') {
    return exercises.map(exercise => {
        const view = localizedExercise(exercise, language);
        const lesson = compileAcademyExercise({ ...view, lua: exercise.lua ?? flight(exercise.number, 'lua'), python: exercise.python ?? flight(exercise.number, 'python'),
            luaAnswer: exercise.answer, pythonAnswer: exercise.number === 66 ? 'None' : exercise.answer, waitMs: exercise.waitMs ?? 90000 }, language);
        if (TELEMETRY_FLIGHTS.some(item => item.number === exercise.number) || exercise.number === 71) lesson.academy!.doneMessage = 'Опыт завершён';
        lesson.academy!.teaching.device = `${lesson.summary} ${view.hint} ${view.observation}`;
        lesson.links = [{ label: 'Измерение положения', query: language === 'lua' ? 'Sensors.lpsPosition' : 'get_local_position_lps' }];
        return lesson;
    });
}
