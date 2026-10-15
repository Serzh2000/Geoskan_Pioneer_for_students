import { findCallContext } from '../public/modules/editor/monaco/completion/call-context.js';
import { getArgumentEntries, parseParameterRanges, resolveSignature } from '../public/modules/editor/monaco/completion/signature.js';
import { getLuaCompletionEntries, getPythonCompletionEntries } from '../public/modules/editor/monaco/completion.js';
import { formatEntryDocumentation } from '../public/modules/editor/monaco/completion/types.js';
import { extractLuaUserSymbols, extractPythonUserSymbols } from '../public/modules/editor/monaco/completion/user-symbols.js';

const labels = (entries: Array<{ label: string }>) => entries.map((entry) => entry.label);
const slices = (syntax: string) => parseParameterRanges(syntax).map(([from, to]) => syntax.slice(from, to));

describe('where the cursor is in a call', () => {
    test('finds the called name and the number of the argument', () => {
        expect(findCallContext('ap.goToLocalPoint(1, 2, ', 'lua')).toEqual({ callee: 'ap.goToLocalPoint', argIndex: 2 });
        expect(findCallContext('ap.push(', 'lua')).toEqual({ callee: 'ap.push', argIndex: 0 });
        expect(findCallContext('leds:set(0, ', 'lua')).toEqual({ callee: 'leds:set', argIndex: 1 });
    });

    test('counts only the commas of its own call: nested calls, tables and strings do not count', () => {
        expect(findCallContext('math.max(f(1, 2), ', 'lua')).toEqual({ callee: 'math.max', argIndex: 1 });
        expect(findCallContext('foo({1, 2, 3}, ', 'lua')).toEqual({ callee: 'foo', argIndex: 1 });
        expect(findCallContext('print("a, b, c", ', 'lua')).toEqual({ callee: 'print', argIndex: 1 });
        expect(findCallContext("print('it\\'s, fine', ", 'lua')).toEqual({ callee: 'print', argIndex: 1 });
    });

    test('is not in a call after the call is closed, in a declaration, in a string or in a comment', () => {
        expect(findCallContext('ap.push(Ev.MCE_TAKEOFF) ', 'lua')).toBeNull();
        expect(findCallContext('function go(a, ', 'lua')).toBeNull();
        expect(findCallContext('def go(a, ', 'python')).toBeNull();
        expect(findCallContext('print("open string', 'lua')).toBeNull();
        expect(findCallContext('ap.push( -- a comment', 'lua')).toBeNull();
        expect(findCallContext('if (x ', 'lua')).toBeNull();
    });

    test('reads Python the same way, with # comments', () => {
        expect(findCallContext('pioneer.go_to_local_point(x=1, ', 'python')).toEqual({ callee: 'pioneer.go_to_local_point', argIndex: 1 });
        expect(findCallContext('print(1) # note (\nprint(', 'python')).toEqual({ callee: 'print', argIndex: 0 });
    });
});

