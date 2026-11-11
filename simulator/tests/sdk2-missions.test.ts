/**
 * Трек «Мини 2 · SDK2»: структура миссий и эталонные решения. Каждое решение запускается на настоящих pioneer_sdk2 и cv2
 * симулятора (поддельный только мир, см. helpers/mini2-runtime.ts) и должно пройти проверку миссии; шаблон с пропусками — нет.
 */
import { SDK2_MISSIONS, gradeSdk2Mission, solutionOf } from '../public/modules/ui/mission-guide/mini2/sdk2-missions.js';
import { buildSdk2Quests } from '../public/modules/learning/sdk2-quests.js';
import { questGroups } from '../public/modules/learning/quests.js';
import { mini2Ready, runMini2Program, withMini2Python } from './helpers/mini2-runtime.js';

/** ROS 2 — по тексту программы (как раннер в браузере); соседей роя задаёт сама миссия. */
const optionsOf = (mission: { scene?: string; swarm?: { neighbours: Array<{ code?: string }> } } | undefined, code: string) => ({
    markers: mission?.scene === 'markers', ros2: /^[ \t]*(?:from|import)[ \t]+rclpy\b/m.test(code), neighbours: mission?.swarm?.neighbours
});
const grade = (id: string, code: string, markers = false) => {
    const mission = SDK2_MISSIONS.find((item) => item.id === id);
    const run = runMini2Program(code, { ...optionsOf(mission, code), markers: markers || mission?.scene === 'markers', seconds: 300 });
    return { run, evaluation: gradeSdk2Mission(id, run.samples, run.events) };
};

/** Первые 37 миссий и их порядок хранятся в прогрессе учеников: новые главы только в конец. */
const LEGACY_IDS = ['sdk2-connect', 'sdk2-clock', 'sdk2-arm-disarm', 'sdk2-takeoff-land', 'sdk2-fly-state', 'sdk2-safe-start', 'sdk2-go-point', 'sdk2-axes', 'sdk2-yaw', 'sdk2-square', 'sdk2-body-fixed', 'sdk2-circle', 'sdk2-events-log', 'sdk2-event-flag', 'sdk2-event-led', 'sdk2-speed', 'sdk2-speed-body', 'sdk2-speed-ramp', 'sdk2-range-height', 'sdk2-nav', 'sdk2-telemetry-log', 'sdk2-params', 'sdk2-led-colors', 'sdk2-led-blink', 'sdk2-led-status', 'sdk2-grab', 'sdk2-delivery', 'sdk2-rc-flight', 'sdk2-rc-switch', 'sdk2-camera-frame', 'sdk2-two-cameras', 'sdk2-viewer', 'sdk2-servo', 'sdk2-recorder', 'sdk2-aruco-find', 'sdk2-aruco-center', 'sdk2-patrol'];

