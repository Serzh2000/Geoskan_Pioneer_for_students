import type * as Blockly from 'blockly';

// Единый набор блоков дрона (см. docs/blockly-unification-plan.md, §4.1):
// один Blockly.Blocks[type], но генератор кода свой для каждого таргета.
export type PioneerTarget = 'lua' | 'python';

export type PioneerBlockGenerator = (
    block: Blockly.Block,
    gen: Blockly.CodeGenerator
) => string | [string, number];

export type PioneerBlockCategory = 'program' | 'flight' | 'time' | 'leds' | 'sensors' | 'events';

export type PioneerBlockSpec = {
    type: `pioneer_${string}`;
    category: PioneerBlockCategory;
    // Только внешний вид и типы входов/выходов — код генерируют targets.*.
    init: (this: Blockly.Block) => void;
    targets: Partial<Record<PioneerTarget, PioneerBlockGenerator>>;
    // Имена API, которые генератор вправе вызывать — для контрактного теста
    // (tests/pioneer-blockly-contract.test.ts). Необязательное поле.
    apiUsage?: Partial<Record<PioneerTarget, string[]>>;
};
