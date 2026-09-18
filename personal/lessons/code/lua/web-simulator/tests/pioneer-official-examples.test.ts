import { jest } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('./fixtures/pioneer-official/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')) as {
    files: Array<{ file: string; sha256: string }>;
};
const scripts = ['station', 'gitflic'].flatMap(source =>
    readdirSync(new URL(`${source}/`, root)).filter(name => name.endsWith('.lua'))
        .map(name => `${source}/${name}`));

describe('unmodified Pioneer Station and Geoscan Lua examples', () => {
    let state: typeof import('../public/modules/core/state.js');
    let runtime: typeof import('../public/modules/lua/runtime.js');
    let updatePhysics: typeof import('../public/modules/physics/index.js').updatePhysics;
    let collectLuaIssues: typeof import('../public/modules/app/script-execution-notice/lua-validation.js').collectLuaIssues;
    let collectLuaBlockingIssues: typeof import('../public/modules/app/script-execution-notice/lua-validation.js').collectLuaBlockingIssues;
    const failures: string[] = [];

    beforeAll(async () => {
        (globalThis as any).window = { requestAnimationFrame: () => 0 };
        (globalThis as any).document = {
            getElementById: () => null,
            createElement: () => ({ append: () => {}, appendChild: () => {} })
        };
        // @ts-expect-error Fengari is a transitive dependency without declarations.
        const fengari = await import('fengari');
        jest.unstable_mockModule('fengari-web', () => fengari);
        state = await import('../public/modules/core/state.js');
        runtime = await import('../public/modules/lua/runtime.js');
        ({ updatePhysics } = await import('../public/modules/physics/index.js'));
        ({ collectLuaIssues, collectLuaBlockingIssues } = await import('../public/modules/app/script-execution-notice/lua-validation.js'));
        const { onMissionNotices } = await import('../public/modules/core/mission-notices.js');
        onMissionNotices({
            scriptFailure: (_language, error) => failures.push(String(error)),
            simultaneousCommands: commands => failures.push(`simultaneous: ${commands.join(',')}`),
            missionGamepadOverride: () => {}, missingCallbackMission: () => {},
            earlyRoute: () => {}, genericNotice: () => {}
        });
    });

    test.each(scripts)('%s runs without Lua or FSM failures', (file) => {
        const bytes = readFileSync(new URL(file, root));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.files.find(entry => entry.file === file)?.sha256);
        const code = bytes.toString('utf8');
        const drone = state.createDroneState('official_example', file);
        state.resetState(drone.id);
        state.simSettings.gamepadConnected = false;
        failures.length = 0;
        drone.running = true;
        try {
            runtime.runLuaScript(drone.id, code);
            for (let tick = 0; tick < 120 * 60 && drone.running; tick++) {
                // The RC example requires a brief switch activation, then release.
                if (file.endsWith('rc_script_start.lua')) {
                    state.simSettings.gamepadConnected = true;
                    drone.rcChannels[7] = tick < 65 ? 2000 : 1000;
                }
                updatePhysics(1 / 60);
            }
            expect(failures).toEqual([]);
            expect(drone.running).toBe(true);
            expect(collectLuaBlockingIssues(code)).toEqual([]);
            expect(collectLuaIssues(code)).toEqual([]);
            if (/example_(go_to_point|path)\.lua$|rc_script_start\.lua$/.test(file)) {
                expect(drone.luaDiagnostics.fsmTransitions.some(entry => entry.to === 'FLYING_MOVING')).toBe(true);
                expect(drone.fsmState).toBe('IDLE');
            }
        } finally {
            runtime.stopLuaScript(drone.id);
            delete state.drones[drone.id];
            state.simSettings.gamepadConnected = false;
        }
    }, 30000);
});
