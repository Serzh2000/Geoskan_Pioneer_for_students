/**
 * Проверка уроков практикума на блоках pioneer_*: что засчитывает проверка по записи полёта
 * и по составу блоков, а что — нет. Записи полёта собираются по описанию урока, так что тест
 * не зависит от симулятора: он проверяет сами правила.
 */
import { gradePioneerLesson, isFlightFinished } from '../public/modules/ui/mission-guide/lessons/pioneer/grade.js';
import { PIONEER_BY_TOPIC } from '../public/modules/ui/mission-guide/lessons/pioneer/catalog.js';
import * as Blockly from 'blockly';
import { evaluateLesson } from '../public/modules/ui/mission-guide/evaluation/index.js';
import { lessonSequence } from '../public/modules/ui/mission-guide/evaluation/sequence.js';
import { getLuaLessonState } from '../public/modules/ui/mission-guide/lessons/catalog/lua.js';
import type { DroneSample } from '../public/modules/ui/mission-guide/evaluation/text/trace.js';
import type { PioneerExpectation } from '../public/modules/ui/mission-guide/lessons/pioneer/types.js';

// Дрон стоит не в начале сцены: точки урока отсчитываются от места старта.
const START = { x: 4, y: -2, z: 0.1 };

type Frame = { pos?: [number, number, number]; led?: string; fsm?: string; status?: string };

function sample(index: number, frame: Frame): DroneSample {
    const [x, y, z] = frame.pos ?? [0, 0, 0];
    const [r, g, b] = (frame.led ?? '0,0,0').split(',').map(Number);
    return {
        elapsedMs: index * 100,
        snapshot: {
            leds: [{ r, g, b, w: 0 }],
            pos: { x: START.x + x, y: START.y + y, z: START.z + z },
            fsmState: frame.fsm ?? 'IDLE', flightMode: '', pointReachedFlag: false, status: frame.status ?? 'РАБОТАЕТ',
            recentApiCalls: [], fsmTransitions: []
        }
    };
}

/** Идеальный полёт по описанию урока: взлёт, все точки по порядку, цвета, посадка. */
function perfectFlight(expectation: PioneerExpectation): Frame[] {
    const frames: Frame[] = [{}];
    const colours = expectation.led ?? [];
    let colour = 0;
    const show = (frame: Frame): Frame => ({ ...frame, led: colour > 0 ? colours[colour - 1] : undefined });
    const next = () => { if (colour < colours.length) colour += 1; };
    if (!expectation.points.length && !expectation.lands) {
        colours.forEach(() => { next(); frames.push(show({}), show({})); });
        return frames;
    }
    next();
    frames.push(show({ pos: [0, 0, 1], fsm: 'FLYING_HOVER' }));
    for (const point of expectation.points) {
        next();
        frames.push(show({ pos: [point[0], point[1], point[2]], fsm: 'FLYING_MOVING' }));
    }
    while (colour < colours.length) { next(); frames.push(show({ pos: [0, 0, 1], fsm: 'FLYING_HOVER' })); }
    if (expectation.lands) frames.push(show({ pos: [0, 0, 0.1], fsm: 'IDLE' }));
    return frames;
}

const samples = (frames: Frame[]) => frames.map((frame, i) => sample(i, frame));
const errors = (expectation: PioneerExpectation, frames: Frame[]) => gradePioneerLesson(expectation, samples(frames)).filter((item) => item.kind === 'error');

