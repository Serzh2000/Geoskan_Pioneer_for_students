import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PIONEER_SDK2_PRELUDE } from '../../public/modules/python/pioneer-sdk2-module.js';
import { PIONEER_CV_PRELUDE } from '../../public/modules/python/pioneer-sdk-cv-prelude.js';
import { ROS2_BOOTSTRAP, ROS2_PRELUDE } from '../../public/modules/python/ros2/prelude.js';
import { SWARM_BOOTSTRAP, SWARM_PRELUDE } from '../../public/modules/python/swarm/prelude.js';
import type { LearningEvent } from '../../public/modules/core/learning-journal.js';
import type { DroneSample } from '../../public/modules/ui/mission-guide/evaluation/text/trace.js';
import { findPython } from './python-sdk-harness.js';

/**
 * Запуск программы миссии «Мини 2» на настоящих pioneer_sdk2 и cv2 симулятора с поддельным миром
 * (helpers/python/run_mini2_mission.py): виртуальные часы, простой автомат автопилота, журнал обучения.
 * Результат — то, что получает проверка миссий в браузере: события журнала и снимки дрона.
 */
const RUNNER = path.join(process.cwd(), 'tests', 'helpers', 'python', 'run_mini2_mission.py');
const RUNTIME_SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');

export const python = findPython();
export const numpyReady = python ? spawnSync(python, ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0 : false;
/** Тесты, которым нужен Python с numpy, без них пропускаются. */
export const mini2Ready = Boolean(python && numpyReady);
export const withMini2Python = mini2Ready ? test : test.skip;

/** Преобразователь рантайма: await-функция и класс __SimAsyncify из шаблона browser-runtime.ts. */
function transformerSource(): string {
    const awaitStart = RUNTIME_SOURCE.indexOf('async def __sim_await');
    const awaitEnd = RUNTIME_SOURCE.indexOf('__sim_source =');
    const classStart = RUNTIME_SOURCE.indexOf('class __SimAsyncify');
    const classEnd = RUNTIME_SOURCE.indexOf('__user_main = __sim_load');
    if (Math.min(awaitStart, awaitEnd, classStart, classEnd) < 0) throw new Error('В browser-runtime.ts не найден преобразователь __SimAsyncify');
    return `${RUNTIME_SOURCE.slice(awaitStart, awaitEnd)}\n${RUNTIME_SOURCE.slice(classStart, classEnd)}`;
}

export type Mini2Run = { events: LearningEvent[]; samples: DroneSample[]; error: string | null; botErrors?: Record<string, string>; rosLog?: Array<[string, string]> };
/** ros2 — программа использует rclpy; neighbours — соседи по рою (дроны Мини 2 с необязательной программой), как у миссий роя. */
export type Mini2RunOptions = { seconds?: number; markers?: boolean; ros2?: boolean; neighbours?: Array<{ code?: string }> };

export function runMini2Program(code: string, options: Mini2RunOptions = {}): Mini2Run {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini2-mission-'));
    try {
        const files: Record<string, string> = {
            'sdk2.py': PIONEER_SDK2_PRELUDE,
            'cv.py': PIONEER_CV_PRELUDE,
            'transformer.py': transformerSource(),
            'ros2.py': ROS2_PRELUDE,
            'ros2_bootstrap.py': ROS2_BOOTSTRAP,
            'swarm.py': SWARM_PRELUDE,
            'swarm_bootstrap.py': SWARM_BOOTSTRAP,
            'program.py': code
        };
        for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text, 'utf8');
        const configPath = path.join(dir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify({ seconds: options.seconds ?? 300, markers: Boolean(options.markers), ros2: Boolean(options.ros2), neighbours: options.neighbours ?? null }), 'utf8');
        const result = spawnSync(python!, [RUNNER, dir, configPath], { encoding: 'utf8', timeout: 90_000, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        const marker = result.stdout.lastIndexOf('@@RESULT@@');
        if (marker === -1) throw new Error(`Python не вернул результат:\n${result.stdout}\n${result.stderr}`);
        const payload = result.stdout.slice(marker + '@@RESULT@@'.length).trim();
        if (!payload) throw new Error(`Python оборвал вывод:
${result.stdout.slice(-500)}
${result.stderr.slice(-1500)}`);
        return JSON.parse(payload) as Mini2Run;
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}
