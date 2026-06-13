import type { GuideDiagnostic } from '../types.js';
import {
    getNextBlock,
    hasBlockType,
    hasFieldValue,
    hasNumericFieldValue,
    parseWorkspaceXml
} from './xml.js';

function matchesLedSet(element: Element | null, index: string, r: string, g: string, b: string): boolean {
    return hasBlockType(element, 'lua_led_set')
        && hasFieldValue(element, 'INDEX', index)
        && hasFieldValue(element, 'R', r)
        && hasFieldValue(element, 'G', g)
        && hasFieldValue(element, 'B', b);
}

export function matchesLuaLedSingleWorkspace(workspaceXml: string | null | undefined): boolean {
    const xmlRoot = parseWorkspaceXml(workspaceXml);
    if (!xmlRoot) return false;

    const topBlocks = Array.from(xmlRoot.children).filter((child) => child.localName === 'block');
    if (topBlocks.length !== 1) return false;

    const ledbar = topBlocks[0];
    const ledSet = getNextBlock(ledbar);

    return hasBlockType(ledbar, 'lua_ledbar_new')
        && hasNumericFieldValue(ledbar, 'COUNT', 29)
        && matchesLedSet(ledSet, '0', '1', '0', '0')
        && !getNextBlock(ledSet);
}

export function validateLuaLedSingleWorkspace(workspaceXml: string | null | undefined): GuideDiagnostic[] {
    const xmlRoot = parseWorkspaceXml(workspaceXml);
    if (!xmlRoot) return [];

    const topBlocks = Array.from(xmlRoot.children).filter((child) => child.localName === 'block');
    if (topBlocks.length !== 1) {
        return [{
            kind: 'error',
            title: 'Решение должно быть одной цепочкой',
            reason: 'В первом уроке нужен простой линейный сценарий: создание `Ledbar`, затем один вызов `leds:set(...)`.',
            fix: 'Соберите одну ветку без отдельных блоков и без дополнительных конструкций.'
        }];
    }

    const ledbar = topBlocks[0];
    const ledSet = getNextBlock(ledbar);

    if (!hasBlockType(ledbar, 'lua_ledbar_new')) {
        return [{
            kind: 'error',
            title: 'Сначала нужно создать `Ledbar`',
            reason: 'Первый шаг должен начинаться с `Ledbar.new(29)`, иначе лента еще не инициализирована.',
            fix: 'Поставьте блок создания `Ledbar` первым в цепочке.'
        }];
    }

    if (!hasNumericFieldValue(ledbar, 'COUNT', 29)) {
        return [{
            kind: 'error',
            title: 'Указано неверное количество светодиодов',
            reason: 'Для этого урока нужно создать ленту через `Ledbar.new(29)`.',
            fix: 'Откройте блок создания ленты и установите значение `29`.'
        }];
    }

    if (!hasBlockType(ledSet, 'lua_led_set')) {
        return [{
            kind: 'error',
            title: 'Нет команды включения подсветки',
            reason: 'После создания `Ledbar` должен идти один вызов `leds:set(...)`.',
            fix: 'Добавьте после `Ledbar.new(29)` блок `leds:set(...)`.'
        }];
    }

    if (!hasFieldValue(ledSet, 'INDEX', '0')) {
        return [{
            kind: 'error',
            title: 'Нужен именно первый светодиод',
            reason: 'В этом уроке включаем только первый светодиод. Нумерация начинается с нуля, поэтому первый диод имеет индекс `0`.',
            fix: 'Установите у `leds:set(...)` индекс `0`.'
        }];
    }

    if (!hasFieldValue(ledSet, 'R', '1') || !hasFieldValue(ledSet, 'G', '0') || !hasFieldValue(ledSet, 'B', '0')) {
        return [{
            kind: 'error',
            title: 'Красный цвет задан неверно',
            reason: 'Для первого урока нужен точный вызов `leds:set(0, 1, 0, 0)`.',
            fix: 'Установите значения цвета: `R = 1`, `G = 0`, `B = 0`.'
        }];
    }

    if (getNextBlock(ledSet)) {
        return [{
            kind: 'error',
            title: 'Здесь нужен только один светодиод без дополнительных шагов',
            reason: 'Урок знакомит с линейным выполнением скрипта без циклов и без дополнительных команд после первого красного диода.',
            fix: 'Оставьте только `Ledbar.new(29)` и `leds:set(0, 1, 0, 0)`.'
        }];
    }

    return [];
}
