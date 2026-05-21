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
