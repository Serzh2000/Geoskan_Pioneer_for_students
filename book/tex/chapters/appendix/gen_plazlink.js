// Генерирует chapters/appendix/plazlink.tex из reference/mini2-disk/proto-introspection/*.json
const fs = require('fs');
const path = require('path');
const ref = path.join(__dirname, '..', '..', '..', '..', 'simulator', 'reference', 'mini2-disk');
const pi = path.join(ref, 'proto-introspection');
const comps = JSON.parse(fs.readFileSync(path.join(pi, 'proto-components.json'), 'utf8'));
const consts = JSON.parse(fs.readFileSync(path.join(pi, 'proto-constants.json'), 'utf8'));
const mconsts = JSON.parse(fs.readFileSync(path.join(pi, 'proto-message-constants.json'), 'utf8'));
const mids = JSON.parse(fs.readFileSync(path.join(pi, 'proto-message-ids.json'), 'utf8'));
const params = JSON.parse(fs.readFileSync(path.join(ref, 'autopilot-params.json'), 'utf8'));

const BS = '\\';
const esc = (s) => String(s).replace(/_/g, BS + '_');
const tt = (s) => BS + 'texttt{' + esc(s) + '}';

const out = [];
const w = (s) => out.push(s);

w('% Файл создан скриптом gen_plazlink.js из снимка настоящего борта Мини 2 (reference/mini2-disk). Не править вручную.');
w(BS + 'section{Протокол Plazlink и поля автопилота}');
w(BS + 'label{sec:plazlink-protocol}');
w('');
w('Автопилот Пионера Мини~2 общается с бортовым компьютером по протоколу Plazlink: пакеты с номером сообщения, длиной, данными и контрольной суммой (разбор пакета идёт по этапам SYNC, ID, LENGTH, PAYLOAD, CHECKSUM). Данные автопилота устроены как дерево: \\emph{компонент} (датчик, подсистема) содержит \\emph{поля} (значения), а поле имеет номер, тип, флаги, масштаб и границы. Библиотека \\texttt{pioneer\\_sdk2} прячет это за методами: например, \\verb|get_battery_status()| читает поля \\texttt{SensorMonitor.voltage} (или \\texttt{CBoard.VoltBatt}) и \\texttt{Battery.temperature}. Ниже --- сведения, снятые с работающего борта (11 компонентов, 178 полей, 232 параметра). Значения этих таблиц нужны, если вы читаете поля напрямую или сверяете симулятор с настоящим дроном.');
w('');

// Компоненты
w(BS + 'subsection*{Компоненты автопилота}');
w('');
w(BS + 'begin{center}');
w(BS + 'small');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}r l r X@{}}');
w(BS + 'toprule');
w(BS + 'textbf{№} & ' + BS + 'textbf{Компонент} & ' + BS + 'textbf{Полей} & ' + BS + 'textbf{Примеры полей} ' + BS + BS);
w(BS + 'midrule');
let totalFields = 0;
for (const [id, c] of Object.entries(comps)) {
  const f = c.makeComponentDescription.fields.filter((x) => x.name !== 'flags' && x.name !== 'verbose');
  totalFields += c.makeComponentDescription.fields.length;
  const sample = f.slice(0, 6).map((x) => tt(x.name)).join(', ');
  w(id + ' & ' + tt(c.name) + ' & ' + c.makeComponentDescription.fields.length + ' & ' + sample + ' ' + BS + BS);
}
w(BS + 'midrule');
w(' & ' + BS + 'textbf{Всего} & ' + BS + 'textbf{' + totalFields + '} & ' + BS + BS);
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');

