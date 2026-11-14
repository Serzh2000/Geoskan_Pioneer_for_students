/** Варианты значения параметра автопилота из текста подсказки («0 - выключить; 1 - включить.»). */
import { parseOptions } from '../public/modules/ui/settings/autopilot-params-ui/param-markup.js';

describe('parseOptions', () => {
    test('два варианта через точку с запятой', () => {
        expect(parseOptions('0 - выключить; 1 - включить.')).toEqual([{ value: 0, label: 'выключить' }, { value: 1, label: 'включить' }]);
    });

    test('варианты на отдельных строках, отрицательные и дробные значения', () => {
        expect(parseOptions('-1 - выключено\n0.5 - половина\n1 - полностью')).toEqual([
            { value: -1, label: 'выключено' }, { value: 0.5, label: 'половина' }, { value: 1, label: 'полностью' }
        ]);
    });

    test('обычное пояснение, один вариант и пустая строка не считаются перечислением', () => {
        expect(parseOptions('Скорость порта, бод/с.')).toEqual([]);
        expect(parseOptions('0 - выключить.')).toEqual([]);
        expect(parseOptions('')).toEqual([]);
        // одна часть не по шаблону ломает всё перечисление: иначе потеряли бы смысл
        expect(parseOptions('0 - выключить; иначе включить')).toEqual([]);
    });

    test('слишком длинный список (больше 8) показывается обычным полем', () => {
        const many = Array.from({ length: 9 }, (_, i) => `${i} - вариант ${i}`).join('; ');
        expect(parseOptions(many)).toEqual([]);
    });
});
