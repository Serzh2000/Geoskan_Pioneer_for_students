import * as THREE from 'three';
import type {
    ApiPreviewRenderContext,
    ApiPreviewScenario,
    PreviewStatus
} from './types.js';
import { setFloorGlowOpacity, setMarkerScale } from './scenario-utils.js';
import {
    renderGoToScenario,
    renderManualScenario,
    renderPointReachedScenario,
    renderYawScenario
} from './topdown-scenarios.js';

function renderArmScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    const cycle = elapsed % 4.6;
    const spinUp = ctx.easeInOut(ctx.clamp((cycle - 0.25) / 1.25));
    const armed = cycle >= 1.5;
    const rotorSpeed = 4 + spinUp * 22;
    const vibration = Math.sin(elapsed * 24) * 0.003 * spinUp;
    ctx.setDronePose(vibration, -vibration, 0.02, 0.015 * spinUp, -0.015 * spinUp, 0);
    ctx.spinRotors(rotorSpeed, dt);
    setFloorGlowOpacity(ctx, 0.18 + spinUp * 0.28);
    setMarkerScale(ctx.startMarker, armed ? 1.08 + Math.sin(elapsed * 7) * 0.04 : 1);

    return {
        title: armed ? 'Arm: система готова к взлету' : 'Arm: раскрутка моторов',
        detail: 'Команда arm переводит автопилот в состояние готовности: тяга появляется, но аппарат еще остается на площадке.',
        phase: armed ? 'Фаза: ARM / готовность' : 'Фаза: spin-up моторов'
    };
}

function renderDisarmScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    const cycle = elapsed % 4.4;
    const spinDown = 1 - ctx.easeInOut(ctx.clamp((cycle - 0.3) / 1.5));
    const rotorSpeed = Math.max(0, 3 + spinDown * 21);
    const vibration = Math.sin(elapsed * 18) * 0.003 * spinDown;
    ctx.setDronePose(vibration, vibration, 0.02, 0.01 * spinDown, -0.01 * spinDown, 0);
    ctx.spinRotors(rotorSpeed, dt);
    setFloorGlowOpacity(ctx, 0.14 + spinDown * 0.24);
    setMarkerScale(ctx.startMarker, 1 + spinDown * 0.06);

    return {
        title: spinDown > 0.18 ? 'Disarm: сброс тяги' : 'Disarm: моторы остановлены',
        detail: 'Команда disarm завершает активный режим автопилота после посадки и постепенно убирает обороты винтов до нуля.',
        phase: spinDown > 0.18 ? 'Фаза: снижение оборотов' : 'Фаза: безопасное отключение'
    };
}

function renderTakeoffScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    const cycle = elapsed % 5.8;
    const spinUp = ctx.easeInOut(ctx.clamp((cycle - 0.15) / 0.8));
    const lift = ctx.easeInOut(ctx.clamp((cycle - 1) / 1.9));
    const settle = ctx.easeInOut(ctx.clamp((cycle - 3.4) / 1.2));
    const altitude = 0.02 + lift * 0.46 + Math.sin(elapsed * 4.6) * 0.01 * settle;
    const pitch = lift > 0.1 ? -0.05 : 0;
    ctx.setDronePose(0, 0, altitude, pitch, 0, 0);
    ctx.spinRotors(7 + spinUp * 8 + lift * 15, dt);
    setFloorGlowOpacity(ctx, 0.18 + spinUp * 0.22);
    setMarkerScale(ctx.startMarker, 1 + Math.sin(elapsed * 6) * 0.05 * Math.max(spinUp, 0.2));
    ctx.updateGuideLine([
        new THREE.Vector3(0, 0, 0.02),
        new THREE.Vector3(0, 0, 0.48)
    ], ctx.guideLine);

    return {
        title: lift < 0.06 ? 'Takeoff: подготовка к отрыву' : settle < 0.15 ? 'Takeoff: набор высоты' : 'Takeoff: выход в зависание',
        detail: 'Взлет состоит из подготовки, вертикального подъема и короткой стабилизации в hover перед следующим этапом миссии.',
        phase: lift < 0.06 ? 'Фаза: pre-takeoff' : settle < 0.15 ? 'Фаза: вертикальный подъем' : 'Фаза: стабилизация hover'
    };
}

function renderLandScenario(ctx: ApiPreviewRenderContext, elapsed: number, dt: number): PreviewStatus {
    const cycle = elapsed % 5.8;
    const descent = 1 - ctx.easeInOut(ctx.clamp((cycle - 0.55) / 2));
    const touchdown = ctx.easeInOut(ctx.clamp((cycle - 3.4) / 1.2));
    const altitude = 0.02 + descent * 0.46;
    ctx.setDronePose(0, 0, altitude, 0.04 * descent, 0, 0);
    ctx.spinRotors(6 + descent * 16 - touchdown * 5, dt);
    setFloorGlowOpacity(ctx, 0.16 + descent * 0.18);
    ctx.updateGuideLine([
        new THREE.Vector3(0, 0, 0.48),
        new THREE.Vector3(0, 0, 0.02)
    ], ctx.guideLine);

    return {
        title: descent > 0.28 ? 'Land: контролируемое снижение' : 'Land: касание и остановка',
        detail: 'Посадка показывает обратную последовательность: плавное снижение, касание площадки и затем завершение активного полетного режима.',
        phase: descent > 0.28 ? 'Фаза: снижение' : 'Фаза: touchdown'
    };
}

