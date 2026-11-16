/** Предпросмотр профиля: что изменится относительно открытого сейчас, без применения и без дрона. */
import { buildPreview } from '../public/modules/ui/settings/autopilot-params-ui/preview.js';

const current = { Copter_alt_b: 0.5, Copter_flyWithoutRc: 0, Board_number: 10345 };

describe('buildPreview', () => {
    test('считает изменённые, новые и совпавшие параметры', () => {
        const preview = buildPreview('Copter_alt_b=0.5\nCopter_flyWithoutRc=1\nLua_gpio=1\n', current);
        expect(preview.summary).toMatchObject({ total: 3, changed: 1, added: 1, unchanged: 1, skipped: 0 });
        const changed = preview.rows.find((row) => row.key === 'Copter_flyWithoutRc');
        expect(changed).toMatchObject({ current: 0, next: 1, protectedParam: false });
        expect(preview.rows.find((row) => row.key === 'Lua_gpio')).toMatchObject({ current: null, next: 1 });
        expect(preview.rows.some((row) => row.key === 'Copter_alt_b')).toBe(false);
    });

    test('калибровки и номер борта помечаются как не пишущиеся на дрон', () => {
        const preview = buildPreview('Board_number=999\nOffsets_gyro_xOffset=0.1\n', current);
        expect(preview.rows.map((row) => [row.key, row.protectedParam])).toEqual([['Board_number', true], ['Offsets_gyro_xOffset', true]]);
    });

    test('повторы ключа считаются один раз, непонятные строки попадают в «не разобрано»', () => {
        const preview = buildPreview('Copter_flyWithoutRc=1\nCopter_flyWithoutRc=1\nCopter_alt_b=много\n=пусто\n', current);
        expect(preview.summary.total).toBe(1);
        expect(preview.summary.skipped).toBeGreaterThanOrEqual(1);
    });

    test('к описанию берётся первая фраза, не весь абзац', () => {
        const preview = buildPreview('BoardPioneer_baudrate=115200\n', {});
        expect(preview.rows[0].description).toMatch(/Скорость последовательного порта/);
        expect(preview.rows[0].description.endsWith('.')).toBe(true);
    });

    test('пустой файл даёт пустой результат', () => {
        expect(buildPreview('# только комментарий\n', current).summary).toMatchObject({ total: 0, changed: 0, added: 0 });
    });
});

import { pluralize } from '../public/modules/ui/settings/autopilot-params-ui/helpers.js';

describe('pluralize', () => {
    test.each([[0, '0 параметров'], [1, '1 параметр'], [2, '2 параметра'], [4, '4 параметра'], [5, '5 параметров'], [11, '11 параметров'], [12, '12 параметров'], [21, '21 параметр'], [22, '22 параметра'], [111, '111 параметров'], [193, '193 параметра']])('%i -> %s', (count, text) => {
        expect(pluralize(count, 'параметр', 'параметра', 'параметров')).toBe(text);
    });
});
