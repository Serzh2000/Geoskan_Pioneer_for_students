import { ACADEMY_LESSONS } from './academy/catalog.js';
import { getLuaTextLessonState } from './lessons/catalog/lua-text.js';
import { getPythonTextLessonState } from './lessons/catalog/python-text.js';
import { getActivePracticeTrack, getActiveTextLesson, isLessonCompleted, isTextLessonUnlocked, setActiveLessonId, setActivePracticeTrack } from './state.js';
import type { GuidePracticeTrack } from './types.js';

export function isAcademyLessonComplete(id: string): boolean {
    return (['lua', 'python'] as const).some(track => isLessonCompleted(track, `${track}-${id}`));
}

export function academyCompletedCount(): number {
    return ACADEMY_LESSONS.filter(lesson => isAcademyLessonComplete(lesson.id)).length;
}

/** Text tabs keep the topic when supported, while each language owns its draft and gates. */
export function switchGuideTrack(target: GuidePracticeTrack): string {
    const from = getActivePracticeTrack();
    if (from === target) return '';
    let notice = '';
    if (from !== 'blockly' && target !== 'blockly') {
        const sourceState = from === 'lua' ? getLuaTextLessonState() : getPythonTextLessonState();
        const source = getActiveTextLesson(sourceState, from);
        const targetState = target === 'lua' ? getLuaTextLessonState() : getPythonTextLessonState();
        const sameTopic = targetState.lessons.find(lesson => lesson.topicId === source.topicId);
        if (sameTopic && isTextLessonUnlocked(targetState, target, sameTopic.id)) setActiveLessonId(target, sameTopic.id);
        else notice = source.academy && source.academy.number > 72
            ? 'Камера и ArUco изучаются на Python. В Lua открыт ваш последний урок.'
            : 'В этом языке открыт ваш последний доступный урок.';
    }
    setActivePracticeTrack(target);
    return notice;
}
