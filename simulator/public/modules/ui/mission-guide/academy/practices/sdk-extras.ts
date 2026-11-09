import { compileAcademyExercise, type AcademyCodeExercise } from './shared.js';

/** Глава 13: команды SDK, которых нет в основной линии уроков. Только Python: их читают из программы на борту ПК. */
const exercises: Array<Omit<AcademyCodeExercise, 'lua' | 'luaAnswer'> & { python: string; pythonAnswer: string }> = [
    {
        number: 109,
        task: 'Прочитайте напряжение батареи методом get_battery_status() и выведите его в строке «Напряжение: …». Вместо ___ впишите имя метода: он начинается с get_battery и заканчивается на _status.',
        taskSteps: [
            'Метод get_battery_status() возвращает напряжение батареи в вольтах (число с дробной частью). Прочитайте заготовку: напряжение сохраняется в переменную voltage.',
            'Вместо ___ впишите имя метода чтения батареи: get_battery_status.',
            'Нажмите «Проверить полёт»: в журнале должна появиться строка «Напряжение:» и число около 8.4 В (полностью заряженная батарея).'
        ],
        observation: 'В журнале строка «Напряжение: 8.4…»: у заряженной батареи около 8.4 В, дрон остался на земле.',
        hint: 'Название метода: get_battery_status (три слова через подчёркивание). Скобки нужны: это вызов метода.',
        experiment: 'Выведите напряжение в начале программы и после arm(). Изменилось ли оно?',
        question: 'Что возвращает get_battery_status()?', right: 'Напряжение батареи в вольтах', wrong: 'Процент заряда от 0 до 100', feedback: 'Метод отдаёт именно напряжение. По нему судят о заряде: чем ниже вольтаж, тем меньше энергии.',
        python: 'voltage = pioneer.___()\nprint("Напряжение:", voltage)', pythonAnswer: 'get_battery_status'
    },
    {
        number: 110,
        task: 'Прочитайте предстартовую проверку автопилота методом get_preflight_state() до и после arm(). Вместо ___ (оно встречается дважды) впишите ключ словаря, который показывает, разрешён ли старт: UavStartAllowed.',
        taskSteps: [
            'Метод get_preflight_state() возвращает словарь флагов предстартовой проверки (BatteryLow, NavSystem, Area, Attitude, RcExpected, RcMode, RcUnexpected, UavStartAllowed). Ненулевое значение флага означает, что он поднят.',
            'Вместо обоих ___ впишите ключ UavStartAllowed: он показывает, можно ли сейчас запускать двигатели. Кавычки вокруг ключа уже есть в заготовке.',
            'Нажмите «Проверить полёт»: до arm() старт разрешён (128), после arm() флаг снят (0). Дрон остаётся на земле.'
        ],
        observation: 'В журнале «До arm: 128» и «После arm: 0»: до подготовки старт разрешён, после неё флаг снимается.',
        hint: 'Ключ пишется точно, с заглавными буквами: UavStartAllowed. Ошибка в ключе даёт KeyError.',
        experiment: 'Выведите весь словарь целиком: print(state). Какие флаги стоят в 0?',
        question: 'Зачем смотреть предстартовое состояние перед arm()?', right: 'Убедиться, что автопилот разрешает старт', wrong: 'Чтобы включить двигатели', feedback: 'Состояние только сообщает готовность: двигатели запускает arm(). Сначала проверяем, потом запускаем.',
        python: 'state = pioneer.get_preflight_state()\nprint("До arm:", state["___"])\npioneer.arm()\nstate = pioneer.get_preflight_state()\nprint("После arm:", state["___"])', pythonAnswer: 'UavStartAllowed'
    }
];

export function getSdkExtrasAcademyPractices() {
    return exercises.map(exercise => compileAcademyExercise({ ...exercise, lua: '', luaAnswer: '', waitMs: 4000 }, 'python'));
}
