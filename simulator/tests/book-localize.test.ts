import { expect, test } from '@jest/globals';
import { localize } from '../public/modules/ui/mission-guide/book/localize.js';

test('keeps the passages of its own volume and drops the other one', () => {
    const text = 'Общее. <lua>Это про Lua.</lua><py>Это про Python.</py> Снова общее.';
    expect(localize(text, 'lua')).toBe('Общее. Это про Lua. Снова общее.');
    expect(localize(text, 'python')).toBe('Общее. Это про Python. Снова общее.');
});

test('leaves a text without tags exactly as it is, code spacing included', () => {
    const text = 'Вызов `Timer.callLater(1, ...)` остаётся.';
    expect(localize(text, 'lua')).toBe(text);
});

test('does not touch the spacing of code next to a tag', () => {
    const text = 'Пишите `f(1, ...)` <lua>и `end`</lua><py>и отступ</py>.';
    expect(localize(text, 'lua')).toBe('Пишите `f(1, ...)` и `end`.');
    expect(localize(text, 'python')).toBe('Пишите `f(1, ...)` и отступ.');
});

test('closes the gap left by a cut before a punctuation mark', () => {
    expect(localize('Значение <py>(от 0 до 255)</py>.', 'lua')).toBe('Значение.');
    expect(localize('Один <lua>раз</lua>, два.', 'python')).toBe('Один, два.');
});
