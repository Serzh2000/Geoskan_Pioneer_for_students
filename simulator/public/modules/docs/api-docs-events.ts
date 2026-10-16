import { luaApiDocsEvents } from './lua-api-docs-events.js';

// Все документированные константы событий FSM (Lua API-документация, 16 штук).
const documented = Object.keys(luaApiDocsEvents).map((key) => key.replace(/^Ev\./, ''));

// Легаси-константы: встречались в симуляторе до появления API-документации.
// Сохранены для обратной совместимости автодополнения Monaco и старых сценариев;
// недокументированные события помечаются в автодополнении отдельно.
const legacy = [
    'LOW_VOLTAGE',
    'STATE_CHANGED',
    'BUTTON_PRESS',
    'RADIO_CONTROL',
    'WIFI_CONTROL',
    'AHRS_ERROR',
    'MAG_ERROR'
];

export const evConstants: string[] = [
    ...documented,
    ...legacy.filter((name) => !documented.includes(name))
];
