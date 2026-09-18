import type { SceneManagerDomRefs } from '../types.js';

export type SceneTypePreviewConfig = {
    title: string;
    description: string;
    accent: 'route' | 'marker' | 'structure' | 'terrain' | 'service';
    icon: string;
};

const DEFAULT_TYPE_PREVIEW: SceneTypePreviewConfig = {
    title: 'Объект сцены',
    description: 'Базовый объект полигона для размещения в сцене.',
    accent: 'structure',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/></svg>'
};

const TYPE_PREVIEW_CONFIG: Record<string, SceneTypePreviewConfig> = {
    gate: {
        title: 'Ворота',
        description: 'Ориентир и пролётная рамка для трасс и учебных миссий.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 20V6h14v14"/><path d="M8 20V9h8v11"/></svg>'
    },
    pylon: {
        title: 'Пилон',
        description: 'Вертикальный ориентир для слалома, облёта и трасс.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v13"/><path d="M8 20h8"/><path d="M9 7h6"/></svg>'
    },
    aruco: {
        title: 'ArUco маркер',
        description: 'Одиночный маркер с ID и выбором словаря ArUco.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h3v3H8zM13 8h3M8 13h3M13 13h3v3h-3z"/></svg>'
    },
    'aruco-map': {
        title: 'ArUco карта',
        description: 'Сетка из маркеров ArUco с настройкой размеров, ID и обхода.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/></svg>'
    },
    apriltag: {
        title: 'AprilTag маркер',
        description: 'Одиночный AprilTag для компьютерного зрения и навигации.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z"/></svg>'
    },
    'apriltag-map': {
        title: 'AprilTag карта',
        description: 'Карта из AprilTag маркеров с сеткой и параметрами раскладки.',
        accent: 'marker',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/><path d="M14 14h2v2h-2z"/></svg>'
    },
    road: {
        title: 'Автомобильная дорога',
        description: 'Линейный маршрут с редактируемыми точками и визуальной прокладкой.',
        accent: 'route',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19c3.5-5 10.5-5 14-10"/><path d="M10 15h.01M14 11h.01"/></svg>'
    },
    rail: {
        title: 'Железнодорожные пути',
        description: 'Линейный маршрут для рельсовых объектов и длинных траекторий.',
        accent: 'route',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 5v14M18 5v14"/><path d="M6 8h12M6 12h12M6 16h12"/></svg>'
    },
    building: {
        title: 'Многоэтажка',
        description: 'Здание с этажностью и сценариями по окнам для задач поиска и спасения.',
        accent: 'structure',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 21V5h12v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M11 21v-4h2v4"/></svg>'
    },
    hill: {
        title: 'Холм',
        description: 'Рельефный объект для высотных ограничений и визуального ориентирования.',
        accent: 'terrain',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 18c2.5-2.5 4-6 6-6s3.5 3 5 3 2.5-1 7-6"/><path d="M3 18h18"/></svg>'
    },
    'start-position': {
        title: 'Стартовая позиция',
        description: 'Точка старта с номером, удобная для сценариев и пресетов.',
        accent: 'service',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 4v16"/><path d="M6 5h9l-2 4 2 4H6"/></svg>'
    },
    heliport: {
        title: 'Хелипорт',
        description: 'Посадочная площадка для ориентирования и сценариев взлёта/посадки.',
        accent: 'service',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 8v8M15 8v8M9 12h6"/></svg>'
    }
};