describe('the signature of a call', () => {
    test('marks every parameter of the call form, optional ones too', () => {
        expect(slices('ap.goToLocalPoint(x, y, z, [time])')).toEqual(['x', 'y', 'z', '[time]']);
        expect(slices('Timer.new(seconds, callback)')).toEqual(['seconds', 'callback']);
        expect(slices('math.pi')).toEqual([]);
        expect(slices('sleep(f(a, b), c)')).toEqual(['f(a, b)', 'c']);
    });

    test('finds the documentation of a variable through the type it was created as', () => {
        const script = 'local leds = Ledbar.new(29)\nleds:set(0, ';
        const signature = resolveSignature('lua', script, 'leds:set');
        expect(signature?.key).toBe('Ledbar:set');
        expect(signature?.parameters.length).toBeGreaterThanOrEqual(2);
    });

    test('finds Pioneer, standard library and global calls, and ignores unknown ones', () => {
        expect(resolveSignature('lua', '', 'ap.goToLocalPoint')?.parameters).toHaveLength(4);
        expect(resolveSignature('lua', '', 'math.floor')?.label).toBe('math.floor(число)');
        expect(resolveSignature('lua', '', 'print')?.key).toBe('print');
        expect(resolveSignature('lua', '', 'nothing.here')).toBeNull();
        expect(resolveSignature('python', 'pioneer = Pioneer()', 'pioneer.go_to_local_point')?.parameters.length).toBeGreaterThan(0);
        expect(resolveSignature('python', '', 'time.sleep')?.label).toBe('time.sleep(секунды)');
    });

    test('offers the event constants for the first argument of ap.push, and nothing for other calls', () => {
        const inPush = getArgumentEntries('lua', '', findCallContext('ap.push(', 'lua'));
        expect(labels(inPush)).toContain('Ev.MCE_TAKEOFF');
        // only the commands a program sends; what the autopilot reports back is not pushed
        expect(labels(inPush)).toEqual(expect.arrayContaining(['Ev.MCE_PREFLIGHT', 'Ev.MCE_TAKEOFF', 'Ev.MCE_LANDING']));
        expect(labels(inPush)).not.toContain('Ev.POINT_REACHED');
        expect(labels(inPush)).not.toContain('Ev.AHRS_ERROR');
        expect(getArgumentEntries('lua', '', findCallContext('print(', 'lua'))).toEqual([]);
        expect(getArgumentEntries('lua', '', findCallContext('ap.push(Ev.MCE_TAKEOFF, ', 'lua'))).toEqual([]);
    });
});

describe('Lua completion for a student', () => {
    const globalList = getLuaCompletionEntries('', '');

    test('offers the API, the standard library, templates and keywords', () => {
        const all = labels(globalList);
        for (const expected of ['ap', 'Timer', 'math', 'print', 'if', 'for', 'while', 'callback', 'end']) expect(all).toContain(expected);
    });

    test('puts what a student needs first: own names, then the core API, then the rest, templates and the library', () => {
        const sort = (label: string) => globalList.find((entry) => entry.label === label)?.sortText ?? '';
        expect(sort('ap')).toMatch(/^1_/);
        expect(sort('for')).toMatch(/^3_/);
        expect(sort('print')).toMatch(/^4_/);
        const own = getLuaCompletionEntries('local speed = 2\n', '').find((entry) => entry.label === 'speed');
        expect(own?.sortText).toMatch(/^0_/);
    });

    test('lets a student find a call by the Russian word for it', () => {
        const members = getLuaCompletionEntries('ap.', 'ap.');
        const goTo = members.find((entry) => entry.label === 'goToLocalPoint');
        expect(goTo?.filterText).toContain('лететь в точку');
        expect(goTo?.detail).toBe('ap.goToLocalPoint(x, y, z, [time])');
    });

    test('offers the members of the standard library', () => {
        const mathMembers = labels(getLuaCompletionEntries('math.', 'math.'));
        expect(mathMembers).toEqual(expect.arrayContaining(['floor', 'sin', 'cos', 'sqrt', 'pi', 'random']));
        expect(labels(getLuaCompletionEntries('table.', 'table.'))).toEqual(expect.arrayContaining(['insert', 'remove', 'unpack']));
    });

    test('offers the student own variables, functions and parameters, once, and does not shadow the API', () => {
        const script = ['local speed, height = 2, 1', 'function fly(a, b)', 'end', 'local ap = 5', 'for i = 1, 3 do', 'end', '-- local hidden = 1', ''].join('\n');
        const entries = getLuaCompletionEntries(script, '');
        const names = labels(entries);
        for (const expected of ['speed', 'height', 'fly', 'a', 'b', 'i']) expect(names).toContain(expected);
        expect(names).not.toContain('hidden');
        expect(names.filter((name) => name === 'ap')).toHaveLength(1);
        expect(entries.find((entry) => entry.label === 'fly')?.insertText).toBe('fly(${1:a}, ${2:b})');
    });

    test('after "event ==" offers only event constants', () => {
        const entries = getLuaCompletionEntries('function callback(event)\n  if event == ', '  if event == ');
        expect(entries.length).toBeGreaterThan(5);
        expect(entries.every((entry) => entry.label.startsWith('Ev.'))).toBe(true);
        // the events the autopilot reports, not the commands a program sends
        expect(labels(entries)).toContain('Ev.POINT_REACHED');
        expect(labels(entries)).not.toContain('Ev.MCE_TAKEOFF');
    });

    test('inside ap.push( puts the event constants on top of the list', () => {
        const entries = getLuaCompletionEntries('ap.push(', 'ap.push(');
        expect(entries[0].label).toMatch(/^Ev\./);
        expect(labels(entries)).toContain('Timer');
    });

    test('keeps the old exact lists for member access', () => {
        expect(labels(getLuaCompletionEntries('camera.', 'camera.'))).toEqual([
            'requestMakeShot',
            'checkRequestShot',
            'requestRecordStart',
            'requestRecordStop',
            'checkRequestRecord'
        ]);
    });
});

