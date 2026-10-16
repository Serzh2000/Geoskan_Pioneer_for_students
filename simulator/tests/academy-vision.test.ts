import { getCameraArucoAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/camera-aruco.js';
import { getVisualNavigationAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/visual-navigation.js';
import { gradeVisionAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/vision.js';
import { executeAcademyPython } from './academy-runtime-harness.js';
const lessons = [...getCameraArucoAcademyPractices(), ...getVisualNavigationAcademyPractices()];
const scene = (number: number, seed = 42) => ({ number, profile: 'markers', seed, sameSeedRepeats: 1, differentSeeds: 1, intact: true });

test.each(lessons)('$title: solution executes the real cv2 prelude and satisfies its observations', lesson => {
    const number = lesson.academy!.number;
    const run = (source: string, trials: string[] = [], seed = 42) => {
        const outcome = executeAcademyPython(source, { vision: number, seed });
        expect({ number, error: outcome.error }).toEqual({ number, error: null });
        const evaluation = gradeVisionAcademy(number, outcome.samples, outcome.events, { code: source, scene: scene(number, seed), trials });
        expect({ number, errors: evaluation.diagnostics.filter(item => item.kind === 'error') }).toEqual({ number, errors: [] });
        return evaluation;
    };
    const first = run(lesson.solutionCode);
    if (number === 83) {
        expect(first.solved).toBe(false);
        expect(run(lesson.solutionCode.replace('DICT_4X4_50', 'DICT_6X6_250'), [first.academyTrial!]).solved).toBe(true);
    } else if (number === 107) {
        expect(first.solved).toBe(false);
        expect(run(lesson.solutionCode, [first.academyTrial!], 43).solved).toBe(true);
    } else if (number === 108) {
        expect(first.solved).toBe(false);
        expect(run(lesson.solutionCode.replace('target_id=12\nprint', 'target_id=249\nprint'), [first.academyTrial!]).solved).toBe(true);
    } else expect(first.solved).toBe(true);
});

test('empty output, stale frames and a landing without visual confirmation fail', () => {
    const empty = executeAcademyPython('print("Опыт завершён")');
    for (let number = 73; number <= 108; number++) expect(gradeVisionAcademy(number, empty.samples, empty.events, { code: '', scene: scene(number) }).solved).toBe(false);
    const lesson = lessons.find(item => item.academy!.number === 99)!;
    const correct = executeAcademyPython(lesson.solutionCode, { vision: 99 });
    expect(gradeVisionAcademy(99, correct.samples, correct.events.filter(event => event.kind !== 'detect'), { code: '', scene: scene(99) }).solved).toBe(false);
    const stale = correct.events.map(event => event.kind === 'detect' ? { ...event, frameId: 1 } : event);
    expect(gradeVisionAcademy(99, correct.samples, stale, { code: '', scene: scene(99) }).solved).toBe(false);
});
