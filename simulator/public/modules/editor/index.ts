import 'monaco-editor/min/vs/editor/editor.main.css';

export {
    getEditorValue,
    getMainBlocklyWorkspace,
    getSavedEditorDraft,
    initEditor,
    isBlocklyEditorEnabled,
    layoutEditor,
    loadMainBlocklyJson,
    loadMainBlocklyXml,
    setEditorTheme,
    setBlocklyEditorEnabled,
    setEditorLanguage,
    setEditorValue,
    syncBlocklyWithDroneModel,
    syncScriptLanguageSelect
} from './index/api.js';
export { exportMainBricksProject, loadMainBricksProject } from './index/bricks-api.js';
export {
    buildTargetWorkspaceXml,
    extractMissionGuideSequence,
    serializeWorkspaceXml
} from './blockly.js';