// Соответствие полей SDK
w(BS + 'subsection*{Какое поле читает метод SDK}');
w('');
w('Таблица связывает группу полей SDK (то, что библиотека обозначает как \\texttt{messenger[\'группа\'][\'поле\']}) с компонентом автопилота. Если компонентов два, библиотека берёт тот, который есть на борту: так одни и те же методы работают на разных платах.');
w('');
w(BS + 'begin{center}');
w(BS + 'small');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}>{' + BS + 'ttfamily' + BS + 'raggedright' + BS + 'arraybackslash}p{0.14' + BS + 'linewidth} X@{}}');
w(BS + 'toprule');
w(BS + 'textrm{' + BS + 'textbf{Группа}} & ' + BS + 'textbf{Поля и компонент автопилота} ' + BS + BS);
w(BS + 'midrule');
const compOf = (v) => {
  // v: [comp, field] или [[comp, field], [comp, field]]
  const pairs = Array.isArray(v[0]) ? v : [v];
  return pairs.map((p) => p[0]).filter((x, i, a) => a.indexOf(x) === i).join(' / ');
};
for (const [hub, fields] of Object.entries(consts.HUB_MAP)) {
  const names = Object.keys(fields);
  const comps2 = [...new Set(names.map((n) => compOf(fields[n])))];
  const cs = comps2.length === 1 ? tt(comps2[0]).replace(/\\_/g, BS + '_') : comps2.map((c) => tt(c)).join('; ');
  w(esc(hub) + ' & ' + names.map((n) => tt(n)).join(', ') + ' --- ' + cs + ' ' + BS + BS);
}
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');

// Состояния
w(BS + 'subsection*{Команды состояния и ручное управление}');
w('');
w(BS + 'begin{center}');
w(BS + 'small');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}l r X@{}}');
w(BS + 'toprule');
w(BS + 'textbf{Набор} & ' + BS + 'textbf{Код} & ' + BS + 'textbf{Значение} ' + BS + BS);
w(BS + 'midrule');
w(tt('BoardState') + ' & 0 & ' + tt('DISARM') + ' --- остановить моторы ' + BS + BS);
w(' & 1 & ' + tt('ARM') + ' --- запустить моторы ' + BS + BS);
w(' & 2 & ' + tt('TAKEOFF') + ' --- взлёт ' + BS + BS);
w(' & 3 & ' + tt('RTL') + ' --- возврат домой ' + BS + BS);
w(' & 4 & ' + tt('LAND') + ' --- посадка ' + BS + BS);
w(BS + 'midrule');
w(tt('ManualSpeedMode') + ' & 0 & ' + tt('GLOBAL') + ' --- скорость в осях сцены ' + BS + BS);
w(' & 1 & ' + tt('BODY') + ' --- скорость в осях корпуса ' + BS + BS);
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');
w('Методы \\verb|arm()|, \\verb|disarm()|, \\verb|takeoff()|, \\verb|land()| и \\verb|rtl()| записывают эти коды в поле \\texttt{UavMonitor.mode}, а \\verb|set_manual_speed()| и \\verb|set_manual_speed_body_fixed()| выбирают режим \\texttt{GLOBAL} или \\texttt{BODY}.');
w('');

// Системные команды
w(BS + 'subsection*{Системные команды}');
w('');
w('Системные команды автопилота запускают калибровки и обслуживание. Из SDK~2 доступна только перезагрузка (\\verb|reboot_board()|, код 18, и только если плата её разрешает); остальные команды вызывают станции и сервисные программы. Не запускайте их на дроне, назначение которых вы не знаете.');
w('');
const sc = {};
const scText = mconsts.Protocol.SYSTEM_COMMANDS;
for (const m of scText.matchAll(/(\d+): '([^']+)'/g)) sc[m[1]] = m[2];
const ru = {
  'Start baro calibration': 'начать калибровку барометра',
  'Start gyro calibration': 'начать калибровку гироскопа',
  'Start mag calibration': 'начать калибровку магнитометра',
  'Stop mag calibration': 'закончить калибровку магнитометра',
  'Start accel calibration': 'начать калибровку акселерометра',
  'Stop accel calibration': 'закончить калибровку акселерометра',
  'Make accel sample': 'снять точку калибровки акселерометра',
  'Reset board alignment': 'сбросить выравнивание платы',
  'Align board': 'выровнять плату',
  'Start mag check': 'начать проверку магнитометра',
  'Stop mag check': 'закончить проверку магнитометра',
  'Recalc mag declination': 'пересчитать магнитное склонение',
  'Format memory': 'форматировать память автопилота',
  'Start gyro check': 'начать проверку гироскопа',
  'Restart': 'перезагрузка автопилота',
  'Restart to bootloader': 'перезагрузка в загрузчик',
  'Run IMU self-test': 'самотест инерциального датчика'
};
w(BS + 'begin{center}');
w(BS + 'small');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}r X@{}}');
w(BS + 'toprule');
w(BS + 'textbf{Код} & ' + BS + 'textbf{Команда} ' + BS + BS);
w(BS + 'midrule');
for (const [k, v] of Object.entries(sc)) w(k + ' & ' + (ru[v] || v) + ' (' + BS + 'texttt{' + v + '}) ' + BS + BS);
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');

