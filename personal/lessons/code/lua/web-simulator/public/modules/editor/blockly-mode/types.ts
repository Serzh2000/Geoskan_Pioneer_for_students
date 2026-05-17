import type { ApiDoc } from '../../docs/api-docs.js';

export type ApiCatalogEntry = {
    key: string;
    doc: ApiDoc;
    type: string;
    category: string;
    colour: string;
    callHead: string;
    defaultArgs: string;
    hasArgs: boolean;
};
