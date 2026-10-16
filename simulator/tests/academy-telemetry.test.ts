import { getTelemetryAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/telemetry.js';
import { gradeTelemetryAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/telemetry.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';
const scene = (number: number) => ({ number, profile: 'field', seed: 42, sameSeedRepeats: 1, differentSeeds: 1, intact: true });

test.each(['lua', 'python'] as const)('all nine %s telemetry solutions execute and report real measurements', language => {
    const execute = (code: string) => language === 'lua' ? executeAcademyLua(code, { flight: true }) : executeAcademyPython(code);
    for (const lesson of getTelemetryAcademyPractices(language)) {
        const number = lesson.academy!.number;
        const outcome = execute(lesson.solutionCode);
        expect({ number, error: outcome.error }).toEqual({ number, error: null });
        const evaluation = gradeTelemetryAcademy(number, outcome.samples, outcome.events, { code: lesson.solutionCode, scene: scene(number) });
        expect({ number, errors: evaluation.diagnostics.filter(item => item.kind === 'error') }).toEqual({ number, errors: [] });
        if (number === 65) {
            expect(evaluation.solved).toBe(false);
            const slow = execute(lesson.solutionCode.replace(language === 'lua' ? 'Timer.callLater(0.2,measure)' : 'time.sleep(0.2)', language === 'lua' ? 'Timer.callLater(0.8,measure)' : 'time.sleep(0.8)'));
            expect(gradeTelemetryAcademy(65, slow.samples, slow.events, { code: '', scene: scene(65), trials: [evaluation.academyTrial!] }).solved).toBe(true);
        } else expect(evaluation.solved).toBe(true);
    }
});

test('claimed readings, premature height indication and wrong error signs fail', () => {
    const lessons = getTelemetryAcademyPractices('python');
    const run = (number: number, source: string) => { const result = executeAcademyPython(source); return gradeTelemetryAcademy(number, result.samples, result.events, { code: source, scene: scene(number) }).solved; };
    expect(run(64, lessons.find(item => item.academy!.number === 64)!.solutionCode.split('pioneer.get_local_position_lps()').join('[2,0,1]'))).toBe(false);
    expect(run(67, lessons.find(item => item.academy!.number === 67)!.solutionCode.replace('z>=1.8', 'z>=0.1'))).toBe(false);
    expect(run(68, lessons.find(item => item.academy!.number === 68)!.solutionCode.replace('2-x', 'x-2'))).toBe(false);
    for (let number = 64; number <= 72; number++) expect(run(number, '')).toBe(false);
});
