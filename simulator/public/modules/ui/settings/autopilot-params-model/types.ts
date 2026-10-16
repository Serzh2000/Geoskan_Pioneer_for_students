export type ValidationRule = {
    min?: number;
    max?: number;
    allowedValues?: number[];
    recommended?: string;
    unit?: string;
};

export type AutopilotParameterDefinition = {
    key: string;
    group: string;
    defaultValue: number;
    description: string;
    details: string;
    validation: ValidationRule;
    source: 'documentation' | 'template';
};

export type AutopilotAuditStatus = 'applied' | 'rejected';
export type AutopilotAuditSource = 'manual' | 'file-import' | 'reset';

export type AutopilotAuditEntry = {
    id: string;
    timestamp: string;
    parameterKey: string;
    author: string;
    previousValue: number | null;
    nextValue: number | null;
    status: AutopilotAuditStatus;
    source: AutopilotAuditSource;
    message: string;
};

export type AutopilotSettingsState = {
    values: Record<string, number>;
    author: string;
    sourceFileName: string | null;
    importedAt: string | null;
    updatedAt: string;
    auditLog: AutopilotAuditEntry[];
};

export type AutopilotParameterUpdateResult = {
    ok: boolean;
    error: string | null;
    state: AutopilotSettingsState;
};

export type AutopilotImportResult = {
    ok: boolean;
    errors: string[];
    warnings: string[];
    changedKeys: string[];
    state: AutopilotSettingsState;
};
