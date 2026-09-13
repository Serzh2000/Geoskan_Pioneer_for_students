export {};

// NOTE: @types/three's real declaration for this module (extends `Controls`, not
// `Object3D`) already wins module resolution here — a full class redeclaration in
// this file does NOT override it. So we augment the real class via interface
// merging instead, just adding back the couple of legacy Object3D-era members this
// codebase still reads/writes (see public/modules/drone/index.ts, scene-init.ts,
// selection.ts, object-transform.ts). NOTE: per the installed three.js version's own
// source, `TransformControls` no longer extends Object3D at runtime either — its
// visual gizmo now lives behind `getHelper()` — so `.visible = x` here is likely
// already an inert no-op at runtime, independent of this type patch. That's a
// separate, pre-existing behavior question or the code should call
// `getHelper().visible = x` instead; this file only silences the type error.
declare module 'three/examples/jsm/controls/TransformControls.js' {
    interface TransformControls {
        visible: boolean;
    }
}

declare global {
    interface Window {
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
