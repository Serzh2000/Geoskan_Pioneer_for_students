/**
 * Семантика `global` в Python-рантайме браузера: программа ведёт себя как обычный скрипт.
 * Загрузчик __sim_load берётся из шаблона browser-runtime.ts и запускается на настоящем CPython.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findPython } from './helpers/python-sdk-harness.js';

const RUNTIME_SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');
const python = findPython();
const withPython = python ? test : test.skip;

function transformerSource(): string {
    const awaitStart = RUNTIME_SOURCE.indexOf('async def __sim_await');
    const awaitEnd = RUNTIME_SOURCE.indexOf('__sim_source =');
    const classStart = RUNTIME_SOURCE.indexOf('class __SimAsyncify');
    const classEnd = RUNTIME_SOURCE.indexOf('__user_main = __sim_load');
    expect(Math.min(awaitStart, awaitEnd, classStart, classEnd)).toBeGreaterThan(0);
    return `${RUNTIME_SOURCE.slice(awaitStart, awaitEnd)}\n${RUNTIME_SOURCE.slice(classStart, classEnd)}`;
}

const DRIVER = `
import ast, asyncio, builtins, inspect, sys, traceback
exec(open(sys.argv[1], encoding='utf-8').read())
source = open(sys.argv[2], encoding='utf-8').read()
async def main():
    try:
        await __sim_load(source)()
    except BaseException as e:
        tb = traceback.extract_tb(e.__traceback__)
        lines = [f.lineno for f in tb if f.filename == '<user-script>']
        print('ERR', type(e).__name__, lines[-1] if lines else None)
asyncio.run(main())
`;

function run(code: string): string[] {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'py-globals-'));
    try {
        fs.writeFileSync(path.join(dir, 't.py'), transformerSource(), 'utf8');
        fs.writeFileSync(path.join(dir, 'p.py'), code, 'utf8');
        fs.writeFileSync(path.join(dir, 'd.py'), DRIVER, 'utf8');
        const res = spawnSync(python!, [path.join(dir, 'd.py'), path.join(dir, 't.py'), path.join(dir, 'p.py')], {
            encoding: 'utf8', timeout: 30_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        if (res.status !== 0) throw new Error(res.stderr);
        return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

describe('Python-рантайм: global', () => {
    withPython('global в обычной функции меняет переменную верхнего уровня', () => {
        expect(run('counter = 0\ndef bump():\n    global counter\n    counter += 1\nbump()\nbump()\nprint(counter)')).toEqual(['2']);
    });

    withPython('global в async-обёрнутой функции и колбэке с sleep', () => {
        const code = [
            'import time',
            'counter = 0',
            'items = []',
            'def on_event(e):',
            '    global counter',
            '    counter += 1',
            'def patrol():',
            '    global counter, total',
            '    time.sleep(0.01)',
            '    counter += 10',
            '    total = counter * 2',
            'handlers = [on_event]',
            'for h in handlers:',
            '    h(1)',
            'patrol()',
            'print(counter, total)'
        ].join('\n');
        expect(run(code)).toEqual(['11 22']);
    });

    withPython('переменные цикла, with, import, класс и def видны функциям', () => {
        const code = [
            'import math',
            'class K:',
            '    v = 3',
            'for i in range(3):',
            '    pass',
            'def f():',
            '    return i, K.v, math.pi > 3',
            'print(f())'
        ].join('\n');
        expect(run(code)).toEqual(['(2, 3, True)']);
    });

    withPython('NameError остаётся NameError с номером строки программы', () => {
        expect(run('x = 1\n\nprint(undefined_name)')).toEqual(['ERR NameError 3']);
    });

    withPython('аннотированные переменные верхнего уровня работают с global', () => {
        const code = ['n: int = 1', 'm: int', 'def f():', '    global n', '    n += 1', '    k: int = 5', '    return k', 'f()', 'print(n, f())'].join('\n');
        expect(run(code)).toEqual(['2 5']);
    });

    withPython('__name__ == "__main__"', () => {
        expect(run('print(__name__)')).toEqual(['__main__']);
    });
});
