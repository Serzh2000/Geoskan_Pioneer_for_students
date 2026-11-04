/**
 * Шаги миссий, которые ведут ученика по интерфейсу за руку: подсвечивают нужную кнопку и сами засчитывают шаг,
 * когда ученик её нажал. Нужны там, где текст урока отсылает к месту, которого нет на экране миссии
 * (в книге это ссылка под рабочим листом, в режиме обучения книги нет).
 */
export type GuidedStep = {
    text: string;
    /** CSS-селектор элемента, который нужно подсветить. */
    target?: string;
    /** Подпись у подсветки. */
    label?: string;
    /** Шаг засчитывается сам, когда условие выполнено; без него ученик нажимает «Сделал, дальше». */
    until?: () => boolean;
    /** Подсвеченная кнопка лежит в редакторе: перед шагом показать редактор. */
    inEditor?: boolean;
};

type Language = 'lua' | 'python';

const visible = (selector: string): boolean => {
    const node = document.querySelector<HTMLElement>(selector);
    return Boolean(node && !node.hidden && node.getClientRects().length);
};

const searchHas = (word: string): boolean => {
    const input = document.querySelector<HTMLInputElement>('#api-docs-search');
    return Boolean(input && input.value.toLowerCase().includes(word.toLowerCase()));
};

/** Урок 7 «Что такое API»: найти команду подготовки в справочнике, вписать её в код. */
function whatIsApi(language: Language): GuidedStep[] {
    const word = language === 'lua' ? 'MCE_PREFLIGHT' : 'arm';
    return [
        {
            text: 'Откройте справочник API. Это кнопка с книгой в верхней панели редактора, она подсвечена.',
            target: '#editor-docs-toggle-btn', label: 'Справочник API', inEditor: true,
            until: () => visible('#editor-docs')
        },
        {
            text: `В строке поиска справочника введите \`${word}\`. Справочник отфильтрует методы и события по этому слову.`,
            target: '#api-docs-search', label: `Введите: ${word}`,
            until: () => searchHas(word)
        },
        {
            text: language === 'lua'
                ? 'Откройте найденную карточку и прочитайте её. Метод `ap.push` отправляет команду автопилоту, а аргумент `Ev.MCE_PREFLIGHT` уточняет, какую именно: подготовку двигателей.'
                : 'Откройте найденную карточку и прочитайте её. Метод `arm` подготавливает двигатели: он вызывается у объекта `pioneer` с пустыми скобками.',
            target: '#editor-docs-body', label: 'Результаты поиска'
        },
        {
            text: language === 'lua'
                ? 'Закройте справочник крестиком и впишите найденный аргумент в скобки `ap.push()` в редакторе. Строка должна выглядеть так: `ap.push(Ev.MCE_PREFLIGHT)`.'
                : 'Закройте справочник крестиком и впишите вместо `____` имя найденного метода. Строка должна выглядеть так: `pioneer.arm()`.',
            target: '#editor-docs-close-btn', label: 'Закрыть справочник',
            until: () => !visible('#editor-docs')
        }
    ];
}

/** Проведение за руку по номеру миссии; для остальных миссий шаги берутся из урока как есть. */
export const GUIDED_STEPS: Record<string, (language: Language) => GuidedStep[]> = {
    'academy-007': whatIsApi
};
