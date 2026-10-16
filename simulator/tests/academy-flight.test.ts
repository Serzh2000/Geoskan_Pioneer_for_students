import { FLIGHT_EXERCISES, getFlightAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/flight.js';
import { gradeFlightAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/flight.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';

const scene = (number: number) => ({ number, profile: 'test', seed: 42, sameSeedRepeats: 2, differentSeeds: 2, intact: true });
test.each(['lua', 'python'] as const)('all 27 %s flight/map solutions execute their event and wait logic', language => {
    for (const lesson of getFlightAcademyPractices(language)) {
        const number = lesson.academy!.number;
        const outcome = language === 'lua' ? executeAcademyLua(lesson.solutionCode, { flight: true, hill: number === 42 }) : executeAcademyPython(lesson.solutionCode, { hill: number === 42 });
        expect({ number, error: outcome.error }).toEqual({ number, error: null });
        const evaluation = gradeFlightAcademy(number, outcome.samples, outcome.events, { code: lesson.solutionCode, scene: scene(number) });
        expect({ number, errors: evaluation.diagnostics.filter(item => item.kind === 'error') }).toEqual({ number, errors: [] });
    }
});

test('a final point, a claimed arrival and an unprepared map do not prove a route', () => {
    const lesson = getFlightAcademyPractices('python').find(item => item.academy!.number === 48)!;
    const source = lesson.solutionCode;
    const skipped = executeAcademyPython(source.replace('pioneer.go_to_local_point(0,2,1)', 'print("пропуск вершины")').replace('wait_point()\nprint("Точка 1")', 'print("Точка 1")'));
    expect(gradeFlightAcademy(48, skipped.samples, skipped.events, { code: source, scene: scene(48) }).solved).toBe(false);
    const correct = executeAcademyPython(source);
    expect(gradeFlightAcademy(48, correct.samples, correct.events, { code: source }).solved).toBe(false);
    expect(gradeFlightAcademy(48, correct.samples, correct.events.filter(event => event.kind !== 'state'), { code: source, scene: scene(48) }).solved).toBe(false);
    const empty = executeAcademyPython('print("Опыт завершён")');
    for (const spec of FLIGHT_EXERCISES.filter(item => item.number !== 55)) expect(gradeFlightAcademy(spec.number, empty.samples, empty.events, { code: '', scene: scene(spec.number) }).solved).toBe(false);
});

test('repeatability requires three completed flights and seed lessons require real preparation evidence', () => {
    const lesson = getFlightAcademyPractices('python').find(item => item.academy!.number === 54)!;
    const result = executeAcademyPython(lesson.solutionCode);
    const trials: string[] = [];
    for (let i = 0; i < 3; i++) {
        const evaluation = gradeFlightAcademy(54, result.samples, result.events, { code: lesson.solutionCode, scene: scene(54), trials });
        expect(evaluation.solved).toBe(i === 2);
        trials.push(evaluation.academyTrial!);
    }
    const map = executeAcademyPython('print("Карта повторяется"); print("Опыт завершён")');
    expect(gradeFlightAcademy(55, map.samples, map.events, { code: '', scene: { ...scene(55), sameSeedRepeats: 1 } }).solved).toBe(false);
});
