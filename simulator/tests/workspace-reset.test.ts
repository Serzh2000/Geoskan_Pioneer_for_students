import { resetWorkspaceStorage } from '../public/modules/ui/settings/workspace.js';

function fakeStorage(entries: Record<string, string>) {
    const data = new Map(Object.entries(entries));
    return {
        data,
        get length() { return data.size; },
        key: (index: number) => Array.from(data.keys())[index] ?? null,
        removeItem: (key: string) => { data.delete(key); }
    };
}

describe('workspace reset', () => {
    test('forgets layout keys and leaves progress and drafts alone', () => {
        const storage = fakeStorage({
            geoskan_sidebar_active_panel_v1: 'editor-panel',
            geoskan_rail_pinned_v1: '1',
            geoskan_app_theme_v1: 'dark',
            geoskan_editor_expanded_v1: '1',
            'sidebar-width': '520px',
            'sidebar-width:telemetry-panel': '320px',
            'pioneer:mission-guide:progress:v1': '{"done":3}',
            geoskan_editor_session_v1: '{"code":"print(1)"}',
            geoskan_show_fps_v1: '1'
        });

        const removed = resetWorkspaceStorage(storage);

        expect(removed.sort()).toEqual([
            'geoskan_app_theme_v1',
            'geoskan_editor_expanded_v1',
            'geoskan_rail_pinned_v1',
            'geoskan_sidebar_active_panel_v1',
            'sidebar-width',
            'sidebar-width:telemetry-panel'
        ]);
        expect(Array.from(storage.data.keys()).sort()).toEqual([
            'geoskan_editor_session_v1',
            'geoskan_show_fps_v1',
            'pioneer:mission-guide:progress:v1'
        ]);
    });
});
