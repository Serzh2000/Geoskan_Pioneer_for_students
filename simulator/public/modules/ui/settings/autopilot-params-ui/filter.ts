import type { AutopilotParameterDefinition, AutopilotSettingsState } from '../autopilot-params-model.js';
import { isParameterChanged } from './helpers.js';
import type { DraftState, FilterMode } from './types.js';

/** Какие параметры показать при данном поиске и фильтре (по имени, группе, описанию и текущему значению). */
export function filterDefinitions(params: {
    definitions: AutopilotParameterDefinition[];
    state: AutopilotSettingsState;
    drafts: Map<string, DraftState>;
    normalizedSearch: string;
    activeFilter: FilterMode;
}) {
    const { state, drafts, normalizedSearch, activeFilter } = params;
    return params.definitions.filter((definition) => {
        const currentValue = drafts.get(definition.key)?.value ?? String(state.values[definition.key] ?? definition.defaultValue);
        const haystack = [definition.key, definition.group, definition.description, definition.details, currentValue].join(' ').toLowerCase();
        if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
        if (activeFilter === 'documented') return definition.source !== 'template';
        if (activeFilter === 'changed') return isParameterChanged(state.values[definition.key], definition.defaultValue);
        if (activeFilter === 'invalid') return Boolean(drafts.get(definition.key)?.error);
        return true;
    });
}
