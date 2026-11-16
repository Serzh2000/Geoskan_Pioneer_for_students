import type { ParamsView } from './types.js';

/** Подсказка в шапке для каждого экрана окна. */
export const SUBTITLES: Record<ParamsView, string> = {
    home: 'Прочитать настройки с дрона, загрузить их в дрон или применить в симуляторе.',
    pick: 'Выберите, откуда взять настройки.',
    preview: 'Предпросмотр: что изменится. Дрон не нужен.',
    editor: 'Правки применяются сразу, в файл уходят по кнопке сохранения.'
};

/** Куда ведёт «назад» (стрелка в шапке и Esc) на каждом экране; null - это главный экран. */
export const BACK_TARGET: Record<ParamsView, ParamsView | null> = { home: null, pick: 'home', preview: 'pick', editor: 'home' };

export const BACK_LABEL: Record<ParamsView, string> = {
    home: '',
    pick: '\u2190 К выбору действий',
    preview: '\u2190 К выбору источника',
    editor: '\u2190 К выбору действий'
};
