import type { GuideBlock, GuideBlockStyle } from './types.js';

export function createStatementBlock(
    id: string,
    label: string,
    codeLabel: string,
    explanation: string,
    style: GuideBlockStyle,
    code: string
): GuideBlock {
    return { id, label, codeLabel, explanation, style, kind: 'statement', code };
}

export function createTimerBlock(
    id: string,
    label: string,
    codeLabel: string,
    explanation: string,
    seconds: number
): GuideBlock {
    return { id, label, codeLabel, explanation, style: 'wait', kind: 'timer', code: '', seconds };
}

export function createEventBlock(
    id: string,
    label: string,
    codeLabel: string,
    explanation: string,
    eventName: string
): GuideBlock {
    return { id, label, codeLabel, explanation, style: 'wait', kind: 'event', code: '', eventName };
}
