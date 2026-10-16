import 'monaco-editor/min/vs/editor/editor.main.css';

export {
    beginTemporaryEditorDocument,
    restoreTemporaryEditorDocument,
    getEditorValue,
    getMainBlocklyWorkspace,
    getSavedEditorDraft,
    initEditor,
    isBlocklyEditorEnabled,
    layoutEditor,
    loadMainBlocklyXml,
    setEditorTheme,
    setBlocklyEditorEnabled,
    setEditorLanguage,
    setEditorValue,
    revealEditorStart,
    syncScriptLanguageSelect
} from './index/api.js';
export {
    buildTargetWorkspaceXml,
    extractMissionGuideSequence,
    serializeWorkspaceXml
} from './blockly.js';
