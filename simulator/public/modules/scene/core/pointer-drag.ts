/** One captured pointer owns a drag; losing that pointer always ends the gesture. */
export class PointerDragSession {
    private pointerId: number | null = null;
    private button = -1;
    private previous = { x: 0, y: 0 };

    private readonly end = (event: Event) => {
        if ((event as PointerEvent).pointerId === this.pointerId) this.cancel();
    };
    private readonly blur = () => this.cancel();
    private readonly visibility = () => {
        if (document.hidden) this.cancel();
    };

    constructor(private readonly element: HTMLElement) {
        element.addEventListener('lostpointercapture', this.end);
        window.addEventListener('pointerup', this.end, true);
        window.addEventListener('pointercancel', this.end, true);
        window.addEventListener('blur', this.blur);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.visibility);
    }

    start(event: PointerEvent): boolean {
        if (this.pointerId !== null || !this.element.isConnected) return false;
        this.pointerId = event.pointerId;
        this.button = event.button;
        this.previous = { x: event.clientX, y: event.clientY };
        try {
            this.element.setPointerCapture(event.pointerId);
        } catch {
            this.cancel();
            return false;
        }
        return true;
    }

    move(event: PointerEvent): { x: number; y: number; button: number } | null {
        if (event.pointerId !== this.pointerId) return null;
        const mask = this.button === 2 ? 2 : this.button === 1 ? 4 : 1;
        if (!this.element.isConnected || !(event.buttons & mask)) {
            this.cancel();
            return null;
        }
        const delta = {
            x: event.clientX - this.previous.x,
            y: event.clientY - this.previous.y,
            button: this.button
        };
        this.previous = { x: event.clientX, y: event.clientY };
        return delta;
    }

    cancel(): void {
        const pointerId = this.pointerId;
        this.pointerId = null;
        this.button = -1;
        if (pointerId !== null && this.element.hasPointerCapture(pointerId)) {
            this.element.releasePointerCapture(pointerId);
        }
    }

    dispose(): void {
        this.cancel();
        this.element.removeEventListener('lostpointercapture', this.end);
        window.removeEventListener('pointerup', this.end, true);
        window.removeEventListener('pointercancel', this.end, true);
        window.removeEventListener('blur', this.blur);
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.visibility);
    }
}
