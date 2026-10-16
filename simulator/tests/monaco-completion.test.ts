describe('Monaco completion filtering', () => {
    let getLuaCompletionEntries: typeof import('../public/modules/editor/monaco/completion.js').getLuaCompletionEntries;
    let getPythonCompletionEntries: typeof import('../public/modules/editor/monaco/completion.js').getPythonCompletionEntries;

    beforeAll(async () => {
        ({ getLuaCompletionEntries, getPythonCompletionEntries } = await import('../public/modules/editor/monaco/completion.js'));
    });

    test('для camera. в Lua возвращает только методы камеры', () => {
        const entries = getLuaCompletionEntries('camera.', 'camera.');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toEqual([
            'requestMakeShot',
            'checkRequestShot',
            'requestRecordStart',
            'requestRecordStop',
            'checkRequestRecord'
        ]);
        expect(labels).not.toContain('ap');
        expect(labels).not.toContain('deltaTime');
    });

    test('для Ev. в Lua возвращает только константы событий', () => {
        const entries = getLuaCompletionEntries('Ev.', 'Ev.');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toContain('MCE_TAKEOFF');
        expect(labels).toContain('ENGINES_ARM');
        expect(labels).not.toContain('camera');
        expect(labels).not.toContain('requestMakeShot');
    });

    test('понимает алиасы Lua-объектов, созданных через конструктор', () => {
        const script = [
            'local timer = Timer.new(1, function() end)',
            'timer:'
        ].join('\n');
        const entries = getLuaCompletionEntries(script, 'timer:');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toEqual(['start', 'stop']);
        expect(labels).not.toContain('callLater');
        expect(labels).not.toContain('camera');
    });

    test('понимает алиасы Lua-объектов, присвоенных напрямую', () => {
        const script = [
            'local cam = camera',
            'cam.'
        ].join('\n');
        const entries = getLuaCompletionEntries(script, 'cam.');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toContain('requestMakeShot');
        expect(labels).not.toContain('ap');
    });

    test('для camera. в Python возвращает только методы Camera', () => {
        const script = [
            'camera = Camera()',
            'camera.'
        ].join('\n');
        const entries = getPythonCompletionEntries(script, 'camera.');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toEqual([
            'get_frame',
            'get_cv_frame',
            'connect',
            'disconnect',
            'connected'
        ]);
        expect(labels).not.toContain('arm');
        expect(labels).not.toContain('takeoff');
    });

    test('для pioneer. в Python возвращает только методы Pioneer', () => {
        const script = [
            'pioneer = Pioneer()',
            'pioneer.'
        ].join('\n');
        const entries = getPythonCompletionEntries(script, 'pioneer.');
        const labels = entries.map((entry) => entry.label);

        expect(labels).toContain('arm');
        expect(labels).toContain('takeoff');
        expect(labels).not.toContain('get_frame');
        expect(labels).not.toContain('connect');
    });
});
