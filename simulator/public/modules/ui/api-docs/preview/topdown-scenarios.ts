import * as THREE from 'three';
import type { ApiPreviewRenderContext, PreviewStatus } from './types.js';
import { buildArcPoints, setFloorGlowOpacity, setMarkerScale } from './scenario-utils.js';

export function renderGoToScenario(
    ctx: ApiPreviewRenderContext,
    elapsed: number,
    dt: number,
    bodyFixed: boolean
): PreviewStatus {
    if (!ctx.targetMarker) {
        return { title: 'Полет к точке', detail: 'Маркер цели недоступен.' };
    }

    ctx.setViewMode('topdown');
    const cycle = elapsed % 6.6;
    const plan = ctx.easeInOut(ctx.clamp((cycle - 0.2) / 0.9));
    const move = ctx.easeInOut(ctx.clamp((cycle - 1.1) / 2.5));
    const arrive = ctx.easeInOut(ctx.clamp((cycle - 4.2) / 0.9));
    const hoverZ = 0.24;
    const bodyYaw = 0.88;
    const localTarget = new THREE.Vector3(0.52, 0.18, 0);
    const target = bodyFixed
        ? new THREE.Vector3(
            localTarget.x * Math.cos(bodyYaw) - localTarget.y * Math.sin(bodyYaw),
            localTarget.x * Math.sin(bodyYaw) + localTarget.y * Math.cos(bodyYaw),
            0
        )
        : new THREE.Vector3(0.58, 0.18, 0);
    const position = new THREE.Vector3(target.x * move, target.y * move, hoverZ);
    const yaw = bodyFixed ? bodyYaw : Math.atan2(target.y, target.x);

    setFloorGlowOpacity(ctx, 0.22);
    if (ctx.startMarker) {
        ctx.startMarker.visible = true;
    }
    ctx.targetMarker.visible = true;
    ctx.targetMarker.position.copy(target);
    setMarkerScale(ctx.targetMarker, 1.45 + arrive * 0.16 + Math.sin(elapsed * 8) * 0.04 * Math.max(arrive, 0.1));
    setMarkerScale(ctx.startMarker, 1.2 + Math.sin(elapsed * 6) * 0.04 * Math.max(0.2, 1 - move));
    ctx.setDronePose(position.x, position.y, position.z, 0, 0, yaw);
    ctx.spinRotors(22, dt);
    if (ctx.headingArrow) ctx.headingArrow.visible = true;
    ctx.updatePathLine([
        new THREE.Vector3(0, 0, 0.04),
        new THREE.Vector3(target.x * 0.45, target.y * 0.45, 0.04),
        new THREE.Vector3(target.x, target.y, 0.04)
    ]);
    ctx.updateGuideLine([
        new THREE.Vector3(position.x, position.y, 0.05),
        new THREE.Vector3(target.x, target.y, 0.05)
    ], ctx.guideLine);

    return {
        title: bodyFixed ? 'Полет в body-fixed точку' : 'Полет в локальную точку',
        detail: bodyFixed
            ? 'Вид сверху: цель задается в системе координат дрона, поэтому итоговая мировая траектория зависит от текущего курса аппарата.'
            : 'Вид сверху: метод ведет аппарат к координате в локальной системе сцены, сохраняя понятную геометрию маршрута.',
        phase: plan < 0.95 ? 'Фаза: расчет маршрута' : move < 0.95 ? 'Фаза: движение к цели' : 'Фаза: фиксация в точке'
    };
}

export function renderYawScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    ctx.setViewMode('topdown');
    const yaw = Math.sin(elapsed * 1.15) * 1.05;
    ctx.setDronePose(0, 0, 0.22, 0, 0, yaw);
    ctx.spinRotors(20, dt);
    setFloorGlowOpacity(ctx, 0.2);
    if (ctx.headingArrow) ctx.headingArrow.visible = true;
    ctx.updatePathLine(buildArcPoints(0.34, -1.15, 1.15));
    ctx.updateGuideLine([
        new THREE.Vector3(0, 0, 0.05),
        new THREE.Vector3(Math.cos(yaw) * 0.34, Math.sin(yaw) * 0.34, 0.05)
    ], ctx.guideLine);

    return {
        title: 'Изменение yaw: разворот по курсу',
        detail: 'Вид сверху лучше показывает смысл yaw: аппарат остается на месте, а меняется только азимут и направление носа.',
        phase: yaw >= 0 ? 'Фаза: поворот вправо' : 'Фаза: поворот влево'
    };
}

