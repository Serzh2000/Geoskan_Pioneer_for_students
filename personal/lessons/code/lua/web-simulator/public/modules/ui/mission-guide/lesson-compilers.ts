import type { GuideBlock } from './types.js';

function indentLines(lines: string[], indent = '    '): string[] {
    return lines.map((line) => `${indent}${line}`);
}

function splitCodeLines(code: string): string[] {
    return code
        .split('\n')
        .map((line) => line.replace(/\s+$/g, ''));
}

export function compileLuaLinear(sequenceIds: string[], blocks: GuideBlock[]): string {
    const blockMap = new Map(blocks.map((block) => [block.id, block] as const));
    const lines = sequenceIds
        .map((blockId) => blockMap.get(blockId))
        .filter((block): block is GuideBlock => Boolean(block))
        .filter((block) => block.kind === 'statement')
        .flatMap((block) => splitCodeLines(block.code));

    return lines.join('\n').trim();
}

export function compileLuaTimed(sequenceIds: string[], blocks: GuideBlock[]): string {
    const blockMap = new Map(blocks.map((block) => [block.id, block] as const));
    const rootLines: string[] = [];
    const timers: Array<{ delay: number; lines: string[] }> = [];
    let accumulatedDelay = 0;
    let currentTarget = rootLines;

    for (const blockId of sequenceIds) {
        const block = blockMap.get(blockId);
        if (!block) continue;

        if (block.kind === 'timer') {
            accumulatedDelay += block.seconds || 0;
            const timer = { delay: accumulatedDelay, lines: [] as string[] };
            timers.push(timer);
            currentTarget = timer.lines;
            continue;
        }

        if (block.kind === 'statement') {
            currentTarget.push(...splitCodeLines(block.code));
        }
    }

    const output: string[] = [...rootLines];
    for (const timer of timers) {
        if (output.length) output.push('');
        output.push(`Timer.callLater(${timer.delay.toFixed(1)}, function()`);
        output.push(...indentLines(timer.lines.length ? timer.lines : ['print("Шаг ожидания добавлен, но действие после него не выбрано")']));
        output.push('end)');
    }

    return output.join('\n').trim();
}

export function compileLuaEvents(sequenceIds: string[], blocks: GuideBlock[]): string {
    const blockMap = new Map(blocks.map((block) => [block.id, block] as const));
    const rootLines: string[] = [];
    const eventOrder: string[] = [];
    const eventLines = new Map<string, string[]>();
    let currentEvent: string | null = null;

    for (const blockId of sequenceIds) {
        const block = blockMap.get(blockId);
        if (!block) continue;

        if (block.kind === 'event' && block.eventName) {
            currentEvent = block.eventName;
            if (!eventLines.has(block.eventName)) {
                eventOrder.push(block.eventName);
                eventLines.set(block.eventName, []);
            }
            continue;
        }

        if (block.kind !== 'statement') continue;
        const target = currentEvent ? eventLines.get(currentEvent) : rootLines;
        target?.push(...splitCodeLines(block.code));
    }

    const output: string[] = [...rootLines];
    if (eventOrder.length) {
        if (output.length) output.push('');
        output.push('function callback(event)');
        for (const eventName of eventOrder) {
            const lines = eventLines.get(eventName) || [];
            output.push(`    if event == ${eventName} then`);
            output.push(...indentLines(lines.length ? lines : ['print("Событие ожидается, но действие после него не задано")'], '        '));
            output.push('    end');
            output.push('');
        }
        if (output[output.length - 1] === '') output.pop();
        output.push('end');
    }

    return output.join('\n').trim();
}

export function compilePython(sequenceIds: string[], blocks: GuideBlock[]): string {
    const blockMap = new Map(blocks.map((block) => [block.id, block] as const));
    const bodyLines = sequenceIds
        .map((blockId) => blockMap.get(blockId))
        .filter((block): block is GuideBlock => Boolean(block))
        .filter((block) => block.kind === 'statement')
        .flatMap((block) => splitCodeLines(block.code));

    const lines = [
        '# Pioneer Python Script',
        'from pioneer_sdk import Pioneer',
        'import time',
        '',
        'pioneer = Pioneer(simulator=True)',
        '',
        ...bodyLines,
        '',
        'pioneer.close_connection()'
    ];

    return lines.join('\n').trim();
}
