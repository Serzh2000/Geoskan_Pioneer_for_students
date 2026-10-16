import { describe, expect, jest, test } from '@jest/globals';
import { describeLogEntry, formatJournalTime, isDefaultJournalLine } from '../public/modules/ui/panels/journal-lines.js';
import { extractTagAndMessage, resolveLogCategory } from '../public/modules/shared/logging/logger.js';

type Tone = 'info' | 'action' | 'warn' | 'error' | 'success';

function classify(raw: string, tone: Tone = 'info') {
    const parsed = extractTagAndMessage(raw);
    return describeLogEntry({ tag: parsed.tag, message: parsed.message, tone, category: resolveLogCategory(raw, parsed) });
}

describe('flight journal classification', () => {
    test('program output and autopilot events are visible by default', () => {
        expect(classify('[Lua print] hello')).toEqual({ kind: 'program', label: 'PRINT' });
        expect(classify('[Python local][drone_1] 42')).toEqual({ kind: 'program', label: 'PYTHON' });
        expect(classify('[Lua AP] ap.push(Ev.MCE_PREFLIGHT) - Команда добавлена в очередь; FSM=IDLE')).toEqual({ kind: 'flight', label: 'PREFLIGHT' });
        expect(classify('[Lua AP] ap.push(Ev.MCE_TAKEOFF) - Команда добавлена в очередь; FSM=PREFLIGHT').label).toBe('TAKEOFF');
        expect(classify('[Lua AP] ap.push(Ev.MCE_LANDING) - Команда добавлена в очередь; FSM=FLYING_HOVER').label).toBe('LAND');
        expect(classify('[Lua AP] ap.goToLocalPoint(1.00, 0.00, 1.00); FSM=FLYING_HOVER').label).toBe('POINT');
        expect(classify('Команда MCE: Взлет').label).toBe('TAKEOFF');
        expect(classify('Команда MCE: Посадка').label).toBe('LAND');
    });

    test('errors from any source are visible, crashes are named as such', () => {
        expect(classify('[3D-INIT] failed to start', 'error')).toEqual({ kind: 'error', label: 'ОШИБКА' });
        expect(classify('[Physics] Дрон drone_1 разбился: удар', 'error').label).toBe('АВАРИЯ');
        expect(classify('[Physics] Дрон drone_1 разбился: удар', 'warn')).toEqual({ kind: 'flight', label: 'АВАРИЯ' });
        expect(classify('[Battery] drone_1: низкий заряд АКБ (20%, 14 V).', 'warn')).toEqual({ kind: 'warning', label: 'ВНИМАНИЕ' });
    });

    test('browser diagnostics stay behind the system switch', () => {
        for (const raw of ['[3D-INIT] scene ready', '[3D-CLICK] document capture pointerdown', 'Opening panel: telemetry-panel',
            '[EDITOR] Monaco ready', 'Режим камеры: FREE', '[GUIDE] Workspace synchronized', '[Python] Рантайм готов.', '[Lua Timer] start()']) {
            expect(isDefaultJournalLine(classify(raw))).toBe(false);
        }
        expect(isDefaultJournalLine(classify('[SCENE] Нельзя удалить объект', 'warn'))).toBe(false);
    });
});

describe('flight journal time stamp', () => {
    test('prints flight seconds as mm:ss.t', () => {
        expect(formatJournalTime(3.2)).toBe('00:03.2');
        expect(formatJournalTime(0)).toBe('00:00.0');
        expect(formatJournalTime(75.96)).toBe('01:15.9');
        expect(formatJournalTime(undefined)).toBe('00:00.0');
        expect(formatJournalTime(Number.NaN)).toBe('00:00.0');
    });
});

describe('describeAutopilotState', () => {
    test('maps autopilot states to flight words and tones', async () => {
        const globals = globalThis as unknown as Record<string, unknown>;
        const originalDocument = globals.document;
        globals.document = { getElementById: () => null, visibilityState: 'visible' };
        // stats.ts only needs the drone registry; the real state module drags in the Lua runtime.
        jest.unstable_mockModule('../public/modules/core/state.js', () => ({ drones: {}, currentDroneId: 'drone_1', simSettings: {} }));
        jest.unstable_mockModule('../public/modules/scene/core/camera-mode-state.js', () => ({ getCameraMode: () => 'free' }));
        try {
            const { describeAutopilotState } = await import('../public/modules/ui/panels/stats.js');
            expect(describeAutopilotState('IDLE')).toEqual({ label: 'На земле', tone: 'plain' });
            expect(describeAutopilotState('PREFLIGHT')).toEqual({ label: 'Взвод', tone: 'warning' });
            expect(describeAutopilotState('TAKEOFF_PROCESS')).toEqual({ label: 'Взлёт', tone: 'accent' });
            expect(describeAutopilotState('FLYING_MOVING')).toEqual({ label: 'В полёте', tone: 'success' });
            expect(describeAutopilotState('FLYING_HOVER')).toEqual({ label: 'Висение', tone: 'success' });
            expect(describeAutopilotState('LANDING_PROCESS')).toEqual({ label: 'Посадка', tone: 'accent' });
            expect(describeAutopilotState('CRASHED')).toEqual({ label: 'Авария', tone: 'danger' });
            expect(describeAutopilotState('ОШИБКА')).toEqual({ label: 'Ошибка', tone: 'danger' });
            expect(describeAutopilotState('')).toEqual({ label: 'На земле', tone: 'plain' });
            expect(describeAutopilotState('СТРАННЫЙ').label).toBe('Странный');
        } finally {
            globals.document = originalDocument;
        }
    });
});
