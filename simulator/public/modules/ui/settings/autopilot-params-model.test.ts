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

    test('rejects invalid properties file content', async () => {
        const model = await importFreshModel();
        const text = [
            'Unknown_param=1',
            'Copter_throttleMode=4'
        ].join('\n');

        const result = model.importAutopilotProperties(text, 'invalid.properties', 'QA');

        expect(result.ok).toBe(false);
        expect(result.errors.join(' ')).toContain('Unknown_param');
        expect(result.errors.join(' ')).toContain('Copter_throttleMode');
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
