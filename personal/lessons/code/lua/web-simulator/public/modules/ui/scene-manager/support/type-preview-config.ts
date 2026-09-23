import type { SceneManagerDomRefs } from '../types.js';
import { tablerIcon, type TablerIconName } from '../../icons/tabler.js';

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
    icon: tablerIcon('box')
};

const TYPE_PREVIEW_CONFIG: Record<string, SceneTypePreviewConfig> = {
    gate: {
        title: 'Ворота',
        description: 'Ориентир и пролётная рамка для трасс и учебных миссий.',
        accent: 'structure',
        icon: tablerIcon('frame')
    },
    pylon: {
        title: 'Пилон',
        description: 'Вертикальный ориентир для слалома, облёта и трасс.',
        accent: 'structure',
        icon: tablerIcon('traffic-cone')
    },
    aruco: {
        title: 'ArUco маркер',
        description: 'Одиночный маркер с ID и выбором словаря ArUco.',
        accent: 'marker',
        icon: tablerIcon('qrcode')
    },
    'aruco-map': {
        title: 'ArUco карта',
        description: 'Сетка из маркеров ArUco с настройкой размеров, ID и обхода.',
        accent: 'marker',
        icon: tablerIcon('grid-4x4')
    },
    apriltag: {
        title: 'AprilTag маркер',
        description: 'Одиночный AprilTag для компьютерного зрения и навигации.',
        accent: 'marker',
        icon: tablerIcon('qrcode')
    },
    'apriltag-map': {
        title: 'AprilTag карта',
        description: 'Карта из AprilTag маркеров с сеткой и параметрами раскладки.',
        accent: 'marker',
        icon: tablerIcon('grid-4x4')
    },
    road: {
        title: 'Автомобильная дорога',
        description: 'Линейный маршрут с редактируемыми точками и визуальной прокладкой.',
        accent: 'route',
        icon: tablerIcon('road')
    },
    rail: {
        title: 'Железнодорожные пути',
        description: 'Линейный маршрут для рельсовых объектов и длинных траекторий.',
        accent: 'route',
        icon: tablerIcon('track')
    },
    building: {
        title: 'Многоэтажка',
        description: 'Здание с этажностью и сценариями по окнам для задач поиска и спасения.',
        accent: 'structure',
        icon: tablerIcon('building-skyscraper')
    },
    hill: {
        title: 'Холм',
        description: 'Рельефный объект для высотных ограничений и визуального ориентирования.',
        accent: 'terrain',
        icon: tablerIcon('mountain')
    },
    'start-position': {
        title: 'Стартовая позиция',
        description: 'Точка старта с номером, удобная для сценариев и пресетов.',
        accent: 'service',
        icon: tablerIcon('map-pin')
    },
    heliport: {
        title: 'Хелипорт',
        description: 'Посадочная площадка для ориентирования и сценариев взлёта/посадки.',
        accent: 'service',
        icon: tablerIcon('helicopter-landing')
    }
};

// Every catalog entry describes its purpose instead of falling back to a generic cube.
const EXTRA_TYPES: Array<[string, string, string, SceneTypePreviewConfig['accent'], TablerIconName]> = [
    ['flag', 'Флаг', 'Отметка направления и контрольной точки маршрута.', 'route', 'flag'],
    ['arena-hills', 'Группа холмов', 'Несколько возвышенностей для полёта с учётом рельефа.', 'terrain', 'mountain'],
    ['tree', 'Ель', 'Отдельное дерево для ориентирования и облёта препятствий.', 'terrain', 'christmas-tree'],
    ['forest-patch', 'Лесной массив', 'Группа деревьев для лесных участков и поисковых миссий.', 'terrain', 'trees'],
    ['settlement', 'Макет поселения', 'Небольшие дома с улицей для моделирования населённого пункта.', 'structure', 'building-community'],
    ['transport', 'Транспорт', 'Автомобиль как наземный ориентир или объект наблюдения.', 'structure', 'car'],
    ['car', 'Автомобиль', 'Едет по дороге; на крыше — маркер для задач слежения.', 'route', 'car-suv'],
    ['train', 'Поезд', 'Локомотив с вагонами едет по рельсам; на крыше — маркер.', 'route', 'train'],
    ['cargo', 'Груз', 'Груз с подвесом для отработки захвата и транспортировки.', 'service', 'package'],
    ['charge-station', 'Станция заряда', 'Наземная площадка с маркировкой зарядной станции.', 'service', 'charging-pile'],
    ['locus-beacon', 'Локус-маяк', 'Маяк локальной навигации для размещения на полигоне.', 'service', 'antenna'],
    ['light-tower', 'Световая мачта', 'Освещение участка; яркость меняется в контекстном меню.', 'service', 'lamp-2'],
    ['video-tower', 'Видеомачта', 'Мачта с видеокамерой для оборудования наблюдательного поста.', 'service', 'device-cctv'],
    ['control-station', 'Пульт полигона', 'Рабочее место оператора с мониторами и оборудованием.', 'service', 'device-desktop'],
    ['arena-space', 'Арена с сеткой', 'Ограждённая полётная зона с опорами и защитной сеткой.', 'structure', 'fence'],
    ['pad-h', 'Площадка H', 'Посадочная мишень с буквой H для тренировки точности.', 'service', 'square-letter-h'],
    ['pad-charge', 'Площадка заряда', 'Площадка с символом молнии для разметки сервисной зоны.', 'service', 'bolt']
];
for (const [type, title, description, accent, icon] of EXTRA_TYPES) {
    TYPE_PREVIEW_CONFIG[type] = { title, description, accent, icon: tablerIcon(icon) };
}

/** The catalog icon for a scene type, or null if the type is not in the catalog. */
export function findSceneTypeIcon(type: string): string | null {
    return TYPE_PREVIEW_CONFIG[type]?.icon ?? null;
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
