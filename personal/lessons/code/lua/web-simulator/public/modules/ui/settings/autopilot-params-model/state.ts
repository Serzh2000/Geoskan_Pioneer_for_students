import { syncAutopilotRuntimeFromValues } from '../../../autopilot/params-runtime.js';
import {
    appendAutopilotAuditEntry,
    createAutopilotAuditEntry,
    MAX_AUDIT_ENTRIES,
    safeAutopilotAuthor
} from './audit.js';
import { DEFAULT_TEMPLATE_PROPERTIES } from './default-template.js';
import {
    cloneAutopilotState,
    loadAutopilotState,
    persistAutopilotState
} from './storage.js';
import { buildDefinitions, parseTemplate } from './template.js';
import type {
    AutopilotImportResult,
    AutopilotParameterDefinition,
    AutopilotParameterUpdateResult,
    AutopilotSettingsState
} from './types.js';

const STORAGE_KEY = 'geoskan_autopilot_parameters_v1';

let autopilotTemplateText = DEFAULT_TEMPLATE_PROPERTIES;
let templateSourceFileName = 'Встроенный шаблон';
let autopilotParameterDefinitions = buildDefinitions(autopilotTemplateText);
let autopilotParameterKeys = autopilotParameterDefinitions.map((definition) => definition.key);
let autopilotDefinitionMap = new Map(autopilotParameterDefinitions.map((definition) => [definition.key, definition]));
let templateDefaultValues = Object.fromEntries(
    autopilotParameterDefinitions.map((definition) => [definition.key, definition.defaultValue])
) as Record<string, number>;

function refreshTemplate(templateText: string, sourceFileName = 'Встроенный шаблон') {
    autopilotTemplateText = templateText;
    templateSourceFileName = sourceFileName;
    autopilotParameterDefinitions = buildDefinitions(templateText);
    autopilotParameterKeys = autopilotParameterDefinitions.map((definition) => definition.key);
    autopilotDefinitionMap = new Map(autopilotParameterDefinitions.map((definition) => [definition.key, definition]));
    templateDefaultValues = Object.fromEntries(
        autopilotParameterDefinitions.map((definition) => [definition.key, definition.defaultValue])
    ) as Record<string, number>;
}

function saveState() {
    persistAutopilotState({
        storageKey: STORAGE_KEY,
        state: runtimeState,
        syncRuntimeValues: syncAutopilotRuntimeFromValues
    });
}

function validateParameterValue(definition: AutopilotParameterDefinition, value: number): string | null {
    if (!Number.isFinite(value)) return 'Значение должно быть конечным числом.';
    if (definition.validation.allowedValues && !definition.validation.allowedValues.includes(value)) {
        return `Допустимые значения: ${definition.validation.allowedValues.join(', ')}.`;
    }
    if (typeof definition.validation.min === 'number' && value < definition.validation.min) {
        return `Значение не должно быть меньше ${definition.validation.min}.`;
    }
    if (typeof definition.validation.max === 'number' && value > definition.validation.max) {
        return `Значение не должно быть больше ${definition.validation.max}.`;
    }
    return null;
}

let runtimeState = loadAutopilotState({
    maxAuditEntries: MAX_AUDIT_ENTRIES,
    safeAuthor: safeAutopilotAuthor,
    storageKey: STORAGE_KEY,
    templateDefaultValues,
    templateSourceFileName
});
syncAutopilotRuntimeFromValues(runtimeState.values);

export function getAutopilotSettingsState() {
    return cloneAutopilotState(runtimeState);
}

export function loadAutopilotTemplateFromText(text: string, sourceFileName: string) {
    const parsed = parseTemplate(text);
    if (parsed.keys.length === 0) {
        throw new Error('Файл не содержит параметров автопилота.');
    }

    refreshTemplate(text, sourceFileName);
    runtimeState = {
        values: { ...templateDefaultValues, ...parsed.values },
        author: runtimeState.author,
        sourceFileName: sourceFileName || templateSourceFileName,
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditLog: runtimeState.auditLog
    };
    saveState();
    return getAutopilotSettingsState();
}

export function getAutopilotParameterDefinitions() {
    return autopilotParameterDefinitions;
}

export function listAutopilotGroups() {
    return Array.from(new Set(autopilotParameterDefinitions.map((definition) => definition.group)));
}

export function updateAutopilotAuthor(author: string) {
    runtimeState.author = safeAutopilotAuthor(author);
    runtimeState.updatedAt = new Date().toISOString();
    saveState();
    return getAutopilotSettingsState();
}

