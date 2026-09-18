import * as THREE from 'three';

export type ScenePathPoint = { x: number; y: number; z: number };

export type MarkerMapTraversal = 'row-major' | 'column-major';
export type MarkerMapStartCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type MarkerMapAnchor = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'start';

export interface MarkerMapOptions {
    rows?: number;
    columns?: number;
    startId?: number;
    idStep?: number;
    markerSize?: number;
    gapX?: number;
    gapY?: number;
    traversal?: MarkerMapTraversal;
    startCorner?: MarkerMapStartCorner;
    anchor?: MarkerMapAnchor;
    snake?: boolean;
    rotationDeg?: number;
}

export interface SceneObjectOptions {
    value?: string;
    markerDictionary?: string;
    points?: ScenePathPoint[];
    closed?: boolean;
    floors?: number;
    roadWidth?: number;
    markerMap?: MarkerMapOptions;
}
