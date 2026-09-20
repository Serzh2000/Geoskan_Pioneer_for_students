import { registerSceneExperience } from './experience.js';
import {
    registerCreationBindings,
    registerGlobalActionBindings,
    registerIncidentBindings,
    registerSelectionBindings,
    registerTransformBindings
} from './bindings/actions.js';
import { registerAddFormBindings } from './bindings/add-form.js';
import { registerSceneIoBindings } from './bindings/scene-io.js';
import type { BindingOptions } from './bindings/shared.js';

function registerTabBindings({ callbacks, elements, setActiveTab }: BindingOptions) {
    elements.hierarchyTabBtn?.addEventListener('click', () => {
        setActiveTab('hierarchy');
    });
    elements.rootEl?.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-scene-browse]')) setActiveTab('hierarchy');
        if (target.closest('#scene-open-properties')) {
            setActiveTab('inspector');
            document.getElementById('scene-tab-inspector')?.focus();
        }
    });
    elements.tabsEl?.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const inspector = event.key === 'End' || (event.key !== 'Home' && document.activeElement === elements.hierarchyTabBtn);
        setActiveTab(inspector ? 'inspector' : 'hierarchy');
        (inspector ? elements.inspectorTabBtn : elements.hierarchyTabBtn)?.focus();
    });
    elements.inspectorTabBtn?.addEventListener('click', () => {
        setActiveTab('inspector');
    });
}

function registerTreeBindings({ elements, tree, render }: BindingOptions) {
    const applyQuery = (value: string) => {
        tree.query = value;
        elements.treeFilterClearBtn?.classList.toggle('is-visible', !!value.trim());
        render();
    };

    elements.treeFilterEl?.addEventListener('input', (event) => {
        applyQuery((event.target as HTMLInputElement).value);
    });
    elements.treeFilterEl?.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !elements.treeFilterEl?.value) return;
        event.stopPropagation();
        elements.treeFilterEl.value = '';
        applyQuery('');
    });
    elements.treeFilterClearBtn?.addEventListener('click', () => {
        if (elements.treeFilterEl) elements.treeFilterEl.value = '';
        applyQuery('');
        elements.treeFilterEl?.focus();
    });
    elements.treeCollapseBtn?.addEventListener('click', () => {
        tree.expandedIds.clear();
        render();
    });
}

export function registerSceneManagerBindings(options: BindingOptions) {
    registerTabBindings(options);
    registerTreeBindings(options);
    registerAddFormBindings(options);
    registerSceneIoBindings(options);
    registerIncidentBindings(options);
    registerCreationBindings(options);
    registerSelectionBindings(options);
    registerGlobalActionBindings(options);
    registerTransformBindings(options);
    registerSceneExperience(options);
}
