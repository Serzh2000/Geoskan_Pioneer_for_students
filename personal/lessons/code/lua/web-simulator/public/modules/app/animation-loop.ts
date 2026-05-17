import { simSettings } from '../core/state.js';
import { updatePhysics } from '../physics/index.js';
import { updateRcInputRuntime } from '../ui/settings/runtime.js';
import { updateStats } from '../ui/panels/stats.js';

type LoopCallbacks = {
    updateDrone3D: (dt: number) => void;
    is3DActive: () => boolean;
};

let animationFrameId = 0;
let lastTime = 0;

export function startAnimationLoop(callbacks: LoopCallbacks): void {
    const animate = (time: number) => {
        animationFrameId = requestAnimationFrame(animate);

        if (!lastTime) lastTime = time;
        let dt = (time - lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        lastTime = time;

        dt *= simSettings.simSpeed;

        updateRcInputRuntime();
        updatePhysics(dt);
        if (callbacks.is3DActive()) {
            callbacks.updateDrone3D(dt);
        }
        updateStats();
    };

    animate(0);
}

export function getAnimationFrameId(): number {
    return animationFrameId;
}
