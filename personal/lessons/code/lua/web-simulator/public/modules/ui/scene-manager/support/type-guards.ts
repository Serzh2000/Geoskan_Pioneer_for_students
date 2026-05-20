export function isMarkerMapType(type: string) {
    return type === 'aruco-map' || type === 'apriltag-map';
}

export function isSingleMarkerType(type: string) {
    return type === 'aruco' || type === 'apriltag';
}

export function isBuildingType(type: string) {
    return type === 'building';
}

export function isValueInputType(type: string) {
    return isSingleMarkerType(type) || type === 'start-position' || type === 'building';
}
