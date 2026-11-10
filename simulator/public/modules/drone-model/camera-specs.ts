import type * as THREE from 'three';

/*
 * Камеры Пионера Базового. Угол обзора, формат кадра и порог узнавания маркера зависят от того, какая камера
 * физически стоит на дроне:
 *
 *  - SDK1 (pioneer_sdk): камера модуля ESP32 - OV2640. В примерах Геоскан камера описана как 640x480 с фокусом
 *    600 px (examples/python/advanced_navigation/camera_params_yaml.yaml): 56,1° по горизонтали и 43,6° по вертикали,
 *    это то же, что 68° по диагонали у стандартного объектива OV2640 (описания модулей: 66-68°).
 *  - SDK2 (pioneer_sdk2, нужна Radxa Zero 3W): камера Radxa Camera 8M 219 (IMX219). Паспорт Radxa: 74° по диагонали,
 *    62° по горизонтали, 49° по вертикали, кадр 4:3, ТВ-дисторсия -0,3% (то есть почти без искажений). Стоит на
 *    кронштейне модуля и смотрит вниз; передней камеры у такой сборки нет.
 *
 * У three.js fov - угол по вертикали, поэтому здесь vfov. Мини 2 эти значения не затрагивают.
 */

export type CameraSpec = {
    name: string;
    /** Угол обзора по вертикали, градусы. */
    vfov: number;
    /** Размер кадра, который получает Python, пиксели. */
    width: number;
    height: number;
    /** Самая короткая сторона маркера в кадре, при которой cv2.aruco его ещё находит. */
    minMarkerPx: number;
};

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export const OV2640_SPEC: CameraSpec = {
    name: 'OV2640 (модуль ESP32)',
    vfov: toDegrees(2 * Math.atan(240 / 600)),
    width: 640,
    height: 480,
    minMarkerPx: 20
};

export const RADXA_8M_219_SPEC: CameraSpec = {
    name: 'Radxa Camera 8M 219',
    vfov: 49,
    width: 640,
    height: 480,
    minMarkerPx: 20
};

/** Кадр, если у камеры своего формата нет (прежнее поведение: Мини 2 и нижняя камера Базового). */
export const DEFAULT_CAPTURE_SIZE = { width: 640, height: 360 } as const;

export function horizontalFov(vfov: number, aspect: number): number {
    return toDegrees(2 * Math.atan(Math.tan((vfov * Math.PI) / 360) * aspect));
}

/** Ставит угол обзора и формат кадра камеры по паспорту; захват и поиск маркеров читают их из userData. */
export function applyCameraSpec(camera: THREE.PerspectiveCamera, spec: CameraSpec): void {
    camera.fov = spec.vfov;
    camera.aspect = spec.width / spec.height;
    camera.userData.capture = { width: spec.width, height: spec.height };
    camera.userData.minMarkerPx = spec.minMarkerPx;
    camera.userData.cameraName = spec.name;
    camera.updateProjectionMatrix();
}

export function captureSizeOf(camera: THREE.PerspectiveCamera): { width: number; height: number } {
    const capture = camera.userData.capture as { width: number; height: number } | undefined;
    return capture ?? DEFAULT_CAPTURE_SIZE;
}