describe('проверка полёта урока', () => {
    test.each(Object.values(PIONEER_BY_TOPIC).map((spec) => [spec.topic, spec] as const))('%s: полёт по описанию урока засчитывается', (_topic, spec) => {
        const result = gradePioneerLesson(spec.expect, samples(perfectFlight(spec.expect)));
        expect(result.filter((item) => item.kind === 'error').map((item) => item.title)).toEqual([]);
        expect(result.some((item) => item.kind === 'success')).toBe(true);
    });

    const square = PIONEER_BY_TOPIC['bk-square'].expect;

    test('пропущенная точка — ошибка с номером точки', () => {
        const frames = perfectFlight(square).filter((frame) => !(frame.pos && frame.pos[0] === 0 && frame.pos[1] === 1));
        expect(errors(square, frames).map((item) => item.title)).toContain('Дрон не побывал в точке 3');
    });

    test('точки в неправильном порядке не засчитываются', () => {
        const flight = perfectFlight(square);
        // меняем местами вторую и четвёртую точки маршрута (кадры 2 и 4)
        [flight[2], flight[4]] = [flight[4], flight[2]];
        expect(errors(square, flight).length).toBeGreaterThan(0);
    });

    test('дрон, который не сел, не проходит', () => {
        const flight = perfectFlight(square).slice(0, -1);
        expect(errors(square, flight).map((item) => item.title)).toContain('Посадка не завершена');
    });

    test('дрон, который остался на земле, не проходит', () => {
        expect(errors(square, [{}, {}, {}]).map((item) => item.title)).toContain('Дрон не взлетел');
    });

    test('авария не засчитывается, даже если точки пройдены', () => {
        const flight = perfectFlight(square);
        flight[3] = { ...flight[3], status: 'CRASHED' };
        expect(errors(square, flight).map((item) => item.title)).toContain('Запуск завершился ошибкой или аварией');
    });

    test('неверный цвет подсветки и неверный порядок цветов — ошибки', () => {
        const colours = PIONEER_BY_TOPIC['bk-colours'].expect;
        expect(errors(colours, [{}, { led: '255,0,0' }, { led: '255,0,0' }]).map((item) => item.title)).toContain('Нужный цвет подсветки не появился');
        const swapped = errors(colours, [{}, { led: '255,255,0' }, { led: '0,0,255' }, { led: '0,0,0' }]);
        expect(swapped.map((item) => item.title)).toContain('Цвета подсветки идут не в том порядке');
    });

    test('цвет засчитывается с небольшим допуском', () => {
        const colours = PIONEER_BY_TOPIC['bk-rgb'].expect;
        const frames: Frame[] = [{}, { led: '165,0,250' }, { led: '0,215,205' }, { led: '0,0,0' }];
        expect(errors(colours, frames)).toEqual([]);
    });

    test('наблюдение заканчивается, когда дрон сел, а не раньше', () => {
        const flight = perfectFlight(square);
        expect(isFlightFinished(square, samples(flight))).toBe(true);
        expect(isFlightFinished(square, samples(flight.slice(0, -1)))).toBe(false);
        expect(isFlightFinished(square, samples([{}, {}]))).toBe(false);
        // уроку без посадки заканчиваться нечем: он идёт по таймеру
        expect(isFlightFinished(PIONEER_BY_TOPIC['bk-colours'].expect, samples(flight))).toBe(false);
    });
});

describe('проверка состава блоков', () => {
    const lessons = getLuaLessonState().lessons.filter((lesson) => lesson.pioneer);
    const byTopic = (topic: string) => lessons.find((lesson) => lesson.pioneer!.topic === topic)!;

    test('пустая цепочка — подсказка, а не ошибка', () => {
        const result = evaluateLesson(byTopic('bk-square'), ['pioneer_start']);
        expect(result.solved).toBe(false);
        expect(result.diagnostics).toEqual([expect.objectContaining({ kind: 'info' })]);
    });

    test('без нужного блока задание не засчитывается и называет этот блок', () => {
        const result = evaluateLesson(byTopic('bk-takeoff-land'), ['pioneer_start', 'pioneer_preflight', 'pioneer_takeoff', 'pioneer_land']);
        expect(result.solved).toBe(false);
        expect(result.diagnostics[0].title).toContain('Ждать');
    });

    test.each(lessons.map((lesson) => [lesson.pioneer!.topic, lesson] as const))('%s: решение проходит проверку состава', (_topic, lesson) => {
        const result = evaluateLesson(lesson, ['pioneer_start', ...lesson.pioneer!.requires.map(([type]) => type)]);
        expect(result.solved).toBe(true);
    });
});

describe('состав блоков в настоящей рабочей области', () => {
    beforeAll(async () => {
        const index = await import('../public/modules/editor/blockly-mode/index.js');
        await import('../public/modules/editor/blockly-mode/blockly-core.js');
        await index.ensureEditorBlocklyDefinitions();
    });

    // Блоки-значения (цвет RGB, переменная) не входят в цепочку операторов, но задания требуют именно их.
    test.each(getLuaLessonState().lessons.filter((lesson) => lesson.pioneer).map((lesson) => [lesson.pioneer!.topic, lesson] as const))(
        '%s: решение, загруженное в рабочую область, проходит проверку состава', (_topic, lesson) => {
            const workspace = new Blockly.Workspace();
            Blockly.serialization.workspaces.load(lesson.pioneer!.solution, workspace);
            const result = evaluateLesson(lesson, lessonSequence(workspace as Blockly.WorkspaceSvg, lesson));
            workspace.dispose();
            expect(result.diagnostics.filter((item) => item.kind === 'error').map((item) => item.title)).toEqual([]);
            expect(result.solved).toBe(true);
        }
    );
});
