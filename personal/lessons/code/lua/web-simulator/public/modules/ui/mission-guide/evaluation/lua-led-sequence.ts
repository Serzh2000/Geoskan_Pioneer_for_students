import type { GuideDiagnostic, GuideLesson } from '../types.js';
import {
    hasBlockType,
    hasFieldValue,
    hasNumericFieldValue,
    parseWorkspaceXml,
    getNextBlock,
    getStatementBlock
} from './xml.js';

function matchesLedSet(element: Element | null, index: string, r: string, g: string, b: string): boolean {
    return hasBlockType(element, 'lua_led_set')
        && hasFieldValue(element, 'INDEX', index)
        && hasFieldValue(element, 'R', r)
        && hasFieldValue(element, 'G', g)
        && hasFieldValue(element, 'B', b);
}

function matchesTimerDelay(element: Element | null, delay: string): boolean {
    return hasBlockType(element, 'lua_timer_calllater') && hasNumericFieldValue(element, 'DELAY', Number(delay));
}

export function matchesLuaLedSequenceWorkspace(workspaceXml: string | null | undefined): boolean {
    const xmlRoot = parseWorkspaceXml(workspaceXml);
    if (!xmlRoot) return false;

    const topBlocks = Array.from(xmlRoot.children).filter((child) => child.localName === 'block');
    if (topBlocks.length !== 1) return false;

    const ledbar = topBlocks[0];
    const firstTimer = getNextBlock(ledbar);
    const blue = getStatementBlock(firstTimer, 'CALLBACK');
    const secondTimer = getNextBlock(firstTimer);
    const green = getStatementBlock(secondTimer, 'CALLBACK');
    const thirdTimer = getNextBlock(secondTimer);
    const red = getStatementBlock(thirdTimer, 'CALLBACK');

    return hasBlockType(ledbar, 'lua_ledbar_new')
        && hasFieldValue(ledbar, 'COUNT', '29')
        && matchesTimerDelay(firstTimer, '1')
        && matchesLedSet(blue, '0', '0', '0', '1')
        && matchesTimerDelay(secondTimer, '2')
        && matchesLedSet(green, '0', '0', '1', '0')
        && matchesTimerDelay(thirdTimer, '3')
        && matchesLedSet(red, '0', '1', '0', '0')
        && !getNextBlock(thirdTimer)
        && !getNextBlock(blue)
        && !getNextBlock(green)
        && !getNextBlock(red);
}

export function validateLuaLedSequenceWorkspace(workspaceXml: string | null | undefined): GuideDiagnostic[] {
    const xmlRoot = parseWorkspaceXml(workspaceXml);
    if (!xmlRoot) return [];

    const topBlocks = Array.from(xmlRoot.children).filter((child) => child.localName === 'block');
    if (topBlocks.length !== 1) {
        return [{
            kind: 'error',
            title: 'Анимация разбита на несколько независимых веток',
            reason: 'Для этого урока цепочка должна быть одной последовательностью. Иначе таймеры начинают работать параллельно и кадры накладываются.',
            fix: 'Соберите все шаги в одну ветку: синий -> таймер -> зеленый -> таймер -> красный.'
        }];
    }

    const ledbar = topBlocks[0];
    const firstTimer = getNextBlock(ledbar);
    const blue = getStatementBlock(firstTimer, 'CALLBACK');
    const secondTimer = getNextBlock(firstTimer);
    const green = getStatementBlock(secondTimer, 'CALLBACK');
    const thirdTimer = getNextBlock(secondTimer);
    const red = getStatementBlock(thirdTimer, 'CALLBACK');

    if (hasBlockType(getNextBlock(blue), 'lua_timer_calllater')
        || hasBlockType(getNextBlock(green), 'lua_timer_calllater')
        || hasBlockType(getNextBlock(red), 'lua_timer_calllater')) {
        return [{
            kind: 'error',
            title: 'Таймер вложен не в ту ветку',
            reason: 'В этом уроке внутри `callback` таймера должен лежать только `leds:set(...)`. Следующий таймер идет после предыдущего в основной цепочке.',
            fix: 'Соберите три таймера друг за другом, а цветовые блоки оставьте внутри их `callback`.'
        }];
    }

    if (matchesLuaLedSequenceWorkspace(workspaceXml)) return [];

    if (!hasBlockType(ledbar, 'lua_ledbar_new')) {
        return [{
            kind: 'error',
            title: 'Анимация должна начинаться с `Ledbar`',
            reason: 'Сначала нужно создать ленту, и только затем задавать цвета и таймеры.',
            fix: 'Поставьте `Ledbar.new(29)` в начало единственной ветки.'
        }];
    }

    if (!matchesTimerDelay(firstTimer, '1')) {
        return [{
            kind: 'error',
            title: 'Первая задержка указана неверно',
            reason: 'Первый `Timer.callLater(...)` должен срабатывать через `1` секунду после старта.',
            fix: 'Установите у первого таймера значение `1`.'
        }];
    }

    if (!matchesLedSet(blue, '0', '0', '0', '1')) {
        return [{
            kind: 'error',
            title: 'Синий кадр собран неверно',
            reason: 'Внутри первого таймера должен стоять синий кадр `leds:set(0, 0, 0, 1)`.',
            fix: 'Поместите внутрь первого `callback` синий цвет для диода `0`.'
        }];
    }

    if (!matchesTimerDelay(secondTimer, '2')) {
        return [{
            kind: 'error',
            title: 'Вторая задержка указана неверно',
            reason: 'Второй `Timer.callLater(...)` должен срабатывать через `2` секунды от начала работы.',
            fix: 'Установите у второго таймера значение `2`.'
        }];
    }

    if (!matchesLedSet(green, '0', '0', '1', '0')) {
        return [{
            kind: 'error',
            title: 'Зеленый кадр собран неверно',
            reason: 'Внутри второго таймера должен стоять зеленый кадр `leds:set(0, 0, 1, 0)`.',
            fix: 'Поместите внутрь второго `callback` зеленый цвет для диода `0`.'
        }];
    }

    if (!matchesTimerDelay(thirdTimer, '3')) {
        return [{
            kind: 'error',
            title: 'Третья задержка указана неверно',
            reason: 'Третий `Timer.callLater(...)` должен срабатывать через `3` секунды от начала работы.',
            fix: 'Установите у третьего таймера значение `3`.'
        }];
    }

    if (!matchesLedSet(red, '0', '1', '0', '0')) {
        return [{
            kind: 'error',
            title: 'Красный кадр собран неверно',
            reason: 'Внутри третьего таймера должен стоять красный кадр `leds:set(0, 1, 0, 0)`.',
            fix: 'Поместите внутрь третьего `callback` красный цвет для диода `0`.'
        }];
    }

    return [{
        kind: 'error',
        title: 'Нарушена структура анимации',
        reason: 'Для этого урока нужна одна ветка с тремя таймерами подряд: `1`, `2`, `3` секунды от старта. Внутри каждого `callback` лежит только свой цвет.',
        fix: 'Соберите схему `Ledbar(29) -> timer(1){ blue } -> timer(2){ green } -> timer(3){ red }`.'
    }];
}

export function getStructureDiagnostics(lesson: GuideLesson, workspaceXml: string | null | undefined): GuideDiagnostic[] {
    if (lesson.id === 'lua-led-sequence') {
        return validateLuaLedSequenceWorkspace(workspaceXml);
    }
    return [];
}
