import type { GuideLesson, GuideTextLesson } from '../types.js';
import { escapeHtml, renderInline } from './shared.js';

type Lesson = GuideLesson | GuideTextLesson;
type LearningNote = { why: string; question: string; answer: string; experiment: string };

const QUIZ_CHOICES: Record<string, [string, string]> = {
    'led-single': ['Изменить индекс светодиода', 'Включить только зелёную составляющую'],
    'led-sequence': ['Будет виден в основном последний цвет', 'Каждый цвет будет виден одну секунду'],
    'led-confirm': ['Да, сообщение доказывает правильность цвета', 'Нет, нужно проверить и подсветку'],
    'led-delayed': ['После смены цвета в том же отложенном действии', 'Сразу после планирования задержки'],
    preflight: ['Да, подготовка сразу запускает подъём', 'Нет, нужна отдельная команда взлёта'],
    takeoff: ['Команда начинает подъём, но он занимает время', 'Отправка команды сразу меняет высоту'],
    route: ['Изменится только цвет подсветки', 'Изменится высота цели'],
    'point-confirm': ['Нет, сначала нужно дождаться прибытия', 'Да, отправленная команда означает прибытие'],
    mission: ['Посадка всегда автоматически ждёт прибытия', 'Посадка может прервать движение к точке'],
    landing: ['Нет, нужно дождаться завершения посадки', 'Да, после отправки команды дрон уже на земле']
};
const CORRECT_CHOICE: Record<string, number> = {
    'led-single': 1, 'led-sequence': 0, 'led-confirm': 1, 'led-delayed': 0,
    preflight: 1, takeoff: 0, route: 1, 'point-confirm': 0, mission: 1, landing: 0
};

function getTopic(lesson: Lesson): string {
    const topic = 'topicId' in lesson ? lesson.topicId : lesson.id.replace(/^(lua|python|py)-/, '');
    const aliases: Record<string, string> = { arm: 'preflight', 'point-wait': 'point-confirm', land: 'landing' };
    return aliases[topic] || topic;
}

const NOTES: Record<string, LearningNote> = {
    'led-single': {
        why: 'Индекс выбирает светодиод, а три следующих числа задают красную, зелёную и синюю составляющие. Это независимые параметры: смена цвета не меняет номер диода.',
        question: 'Как включить зелёный цвет на том же светодиоде?',
        answer: 'Оставьте индекс прежним. Обнулите красную и синюю составляющие, а зелёную задайте максимальной: 1 в Lua или 255 в Python.',
        experiment: 'После успешной проверки включите другой цвет. Затем измените только индекс и найдите новый светящийся диод.'
    },
    'led-sequence': {
        why: 'Компьютер меняет цвета быстрее, чем глаз успевает их различить. Чтобы увидеть последовательность, действия нужно разнести во времени. В Lua независимые таймеры отсчитывают задержку от момента их создания; в Python sleep задерживает следующую команду.',
        question: 'Что будет, если убрать все задержки?',
        answer: 'Команды выполнятся почти одновременно. Обычно вы увидите только последний цвет: промежуточные состояния будут слишком короткими.',
        experiment: 'Увеличьте интервал между цветами и сравните ритм. Объясните, от какого момента отсчитывается каждая задержка.'
    },
    'led-confirm': {
        why: 'Сообщение в журнале помогает понять, дошло ли выполнение до нужного места. Оно подтверждает выполнение строки программы, а состояние подсветки нужно проверить отдельно.',
        question: 'Доказывает ли сообщение в журнале, что выбран правильный цвет?',
        answer: 'Нет. Программа могла вывести сообщение с неверными параметрами подсветки. Сравните и журнал, и видимый результат с заданием.',
        experiment: 'Измените текст сообщения так, чтобы он описывал индекс и цвет выбранного светодиода.'
    },
    'led-delayed': {
        why: 'Отложенное действие состоит из двух событий: мы планируем его сейчас, а выполняется оно позже. В Lua и изменение цвета, и подтверждающее сообщение нужно поместить внутрь функции таймера.',
        question: 'Где должно находиться сообщение, подтверждающее отложенную смену цвета?',
        answer: 'После команды изменения цвета в том же отложенном действии. Иначе журнал сообщит об успехе раньше самого изменения.',
        experiment: 'Измените задержку. Проверьте, что подсветка и подтверждающее сообщение по-прежнему появляются вместе.'
    },
    preflight: {
        why: 'Подготовка двигателей и взлёт — разные этапы. Команда запускает переход, но готовность нужно подтвердить по состоянию симулятора или событию.',
        question: 'Должен ли дрон подняться после одной только подготовки двигателей?',
        answer: 'Нет. Подготовка делает возможным следующий этап. Для подъёма нужна отдельная команда взлёта.',
        experiment: 'Найдите в журнале подтверждение подготовки и сравните его со временем отправки команды.'
    },
    takeoff: {
        why: 'Взлёт выполняется после подготовки. В Lua событие завершения подготовки позволяет отправить следующую команду в нужный момент. Временная задержка сама по себе не доказывает готовность дрона.',
        question: 'Почему нельзя считать отправку команды взлёта завершённым взлётом?',
        answer: 'Команда начинает движение. Дрону требуется время, чтобы набрать высоту; результат проверяют по положению и состоянию.',
        experiment: 'Проследите переход от подготовки к подъёму и найдите момент, когда высота перестаёт увеличиваться.'
    },
    route: {
        why: 'Точка маршрута задаётся координатами в системе отсчёта сцены. Команда движения описывает цель, а не мгновенное перемещение в неё.',
        question: 'Что изменится, если поменять только координату высоты?',
        answer: 'Цель по горизонтали останется прежней, но дрон должен будет подняться или опуститься до новой высоты.',
        experiment: 'После выполнения задания измените одну координату цели и предскажите направление движения перед запуском.'
    },
    'point-confirm': {
        why: 'Отправить дрон к точке и дождаться прибытия — разные задачи. Подтверждение достижения связывает следующий шаг с фактическим завершением движения.',
        question: 'Можно ли вывести «Прибыл» сразу после команды движения?',
        answer: 'Вывести можно, но сообщение будет недостоверным. Сначала дождитесь события или результата проверки достижения точки.',
        experiment: 'Сопоставьте момент сообщения о прибытии с положением дрона в сцене.'
    },
    mission: {
        why: 'Миссия соединяет уже знакомые этапы. У каждого перехода есть условие: подготовка завершена, высота набрана, точка достигнута. Именно условия удерживают действия в правильном порядке.',
        question: 'Почему посадку нельзя запускать одновременно с движением к точке?',
        answer: 'Это конкурирующие команды. Посадка может прервать маршрут; её следует запускать после подтверждённого прибытия.',
        experiment: 'Перед запуском назовите все этапы миссии. Во время выполнения отмечайте, чем подтверждён каждый переход.'
    },
    landing: {
        why: 'Посадка — самостоятельный этап с наблюдаемым завершением. Сообщение об окончании миссии должно соответствовать фактическому состоянию дрона.',
        question: 'Достаточно ли отправить команду посадки, чтобы считать миссию законченной?',
        answer: 'Нет. Убедитесь, что дрон опустился на поверхность и завершил посадку, а не только начал снижение.',
        experiment: 'Проследите снижение до полной остановки и сравните порядок событий с сообщениями программы.'
    }
};

