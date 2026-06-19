export {};

declare module 'three/examples/jsm/controls/OrbitControls.js' {
    import { Camera, MOUSE, TOUCH, Vector3 } from 'three';
    export class OrbitControls {
        constructor(object: Camera, domElement?: HTMLElement);
        object: Camera;
        domElement: HTMLElement | HTMLDocument;
        enabled: boolean;
        target: Vector3;
        minDistance: number;
        maxDistance: number;
        minZoom: number;
        maxZoom: number;
        minPolarAngle: number;
        maxPolarAngle: number;
        minAzimuthAngle: number;
        maxAzimuthAngle: number;
        enableDamping: boolean;
        dampingFactor: number;
        enableZoom: boolean;
        zoomSpeed: number;
        enableRotate: boolean;
        rotateSpeed: number;
        enablePan: boolean;
        panSpeed: number;
        screenSpacePanning: boolean;
        keyPanSpeed: number;
        autoRotate: boolean;
        autoRotateSpeed: number;
        enableKeys: boolean;
        keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
        mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
        touches: { ONE: TOUCH; TWO: TOUCH };
        update(): boolean;
        saveState(): void;
        reset(): void;
        dispose(): void;
        getPolarAngle(): number;
        getAzimuthalAngle(): number;
        addEventListener(type: string, listener: (event: any) => void): void;
        hasEventListener(type: string, listener: (event: any) => void): boolean;
        removeEventListener(type: string, listener: (event: any) => void): void;
        dispatchEvent(event: { type: string; target: any }): void;
    }
}

declare module 'three/examples/jsm/controls/TransformControls.js' {
    import { Camera, Object3D, MOUSE } from 'three';
    export class TransformControls extends Object3D {
        constructor(camera: Camera, domElement?: HTMLElement);
        domElement: HTMLElement;
        camera: Camera;
        object: Object3D | undefined;
        enabled: boolean;
        axis: string | null;
        mode: 'translate' | 'rotate' | 'scale';
        translationSnap: number | null;
        rotationSnap: number | null;
        scaleSnap: number | null;
        space: 'world' | 'local';
        size: number;
        dragging: boolean;
        showX: boolean;
        showY: boolean;
        showZ: boolean;
        isTransformControls: boolean;
        mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
        attach(object: Object3D): this;
        detach(): this;
        getMode(): 'translate' | 'rotate' | 'scale';
        setMode(mode: 'translate' | 'rotate' | 'scale'): void;
        setTranslationSnap(translationSnap: number | null): void;
        setRotationSnap(rotationSnap: number | null): void;
        setScaleSnap(scaleSnap: number | null): void;
        setSize(size: number): void;
        setSpace(space: 'world' | 'local'): void;
        reset(): void;
        dispose(): void;
        addEventListener(type: string, listener: (event: any) => void): void;
        hasEventListener(type: string, listener: (event: any) => void): boolean;
        removeEventListener(type: string, listener: (event: any) => void): void;
        dispatchEvent(event: { type: string; target: any }): void;
    }
}

declare global {
    interface Window {
        fengari: any;
        THREE: typeof import('three');
        OrbitControls: any;
        TransformControls: any;
        scene: THREE.Scene;
        droneMesh: THREE.Group;
        
        // Lua callbacks
        js_ap_push: (L: any) => number;
        js_ap_goToPoint: (L: any) => number;
        js_ap_goToLocalPoint: (L: any) => number;
        js_ap_updateYaw: (L: any) => number;
        
        js_sensors_pos: (L: any) => number;
        js_sensors_vel: (L: any) => number;
        js_sensors_accel: (L: any) => number;
        js_sensors_gyro: (L: any) => number;
        js_sensors_orientation: (L: any) => number;
        js_sensors_range: (L: any) => number;
        js_sensors_battery: (L: any) => number;
        js_sensors_tof: (L: any) => number;
        
        js_timer_callLater: (L: any) => number;
        js_timer_new: (L: any) => number;
        
        js_camera_requestMakeShot: (L: any) => number;
        js_camera_checkRequestShot: (L: any) => number;
        js_camera_requestRecordStart: (L: any) => number;
        js_camera_requestRecordStop: (L: any) => number;
        js_camera_checkRequestRecord: (L: any) => number;
        
        js_gpio_new: (L: any) => number;
        js_uart_new: (L: any) => number;
        js_spi_new: (L: any) => number;
        
        js_sys_time: (L: any) => number;
        js_sys_deltaTime: (L: any) => number;
        
        js_ledbar_fromHSV: (L: any) => number;
        js_ledbar_set: (L: any) => number;
        js_init_leds: (L: any) => number;
        js_sleep: (L: any) => number;

        // UI & Camera
        fpvCamera: THREE.PerspectiveCamera;
        cameraMode: string;
        setCameraMode: (mode: string) => void;
        switchTab: (tabId: string) => void;
        getEditorValueFallback: () => string;
        setEditorValueFallback: (val: string) => void;
        showContextMenu: (
            x: number,
            y: number,
            onTransform: (mode: string) => void,
            onDelete: () => void,
            onDuplicate: () => void,
            onShowCoords?: () => void,
            onResetOrigin?: () => void,
            objectInfoTitle?: string,
            objectInfoItems?: { title?: string; text: string }[],
            objectActionsTitle?: string,
            objectActions?: { label: string; icon: string; action: () => void; active?: boolean; danger?: boolean }[]
        ) => void;
        hideContextMenu: () => void;
    }
}
