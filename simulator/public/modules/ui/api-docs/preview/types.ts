import * as THREE from 'three';

export type ApiPreviewScenario =
    | 'arm'
    | 'disarm'
    | 'takeoff'
    | 'land'
    | 'goto'
    | 'goto-body'
    | 'yaw'
    | 'manual'
    | 'fsm'
    | 'point-reached'
    | 'state';

export type ApiPreviewViewMode = 'angled' | 'topdown';

export type PreviewStatus = {
    title: string;
    detail: string;
    phase?: string;
};

export type ApiPreviewRenderContext = {
    drone: THREE.Group | null;
    targetMarker: THREE.Group | null;
    startMarker: THREE.Group | null;
    headingArrow: THREE.ArrowHelper | null;
    floorGlow: THREE.Mesh | null;
    pathLine: THREE.Line | null;
    guideLine: THREE.Line | null;
    resetScene: () => void;
    setViewMode: (mode: ApiPreviewViewMode) => void;
    setDronePose: (x: number, y: number, z: number, pitch: number, roll: number, yaw: number) => void;
    spinRotors: (speed: number, dt: number) => void;
    updatePathLine: (points: THREE.Vector3[]) => void;
    updateGuideLine: (points: THREE.Vector3[], line?: THREE.Line | null) => void;
    clamp: (value: number) => number;
    easeInOut: (value: number) => number;
};
