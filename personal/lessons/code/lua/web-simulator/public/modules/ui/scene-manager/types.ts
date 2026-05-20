import type { UICallbacks } from '../index.js';

export type SceneManagerEntry = ReturnType<NonNullable<UICallbacks['sceneManager']>['list']>[number];
export type TransformMode = 'translate' | 'rotate' | 'scale';
