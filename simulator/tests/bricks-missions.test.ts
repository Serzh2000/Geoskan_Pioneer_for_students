/**
 * Трек «Мини 2 · Bricks»: структура миссий и эталонные проекты. Эталон загружается в настоящий Blockly, собирается в
 * Python генератором Bricks, запускается на настоящих pioneer_sdk2 и cv2 симулятора (поддельный только мир,
 * см. helpers/mini2-runtime.ts) и проходит проверку миссии; шаблон миссии — нет.
 */
import * as Blockly from 'blockly';
import { BRICKS_MISSIONS, gradeBricksMission, missingBricksBlocks, solutionBlockTypes } from '../public/modules/ui/mission-guide/mini2/bricks-missions.js';
import { buildBricksQuests } from '../public/modules/learning/bricks-quests.js';
import { questGroups } from '../public/modules/learning/quests.js';
import { loadBricksProject } from '../public/modules/editor/blockly-mode/bricks/index.js';
import { compileBricksXml } from './helpers/bricks-fixtures.js';
import { mini2Ready, runMini2Program, withMini2Python } from './helpers/mini2-runtime.js';

const typesOf = (xml: string) => {
    const workspace = new Blockly.Workspace();
    try {
        loadBricksProject(xml, workspace);
        const counts: Record<string, number> = {};
        workspace.getAllBlocks(false).forEach((block) => { counts[block.type] = (counts[block.type] ?? 0) + 1; });
        return counts;
    } finally {
        workspace.dispose();
    }
};

const expandCounts = (counts: Record<string, number>): string[] =>
    Object.entries(counts).flatMap(([type, count]) => Array.from({ length: count }, () => type));

describe('структура трека bricks', () => {
    const quests = buildBricksQuests();

    test('от 12 до 20 миссий, номера подряд, id уникальны и годны для сервера', () => {
        expect(quests.length).toBeGreaterThanOrEqual(12);
        expect(quests.length).toBeLessThanOrEqual(20);
        expect(quests.map((quest) => quest.number)).toEqual(quests.map((_, i) => i + 1));
        expect(new Set(quests.map((quest) => quest.id)).size).toBe(quests.length);
        quests.forEach((quest) => expect(quest.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/));
    });

    test('у каждой миссии есть цель, шаги, подсказка, итог, обязательные блоки, шаблон и эталон', () => {
        for (const mission of BRICKS_MISSIONS) {
            expect(mission.goal.length).toBeGreaterThan(20);
            expect(mission.steps.length).toBeGreaterThanOrEqual(3);
            expect(mission.hint.length).toBeGreaterThan(10);
            expect(mission.outcome.length).toBeGreaterThan(20);
            expect(mission.requires.length).toBeGreaterThan(0);
            expect(mission.starterXml).toContain('start_block');
            expect(mission.solutionXml).toContain('start_block');
        }
    });

    test('главы идут подряд и каждая непуста', () => {
        const groups = questGroups(quests);
        expect(groups.length).toBeGreaterThanOrEqual(6);
        expect(groups.map((group) => group.title.slice(0, 2))).toEqual(groups.map((_, i) => String(i + 1).padStart(2, '0')));
    });

    test('миссии не используют блоки «только на дроне»', () => {
        const droneOnly = new Set(['image_rotate', 'image_flip', 'cv_contour_shape', 'cv_gaussian_blur', 'cv_canny', 'cv_color_mask', 'cv_threshold', 'cv_contours'].map((type) => `bricks_${type}`));
        for (const mission of BRICKS_MISSIONS) {
            for (const xml of [mission.starterXml, mission.solutionXml]) {
                Object.keys(typesOf(xml)).forEach((type) => expect(droneOnly.has(type)).toBe(false));
            }
        }
    });
});

describe('состав блоков', () => {
    test.each(BRICKS_MISSIONS.map((mission) => [mission.id, mission] as const))('%s: эталон содержит нужные блоки, шаблон — нет', (id, mission) => {
        const real = typesOf(mission.solutionXml);
        // Разбор типов в проверке совпадает с настоящим Blockly.
        expect(solutionBlockTypes(mission)).toEqual(real);
        expect({ id, missing: missingBricksBlocks(mission, expandCounts(real)) }).toEqual({ id, missing: [] });
        expect(missingBricksBlocks(mission, expandCounts(typesOf(mission.starterXml))).length).toBeGreaterThan(0);
    });
});

describe('эталонные проекты bricks в рантайме симулятора', () => {
    test.each(BRICKS_MISSIONS.map((mission) => [mission.id, mission] as const))('%s: решение проходит проверку полёта', (id, mission) => {
        if (!mini2Ready) return;
        const code = compileBricksXml(mission.solutionXml);
        const run = runMini2Program(code, { markers: mission.scene === 'markers' });
        const evaluation = gradeBricksMission(id, run.samples, run.events);
        expect({ id, error: run.error, errors: evaluation.diagnostics.filter((item) => item.kind === 'error').map((item) => `${item.title}: ${item.reason}`) })
            .toEqual({ id, error: null, errors: [] });
        expect(evaluation.solved).toBe(true);
    }, 120_000);
});

describe('сообщения об ошибках', () => {
    const mission = (id: string) => BRICKS_MISSIONS.find((item) => item.id === id)!;
    const grade = (id: string, xml: string, markers = false) => {
        const run = runMini2Program(compileBricksXml(xml), { markers });
        return gradeBricksMission(id, run.samples, run.events);
    };

    withMini2Python('пустая программа: первый полёт не засчитан, назван взлёт', () => {
        const result = grade('bricks-first-flight', mission('bricks-first-flight').starterXml);
        expect(result.solved).toBe(false);
        expect(result.diagnostics.map((item) => item.title).join(' ')).toMatch(/Нужна одна подготовка|Взлёт не подтверждён/);
    });

    withMini2Python('шаблоны полётных миссий не проходят проверку', () => {
        for (const id of ['bricks-hover', 'bricks-go-point', 'bricks-square', 'bricks-speed', 'bricks-led-colors']) {
            expect({ id, solved: grade(id, mission(id).starterXml).solved }).toEqual({ id, solved: false });
        }
    }, 120_000);

    withMini2Python('цвета не по порядку: названо, что показал светодиод', () => {
        const wrong = mission('bricks-led-colors').solutionXml.replace('#00ff00', '#0000ff');
        const result = grade('bricks-led-colors', wrong);
        expect(result.solved).toBe(false);
        expect(result.diagnostics[0].reason).toContain('red');
    });
});
