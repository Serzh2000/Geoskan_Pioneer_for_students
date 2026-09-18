import { formatSceneNumber } from '../../support.js';
import type { SceneManagerDomRefs, SceneManagerEntry, TransformMode } from '../../types.js';

type TransformValues = {
    x: number;
    y: number;
    z: number;
};

export function getTransformValues(selected: SceneManagerEntry, mode: TransformMode): TransformValues {
    if (mode === 'rotate') return { x: selected.rotation.x * 180 / Math.PI, y: selected.rotation.y * 180 / Math.PI, z: selected.rotation.z * 180 / Math.PI };
    if (mode === 'scale') return selected.scale;
    return selected.position;
}

export function setTransformFields(
    elements: SceneManagerDomRefs,
    values?: TransformValues
) {
    const x = values ? formatSceneNumber(values.x) : '--';
    const y = values ? formatSceneNumber(values.y) : '--';
    const z = values ? formatSceneNumber(values.z) : '--';

    if (elements.transformXEl) elements.transformXEl.value = x;
    if (elements.transformYEl) elements.transformYEl.value = y;
    if (elements.transformZEl) elements.transformZEl.value = z;
}
