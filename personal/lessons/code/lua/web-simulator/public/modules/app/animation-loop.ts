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

let animationFrameId = 0;
let lastTime = 0;
let physicsAccumulator = 0;

export function startAnimationLoop(callbacks: LoopCallbacks): void {
    const animate = (time: number) => {
        animationFrameId = requestAnimationFrame(animate);

        if (!lastTime) lastTime = time;
        let rawDt = (time - lastTime) / 1000;
        if (rawDt > MAX_FRAME_DT) rawDt = MAX_FRAME_DT;
        lastTime = time;

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

        if (callbacks.is3DActive()) {
            callbacks.updateDrone3D(scaledDt);
        }
        updateStats();
    };

    animate(0);
}

export function getAnimationFrameId(): number {
    return animationFrameId;
}
