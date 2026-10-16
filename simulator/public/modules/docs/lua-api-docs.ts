import type { ApiDoc } from './api-docs-types.js';
import { luaApiDocsEvents } from './lua-api-docs-events.js';
import { luaApiDocsFlight } from './lua-api-docs-flight.js';
import { luaApiDocsRuntime } from './lua-api-docs-runtime.js';

export const luaApiDocs: Record<string, ApiDoc> = {
    ...luaApiDocsFlight,
    ...luaApiDocsRuntime,
    ...luaApiDocsEvents
};
