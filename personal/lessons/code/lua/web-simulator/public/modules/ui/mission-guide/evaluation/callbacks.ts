import type { GuideDiagnostic, GuideLesson } from '../types.js';

export function getCallbackDiagnostics(sequenceIds: string[], lesson: GuideLesson): GuideDiagnostic[] {
    if (!lesson.targetBlockIds.includes('lua_callback_open') && !lesson.targetBlockIds.includes('lua_callback_end')) {
        return [];
    }

    const diagnostics: GuideDiagnostic[] = [];
    const callbackOpenCount = sequenceIds.filter((blockId) => blockId === 'lua_callback_open').length;
    const callbackEndCount = sequenceIds.filter((blockId) => blockId === 'lua_callback_end').length;

    if (callbackOpenCount > 1) {
        diagnostics.push({
            kind: 'error',
            title: 'Callback открыт несколько раз',
            reason: 'В одном учебном Lua-сценарии нужен один контейнер `function callback(event)`, а не несколько независимых открывающих блоков.',
            fix: 'Оставьте один блок `function callback(event)` и удалите лишние открытия.'
        });
    }

    if (callbackEndCount > 1) {
        diagnostics.push({
            kind: 'error',
            title: 'Callback закрыт несколько раз',
            reason: 'Отдельный блок `end` должен завершать ровно один контейнер `function callback(event)`.',
            fix: 'Оставьте одно закрытие `end`, относящееся к callback.'
        });
    }

    let callbackDepth = 0;
    let hasEventOutsideCallback = false;
    let hasCloseWithoutOpen = false;

    sequenceIds.forEach((blockId) => {
        if (blockId === 'lua_callback_open') {
            callbackDepth += 1;
            return;
        }

        if (blockId === 'lua_callback_end') {
            if (callbackDepth === 0) {
                hasCloseWithoutOpen = true;
                return;
            }
            callbackDepth -= 1;
            return;
        }

        if (blockId === 'lua_event_callback' && callbackDepth === 0) {
            hasEventOutsideCallback = true;
        }
    });

    if (hasCloseWithoutOpen) {
        diagnostics.push({
            kind: 'error',
            title: 'Закрывающий `end` стоит без открытия callback',
            reason: 'Блок `end` для callback не может существовать сам по себе: перед ним должен быть явный блок `function callback(event)`.',
            fix: 'Поставьте `function callback(event)` раньше этого `end` или удалите лишнее закрытие.'
        });
    }

    if (hasEventOutsideCallback) {
        diagnostics.push({
            kind: 'error',
            title: 'Событийная ветка вынесена из callback',
            reason: 'Ветви `if event == ... then` должны находиться между отдельными блоками `function callback(event)` и `end`.',
            fix: 'Поместите все событийные блоки внутрь области callback.'
        });
    }

    return diagnostics;
}