export function renderManualScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    ctx.setViewMode('topdown');
    const x = Math.sin(elapsed * 0.9) * 0.34;
    const y = Math.sin(elapsed * 1.8) * 0.18;
    const vx = Math.cos(elapsed * 0.9) * 0.31;
    const vy = Math.cos(elapsed * 1.8) * 0.32;
    const yaw = Math.atan2(vy, vx);
    ctx.setDronePose(x, y, 0.22, 0, 0, yaw);
    ctx.spinRotors(21, dt);
    setFloorGlowOpacity(ctx, 0.18);
    if (ctx.headingArrow) ctx.headingArrow.visible = true;
    ctx.updatePathLine([
        new THREE.Vector3(-0.42, 0, 0.04),
        new THREE.Vector3(-0.2, 0.18, 0.04),
        new THREE.Vector3(0, 0, 0.04),
        new THREE.Vector3(0.2, -0.18, 0.04),
        new THREE.Vector3(0.42, 0, 0.04)
    ]);
    ctx.updateGuideLine([
        new THREE.Vector3(x, y, 0.05),
        new THREE.Vector3(x + vx * 0.18, y + vy * 0.18, 0.05)
    ], ctx.guideLine);

    return {
        title: 'Manual speed: непрерывное управление скоростью',
        detail: 'Сценарий показывает не точку назначения, а вектор текущей скорости: команда должна обновляться постоянно, иначе траектория быстро устаревает.',
        phase: 'Фаза: управление по векторам скорости'
    };
}

export function renderPointReachedScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    if (!ctx.targetMarker) {
        return { title: 'Точка достигнута', detail: 'Маркер цели недоступен.' };
    }

    ctx.setViewMode('topdown');
    const target = new THREE.Vector3(0.5, 0.14, 0);
    const phase = elapsed % 6.4;
    const moveProgress = ctx.easeInOut(ctx.clamp((phase - 0.45) / 2.2));
    const reached = phase > 3.5;
    const x = target.x * moveProgress;
    const y = target.y * moveProgress;

    setFloorGlowOpacity(ctx, 0.22);
    if (ctx.startMarker) {
        ctx.startMarker.visible = true;
        setMarkerScale(ctx.startMarker, 1.2);
    }
    ctx.targetMarker.visible = true;
    ctx.targetMarker.position.copy(target);
    ctx.targetMarker.scale.setScalar(reached ? 1.52 + Math.sin(elapsed * 10) * 0.12 : 1.38);
    ctx.setDronePose(x, y, 0.22, 0, 0, 0.16);
    ctx.spinRotors(20, dt);
    if (ctx.headingArrow) ctx.headingArrow.visible = true;
    ctx.updatePathLine([
        new THREE.Vector3(0, 0, 0.04),
        new THREE.Vector3(target.x, target.y, 0.04)
    ]);
    ctx.updateGuideLine([
        new THREE.Vector3(x, y, 0.05),
        new THREE.Vector3(target.x, target.y, 0.05)
    ], ctx.guideLine);

    return {
        title: reached ? 'POINT_REACHED: цель достигнута' : 'Подлет к целевой точке',
        detail: reached
            ? 'После фактического достижения цели можно безопасно запускать следующий шаг сценария: например посадку или разворот.'
            : 'Вид сверху показывает, что `point_reached()` срабатывает не по таймеру, а после реального завершения движения к координате.',
        phase: reached ? 'Фаза: цель достигнута' : 'Фаза: приближение к цели'
    };
}
