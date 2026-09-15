import { simSettings } from '../core/state.js';
import { updatePhysics } from '../physics/index.js';
import { PHYSICS_FIXED_DT } from '../physics/constants.js';
import { updateStats } from '../ui/panels/stats.js';

type LoopCallbacks = {
    updateDrone3D: (dt: number) => void;
    is3DActive: () => boolean;
};

// Кламп на «сырой» dt между кадрами — защита от одного огромного скачка
// (сворачивание вкладки, лаг вкладки браузера), а не от обычных просадок FPS.
const MAX_FRAME_DT = 0.1;
// При max simSpeed=3 и MAX_FRAME_DT=0.1 худший случай — 0.3с симулированного
// времени за кадр, т.е. 0.3 / PHYSICS_FIXED_DT = 36 подшагов. Берём кламп с
// запасом: если он всё же сработал, лишнее время просто отбрасывается —
// лучше заметное временное замедление симуляции, чем спираль растущего
// отставания (аккумулятор пытается «догнать» всё большим числом шагов).
const MAX_PHYSICS_STEPS_PER_FRAME = 60;

// rAF не тикает, пока вкладка не рисуется по-настоящему — не только когда она
// свёрнута/в другой вкладке, но и когда просто перекрыта другим окном
// (compositor occlusion). Именно так выглядит типовой сценарий внешнего
// Python-моста (см. docs/debug/idle-bridge-sync.md и коммит a4fe823): ученик
// смотрит в окно cv2.imshow поверх браузера, а не в саму вкладку —
// document.visibilityState при этом остаётся "visible", это не обычное
// сворачивание. Без физики, продолжающей тикать в этот момент, время дрона
// застывает на весь такой период: arm()/takeoff(), разнесённые секундами
// реального времени, физически попадают в один и тот же "тик" симулятора, и
// рантайм считает их одновременными командами (ровно баг, исправленный в
// a4fe823 для команд — здесь та же причина, но для самой физики).
const FALLBACK_TICK_MS = 50;
// С запасом над обычным интервалом между кадрами rAF (60Гц ~16мс, но кадр
// может законно просесть при реальной нагрузке) — иначе резервный тик
// срабатывал бы и во время нормальной работы, задваивая шаг физики.
const RAF_STALL_THRESHOLD_MS = 250;

let animationFrameId = 0;
let lastTime = 0;
let physicsAccumulator = 0;

function stepPhysics(rawDt: number): void {
    const scaledDt = rawDt * simSettings.simSpeed;

    physicsAccumulator += scaledDt;
    let steps = 0;
    while (physicsAccumulator >= PHYSICS_FIXED_DT && steps < MAX_PHYSICS_STEPS_PER_FRAME) {
        updatePhysics(PHYSICS_FIXED_DT);
        physicsAccumulator -= PHYSICS_FIXED_DT;
        steps++;
    }
    if (steps >= MAX_PHYSICS_STEPS_PER_FRAME) {
        physicsAccumulator = 0;
    }
}

export function startAnimationLoop(callbacks: LoopCallbacks): void {
    const animate = (time: number) => {
        animationFrameId = requestAnimationFrame(animate);

        if (!lastTime) lastTime = time;
        let rawDt = (time - lastTime) / 1000;
        if (rawDt > MAX_FRAME_DT) rawDt = MAX_FRAME_DT;
        lastTime = time;

        stepPhysics(rawDt);

        if (callbacks.is3DActive()) {
            callbacks.updateDrone3D(rawDt * simSettings.simSpeed);
        }
        updateStats();
    };

    animate(0);

    // Резервный тик: если rAF не отмечался дольше порога — вкладка не
    // рисуется, — сами продвигаем физику по настенному времени. Рендер и
    // статистику здесь намеренно не трогаем: рисовать всё равно некому, нужно
    // только не дать застыть симулированному времени дрона.
    window.setInterval(() => {
        const now = performance.now();
        if (!lastTime || now - lastTime < RAF_STALL_THRESHOLD_MS) return;
        const rawDt = Math.min((now - lastTime) / 1000, MAX_FRAME_DT);
        lastTime = now;
        stepPhysics(rawDt);
    }, FALLBACK_TICK_MS);
}

export function getAnimationFrameId(): number {
    return animationFrameId;
}
