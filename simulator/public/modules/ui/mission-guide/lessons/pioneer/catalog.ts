/**
 * Практикум на блоках Pioneer: уроки, которые собираются из единого набора блоков
 * и работают одинаково в Lua и в Python (блоки сами выбирают код под язык).
 *
 * Каждый урок — это теория, пример, который выкладывается блоками прямо на страницу
 * книги, задание и решение. Задание проверяется по полёту: симулятор запускает
 * программу, а проверка смотрит, куда слетал дрон и как менялась подсветка.
 * tests/pioneer-block-lessons.test.ts запускает и пример, и решение каждого урока
 * в симуляторе (Lua) и на pioneer_sdk (Python) и сверяет их с описанием здесь.
 *
 * Сами уроки лежат по группам рядом: flight-basics, flight-shapes, light, logic, projects.
 */
import { FLIGHT_BASICS } from './flight-basics.js';
import { FLIGHT_SHAPES } from './flight-shapes.js';
import { LIGHT_LESSONS } from './light.js';
import { LOGIC_LESSONS } from './logic.js';
import { PROJECT_LESSONS } from './projects.js';
import type { PioneerGroup, PioneerLessonSpec } from './types.js';

export const PIONEER_LESSONS: readonly PioneerLessonSpec[] = [
    ...FLIGHT_BASICS, ...FLIGHT_SHAPES, ...LIGHT_LESSONS, ...LOGIC_LESSONS, ...PROJECT_LESSONS
];

export const PIONEER_GROUP_TITLES: Record<PioneerGroup, string> = {
    flight: 'Блоки: полёт',
    light: 'Блоки: подсветка',
    logic: 'Блоки: переменные, условия, функции',
    projects: 'Блоки: проекты'
};

export const PIONEER_BY_TOPIC: Record<string, PioneerLessonSpec> = Object.fromEntries(PIONEER_LESSONS.map((spec) => [spec.topic, spec]));
