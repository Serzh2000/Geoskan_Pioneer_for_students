let syntaxRegistered = false;
let themeRegistered = false;

function ensureLanguageRegistered(monaco: any, id: string): void {
    const languages = monaco.languages.getLanguages() as Array<{ id: string }>;
    if (!languages.some((language) => language.id === id)) {
        monaco.languages.register({ id });
    }
}

export function setupSyntaxHighlighting(monaco: any) {
    ensureLanguageRegistered(monaco, 'lua');
    ensureLanguageRegistered(monaco, 'python');

    if (!syntaxRegistered) {
        syntaxRegistered = true;

    monaco.languages.setMonarchTokensProvider('lua', {
        modules: ['ap', 'Sensors', 'Timer', 'Ledbar', 'camera', 'Gpio', 'Uart', 'Spi', 'mailbox'],
        methods: [
            'push', 'goToLocalPoint', 'goToPoint', 'updateYaw', 'lpsPosition', 'lpsVelocity', 'lpsYaw',
            'accel', 'gyro', 'orientation', 'range', 'battery', 'tof', 'altitude', 'rc', 'callLater',
            'callAt', 'callAtGlobal', 'new', 'set', 'start', 'stop', 'read', 'write', 'reset',
            'setFunction', 'bytesToRead', 'setBaudRate', 'exchange', 'connect', 'hasMessages',
            'myHullNumber', 'receive', 'send', 'setHullNumber', 'requestMakeShot', 'checkRequestShot',
            'requestRecordStart', 'requestRecordStop', 'checkRequestRecord', 'fromHSV', 'time',
            'deltaTime', 'launchTime', 'sleep', 'boardNumber'
        ],
        keywords: [
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in',
            'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while'
        ],
        tokenizer: {
            root: [
                // Constants
                [/\b(Ev)\.[A-Z_]+\b/, "constant"],
                [/\b(Ev)\b/, "constant"],

                // Comments
                [/--\[\[[\s\S]*?(?:\]\]|$)/, 'comment'],
                [/--.*$/, "comment"],

                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
                [/"([^"\\]|\\.)*"/, 'string'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*'/, 'string'],

                // Numbers
                [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
                [/\d+/, "number"],

                // Match a full Lua identifier before classifying it.
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@modules': 'keyword.class',
                        '@methods': 'function.call',
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }]
            ]
        }
    });

        monaco.languages.setLanguageConfiguration('lua', {
            comments: {
                lineComment: '--',
                blockComment: ['--[[', ']]']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ]
        });

    monaco.languages.setMonarchTokensProvider('python', {
        tokenizer: {
            root: [
                // Python keywords
                [/\b(from|import|as|class|def|return|if|elif|else|while|for|try|except|finally|with|yield|lambda|pass|break|continue|global|nonlocal|raise|True|False|None|and|or|not|in|is)\b/, "keyword"],
                
                // Pioneer SDK classes
                [/\b(Pioneer|Camera|VideoStream)\b/, "keyword.class"],

                // Common Pioneer SDK methods (minimal subset)
                [/\b(arm|disarm|takeoff|land|close_connection|go_to_local_point|go_to_local_point_body_fixed|point_reached|set_manual_speed|set_manual_speed_body_fixed|get_local_position_lps|get_dist_sensor_data|get_battery_status|get_autopilot_state|led_control|send_rc_channels|lua_script_control|connect|disconnect|connected|get_frame|get_cv_frame|start|stop|join|wait)\b/, "function.call"],

                // Python comments
                [/#.*$/, 'comment'],
                
                // Strings (single/double quotes + simple triple quotes)
                [/""".*?"""/, 'string'],
                [/'''[\s\S]*?'''/, 'string'],
                [/"([^"\\]|\\.)*"/, 'string'],
                [/'([^'\\]|\\.)*'/, 'string'],
                
                // Numbers
                [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
                [/\d+([eE][-+]?\d+)?/, "number"]
            ]
        }
    });

        monaco.languages.setLanguageConfiguration('python', {
            comments: {
                lineComment: '#'
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ]
        });
    }

    if (themeRegistered) {
        return;
    }
    themeRegistered = true;

    monaco.editor.defineTheme('pioneer-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'keyword.class', foreground: '1f2937', fontStyle: 'bold' },
            { token: 'function.call', foreground: 'ff6b00', fontStyle: 'bold' },
            { token: 'constant', foreground: '2563eb', fontStyle: 'bold' },
            { token: 'comment', foreground: '6b7280' },
            { token: 'string', foreground: 'b45309' },
            { token: 'number', foreground: '0f766e' },
            { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' }
        ],
        colors: {
            'editor.background': '#f4f5f7',
            'editor.foreground': '#151515',
            'editor.lineHighlightBackground': '#eceff3',
            'editorLineNumber.foreground': '#9ca3af',
            'editorLineNumber.activeForeground': '#151515',
            'editorCursor.foreground': '#ff6b00',
            'editor.selectionBackground': '#ffd7bd',
            'editor.inactiveSelectionBackground': '#f2e2d6'
        }
    });

    monaco.editor.defineTheme('pioneer-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword.class', foreground: 'cbd5f5', fontStyle: 'bold' },
            { token: 'function.call', foreground: 'ff9c53', fontStyle: 'bold' },
            { token: 'constant', foreground: '60a5fa', fontStyle: 'bold' },
            { token: 'comment', foreground: '94a3b8' },
            { token: 'string', foreground: 'fdba74' },
            { token: 'number', foreground: '5eead4' },
            { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' }
        ],
        colors: {
            'editor.background': '#0f172a',
            'editor.foreground': '#e5e7eb',
            'editor.lineHighlightBackground': '#172033',
            'editorLineNumber.foreground': '#64748b',
            'editorLineNumber.activeForeground': '#e5e7eb',
            'editorCursor.foreground': '#ff9c53',
            'editor.selectionBackground': '#7c2d1238',
            'editor.inactiveSelectionBackground': '#33415588'
        }
    });
}
