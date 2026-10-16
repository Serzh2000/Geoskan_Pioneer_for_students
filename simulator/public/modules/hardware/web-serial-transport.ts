import type { PlazlinkTransport } from './plazlink/client.js';
import { encodeFrame, FrameParser, MESSAGE_ID } from './plazlink/frame.js';

/*
 * Web Serial carrier for Plazlink. The Pioneer shows up as a USB serial port (VID 0x0525, PID 0xA4A7), so the browser
 * can open it directly; Chrome and Edge on https or localhost only. The port is exclusive: Pioneer Station or another
 * tab holding it makes open() fail.
 */

export const PIONEER_USB_FILTER = { usbVendorId: 0x0525, usbProductId: 0xa4a7 } as const;

/**
 * USB-UART bridges that carry the same link when the drone is wired through an adapter instead of its own USB port:
 * Silicon Labs CP210x, WCH CH340/CH341 and FTDI. Filtering by vendor only keeps every chip of the family in the list.
 */
export const USB_UART_ADAPTER_FILTERS = [{ usbVendorId: 0x10c4 }, { usbVendorId: 0x1a86 }, { usbVendorId: 0x0403 }] as const;

export const SERIAL_PORT_FILTERS: ReadonlyArray<{ usbVendorId: number; usbProductId?: number }> = [PIONEER_USB_FILTER, ...USB_UART_ADAPTER_FILTERS];

/**
 * Port speeds. The drone's own USB port ignores the rate (115200 is the convention), but a USB-UART adapter wired to the
 * drone's serial link runs at 57600 (measured on a Pioneer behind a CP210x: Plazlink answers at 57600 and the line is noise at 115200).
 */
export const BAUD_USB = 115200;
export const BAUD_ADAPTER = 57600;

/** Which speeds to try, in order, for the device the student picked. */
export function baudCandidates(info: { usbVendorId?: number } | undefined): number[] {
    const vendor = info?.usbVendorId;
    if (vendor === PIONEER_USB_FILTER.usbVendorId) return [BAUD_USB];
    if (USB_UART_ADAPTER_FILTERS.some((filter) => filter.usbVendorId === vendor)) return [BAUD_ADAPTER, BAUD_USB];
    return [BAUD_USB, BAUD_ADAPTER];
}

/** The picker was closed, or it had nothing to pick from. The message says what the list is expected to show. */
export class PortNotChosenError extends Error {
    constructor() {
        super('Порт не выбран. В окне выбора должен быть дрон (USB) или USB-UART адаптер (CP210x, CH340, FTDI). Если нужного устройства нет в списке, проверьте кабель и драйвер и закройте Pioneer Station.');
        this.name = 'PortNotChosenError';
    }
}

/** The parts of the Web Serial API this module uses (the DOM typings do not ship it everywhere). */
interface SerialPortLike {
    getInfo?(): { usbVendorId?: number; usbProductId?: number };
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
}

interface SerialLike {
    requestPort(options: { filters: Array<{ usbVendorId: number; usbProductId?: number }> }): Promise<SerialPortLike>;
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
export async function openPioneerPort(options: { probeMs?: number } = {}): Promise<PlazlinkTransport> {
    const serial = getSerial();
    const known = await serial.getPorts();
    // getPorts() lists every port this site may use; with a single allowed Pioneer the choice is obvious.
    let port: SerialPortLike;
    if (known.length === 1) {
        port = known[0];
    } else {
        try {
            port = await serial.requestPort({ filters: [...SERIAL_PORT_FILTERS] });
        } catch (error) {
            // Chrome reports a closed or empty picker as NotFoundError: say what to look for instead of its raw text.
            if ((error as { name?: string } | null)?.name === 'NotFoundError') throw new PortNotChosenError();
            throw error;
        }
    }
    const rates = baudCandidates(port.getInfo?.());
    if (rates.length > 1) {
        // An adapter does not say which speed the drone uses: the one that gets a Plazlink answer wins.
        for (const baudRate of rates) {
            const transport = await openAndProbe(port, baudRate, options.probeMs ?? PROBE_MS);
            if (transport) return transport;
        }
    }
    // Nothing answered (or the speed is certain): leave the port open at the first rate, so the usual
    // "the drone does not answer" message tells the student to check cable and connection.
    await openPort(port, rates[0]);
    return createTransport(port);
}

const PROBE_MS = 900;

async function openPort(port: SerialPortLike, baudRate: number): Promise<void> {
    try {
        await port.open({ baudRate });
    } catch (error) {
        console.warn('[DRONE] port.open failed', error);
        throw new Error('Не удалось открыть порт дрона. Закройте Pioneer Station и другие вкладки с симулятором, затем повторите.');
    }
}

/** Opens the port at one speed and keeps it only if a valid Plazlink frame comes back. */
async function openAndProbe(port: SerialPortLike, baudRate: number, waitMs: number): Promise<PlazlinkTransport | null> {
    await openPort(port, baudRate);
    const transport = createTransport(port);
    const parser = new FrameParser();
    const answered = new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), waitMs);
        const stop = transport.onData((chunk) => {
            if (parser.push(chunk).length === 0) return;
            clearTimeout(timer);
            stop();
            resolve(true);
        });
    });
    try {
        await transport.write(encodeFrame(MESSAGE_ID.protocolRequest, [0, 0]));
    } catch {
        // A failed write is just another silent speed.
    }
    if (await answered) return transport;
    await transport.close();
    return null;
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