// Result
w(BS + 'subsection*{Коды ответов протокола}');
w('');
const resRu = {
  SUCCESS: 'успех', COMPONENT_NOT_FOUND: 'нет такого компонента', FIELD_NOT_FOUND: 'нет такого поля',
  FIELD_TYPE_MISMATCH: 'тип значения не подходит полю', FIELD_RANGE_ERROR: 'значение вне границ поля',
  FIELD_ERROR: 'ошибка поля', FIELD_READ_ONLY: 'поле только для чтения', FILE_NOT_FOUND: 'нет такого файла',
  FILE_ERROR: 'ошибка файла', FIELD_UNAVAILABLE: 'поле сейчас недоступно', FIELD_TIMEOUT: 'поле не ответило вовремя',
  FILE_ACCESS_ERROR: 'нет доступа к файлу', FILE_POSITION_ERROR: 'неверная позиция в файле', FILE_TIMEOUT: 'файл не ответил вовремя',
  QUEUE_ERROR: 'очередь команд переполнена', COMMAND_UNSUPPORTED: 'команда не поддерживается', COMMAND_QUEUED: 'команда поставлена в очередь',
  COMMAND_ERROR: 'ошибка выполнения команды', HWID_MISMATCH: 'не тот идентификатор платы', LICENSE_EXPIRED: 'лицензия истекла',
  SIGNATURE_ERROR: 'неверная подпись', CHECKSUM_ERROR: 'ошибка контрольной суммы', GENERIC_TIMEOUT: 'общий тайм-аут', INCORRECT_PARAMETER: 'неверный параметр'
};
const res = Object.entries(consts.Result).sort((a, b) => a[1] - b[1]);
w(BS + 'begin{center}');
w(BS + 'small');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}r >{' + BS + 'ttfamily}l X@{}}');
w(BS + 'toprule');
w(BS + 'textbf{Код} & ' + BS + 'textrm{' + BS + 'textbf{Имя}} & ' + BS + 'textbf{Значение} ' + BS + BS);
w(BS + 'midrule');
for (const [k, v] of res) w(v + ' & ' + esc(k) + ' & ' + (resRu[k] || '') + ' ' + BS + BS);
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');

// Типы и флаги
w(BS + 'subsection*{Типы значений, флаги и номера сообщений}');
w('');
w('Типы полей: 0~--- \\texttt{bool}, 1~--- \\texttt{char}, 2~--- \\texttt{int8}, 3~--- \\texttt{int16}, 4~--- \\texttt{int32}, 5~--- \\texttt{int64}, 6~--- \\texttt{uint8}, 7~--- \\texttt{uint16}, 8~--- \\texttt{uint32}, 9~--- \\texttt{uint64}, 10~--- \\texttt{float}, 11~--- \\texttt{double}. Флаги поля складываются: 1~--- читается, 2~--- записывается, 4~--- важное. Здоровье компонента: 0~--- норма, 1~--- предупреждение, 2~--- ошибка, 3~--- критическое состояние. Режим компонента: 0~--- рабочий, 1~--- инициализация, 2~--- обслуживание, 3~--- обновление программы, 7~--- не в сети.');
w('');
const mid = Object.entries(mids).filter(([k, v]) => typeof v === 'number').sort((a, b) => a[1] - b[1]);
w('Номера сообщений протокола: ' + mid.map(([k, v]) => tt(k) + '~' + v).join(', ') + '.');
w('');

