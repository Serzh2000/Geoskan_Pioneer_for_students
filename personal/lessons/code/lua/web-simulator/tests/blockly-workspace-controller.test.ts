/**
 * Регрессионный тест на баг замыкания языка в ensureBlocklyWorkspace()
 * (docs/blockly-unification-plan.md, §2 и фаза 2, шаг 5): обработчик
 * addChangeListener раньше захватывал `language` из первого вызова
 * ensureBlocklyWorkspace, поэтому после смены языка правки сохранялись
 * под старым ключом и компилировались старым генератором.
 *
 * Blockly.inject() подменяется на настоящий headless Blockly.Workspace,
 * т.к. jsdom в проекте не установлен (testEnvironment в jest.config — 'node'),
 * а полноценный Blockly.inject() требует браузерного DOM/SVG. Реальный
 * `blockly`-модуль — ES-модуль с замороженным неймспейсом (в отличие от
 * fengari-web), поэтому подмену inject() делаем через
 * jest.unstable_mockModule до первого импорта пакета.
 */
import { jest } from '@jest/globals';
import type * as BlocklyNS from 'blockly';
import type { ScriptLanguage } from '../public/modules/core/state.js';
import type { BlocklyWorkspaceController } from '../public/modules/editor/blockly/workspace-controller.js';

const mockInject = jest.fn();

jest.unstable_mockModule('blockly', async () => {
    const actual = await jest.requireActual<typeof BlocklyNS>('blockly');
    // Копия объекта, а не подмена целиком: вложенные реестры (Blocks, Msg и
    // т.п.) остаются теми же ссылками, что и в настоящем пакете, — их продолжают
    // мутировать blockly-core.ts/lua-definitions.ts при регистрации блоков.
    return { ...actual, inject: mockInject };
});

let Blockly: typeof BlocklyNS;
let ensureBlocklyWorkspace: typeof import('../public/modules/editor/blockly/workspace-controller.js').ensureBlocklyWorkspace;
let ensureBlocklyLoaded: typeof import('../public/modules/editor/blockly-mode/loader.js').ensureBlocklyLoaded;

beforeAll(async () => {
    Blockly = await import('blockly');
    await import('../public/modules/editor/blockly-mode/blockly-core.js');
    await import('../public/modules/editor/blockly-mode/workspace-xml.js');
    await import('../public/modules/editor/blockly-mode/lua-definitions.js');
    ({ ensureBlocklyLoaded } = await import('../public/modules/editor/blockly-mode/loader.js'));
    ({ ensureBlocklyWorkspace } = await import('../public/modules/editor/blockly/workspace-controller.js'));
    await ensureBlocklyLoaded();
});

function makeController(overrides: {
    getCurrentLanguage: () => ScriptLanguage;
    textDraftByKey: Map<string, string>;
    blocklyWorkspaceXmlByKey: Map<string, string>;
}): BlocklyWorkspaceController {
    const state: { blocklyWorkspace: BlocklyNS.WorkspaceSvg | null } = { blocklyWorkspace: null };

    return {
        blocklyCanvas: {} as unknown as HTMLElement,
        get blocklyWorkspace() {
            return state.blocklyWorkspace;
        },
        setBlocklyWorkspace: (workspace) => {
            state.blocklyWorkspace = workspace;
        },
        getCurrentLanguage: overrides.getCurrentLanguage,
        getTheme: () => undefined,
        buildMainEditorToolbox: () => '<xml></xml>',
        compileMainEditorWorkspace: (language) => `compiled:${language}`,
        createStarterWorkspaceXml: () => '<xml></xml>',
        isStarterLuaScript: () => false,
        getTextEditorValue: () => '',
        getEditorStateKey: (language) => `drone:${language}`,
        textDraftByKey: overrides.textDraftByKey,
        blocklyWorkspaceXmlByKey: overrides.blocklyWorkspaceXmlByKey,
        persistEditorSession: () => {},
        updateBlocklyPreview: () => {},
        resizeBlocklyWorkspaceViewport: () => {},
        ensureBlocklyResizeTracking: () => {},
        scheduleBlocklyAutofit: () => {}
    };
}

describe('ensureBlocklyWorkspace: баг замыкания языка', () => {
    test('после смены языка правки сохраняются под НОВЫМ языком, а не языком первого вызова', async () => {
        // Headless Blockly.Workspace вместо настоящего SVG-воркспейса —
        // addChangeListener/getTopBlocks у него настоящие, этого достаточно
        // для проверки того, какой ключ используется при сохранении.
        const fakeWorkspace = new Blockly.Workspace() as unknown as BlocklyNS.WorkspaceSvg;
        (fakeWorkspace as unknown as { updateToolbox: () => void }).updateToolbox = () => {};

        const capturedListeners: Array<() => void> = [];
        const originalAddChangeListener = fakeWorkspace.addChangeListener.bind(fakeWorkspace);
        // Продакшен-код вешает 0-арные слушатели (JS не проверяет арность), но
        // тип addChangeListener строгий — приводим сигнатуру явным приведением
        // типов, а не `any`, чтобы не терять проверку остального теста.
        fakeWorkspace.addChangeListener = ((callback: () => void) => {
            capturedListeners.push(callback);
            return originalAddChangeListener(callback);
        }) as typeof fakeWorkspace.addChangeListener;

        mockInject.mockReturnValue(fakeWorkspace);

        let currentLanguage: ScriptLanguage = 'lua';
        const textDraftByKey = new Map<string, string>();
        const blocklyWorkspaceXmlByKey = new Map<string, string>();
        const controller = makeController({
            getCurrentLanguage: () => currentLanguage,
            textDraftByKey,
            blocklyWorkspaceXmlByKey
        });

        // Первый вызов создаёт единственный Blockly-воркспейс и вешает
        // addChangeListener — это происходит только один раз за сессию.
        await ensureBlocklyWorkspace(controller, 'lua', 'lua');
        expect(controller.blocklyWorkspace).toBe(fakeWorkspace);
        expect(capturedListeners).toHaveLength(1);

        // Пользователь переключает язык на python; тот же воркспейс
        // переиспользуется (ensureBlocklyWorkspace не создаёт новый).
        currentLanguage = 'python';
        await ensureBlocklyWorkspace(controller, 'python', 'python');
        expect(capturedListeners).toHaveLength(1);

        // Пользователь правит блок — addChangeListener должен увидеть ТЕКУЩИЙ
        // язык (python), а не 'lua', с которым воркспейс создавался изначально.
        capturedListeners[0]();

        expect(textDraftByKey.get('drone:python')).toBe('compiled:python');
        expect(textDraftByKey.has('drone:lua')).toBe(false);
        expect(blocklyWorkspaceXmlByKey.has('drone:python')).toBe(true);
        expect(blocklyWorkspaceXmlByKey.has('drone:lua')).toBe(false);
    });
});
