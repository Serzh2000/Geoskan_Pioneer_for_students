import { drones, currentDroneId } from '../../core/state.js';
import { usesOnboardSdk } from '../../core/drone-models.js';
import { interfaceList, ros2ConfigForModel, type Ros2ConfigName } from '../../python/ros2/interfaces.js';
import { simClock } from '../../physics/sim-clock.js';
import { createPollingClock, type ConsoleClock } from '../../python/ros2/console/clock.js';
import { complete, EMPTY_COMPLETION_DATA, type CompletionData } from '../../python/ros2/console/complete.js';
import { ConsoleError } from '../../python/ros2/console/errors.js';
import { ensureNodeRunning, executeLine, isLongRunning, type ConsoleApi, type NodeState, type OutputKind } from '../../python/ros2/console/executor.js';
import { CommandHistory } from '../../python/ros2/console/history.js';
import { parseCommandLine } from '../../python/ros2/console/parser.js';
import { needsContinuation } from '../../python/ros2/console/tokenize.js';
import { buildIntro, FLIGHT_CYCLE_QUEUE, FLIGHT_CYCLE_TEXT, type QueueItem } from './ros2-console-intro.js';
import { matchesTerminalShortcut } from './terminal-session.js';

export { FLIGHT_CYCLE_QUEUE, FLIGHT_CYCLE_TEXT, type QueueItem };

/*
 * Вкладка «ROS 2» нижней панели редактора: командная строка `ros2 ...` для дрона в режиме «Python · SDK2».
 * Логика команд - в python/ros2/console/* (разбор, выполнение, форматы); здесь только DOM: строка ввода с историей,
 * Tab, Ctrl+C, продолжение строки через \, вставка нескольких строк, пустое состояние со справкой.
 * Озвучивание: обычный вывод - aria-live="polite"; пока идёт поток (echo, pub -r, launch) поток не озвучивается,
 * о начале и конце сообщает скрытая область role="status", иначе читалка тонула бы в сообщениях.
 */
export const ROS2_HISTORY_STORAGE_KEY = 'ros2-console-history';
const MAX_ROWS = 1500;
const COMPLETION_TTL_MS = 4000;

export interface Ros2ConsoleDeps {
    /** Дрон, с которым работает консоль (по умолчанию выбранный в симуляторе). */
    droneId(): string | null;
    droneName(): string;
    /** Консоль доступна только в режиме «Python · SDK2». */
    isAvailable(): boolean;
    config(): Ros2ConfigName;
    api(droneId: string): ConsoleApi;
    clock(droneId: string): ConsoleClock;
    /** Python ещё не загружен: первое обращение займёт несколько секунд. */
    isWarm(): boolean;
    /** Состояние автопилота дрона (FSM): нужно кнопке «Выполнить» у полётного цикла, чтобы дождаться взлёта и посадки. */
    fsmState(droneId: string): string | undefined | Promise<string | undefined>;
}


const FLIGHT_STATES = { hover: ['FLYING_HOVER'], ground: ['IDLE'] } as const;
const WAIT_LIMIT_SEC = 25;


function loadHistory(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(ROS2_HISTORY_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(-200) : [];
    } catch {
        return [];
    }
}