describe('Python completion for a student', () => {
    test('offers the SDK, the built-ins and the first templates', () => {
        const all = labels(getPythonCompletionEntries('', ''));
        for (const expected of ['pioneer', 'print', 'range', 'time', 'math', 'for', 'def', 'import-pioneer', 'import']) expect(all).toContain(expected);
    });

    test('offers the members of the modules a student reaches for', () => {
        expect(labels(getPythonCompletionEntries('time.', 'time.'))).toContain('sleep');
        expect(labels(getPythonCompletionEntries('math.', 'math.'))).toEqual(expect.arrayContaining(['sin', 'cos', 'pi', 'sqrt']));
    });

    test('offers the student own names', () => {
        const script = ['def fly(distance, height=1):', '    pass', 'for step in range(3):', '    pass', 'speed = 2', '# hidden = 3', ''].join('\n');
        const entries = getPythonCompletionEntries(script, '');
        const names = labels(entries);
        for (const expected of ['fly', 'distance', 'height', 'step', 'speed']) expect(names).toContain(expected);
        expect(names).not.toContain('hidden');
        expect(entries.find((entry) => entry.label === 'fly')?.insertText).toBe('fly(${1:distance}, ${2:height})');
    });
});

describe('the documentation card', () => {
    test('says what it does, the parameters, the result and shows a working example', () => {
        const entry = getLuaCompletionEntries('math.', 'math.').find((candidate) => candidate.label === 'floor')!;
        const markdown = formatEntryDocumentation(entry, 'lua');
        expect(markdown).toContain(entry.documentation);
        expect(markdown).toContain('**Параметры:**');
        expect(markdown).toContain('**Результат:**');
        expect(markdown).toContain('```lua\nprint(math.floor(2.9)) -- 2\n```');
    });

    test('skips what a template does not have', () => {
        const entry = getLuaCompletionEntries('', '').find((candidate) => candidate.label === 'if')!;
        expect(formatEntryDocumentation(entry, 'lua')).not.toContain('**Параметры:**');
    });
});

describe('own names are read from declarations only', () => {
    test('Lua', () => {
        expect(labels(extractLuaUserSymbols('local x = 1 -- local y = 2'))).toEqual(['x']);
        expect(labels(extractLuaUserSymbols('local function go(speed) end'))).toEqual(['go', 'speed']);
    });

    test('Python', () => {
        expect(labels(extractPythonUserSymbols('x = 1  # y = 2'))).toEqual(['x']);
        expect(labels(extractPythonUserSymbols('from pioneer_sdk import Pioneer, Camera'))).toEqual(['Pioneer', 'Camera']);
    });
});
