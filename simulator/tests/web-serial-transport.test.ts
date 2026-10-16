import { jest } from '@jest/globals';
import { BAUD_ADAPTER, BAUD_USB, PIONEER_USB_FILTER, PortNotChosenError, SERIAL_PORT_FILTERS, baudCandidates, openPioneerPort } from '../public/modules/hardware/web-serial-transport.js';
import { encodeFrame, MESSAGE_ID } from '../public/modules/hardware/plazlink/frame.js';
import { explainDroneError } from '../public/modules/shared/notice-messages/catalog.js';

function mockSerial(requestPort: () => Promise<unknown>, known: unknown[] = []) {
    const requestPortSpy = jest.fn(requestPort);
    Object.defineProperty(globalThis, 'navigator', { value: { serial: { requestPort: requestPortSpy, getPorts: async () => known } }, configurable: true });
    return requestPortSpy;
}

afterEach(() => {
    Reflect.deleteProperty(globalThis, 'navigator');
});

describe('the serial port picker', () => {
    it('offers the Pioneer and the common USB-UART adapters (CP210x, CH340, FTDI)', () => {
        expect(SERIAL_PORT_FILTERS).toContainEqual(PIONEER_USB_FILTER);
        const vendors = SERIAL_PORT_FILTERS.map((filter) => filter.usbVendorId);
        expect(vendors).toEqual(expect.arrayContaining([0x0525, 0x10c4, 0x1a86, 0x0403]));
    });

    it('passes those filters to the browser', async () => {
        const requestPort = mockSerial(async () => { throw new DOMException('No port selected by the user.', 'NotFoundError'); });
        await expect(openPioneerPort()).rejects.toBeInstanceOf(PortNotChosenError);
        expect(requestPort).toHaveBeenCalledWith({ filters: [...SERIAL_PORT_FILTERS] });
    });

    it('turns a closed or empty picker into a message that says what the list should show', async () => {
        mockSerial(async () => { throw new DOMException('Failed to execute requestPort on Serial: No port selected by the user.', 'NotFoundError'); });
        const failure = await openPioneerPort().catch((error: Error) => error);
        expect((failure as Error).message).toContain('CP210x');
        expect((failure as Error).message).not.toContain('Failed to execute');
    });

    it('lets other errors through unchanged', async () => {
        mockSerial(async () => { throw new Error('boom'); });
        await expect(openPioneerPort()).rejects.toThrow('boom');
    });
});

describe('the notice for a picker without a choice', () => {
    it('is a calm hint, also when only the message text arrives (the panel keeps just the string)', () => {
        for (const error of [{ name: 'PortNotChosenError', message: new PortNotChosenError().message }, { message: new PortNotChosenError().message }]) {
            const notice = explainDroneError(error as never, 'connect');
            expect(notice.level).toBe('info');
            expect(notice.title).toBe('Порт не выбран');
            expect(notice.message).toContain('CP210x');
        }
    });
});

/** A fake serial port: it answers a Plazlink request with a protocol-info frame only at the given speeds. */
function fakePort(info: { usbVendorId: number; usbProductId?: number }, answersAt: number[]) {
    const opens: number[] = [];
    let writes = 0;
    let baud = 0;
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    const port = {
        readable: null as ReadableStream<Uint8Array> | null,
        writable: null as WritableStream<Uint8Array> | null,
        getInfo: () => info,
        async open({ baudRate }: { baudRate: number }) {
            baud = baudRate;
            opens.push(baudRate);
            port.readable = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
            port.writable = new WritableStream<Uint8Array>({
                write() {
                    writes += 1;
                    if (answersAt.includes(baud)) controller?.enqueue(encodeFrame(MESSAGE_ID.protocolInfo, [1, 0, 0, 0, 0, 0, 0, 0, 0]));
                }
            });
        },
        async close() {
            port.readable = null;
            port.writable = null;
        }
    };
    return { port, opens, writes: () => writes };
}

describe('the port speed', () => {
    it("picks the speed by the device: USB of the drone ignores it, adapters run the radio link at 57600", () => {
        expect(baudCandidates({ usbVendorId: 0x0525 })).toEqual([BAUD_USB]);
        expect(baudCandidates({ usbVendorId: 0x10c4 })).toEqual([BAUD_ADAPTER, BAUD_USB]);
        expect(baudCandidates({ usbVendorId: 0x1a86 })).toEqual([BAUD_ADAPTER, BAUD_USB]);
        expect(baudCandidates({ usbVendorId: 0x0403 })).toEqual([BAUD_ADAPTER, BAUD_USB]);
        expect(baudCandidates(undefined)).toEqual([BAUD_USB, BAUD_ADAPTER]);
    });

    it('opens a CP210x adapter at 57600 and keeps it when the drone answers there', async () => {
        const fake = fakePort({ usbVendorId: 0x10c4, usbProductId: 0xea60 }, [57600]);
        mockSerial(async () => fake.port);
        const transport = await openPioneerPort({ probeMs: 200 });
        expect(fake.opens).toEqual([57600]);
        expect(fake.port.readable).not.toBeNull();
        await transport.close();
    });

    it('moves on to 115200 when nothing answers at 57600', async () => {
        const fake = fakePort({ usbVendorId: 0x10c4 }, [115200]);
        mockSerial(async () => fake.port);
        const transport = await openPioneerPort({ probeMs: 200 });
        expect(fake.opens).toEqual([57600, 115200]);
        await transport.close();
    });

    it("does not probe the own USB port of the drone: one open at 115200, no extra writes", async () => {
        const fake = fakePort({ usbVendorId: 0x0525, usbProductId: 0xa4a7 }, []);
        mockSerial(async () => fake.port);
        const transport = await openPioneerPort({ probeMs: 200 });
        expect(fake.opens).toEqual([115200]);
        expect(fake.writes()).toBe(0);
        await transport.close();
    });

    it('stays open at the first speed when the device is silent, so the usual "no answer" message appears', async () => {
        const fake = fakePort({ usbVendorId: 0x10c4 }, []);
        mockSerial(async () => fake.port);
        const transport = await openPioneerPort({ probeMs: 120 });
        expect(fake.opens).toEqual([57600, 115200, 57600]);
        expect(fake.port.readable).not.toBeNull();
        await transport.close();
    });
});
