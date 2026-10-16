import type { MarkerMapOptions } from '../../../environment/obstacles.js';
import { parsePointsText } from '../../../scene/objects/object-catalog.js';
import type { SceneManagerDomRefs } from '../types.js';
import { readAddMarkerMapOptions } from './maps.js';
import { clampFloors } from './numbers.js';
import { isBuildingType, isMarkerMapType, isSingleMarkerType, isValueInputType } from './type-guards.js';

export type AddSceneObjectDraft = {
    type: string;
    options: {
        value?: string;
        markerDictionary?: string;
        pointsText?: string;
        floors?: number;
        markerMap?: MarkerMapOptions;
    };
};

export function readAddSceneObjectDraft(elements: SceneManagerDomRefs): AddSceneObjectDraft {
    const type = elements.addTypeEl?.value || '';
    const isBuilding = isBuildingType(type);
    const needsValueInput = isValueInputType(type);
    const pointsText = elements.addPointsEl?.value.trim() || undefined;
    const parsedPoints = pointsText ? parsePointsText(pointsText) : [];

    return {
        type,
        options: {
            markerDictionary: (isSingleMarkerType(type) || isMarkerMapType(type))
                ? elements.addDictionaryEl?.value || undefined
                : undefined,
            value: isBuilding
                ? elements.addBuildingIncidentsEl?.value.trim() || undefined
                : needsValueInput
                    ? elements.addValueEl?.value.trim() || undefined
                    : undefined,
            pointsText: parsedPoints.length ? pointsText : undefined,
            floors: isBuilding ? clampFloors(elements.addFloorsEl?.value, 9) : undefined,
            markerMap: isMarkerMapType(type) ? readAddMarkerMapOptions(elements) : undefined
        }
    };
}
