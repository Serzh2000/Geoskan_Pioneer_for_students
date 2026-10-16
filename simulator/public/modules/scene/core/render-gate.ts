/*
 * Lets a full-window overlay that hides the 3D scene (the controller wizard draws its own opaque stage) stop the main
 * canvas from being drawn. The scene keeps being updated - physics, drone models, cameras - only the draw is skipped,
 * so nothing is lost; the first frame after the release is the live scene again. Holds are counted: two overlays on
 * top of each other release independently.
 */
let holds = 0;

/** Stops drawing the main scene until the returned function is called (calling it twice is harmless). */
export function holdSceneRendering(): () => void {
    holds += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        holds = Math.max(0, holds - 1);
    };
}

export function isSceneRenderingHeld(): boolean {
    return holds > 0;
}
