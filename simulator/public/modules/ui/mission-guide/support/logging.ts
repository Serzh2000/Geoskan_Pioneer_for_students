import { log } from '../../../shared/logging/logger.js';

type GuideLogLevel = 'info' | 'warn' | 'error' | 'success';

function normalizeDetailValue(value: unknown): string {
    if (value == null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => normalizeDetailValue(item)).join(', ');

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function formatCompactDetails(details: Record<string, unknown>): string {
    return Object.entries(details)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${normalizeDetailValue(value)}`)
        .join(' | ');
}

export function logGuideEvent(
    event: string,
    details: Record<string, unknown> = {},
    level: GuideLogLevel = 'info'
): void {
    const compactDetails = formatCompactDetails(details);
    const message = compactDetails
        ? `[GUIDE] ${event} | ${compactDetails}`
        : `[GUIDE] ${event}`;

    log(message, level);

    const consoleMethod =
        level === 'error'
            ? console.error
            : level === 'warn'
                ? console.warn
                : console.info;

    consoleMethod('[GUIDE]', event, details);
}

export function summarizeGuideDiagnostics(diagnostics: Array<{ kind: string; title: string }>): string[] {
    return diagnostics.map((diagnostic) => `${diagnostic.kind}:${diagnostic.title}`);
}
