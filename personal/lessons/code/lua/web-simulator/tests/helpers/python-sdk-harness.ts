import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SimEvent } from './lua-sim-harness.js';

/**
 * Запуск Python-программы для Пионера на поддельном pioneer_sdk
 * (helpers/python/run_scenario.py) — настоящий CPython, модель дрона и
 * ускоренные часы. Нужен установленный Python 3: без него тесты, которые им
 * пользуются, пропускаются (см. findPython).
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(HERE, 'python', 'run_scenario.py');

let cachedPython: string | null | undefined;

export function findPython(): string | null {
    if (cachedPython !== undefined) return cachedPython;
    const candidates = [process.env.PYTHON, 'python3', 'python', 'py'].filter((value): value is string => Boolean(value));
    cachedPython = candidates.find((candidate) => {
        const probe = spawnSync(candidate, ['-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8' });
        return probe.status === 0 && probe.stdout.trim() === '3';
    }) ?? null;
    return cachedPython;
}

export type PythonScenario = { seconds: number; tof?: Array<[number, number]>; pos?: [number, number, number] };

export function runPythonScenario(code: string, scenario: PythonScenario): SimEvent[] {
    const python = findPython();
    if (!python) throw new Error('Python 3 не найден');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-py-'));
    const scriptPath = path.join(dir, 'program.py');
    const configPath = path.join(dir, 'config.json');
    fs.writeFileSync(scriptPath, code, 'utf8');
    fs.writeFileSync(configPath, JSON.stringify(scenario), 'utf8');
    try {
        const result = spawnSync(python, [RUNNER, scriptPath, configPath], {
            encoding: 'utf8',
            timeout: 60_000,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        const marker = result.stdout.lastIndexOf('@@TRACE@@');
        if (marker === -1) {
            throw new Error(`Python не вернул трассу:\n${result.stdout}\n${result.stderr}`);
        }
        return JSON.parse(result.stdout.slice(marker + '@@TRACE@@'.length).trim()) as SimEvent[];
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}
