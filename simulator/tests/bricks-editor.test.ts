/**
 * Редактор блоков с двумя наборами: у Пионера Базового - общие блоки pioneer_*, у Мини 2 - Bricks.
 * Проверяется выбор набора по модели дрона, раздельное хранение workspace, имена типов блоков в файлах
 * проектов (родные имена Bricks) и то, что набор Мини 2 не меняет код Базового.
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import type { BlocklyWorkspaceController } from '../public/modules/editor/blockly/workspace-controller.js';
import { ensureBlocklyLoaded } from '../public/modules/editor/blockly-mode/loader.js';
import {
    buildMainEditorToolbox,
    compileMainEditorWorkspace,
    compilePioneerWorkspace
} from '../public/modules/editor/blockly-mode/index.js';
import { createStarterWorkspaceXml } from '../public/modules/editor/blockly-mode/workspace.js';
import {
    allBricksBlockTypes,
    BRICKS_DRONE_ONLY_REASON,
    BRICKS_SPECS,
    blocklyStateKeySuffix,
    buildBricksToolbox,
    compileBricksWorkspace,
    loadBricksProject,
    looksLikeBricksProject,
    serializeBricksProject,
    setBlocklyModelProvider
} from '../public/modules/editor/blockly-mode/bricks/index.js';
import { saveBlocklyWorkspaceState, loadBlocklyWorkspace, switchBlocklyModel } from '../public/modules/editor/blockly/workspace-controller.js';
import { BRICKS_PROJECTS, compileBricksProject, compileBricksXml, readBricksFixture } from './helpers/bricks-fixtures.js';

const MINI2 = 'pioneer-mini2';
const BASIC = 'pioneer-basic';

afterEach(() => setBlocklyModelProvider(() => null));

function toolboxTypes(xml: string): string[] {
    return [...xml.matchAll(/<block type="([^"]+)"/g)].map((match) => match[1]);
}

describe('набор блоков по модели дрона', () => {
    test('Мини 2 - тулбокс Bricks, Базовый - pioneer_*', () => {
        setBlocklyModelProvider(() => MINI2);
        const bricks = buildMainEditorToolbox('python');
        expect(bricks).toBe(buildBricksToolbox());
        expect(bricks).toContain('bricks_take_off');
        expect(bricks).not.toContain('pioneer_takeoff');

        setBlocklyModelProvider(() => BASIC);
        const basic = buildMainEditorToolbox('python');
        expect(basic).toContain('pioneer_takeoff');
        expect(basic).not.toContain('bricks_take_off');
    });

    test('тулбокс Bricks: категории как в палитре Bricks, все блоки определены и каждый блок набора есть', () => {
        const xml = buildBricksToolbox();
        const dom = Blockly.utils.xml.textToDom(xml);
        const names = Array.from(dom.getElementsByTagName('category')).map((category) => category.getAttribute('name'));
        expect(names).toEqual([
            'Текст', 'Логика', 'Циклы', 'Математика', 'Функции', 'Переменные', 'Массивы',
            'Полёт', 'Модули', 'Камера', 'ИИ', 'Компьютерное зрение', 'Прочее'
        ]);
        const types = toolboxTypes(xml);
        for (const type of types) expect(Blockly.Blocks[type]).toBeDefined();
        for (const type of allBricksBlockTypes().filter((name) => name !== 'bricks_start_block')) expect(types).toContain(type);
    });

    test('блоки «только на дроне» в тулбоксе отключены причиной, а не вручную', () => {
        const xml = buildBricksToolbox();
        const droneOnly = BRICKS_SPECS.filter((spec) => spec.droneOnly).map((spec) => spec.type);
        expect(droneOnly.length).toBeGreaterThan(0);
        for (const type of droneOnly) {
            expect(xml).toContain(`<block type="bricks_${type}" disabled-reasons="${BRICKS_DRONE_ONLY_REASON}">`);
        }
        expect(xml).not.toContain('disabled="true"');
    });

    test('компилятор редактора выбирает генератор по блокам, а не только по модели', () => {
        const bricks = new Blockly.Workspace();
        loadBricksProject(readBricksFixture(BRICKS_PROJECTS[0], 'xml'), bricks);
        setBlocklyModelProvider(() => BASIC);
        expect(compileMainEditorWorkspace('python', bricks as Blockly.WorkspaceSvg)).toContain('from pioneer_sdk2 import Pioneer');

        const pioneer = new Blockly.Workspace();
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(createStarterWorkspaceXml('python')), pioneer);
        setBlocklyModelProvider(() => MINI2);
        // Мини 2 выбран, но на поле блоки Базового: собираются своим компилятором, а не Bricks.
        expect(compileMainEditorWorkspace('python', pioneer as Blockly.WorkspaceSvg)).toContain('pioneer_sdk');
        bricks.dispose();
        pioneer.dispose();
    });

    test('стартовая программа Мини 2 - блоки Bricks, Базового - pioneer_*', () => {
        setBlocklyModelProvider(() => MINI2);
        expect(createStarterWorkspaceXml('python')).toContain('bricks_start_block');
        setBlocklyModelProvider(() => BASIC);
        expect(createStarterWorkspaceXml('python')).toContain('pioneer_start');
        setBlocklyModelProvider(() => MINI2);
        const workspace = new Blockly.Workspace();
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(createStarterWorkspaceXml('python')), workspace);
        const code = compileBricksWorkspace(workspace);
        expect(code).toContain('pioneer.arm()');
        expect(code.indexOf('pioneer.takeoff()')).toBeLessThan(code.indexOf('pioneer.land()'));
        workspace.dispose();
    });

    test('ключ хранения workspace: у Мини 2 свой, у Базового прежний', () => {
        expect(blocklyStateKeySuffix(MINI2)).toBe(':bricks');
        expect(blocklyStateKeySuffix(BASIC)).toBe('');
        expect(blocklyStateKeySuffix(null)).toBe('');
        expect(blocklyStateKeySuffix(undefined)).toBe('');
    });
});

describe('набор Мини 2 не меняет код Базового', () => {
    test('сборка Bricks не оставляет зарезервированных слов и подмены print в общем генераторе', () => {
        const basicStarter = () => {
            const workspace = new Blockly.Workspace();
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(createStarterWorkspaceXml('python')), workspace);
            const code = compilePioneerWorkspace(workspace, 'python');
            workspace.dispose();
            return code;
        };
        setBlocklyModelProvider(() => BASIC);
        const before = basicStarter();
        const reservedBefore = (pythonGenerator as unknown as { RESERVED_WORDS_: string }).RESERVED_WORDS_;
        const printBefore = pythonGenerator.forBlock['text_print'];

        compileBricksProject(BRICKS_PROJECTS[0]);

        expect((pythonGenerator as unknown as { RESERVED_WORDS_: string }).RESERVED_WORDS_).toBe(reservedBefore);
        expect(pythonGenerator.forBlock['text_print']).toBe(printBefore);
        expect(basicStarter()).toBe(before);
    });

    test('учебные блоки с теми же именами (go_local_point, led_all...) остаются прежними', () => {
        for (const type of ['go_local_point', 'led_all', 'take_off', 'cam_get_cv_frame']) {
            expect(Blockly.Blocks[type]).toBeDefined();
            expect(Blockly.Blocks[type]).not.toBe(Blockly.Blocks[`bricks_${type}`]);
        }
    });
});

describe('проекты Bricks: имена блоков в файле', () => {
    test('в сохранённом XML родные имена Bricks, без префикса редактора', () => {
        const workspace = new Blockly.Workspace();
        loadBricksProject(readBricksFixture('u07_ii_lyudi', 'xml'), workspace);
        expect(workspace.getAllBlocks(false).some((block) => block.type === 'bricks_paint_obj')).toBe(true);
        const saved = serializeBricksProject(workspace, 'u07_ii_lyudi');
        expect(saved).toContain('type="paint_obj"');
        expect(saved).toContain('type="start_block"');
        expect(saved).not.toContain('bricks_');
        expect(looksLikeBricksProject(saved)).toBe(true);
        workspace.dispose();
    });

    test('внутреннее имя в файле тоже открывается', () => {
        const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="bricks_start_block"><next><block type="bricks_take_off"></block></next></block></xml>';
        expect(compileBricksXml(xml)).toContain('pioneer.takeoff()');
    });

    test('обычный XML Blockly без Bricks не принимается за проект', () => {
        expect(looksLikeBricksProject('<xml><block type="pioneer_start"></block></xml>')).toBe(false);
        expect(looksLikeBricksProject('print("hi")')).toBe(false);
    });
});

describe('форма и поведение блоков', () => {
    test('«Нарисовать»: набор входов зависит от выбранного объекта', () => {
        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock('bricks_paint_obj');
        const inputs = () => block.inputList.map((input) => input.name).filter(Boolean);
        expect(block.getFieldValue('chosen_obj')).toBe('yolo_obj');
        expect(inputs()).toEqual(expect.arrayContaining(['obj', 'frame', 'colour']));
        block.setFieldValue('aruco', 'chosen_obj');
        expect(inputs()).toEqual(expect.arrayContaining(['obj', 'frame', 'ARUCO_ROW']));
        expect(inputs()).not.toContain('colour');
        block.setFieldValue('id', 'chosen_objaaaa');
        expect(inputs()).toContain('ID');
        block.setFieldValue('yolopose_obj', 'chosen_obj');
        expect(inputs()).not.toContain('colour');
        expect(inputs()).not.toContain('ARUCO_ROW');
        expect(inputs()).not.toContain('ID');
        workspace.dispose();
    });

    test('сервопривод округляется до шага 15 градусов, как в Bricks', () => {
        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock('bricks_servo_set_angle');
        block.setFieldValue('20', 'angle');
        expect(Number(block.getFieldValue('angle'))).toBe(15);
        block.setFieldValue('-40', 'angle');
        expect(Number(block.getFieldValue('angle'))).toBe(-45);
        // Диапазон -80..30 с шагом 15: ниже всего достижимо -75 (кратное 15 внутри диапазона).
        block.setFieldValue('-200', 'angle');
        expect(Number(block.getFieldValue('angle'))).toBe(-75);
        block.setFieldValue('100', 'angle');
        expect(Number(block.getFieldValue('angle'))).toBe(30);
        workspace.dispose();
    });

    test('цвет: значение в нижнем регистре, плохое значение отвергается', () => {
        const workspace = new Blockly.Workspace();
        const block = workspace.newBlock('bricks_field-colour');
        block.setFieldValue('#FFAA00', 'colour');
        expect(block.getFieldValue('colour')).toBe('#ffaa00');
        block.setFieldValue('красный', 'colour');
        expect(block.getFieldValue('colour')).toBe('#ffaa00');
        workspace.dispose();
    });

    test('блоки «только на дроне» отключаются при открытии проекта и не попадают в код', () => {
        const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="start_block"><next>'
            + '<block type="text_print"><value name="TEXT"><block type="cv_canny"><value name="img"><block type="math_number"><field name="NUM">1</field></block></value>'
            + '<field name="low">50</field><field name="high">150</field></block></value></block></next></block></xml>';
        const workspace = new Blockly.Workspace();
        loadBricksProject(xml, workspace);
        const canny = workspace.getAllBlocks(false).find((block) => block.type === 'bricks_cv_canny');
        expect(canny?.hasDisabledReason(BRICKS_DRONE_ONLY_REASON)).toBe(true);
        expect(compileBricksWorkspace(workspace)).not.toContain('cv2.Canny');
        workspace.dispose();
    });

    test('каждый блок набора создаётся и даёт Python без ошибок', () => {
        for (const spec of BRICKS_SPECS) {
            const workspace = new Blockly.Workspace();
            const start = workspace.newBlock('bricks_start_block');
            const block = workspace.newBlock(`bricks_${spec.type}`);
            if (spec.kind === 'statement') {
                start.nextConnection!.connect(block.previousConnection!);
            } else {
                const print = workspace.newBlock('text_print');
                print.getInput('TEXT')!.connection!.connect(block.outputConnection!);
                start.nextConnection!.connect(print.previousConnection!);
            }
            const code = compileBricksWorkspace(workspace);
            expect({ type: spec.type, ok: code.includes('print("Начало программы")') && code.includes('try:') }).toEqual({ type: spec.type, ok: true });
            workspace.dispose();
        }
    });

    test('вложенное распознавание текста собирается в рабочий код', () => {
        const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="start_block"><next>'
            + '<block type="text_print"><value name="TEXT"><block type="ppocr_text_selection_from_object"><value name="ppocr">'
            + '<block type="ppocr_text_find"><value name="img"><block type="cam_get_cv_frame"><field name="choice">CameraType.MAIN</field></block></value></block></value></block></value></block></next></block></xml>';
        const code = compileBricksXml(xml);
        // Вложенное распознавание: Bricks 2.3.0 даёт здесь SyntaxError (:= в генераторе списка), редактор - рабочий код.
        expect(code).toContain('(lambda ocr:');
        expect(code).toContain('results_ppocr_img :=');
    });
});

describe('смена модели при открытом редакторе блоков', () => {
    function makeController() {
        const xmlByKey = new Map<string, string>();
        const workspace = new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg;
        const toolboxes: string[] = [];
        (workspace as unknown as { updateToolbox: (xml: string) => void }).updateToolbox = (xml: string) => { toolboxes.push(xml); };
        let model: string | null = BASIC;
        const controller = {
            blocklyCanvas: {} as HTMLElement,
            blocklyWorkspace: workspace,
            setBlocklyWorkspace: () => {},
            getCurrentLanguage: () => 'python',
            getTheme: () => undefined,
            buildMainEditorToolbox: (language: string) => buildMainEditorToolbox(language as 'python'),
            compileMainEditorWorkspace: () => '',
            createStarterWorkspaceXml: (language: string) => createStarterWorkspaceXml(language as 'python'),
            isStarterLuaScript: () => false,
            getTextEditorValue: () => '',
            getEditorStateKey: (language: string) => `drone_1:${language}`,
            // Как в editor/index/shell.ts: у Мини 2 ключ с суффиксом, явная модель - для блоков прежней модели.
            getBlocklyStateKey: (explicit?: string | null) => `drone_1:blockly${blocklyStateKeySuffix(explicit === undefined ? model : explicit)}`,
            textDraftByKey: new Map<string, string>(),
            blocklyWorkspaceXmlByKey: xmlByKey,
            persistEditorSession: () => {},
            resizeBlocklyWorkspaceViewport: () => {},
            ensureBlocklyResizeTracking: () => {},
            scheduleBlocklyAutofit: () => {}
        } as unknown as BlocklyWorkspaceController;
        return {
            controller,
            workspace,
            xmlByKey,
            toolboxes,
            setModel: (next: string) => { model = next; setBlocklyModelProvider(() => next); }
        };
    }

    const types = (workspace: Blockly.Workspace) => workspace.getAllBlocks(false).map((block) => block.type);

    test('блоки каждой модели хранятся отдельно и возвращаются при обратном переключении', async () => {
        await ensureBlocklyLoaded();
        const { controller, workspace, xmlByKey, toolboxes, setModel } = makeController();
        setModel(BASIC);
        loadBlocklyWorkspace(controller, 'python');
        expect(types(workspace)).toContain('pioneer_start');
        // Ученик добавил блок на поле Базового.
        const extra = workspace.newBlock('pioneer_wait');
        void extra;
        saveBlocklyWorkspaceState(controller);
        expect(xmlByKey.get('drone_1:blockly')).toContain('pioneer_wait');

        setModel(MINI2);
        expect(switchBlocklyModel(controller, 'python')).toBe(true);
        expect(types(workspace)).toContain('bricks_start_block');
        expect(types(workspace)).not.toContain('pioneer_start');
        expect(toolboxes[toolboxes.length - 1]).toContain('bricks_take_off');
        // Блоки Базового не потеряны и не смешались с блоками Мини 2.
        expect(xmlByKey.get('drone_1:blockly')).toContain('pioneer_wait');
        expect(xmlByKey.get('drone_1:blockly:bricks')).toContain('bricks_start_block');
        expect(xmlByKey.get('drone_1:blockly:bricks')).not.toContain('pioneer_');

        // Правка у Мини 2 сохраняется под ключом Мини 2.
        workspace.newBlock('bricks_sleep');
        saveBlocklyWorkspaceState(controller);
        expect(xmlByKey.get('drone_1:blockly:bricks')).toContain('bricks_sleep');
        expect(xmlByKey.get('drone_1:blockly')).not.toContain('bricks_');

        setModel(BASIC);
        expect(switchBlocklyModel(controller, 'python')).toBe(true);
        expect(types(workspace)).toContain('pioneer_wait');
        expect(types(workspace)).not.toContain('bricks_sleep');
        expect(switchBlocklyModel(controller, 'python')).toBe(false);
    });

    test('сохранение после смены модели, но до перезагрузки поля, идёт под ключом прежней модели', async () => {
        await ensureBlocklyLoaded();
        const { controller, workspace, xmlByKey, setModel } = makeController();
        setModel(MINI2);
        loadBlocklyWorkspace(controller, 'python');
        expect(types(workspace)).toContain('bricks_start_block');
        setModel(BASIC);
        saveBlocklyWorkspaceState(controller);
        expect(xmlByKey.get('drone_1:blockly:bricks')).toContain('bricks_start_block');
        expect(xmlByKey.has('drone_1:blockly')).toBe(false);
    });
});
