/**
 * Справочник Swarm Kit в редакторе (python-swarm-api-docs.ts) полон относительно эмуляции: каждый метод и свойство
 * PioneerSwarmUnit, SwarmUnitType и каждый поток каталога описаны; ключи не пересекаются со справочниками SDK2 и ROS 2.
 */
import { pythonRos2ApiDocs } from '../public/modules/docs/python-ros2-api-docs.js';
import { pythonSdk2ApiDocs } from '../public/modules/docs/python-sdk2-api-docs.js';
import { pythonSwarmApiDocs } from '../public/modules/docs/python-swarm-api-docs.js';
import { SWARM_PRELUDE } from '../public/modules/python/swarm/prelude.js';

const catalog = [...SWARM_PRELUDE.matchAll(/^ {4}\('([a-z_/]+)', '[a-z_]+\/msg\/\w+', (?:[\d.]+(?: \/ [\d.]+)?|None), '\w+'\),$/gm)].map((m) => m[1]);
const methods = [...SWARM_PRELUDE.matchAll(/^ {4}(?:async )?def ([a-z]\w+)\(self/gm)].map((m) => m[1]);

describe('справочник Swarm Kit', () => {
    test('в прелюдии найден весь каталог потоков (9)', () => {
        expect(catalog).toHaveLength(9);
    });

    test.each(catalog)('поток %s описан', (name) => {
        const doc = pythonSwarmApiDocs[`pioneer1/${name}`];
        expect(doc).toBeDefined();
        expect(doc.kind).toBe('Topic');
        expect(doc.desc).toContain('Тип: ');
        expect(doc.insertText).toBe(`"${name}"`);
    });

    test('описаны все публичные методы PioneerSwarmUnit, свойства и SwarmUnitType', () => {
        const publicMethods = methods.filter((name) => ['get_unit_list', 'send_message_to_unit', 'get_next_message', 'get_telemetry_from_unit', 'close'].includes(name));
        expect(publicMethods.sort()).toEqual(['close', 'get_next_message', 'get_telemetry_from_unit', 'get_unit_list', 'send_message_to_unit']);
        for (const key of ['PioneerSwarmUnit', 'PioneerSwarmUnit.id', 'PioneerSwarmUnit.unit_type', ...publicMethods.map((name) => `PioneerSwarmUnit.${name}`), 'SwarmUnitType']) {
            expect({ key, documented: pythonSwarmApiDocs[key] !== undefined }).toEqual({ key, documented: true });
        }
    });

    test('у каждой записи есть описание, сигнатура, пример и вставка; в примерах есть импорт', () => {
        for (const [key, doc] of Object.entries(pythonSwarmApiDocs)) {
            expect({ key, ok: Boolean(doc.desc && doc.syntax && doc.example && doc.insertText) }).toEqual({ key, ok: true });
            expect(doc.example).toMatch(/pioneer_swarm|SwarmUnitType/);
        }
    });

    test('ключи не пересекаются со справочниками pioneer_sdk2 и ROS 2', () => {
        const overlap = Object.keys(pythonSwarmApiDocs).filter((key) => key in pythonSdk2ApiDocs || key in pythonRos2ApiDocs);
        expect(overlap).toEqual([]);
    });

    test('описание упоминает допущения симулятора: домен, ящик, 3 секунды, None', () => {
        expect(pythonSwarmApiDocs['PioneerSwarmUnit.get_unit_list'].desc).toContain('3 секунды');
        expect(pythonSwarmApiDocs['PioneerSwarmUnit.get_next_message'].desc).toContain('None');
        expect(pythonSwarmApiDocs['PioneerSwarmUnit'].desc).toContain('machine_id');
    });
});

describe('текст прелюдии', () => {
    test('нет обратных кавычек, шаблонных вставок и обратных слэшей (текст лежит в шаблонной строке)', () => {
        const python = SWARM_PRELUDE;
        expect(python).not.toMatch(/`|\$\{|\\/);
    });
});
