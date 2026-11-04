import type { WorkspaceJson } from './dsl.js';

export type PioneerGroup = 'flight' | 'light' | 'logic' | 'projects';

/** Что программа обязана сделать в полёте: по этому описанию проверяется результат запуска. */
export type PioneerExpectation = {
    /** Точки, в которые дрон должен слетать, по порядку (метры, X Y Z). */
    points: number[][];
    /** Цвета нулевого светодиода по порядку, «r,g,b» от 0 до 255 (между ними могут быть другие). */
    led?: string[];
    /** Программа заканчивается посадкой. */
    lands: boolean;
    /** Сколько миллисекунд наблюдать за запуском. */
    waitMs: number;
};

export type PioneerQuestion = {
    deviceTitle: string;
    device: string;
    question: string;
    choices: Array<{ text: string; feedback: string }>;
    correct: number;
    takeaway: string;
};

/** Урок практикума на едином наборе блоков pioneer_*: он собирается в Lua и в Python одинаково. */
export type PioneerLessonSpec = {
    /** Имя темы: `bk-…`; по нему находятся ожидания проверки и вопрос разбора. */
    topic: string;
    group: PioneerGroup;
    /**
     * Языки, на которых урок проходится; по умолчанию оба. Блок «Каждые N сек» в Python держит ритм только в настоящем
     * CPython: браузерный Python-рантайм симулятора мигание не показывает, поэтому его урок — только для Lua.
     */
    languages?: Array<'lua' | 'python'>;
    title: string;
    goal: string;
    summary: string;
    intro: string;
    outcome: string;
    hint: string;
    /** Теория: короткие абзацы, обратные кавычки — код или имя блока. */
    theory: string[];
    /** Пример по частям: что делает каждый блок, сверху вниз. */
    notes: string[];
    /** Что смотреть, пока пример летит. */
    watch: string;
    /** Что собрать: шаги задания по порядку. */
    recipe: string[];
    /** Пример, выложенный блоками на страницу книги и запускаемый в демонстрации. */
    example: WorkspaceJson;
    /** Решение задания: его можно загрузить в редактор, и оно проходит проверку. */
    solution: WorkspaceJson;
    /** Блоки, без которых задание не считается выполненным: [тип блока, имя для ученика]. */
    requires: Array<[string, string]>;
    expect: PioneerExpectation;
    question: PioneerQuestion;
};
