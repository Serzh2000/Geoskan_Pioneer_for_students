/*
 * "Настройки → Рабочее место": the FPS badge switch and the workspace reset.
 * Reset forgets only the layout (open panel, panel widths, rail pin, editor expansion, theme).
 * Course progress, editor drafts and every other key stay where they are.
 */

export const SHOW_FPS_STORAGE_KEY = 'geoskan_show_fps_v1';

const WORKSPACE_KEYS = [
    'geoskan_sidebar_active_panel_v1',
    'geoskan_rail_pinned_v1',
    'geoskan_editor_expanded_v1',
    'geoskan_app_theme_v1'
];
// `sidebar-width` is the legacy editor width, `sidebar-width:<panel id>` the others.
const WORKSPACE_KEY_PREFIXES = ['sidebar-width'];

type KeyValueStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

/** Removes the layout keys; returns what was removed. Never touches progress or drafts. */
export function resetWorkspaceStorage(storage: KeyValueStorage): string[] {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && (WORKSPACE_KEYS.includes(key) || WORKSPACE_KEY_PREFIXES.some(prefix => key.startsWith(prefix)))) keys.push(key);
    }
    keys.forEach(key => storage.removeItem(key));
    return keys;
}

function readShowFps(): boolean {
    try { return localStorage.getItem(SHOW_FPS_STORAGE_KEY) === '1'; } catch { return false; }
}

/** The badge is hidden by default; the switch in Settings is its only way on. */
export function applyShowFps(visible: boolean): void {
    const badge = document.getElementById('scene-fps')?.closest<HTMLElement>('.scene-hud-readout');
    if (badge) badge.hidden = !visible;
}

function bindFpsToggle(): void {
    const toggle = document.getElementById('setting-show-fps') as HTMLInputElement | null;
    const visible = readShowFps();
    applyShowFps(visible);
    if (!toggle) return;
    toggle.checked = visible;
    toggle.addEventListener('change', () => {
        applyShowFps(toggle.checked);
        try { localStorage.setItem(SHOW_FPS_STORAGE_KEY, toggle.checked ? '1' : '0'); } catch { /* The choice then lasts for this session only. */ }
    });
}

function bindWorkspaceReset(): void {
    const start = document.getElementById('workspace-reset-btn') as HTMLButtonElement | null;
    const confirmBox = document.getElementById('workspace-reset-confirm');
    const confirm = document.getElementById('workspace-reset-confirm-btn') as HTMLButtonElement | null;
    const cancel = document.getElementById('workspace-reset-cancel-btn') as HTMLButtonElement | null;
    if (!start || !confirmBox || !confirm || !cancel) return;

    const ask = (asking: boolean) => {
        confirmBox.hidden = !asking;
        start.hidden = asking;
        (asking ? cancel : start).focus();
    };
    start.addEventListener('click', () => ask(true));
    cancel.addEventListener('click', () => ask(false));
    confirmBox.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        ask(false);
    });
    confirm.addEventListener('click', () => {
        try { resetWorkspaceStorage(localStorage); } catch { /* Nothing stored, nothing to reset. */ }
        window.location.reload();
    });
}

export function bindWorkspaceControls(): void {
    bindFpsToggle();
    bindWorkspaceReset();
}
