import { Blockly, type BlocklyNS } from '../blockly-mode/loader.js';

export const BOUNDED_METRICS_MANAGER = 'PioneerBoundedMetricsManager';

type Region = BlocklyNS.MetricsManager.ContainerRegion;

// Обычный Blockly даёт увести программу за край области блоков — под рубрикатор
// (тулбокс) или за границу окна, и найти её потом можно только по полосам прокрутки.
// Здесь область прокрутки такая, что программа остаётся целиком на виду, пока
// помещается в окне. Если она больше окна, прокручивается от края до края.
function boundedRange(viewStart: number, viewSize: number, contentStart: number, contentSize: number): [number, number] {
    // Где может стоять левый (верхний) край окна, чтобы программа не уходила за него.
    const fitsLow = contentStart + contentSize - viewSize;
    const fitsHigh = contentStart;
    const low = Math.min(fitsLow, fitsHigh);
    const high = Math.max(fitsLow, fitsHigh);
    // Окно уже может стоять вне диапазона (программу только что подгрузили) — не прячем его.
    return [Math.min(low, viewStart), Math.max(high, viewStart) + viewSize];
}

export function registerBoundedMetricsManager(): void {
    if (Blockly.registry.hasItem(Blockly.registry.Type.METRICS_MANAGER, BOUNDED_METRICS_MANAGER)) return;

    class BoundedMetricsManager extends Blockly.MetricsManager {
        protected override getPaddedContent_(view: Region, content: Region) {
            const [left, right] = boundedRange(view.left, view.width, content.left, content.width);
            const [top, bottom] = boundedRange(view.top, view.height, content.top, content.height);
            return { top, bottom, left, right };
        }
    }

    Blockly.registry.register(Blockly.registry.Type.METRICS_MANAGER, BOUNDED_METRICS_MANAGER, BoundedMetricsManager);
}