function saveHistory(items: readonly string[]): void {
    try {
        localStorage.setItem(ROS2_HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Хранилище может быть закрыто (приватное окно): история живёт до перезагрузки страницы.
    }
}

let pythonWarm = false;

/** Консоль поверх реестра ROS 2 выбранного дрона: модуль Python подгружается лениво, при первой команде. */
export function defaultRos2ConsoleDeps(): Ros2ConsoleDeps {
    const apis = new Map<string, ConsoleApi>();
    return {
        droneId: () => (drones[currentDroneId] ? currentDroneId : null),
        droneName: () => drones[currentDroneId]?.name ?? currentDroneId,
        isAvailable: () => Boolean(drones[currentDroneId]) && usesOnboardSdk(drones[currentDroneId]),
        config: () => ros2ConfigForModel(drones[currentDroneId]?.model),
        api(id) {
            let api = apis.get(id);
            if (!api) {
                let real: Promise<Record<string, (...args: unknown[]) => unknown>> | null = null;
                const load = () => (real ??= import('../../python/ros2/browser-host.js').then((module) => {
                    const registry = module.createRos2Registry(id, { autoLaunch: false });
                    pythonWarm = true;
                    return registry as unknown as Record<string, (...args: unknown[]) => unknown>;
                }));
                api = new Proxy({}, {
                    get: (_target, name: string) => (...args: unknown[]) => load().then((registry) => registry[name](...args))
                }) as ConsoleApi;
                apis.set(id, api);
            }
            return api;
        },
        clock: (id) => createPollingClock(() => (drones[id] ? simClock() : 0)),
        isWarm: () => pythonWarm,
        fsmState: (id) => (drones[id] ? String(drones[id].fsmState) : undefined)
    };
}

export interface Ros2ConsoleHandle {
    /** Фокус на строку ввода. */
    focus(): void;
    /** Пересчитать доступность (смена дрона, языка, модели). */
    sync(): void;
    clear(): void;
    /** Поставить строки в очередь на выполнение, как будто их ввели (для кнопок «Выполнить»). */
    enqueue(items: QueueItem[]): void;
    /** Ждёт, пока очередь и текущая команда закончатся (для тестов). */
    idle(): Promise<void>;
    available(): boolean;
}

export function initRos2Console(panel: HTMLElement, onAvailabilityChange: (available: boolean) => void, deps: Ros2ConsoleDeps = defaultRos2ConsoleDeps()): Ros2ConsoleHandle | null {
    const stream = panel.querySelector<HTMLElement>('#terminal-ros2-stream');
    const input = panel.querySelector<HTMLInputElement>('#terminal-ros2-input');
    const form = panel.querySelector<HTMLFormElement>('#terminal-ros2-form');
    const promptEl = panel.querySelector<HTMLElement>('#terminal-ros2-prompt');
    const status = panel.querySelector<HTMLElement>('#terminal-ros2-status');
    const intro = panel.querySelector<HTMLElement>('#terminal-ros2-intro');
    const stopBtn = panel.querySelector<HTMLButtonElement>('#terminal-ros2-stop');
    const scroller = stream?.parentElement;
    if (!stream || !input || !form || !promptEl || !status || !intro || !stopBtn || !scroller) return null;

    const history = new CommandHistory(loadHistory());
    const nodeStates = new Map<string, NodeState>();
    const stateOf = (id: string): NodeState => {
        let state = nodeStates.get(id);
        if (!state) { state = { stopped: false }; nodeStates.set(id, state); }
        return state;
    };
    let pending: string[] = [];
    let controller: AbortController | null = null;
    let runningDrone: string | null = null;
    const queue: QueueItem[] = [];
    let draining: Promise<void> | null = null;
    let available = false;
    let activeDrone: string | null = null;
    let completionCache: { at: number; drone: string; data: CompletionData } | null = null;
    let statusTimer: number | undefined;
    /** Значение строки, для которого Tab ничего не нашёл: следующий Tab без правок покидает поле. */
    let idleTabValue: string | null = null;

    const promptText = () => `pioneer@${deps.config()}:~$`;
    const setPrompt = () => {
        promptEl.textContent = pending.length ? '>' : promptText();
        input.setAttribute('aria-label', pending.length ? 'Продолжение команды ros2' : `Команда ros2, приглашение ${promptText()}`);
    };
    const say = (text: string) => {
        status.textContent = '';
        window.clearTimeout(statusTimer);
        statusTimer = window.setTimeout(() => { status.textContent = text; }, 30);
    };
    const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;

    const print = (text: string, kind: OutputKind | 'command' = 'out') => {
        const follow = nearBottom();
        const row = document.createElement('div');
        row.className = `terminal-console-line terminal-console-line--${kind === 'out' ? 'text' : kind === 'warn' ? 'warning' : kind}`;
        row.textContent = text;
        stream.append(row);
        while (stream.childElementCount > MAX_ROWS) stream.firstElementChild?.remove();
        intro.hidden = true;
        if (follow) scroller.scrollTop = scroller.scrollHeight;
    };

    const clear = () => {
        stream.replaceChildren();
        intro.hidden = false;
        input.focus({ preventScroll: true });
    };


    buildIntro(intro, { say, enqueue: (items) => handle.enqueue(items), focus: () => input.focus({ preventScroll: true }) });

    // ---- выполнение
    const setRunning = (running: boolean, long: boolean) => {
        form.classList.toggle('is-running', running);
        input.readOnly = running;
        input.placeholder = running ? 'Выполняется… Ctrl+C - остановить' : '';
        stopBtn.hidden = !running;
        stream.setAttribute('aria-busy', String(running));
        if (running && long) {
            stream.setAttribute('aria-live', 'off');
            say('Команда выполняется и выводит данные. Ctrl+C останавливает её.');
        } else if (!running) {
            window.setTimeout(() => stream.setAttribute('aria-live', 'polite'), 0);
        }
    };

    const runCommand = async (text: string) => {
        const id = deps.droneId();
        if (!id) { print('Дрон не выбран.', 'error'); return; }
        if (!deps.isAvailable()) { print('Консоль ros2 доступна для дрона в режиме «Python · SDK2».', 'error'); return; }
        let parsed;
        try {
            parsed = parseCommandLine(text);
        } catch (error) {
            if (error instanceof ConsoleError) {
                print(error.message, 'error');
                if (error.hint) print(`Подсказка: ${error.hint}`, 'muted');
                return;
            }
            throw error;
        }
        if (parsed.kind === 'empty') return;
        const long = isLongRunning(parsed);
        controller = new AbortController();
        runningDrone = id;
        setRunning(true, long);
        if (parsed.kind === 'command' && !deps.isWarm()) print('Запускаю Python в браузере: в первый раз несколько секунд…', 'muted');
        const ctx = {
            api: deps.api(id), model: deps.config(), clock: deps.clock(id), state: stateOf(id),
            write: (line: string, kind?: OutputKind) => print(line, kind ?? 'out'),
            clear, history: () => history.entries
        };
        try {
            await executeLine(parsed, ctx, controller.signal);
        } finally {
            controller = null;
            runningDrone = null;
            setRunning(false, long);
            if (long) say('Команда остановлена.');
        }
    };

    const waitForFlight = async (target: 'hover' | 'ground') => {
        const id = deps.droneId();
        if (!id) return;
        const wanted: readonly string[] = FLIGHT_STATES[target];
        controller = new AbortController();
        setRunning(true, true);
        print(target === 'hover' ? '(жду, пока дрон взлетит и остановится в точке…)' : '(жду посадки…)', 'muted');
        try {
            const clock = deps.clock(id);
            const until = clock.now() + WAIT_LIMIT_SEC;
            await clock.sleep(0.5, controller.signal);
            while (clock.now() < until) {
                const state = await deps.fsmState(id);
                if (state === undefined || wanted.includes(state)) break;
                await clock.sleep(0.2, controller.signal);
            }
        } catch {
            // Ctrl+C: очередь уже очищена прерыванием.
        } finally {
            controller = null;
            setRunning(false, true);
        }
    };

    const drain = () => {
        if (draining) return draining;
        draining = (async () => {
            while (queue.length) {
                const item = queue.shift() as QueueItem;
                if (typeof item !== 'string') { await waitForFlight(item.wait); continue; }
                const line = item;
                const continuing = pending.length > 0;
                print(`${continuing ? '>' : promptText()} ${line}`, 'command');
                pending.push(line);
                const joined = pending.join('\n');
                if (needsContinuation(joined)) { setPrompt(); continue; }
                pending = [];
                setPrompt();
                const flat = joined.replace(/\\\n\s*/gu, '').replace(/\n/gu, ' ').trim();
                if (flat) { history.push(flat); saveHistory(history.entries); }
                await runCommand(joined);
            }
        })().finally(() => { draining = null; });
        return draining;
    };

    const interrupt = () => {
        if (controller) {
            queue.length = 0;
            print('^C', 'command');
            controller.abort();
            return true;
        }
        if (input.value || pending.length) {
            print(`${pending.length ? '>' : promptText()} ${input.value}^C`, 'command');
            input.value = '';
            pending = [];
            setPrompt();
            return true;
        }
        return false;
    };

    // ---- Tab
    const loadCompletionData = async (): Promise<CompletionData> => {
        const id = deps.droneId();
        if (!id) return EMPTY_COMPLETION_DATA;
        if (completionCache && completionCache.drone === id && Date.now() - completionCache.at < COMPLETION_TTL_MS) return completionCache.data;
        const list = interfaceList();
        const data: CompletionData = { ...EMPTY_COMPLETION_DATA, msgs: list.msgs, srvs: list.srvs, params: {} };
        try {
            const api = deps.api(id);
            await ensureNodeRunning({ api, model: deps.config(), clock: deps.clock(id), state: stateOf(id), write: () => undefined, clear: () => undefined, history: () => [] });
            const [topics, services, nodes, params] = await Promise.all([api.topicList(), api.serviceList(), api.nodeList(), api.paramList()]);
            data.topics = topics.map((row) => row.name);
            data.services = services.map((row) => row.name);
            data.nodes = nodes;
            data.params = params;
        } catch {
            // Узел остановлен или Python ещё грузится: дополняем тем, что известно без него.
        }
        completionCache = { at: Date.now(), drone: id, data };
        return data;
    };

    const onTab = async () => {
        const before = input.value;
        const caret = input.selectionStart ?? before.length;
        const data = await loadCompletionData();
        if (input.value !== before) return;
        const result = complete(before, caret, data);
        if (result.line !== before) {
            input.value = result.line;
            input.setSelectionRange(result.caret, result.caret);
            idleTabValue = null;
        } else if (result.candidates.length > 1) {
            print(`${promptText()} ${before}`, 'command');
            print(result.candidates.join('  '), 'muted');
            idleTabValue = null;
        } else idleTabValue = before;
    };

    // ---- события
    input.addEventListener('keydown', (event) => {
        if (event.ctrlKey && !event.altKey && matchesTerminalShortcut(event, 'C')) {
            const selection = window.getSelection()?.toString();
            if (!controller && selection && scroller.contains(window.getSelection()?.anchorNode ?? null)) return;
            if (input.selectionStart !== input.selectionEnd && !controller) return;
            event.preventDefault();
            interrupt();
            return;
        }
        if (controller) return;
        if ((event.ctrlKey || event.metaKey) && matchesTerminalShortcut(event, 'L')) {
            event.preventDefault();
            clear();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            input.value = event.key === 'ArrowUp' ? history.previous(input.value) : history.next(input.value);
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && input.value.trim() !== '') {
            // Пустая строка или повторный Tab без результата уходят дальше: клавиатурный пользователь не застревает в консоли.
            if (idleTabValue === input.value) { idleTabValue = null; return; }
            event.preventDefault();
            void onTab();
        } else idleTabValue = null;
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (controller) return;
        const line = input.value;
        input.value = '';
        if (!line.trim() && !pending.length) { print(promptText(), 'command'); return; }
        queue.push(line);
        void drain();
    });

    input.addEventListener('paste', (event) => {
        const parts = (event.clipboardData?.getData('text') ?? '').split(/\r?\n/u);
        if (parts[parts.length - 1] === '') parts.pop();
        if (parts.length < 2) return;
        event.preventDefault();
        parts[0] = input.value + parts[0];
        input.value = '';
        handle.enqueue(parts);
    });

    stopBtn.addEventListener('click', () => { interrupt(); input.focus({ preventScroll: true }); });
    scroller.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, summary, details, a, input') || window.getSelection()?.toString()) return;
        input.focus({ preventScroll: true });
    });

    const sync = () => {
        const nowAvailable = deps.isAvailable();
        const id = deps.droneId();
        if (id !== activeDrone) {
            if (controller && runningDrone !== id) { queue.length = 0; print('^C', 'command'); controller.abort(); }
            if (activeDrone !== null && id && stream.childElementCount > 0) print(`— дрон: ${deps.droneName()} —`, 'muted');
            activeDrone = id;
            completionCache = null;
        }
        setPrompt();
        if (!nowAvailable && controller) { queue.length = 0; print('^C', 'command'); controller.abort(); }
        if (nowAvailable !== available) {
            available = nowAvailable;
            onAvailabilityChange(available);
        }
    };

    const handle: Ros2ConsoleHandle = {
        focus: () => input.focus({ preventScroll: true }),
        sync,
        clear,
        enqueue(lines) {
            queue.push(...lines);
            void drain();
        },
        async idle() {
            while (draining) await draining;
        },
        available: () => available
    };

    setPrompt();
    sync();
    return handle;
}
