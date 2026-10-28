import type { GuideTextLesson } from '../types.js';

/** The one sentence under a practice task that says what the editor expects. */
export function practiceNote(track: 'lua' | 'python', lesson: GuideTextLesson): string {
    const inspect = lesson.academy?.mode === 'inspect';
    const printed = lesson.goal.match(/(?:выведите|напечатайте|напечатай|сообщение|сообщайте|выводите|печатайте)[^«]*«([^»]+)»/i)?.[1];
    // Checks compare printed text exactly, so the exact form is spelled out once for every such task.
    const messageRule = printed
        ? ` Текст из «ёлочек» печатайте точно как в задании, с теми же буквами и знаками, но без самих «ёлочек»: print("${printed}").`
        : '';
    if (inspect) return 'Осматривайте дрон в сцене справа, а ответы отмечайте галочкой здесь.';
    return /___|TODO/.test(lesson.starterCode)
        ? `Замените каждое «___» и каждую пометку TODO своим кодом: сами слова ___ и TODO в программе остаться не должны. Остальной код не меняйте.${messageRule}`
        : `Измените программу в редакторе. Она выполнится в сцене и будет оценена.${messageRule}`;
}