function renderFsmScenario(
    ctx: ApiPreviewRenderContext,
    elapsed: number,
    dt: number,
    compact: boolean
): PreviewStatus {
    if (ctx.startMarker) {
        ctx.startMarker.visible = false;
    }

    const cycle = elapsed % 8.2;
    let detail = 'Конечный автомат разрешает только те команды, которые соответствуют текущему состоянию дрона.';
    let altitude = 0.02;
    let x = 0;
    let y = 0;
    let pitch = 0;
    let roll = 0;
    let yaw = 0;
    let rotorSpeed = 0;
    let status: PreviewStatus;

    if (cycle < 1.3) {
        status = {
            title: 'IDLE: дрон на земле',
            detail,
            phase: 'Фаза: IDLE'
        };
    } else if (cycle < 2.6) {
        detail = 'На этом этапе автопилот раскручивает моторы и готовит аппарат к взлету.';
        rotorSpeed = 11;
        setFloorGlowOpacity(ctx, 0.22);
        status = {
            title: 'PREFLIGHT: предполетная подготовка',
            detail,
            phase: 'Фаза: PREFLIGHT'
        };
    } else if (cycle < 4) {
        const lift = ctx.easeInOut((cycle - 2.6) / 1.4);
        detail = 'После разрешенной команды взлета автомат переводит дрон из земли в устойчивое зависание.';
        altitude = 0.02 + lift * 0.35;
        pitch = -0.05;
        rotorSpeed = 15 + lift * 8;
        setFloorGlowOpacity(ctx, 0.25);
        ctx.updateGuideLine([
            new THREE.Vector3(0, 0, 0.02),
            new THREE.Vector3(0, 0, 0.38)
        ], ctx.guideLine);
        status = {
            title: 'TAKEOFF_PROCESS: набор высоты',
            detail,
            phase: 'Фаза: TAKEOFF_PROCESS'
        };
    } else if (cycle < 5.4) {
        detail = 'В воздухе уже можно переходить к командам движения или разворота.';
        altitude = 0.37;
        rotorSpeed = 21;
        status = {
            title: compact ? 'FLYING_HOVER: состояние автопилота' : 'FLYING_HOVER: зависание',
            detail,
            phase: 'Фаза: FLYING_HOVER'
        };
    } else if (cycle < 7) {
        const travel = ctx.easeInOut((cycle - 5.4) / 1.6);
        detail = 'Именно здесь команды полета к точке допустимы и соответствуют состоянию конечного автомата.';
        altitude = 0.37;
        x = 0.45 * travel;
        y = 0.16 * travel;
        pitch = -0.16;
        roll = 0.08;
        yaw = 0.18;
        rotorSpeed = 22;
        if (ctx.headingArrow) ctx.headingArrow.visible = true;
        if (ctx.targetMarker) {
            ctx.targetMarker.visible = true;
            ctx.targetMarker.position.set(0.45, 0.16, 0);
            ctx.targetMarker.scale.setScalar(1.02 + Math.sin(elapsed * 8) * 0.02);
        }
        ctx.updatePathLine([
            new THREE.Vector3(0, 0, 0.37),
            new THREE.Vector3(x, y, 0.37)
        ]);
        ctx.updateGuideLine([
            new THREE.Vector3(x, y, 0.37),
            new THREE.Vector3(0.45, 0.16, 0.37)
        ]);
        status = {
            title: 'FLYING_MOVING: полет к точке',
            detail,
            phase: 'Фаза: FLYING_MOVING'
        };
    } else {
        const landProgress = ctx.easeInOut((cycle - 7) / 1.2);
        detail = 'Только после воздушных состояний команда посадки считается корректным переходом автомата.';
        x = 0.45;
        y = 0.16;
        altitude = 0.37 - landProgress * 0.35;
        pitch = 0.04;
        yaw = 0.18;
        rotorSpeed = 18 - landProgress * 10;
        setFloorGlowOpacity(ctx, 0.18);
        if (ctx.targetMarker) {
            ctx.targetMarker.visible = true;
            ctx.targetMarker.position.set(0.45, 0.16, 0);
            ctx.targetMarker.scale.setScalar(1.04);
        }
        ctx.updatePathLine([
            new THREE.Vector3(0, 0, 0.37),
            new THREE.Vector3(0.45, 0.16, 0.37)
        ]);
        ctx.updateGuideLine([
            new THREE.Vector3(0.45, 0.16, 0.37),
            new THREE.Vector3(0.45, 0.16, 0.02)
        ], ctx.guideLine);
        status = {
            title: 'LANDING_PROCESS: снижение и посадка',
            detail,
            phase: 'Фаза: LANDING_PROCESS'
        };
    }

    ctx.setDronePose(x, y, altitude, pitch, roll, yaw);
    ctx.spinRotors(rotorSpeed, dt);
    return status;
}

export function renderPreviewScenario(
    ctx: ApiPreviewRenderContext,
    scenario: ApiPreviewScenario,
    elapsed: number,
    dt: number
): PreviewStatus {
    ctx.resetScene();

    switch (scenario) {
        case 'arm':
            return renderArmScenario(ctx, elapsed, dt);
        case 'disarm':
            return renderDisarmScenario(ctx, elapsed, dt);
        case 'takeoff':
            return renderTakeoffScenario(ctx, elapsed, dt);
        case 'land':
            return renderLandScenario(ctx, elapsed, dt);
        case 'goto':
            return renderGoToScenario(ctx, elapsed, dt, false);
        case 'goto-body':
            return renderGoToScenario(ctx, elapsed, dt, true);
        case 'yaw':
            return renderYawScenario(ctx, elapsed, dt);
        case 'manual':
            return renderManualScenario(ctx, elapsed, dt);
        case 'point-reached':
            return renderPointReachedScenario(ctx, elapsed, dt);
        case 'state':
            return renderFsmScenario(ctx, elapsed, dt, true);
        case 'fsm':
        default:
            return renderFsmScenario(ctx, elapsed, dt, false);
    }
}
