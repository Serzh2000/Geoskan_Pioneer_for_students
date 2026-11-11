/**
 * База протокола Plazlink (снята с настоящего Мини 2): целостность данных и согласованность
 * с таблицей HUB_MAP (каждое поле SDK указывает на существующее поле автопилота).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    PLAZLINK_BOARD_STATE, PLAZLINK_COMPONENTS, PLAZLINK_HUB_MAP, PLAZLINK_MESSAGE_IDS, PLAZLINK_RESULT,
    PLAZLINK_SYSTEM_COMMANDS, PLAZLINK_TYPES, PLAZLINK_UAV_TYPES
} from '../public/modules/hardware/plazlink/protocol-db.js';

describe('база протокола Plazlink', () => {
    test('11 компонентов и 178 полей, номера подряд', () => {
        expect(PLAZLINK_COMPONENTS.map((c) => c.name)).toEqual([
            'Battery', 'Actuators', 'SmartBoard', 'SensorMonitor', 'EnvMonitor', 'FlightManager', 'ManualControl',
            'UavMonitor', 'CanMaster', 'LpsMonitor', 'OptCamera'
        ]);
        expect(PLAZLINK_COMPONENTS.reduce((sum, c) => sum + c.fields.length, 0)).toBe(178);
        for (const component of PLAZLINK_COMPONENTS) {
            expect(component.fields.map((f) => f.id)).toEqual(component.fields.map((_, i) => i));
            for (const field of component.fields) expect(PLAZLINK_TYPES[field.type]).toBeDefined();
        }
    });

    test('каждое поле HUB_MAP есть у автопилота, кроме модулей, не установленных на Мини 2', () => {
        const known = new Map(PLAZLINK_COMPONENTS.map((c) => [c.name, new Set(c.fields.map((f) => f.name))]));
        const missing: string[] = [];
        for (const [hub, fields] of Object.entries(PLAZLINK_HUB_MAP)) {
            for (const [field, targets] of Object.entries(fields)) {
                // Достаточно одного существующего варианта: Ublox/Allystar/USNav есть не у каждой платы.
                if (!targets.some(([component, name]) => known.get(component)?.has(name))) missing.push(`${hub}.${field}`);
            }
        }
        // Поля модулей, которых на Мини 2 нет (GNSS, USNav, ledBar/grab и т.п.), перечислены явно.
        expect(missing.sort()).toMatchSnapshot();
    });

    test('константы протокола', () => {
        expect(PLAZLINK_BOARD_STATE).toEqual({ DISARM: 0, ARM: 1, TAKEOFF: 2, RTL: 3, LAND: 4 });
        expect(PLAZLINK_MESSAGE_IDS.MANUAL_CONTROL).toBe(37);
        expect(PLAZLINK_MESSAGE_IDS.GO_TO_POINT_V2).toBe(33);
        expect(PLAZLINK_RESULT.SUCCESS).toBe(0);
        expect(PLAZLINK_SYSTEM_COMMANDS[18]).toBe('Restart');
        expect(PLAZLINK_UAV_TYPES[12]).toBe('GeoScan Pioneer');
    });

    test('JSON-источник лежит рядом (если папка reference есть)', () => {
        const file = path.join(process.cwd(), 'reference', 'mini2-disk', 'proto-introspection', 'proto-components.json');
        if (!fs.existsSync(file)) return;
        const source = JSON.parse(fs.readFileSync(file, 'utf8'));
        expect(Object.keys(source).length).toBe(PLAZLINK_COMPONENTS.length);
    });
});
