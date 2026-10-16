import type { PlazlinkTransport } from './plazlink/client.js';

/*
 * Web Serial carrier for Plazlink. The Pioneer shows up as a USB serial port (VID 0x0525, PID 0xA4A7), so the browser
 * can open it directly; Chrome and Edge on https or localhost only. The port is exclusive: Pioneer Station or another
 * tab holding it makes open() fail.
 */

export const PIONEER_USB_FILTER = { usbVendorId: 0x0525, usbProductId: 0xa4a7 } as const;

/** The parts of the Web Serial API this module uses (the DOM typings do not ship it everywhere). */
interface SerialPortLike {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
}

interface SerialLike {
    requestPort(options: { filters: Array<{ usbVendorId: number; usbProductId: number }> }): Promise<SerialPortLike>;
    getPorts(): Promise<SerialPortLike[]>;
}

export class SerialUnavailableError extends Error {
    constructor() {
        super('Этот браузер не умеет работать с USB-портами. Откройте симулятор в Chrome или Edge.');
        this.name = 'SerialUnavailableError';
    }
}

function getSerial(): SerialLike {
    const serial = (navigator as unknown as { serial?: SerialLike }).serial;
    if (!serial) throw new SerialUnavailableError();
    return serial;
}

export function isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Opens the Pioneer port: the one the student already allowed, or the browser's picker. Must be called from a click. */
export async function openPioneerPort(): Promise<PlazlinkTransport> {
    const serial = getSerial();
    const known = await serial.getPorts();
    // getPorts() lists every port this site may use; with a single allowed Pioneer the choice is obvious.
    const port = known.length === 1 ? known[0] : await serial.requestPort({ filters: [PIONEER_USB_FILTER] });
    try {
        await port.open({ baudRate: 115200 });
    } catch (error) {
        console.warn('[DRONE] port.open failed', error);
        throw new Error('Не удалось открыть порт дрона. Закройте Pioneer Station и другие вкладки с симулятором, затем повторите.');
    }
    return createTransport(port);
}

function createTransport(port: SerialPortLike): PlazlinkTransport {
    if (!port.readable || !port.writable) throw new Error('Порт открыт, но без потоков чтения и записи.');
    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();
    const handlers = new Set<(chunk: Uint8Array) => void>();
    let closed = false;

    void (async () => {
        try {
            while (!closed) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) handlers.forEach((handler) => handler(value));
            }
        } catch {
            // The cable was pulled or the port was closed: the client sees silence and reports a timeout.
        }
    })();

    return {
        write: (data) => writer.write(data),
        onData(handler) {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
        async close() {
            closed = true;
            handlers.clear();
            try {
                await reader.cancel();
            } catch {
                // Already gone.
            }
            reader.releaseLock();
            try {
                await writer.close();
            } catch {
                // Already gone.
            }
            await port.close().catch(() => undefined);
        }
    };
}
