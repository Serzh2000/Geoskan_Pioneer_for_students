import { getTimeAcademyPractices } from '../public/modules/ui/mission-guide/academy/practices/time.js';
import { gradeTimeAcademy } from '../public/modules/ui/mission-guide/academy/evaluation/time.js';
import { executeAcademyLua, executeAcademyPython } from './academy-runtime-harness.js';
import { beginLearningCapture, markLearningRunStarted, recordLearningEvent, finishLearningCapture } from '../public/modules/core/learning-journal.js';

test.each(['lua', 'python'] as const)('all nine %s timing/event solutions execute with the expected evidence', language => {
    for (const lesson of getTimeAcademyPractices(language)) {
        const outcome = (language === 'lua' ? executeAcademyLua : executeAcademyPython)(lesson.solutionCode);
        expect({ number: lesson.academy!.number, error: outcome.error }).toEqual({ number: lesson.academy!.number, error: null });
        expect(gradeTimeAcademy(lesson.academy!.number, outcome.samples, outcome.events).diagnostics.filter(item => item.kind === 'error')).toEqual([]);
    }
});

test('instantaneous colors, accumulated wrong delays and premature confirmations fail', () => {
    const check = (number: number, code: string) => {
        const result = executeAcademyLua(code);
        return gradeTimeAcademy(number, result.samples, result.events).solved;
    };
    expect(check(28, 'local l=Ledbar.new(29); l:set(0,0,0,1); l:set(0,0,1,0); l:set(0,1,0,0)')).toBe(false);
    expect(check(29, 'local l=Ledbar.new(29); print("Сигнал"); Timer.callLater(1,function() l:set(0,0,0,1) end)')).toBe(false);
    expect(check(30, 'local l=Ledbar.new(29); Timer.callLater(1,function() l:set(0,0,0,1) end); Timer.callLater(3,function() l:set(0,0,1,0) end)')).toBe(false);
    expect(check(32, 'print("готовность"); ap.push(Ev.MCE_PREFLIGHT)')).toBe(false);
    expect(check(35, 'print("тайм-аут")')).toBe(false);
    const empty = executeAcademyLua('');
    for (let number = 28; number <= 36; number++) expect(gradeTimeAcademy(number, empty.samples, []).solved).toBe(false);
});

test('loading an interpreter does not consume the lesson delay', () => {
    const token = beginLearningCapture('timed');
    markLearningRunStarted('timed', 42);
    recordLearningEvent('timed', { kind: 'print', time: 43, text: 'Сигнал' });
    expect(finishLearningCapture('timed', token)[0].time).toBe(1);
});
