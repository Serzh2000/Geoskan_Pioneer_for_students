import {
    registerCreationBindings,
    registerGlobalActionBindings,
    registerIncidentBindings,
    registerSelectionBindings,
    registerTransformBindings
} from './bindings/actions.js';
import { registerAddFormBindings } from './bindings/add-form.js';
import type { BindingOptions } from './bindings/shared.js';

function registerTabBindings({ callbacks, elements, setActiveTab }: BindingOptions) {
    elements.hierarchyTabBtn?.addEventListener('click', () => {
        setActiveTab('hierarchy');
    });
    elements.inspectorTabBtn?.addEventListener('click', () => {
        if (!callbacks.sceneManager?.getSelectedId()) return;
        setActiveTab('inspector');
    });
}

export function registerSceneManagerBindings(options: BindingOptions) {
    registerTabBindings(options);
    registerAddFormBindings(options);
    registerIncidentBindings(options);
    registerCreationBindings(options);
    registerSelectionBindings(options);
    registerGlobalActionBindings(options);
    registerTransformBindings(options);
}
