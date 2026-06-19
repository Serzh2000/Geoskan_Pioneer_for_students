import type {
    AutopilotAuditEntry,
    AutopilotAuditSource,
    AutopilotAuditStatus,
    AutopilotSettingsState
} from './types.js';

export const MAX_AUDIT_ENTRIES = 1500;

export function safeAutopilotAuthor(author: string | null | undefined) {
    const normalized = String(author || '').trim();
    return normalized || 'Не указан';
}

export function appendAutopilotAuditEntry(state: AutopilotSettingsState, entry: AutopilotAuditEntry) {
    state.auditLog.unshift(entry);
    if (state.auditLog.length > MAX_AUDIT_ENTRIES) {
        state.auditLog.length = MAX_AUDIT_ENTRIES;
    }
}

export function createAutopilotAuditEntry(params: {
    parameterKey: string;
    author: string;
    previousValue: number | null;
    nextValue: number | null;
    status: AutopilotAuditStatus;
    source: AutopilotAuditSource;
    message: string;
}): AutopilotAuditEntry {
    return {
        id: `${params.parameterKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        parameterKey: params.parameterKey,
        author: safeAutopilotAuthor(params.author),
        previousValue: params.previousValue,
        nextValue: params.nextValue,
        status: params.status,
        source: params.source,
        message: params.message
    };
}
