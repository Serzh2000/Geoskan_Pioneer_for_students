import { setBlocklyEditorEnabled, setEditorLanguage, setEditorValue } from '../../../editor/index.js';
import { getTemporaryDocumentToken } from '../../../editor/index/temporary-document.js';
import { setCurrentScriptLanguage } from '../../../core/state.js';
import { resetSimulationState, restartAndRunSimulation } from '../../../app/simulation-controls.js';
import { setMissionGuideScenePreviewActive } from '../support/scene-preview.js';

/**
 * Runs an example in the simulator for the demonstration. The guide edits a temporary document, so the example
 * never reaches the student's files, and the practice loads its own draft when the student gets to it.
 * Returns false when the guide was closed while the example was starting.
 */
export async function runExample(language: 'lua' | 'python', code: string): Promise<boolean> {
    const token = getTemporaryDocumentToken();
    setMissionGuideScenePreviewActive(true);
    setCurrentScriptLanguage(language);
    // A text example is shown even in the Blockly volume: the blocks come back when the practice opens the workspace.
    setBlocklyEditorEnabled(false);
    await setEditorLanguage(language);
    if (getTemporaryDocumentToken() !== token) return false;
    await setEditorValue(code);
    if (getTemporaryDocumentToken() !== token) return false;
    await restartAndRunSimulation();
    return true;
}

export function stopExample(): void {
    resetSimulationState();
}
