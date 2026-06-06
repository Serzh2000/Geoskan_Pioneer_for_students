/**
 * Общие типы для уведомлений о проблемах запуска и выполнения скриптов.
 * Держит только контракты без UI-логики и анализа ошибок.
 */
export type ScriptFailureKind = 'syntax' | 'runtime';

export type ScriptFailureError = Error & {
    scriptFailureKind?: ScriptFailureKind;
    scriptFailureLine?: number | null;
    scriptFailureColumn?: number | null;
    scriptFailureDetails?: string | null;
    scriptFailurePhase?: string | null;
    scriptFailureStack?: string | null;
    scriptFailureContextLines?: string[] | null;
    scriptFailureFsmHistory?: string[] | null;
};

export type HumanizedScriptFailure = {
    summary: string;
    details?: string | null;
    rawDetails?: string | null;
    suppressTechnicalDetails?: boolean;
};

export type NoticeSuppressionState = {
    simultaneousCommands: boolean;
    earlyRoute: boolean;
};

export type ScenarioValidationResult = {
    issues: string[];
    blockingIssues: string[];
    shouldBlock: boolean;
};
