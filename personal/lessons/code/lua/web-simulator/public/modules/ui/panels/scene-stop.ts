/*
 * Run and stop live in the editor header. When another panel is open while a program runs,
 * a single «Стоп» stays reachable on the scene, so a student never has to reopen the editor
 * to stop the drone. It mirrors #stop-btn: visible only while that button is enabled.
 */
export function initSceneStop(): void {
    const sceneStop = document.getElementById('scene-stop-btn') as HTMLButtonElement | null;
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement | null;
    const editorPanel = document.getElementById('editor-panel');
    if (!sceneStop || !stopBtn) return;
    const sync = () => {
        const editorOpen = !!editorPanel?.classList.contains('active');
        sceneStop.hidden = stopBtn.disabled || editorOpen;
    };
    sceneStop.addEventListener('click', () => { if (!stopBtn.disabled) stopBtn.click(); });
    new MutationObserver(sync).observe(stopBtn, { attributes: true, attributeFilter: ['disabled'] });
    if (editorPanel) new MutationObserver(sync).observe(editorPanel, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('sidebar-panel-change', sync);
    sync();
}
