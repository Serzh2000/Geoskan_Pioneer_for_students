import type { UICallbacks } from '../../index.js';
import type { SceneTypePreviewController } from '../type-preview.js';
import type { SceneManagerDomRefs, TransformMode } from '../types.js';
import type { SceneManagerTab, SceneTreeState } from '../view-state.js';

export type BindingOptions = {
    callbacks: UICallbacks;
    elements: SceneManagerDomRefs;
    tree: SceneTreeState;
    render: () => void;
    setActiveTab: (tab: SceneManagerTab) => void;
    setActiveTransformMode: (mode: TransformMode) => void;
    typePreview: SceneTypePreviewController;
};
