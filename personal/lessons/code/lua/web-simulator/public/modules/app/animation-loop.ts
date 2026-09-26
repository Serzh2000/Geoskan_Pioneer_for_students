import { simSettings } from '../core/state.js';
import { updatePhysics } from '../physics/index.js';
import { PHYSICS_FIXED_DT } from '../physics/constants.js';
import { updateStats } from '../ui/panels/stats.js';
import { startBackgroundTicker, type BackgroundTicker } from '../shared/background-ticker.js';

type LoopCallbacks = {
    /** render = false: move the 3D models to the physics state without drawing. */
    updateDrone3D: (dt: number, render?: boolean) => void;
    is3DActive: () => boolean;
    /** While true, the fallback tick runs on a worker clock (see below). */
    keepPhysicsInBackground?: () => boolean;
};

// Кламп на «сырой» dt между кадрами — защита от одного огромного скачка
// (сворачивание вкладки, лаг вкладки браузера), а не от обычных просадок FPS.
// Было 0.1: на тяжёлой сцене меньше 10 FPS время симулятора (а с ним
// Timer.callLater и полёт по времени) шло медленнее настенного. 0.25 — ещё
// ниже RAF_STALL_THRESHOLD_MS: паузы длиннее догоняет резервный тик.
const MAX_FRAME_DT = 0.25;
// Худший случай — резервный тик: MAX_FALLBACK_DT=0.5 при max simSpeed=3, т.е.
// 1.5 / PHYSICS_FIXED_DT = 180 подшагов. Если кламп всё же сработал, лишнее
// время просто отбрасывается — лучше заметное временное замедление симуляции,
// чем спираль растущего отставания (аккумулятор «догоняет» всё большим числом шагов).
const MAX_PHYSICS_STEPS_PER_FRAME = 180;

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
// Шаг резервного тика: реально прошедшее время, но не больше 0.5с — ровно столько
// укладывается в MAX_PHYSICS_STEPS_PER_FRAME шагов. От воркера тики идут каждые
// ~50мс (физика в реальном времени); заторможенный таймер страницы (раз в
// секунду) даёт хотя бы половину скорости, а не 10%, как при старом клампе 0.1с.
const MAX_FALLBACK_DT = 0.5;

let animationFrameId = 0;
let backgroundTicker: BackgroundTicker | null = null;
let lastTime = 0;
/** performance.now() of the last real animation frame: tells whether rAF stalled. */
let lastRafAt = 0;
let physicsAccumulator = 0;
let fpsFrameCount = 0;
let fpsLastUpdate = 0;

function updateFpsCounter(time: number): void {
    fpsFrameCount += 1;
    if (!fpsLastUpdate) fpsLastUpdate = time;

    const elapsed = time - fpsLastUpdate;
    if (elapsed < 1000) return;

    const fps = Math.round((fpsFrameCount * 1000) / elapsed);
    const element = document.getElementById('scene-fps');
    if (element) element.textContent = `FPS: ${fps}`;
    fpsFrameCount = 0;
    fpsLastUpdate = time;
}

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
        if (time) lastRafAt = performance.now();
        updateFpsCounter(time);

        if (!lastTime) lastTime = time;
        // max(0): the fallback tick may have moved lastTime a hair past this frame.
        let rawDt = Math.max(0, (time - lastTime) / 1000);
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
    // рисуется, — сами продвигаем физику по настенному времени и переносим её
    // на 3D-модели. Рисовать сцену и статистику здесь не нужно — некому.
    const fallbackTick = () => {
        const now = performance.now();
        // A tab opened straight into the background never gets a rAF frame:
        // start the clock here instead of waiting for one forever.
        if (!lastTime) {
            lastTime = now;
            return;
        }
        // rAF alive - it drives physics itself.
        if (lastRafAt && now - lastRafAt < RAF_STALL_THRESHOLD_MS) return;
        // Stalled: every tick advances by the time that really passed.
        const rawDt = Math.min(Math.max(0, (now - lastTime) / 1000), MAX_FALLBACK_DT);
        lastTime = now;
        stepPhysics(rawDt);
        // The 3D models follow the physics even unseen: the drone camera (Python
        // Camera, external camera stream) rides on the model, and without this it
        // kept filming from where the drone stood when the tab went to the back.
        if (callbacks.is3DActive()) {
            callbacks.updateDrone3D(rawDt * simSettings.simSpeed, false);
        }
    };
    // Обычный таймер страницы в фоне Chrome душит примерно до раза в секунду
    // (а через 5 минут — до раза в минуту): физика шла бы рывками и вдвое
    // медленнее реального времени (шаг не больше MAX_FALLBACK_DT), а команды
    // попадали бы в один тик. Пока выполняется скрипт или дрон принимает внешние
    // команды (браузер позади IDLE и окна cv2), тот же тик идёт от таймера в
    // воркере, которого фоновое ограничение не касается. В простое лишний воркер ни к чему.
    const syncBackgroundTicker = () => {
        const wanted = Boolean(callbacks.keepPhysicsInBackground?.());
        if (wanted && !backgroundTicker) {
            backgroundTicker = startBackgroundTicker(FALLBACK_TICK_MS, fallbackTick);
        } else if (!wanted && backgroundTicker) {
            backgroundTicker.stop();
            backgroundTicker = null;
        }
    };
    // Switch right when a drone's external commands are allowed or forbidden: a
    // page timer in a background tab would notice it only a second later.
    window.addEventListener('external-drone-state-changed', syncBackgroundTicker);
    window.setInterval(() => {
        syncBackgroundTicker();
        fallbackTick();
    }, FALLBACK_TICK_MS);
}

export function getAnimationFrameId(): number {
    return animationFrameId;
}
