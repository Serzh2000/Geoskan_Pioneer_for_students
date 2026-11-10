import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROS2_BOOTSTRAP, ROS2_PRELUDE } from '../../public/modules/python/ros2/prelude.js';
import { PIONEER_SDK2_PRELUDE } from '../../public/modules/python/pioneer-sdk2-module.js';
import { SWARM_BOOTSTRAP, SWARM_PRELUDE } from '../../public/modules/python/swarm/prelude.js';
import type { SwarmHost, SwarmReply } from '../../public/modules/python/swarm/registry.js';
import { findPython } from './python-sdk-harness.js';

/**
 * Запуск эмуляции Swarm Kit на настоящем CPython против поддельного мира с несколькими дронами
 * (helpers/python/run_swarm_module.py). Программы ученика проходят через тот же __SimAsyncify, что и в браузере,
 * и стартуют на разных дронах, как при нажатии «Запуск» на каждом.
 */
const RUNNER = path.join(process.cwd(), 'tests', 'helpers', 'python', 'run_swarm_module.py');
const RUNTIME_SOURCE = fs.readFileSync(path.join(process.cwd(), 'public', 'modules', 'python', 'browser-runtime.ts'), 'utf8');

export const python = findPython();
export const withSwarmPython = python ? test : test.skip;

function transformerSource(): string {
    const awaitStart = RUNTIME_SOURCE.indexOf('async def __sim_await');
    const awaitEnd = RUNTIME_SOURCE.indexOf('__sim_source =');
    const classStart = RUNTIME_SOURCE.indexOf('class __SimAsyncify');
    const classEnd = RUNTIME_SOURCE.indexOf('__user_main = __sim_load');
    if (Math.min(awaitStart, awaitEnd, classStart, classEnd) < 0) throw new Error('В browser-runtime.ts не найден преобразователь __SimAsyncify');
    return `${RUNTIME_SOURCE.slice(awaitStart, awaitEnd)}\n${RUNTIME_SOURCE.slice(classStart, classEnd)}`;
}

export interface SwarmDroneSpec {
    id: string;
    name?: string;
    model?: 'pioneer-mini2' | 'pioneer-basic';
    machine_id?: string;
    /** false - дрон на SDK1: swarm-server на нём нет. */
    sdk2?: boolean;
    x?: number;
    y?: number;
}

export interface SwarmRunOptions {
    /** Дроны сцены; по умолчанию два: d1 (pioneer1) и d2 (pioneer2). */
    drones?: SwarmDroneSpec[];
    /** Секунды симулируемого времени до принудительной остановки. */
    seconds?: number;
}

export interface SwarmWorld {
    fsm: string;
    pos: [number, number, number];
    yaw: number;
    leds: Record<string, number[]>;
    time: number;
    running: boolean;
}

export interface SwarmRun<T = unknown> {
    error: string | null;
    /** Значение, которое вернула main() сценария (JSON). */
    data: T;
    /** Печать программ по дронам. */
    out: Record<string, string[]>;
    /** Ошибки программ по дронам. */
    errors: Record<string, string>;
    calls: Array<[string, string, ...unknown[]]>;
    log: string[];
    worlds: Record<string, SwarmWorld>;
}

export const DEFAULT_DRONES: SwarmDroneSpec[] = [
    { id: 'd1', name: 'Пионер Мини 2 · 1', machine_id: 'pioneer1' },
    { id: 'd2', name: 'Пионер Мини 2 · 2', machine_id: 'pioneer2' }
];

function prepare(dir: string, scenario: string, options: SwarmRunOptions, mode: 'scenario' | 'host'): void {
    const files: Record<string, string> = {
        'ros2.py': ROS2_PRELUDE,
        'ros2_bootstrap.py': ROS2_BOOTSTRAP,
        'swarm.py': SWARM_PRELUDE,
        'swarm_bootstrap.py': SWARM_BOOTSTRAP,
        'sdk2.py': PIONEER_SDK2_PRELUDE,
        'transformer.py': transformerSource(),
        'scenario.py': scenario
    };
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text, 'utf8');
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({
        drones: options.drones ?? DEFAULT_DRONES, mode, seconds: options.seconds ?? 120
    }), 'utf8');
}

/** Запускает сценарий: Python-текст с async def main(), в котором доступны start(drone, code), sim_sleep(с), worlds, out. */
export function runSwarm<T = unknown>(scenario: string, options: SwarmRunOptions = {}): SwarmRun<T> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-run-'));
    try {
        prepare(dir, scenario, options, 'scenario');
        const run = spawnSync(python!, [RUNNER, dir], { encoding: 'utf8', timeout: 90_000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        const stdout = run.stdout ?? '';
        const marker = stdout.lastIndexOf('@@RESULT@@');
        if (marker === -1) throw new Error(`Python не вернул результат:\n${stdout}\n${run.stderr}`);
        return JSON.parse(stdout.slice(marker + '@@RESULT@@'.length).trim()) as SwarmRun<T>;
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** Постоянный процесс Python для TS-фасада консоли. */
export class PythonSwarmHost implements SwarmHost {
    private readonly child: ChildProcessWithoutNullStreams;
    private readonly dir: string;
    private buffer = '';
    private waiting: Array<(line: string) => void> = [];
    private lines: string[] = [];
    readonly ready: Promise<void>;

    constructor(options: SwarmRunOptions = {}) {
        this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-host-'));
        prepare(this.dir, '', options, 'host');
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

    call(fn: string, args: Record<string, unknown>): Promise<SwarmReply> {
        return this.send({ op: 'call', fn, args }) as Promise<SwarmReply>;
    }

    /** Запускает программу ученика на дроне (как «Запуск» на выбранном дроне). */
    async start(drone: string, code: string): Promise<void> {
        await this.send({ op: 'start', drone, code });
    }

    /** Ждёт секунды симулируемого времени. */
    async wait(seconds: number): Promise<void> {
        await this.send({ op: 'wait', seconds });
    }

    async addDrone(spec: SwarmDroneSpec): Promise<void> {
        await this.send({ op: 'add', spec });
    }

    async removeDrone(drone: string): Promise<void> {
        await this.send({ op: 'remove', drone });
    }

    world(): Promise<{ worlds: Record<string, SwarmWorld>; out: Record<string, string[]>; errors: Record<string, string>; calls: unknown[] }> {
        return this.send({ op: 'world' }) as Promise<never>;
    }

    close(): void {
        this.child.stdin.end();
        this.child.kill();
        fs.rmSync(this.dir, { recursive: true, force: true });
    }
}
