export type FlashMessage = {
    kind: 'info' | 'success' | 'error';
    text: string;
};

export type DraftState = {
    value: string;
    error: string;
};

export type SectionKey = 'flight' | 'sensors' | 'hardware' | 'system';
/** Какой экран открыт: выбор действия (карточки) или редактор со списком параметров. */
export type ParamsView = 'home' | 'pick' | 'wizard' | 'preview' | 'editor';
/** Второй шаг «откуда взять настройки»: для записи на дрон или для симулятора. */
export type PickMode = 'to-drone' | 'to-sim';
export type FilterMode = 'all' | 'documented' | 'changed' | 'invalid';

export type SectionMeta = {
    title: string;
    description: string;
    groups: string[];
};

export type AutopilotSourceResponse = {
    fileName: string;
    /** Путь на диске сервера: приходит только когда запись исходного файла разрешена. */
    filePath?: string;
    /** Можно ли записывать исходный файл на этом сервере (локально да, на общем сервере нет). */
    writable?: boolean;
    content: string;
    updatedAt?: string;
};
