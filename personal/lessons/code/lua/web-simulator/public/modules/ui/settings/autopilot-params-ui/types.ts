export type FlashMessage = {
    kind: 'info' | 'success' | 'error';
    text: string;
};

export type DraftState = {
    value: string;
    error: string;
};

export type SectionKey = 'flight' | 'sensors' | 'hardware' | 'system';
export type FilterMode = 'all' | 'documented' | 'changed' | 'invalid';

export type SectionState = Record<SectionKey, boolean>;
export type GroupState = Record<string, boolean>;

export type SectionMeta = {
    title: string;
    description: string;
    groups: string[];
};

export type AutopilotSourceResponse = {
    fileName: string;
    filePath: string;
    content: string;
    updatedAt?: string;
};
