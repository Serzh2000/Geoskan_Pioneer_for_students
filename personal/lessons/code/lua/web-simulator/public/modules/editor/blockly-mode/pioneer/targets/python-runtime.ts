// Общий пролог Python-программы совместим с официальным pioneer_sdk.
// Ожидание завершения движения с ограничением времени создают блоки полёта.
export type PythonProgramParts = {
    // Хелперы pioneer_*-блоков (definitions_), добавляются только при использовании.
    headerDefinitions: string;
    // Код цепочки pioneer_start (без отступа — тело идёт на верхнем уровне модуля).
    body: string;
    // Блоки курса и груза требуют pioneer_sdk 0.6.1 (GitFlic) в режиме
    // симулятора: get_yaw()/cargo_*() без simulator=True там не работают. У
    // pioneer_sdk 0.5.3 с PyPI аргумента simulator нет вовсе, поэтому без этих
    // блоков пишем просто Pioneer() — так программа идёт на обеих версиях.
    simulatorSdk?: boolean;
    // «Каждые N сек» / «Через N сек» — фоновые потоки. Программа не должна
    // закончиться и закрыть соединение раньше них: в Lua таймеры тоже живут,
    // пока работает скрипт.
    threads?: boolean;
};

export function buildPythonProgram({ headerDefinitions, body, simulatorSdk = false, threads = false }: PythonProgramParts): string {
    const tail = threads ? 'for _pioneer_thread in _pioneer_threads:\n    _pioneer_thread.join()' : '';
    // import time — только если программа им пользуется (паузы, время,
    // таймеры): как в официальных примерах, без лишних строк.
    const usesTime = /\btime\./.test(`${headerDefinitions}\n${body}`);
    const sections = [
        usesTime ? 'from pioneer_sdk import Pioneer\nimport time' : 'from pioneer_sdk import Pioneer',
        simulatorSdk ? 'pioneer = Pioneer(simulator=True)' : 'pioneer = Pioneer()'
    ];
    if (headerDefinitions) sections.push(headerDefinitions);
    if (body) sections.push(body.replace(/\n+$/, ''));
    if (tail) sections.push(tail);
    sections.push('pioneer.close_connection()');
    return `${sections.join('\n\n')}\n`;
}