export function getLearningNote(lesson: Lesson): LearningNote | undefined {
    const topic = getTopic(lesson);
    if (topic === 'led-single' && !lesson.id.startsWith('lua')) {
        return {
            why: 'Именованные параметры r, g и b задают красную, зелёную и синюю составляющие цвета. В Python SDK их значения лежат в диапазоне от 0 до 255: ноль выключает составляющую, 255 задаёт максимальную яркость.',
            question: 'Какие параметры включат зелёную подсветку?',
            answer: 'Задайте r=0, g=255, b=0. Меняется только зелёная составляющая; при r=0, g=0, b=0 подсветка погаснет.',
            experiment: 'После успешной проверки получите белый цвет: включите все три составляющие на максимум. Затем уменьшите их одинаково и сравните яркость.'
        };
    }
    return NOTES[topic];
}

export function renderLearningNote(lesson: Lesson): string {
    const note = getLearningNote(lesson);
    if (!note) return '';
    return `<section class="guide-learning-note">
        <h2>Почему это работает</h2><p>${renderInline(note.why)}</p>
        ${lesson.id.includes('led-single') ? renderColorExperiment(lesson) : ''}
        <fieldset class="guide-knowledge-check" data-guide-quiz data-guide-explanation="${escapeHtml(note.answer)}">
            <legend>Проверьте себя</legend><p>${escapeHtml(note.question)}</p>
            <div class="guide-knowledge-check__choices">${(QUIZ_CHOICES[getTopic(lesson)] || []).map((choice, index) => `<button type="button" class="guide-lesson__action" data-guide-quiz-answer="${index === CORRECT_CHOICE[getTopic(lesson)] ? 'correct' : 'retry'}" aria-pressed="false">${escapeHtml(choice)}</button>`).join('')}</div>
            <p class="guide-knowledge-check__feedback" data-guide-quiz-feedback role="status" hidden></p>
            <small>Этот вопрос помогает разобраться в теме и не влияет на прохождение урока.</small>
        </fieldset>
    </section>`;
}

function renderColorExperiment(lesson: Lesson): string {
    const max = lesson.id.startsWith('lua') ? 1 : 255;
    return `<div class="guide-color-lab" data-guide-color-max="${max}">
        <div class="guide-color-lab__preview"><span class="guide-color-dot" data-guide-color-dot style="background: rgb(255, 0, 0)" aria-hidden="true"></span>
        <div><strong>Попробуйте смешать цвет</strong><p>Мини-модель RGB: нажмите на цвет и сравните параметры. Сцену дрона этот пример не меняет.</p></div></div>
        <div class="guide-actions" role="group" aria-label="Цвет в учебном примере">
        ${[['Красный', '1,0,0'], ['Зелёный', '0,1,0'], ['Синий', '0,0,1'], ['Белый', '1,1,1'], ['Выключить', '0,0,0']].map(([name, rgb], i) => `<button type="button" class="guide-lesson__action" data-guide-rgb="${rgb}" aria-pressed="${i === 0}">${name}</button>`).join('')}
        </div><output data-guide-color-output aria-live="polite">Красный: R = ${max}, G = 0, B = 0</output>
    </div>`;
}

export function renderPracticeBrief(lesson: Lesson): string {
    return `<div class="guide-practice-brief"><strong>Ваша задача</strong><p>${renderInline(lesson.goal)}</p>
        <details class="guide-learning-disclosure"><summary>Нужна подсказка</summary><p>${renderInline(lesson.builderHint)}</p></details></div>`;
}

export function renderObservation(lesson: Lesson, solved: boolean): string {
    const note = getLearningNote(lesson);
    return `<aside class="guide-observation"><strong>Что наблюдать в сцене</strong><p>${renderInline(lesson.expectedOutcome)}</p>
        ${solved && note ? `<details class="guide-learning-disclosure"><summary>Закрепите навык: небольшой эксперимент</summary><p>${renderInline(note.experiment)}</p><p>Это дополнительная практика. Автопроверка по-прежнему оценивает исходное задание.</p></details>` : ''}</aside>`;
}
