import type { AutopilotSettingsState } from './types.js';

export function cloneAutopilotState(state: AutopilotSettingsState): AutopilotSettingsState {
    return {
        values: { ...state.values },
        author: state.author,
        sourceFileName: state.sourceFileName,
        importedAt: state.importedAt,
        updatedAt: state.updatedAt,
        auditLog: [...state.auditLog]
    };
}

export function createInitialAutopilotState(templateDefaultValues: Record<string, number>, templateSourceFileName: string): AutopilotSettingsState {
    return {
        values: { ...templateDefaultValues },
        author: 'Локальный пользователь',
        sourceFileName: templateSourceFileName,
        importedAt: null,
        updatedAt: new Date().toISOString(),
        auditLog: []
    };
}

export function loadAutopilotState(params: {
    maxAuditEntries: number;
    safeAuthor: (author: string | null | undefined) => string;
    storageKey: string;
    templateDefaultValues: Record<string, number>;
    templateSourceFileName: string;
}): AutopilotSettingsState {
    if (typeof localStorage === 'undefined') {
        return createInitialAutopilotState(params.templateDefaultValues, params.templateSourceFileName);
    }
    try {
        const raw = localStorage.getItem(params.storageKey);
        if (!raw) {
            return createInitialAutopilotState(params.templateDefaultValues, params.templateSourceFileName);
        }
        const parsed = JSON.parse(raw) as Partial<AutopilotSettingsState>;
        return {
            values: { ...params.templateDefaultValues, ...(parsed.values || {}) },
            author: params.safeAuthor(parsed.author),
            sourceFileName: parsed.sourceFileName || 'Локальное хранилище',
            importedAt: parsed.importedAt || null,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog.slice(0, params.maxAuditEntries) : []
        };
    } catch (error) {
        console.warn('[Autopilot Params] Failed to load state:', error);
        return createInitialAutopilotState(params.templateDefaultValues, params.templateSourceFileName);
    }
}

export function persistAutopilotState(params: {
    storageKey: string;
    state: AutopilotSettingsState;
    syncRuntimeValues: (values: Record<string, number>) => void;
}) {
    params.syncRuntimeValues(params.state.values);
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(params.storageKey, JSON.stringify(params.state));
}