describe('структура трека sdk2', () => {
    const quests = buildSdk2Quests();

    test('миссий от 20 до 80, номера подряд, id уникальны и годны для сервера', () => {
        expect(quests.length).toBeGreaterThanOrEqual(20);
        expect(quests.length).toBeLessThanOrEqual(80);
        expect(quests.map((quest) => quest.number)).toEqual(quests.map((_, i) => i + 1));
        expect(new Set(quests.map((quest) => quest.id)).size).toBe(quests.length);
        quests.forEach((quest) => expect(quest.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/));
    });

    test('у каждой миссии есть цель, шаги, подсказка, итог, шаблон и эталон', () => {
        for (const mission of SDK2_MISSIONS) {
            expect({ id: mission.id, goal: mission.goal.length > 20 }).toEqual({ id: mission.id, goal: true });
            expect(mission.steps.length).toBeGreaterThanOrEqual(3);
            expect(mission.hint.length).toBeGreaterThan(10);
            expect(mission.outcome.length).toBeGreaterThan(20);
            expect(/pioneer_sdk2|rclpy|pioneer_swarm/.test(mission.starter)).toBe(true);
            expect(mission.starter).toContain('Опыт завершён');
            expect(solutionOf(mission)).not.toContain('___');
            // Пропусков в шаблоне ровно столько, сколько ответов.
            if (mission.answers) expect(mission.starter.split('___').length - 1).toBe(mission.answers.length);
            else expect(mission.solution).toBeDefined();
        }
    });

    test('главы идут подряд и каждая непуста', () => {
        const groups = questGroups(quests);
        expect(groups.length).toBeGreaterThanOrEqual(10);
        groups.forEach((group) => expect(group.quests.length).toBeGreaterThan(0));
        expect(groups.map((group) => group.title.slice(0, 2))).toEqual(groups.map((_, i) => String(i + 1).padStart(2, '0')));
    });

    test('старые 37 миссий на своих местах, ROS 2 (главы 14–17) и рой (18–19) идут за ними', () => {
        expect(quests.slice(0, LEGACY_IDS.length).map((quest) => quest.id)).toEqual(LEGACY_IDS);
        expect(quests[LEGACY_IDS.length - 1].groupTitle).toMatch(/^13\./);
        const groups = questGroups(quests);
        expect(groups.length).toBe(20);
        expect(groups.slice(13).map((group) => group.title.slice(0, 2))).toEqual(['14', '15', '16', '17', '18', '19', '20']);
        expect(groups.slice(13, 17).every((group) => group.quests.every((quest) => /^sdk2-ros2-/.test(quest.id)))).toBe(true);
        expect(groups.slice(17, 19).every((group) => group.quests.every((quest) => /^sdk2-swarm-/.test(quest.id)))).toBe(true);
        expect(groups[19].quests.every((quest) => /^sdk2-board-/.test(quest.id))).toBe(true);
        groups.slice(13).forEach((group) => {
            expect(group.quests.length).toBeGreaterThanOrEqual(2);
            expect(group.quests.length).toBeLessThanOrEqual(6);
        });
    });

    test('миссии роя несут соседей на сцене, остальные — нет; программы соседей молчат и закрывают рой', () => {
        for (const mission of SDK2_MISSIONS) {
            if (!mission.id.startsWith('sdk2-swarm-')) { expect({ id: mission.id, swarm: mission.swarm }).toEqual({ id: mission.id, swarm: undefined }); continue; }
            expect(mission.swarm!.neighbours.length).toBeGreaterThanOrEqual(1);
            for (const neighbour of mission.swarm!.neighbours) {
                if (!neighbour.code) continue;
                // print соседа попал бы в журнал ученика (печать идёт на дрон, запущенный последним).
                expect({ id: mission.id, prints: /\bprint\s*\(/.test(neighbour.code) }).toEqual({ id: mission.id, prints: false });
                expect(neighbour.code).toContain('swarm.close()');
            }
        }
        const quest = buildSdk2Quests().find((item) => item.id === 'sdk2-swarm-pingpong')!;
        expect(quest.sdk2!.swarm!.neighbours).toHaveLength(1);
    });

    test('миссии помечены как sdk2 и несут время ожидания проверки', () => {
        quests.forEach((quest) => {
            expect(quest.source).toBe('sdk2');
            expect(quest.sdk2!.waitMs).toBeGreaterThanOrEqual(30000);
            expect(quest.lesson!.solutionCode).toBe(solutionOf(SDK2_MISSIONS[quest.number - 1]));
        });
    });
});

describe('эталонные решения sdk2 в рантайме симулятора', () => {
    test.each(SDK2_MISSIONS.map((mission) => [mission.id, mission] as const))('%s: решение проходит, шаблон нет', (id, mission) => {
        // Проверяем сразу оба случая в одном тесте: решение — зачёт, заготовка с пропусками — нет.
        if (!mini2Ready) return;
        const solved = grade(id, solutionOf(mission), mission.scene === 'markers');
        expect({ id, error: solved.run.error, errors: solved.evaluation.diagnostics.filter((item) => item.kind === 'error').map((item) => item.title + ': ' + item.reason) })
            .toEqual({ id, error: null, errors: [] });
        expect(solved.evaluation.solved).toBe(true);
        // Программы соседей роя не падают (кроме отмены в конце опыта).
        expect({ id, bots: Object.values(solved.run.botErrors ?? {}).filter((text) => !/^CancelledError/.test(text)) }).toEqual({ id, bots: [] });
        const starter = grade(id, mission.starter, mission.scene === 'markers');
        expect({ id, solved: starter.evaluation.solved }).toEqual({ id, solved: false });
    }, 120_000);
});

describe('сообщения об ошибках', () => {
    const mission = (id: string) => SDK2_MISSIONS.find((item) => item.id === id)!;

    withMini2Python('пустая программа и программа без финальной строки не засчитываются, а причина названа', () => {
        const empty = grade('sdk2-takeoff-land', 'print("Опыт завершён")');
        expect(empty.evaluation.solved).toBe(false);
        expect(empty.evaluation.diagnostics.map((item) => item.title).join(' ')).toMatch(/Взлёт не подтверждён|Нужна одна подготовка/);
        const unfinished = grade('sdk2-connect', solutionOf(mission('sdk2-connect')).replace('print("Опыт завершён")', ''));
        expect(unfinished.evaluation.diagnostics.some((item) => item.title === 'Программа не дошла до конца')).toBe(true);
    });

    withMini2Python('опечатка в имени метода даёт «Программа завершилась ошибкой»', () => {
        const broken = grade('sdk2-connect', solutionOf(mission('sdk2-connect')).replace('get_battery_status', 'get_batery_status'));
        expect(broken.run.error).toMatch(/AttributeError/);
        expect(broken.evaluation.solved).toBe(false);
        expect(broken.evaluation.diagnostics[0].title).toMatch(/ошибкой/);
    });

    withMini2Python('неверные координаты называют точку, в которую дрон не прилетел', () => {
        const wrong = grade('sdk2-go-point', solutionOf(mission('sdk2-go-point')).replace('fly_to(1.5, 0.5, 1)', 'fly_to(2.5, 0.5, 1)'));
        expect(wrong.evaluation.solved).toBe(false);
        expect(wrong.evaluation.diagnostics.map((item) => item.reason).join(' ')).toContain('(1.5, 0.5, 1)');
    });

    withMini2Python('ROS 2: неверное имя сервиса даёт понятную остановку, а не вечное ожидание', () => {
        const wrong = grade('sdk2-ros2-cycle', solutionOf(mission('sdk2-ros2-cycle')).replace("'/geoscan/flight/land'", "'/geoscan/flight/lend'"));
        expect(wrong.run.error).toMatch(/Сервис не ответил/);
        expect(wrong.evaluation.solved).toBe(false);
    });

    withMini2Python('ROS 2: взлёт без arm — отказ сервиса, а не взлёт; пропущенная проверка отказа не засчитывается', () => {
        const solved = grade('sdk2-ros2-denied', solutionOf(mission('sdk2-ros2-denied')));
        expect(solved.evaluation.solved).toBe(true);
        const noDenial = grade('sdk2-ros2-denied', solutionOf(mission('sdk2-ros2-denied')).replace('    try_call("Взлёт без arm", takeoff_client, Trigger.Request())     # arm ещё не было: отказ\n', ''));
        expect(noDenial.evaluation.solved).toBe(false);
        expect(noDenial.evaluation.diagnostics.map((item) => item.reason).join(' ')).toContain('Взлёт без arm: отказ');
    });

    withMini2Python('ROS 2: неверная система координат у точки называет первую недостигнутую точку', () => {
        const wrong = grade('sdk2-ros2-go-map', solutionOf(mission('sdk2-ros2-go-map')).replace("frame='map'", "frame='base_link'"));
        expect(wrong.evaluation.solved).toBe(false);
        expect(wrong.evaluation.diagnostics.map((item) => item.reason).join(' ')).toContain('(1.5, 0.5, 1)');
    });

    withMini2Python('рой: без ответа соседа ping-pong не засчитывается, а программа не падает', () => {
        const code = solutionOf(mission('sdk2-swarm-pingpong'));
        const silent = runMini2Program(code, { neighbours: [{}] });
        expect(silent.error).toBeNull();
        const verdict = gradeSdk2Mission('sdk2-swarm-pingpong', silent.samples, silent.events);
        expect(verdict.solved).toBe(false);
        expect(verdict.diagnostics[0].title).toMatch(/порядке|нет/);
    });

    withMini2Python('рой: командир, взлетевший до «готов», получает объяснение', () => {
        const hasty = solutionOf(mission('sdk2-swarm-sync')).replace('    tell_all(wingmen, "готовность")\n', '    pioneer.arm()\n    tell_all(wingmen, "готовность")\n');
        const result = grade('sdk2-swarm-sync', hasty);
        expect(result.evaluation.solved).toBe(false);
        expect(result.evaluation.diagnostics.map((item) => item.title).join(' ')).toMatch(/Взлёт раньше готовности|подготовка/);
    });

    withMini2Python('полёт без посадки не засчитывается', () => {
        const noLand = grade('sdk2-takeoff-land', solutionOf(mission('sdk2-takeoff-land')).replace('    pioneer.land()\n    in_air = False', '    pass').replace(/ {4}if in_air:\n {8}pioneer.land\(\)\n/, ''));
        expect(noLand.evaluation.solved).toBe(false);
    });
});