export function updateAutopilotParameter(parameterKey: string, rawValue: string, author: string): AutopilotParameterUpdateResult {
    const definition = autopilotDefinitionMap.get(parameterKey);
    if (!definition) {
        return { ok: false, error: `Неизвестный параметр: ${parameterKey}.`, state: getAutopilotSettingsState() };
    }

    const trimmed = rawValue.trim();
    const nextValue = Number(trimmed);
    if (!trimmed) {
        const error = 'Введите числовое значение.';
        appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
            parameterKey,
            author,
            previousValue: runtimeState.values[parameterKey],
            nextValue: null,
            status: 'rejected',
            source: 'manual',
            message: error
        }));
        saveState();
        return { ok: false, error, state: getAutopilotSettingsState() };
    }

    const validationError = validateParameterValue(definition, nextValue);
    if (validationError) {
        appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
            parameterKey,
            author,
            previousValue: runtimeState.values[parameterKey],
            nextValue,
            status: 'rejected',
            source: 'manual',
            message: validationError
        }));
        saveState();
        return { ok: false, error: validationError, state: getAutopilotSettingsState() };
    }

    const previousValue = runtimeState.values[parameterKey];
    runtimeState.values[parameterKey] = nextValue;
    runtimeState.author = safeAutopilotAuthor(author);
    runtimeState.updatedAt = new Date().toISOString();
    appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
        parameterKey,
        author,
        previousValue,
        nextValue,
        status: 'applied',
        source: 'manual',
        message: 'Параметр успешно применен в локальном состоянии симулятора.'
    }));
    saveState();
    return { ok: true, error: null, state: getAutopilotSettingsState() };
}

export function importAutopilotProperties(text: string, fileName: string, author: string): AutopilotImportResult {
    const nextValues = { ...runtimeState.values };
    const errors: string[] = [];
    const warnings: string[] = [];
    const changedKeys: string[] = [];
    const seen = new Set<string>();

    text.split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0) {
            errors.push(`Строка ${index + 1}: ожидался формат key=value.`);
            return;
        }
        const key = trimmed.slice(0, eqIndex).trim();
        const rawValue = trimmed.slice(eqIndex + 1).trim();
        const definition = autopilotDefinitionMap.get(key);
        if (!definition) {
            errors.push(`Строка ${index + 1}: неизвестный параметр ${key}.`);
            return;
        }
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            errors.push(`Строка ${index + 1}: значение ${rawValue} не является числом.`);
            return;
        }
        const validationError = validateParameterValue(definition, numericValue);
        if (validationError) {
            errors.push(`Строка ${index + 1}: ${key} -> ${validationError}`);
            return;
        }
        if (seen.has(key)) {
            warnings.push(`Строка ${index + 1}: параметр ${key} встретился повторно, использовано последнее значение.`);
        }
        seen.add(key);
        if (nextValues[key] !== numericValue) {
            changedKeys.push(key);
        }
        nextValues[key] = numericValue;
    });

    if (seen.size === 0) {
        errors.push('Файл не содержит ни одного параметра автопилота.');
    }

    const missingKeys = autopilotParameterKeys.filter((key) => !seen.has(key));
    if (missingKeys.length > 0) {
        warnings.push(`В файле отсутствует ${missingKeys.length} параметров. Для них сохранены текущие значения.`);
    }

    if (errors.length > 0) {
        return { ok: false, errors, warnings, changedKeys: [], state: getAutopilotSettingsState() };
    }

    const previousState = cloneAutopilotState(runtimeState);
    runtimeState.values = nextValues;
    runtimeState.author = safeAutopilotAuthor(author);
    runtimeState.sourceFileName = fileName || 'Импортированный файл';
    runtimeState.importedAt = new Date().toISOString();
    runtimeState.updatedAt = runtimeState.importedAt;

    changedKeys.forEach((key) => {
        appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
            parameterKey: key,
            author,
            previousValue: previousState.values[key],
            nextValue: nextValues[key],
            status: 'applied',
            source: 'file-import',
            message: `Параметр обновлен при импорте файла ${runtimeState.sourceFileName}.`
        }));
    });

    saveState();
    return { ok: true, errors: [], warnings, changedKeys, state: getAutopilotSettingsState() };
}

export function resetAutopilotParameters(author: string) {
    const previousValues = { ...runtimeState.values };
    const changedKeys = autopilotParameterKeys.filter((key) => runtimeState.values[key] !== templateDefaultValues[key]);
    runtimeState.values = { ...templateDefaultValues };
    runtimeState.author = safeAutopilotAuthor(author);
    runtimeState.sourceFileName = templateSourceFileName;
    runtimeState.importedAt = null;
    runtimeState.updatedAt = new Date().toISOString();

    changedKeys.forEach((key) => {
        appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
            parameterKey: key,
            author,
            previousValue: previousValues[key],
            nextValue: templateDefaultValues[key],
            status: 'applied',
            source: 'reset',
            message: 'Параметр сброшен к шаблонному значению.'
        }));
    });

    saveState();
    return getAutopilotSettingsState();
}

export function clearAutopilotAuditLog() {
    runtimeState.auditLog = [];
    runtimeState.updatedAt = new Date().toISOString();
    saveState();
    return getAutopilotSettingsState();
}

export function exportAutopilotPropertiesText() {
    const header = `# ${new Date().toISOString()}`;
    const lines = autopilotParameterDefinitions.map((definition) => `${definition.key}=${runtimeState.values[definition.key]}`);
    return [header, ...lines].join('\n');
}

export function getAutopilotValidationSummary() {
    let documented = 0;
    let constrained = 0;
    autopilotParameterDefinitions.forEach((definition) => {
        if (definition.source === 'documentation') documented++;
        if (
            typeof definition.validation.min === 'number'
            || typeof definition.validation.max === 'number'
            || Array.isArray(definition.validation.allowedValues)
        ) {
            constrained++;
        }
    });
    return { total: autopilotParameterDefinitions.length, documented, constrained };
}
