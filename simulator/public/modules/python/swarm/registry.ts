/*
 * Фасад над сетью роя Swarm Kit, которая живёт в Python (модуль _swarm_registry, swarm/prelude.ts).
 * Для будущей консоли и панелей: кто в сети, что объявляет в Heartbeat, кто на что подписан, что лежит в почтовых
 * ящиках; отправить сообщение «с земли», снять телеметрию соседа; выключить борт или сменить его домен (swarm-server
 * настраивается на борту, а не программой). Работает без программы ученика: swarm-server есть у каждого дрона с pioneer_sdk2.
 *
 * Хост - то, что умеет вызвать Python: в браузере его делает browser-host.ts поверх Pyodide, в тестах -
 * постоянный процесс CPython (tests/helpers/swarm-runtime.ts). Время в таймаутах - симулируемые секунды.
 */
export interface SwarmReply<T = unknown> {
    ok: boolean;
    result?: T;
    error?: string;
}

export interface SwarmHost {
    /** Вызывает функцию реестра (_HANDLERS в swarm/prelude.ts); args уже содержит drone. */
    call(fn: string, args: Record<string, unknown>): Promise<SwarmReply>;
}

export class SwarmError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SwarmError';
    }
}

export interface SwarmUnitRow {
    machine_id: string;
    /** Идентификатор дрона в симуляторе. */
    drone: string;
    name: string;
    model: string;
    /** Тип юнита из Heartbeat: 'aero' у Мини 2 и Базового с Radxa. */
    type: string;
    domain: number;
    /** Виден ли юнит в сети: Heartbeat слышен не дольше HEARTBEAT_TTL (3 с) назад. */
    visible: boolean;
    /** Включён ли swarm-server (setOnline). */
    online: boolean;
    /** Есть ли дрон в симуляторе. */
    present: boolean;
    /** Секунд симуляции с последнего Heartbeat. */
    age: number;
    /** Сообщений в почтовом ящике. */
    mailbox: number;
    /** Открытых PioneerSwarmUnit на этом юните (программ ученика). */
    instances: number;
    /** Поток -> число подписчиков. Потоки без подписчиков в сеть не льются. */
    subscribers: Record<string, number>;
}

export interface SwarmUnitInfo extends SwarmUnitRow {
    catalog: Array<{ name: string; type: string; period: number | null; subscribers: number }>;
    heartbeat: { type: string; period: number; streams: string[] };
}

export class SwarmRegistry {
    constructor(private readonly host: SwarmHost, private readonly droneId: string) {}

    private async invoke<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
        const reply = await this.host.call(fn, { drone: this.droneId, ...args });
        if (!reply.ok) throw new SwarmError(reply.error ?? 'Ошибка реестра роя');
        return reply.result as T;
    }

    /** Все юниты сети (и невидимые: выключенные, исчезающие), по номерам machine_id. */
    units(): Promise<SwarmUnitRow[]> {
        return this.invoke('units');
    }

    /** Юнит с каталогом потоков из его Heartbeat и числом подписчиков на каждый. */
    unitInfo(machineId: string): Promise<SwarmUnitInfo> {
        return this.invoke('unit_info', { machine_id: machineId });
    }

    /** Содержимое почтового ящика без извлечения: [отправитель, текст]. */
    mailbox(machineId: string): Promise<Array<[string, string]>> {
        return this.invoke('mailbox', { machine_id: machineId });
    }

    /** Написать юниту «с земли» (отправитель по умолчанию 'console'). */
    send(machineId: string, text: string, sender = 'console'): Promise<boolean> {
        return this.invoke('send', { to: machineId, text, sender });
    }

    /** Снять телеметрию соседа: временная подписка на все потоки, ждёт по одному сэмплу не дольше timeoutSec. Значения - repr сообщений. */
    telemetry(machineId: string, timeoutSec = 5): Promise<{ type: string; streams: Record<string, string> }> {
        return this.invoke('telemetry', { machine_id: machineId, timeout_sec: timeoutSec });
    }

    /** Выключить или включить swarm-server юнита: выключенный перестаёт слать Heartbeat и пропадает из списков через 3 с. */
    setOnline(machineId: string, online: boolean): Promise<SwarmUnitRow> {
        return this.invoke('set_online', { machine_id: machineId, online });
    }

    /** Домен роя, в котором работает swarm-server юнита, пока в нём не открыт PioneerSwarmUnit (у открытого домен свой). */
    setDomain(machineId: string, domain: number): Promise<SwarmUnitRow> {
        return this.invoke('set_domain', { machine_id: machineId, domain });
    }

    /** Часы сети, секунды симуляции. */
    clock(): Promise<number> {
        return this.invoke('clock');
    }

    /** Закрывает все PioneerSwarmUnit и забывает сеть (кнопка «Сначала»). */
    reset(): Promise<boolean> {
        return this.invoke('reset');
    }
}
