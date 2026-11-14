/**
 * Готовые наборы параметров автопилота: профили снятые с борта, плюс описания «ключевых отличий» на карточках.
 * Тест держит описания честными: каждое утверждение проверяется по значениям из самого профиля.
 */
import { AUTOPILOT_PRESETS, findAutopilotPreset } from '../public/modules/ui/settings/autopilot-params-ui/presets.js';

const parse = (text: string) => Object.fromEntries(text.split('\n').filter(Boolean).map((line) => {
    const [key, value] = line.split('=');
    return [key, Number(value)];
}));

describe('готовые наборы параметров автопилота', () => {
    test('три набора с уникальными id, у каждого непустое описание и отличия', () => {
        expect(AUTOPILOT_PRESETS.map((preset) => preset.id)).toEqual(['python-jump', 'radio', 'pi-os']);
        for (const preset of AUTOPILOT_PRESETS) {
            expect(preset.title.length).toBeGreaterThan(3);
            expect(preset.summary.length).toBeGreaterThan(10);
            expect(preset.highlights.length).toBeGreaterThanOrEqual(3);
            expect(findAutopilotPreset(preset.id)).toBe(preset);
        }
        expect(findAutopilotPreset('нет такого')).toBeUndefined();
    });

    test('профили целые: все строки вида имя=число, без даты-комментария, около 250 параметров', () => {
        for (const preset of AUTOPILOT_PRESETS) {
            const lines = preset.text.split('\n').filter(Boolean);
            expect(lines.length).toBeGreaterThan(240);
            expect(lines.every((line) => /^[A-Za-z0-9_]+=-?[0-9.]+(E-?[0-9]+)?$/.test(line))).toBe(true);
            expect(preset.text.includes('#')).toBe(false);
        }
    });

    test('описания отличий совпадают со значениями в профилях', () => {
        const [jump, radio, pi] = AUTOPILOT_PRESETS.map((preset) => parse(preset.text));
        // python-jump: ESP32 включён, полёт без пульта разрешён, Lua включён, порт 57600.
        expect([jump.BoardPioneer_modules_esp32, jump.Copter_flyWithoutRc, jump.Modules_lua, jump.BoardPioneer_baudrate]).toEqual([1, 1, 1, 57600]);
        // radio: ESP32 выключен, без пульта не летит, Lua включён, порт 57600.
        expect([radio.BoardPioneer_modules_esp32, radio.Copter_flyWithoutRc, radio.Modules_lua, radio.BoardPioneer_baudrate]).toEqual([0, 0, 1, 57600]);
        // pi-os: порт 115200, Lua выключен, проверка моторов 10 с, ESP32 выключен.
        expect([pi.BoardPioneer_baudrate, pi.Modules_lua, pi.Copter_motorCheckTime, pi.BoardPioneer_modules_esp32]).toEqual([115200, 0, 10, 0]);
    });

    test('в наборах есть калибровки и номер борта: они защищены от записи по умолчанию', async () => {
        const { isProtectedParam } = await import('../public/modules/hardware/drone-params.js');
        for (const preset of AUTOPILOT_PRESETS) {
            const protectedKeys = Object.keys(parse(preset.text)).filter(isProtectedParam);
            expect(protectedKeys).toEqual(expect.arrayContaining(['Board_number', 'Offsets_gyro_xOffset', 'State_startCount']));
        }
    });
});
