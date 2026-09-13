import * as Blockly from 'blockly';
import { luaGenerator } from 'blockly/lua';
import { pythonGenerator } from 'blockly/python';
import type { PioneerBlockGenerator, PioneerBlockSpec, PioneerTarget } from './targets/types.js';

// Единый реестр pioneer_*-блоков: один Blockly.Blocks[type], но генератор
// подключается только для тех таргетов, что перечислены в spec.targets.
const registry = new Map<string, PioneerBlockSpec>();

// LuaGenerator/PythonGenerator сужают тип второго параметра forBlock до себя же,
// поэтому структурно они не Blockly.CodeGenerator (forBlock контравариантен по
// параметрам) — а нам как раз нужен только общий базовый интерфейс генератора.
function getGenerator(target: PioneerTarget): Blockly.CodeGenerator {
    return (target === 'lua' ? luaGenerator : pythonGenerator) as unknown as Blockly.CodeGenerator;
}

// Заглушка для таргета, где блок не поддерживается: не должна ничего
// генерировать, но обязана вернуть валидное значение для value-блока —
// иначе Blockly-генератор упадёт на попытке подключить блок к выражению.
function createUnsupportedGenerator(target: PioneerTarget): PioneerBlockGenerator {
    return (block) => {
        if (block.outputConnection) {
            return [target === 'lua' ? 'nil' : 'None', 0];
        }
        return '';
    };
}

export function definePioneerBlock(spec: PioneerBlockSpec): void {
    registry.set(spec.type, spec);
    Blockly.Blocks[spec.type] = { init: spec.init };

    (['lua', 'python'] as const).forEach((target) => {
        const generator = getGenerator(target);
        generator.forBlock[spec.type] = spec.targets[target] ?? createUnsupportedGenerator(target);
    });
}

export function isBlockSupported(type: string, target: PioneerTarget): boolean {
    return Boolean(registry.get(type)?.targets[target]);
}

export function getPioneerBlockTypes(): string[] {
    return Array.from(registry.keys());
}

export function getPioneerBlockSpec(type: string): PioneerBlockSpec | undefined {
    return registry.get(type);
}

export function getPioneerBlockTypesByCategory(category: PioneerBlockSpec['category']): string[] {
    return Array.from(registry.values())
        .filter((spec) => spec.category === category)
        .map((spec) => spec.type);
}
