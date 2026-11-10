/* Время консоли: симулируемые секунды (ускоряются и останавливаются вместе с симуляцией) и прерывание по Ctrl+C. */

export class AbortedError extends Error {
    constructor() {
        super('Прервано');
        this.name = 'AbortError';
    }
}

export interface ConsoleClock {
    /** Симулируемое время, с. */
    now(): number;
    /** Ждёт seconds симулируемых секунд; при отмене бросает AbortedError. */
    sleep(seconds: number, signal: AbortSignal): Promise<void>;
}

/** Ждёт обещание, но не дольше сигнала отмены. Само обещание остаётся в полёте (вызов в Python дойдёт до своего таймаута). */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
        promise.catch(() => undefined);
        return Promise.reject(new AbortedError());
    }
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(new AbortedError());
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then(
            (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
            (error) => { signal.removeEventListener('abort', onAbort); reject(error); }
        );
    });
}

/** Часы по функции чтения времени: опрос каждые pollMs настенных миллисекунд (пока симуляция на паузе, время стоит и ожидание тоже). */
export function createPollingClock(now: () => number, pollMs = 30): ConsoleClock {
    return {
        now,
        sleep(seconds, signal) {
            return new Promise<void>((resolve, reject) => {
                if (signal.aborted) { reject(new AbortedError()); return; }
                const until = now() + seconds;
                let timer: ReturnType<typeof setTimeout> | null = null;
                const done = (error?: Error) => {
                    if (timer !== null) clearTimeout(timer);
                    signal.removeEventListener('abort', onAbort);
                    if (error) reject(error); else resolve();
                };
                const onAbort = () => done(new AbortedError());
                const tick = () => {
                    if (now() >= until - 1e-9) { done(); return; }
                    timer = setTimeout(tick, pollMs);
                };
                signal.addEventListener('abort', onAbort, { once: true });
                tick();
            });
        }
    };
}
