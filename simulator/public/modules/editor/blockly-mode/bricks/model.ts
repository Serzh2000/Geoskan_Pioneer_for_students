/*
 * Какая модель дрона сейчас в редакторе. Состояние симулятора (core/state.ts) тянет за собой
 * fengari и DOM, поэтому здесь только переключатель: редактор регистрирует источник модели при
 * старте (editor/index/api.ts), а тесты и генератор кода обходятся без него.
 */
export type BlocklyModelProvider = () => string | null | undefined;

let provider: BlocklyModelProvider = () => null;

export const MINI2_MODEL_ID = 'pioneer-mini2';

export function setBlocklyModelProvider(next: BlocklyModelProvider): void {
    provider = next;
}

/** Id модели дрона, чей workspace показан в редакторе блоков. */
export function currentBlocklyModelId(): string | null {
    return provider() ?? null;
}

/** У Мини 2 блоки Bricks, у остальных моделей - общий набор pioneer_*. */
export function isBricksModelActive(): boolean {
    return provider() === MINI2_MODEL_ID;
}

/** Суффикс ключа хранения workspace: у Базового ключ прежний, у Мини 2 свой. */
export function blocklyStateKeySuffix(model: string | null | undefined): string {
    return model === MINI2_MODEL_ID ? ':bricks' : '';
}
