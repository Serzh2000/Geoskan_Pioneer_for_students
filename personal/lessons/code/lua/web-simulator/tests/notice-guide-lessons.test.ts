import { ACADEMY_LESSONS } from '../public/modules/ui/mission-guide/academy/catalog.js';
import {
    earlyRouteNotice,
    GUIDE_LESSON,
    gamepadOverrideNotice,
    missingCallbackNotice,
    scenarioWarningNotice,
    simultaneousCommandsNotice
} from '../public/modules/shared/notice-messages/catalog.js';

const lessonOf = (notice: { actions?: Array<{ kind: string; lesson?: number }> }) =>
    notice.actions?.find((action) => action.kind === 'open-guide')?.lesson;
const titleOf = (number: number) => ACADEMY_LESSONS.find((lesson) => lesson.number === number)?.title;

describe('notices that point at a textbook lesson', () => {
    it('lead to the lesson about their own matter, not to the textbook in general', () => {
        expect(lessonOf(earlyRouteNotice())).toBe(GUIDE_LESSON.confirmPoint);
        expect(lessonOf(missingCallbackNotice())).toBe(GUIDE_LESSON.events);
        expect(lessonOf(simultaneousCommandsNotice(['MCE_TAKEOFF', 'MCE_LANDING']))).toBe(GUIDE_LESSON.timer);
    });

    it('name lessons that exist and say what the notice says they do', () => {
        expect(titleOf(GUIDE_LESSON.command)).toBe('Команда автопилоту');
        expect(titleOf(GUIDE_LESSON.timer)).toBe('Отложенный сигнал');
        expect(titleOf(GUIDE_LESSON.events)).toBe('Получаем уведомление');
        expect(titleOf(GUIDE_LESSON.confirmPoint)).toBe('Подтверждаем точку');
    });

    it('pick the lesson from the first problem of a pre-launch check, and offer none when no lesson fits', () => {
        expect(lessonOf(scenarioWarningNotice(['Взлёт запрошен без подготовки. Сначала отправьте Ev.MCE_PREFLIGHT.']))).toBe(GUIDE_LESSON.command);
        expect(lessonOf(scenarioWarningNotice(['Перед takeoff() вызовите arm().']))).toBe(GUIDE_LESSON.command);
        expect(lessonOf(scenarioWarningNotice(['Нет функции callback.']))).toBe(GUIDE_LESSON.events);
        expect(scenarioWarningNotice(['Что-то совсем другое.']).actions).toBeUndefined();
    });

    it('do not send a notice about the gamepad to a lesson that does not cover it', () => {
        expect(gamepadOverrideNotice().actions).toBeUndefined();
    });
});
