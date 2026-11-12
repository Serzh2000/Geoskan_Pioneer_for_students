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
import { parsePropertiesText } from './properties-parser.js';
import { buildDefinition, buildDefinitions, parseTemplate } from './template.js';
import type {
    AutopilotImportResult,
    AutopilotParameterDefinition,
    AutopilotParameterUpdateResult
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

/** Добавляет в схему параметр, которого нет в загруженном шаблоне (профиль новее шаблона). */
function registerExtraDefinition(key: string, defaultValue: number) {
    if (autopilotDefinitionMap.has(key)) return;
    const definition = buildDefinition(key, defaultValue);
    autopilotParameterDefinitions = [...autopilotParameterDefinitions, definition];
    autopilotParameterKeys = [...autopilotParameterKeys, key];
    autopilotDefinitionMap.set(key, definition);
    templateDefaultValues[key] = defaultValue;
}

function saveState() {
    persistAutopilotState({
        storageKey: STORAGE_KEY,
        state: runtimeState,
        syncRuntimeValues: syncAutopilotRuntimeFromValues
    });
}

/** Жёсткая проверка: значение принципиально недопустимо (не число, не из списка допустимых). */
function validateHardConstraints(definition: AutopilotParameterDefinition, value: number): string | null {
    if (!Number.isFinite(value)) return 'Значение должно быть конечным числом.';
    if (definition.validation.allowedValues && !definition.validation.allowedValues.includes(value)) {
        return `Допустимые значения: ${definition.validation.allowedValues.join(', ')}.`;
    }
    return null;
}

function validateParameterValue(definition: AutopilotParameterDefinition, value: number): string | null {
    const hard = validateHardConstraints(definition, value);
    if (hard) return hard;
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
// Значения из localStorage могут содержать параметры вне встроенного шаблона (импорт более нового профиля).
Object.keys(runtimeState.values).forEach((key) => {
    const value = runtimeState.values[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
        registerExtraDefinition(key, value);
    } else {
        delete runtimeState.values[key];
    }
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
    const parsed = parsePropertiesText(text);
    const errors: string[] = [];
    const warnings: string[] = [];
    const accepted = new Map<string, { value: number; line: number }>();
    const duplicates: string[] = [];
    const rawExtras: Record<string, string> = {};
    const skipped: string[] = [];

    parsed.malformedLines.forEach(({ line, text: lineText }) => {
        warnings.push(`Строка ${line}: не распознана как key=value, пропущена («${lineText.slice(0, 40)}»).`);
    });

    parsed.entries.forEach((entry) => {
        if (entry.value === null) {
            // Нечисловое значение: схема его не знает — сохраняем как есть, в числовые параметры не попадает.
            if (entry.raw) rawExtras[entry.key] = entry.raw;
            skipped.push(entry.key);
            warnings.push(`Строка ${entry.line}: ${entry.key} — ${entry.error}; сохранено как текст без применения.`);
            return;
        }
        const definition = autopilotDefinitionMap.get(entry.key);
        if (definition) {
            const hardError = validateHardConstraints(definition, entry.value);
            if (hardError) {
                skipped.push(entry.key);
                warnings.push(`Строка ${entry.line}: ${entry.key} = ${entry.value} пропущен, оставлено текущее значение. ${hardError}`);
                return;
            }
            const rangeError = validateParameterValue(definition, entry.value);
            if (rangeError) {
                warnings.push(`Строка ${entry.line}: ${entry.key} = ${entry.value} вне рекомендуемого диапазона (${rangeError}) — значение применено.`);
            }
        }
        if (accepted.has(entry.key)) duplicates.push(entry.key);
        accepted.set(entry.key, { value: entry.value, line: entry.line });
    });

    // Файл отвергается только если в нём нет ни одного пригодного параметра.
    if (accepted.size === 0) {
        errors.push(skipped.length > 0
            ? 'В файле нет ни одного параметра с числовым значением, пригодным для применения.'
            : 'Файл не содержит ни одного параметра автопилота.');
        return { ok: false, errors, warnings, changedKeys: [], state: getAutopilotSettingsState() };
    }

    if (duplicates.length > 0) {
        warnings.push(`Повторяются параметры (${duplicates.length}), использовано последнее значение: ${duplicates.slice(0, 3).join(', ')}.`);
    }

    // Атомарное применение: схема и значения меняются только после успешного разбора всего файла.
    const newKeys = [...accepted.keys()].filter((key) => !autopilotDefinitionMap.has(key));
    newKeys.forEach((key) => registerExtraDefinition(key, accepted.get(key)!.value));
    if (newKeys.length > 0) {
        warnings.push(`Профиль новее текущего шаблона: добавлено новых параметров — ${newKeys.length}.`);
    }

    const missingKeys = autopilotParameterKeys.filter((key) => !accepted.has(key));
    if (missingKeys.length > 0) {
        warnings.push(`В файле отсутствует ${missingKeys.length} параметров, для них сохранены текущие значения.`);
    }

    const previousState = cloneAutopilotState(runtimeState);
    const nextValues = { ...runtimeState.values };
    const changedKeys: string[] = [];
    accepted.forEach(({ value }, key) => {
        if (previousState.values[key] !== value) changedKeys.push(key);
        nextValues[key] = value;
    });

    runtimeState.values = nextValues;
    runtimeState.rawExtras = { ...(runtimeState.rawExtras || {}), ...rawExtras };
    runtimeState.author = safeAutopilotAuthor(author);
    runtimeState.sourceFileName = fileName || 'Импортированный файл';
    runtimeState.importedAt = new Date().toISOString();
    runtimeState.updatedAt = runtimeState.importedAt;

    changedKeys.forEach((key) => {
        appendAutopilotAuditEntry(runtimeState, createAutopilotAuditEntry({
            parameterKey: key,
            author,
            previousValue: previousState.values[key] ?? null,
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
    const extras = Object.entries(runtimeState.rawExtras || {})
        .filter(([key]) => !autopilotDefinitionMap.has(key))
        .map(([key, raw]) => `${key}=${raw}`);
    return [header, ...lines, ...extras].join('\n');
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
