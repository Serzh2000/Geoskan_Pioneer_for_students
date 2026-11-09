/** Глава 13: уроки про команды SDK (батарея и предстартовая проверка): решения проходят, типичные ошибки нет. */
import { getSdkExtrasAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/sdk-extras.js';
import { gradeSdkExtrasAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/sdk-extras.js';
import { executeAcademyPython } from './academy-runtime-harness.js';

const lessons = getSdkExtrasAcademyPractices();
const grade = (number: number, code: string) => {
    const outcome = executeAcademyPython(code);
    return { outcome, evaluation: gradeSdkExtrasAcademy(number, outcome.samples, outcome.events) };
};

test('в главе два урока Python с номерами 109 и 110', () => {
    expect(lessons.map(lesson => lesson.academy!.number)).toEqual([109, 110]);
});

test.each([109, 110])('эталонное решение урока %i проходит проверку', number => {
    const lesson = lessons.find(item => item.academy!.number === number)!;
    const { outcome, evaluation } = grade(number, lesson.solutionCode);
    expect({ number, error: outcome.error }).toEqual({ number, error: null });
    expect({ number, solved: evaluation.solved, errors: evaluation.diagnostics.filter(item => item.kind === 'error') }).toEqual({ number, solved: true, errors: [] });
});

test('заготовка с пропуском не засчитывается', () => {
    for (const lesson of lessons) expect(grade(lesson.academy!.number, lesson.starterCode).evaluation.solved).toBe(false);
});

test('109: число не из батареи и лишний arm не принимаются', () => {
    const wrong = 'from pioneer_sdk import Pioneer\npioneer = Pioneer(simulator=True)\nprint("Напряжение:", 255)';
    expect(grade(109, wrong).evaluation.solved).toBe(false);
    const withArm = 'from pioneer_sdk import Pioneer\npioneer = Pioneer(simulator=True)\npioneer.arm()\nprint("Напряжение:", pioneer.get_battery_status())';
    expect(grade(109, withArm).evaluation.solved).toBe(false);
});

test('110: неверные значения и порядок строк не засчитываются', () => {
    const swapped = 'from pioneer_sdk import Pioneer\npioneer = Pioneer(simulator=True)\npioneer.arm()\nstate = pioneer.get_preflight_state()\nprint("До arm:", state["UavStartAllowed"])\nprint("После arm:", state["UavStartAllowed"])';
    expect(grade(110, swapped).evaluation.solved).toBe(false);
});

test('у уроков есть объяснение, шаги и четыре вопроса к нему', () => {
    for (const lesson of lessons) {
        expect(lesson.summary.length).toBeGreaterThan(200);
        expect(lesson.taskSteps?.length).toBeGreaterThanOrEqual(3);
        expect(lesson.academy!.teaching.choices).toHaveLength(2);
    }
});