// Типы БПЛА
const uav = {};
for (const m of mconsts.UavType.NAMES.matchAll(/(\d+): '([^']+)'/g)) uav[m[1]] = m[2];
w(BS + 'subsection*{Типы аппаратов}');
w('');
w('Автопилот сообщает тип аппарата числом (поле \\texttt{Board\\_type}). У Мини~2 оно равно 23, а в списке плат протокола стоят 12 и 23. Названия типов в библиотеке: ' + Object.entries(uav).map(([k, v]) => k + '~--- ' + BS + 'texttt{' + v + '}').join(', ') + '.');
w('');

// Параметры по группам
const groups = {};
for (const k of Object.keys(params)) {
  const parts = k.split('_');
  const g = parts.length > 2 ? parts[0] + '_' + parts[1] : parts[0];
  groups[g] = (groups[g] || 0) + 1;
}
w(BS + 'subsection*{Параметры автопилота по группам}');
w('');
w('Автопилот Мини~2 хранит ' + Object.keys(params).length + ' параметров (\\verb|get_param|, \\verb|set_param|; значения сохраняются после перезагрузки). Имя состоит из группы и названия. Группы и число параметров в них:');
w('');
const gl = Object.entries(groups).sort((a, b) => b[1] - a[1]);
w(BS + 'begin{center}');
w(BS + 'footnotesize');
w(BS + 'begin{tabularx}{' + BS + 'linewidth}{@{}>{' + BS + 'ttfamily' + BS + 'raggedright' + BS + 'arraybackslash}p{0.3' + BS + 'linewidth} r >{' + BS + 'ttfamily' + BS + 'raggedright' + BS + 'arraybackslash}p{0.3' + BS + 'linewidth} r@{}}');
w(BS + 'toprule');
w(BS + 'textrm{' + BS + 'textbf{Группа}} & ' + BS + 'textbf{Число} & ' + BS + 'textrm{' + BS + 'textbf{Группа}} & ' + BS + 'textbf{Число} ' + BS + BS);
w(BS + 'midrule');
const half = Math.ceil(gl.length / 2);
for (let i = 0; i < half; i++) {
  const a = gl[i], b = gl[i + half];
  w(esc(a[0]) + ' & ' + a[1] + ' & ' + (b ? esc(b[0]) : '') + ' & ' + (b ? b[1] : '') + ' ' + BS + BS);
}
w(BS + 'bottomrule');
w(BS + 'end{tabularx}');
w(BS + 'end{center}');
w('');
const pick = ['Flight_com_takeoffAlt', 'Flight_com_navSystem', 'Flight_com_maxAltitude', 'Copter_pos_vMax', 'Copter_pos_vTakeoff', 'Copter_motorCheckTime', 'Copter_flyWithoutRc', 'Copter_man_rcMode0', 'Copter_man_rcMode1', 'Copter_man_rcMode2', 'SensorMux_rc'];
w('Значения часто используемых параметров на настоящем Мини~2: ' + pick.map((k) => tt(k) + ' = ' + params[k]).join(', ') + '. Высота взлёта называется именно \\texttt{Flight\\_com\\_takeoffAlt}; параметра \\texttt{Copter\\_com\\_takeoffAlt} на борту нет.');
w('');

fs.writeFileSync(path.join(__dirname, 'plazlink.tex'), out.join('\n') + '\n', 'utf8');
console.log('written', out.length, 'lines');
