import { assignMachineIds } from '../public/modules/python/swarm/machine-id.js';

const ids = (names: string[]) => [...assignMachineIds(names.map((name, index) => ({ id: `d${index}`, name }))).values()];

describe('machine_id юнитов роя', () => {
    test('номер берётся из конца имени дрона', () => {
        expect(ids(['Пионер Базовый 1', 'Пионер Мини 2 · 3', 'Пионер Базовый 2'])).toEqual(['pioneer1', 'pioneer3', 'pioneer2']);
    });

    test('повторы и имена без номера получают наименьший свободный номер, чужие номера не занимаются', () => {
        expect(ids(['Пионер Мини 2 · 3', 'Пионер Мини 2 · 3', 'Альфа', 'Пионер Базовый 1'])).toEqual(['pioneer3', 'pioneer2', 'pioneer4', 'pioneer1']);
    });

    test('результат детерминирован и не зависит от того, что запущено: одни и те же имена - одни и те же id', () => {
        const names = ['Пионер Мини 2 · 2', 'Борт', 'Пионер Базовый 1'];
        expect(ids(names)).toEqual(ids(names));
        expect(ids(names)).toEqual(['pioneer2', 'pioneer3', 'pioneer1']);
    });

    test('все идентификаторы уникальны и годятся для имён топиков', () => {
        const names = Array.from({ length: 30 }, (_, index) => (index % 3 === 0 ? 'Дрон' : `Пионер ${index % 7}`));
        const result = ids(names);
        expect(new Set(result).size).toBe(names.length);
        expect(result.every((id) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id))).toBe(true);
    });

    test('нулевой и огромный номер игнорируются', () => {
        expect(ids(['Пионер 0', 'Пионер 99999999999999999999'])).toEqual(['pioneer1', 'pioneer2']);
    });

    test('пустой список', () => {
        expect(ids([])).toEqual([]);
    });
});
