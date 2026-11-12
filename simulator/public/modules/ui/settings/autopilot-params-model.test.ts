import { jest } from '@jest/globals';

async function importFreshModel() {
    jest.resetModules();
    return import('./autopilot-params-model.js');
}

describe('autopilot-params-model', () => {
    test('loads built-in template definitions', async () => {
        const model = await importFreshModel();
        const defs = model.getAutopilotParameterDefinitions();
        const summary = model.getAutopilotValidationSummary();

        expect(defs.length).toBeGreaterThan(150);
        expect(defs.find((item) => item.key === 'Copter_man_attScale')?.source).toBe('documentation');
        expect(summary.total).toBe(defs.length);
        expect(summary.documented).toBeGreaterThan(10);
    });

    test('imports a valid properties file and updates changed keys', async () => {
        const model = await importFreshModel();
        const text = [
            '# profile',
            'Copter_man_attScale=0.3',
            'Flight_com_navSystem=1',
            'Logger_attitude=0'
        ].join('\n');

        const result = model.importAutopilotProperties(text, 'valid.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.changedKeys).toEqual(expect.arrayContaining(['Copter_man_attScale', 'Flight_com_navSystem', 'Logger_attitude']));
        expect(result.state.values.Copter_man_attScale).toBe(0.3);
        expect(result.state.sourceFileName).toBe('valid.properties');
        expect(result.state.auditLog[0]?.source).toBe('file-import');
    });

    test('loads parameter schema from source properties text', async () => {
        const model = await importFreshModel();
        const text = [
            '# source profile',
            'BoardPioneer_auxUMux=0',
            'Flight_com_navSystem=2',
            'Telemetry_stream=9'
        ].join('\n');

        const state = model.loadAutopilotTemplateFromText(text, 'source.properties');
        const defs = model.getAutopilotParameterDefinitions();

        expect(defs.map((item) => item.key)).toEqual([
            'BoardPioneer_auxUMux',
            'Flight_com_navSystem',
            'Telemetry_stream'
        ]);
        expect(state.values.Telemetry_stream).toBe(9);
        expect(state.sourceFileName).toBe('source.properties');
    });

    test('skips bad entries with warnings and still applies the good ones', async () => {
        const model = await importFreshModel();
        const text = [
            'Copter_throttleMode=4',
            'Copter_pos_vMax=abc',
            'Copter_pos_vUp=',
            'Serial_name=ttyS1',
            'Copter_pos_vDown=0.7',
            '=novalue'
        ].join('\n');

        const result = model.importAutopilotProperties(text, 'messy.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.state.values.Copter_pos_vDown).toBe(0.7);
        // Недопустимое значение не применено, текущее сохранено.
        expect(result.state.values.Copter_throttleMode).toBe(1);
        expect(result.state.values.Copter_pos_vMax).not.toBeNaN();
        expect(result.warnings.join(' ')).toContain('Copter_throttleMode');
        expect(result.warnings.join(' ')).toContain('Copter_pos_vMax');
        // Нечисловое значение возвращается при экспорте без потерь.
        expect(model.exportAutopilotPropertiesText()).toContain('Serial_name=ttyS1');
    });

    test('rejects only a file with no usable parameters at all', async () => {
        const model = await importFreshModel();
        const result = model.importAutopilotProperties('Copter_pos_vMax=abc\n!x\n', 'bad.properties', 'QA');
        expect(result.ok).toBe(false);
        expect(model.getAutopilotSettingsState().values.Copter_pos_vMax).toBe(0.4);
    });

    test('accepts parameters unknown to the template and extends the schema', async () => {
        const model = await importFreshModel();
        const before = model.getAutopilotParameterDefinitions().length;
        const text = [
            '# 2026-06-19 12:27',
            'Lua_gpio=1.0',
            'Offsets_gyro_zOffset=3.0E-5',
            'Power_voltageRatio=6.6',
            'Copter_man_attScale=0.25'
        ].join('\n');

        const result = model.importAutopilotProperties(text, 'new.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.state.values.Offsets_gyro_zOffset).toBe(3e-5);
        expect(result.state.values.Power_voltageRatio).toBe(6.6);
        expect(model.getAutopilotParameterDefinitions().length).toBe(before + 3);
        expect(model.getAutopilotParameterDefinitions().find((d) => d.key === 'Lua_gpio')?.group).toBe('Lua');
        expect(model.exportAutopilotPropertiesText()).toContain('Offsets_gyro_zOffset=0.00003');
        expect(result.warnings.join(' ')).toContain('добавлено новых параметров — 3');

        // Повторный импорт того же файла: новых ключей нет, изменений нет.
        const again = model.importAutopilotProperties(text, 'new.properties', 'QA');
        expect(again.ok).toBe(true);
        expect(again.changedKeys).toEqual([]);
        expect(model.getAutopilotParameterDefinitions().length).toBe(before + 3);
    });

    test('values outside documentation range are applied with a warning, not rejected', async () => {
        const model = await importFreshModel();
        const result = model.importAutopilotProperties('Copter_man_velScale=3\nCopter_pos_vMax=0.4','range.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.state.values.Copter_man_velScale).toBe(3);
        expect(result.warnings.join(' ')).toContain('Copter_man_velScale');
    });

    test('tolerates BOM, CRLF, "!" comments, ":" separators, spaces and Java number formats', async () => {
        const model = await importFreshModel();
        const text = [
            '﻿! comment',
            '  Copter_pos_vMax : 0.7',
            'Flight_com_navSystem 1',
            'Copter_pos_aMax=1.5d',
            'Copter_flyWithoutRc=true',
            ''
        ].join('\r\n');

        const result = model.importAutopilotProperties(text, 'java.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.state.values.Copter_pos_vMax).toBe(0.7);
        expect(result.state.values.Flight_com_navSystem).toBe(1);
        expect(result.state.values.Copter_pos_aMax).toBe(1.5);
        expect(result.state.values.Copter_flyWithoutRc).toBe(1);
    });

    test('duplicate keys use the last value and warn', async () => {
        const model = await importFreshModel();
        const result = model.importAutopilotProperties('Copter_pos_vMax=0.5\nCopter_pos_vMax=0.6','dup.properties', 'QA');

        expect(result.ok).toBe(true);
        expect(result.state.values.Copter_pos_vMax).toBe(0.6);
        expect(result.warnings.join(' ')).toContain('Повторяются');
    });

    test('rejects a file with no parameters', async () => {
        const model = await importFreshModel();
        const result = model.importAutopilotProperties('# only comments\n\n', 'empty.properties', 'QA');
        expect(result.ok).toBe(false);
    });

    test('manual update validates and records rejected change', async () => {
        const model = await importFreshModel();

        const rejected = model.updateAutopilotParameter('Copter_man_attScale', '10', 'QA');
        expect(rejected.ok).toBe(false);
        expect(rejected.error).toContain('не должно быть больше');
        expect(rejected.state.auditLog[0]?.status).toBe('rejected');

        const accepted = model.updateAutopilotParameter('Copter_man_attScale', '0.4', 'QA');
        expect(accepted.ok).toBe(true);
        expect(accepted.state.values.Copter_man_attScale).toBe(0.4);
        expect(accepted.state.auditLog[0]?.status).toBe('applied');
    });
});
