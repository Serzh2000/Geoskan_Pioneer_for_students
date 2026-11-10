import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROS2_BOOTSTRAP, ROS2_PRELUDE } from '../../public/modules/python/ros2/prelude.js';
import type { Ros2Host, Ros2Reply } from '../../public/modules/python/ros2/registry.js';
import { findPython } from './python-sdk-harness.js';

/**
 * Запуск эмуляции ROS 2 на настоящем CPython против поддельного мира (helpers/python/run_ros2_module.py).
 * Три режима: scenario (корутина main), program (программа ученика через __SimAsyncify, как в браузере),
 * lazy (то же, но эмуляцию грузит загрузчик по требованию) и host (постоянный процесс для TS-фасада).
 */
const RUNNER = path.join(process.cwd(), 'tests', 'helpers', 'python', 'run_ros2_module.py');
const RUNTIME_SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');

export const python = findPython();
export const withRos2Python = python ? test : test.skip;

function transformerSource(): string {
    const awaitStart = RUNTIME_SOURCE.indexOf('async def __sim_await');
    const awaitEnd = RUNTIME_SOURCE.indexOf('__sim_source =');
    const classStart = RUNTIME_SOURCE.indexOf('class __SimAsyncify');
    const classEnd = RUNTIME_SOURCE.indexOf('__user_main = __sim_load');
    if (Math.min(awaitStart, awaitEnd, classStart, classEnd) < 0) throw new Error('В browser-runtime.ts не найден преобразователь __SimAsyncify');
    return `${RUNTIME_SOURCE.slice(awaitStart, awaitEnd)}\n${RUNTIME_SOURCE.slice(classStart, classEnd)}`;
}

export type Ros2Mode = 'scenario' | 'program' | 'lazy';
export interface Ros2RunOptions {
    model?: 'pioneer-mini2' | 'pioneer-basic';
    mode?: Ros2Mode;
    /** Секунды симулируемого времени до принудительной остановки. */
    seconds?: number;
    /** Во сколько раз симулируемое время быстрее настенного (по умолчанию 20). */
    speed?: number;
}
export interface Ros2WorldResult {
    error: string | null;
    fsm: string;
    pos: [number, number, number];
    yaw: number;
    leds: Record<string, number[]>;
    grab: boolean;
    rc: number[];
    calls: Array<[string, ...unknown[]]>;
    log: Array<[string, string]>;
    modules: string[];
}
export interface Ros2Run {
    /** Печать программы (всё до итоговой строки), по строкам. */
    out: string[];
    result: Ros2WorldResult;
}

function prepare(dir: string, code: string, options: Ros2RunOptions): void {
    fs.writeFileSync(path.join(dir, 'ros2.py'), ROS2_PRELUDE, 'utf8');
    fs.writeFileSync(path.join(dir, 'bootstrap.py'), ROS2_BOOTSTRAP, 'utf8');
    fs.writeFileSync(path.join(dir, 'transformer.py'), transformerSource(), 'utf8');
    fs.writeFileSync(path.join(dir, 'scenario.py'), code, 'utf8');
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ model: options.model ?? 'pioneer-mini2', mode: options.mode ?? 'scenario', seconds: options.seconds ?? 120, speed: options.speed ?? 20 }), 'utf8');
}

export function runRos2(code: string, options: Ros2RunOptions = {}): Ros2Run {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ros2-run-'));
    try {
        prepare(dir, code, options);
        const run = spawnSync(python!, [RUNNER, dir], { encoding: 'utf8', timeout: 90_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        const stdout = run.stdout ?? '';
        const marker = stdout.lastIndexOf('@@RESULT@@');
        if (marker === -1) throw new Error(`Python не вернул результат:\n${stdout}\n${run.stderr}`);
        const result = JSON.parse(stdout.slice(marker + '@@RESULT@@'.length).trim()) as Ros2WorldResult;
        return { out: stdout.slice(0, marker).split(/\r?\n/).filter((line) => line.length > 0), result };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** Постоянный процесс Python для TS-фасада консоли. */
export class PythonRos2Host implements Ros2Host {
    private readonly child: ChildProcessWithoutNullStreams;
    private readonly dir: string;
    private buffer = '';
    private waiting: Array<(line: string) => void> = [];
    private lines: string[] = [];
    readonly ready: Promise<void>;

    constructor(options: Ros2RunOptions = {}) {
        this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ros2-host-'));
        prepare(this.dir, '', { ...options, mode: 'scenario' });
        fs.writeFileSync(path.join(this.dir, 'config.json'), JSON.stringify({ model: options.model ?? 'pioneer-mini2', mode: 'host', speed: options.speed ?? 20 }), 'utf8');
        this.child = spawn(python!, [RUNNER, this.dir], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        this.child.stdout.setEncoding('utf8');
        this.child.stdout.on('data', (chunk: string) => {
            this.buffer += chunk;
            let index = this.buffer.indexOf('\n');
            while (index >= 0) {
                const line = this.buffer.slice(0, index).replace(/\r$/, '');
                this.buffer = this.buffer.slice(index + 1);
                const waiter = this.waiting.shift();
                if (waiter) waiter(line); else this.lines.push(line);
                index = this.buffer.indexOf('\n');
            }
        });
        let stderr = '';
        this.child.stderr.on('data', (chunk) => { stderr += String(chunk); });
        this.ready = this.nextLine().then((line) => {
            if (line !== '@@READY@@') throw new Error(`Хост Python не запустился: ${line}\n${stderr}`);
        });
    }

    private nextLine(): Promise<string> {
        const queued = this.lines.shift();
        if (queued !== undefined) return Promise.resolve(queued);
        return new Promise((resolve) => this.waiting.push(resolve));
    }

    private async send(request: unknown): Promise<unknown> {
        await this.ready;
        this.child.stdin.write(`${JSON.stringify(request)}\n`);
        for (;;) {
            const line = await this.nextLine();
            if (line.startsWith('@@REPLY@@')) return JSON.parse(line.slice('@@REPLY@@'.length));
        }
    }

    call(fn: string, args: Record<string, unknown>): Promise<Ros2Reply> {
        return this.send({ fn, args }) as Promise<Ros2Reply>;
    }

    world(): Promise<Pick<Ros2WorldResult, 'fsm' | 'pos' | 'yaw' | 'leds' | 'grab' | 'rc' | 'calls' | 'log'>> {
        return this.send({ op: 'world' }) as Promise<never>;
    }

    close(): void {
        this.child.stdin.end();
        this.child.kill();
        fs.rmSync(this.dir, { recursive: true, force: true });
    }
}
