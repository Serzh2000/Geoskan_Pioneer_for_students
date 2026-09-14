import { jest } from '@jest/globals';

// Минимальный, но валидный JPEG: важны именно маркеры SOI/EOI, по которым настоящий
// pioneer_sdk вырезает кадр из UDP-датаграммы.
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
const JPEG_DATA_URL = `data:image/jpeg;base64,${Buffer.from(JPEG_BYTES).toString('base64')}`;

const renderMock = {
    dataUrl: null as string | null,
    pixels: null as { width: number; height: number; data: Uint8Array } | null
};

describe('python camera bridge frames', () => {
    let getDroneCameraFrame: typeof import('../public/modules/python/pioneer-js-bridge-camera.js').getDroneCameraFrame;
    let getDroneCameraCvFrame: typeof import('../public/modules/python/pioneer-js-bridge-camera.js').getDroneCameraCvFrame;

    beforeAll(async () => {
        jest.unstable_mockModule('fengari-web', () => ({
            lua: {},
            lauxlib: {},
            lualib: {},
            to_luastring: (value: string) => value,
            to_jsstring: (value: unknown) => value
        }));

        // Реальный рендер тянет three.js и живой WebGL-контекст, которых в jsdom-less окружении
        // нет; проверяется здесь не картинка, а то, что байты кадра доезжают до Python без потерь.
        jest.unstable_mockModule('../public/modules/python/pioneer-js-bridge-camera-render.js', () => ({
            captureDroneCameraFrameDataUrl: () => renderMock.dataUrl,
            captureDroneCameraFramePixels: () => renderMock.pixels
        }));

        const globalScope = globalThis as unknown as Record<string, unknown>;
        globalScope.window = { addEventListener: () => {} };
        globalScope.document = { addEventListener: () => {}, getElementById: () => null };
        globalScope.performance = globalThis.performance || { now: () => Date.now() };

        ({ getDroneCameraFrame, getDroneCameraCvFrame } = await import('../public/modules/python/pioneer-js-bridge-camera.js'));
    });

    beforeEach(() => {
        renderMock.dataUrl = null;
        renderMock.pixels = null;
    });

    test('get_frame отдаёт байты настоящего JPEG с маркерами FFD8/FFD9', () => {
        renderMock.dataUrl = JPEG_DATA_URL;

        const frame = getDroneCameraFrame('drone_1');

        expect(frame).toBeInstanceOf(Uint8Array);
        expect(Array.from(frame as Uint8Array)).toEqual(Array.from(JPEG_BYTES));
        expect((frame as Uint8Array)[0]).toBe(0xff);
        expect((frame as Uint8Array)[1]).toBe(0xd8);
        expect((frame as Uint8Array).slice(-2)).toEqual(new Uint8Array([0xff, 0xd9]));
    });

    test('get_frame возвращает null, когда кадр снять неоткуда', () => {
        expect(getDroneCameraFrame('drone_1')).toBeNull();
    });

    test('get_frame возвращает null на битом data URL вместо мусорных байтов', () => {
        renderMock.dataUrl = 'not-a-data-url';
        expect(getDroneCameraFrame('drone_1')).toBeNull();
    });

    test('get_cv_frame отдаёт размеры и пиксели BGR без копирования в JSON', () => {
        const data = new Uint8Array([1, 2, 3, 4, 5, 6]);
        renderMock.pixels = { width: 2, height: 1, data };

        const frame = getDroneCameraCvFrame('drone_1');

        expect(frame).not.toBeNull();
        expect(frame?.width).toBe(2);
        expect(frame?.height).toBe(1);
        expect(frame?.data).toBe(data);
        expect(frame?.data.length).toBe(frame!.width * frame!.height * 3);
    });

    test('get_cv_frame возвращает null, когда камера ни к чему не подключена', () => {
        expect(getDroneCameraCvFrame('drone_1')).toBeNull();
    });
});
