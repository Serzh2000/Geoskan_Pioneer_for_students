import { DOC_OVERRIDES, GROUP_DESCRIPTIONS } from './metadata.js';
import { parsePropertiesText } from './properties-parser.js';
import type { AutopilotParameterDefinition, ValidationRule } from './types.js';

export function parseTemplate(text: string) {
    const values: Record<string, number> = {};
    const keys: string[] = [];
    parsePropertiesText(text).entries.forEach((entry) => {
        if (entry.value === null) return;
        if (!(entry.key in values)) keys.push(entry.key);
        values[entry.key] = entry.value;
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

export function buildDefinition(key: string, defaultValue: number): AutopilotParameterDefinition {
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
    };
}

export function buildDefinitions(templateText: string) {
    const parsed = parseTemplate(templateText);
    return parsed.keys.map((key) => buildDefinition(key, parsed.values[key]));
}
