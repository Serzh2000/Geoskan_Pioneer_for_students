/**
 * Рантайм Python в браузере при нескольких программах сразу (миссии роя: соседи и ученик). Pyodide один, глобальные
 * имена общие, поэтому шаблон запуска (browser-runtime.ts) не должен считать «своими» чужие печать, задачи и дрон.
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');

describe('Python-рантайм: программы нескольких дронов рядом', () => {
    test('печать идёт на дрон своей программы, а не запущенной последней', () => {
        expect(SOURCE).toContain('__sim_frame.f_globals.get("__sim_drone_id")');
        expect(SOURCE).toContain('js.pioneer_print(__sim_owner or js.SIM_DRONE_ID, text)');
    });

    test('печать и input возвращаются на место, когда кончилась последняя программа, а не первая', () => {
        expect(SOURCE).toContain('builtins.__sim_runs = getattr(builtins, "__sim_runs", 0) + 1');
        expect(SOURCE).toMatch(/builtins\.__sim_runs = max\(0, builtins\.__sim_runs - 1\)\r?\n\s+if builtins\.__sim_runs == 0:\r?\n\s+builtins\.print = builtins\.__sim_base_print/);
    });

    test('у каждого запуска свой список фоновых задач: конец одной программы не гасит задачи другой', () => {
        expect(SOURCE).toContain('const tasksName = `__sim_tasks_${++runSerial}`');
        expect(SOURCE).toContain('for __sim_task in ${tasksName}:');
        expect(SOURCE).not.toMatch(/for __sim_task in builtins\.__sim_bg_tasks/);
    });

    test('идентификатор дрона ставится в начале программы, до создания Pioneer() и PioneerSwarmUnit()', () => {
        expect(SOURCE).toContain('js.SIM_DRONE_ID = ${JSON.stringify(droneId)}');
        // Идёт раньше загрузчика программы ученика.
        expect(SOURCE.indexOf('js.SIM_DRONE_ID = ${JSON.stringify(droneId)}')).toBeLessThan(SOURCE.indexOf('__user_main = __sim_load(__sim_source)'));
    });
});
