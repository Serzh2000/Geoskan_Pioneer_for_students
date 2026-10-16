import { jest } from '@jest/globals';
import { PIONEER_USB_FILTER, PortNotChosenError, SERIAL_PORT_FILTERS, openPioneerPort } from '../public/modules/hardware/web-serial-transport.js';
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
