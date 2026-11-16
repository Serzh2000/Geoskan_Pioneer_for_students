/**
 * «Мастер настройки» (пресеты Pioneer Station 2.0): значения проверяются по настоящим профилям с борта, которые учитель выгрузил
 * из Станции: радио, Python (Wi-Fi) и вариант для бортового компьютера. Если значения мастера разойдутся с профилями, тест упадёт.
 */
import { AUTOPILOT_PRESETS } from '../public/modules/ui/settings/autopilot-params-ui/presets.js';
import { WIZARD_GROUPS, buildWizardProfile } from '../public/modules/ui/settings/autopilot-params-ui/station2-presets.js';

const profile = (id: string) => Object.fromEntries(AUTOPILOT_PRESETS.find((preset) => preset.id === id)!.text.split('\n').filter(Boolean).map((line) => {
    const [key, value] = line.split('=');
    return [key, Number(value)];
}));
const option = (group: string, id: string) => WIZARD_GROUPS.find((item) => item.id === group)!.options.find((item) => item.id === id)!;

describe('мастер настройки', () => {
    test('«Fly-Sky» и «Wi-Fi» совпадают с профилями radio и python-jump', () => {
        for (const [id, preset] of [['flysky', 'radio'], ['wifi', 'python-jump']] as const) {
            const values = option('link', id).values;
            const real = profile(preset);
            for (const [key, value] of Object.entries(values)) expect({ key, value: real[key] }).toEqual({ key, value });
        }
    });

    test('«ОПТ» и «Медленная» и «Центрированное» совпадают с тем, что стоит в профилях борта', () => {
        for (const preset of ['radio', 'python-jump', 'pi-os']) {
            const real = profile(preset);
            for (const [group, id] of [['nav', 'opt'], ['speed', 'low'], ['throttle', 'centered']] as const) {
                for (const [key, value] of Object.entries(option(group, id).values)) expect({ preset, key, value: real[key] }).toEqual({ preset, key, value });
            }
        }
    });

    test('у каждого варианта есть название, пояснение и значения; ключи не пересекаются между шагами', () => {
        const owner = new Map<string, string>();
        for (const group of WIZARD_GROUPS) {
            expect(group.options.length).toBeGreaterThanOrEqual(2);
            for (const item of group.options) {
                expect(item.title.length).toBeGreaterThan(2);
                expect(item.text.length).toBeGreaterThan(30);
                for (const key of Object.keys(item.values)) {
                    const previous = owner.get(key);
                    if (previous) expect(previous).toBe(group.id); // ключ принадлежит одному шагу
                    owner.set(key, group.id);
                }
            }
        }
    });

    test('профиль мастера собирается только из выбранного, пустой выбор даёт null', () => {
        expect(buildWizardProfile({})).toBeNull();
        const built = buildWizardProfile({ link: 'wifi', speed: 'middle' })!;
        expect(built.title).toBe('Мастер настройки: Wi-Fi · Средняя');
        const lines = built.text.split('\n').filter(Boolean);
        expect(lines).toContain('BoardPioneer_auxUMux=3');
        expect(lines).toContain('Copter_man_attScale=0.3');
        expect(lines.some((line) => line.startsWith('Flight_com_navSystem'))).toBe(false);
    });
});
