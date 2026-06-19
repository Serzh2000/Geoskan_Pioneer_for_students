import { DOC_OVERRIDES, GROUP_DESCRIPTIONS } from './metadata.js';
import type { AutopilotParameterDefinition, ValidationRule } from './types.js';

export function parseTemplate(text: string) {
    const values: Record<string, number> = {};
    const keys: string[] = [];
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0) return;
        const key = trimmed.slice(0, eqIndex).trim();
        const rawValue = trimmed.slice(eqIndex + 1).trim();
        const value = Number(rawValue);
        if (!Number.isFinite(value)) return;
        keys.push(key);
        values[key] = value;
    });
    return { values, keys };
}

function titleizeSegment(value: string) {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function describeFallback(group: string, key: string) {
    const groupDescription = GROUP_DESCRIPTIONS[group] || 'Параметр автопилота из загруженного профиля.';
    const shortKey = key.slice(group.length).replace(/^_/, '');
    const label = titleizeSegment(shortKey || key);
    return {
        description: `${label || key}. ${groupDescription}`,
        details: 'На указанной странице документации для этого параметра отдельное пояснение не приведено, поэтому используется описание по группе и ключу.',
        validation: {} as ValidationRule,
        source: 'template' as const
    };
}

export function buildDefinitions(templateText: string) {
    const parsed = parseTemplate(templateText);
    return parsed.keys.map((key) => {
        const defaultValue = parsed.values[key];
        const group = key.includes('_') ? key.split('_')[0] : 'General';
        const fallback = describeFallback(group, key);
        const override = DOC_OVERRIDES[key];
        const mergedValidation: ValidationRule = {
            ...(fallback.validation || {}),
            ...(override?.validation || {})
        };
        return {
            key,
            group,
            defaultValue,
            description: override?.description || fallback.description,
            details: override?.details || fallback.details,
            validation: mergedValidation,
            source: override?.source || fallback.source
        } satisfies AutopilotParameterDefinition;
    });
}
