import type * as BlocklyNS from 'blockly';

export type { BlocklyNS };

type BlocklyCoreModule = typeof import('./blockly-core.js');
type WorkspaceXmlModule = typeof import('./workspace-xml.js');

export let Blockly: typeof BlocklyNS;
export let getBlocklyGenerator: BlocklyCoreModule['getBlocklyGenerator'] = () => null;
export let initBlocklyDefinitions: BlocklyCoreModule['initBlocklyDefinitions'] = () => {};
export let buildTargetWorkspaceXml: WorkspaceXmlModule['buildTargetWorkspaceXml'] = () => '<xml></xml>';
export let extractMissionGuideSequence: WorkspaceXmlModule['extractMissionGuideSequence'] = () => [];
export let serializeWorkspaceXml: WorkspaceXmlModule['serializeWorkspaceXml'] = () => '';

let loadPromise: Promise<void> | null = null;

// Пакет `blockly` (216 КБ gzip) и его базовые определения (локаль, генераторы,
// учебные блоки) грузятся только здесь, по первому реальному обращению к
// редактору Blockly (галочка «Режим Blockly») или к гайду с заданиями —
// а не при каждой загрузке страницы.
export function ensureBlocklyLoaded(): Promise<void> {
    if (!loadPromise) {
        loadPromise = Promise.all([
            import('./blockly-core.js'),
            import('./workspace-xml.js')
        ]).then(([core, workspaceXml]) => {
            Blockly = core.Blockly;
            getBlocklyGenerator = core.getBlocklyGenerator;
            initBlocklyDefinitions = core.initBlocklyDefinitions;
            buildTargetWorkspaceXml = workspaceXml.buildTargetWorkspaceXml;
            extractMissionGuideSequence = workspaceXml.extractMissionGuideSequence;
            serializeWorkspaceXml = workspaceXml.serializeWorkspaceXml;
        });
    }
    return loadPromise;
}

export function isBlocklyLoaded(): boolean {
    return Blockly !== undefined;
}