// Every catalog entry describes its purpose instead of falling back to a generic cube.
const EXTRA_TYPES: Array<[string, string, string, SceneTypePreviewConfig['accent'], string]> = [
    ['flag', 'Флаг', 'Отметка направления и контрольной точки маршрута.', 'route', 'M6 21V3m0 1h12l-3 5 3 5H6'],
    ['arena-hills', 'Группа холмов', 'Несколько возвышенностей для полёта с учётом рельефа.', 'terrain', 'M2 19 8 8l5 7 4-5 5 9Z'],
    ['tree', 'Ель', 'Отдельное дерево для ориентирования и облёта препятствий.', 'terrain', 'm12 3-7 10h4l-5 5h16l-5-5h4ZM12 18v4'],
    ['forest-patch', 'Лесной массив', 'Группа деревьев для лесных участков и поисковых миссий.', 'terrain', 'm8 4-5 12h10Zm9 3-4 12h9ZM8 16v5m9-2v3'],
    ['settlement', 'Макет поселения', 'Небольшие дома с улицей для моделирования населённого пункта.', 'structure', 'm3 10 6-6 6 6M5 9v11h8V9m1 4 4-4 4 4m-6 0v7h5v-7'],
    ['transport', 'Транспорт', 'Автомобиль как наземный ориентир или объект наблюдения.', 'structure', 'm4 10 3-5h10l3 5v8H4Zm0 1h16M7 18v3m10-3v3'],
    ['cargo', 'Груз', 'Груз с подвесом для отработки захвата и транспортировки.', 'service', 'M5 8h14v12H5ZM9 8V5h6v3M12 8v12'],
    ['charge-station', 'Станция заряда', 'Наземная площадка с маркировкой зарядной станции.', 'service', 'M4 4h16v16H4Zm9 2-5 7h4l-1 5 5-7h-4Z'],
    ['locus-beacon', 'Локус-маяк', 'Маяк локальной навигации для размещения на полигоне.', 'service', 'M12 10v11M8 21h8M8 6a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 3a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14'],
    ['light-tower', 'Световая мачта', 'Освещение участка; яркость меняется в контекстном меню.', 'service', 'M12 8v13M7 21h10M4 4h16v4H4ZM6 11l-2 3m14-3 2 3'],
    ['video-tower', 'Видеомачта', 'Мачта с видеокамерой для оборудования наблюдательного поста.', 'service', 'M11 10v11M6 21h10M5 4h11v7H5Zm11 2 5-2v8l-5-2'],
    ['control-station', 'Пульт полигона', 'Рабочее место оператора с мониторами и оборудованием.', 'service', 'M4 4h16v10H4ZM12 14v4M8 18h8M3 18v4m18-4v4M3 18h18'],
    ['arena-space', 'Арена с сеткой', 'Ограждённая полётная зона с опорами и защитной сеткой.', 'structure', 'M3 6h18v14H3ZM3 6l5 4h8l5-4M8 10v10m8-10v10'],
    ['pad-h', 'Площадка H', 'Посадочная мишень с буквой H для тренировки точности.', 'service', 'M3 3h18v18H3ZM8 7v10m8-10v10M8 12h8'],
    ['pad-charge', 'Площадка заряда', 'Площадка с символом молнии для разметки сервисной зоны.', 'service', 'M3 3h18v18H3Zm10 3-5 7h4l-1 5 5-7h-4Z']
];
for (const [type, title, description, accent, path] of EXTRA_TYPES) {
    TYPE_PREVIEW_CONFIG[type] = { title, description, accent, icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>` };
}

export function getSceneTypePreviewConfig(type: string, optionLabel?: string): SceneTypePreviewConfig {
    return TYPE_PREVIEW_CONFIG[type] || {
        ...DEFAULT_TYPE_PREVIEW,
        title: optionLabel || DEFAULT_TYPE_PREVIEW.title
    };
}

export function updateAddTypePreview(elements: SceneManagerDomRefs) {
    if (!elements.addTypeEl || !elements.addTypeCurrentEl) return;
    const optionLabel = elements.addTypeEl.selectedOptions[0]?.textContent?.trim() || DEFAULT_TYPE_PREVIEW.title;
    const preview = getSceneTypePreviewConfig(elements.addTypeEl.value, optionLabel);
    elements.addTypeCurrentEl.textContent = optionLabel;
    if (elements.addTypeSelectionCardEl) {
        elements.addTypeSelectionCardEl.dataset.accent = preview.accent;
    }
    if (elements.addTypeCurrentTextEl) {
        elements.addTypeCurrentTextEl.textContent = preview.description;
    }
    if (elements.addTypeCurrentIconEl) {
        elements.addTypeCurrentIconEl.innerHTML = preview.icon;
    }
}
