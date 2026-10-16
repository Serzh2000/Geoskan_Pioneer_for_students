import { getSignalsCodePractices } from '../public/modules/ui/mission-guide/academy/practices/signals-code.js';
import { getAcademyTextPractices, ACADEMY_READY_NUMBERS, isAcademyPracticeReady } from '../public/modules/ui/mission-guide/academy/practices/index.js';
import { gradeSignalsCode } from '../public/modules/ui/mission-guide/academy/evaluation/signals-code.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';

test('ready lessons have real practices, stable ids, and ordered prerequisites in both languages', () => {
    for (const language of ['lua', 'python'] as const) {
        const lessons = getAcademyTextPractices(language);
        const ready = [...ACADEMY_READY_NUMBERS].filter(number => isAcademyPracticeReady(number, language));
        expect(lessons.map(lesson => lesson.academy!.number)).toEqual(ready);
        expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(ready.length);
        expect(lessons.every(lesson => !lesson.solutionCode.includes('___'))).toBe(true);
    }
});

test.each(['lua', 'python'] as const)('all %s signal and programming solutions execute and satisfy the appropriate experiment', language => {
    const execute = language === 'lua' ? executeAcademyLua : executeAcademyPython;
    for (const lesson of getSignalsCodePractices(language)) {
        const outcome = execute(lesson.solutionCode);
        expect({ number: lesson.academy!.number, error: outcome.error }).toEqual({ number: lesson.academy!.number, error: null });
        const evaluation = gradeSignalsCode(lesson.academy!.number, outcome.samples, outcome.events, { code: lesson.solutionCode });
        expect(evaluation.diagnostics.filter(item => item.kind === 'error')).toEqual([]);
        expect(evaluation.solved || Boolean(evaluation.academyTrial)).toBe(true);
    }
});

test.each(['lua', 'python'] as const)('%s multiple-run experiments need all cases and reject wrong boundary colors', language => {
    const execute = language === 'lua' ? executeAcademyLua : executeAcademyPython;
    const lessons = getSignalsCodePractices(language);
    for (const number of [12, 13, 22, 23]) {
        const lesson = lessons.find(item => item.academy!.number === number)!;
        const source = lesson.solutionCode;
        const variants = number === 12
            ? [source, source.replace(language === 'lua' ? '0, 0, 1, 0' : '0, 0, 255, 0', language === 'lua' ? '0, 0, 0, 1' : '0, 0, 0, 255')]
            : number === 13 ? [source, source.replace(language === 'lua' ? '0, 1, 1, 1' : '0, 255, 255, 255', language === 'lua' ? '0, 0.5, 0.5, 0.5' : '0, 128, 128, 128')]
                : number === 22 ? [source, source.replace(language === 'lua' ? 'ready = false' : 'ready = False', language === 'lua' ? 'ready = true' : 'ready = True')]
                    : [source, source.replace('height = 1', 'height = 2'), source.replace('height = 1', 'height = 3')];
        const trials: string[] = [];
        variants.forEach((variant, index) => {
            const outcome = execute(variant);
            const evaluation = gradeSignalsCode(number, outcome.samples, outcome.events, { code: variant, trials });
            expect(evaluation.diagnostics.filter(item => item.kind === 'error')).toEqual([]);
            expect(evaluation.solved).toBe(index === variants.length - 1);
            if (evaluation.academyTrial) trials.push(evaluation.academyTrial);
        });
        if (number === 23) {
            const wrong = execute(source.replace('height = 1', 'height = 2').replace('> 2', '>= 2'));
            const evaluation = gradeSignalsCode(number, wrong.samples, wrong.events, { code: '', trials });
            expect(evaluation.solved).toBe(false);
            expect(evaluation.academyTrial).toBeUndefined();
        }
    }
});

test('empty programs, final colors alone and claimed messages do not satisfy a sequence or a function exercise', () => {
    const empty = executeAcademyLua('');
    for (let number = 10; number <= 27; number++) expect(gradeSignalsCode(number, empty.samples, [], { code: '' }).solved).toBe(false);
    const finalOnly = executeAcademyLua('local leds=Ledbar.new(29); leds:set(0,0,0,0)');
    expect(gradeSignalsCode(14, finalOnly.samples, finalOnly.events, { code: '' }).solved).toBe(false);
    const claimed = executeAcademyLua('print("0, 1, 2")');
    expect(gradeSignalsCode(24, claimed.samples, claimed.events, { code: '' }).solved).toBe(false);
    const wrongParameter = executeAcademyLua('local leds=Ledbar.new(29); leds:set(0,.5,0,0); print(.25); print(.5)');
    expect(gradeSignalsCode(26, wrongParameter.samples, wrongParameter.events, { code: '' }).solved).toBe(false);
});
